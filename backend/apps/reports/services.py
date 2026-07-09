from django.contrib.auth import get_user_model
from django.db import transaction

from apps.datasets.models import Dataset
from apps.reports.models import Report
from apps.reports.tasks import generate_report_task

User = get_user_model()


class ReportService:
    """Service to handle the creation and orchestration of AI reports."""

    @staticmethod
    def request_report(dataset: Dataset, user: User) -> Report:
        """Creates a PENDING report and queues the background generation task."""
        with transaction.atomic():
            report = Report.objects.create(
                dataset=dataset,
                created_by=user,
                updated_by=user,
            )

            # Dispatch Celery task
            # We use transaction.on_commit to ensure the task is dispatched ONLY
            # after the Report is successfully committed to the database.
            transaction.on_commit(lambda: generate_report_task.delay(str(report.id)))

        return report
