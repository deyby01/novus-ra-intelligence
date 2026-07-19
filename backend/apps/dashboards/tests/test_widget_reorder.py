"""Reordering a dashboard's widgets persists an explicit order, tenant-scoped."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

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
    return f"/api/v1/dashboards/{dashboard_id}/reorder/"


def _widgets(org, dashboard, count=3):
    dataset = DatasetFactory(organization=org)
    return [
        WidgetFactory(dashboard=dashboard, organization=org, dataset=dataset, chart_type="kpi")
        for _ in range(count)
    ]


@pytest.mark.django_db
def test_reorder_sets_order_by_index(client, membership):
    org = membership.organization
    dashboard = DashboardFactory(organization=org)
    w1, w2, w3 = _widgets(org, dashboard)

    response = client.post(
        _url(dashboard.id),
        {"widget_ids": [str(w3.id), str(w1.id), str(w2.id)]},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    for widget in (w1, w2, w3):
        widget.refresh_from_db()
    assert (w3.order, w1.order, w2.order) == (0, 1, 2)
    assert [w.id for w in dashboard.widgets.all()] == [w3.id, w1.id, w2.id]
    # The response body reflects the new order, not the fetch order.
    assert [w["id"] for w in response.data] == [str(w3.id), str(w1.id), str(w2.id)]


@pytest.mark.django_db
def test_reorder_rejects_a_foreign_widget_id(client, membership):
    org = membership.organization
    dashboard = DashboardFactory(organization=org)
    w1, w2, _ = _widgets(org, dashboard)
    other = MembershipFactory()
    foreign = WidgetFactory(
        dashboard=DashboardFactory(organization=other.organization),
        organization=other.organization,
        dataset=DatasetFactory(organization=other.organization),
        chart_type="kpi",
    )

    response = client.post(
        _url(dashboard.id),
        {"widget_ids": [str(w1.id), str(w2.id), str(foreign.id)]},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    foreign.refresh_from_db()
    assert foreign.order == 0


@pytest.mark.django_db
def test_reorder_requires_the_full_widget_set(client, membership):
    org = membership.organization
    dashboard = DashboardFactory(organization=org)
    w1, w2, _ = _widgets(org, dashboard)

    response = client.post(
        _url(dashboard.id),
        {"widget_ids": [str(w1.id), str(w2.id)]},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_reorder_rejects_a_non_list(client, membership):
    dashboard = DashboardFactory(organization=membership.organization)

    response = client.post(_url(dashboard.id), {"widget_ids": "nope"}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_reorder_is_tenant_scoped(client):
    other = MembershipFactory()
    foreign = DashboardFactory(organization=other.organization)

    response = client.post(_url(foreign.id), {"widget_ids": []}, format="json")

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_new_widget_appends_after_existing_ones(client, membership):
    org = membership.organization
    dashboard = DashboardFactory(organization=org)
    dataset = DatasetFactory(organization=org)
    payload = {
        "dashboard": str(dashboard.id),
        "dataset": str(dataset.id),
        "chart_type": "kpi",
        "config": {"agg": "count"},
    }

    client.post("/api/v1/widgets/", payload, format="json")
    client.post("/api/v1/widgets/", payload, format="json")

    orders = sorted(dashboard.widgets.values_list("order", flat=True))
    assert orders == [1, 2]
