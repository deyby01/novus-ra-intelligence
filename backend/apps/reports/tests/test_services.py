from unittest.mock import patch

import pytest

from apps.datasets.tests.factories import DatasetFactory, DatasetRowFactory, UserFactory
from apps.reports.models import Report, ReportStatus
from apps.reports.services import ReportService
from apps.reports.tasks import generate_report_task


@pytest.mark.django_db(transaction=True)
@patch("apps.reports.services.generate_report_task.delay")
def test_request_report(mock_delay):
    """Test that requesting a report creates a PENDING report and queues a task."""
    user = UserFactory()
    dataset = DatasetFactory(created_by=user)

    report = ReportService.request_report(dataset, user)

    assert report.status == ReportStatus.PENDING
    assert report.dataset == dataset
    assert report.organization == dataset.organization
    assert report.created_by == user

    mock_delay.assert_called_once_with(str(report.id))


@pytest.mark.django_db
@patch("apps.reports.tasks.GeminiAdapter")
def test_generate_report_task_success(mock_adapter_class):
    """Test the full background task for generating a report."""
    user = UserFactory()
    dataset = DatasetFactory(created_by=user)

    # Create some rows
    DatasetRowFactory(dataset=dataset, data={"age": 25, "city": "NY"})
    DatasetRowFactory(dataset=dataset, data={"age": 30, "city": "SF"})

    report = Report.objects.create(
        dataset=dataset,
        organization=dataset.organization,
        created_by=user,
        updated_by=user,
    )

    # Mock the AI provider
    mock_adapter_instance = mock_adapter_class.return_value
    mock_adapter_instance.generate_text.return_value = "# AI Insights"

    # Run the task synchronously
    generate_report_task(str(report.id))

    report.refresh_from_db()
    assert report.status == ReportStatus.COMPLETED
    assert report.content == "# AI Insights"
    assert report.error_message == ""
    mock_adapter_instance.generate_text.assert_called_once()

    # Check that the prompt contained our summary data
    prompt = mock_adapter_instance.generate_text.call_args[0][0]
    assert "Dataset Name" in prompt
    assert "age" in prompt
    assert "city" in prompt
    assert "Total Rows: 2" in prompt


@pytest.mark.django_db
@patch("apps.reports.tasks.GeminiAdapter")
def test_generate_report_task_empty_dataset(mock_adapter_class):
    """Test that a dataset with no rows results in a FAILED report."""
    user = UserFactory()
    dataset = DatasetFactory(created_by=user)
    report = Report.objects.create(
        dataset=dataset,
        organization=dataset.organization,
        created_by=user,
        updated_by=user,
    )

    generate_report_task(str(report.id))

    report.refresh_from_db()
    assert report.status == ReportStatus.FAILED
    assert report.content == ""
    assert "no rows" in report.error_message.lower()
    mock_adapter_class.assert_not_called()


@pytest.mark.django_db
@patch("apps.reports.tasks.GeminiAdapter")
def test_generate_report_task_ai_failure(mock_adapter_class):
    """Test that an AI provider failure results in a FAILED report."""
    user = UserFactory()
    dataset = DatasetFactory(created_by=user)
    DatasetRowFactory(dataset=dataset, data={"age": 25})
    report = Report.objects.create(
        dataset=dataset,
        organization=dataset.organization,
        created_by=user,
        updated_by=user,
    )

    mock_adapter_instance = mock_adapter_class.return_value
    mock_adapter_instance.generate_text.side_effect = Exception("API Error")

    generate_report_task(str(report.id))

    report.refresh_from_db()
    assert report.status == ReportStatus.FAILED
    assert report.error_message == "API Error"
