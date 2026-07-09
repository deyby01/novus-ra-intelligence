"""Throttling tests for the expensive report endpoints (generate + PDF).

Rates are patched onto ``ScopedRateThrottle.THROTTLE_RATES`` (what ``get_rate``
actually reads) so a 429 trips in two requests. The autouse cache-clear fixture
resets the throttle counter, and a fresh membership user per test keys the
counter cleanly, keeping every assertion deterministic.
"""

from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.tests.factories import DatasetFactory, MembershipFactory
from apps.reports.models import ReportStatus
from apps.reports.tests.factories import ReportFactory

REPORTS_URL = "/api/v1/reports/"
TINY_RATES = {"reports_generate": "1/min", "reports_pdf": "1/min"}


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
def test_generate_endpoint_throttles_after_limit(client, org):
    dataset = DatasetFactory(organization=org)

    with (
        patch("apps.reports.services.generate_report_task.delay"),
        patch.object(ScopedRateThrottle, "THROTTLE_RATES", TINY_RATES),
    ):
        first = client.post(REPORTS_URL, {"dataset": str(dataset.id)})
        second = client.post(REPORTS_URL, {"dataset": str(dataset.id)})

    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_pdf_endpoint_throttles_after_limit(client, org):
    report = ReportFactory(
        organization=org,
        status=ReportStatus.COMPLETED,
        content="## Title",
    )

    with (
        patch("apps.reports.views.render_report_pdf", return_value=b"%PDF-fake"),
        patch.object(ScopedRateThrottle, "THROTTLE_RATES", TINY_RATES),
    ):
        first = client.get(_pdf_url(report.id))
        second = client.get(_pdf_url(report.id))

    assert first.status_code == status.HTTP_200_OK
    assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_cheap_actions_are_not_throttled(client, org):
    report = ReportFactory(organization=org, status=ReportStatus.COMPLETED)

    with patch.object(ScopedRateThrottle, "THROTTLE_RATES", TINY_RATES):
        codes = [client.get(f"{REPORTS_URL}{report.id}/").status_code for _ in range(5)]

    assert all(code == status.HTTP_200_OK for code in codes)
