"""Tests for the dataset aggregation endpoint powering dashboard widgets."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.models import DatasetField
from apps.datasets.tests.factories import (
    DatasetFactory,
    DatasetFieldFactory,
    DatasetRowFactory,
    MembershipFactory,
)


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


@pytest.fixture
def sales_dataset(org):
    """A dataset with region (text) and units (number) fields plus four rows."""
    dataset = DatasetFactory(organization=org)
    DatasetFieldFactory(
        dataset=dataset,
        key="region",
        label="Region",
        field_type=DatasetField.FieldType.TEXT,
    )
    DatasetFieldFactory(
        dataset=dataset,
        key="units",
        label="Units",
        field_type=DatasetField.FieldType.NUMBER,
    )
    rows = [
        {"region": "North", "units": 10},
        {"region": "North", "units": 5},
        {"region": "South", "units": 7.5},
        {"region": "South", "units": None},
    ]
    for data in rows:
        DatasetRowFactory(dataset=dataset, data=data)
    return dataset


def _url(dataset):
    return f"/api/v1/datasets/{dataset.id}/aggregate/"


# --- Happy paths ---


@pytest.mark.django_db
def test_kpi_sum_without_group_by(client, sales_dataset):
    response = client.get(_url(sales_dataset), {"agg": "sum", "metric": "units"})

    assert response.status_code == status.HTTP_200_OK
    assert response.data == {
        "aggregation": "sum",
        "metric": "units",
        "group_by": None,
        "results": [{"group": None, "value": 22.5}],
    }


@pytest.mark.django_db
def test_count_needs_no_metric(client, sales_dataset):
    response = client.get(_url(sales_dataset), {"agg": "count"})

    assert response.status_code == status.HTTP_200_OK
    assert response.data["results"] == [{"group": None, "value": 4}]


@pytest.mark.django_db
def test_sum_grouped_by_text_field(client, sales_dataset):
    response = client.get(
        _url(sales_dataset),
        {"agg": "sum", "metric": "units", "group_by": "region"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["group_by"] == "region"
    assert response.data["results"] == [
        {"group": "North", "value": 15.0},
        {"group": "South", "value": 7.5},
    ]


@pytest.mark.django_db
def test_count_grouped_counts_rows_not_values(client, sales_dataset):
    response = client.get(_url(sales_dataset), {"agg": "count", "group_by": "region"})

    assert response.data["results"] == [
        {"group": "North", "value": 2},
        {"group": "South", "value": 2},
    ]


@pytest.mark.django_db
def test_avg_min_max(client, sales_dataset):
    for agg, expected in (("avg", 7.5), ("min", 5.0), ("max", 10.0)):
        response = client.get(_url(sales_dataset), {"agg": agg, "metric": "units"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == [{"group": None, "value": expected}]


@pytest.mark.django_db
def test_sum_grouped_by_month_bucket(client, org):
    """bucket=month groups a date field's rows by their "YYYY-MM" prefix."""
    dataset = DatasetFactory(organization=org)
    DatasetFieldFactory(
        dataset=dataset,
        key="sold_at",
        label="Sold at",
        field_type=DatasetField.FieldType.DATE,
    )
    DatasetFieldFactory(
        dataset=dataset,
        key="units",
        label="Units",
        field_type=DatasetField.FieldType.NUMBER,
    )
    for data in (
        {"sold_at": "2026-01-15", "units": 10},
        {"sold_at": "2026-01-22", "units": 5},
        {"sold_at": "2026-02-03", "units": 8},
    ):
        DatasetRowFactory(dataset=dataset, data=data)

    response = client.get(
        _url(dataset),
        {"agg": "sum", "metric": "units", "group_by": "sold_at", "bucket": "month"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["results"] == [
        {"group": "2026-01", "value": 15.0},
        {"group": "2026-02", "value": 8.0},
    ]


@pytest.mark.django_db
def test_dataset_with_no_rows_returns_empty_results(client, org):
    dataset = DatasetFactory(organization=org)
    DatasetFieldFactory(
        dataset=dataset,
        key="units",
        field_type=DatasetField.FieldType.NUMBER,
    )

    response = client.get(_url(dataset), {"agg": "sum", "metric": "units"})

    assert response.status_code == status.HTTP_200_OK
    assert response.data["results"] == [{"group": None, "value": None}]


@pytest.mark.django_db
def test_non_numeric_cell_in_number_field_is_ignored(client, sales_dataset):
    """A row whose metric cell holds text must not break the aggregation."""
    DatasetRowFactory(
        dataset=sales_dataset,
        data={"region": "North", "units": "not-a-number"},
    )

    response = client.get(_url(sales_dataset), {"agg": "sum", "metric": "units"})

    assert response.status_code == status.HTTP_200_OK
    assert response.data["results"] == [{"group": None, "value": 22.5}]


# --- Validation ---


@pytest.mark.django_db
def test_unknown_aggregation_is_rejected(client, sales_dataset):
    response = client.get(_url(sales_dataset), {"agg": "median", "metric": "units"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_metric_required_for_sum(client, sales_dataset):
    response = client.get(_url(sales_dataset), {"agg": "sum"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_unknown_metric_key_is_rejected(client, sales_dataset):
    response = client.get(_url(sales_dataset), {"agg": "sum", "metric": "nope"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_non_number_metric_is_rejected(client, sales_dataset):
    response = client.get(_url(sales_dataset), {"agg": "sum", "metric": "region"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_unknown_group_by_key_is_rejected(client, sales_dataset):
    response = client.get(
        _url(sales_dataset),
        {"agg": "count", "group_by": "nope"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_invalid_bucket_is_rejected(client, sales_dataset):
    response = client.get(
        _url(sales_dataset),
        {"agg": "count", "group_by": "region", "bucket": "week"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


# --- Tenant isolation ---


@pytest.mark.django_db
def test_other_tenant_dataset_aggregate_returns_404(client):
    foreign = DatasetFactory()
    DatasetFieldFactory(
        dataset=foreign,
        key="units",
        field_type=DatasetField.FieldType.NUMBER,
    )

    response = client.get(_url(foreign), {"agg": "count"})

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_aggregate_only_counts_this_datasets_rows(client, org, sales_dataset):
    sibling = DatasetFactory(organization=org)
    DatasetFieldFactory(
        dataset=sibling,
        key="units",
        field_type=DatasetField.FieldType.NUMBER,
    )
    DatasetRowFactory(dataset=sibling, data={"units": 1000})

    response = client.get(_url(sales_dataset), {"agg": "sum", "metric": "units"})

    assert response.data["results"] == [{"group": None, "value": 22.5}]
