"""Tenant-isolation suite for the AI Reports API."""

import uuid
from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.tests.factories import DatasetFactory, MembershipFactory
from apps.reports.models import Report, ReportStatus
from apps.reports.tests.factories import ReportFactory

REPORTS_URL = "/api/v1/reports/"


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


# --- Auth ---


@pytest.mark.django_db
def test_create_report_requires_auth():
    response = APIClient().post(REPORTS_URL, {"dataset": str(uuid.uuid4())})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# --- Happy path ---


@pytest.mark.django_db
@patch("apps.reports.services.generate_report_task.delay")
def test_create_report_on_own_dataset_succeeds(mock_delay, client, org):
    dataset = DatasetFactory(organization=org)

    response = client.post(REPORTS_URL, {"dataset": str(dataset.id)})

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == ReportStatus.PENDING
    assert response.data["dataset"] == dataset.id
    report = Report.objects.get(pk=response.data["id"])
    assert report.organization == org


@pytest.mark.django_db
def test_retrieve_own_report_returns_content(client, org):
    report = ReportFactory(
        organization=org,
        status=ReportStatus.COMPLETED,
        content="Insightful text",
    )

    response = client.get(f"{REPORTS_URL}{report.id}/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["content"] == "Insightful text"


# --- Tenant isolation ---


@pytest.mark.django_db
def test_list_returns_only_current_org_reports(client, org):
    mine = ReportFactory(organization=org)
    ReportFactory()

    response = client.get(REPORTS_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == str(mine.id)


@pytest.mark.django_db
def test_retrieve_foreign_report_returns_404(client):
    foreign = ReportFactory()

    response = client.get(f"{REPORTS_URL}{foreign.id}/")

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_create_report_on_foreign_dataset_returns_404(client):
    foreign_dataset = DatasetFactory()

    response = client.post(REPORTS_URL, {"dataset": str(foreign_dataset.id)})

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert not Report.objects.filter(dataset=foreign_dataset).exists()


@pytest.mark.django_db
def test_create_report_with_unknown_dataset_returns_404(client):
    response = client.post(REPORTS_URL, {"dataset": str(uuid.uuid4())})

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_create_report_with_malformed_dataset_id_returns_404(client):
    response = client.post(REPORTS_URL, {"dataset": "not-a-uuid"})

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_create_report_without_org_header_is_rejected(membership):
    api_client = APIClient()
    token = RefreshToken.for_user(membership.user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    dataset = DatasetFactory(organization=membership.organization)

    response = api_client.post(REPORTS_URL, {"dataset": str(dataset.id)})

    assert 400 <= response.status_code < 500
    assert not Report.objects.filter(dataset=dataset).exists()
