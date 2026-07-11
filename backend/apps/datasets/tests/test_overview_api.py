"""Tests for the read-only dataset overview endpoint."""

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
        {"region": "South", "units": 7},
        {"region": "South", "units": 3},
    ]
    for data in rows:
        DatasetRowFactory(dataset=dataset, data=data)
    return dataset


def _url(dataset):
    return f"/api/v1/datasets/{dataset.id}/overview/"


@pytest.mark.django_db
def test_overview_returns_headline_and_widgets(client, sales_dataset):
    response = client.get(_url(sales_dataset))

    assert response.status_code == status.HTTP_200_OK
    assert "headline" in response.data
    assert "widgets" in response.data
    assert response.data["headline"]["row_count"] == 4
    assert response.data["widgets"]


@pytest.mark.django_db
def test_overview_foreign_dataset_returns_404(client):
    foreign = DatasetFactory()

    response = client.get(_url(foreign))

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_overview_unauthenticated_returns_401(sales_dataset):
    response = APIClient().get(_url(sales_dataset))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
