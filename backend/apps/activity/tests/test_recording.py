"""Each domain event records exactly one activity feed entry (or none on failure)."""

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.activity.models import ActivityEvent
from apps.datasets.tests.factories import (
    DatasetFactory,
    DatasetRowFactory,
    ImportJobFactory,
    MembershipFactory,
    UserFactory,
)
from apps.reports.models import Report, ReportStatus

# --- Import completes ---


@pytest.mark.django_db
@patch("apps.datasets.tasks.import_workbook", return_value=42)
def test_a_completed_import_records_a_dataset_imported_event(mock_import):
    from apps.datasets.tasks import process_import_job

    user = UserFactory()
    dataset = DatasetFactory(name="Ventas Q3")
    job = ImportJobFactory(dataset=dataset, created_by=user)

    process_import_job(str(job.pk))

    event = ActivityEvent.objects.get()
    assert event.verb == ActivityEvent.Verb.DATASET_IMPORTED
    assert event.organization == dataset.organization
    assert event.actor == user
    assert event.target_type == "dataset"
    assert event.target_id == dataset.id
    assert event.target_label == "Ventas Q3"


@pytest.mark.django_db
@patch("apps.datasets.tasks.import_workbook", side_effect=ValueError("bad file"))
def test_a_failed_import_records_no_event(mock_import):
    from apps.datasets.tasks import process_import_job

    job = ImportJobFactory(created_by=UserFactory())

    process_import_job(str(job.pk))

    assert ActivityEvent.objects.count() == 0


# --- Report completes ---


@pytest.mark.django_db
@patch("apps.reports.tasks.GeminiAdapter")
def test_a_completed_report_records_a_report_generated_event(mock_adapter_class):
    from apps.reports.tasks import generate_report_task

    user = UserFactory()
    dataset = DatasetFactory(name="Inventario", created_by=user)
    DatasetRowFactory(dataset=dataset, data={"age": 25})
    report = Report.objects.create(
        dataset=dataset,
        organization=dataset.organization,
        created_by=user,
        updated_by=user,
    )
    mock_adapter_class.return_value.generate_text.return_value = "# Insights"

    generate_report_task(str(report.id))

    event = ActivityEvent.objects.get()
    assert event.verb == ActivityEvent.Verb.REPORT_GENERATED
    assert event.actor == user
    assert event.target_type == "dataset"
    assert event.target_id == dataset.id
    assert event.target_label == "Inventario"


@pytest.mark.django_db
@patch("apps.reports.tasks.GeminiAdapter")
def test_a_failed_report_records_no_event(mock_adapter_class):
    from apps.reports.tasks import generate_report_task

    # A dataset with no rows makes the task fail before any AI call.
    dataset = DatasetFactory()
    report = Report.objects.create(dataset=dataset, organization=dataset.organization)

    generate_report_task(str(report.id))

    report.refresh_from_db()
    assert report.status == ReportStatus.FAILED
    assert ActivityEvent.objects.count() == 0


# --- Dashboard created ---


@pytest.mark.django_db
def test_creating_a_dashboard_records_a_dashboard_created_event():
    membership = MembershipFactory()
    api_client = APIClient()
    token = RefreshToken.for_user(membership.user).access_token
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {token}",
        HTTP_X_ORGANIZATION=str(membership.organization.id),
    )

    response = api_client.post("/api/v1/dashboards/", {"name": "Finanzas"})

    assert response.status_code == 201
    event = ActivityEvent.objects.get()
    assert event.verb == ActivityEvent.Verb.DASHBOARD_CREATED
    assert event.organization == membership.organization
    assert event.actor == membership.user
    assert event.target_type == "dashboard"
    assert event.target_label == "Finanzas"
