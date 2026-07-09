import pandas as pd
from celery import shared_task

from apps.reports.adapters import GeminiAdapter
from apps.reports.models import Report, ReportStatus


@shared_task
def generate_report_task(report_id: str) -> None:
    """Async task to generate an AI report for a given Report instance.

    Fetches the dataset rows, creates a summary, and calls the AI provider.
    """
    try:
        report = Report.objects.select_related("dataset").get(id=report_id)
    except Report.DoesNotExist:
        return

    try:
        # 1. Fetch data
        rows = report.dataset.rows.values_list("data", flat=True)
        if not rows:
            raise ValueError("The dataset has no rows.")

        df = pd.DataFrame(list(rows))

        # 2. Build summary
        summary_parts = []
        summary_parts.append(f"Dataset Name: {report.dataset.name}")
        summary_parts.append(f"Total Rows: {len(df)}")
        summary_parts.append("\nColumn Summaries:")

        for col in df.columns:
            non_null_count = df[col].notna().sum()
            summary_parts.append(f"- Column '{col}': {non_null_count} non-null values.")

            if pd.api.types.is_numeric_dtype(df[col]):
                summary_parts.append(
                    f"  Mean: {df[col].mean():.2f}, Min: {df[col].min()}, Max: {df[col].max()}"
                )
            else:
                unique_vals = df[col].nunique()
                summary_parts.append(f"  Categorical with {unique_vals} unique values.")

        dataset_summary = "\n".join(summary_parts)

        # 3. Construct prompt
        prompt = (
            "You are an expert business data analyst. "
            "Please analyze the following statistical summary of a dataset and provide "
            "actionable business insights, trends, or anomalies you can infer from it.\n\n"
            f"{dataset_summary}\n\n"
            "Format your response in Markdown."
        )

        # 4. Call AI Provider
        adapter = GeminiAdapter()
        generated_text = adapter.generate_text(prompt)

        # 5. Save report
        report.content = generated_text
        report.status = ReportStatus.COMPLETED
        report.save(update_fields=["content", "status", "updated_at"])

    except Exception as e:
        report.status = ReportStatus.FAILED
        report.error_message = str(e)
        report.save(update_fields=["status", "error_message", "updated_at"])
