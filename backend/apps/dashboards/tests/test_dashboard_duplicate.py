"""Duplicating a dashboard clones it and its widgets, tenant-scoped."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.dashboards.models import Dashboard, Widget
from apps.dashboards.tests.factories import DashboardFactory, WidgetFactory
from apps.datasets.tests.factories import DatasetFactory, MembershipFactory


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


def _url(dashboard_id):
    return f"/api/v1/dashboards/{dashboard_id}/duplicate/"


@pytest.mark.django_db
def test_duplicate_copies_the_dashboard_and_its_widgets(client, membership):
    org = membership.organization
    dashboard = DashboardFactory(organization=org, name="Ventas")
    dataset = DatasetFactory(organization=org)
    WidgetFactory(
        dashboard=dashboard,
        organization=org,
        dataset=dataset,
        chart_type=Widget.ChartType.BAR,
        config={"agg": "sum", "metric": "units", "title": "Units"},
    )
    WidgetFactory(dashboard=dashboard, organization=org, dataset=dataset, chart_type="kpi")

    response = client.post(_url(dashboard.id))

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["name"] == "Ventas (copia)"
    copy = Dashboard.objects.get(id=response.data["id"])
    assert copy.id != dashboard.id
    copied = list(copy.widgets.order_by("created_at"))
    assert [w.chart_type for w in copied] == ["bar", "kpi"]
    assert copied[0].config == {"agg": "sum", "metric": "units", "title": "Units"}
    # The original is untouched.
    assert dashboard.widgets.count() == 2


@pytest.mark.django_db
def test_duplicate_sets_the_requesting_user_as_author(client, membership):
    dashboard = DashboardFactory(organization=membership.organization)

    response = client.post(_url(dashboard.id))

    copy = Dashboard.objects.get(id=response.data["id"])
    assert copy.created_by == membership.user


@pytest.mark.django_db
def test_duplicate_is_tenant_scoped(client, membership):
    other = MembershipFactory()
    foreign = DashboardFactory(organization=other.organization)

    response = client.post(_url(foreign.id))

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert Dashboard.objects.filter(name__endswith="(copia)").count() == 0


@pytest.mark.django_db
def test_duplicate_requires_authentication(membership):
    dashboard = DashboardFactory(organization=membership.organization)

    response = APIClient().post(_url(dashboard.id))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
