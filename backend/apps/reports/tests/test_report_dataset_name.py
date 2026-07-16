"""The report list carries its dataset's name (Home redesign R3)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.tests.factories import DatasetFactory, MembershipFactory
from apps.reports.tests.factories import ReportFactory

REPORTS_URL = "/api/v1/reports/"


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
def test_report_list_includes_the_dataset_name(client, membership):
    """The Home lists reports across datasets, so each needs a readable label."""
    dataset = DatasetFactory(organization=membership.organization, name="Ventas Q3")
    ReportFactory(dataset=dataset, organization=membership.organization)

    response = client.get(REPORTS_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["results"][0]["dataset_name"] == "Ventas Q3"


@pytest.mark.django_db
def test_dataset_name_is_read_only(client, membership):
    """A client cannot rename a dataset through the report endpoint."""
    dataset = DatasetFactory(organization=membership.organization, name="Original")

    response = client.post(
        REPORTS_URL, {"dataset": str(dataset.id), "dataset_name": "Hacked"}
    )

    assert response.status_code == status.HTTP_201_CREATED
    dataset.refresh_from_db()
    assert dataset.name == "Original"


@pytest.mark.django_db
def test_reports_are_listed_newest_first(client, membership):
    """The Home shows the latest reports; the API must default to that order."""
    dataset = DatasetFactory(organization=membership.organization)
    older = ReportFactory(dataset=dataset, organization=membership.organization)
    newer = ReportFactory(dataset=dataset, organization=membership.organization)

    response = client.get(REPORTS_URL, {"ordering": "-created_at"})

    ids = [row["id"] for row in response.data["results"]]
    assert ids.index(str(newer.id)) < ids.index(str(older.id))
