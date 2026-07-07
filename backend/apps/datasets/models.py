"""Dynamic dataset models: datasets, their fields, rows, and import jobs."""

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.db import models

from apps.core.models import AuthoredModel, TenantBaseModel


class Dataset(TenantBaseModel, AuthoredModel):
    """A tenant-owned collection of rows with a user-defined, dynamic schema."""

    class Source(models.TextChoices):
        """Where a dataset's rows originate from."""

        EXCEL = "excel", "Excel"
        MANUAL = "manual", "Manual"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class DatasetField(TenantBaseModel):
    """A single column definition describing one key in a dataset's schema."""

    class FieldType(models.TextChoices):
        """The value type expected for a dataset field."""

        TEXT = "text", "Text"
        NUMBER = "number", "Number"
        DATE = "date", "Date"
        BOOLEAN = "boolean", "Boolean"
        SELECT = "select", "Select"

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name="fields",
    )
    key = models.CharField(max_length=255)
    label = models.CharField(max_length=255)
    field_type = models.CharField(
        max_length=20,
        choices=FieldType.choices,
        default=FieldType.TEXT,
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["dataset", "key"],
                name="unique_field_key_per_dataset",
            ),
        ]
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{self.dataset} · {self.key}"


class DatasetRow(TenantBaseModel):
    """A single data row stored as a JSONB document keyed by dataset fields."""

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name="rows",
    )
    data = models.JSONField(default=dict)

    class Meta:
        indexes = [
            GinIndex(fields=["data"], name="datasetrow_data_gin"),
        ]

    def __str__(self) -> str:
        return f"{self.dataset} row {self.pk}"


class ImportJob(TenantBaseModel):
    """A record of an uploaded file being imported into a dataset."""

    class Status(models.TextChoices):
        """Lifecycle state of an import job."""

        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        DONE = "done", "Done"
        ERROR = "error", "Error"

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name="import_jobs",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    file = models.FileField(upload_to="imports/")
    rows_processed = models.PositiveIntegerField(default=0)
    errors = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="import_jobs",
    )

    def __str__(self) -> str:
        return f"{self.dataset} import ({self.status})"
