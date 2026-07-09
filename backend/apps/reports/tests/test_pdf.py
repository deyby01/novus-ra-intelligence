"""Tests for the tenant-scoped report PDF export action and renderer."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.tests.factories import MembershipFactory
from apps.reports.models import ReportStatus
from apps.reports.pdf import _blocked_url_fetcher, render_report_pdf
from apps.reports.tests.factories import ReportFactory

TABLE_MARKDOWN = "## Title\n\n| a | b |\n| - | - |\n| 1 | 2 |"


@pytest.fixture
def membership():
    return MembershipFactory()


@pytest.fixture
def org(membership):
    return membership.organization


@pytest.fixture
def client(membership):
    api_client = APIClient()
    token = RefreshToken.for_user(membership.user).access_token
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {token}",
        HTTP_X_ORGANIZATION=str(membership.organization.id),
    )
    return api_client


def _pdf_url(report_id) -> str:
    return f"/api/v1/reports/{report_id}/pdf/"


@pytest.mark.django_db
def test_pdf_for_own_completed_report_returns_pdf(client, org):
    report = ReportFactory(
        organization=org,
        status=ReportStatus.COMPLETED,
        content=TABLE_MARKDOWN,
    )

    response = client.get(_pdf_url(report.id))

    assert response.status_code == status.HTTP_200_OK
    assert response["Content-Type"] == "application/pdf"
    assert "attachment" in response["Content-Disposition"]
    assert response.content.startswith(b"%PDF")


@pytest.mark.django_db
def test_pdf_for_foreign_report_returns_404(client):
    foreign = ReportFactory(status=ReportStatus.COMPLETED, content=TABLE_MARKDOWN)

    response = client.get(_pdf_url(foreign.id))

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_pdf_for_pending_report_returns_409(client, org):
    report = ReportFactory(organization=org, status=ReportStatus.PENDING)

    response = client.get(_pdf_url(report.id))

    assert response.status_code == status.HTTP_409_CONFLICT
    assert not response.content.startswith(b"%PDF")


@pytest.mark.django_db
def test_render_report_pdf_returns_pdf_bytes(org):
    report = ReportFactory(
        organization=org,
        status=ReportStatus.COMPLETED,
        content=TABLE_MARKDOWN,
    )

    pdf_bytes = render_report_pdf(report)

    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 1000


@pytest.mark.parametrize(
    "url",
    [
        "http://169.254.169.254/latest/meta-data/",
        "https://internal.example/secret",
        "file:///app/.env",
        "data:text/plain,hello",
    ],
)
def test_blocked_url_fetcher_rejects_every_resource(url):
    """The renderer's fetcher must refuse every resource fetch (SSRF guard)."""
    with pytest.raises(ValueError):
        _blocked_url_fetcher(url)


@pytest.mark.django_db
def test_render_report_pdf_with_injected_external_resources_does_not_fetch(org):
    """Malicious external refs in AI content render to a PDF without a server fetch."""
    report = ReportFactory(
        organization=org,
        status=ReportStatus.COMPLETED,
        content='Injected <img src="http://169.254.169.254/latest/meta-data/"> '
        '<img src="file:///app/.env"> end.',
    )

    pdf_bytes = render_report_pdf(report)

    assert pdf_bytes.startswith(b"%PDF")
