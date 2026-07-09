import pandas as pd
from celery import shared_task

from apps.reports.adapters import GeminiAdapter
from apps.reports.models import Report, ReportStatus
from apps.reports.prompts import build_analysis_prompt

__all__ = ["generate_report_task", "build_analysis_prompt"]


@shared_task
def generate_report_task(report_id: str) -> None:
    """Async task to generate an AI report for a given Report instance.

    Fetches the dataset rows, builds a rich statistical prompt, and calls the
    AI provider, persisting the outcome as COMPLETED or FAILED.
    """
    try:
        report = Report.objects.select_related("dataset").get(id=report_id)
    except Report.DoesNotExist:
        return

    try:
        rows = report.dataset.rows.values_list("data", flat=True)
        if not rows:
            raise ValueError("The dataset has no rows.")

        df = pd.DataFrame(list(rows))
        fields = list(report.dataset.fields.all().order_by("order"))
        prompt = build_analysis_prompt(report.dataset, df, fields)

        adapter = GeminiAdapter()
        generated_text = adapter.generate_text(prompt)

        report.content = generated_text
        report.status = ReportStatus.COMPLETED
        report.save(update_fields=["content", "status", "updated_at"])

    except Exception as e:
        report.status = ReportStatus.FAILED
        report.error_message = str(e)
        report.save(update_fields=["status", "error_message", "updated_at"])
