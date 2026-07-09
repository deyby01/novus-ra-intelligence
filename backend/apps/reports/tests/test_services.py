from unittest.mock import patch

import pandas as pd
import pytest

from apps.datasets.models import DatasetField
from apps.datasets.tests.factories import (
    DatasetFactory,
    DatasetFieldFactory,
    DatasetRowFactory,
    UserFactory,
)
from apps.reports.models import Report, ReportStatus
from apps.reports.prompts import build_analysis_prompt
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

    # Check that the prompt carried our new statistical summary.
    prompt = mock_adapter_instance.generate_text.call_args[0][0]
    assert dataset.name in prompt
    assert "age" in prompt
    assert "city" in prompt
    assert "Total rows:** 2" in prompt
    assert "# Your task" in prompt
    assert "never invent numbers or facts" in prompt


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


@pytest.mark.django_db
def test_build_analysis_prompt_includes_summary_and_task():
    """The builder emits the summary, per-column stats, and the sectioned task."""
    dataset = DatasetFactory(name="Quarterly Sales", description="Q3 figures")
    org = dataset.organization
    DatasetFieldFactory(
        dataset=dataset,
        organization=org,
        key="units",
        label="Units Sold",
        field_type=DatasetField.FieldType.NUMBER,
        order=0,
    )
    DatasetFieldFactory(
        dataset=dataset,
        organization=org,
        key="region",
        label="Region",
        field_type=DatasetField.FieldType.TEXT,
        order=1,
    )
    fields = list(dataset.fields.all().order_by("order"))
    df = pd.DataFrame(
        [
            {"units": 100, "region": "North"},
            {"units": 120, "region": "North"},
            {"units": 140, "region": "South"},
        ]
    )

    prompt = build_analysis_prompt(dataset, df, fields)

    # Dataset header.
    assert "Quarterly Sales" in prompt
    assert "Q3 figures" in prompt
    # Numeric column exposes mean/median/sum.
    assert "mean: 120" in prompt
    assert "median: 120" in prompt
    assert "sum: 360" in prompt
    # Categorical column exposes a top-value line with a percentage.
    assert "North — 2 (66.7%)" in prompt
    # The sectioned task and anti-hallucination rule.
    for section in (
        "Executive Summary",
        "Key Metrics",
        "Trends & Patterns",
        "Segment Breakdown",
        "Anomalies & Data Quality",
        "Recommendations",
    ):
        assert section in prompt
    assert (
        "Ground EVERY statement in the statistics provided above; "
        "never invent numbers or facts." in prompt
    )


@pytest.mark.django_db
def test_build_analysis_prompt_handles_single_row_and_null_column():
    """A single row with an all-null column must not raise and stays bounded."""
    dataset = DatasetFactory(name="Tiny", description="")
    org = dataset.organization
    DatasetFieldFactory(
        dataset=dataset,
        organization=org,
        key="score",
        label="Score",
        field_type=DatasetField.FieldType.NUMBER,
        order=0,
    )
    DatasetFieldFactory(
        dataset=dataset,
        organization=org,
        key="note",
        label="Note",
        field_type=DatasetField.FieldType.TEXT,
        order=1,
    )
    fields = list(dataset.fields.all().order_by("order"))
    df = pd.DataFrame([{"score": 42, "note": None}])

    prompt = build_analysis_prompt(dataset, df, fields)

    assert "Total rows:** 1" in prompt
    # All-null categorical column reports no non-null values, no crash.
    assert "no non-null values" in prompt
    # Missing description falls back to a dash.
    assert "**Description:** —" in prompt


@pytest.mark.django_db
def test_build_analysis_prompt_coerces_non_numeric_in_number_column():
    """Junk text in a declared number column is coerced, never raising."""
    dataset = DatasetFactory(name="Messy")
    org = dataset.organization
    DatasetFieldFactory(
        dataset=dataset,
        organization=org,
        key="amount",
        label="Amount",
        field_type=DatasetField.FieldType.NUMBER,
        order=0,
    )
    fields = list(dataset.fields.all().order_by("order"))
    df = pd.DataFrame([{"amount": 10}, {"amount": "oops"}, {"amount": 30}])

    prompt = build_analysis_prompt(dataset, df, fields)

    # Two valid numbers counted, the junk value coerced to missing.
    assert "count: 2, missing: 1" in prompt
    assert "mean: 20" in prompt
