"""Tenant-isolation suite for the Dashboard and Widget APIs."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.dashboards.models import Dashboard, Widget
from apps.dashboards.tests.factories import DashboardFactory, WidgetFactory
from apps.datasets.tests.factories import DatasetFactory, MembershipFactory

DASHBOARDS_URL = "/api/v1/dashboards/"
WIDGETS_URL = "/api/v1/widgets/"


@pytest.fixture
def membership():
    """An active membership; its user acts as the tenant throughout."""
    return MembershipFactory()


@pytest.fixture
def org(membership):
    return membership.organization


@pytest.fixture
def client(membership):
    """An APIClient authenticated as the member with the org header set."""
    api_client = APIClient()
    token = RefreshToken.for_user(membership.user).access_token
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {token}",
        HTTP_X_ORGANIZATION=str(membership.organization.id),
    )
    return api_client


# --- Dashboards ---


@pytest.mark.django_db
def test_list_returns_only_current_org_dashboards(client, org):
    mine = DashboardFactory(organization=org)
    DashboardFactory()

    response = client.get(DASHBOARDS_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == str(mine.id)


@pytest.mark.django_db
def test_create_dashboard_lands_on_current_org_with_author(client, org, membership):
    response = client.post(DASHBOARDS_URL, {"name": "Sales overview"})

    assert response.status_code == status.HTTP_201_CREATED
    dashboard = Dashboard.objects.get(pk=response.data["id"])
    assert dashboard.organization == org
    assert dashboard.created_by == membership.user


@pytest.mark.django_db
def test_retrieve_other_tenant_dashboard_returns_404(client):
    foreign = DashboardFactory()

    response = client.get(f"{DASHBOARDS_URL}{foreign.id}/")

    assert response.status_code == status.HTTP_404_NOT_FOUND


# --- Widgets ---


@pytest.mark.django_db
def test_create_widget_on_own_dashboard_and_dataset(client, org):
    dashboard = DashboardFactory(organization=org)
    dataset = DatasetFactory(organization=org)

    response = client.post(
        WIDGETS_URL,
        {
            "dashboard": str(dashboard.id),
            "dataset": str(dataset.id),
            "chart_type": "kpi",
            "config": {"agg": "sum", "metric": "units"},
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    widget = Widget.objects.get(pk=response.data["id"])
    assert widget.organization == org
    assert widget.config == {"agg": "sum", "metric": "units"}


@pytest.mark.django_db
def test_widget_cannot_point_at_foreign_dashboard(client, org):
    foreign_dashboard = DashboardFactory()
    dataset = DatasetFactory(organization=org)

    response = client.post(
        WIDGETS_URL,
        {
            "dashboard": str(foreign_dashboard.id),
            "dataset": str(dataset.id),
            "chart_type": "kpi",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_widget_cannot_point_at_foreign_dataset(client, org):
    dashboard = DashboardFactory(organization=org)
    foreign_dataset = DatasetFactory()

    response = client.post(
        WIDGETS_URL,
        {
            "dashboard": str(dashboard.id),
            "dataset": str(foreign_dataset.id),
            "chart_type": "kpi",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_widgets_list_filters_by_dashboard(client, org):
    dashboard = DashboardFactory(organization=org)
    mine = WidgetFactory(dashboard=dashboard)
    WidgetFactory(dashboard=DashboardFactory(organization=org))
    WidgetFactory()

    response = client.get(WIDGETS_URL, {"dashboard": str(dashboard.id)})

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == str(mine.id)


@pytest.mark.django_db
def test_update_cannot_repoint_widget_to_foreign_dashboard(client, org):
    widget = WidgetFactory(dashboard=DashboardFactory(organization=org))
    foreign_dashboard = DashboardFactory()

    response = client.patch(
        f"{WIDGETS_URL}{widget.id}/",
        {"dashboard": str(foreign_dashboard.id)},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_update_cannot_repoint_widget_to_foreign_dataset(client, org):
    widget = WidgetFactory(dashboard=DashboardFactory(organization=org))
    foreign_dataset = DatasetFactory()

    response = client.patch(
        f"{WIDGETS_URL}{widget.id}/",
        {"dataset": str(foreign_dataset.id)},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_delete_widget(client, org):
    widget = WidgetFactory(dashboard=DashboardFactory(organization=org))

    response = client.delete(f"{WIDGETS_URL}{widget.id}/")

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Widget.objects.filter(pk=widget.pk).exists()


@pytest.mark.django_db
def test_deleting_a_dataset_with_widgets_returns_409_not_500(client, org):
    """The protected dataset FK must surface as a client error, not a crash."""
    widget = WidgetFactory(dashboard=DashboardFactory(organization=org))

    response = client.delete(f"/api/v1/datasets/{widget.dataset.id}/")

    assert response.status_code == status.HTTP_409_CONFLICT
    assert widget.dataset.__class__.objects.filter(pk=widget.dataset.pk).exists()
