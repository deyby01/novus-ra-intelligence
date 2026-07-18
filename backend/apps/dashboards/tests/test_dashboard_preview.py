"""Dashboard list exposes widget_types + dataset_ids for the card preview."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.dashboards.models import Widget
from apps.dashboards.tests.factories import DashboardFactory, WidgetFactory
from apps.datasets.tests.factories import DatasetFactory, MembershipFactory

DASHBOARDS_URL = "/api/v1/dashboards/"


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


def _only(response):
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data["results"]) == 1
    return response.data["results"][0]


@pytest.mark.django_db
def test_widget_types_lists_the_dashboards_chart_types(client, membership):
    org = membership.organization
    dashboard = DashboardFactory(organization=org)
    dataset = DatasetFactory(organization=org)
    WidgetFactory(
        dashboard=dashboard,
        organization=org,
        dataset=dataset,
        chart_type=Widget.ChartType.KPI,
    )
    WidgetFactory(
        dashboard=dashboard,
        organization=org,
        dataset=dataset,
        chart_type=Widget.ChartType.BAR,
    )

    row = _only(client.get(DASHBOARDS_URL))

    # Only ever real chart types, ordered by creation.
    assert row["widget_types"] == ["kpi", "bar"]


@pytest.mark.django_db
def test_dataset_ids_are_distinct(client, membership):
    org = membership.organization
    dashboard = DashboardFactory(organization=org)
    shared = DatasetFactory(organization=org)
    other = DatasetFactory(organization=org)
    WidgetFactory(dashboard=dashboard, organization=org, dataset=shared)
    WidgetFactory(dashboard=dashboard, organization=org, dataset=shared)
    WidgetFactory(dashboard=dashboard, organization=org, dataset=other)

    row = _only(client.get(DASHBOARDS_URL))

    assert len(row["widget_types"]) == 3
    assert set(row["dataset_ids"]) == {str(shared.id), str(other.id)}


@pytest.mark.django_db
def test_empty_dashboard_has_no_widgets_or_datasets(client, membership):
    DashboardFactory(organization=membership.organization)

    row = _only(client.get(DASHBOARDS_URL))

    assert row["widget_types"] == []
    assert row["dataset_ids"] == []
