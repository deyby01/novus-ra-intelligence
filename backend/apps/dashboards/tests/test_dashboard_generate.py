"""AI dashboard generation: hybrid (deterministic widgets + AI naming, with fallback)."""

from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.dashboards.models import Dashboard
from apps.dashboards.services.generation_service import (
    EmptyDatasetError,
    generate_dashboard,
)
from apps.datasets.tests.factories import (
    DatasetFactory,
    DatasetFieldFactory,
    DatasetRowFactory,
    MembershipFactory,
    UserFactory,
)

GENERATE_URL = "/api/v1/dashboards/generate/"


class _StubProvider:
    """A test AI provider returning a fixed reply (or raising)."""

    def __init__(self, reply="", error=None):
        self.reply = reply
        self.error = error

    def generate_text(self, prompt: str) -> str:
        if self.error:
            raise self.error
        return self.reply


def _dataset_with_data(organization):
    """A dataset the overview engine will produce widgets for."""
    dataset = DatasetFactory(organization=organization, name="Ventas")
    DatasetFieldFactory(
        dataset=dataset, organization=organization, key="units", field_type="number"
    )
    for value in (10, 20, 30):
        DatasetRowFactory(dataset=dataset, organization=organization, data={"units": value})
    return dataset


# --- Service: AI path + fallbacks ---


@pytest.mark.django_db
def test_service_uses_the_ai_name_titles_and_summary():
    org = MembershipFactory().organization
    user = UserFactory()
    dataset = _dataset_with_data(org)
    provider = _StubProvider(
        reply='{"name": "Panel de Ventas", '
        '"widget_titles": ["Total", "Promedio", "Suma"], '
        '"summary": "Ventas al alza."}'
    )

    dashboard = generate_dashboard(dataset, user, ai_provider=provider)

    assert dashboard.name == "Panel de Ventas"
    assert dashboard.description == "Ventas al alza."
    widgets = list(dashboard.widgets.order_by("created_at"))
    assert len(widgets) >= 1
    assert widgets[0].config["title"] == "Total"
    assert widgets[0].dataset_id == dataset.id


@pytest.mark.django_db
def test_service_falls_back_when_the_ai_raises():
    org = MembershipFactory().organization
    dataset = _dataset_with_data(org)
    provider = _StubProvider(error=RuntimeError("gemini down"))

    dashboard = generate_dashboard(dataset, UserFactory(), ai_provider=provider)

    # Still a valid dashboard, named deterministically from the dataset.
    assert dashboard.name == "Ventas"
    assert dashboard.description == ""
    assert dashboard.widgets.exists()
    # Titles are the overview's deterministic ones (non-empty).
    assert all(w.config.get("title") for w in dashboard.widgets.all())


@pytest.mark.django_db
def test_service_falls_back_on_malformed_ai_json():
    org = MembershipFactory().organization
    dataset = _dataset_with_data(org)

    dashboard = generate_dashboard(
        dataset, UserFactory(), ai_provider=_StubProvider(reply="not json at all")
    )

    assert dashboard.name == "Ventas"
    assert dashboard.widgets.exists()


@pytest.mark.django_db
def test_service_rejects_an_empty_dataset():
    org = MembershipFactory().organization
    empty = DatasetFactory(organization=org)  # no rows → no widgets

    with pytest.raises(EmptyDatasetError):
        generate_dashboard(empty, UserFactory(), ai_provider=_StubProvider())


# --- Endpoint (no GEMINI_API_KEY in tests → deterministic fallback) ---


@pytest.fixture
def membership():
    return MembershipFactory()


@pytest.fixture
def client(membership):
    api_client = APIClient()
    token = RefreshToken.for_user(membership.user).access_token
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {token}",
        HTTP_X_ORGANIZATION=str(membership.organization.id),
    )
    return api_client


@pytest.mark.django_db
@patch(
    "apps.dashboards.services.generation_service.GeminiAdapter",
    side_effect=ValueError("no key in tests"),
)
def test_generate_endpoint_creates_a_dashboard_with_widgets(_mock_adapter, client, membership):
    # The AI adapter is stubbed to fail so the test never hits the real API and
    # exercises the deterministic fallback path end-to-end.
    dataset = _dataset_with_data(membership.organization)

    response = client.post(GENERATE_URL, {"dataset": str(dataset.id)})

    assert response.status_code == status.HTTP_201_CREATED
    dashboard = Dashboard.objects.get(id=response.data["id"])
    assert dashboard.organization == membership.organization
    assert dashboard.name == "Ventas"  # deterministic fallback name
    assert dashboard.widgets.exists()
    assert len(response.data["widget_types"]) == dashboard.widgets.count()


@pytest.mark.django_db
def test_generate_endpoint_rejects_an_empty_dataset(client, membership):
    empty = DatasetFactory(organization=membership.organization)

    response = client.post(GENERATE_URL, {"dataset": str(empty.id)})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_generate_endpoint_is_tenant_scoped(client):
    foreign = _dataset_with_data(MembershipFactory().organization)

    response = client.post(GENERATE_URL, {"dataset": str(foreign.id)})

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert Dashboard.objects.count() == 0


@pytest.mark.django_db
def test_generate_endpoint_requires_authentication():
    response = APIClient().post(GENERATE_URL, {"dataset": "x"})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
