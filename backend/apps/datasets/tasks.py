"""Celery tasks for the datasets app: async Excel import processing."""

from celery import shared_task

from apps.activity.models import ActivityEvent
from apps.activity.services import record_activity
from apps.datasets.models import ImportJob
from apps.datasets.services.import_service import import_workbook


@shared_task
def process_import_job(import_job_id: str) -> None:
    """Run an import job through its state machine, recording the outcome.

    Marks the job ``processing``, runs the import service, and marks it ``done``
    with the row count on success. Any failure flips the job to ``error`` and
    records the message so the client polling the job can surface it.

    Args:
        import_job_id: Primary key of the :class:`ImportJob` to process.
    """
    job = ImportJob.objects.select_related("dataset", "organization", "created_by").get(
        pk=import_job_id
    )
    job.status = ImportJob.Status.PROCESSING
    job.save(update_fields=["status", "updated_at"])
    try:
        rows_processed = import_workbook(job)
    except Exception as exc:  # noqa: BLE001 — any failure must be recorded, not raised.
        job.status = ImportJob.Status.ERROR
        job.errors = {"detail": str(exc)}
        job.save(update_fields=["status", "errors", "updated_at"])
        return
    job.status = ImportJob.Status.DONE
    job.rows_processed = rows_processed
    job.save(update_fields=["status", "rows_processed", "updated_at"])

    # Record the successful import on the workspace activity feed. Done after the
    # job is marked DONE (not inside the try above) so a feed hiccup can never
    # flip a genuinely successful import to ERROR.
    record_activity(
        organization=job.organization,
        actor=job.created_by,
        verb=ActivityEvent.Verb.DATASET_IMPORTED,
        target_type="dataset",
        target_id=job.dataset_id,
        target_label=job.dataset.name,
    )
