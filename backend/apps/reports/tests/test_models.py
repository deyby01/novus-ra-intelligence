import pytest

from apps.datasets.tests.factories import DatasetFactory, UserFactory
from apps.reports.models import Report, ReportStatus


@pytest.mark.django_db
def test_report_creation():
    """Test creating a Report instance."""
    user = UserFactory()
    dataset = DatasetFactory(created_by=user)

    report = Report.objects.create(
        dataset=dataset,
        organization=dataset.organization,
        created_by=user,
        updated_by=user,
    )

    assert report.status == ReportStatus.PENDING
    assert report.content == ""
    assert report.error_message == ""
    assert str(report) == f"Report {report.id} for {dataset.name} (PENDING)"


@pytest.mark.django_db
def test_report_cascade_delete():
    """Test that a report is deleted if its dataset is deleted."""
    user = UserFactory()
    dataset = DatasetFactory(created_by=user)
    Report.objects.create(
        dataset=dataset,
        organization=dataset.organization,
        created_by=user,
    )

    assert Report.objects.count() == 1
    dataset.delete()
    assert Report.objects.count() == 0
