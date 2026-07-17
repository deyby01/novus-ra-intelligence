"""field_count / has_report annotations on the dataset list (Datasets grid)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.tests.factories import (
    DatasetFactory,
    DatasetFieldFactory,
    DatasetRowFactory,
    MembershipFactory,
)
from apps.reports.tests.factories import ReportFactory

DATASETS_URL = "/api/v1/datasets/"


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
def test_field_count_reflects_the_schema(client, membership):
    dataset = DatasetFactory(organization=membership.organization)
    for _ in range(3):
        DatasetFieldFactory(dataset=dataset, organization=membership.organization)

    row = _only(client.get(DATASETS_URL))

    assert row["field_count"] == 3


@pytest.mark.django_db
def test_field_count_is_zero_without_fields(client, membership):
    DatasetFactory(organization=membership.organization)

    assert _only(client.get(DATASETS_URL))["field_count"] == 0


@pytest.mark.django_db
def test_has_report_tracks_ai_reports(client, membership):
    org = membership.organization
    dataset = DatasetFactory(organization=org)

    assert _only(client.get(DATASETS_URL))["has_report"] is False

    ReportFactory(dataset=dataset, organization=org)

    assert _only(client.get(DATASETS_URL))["has_report"] is True


@pytest.mark.django_db
def test_counts_do_not_inflate_each_other(client, membership):
    """Rows, fields, and reports must not cartesian-multiply into each count."""
    org = membership.organization
    dataset = DatasetFactory(organization=org)
    for _ in range(5):
        DatasetRowFactory(dataset=dataset, organization=org)
    for _ in range(4):
        DatasetFieldFactory(dataset=dataset, organization=org)
    ReportFactory(dataset=dataset, organization=org)
    ReportFactory(dataset=dataset, organization=org)

    row = _only(client.get(DATASETS_URL))

    assert row["row_count"] == 5  # not 5 * 4 or 5 * 4 * 2
    assert row["field_count"] == 4
    assert row["has_report"] is True
