from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import AuthoredModel, BaseModel
from apps.datasets.models import Dataset


class ReportStatus(models.TextChoices):
    """Status choices for the Report model."""

    PENDING = "PENDING", _("Pending")
    COMPLETED = "COMPLETED", _("Completed")
    FAILED = "FAILED", _("Failed")


class Report(BaseModel, AuthoredModel):
    """Represents an AI-generated natural language report analyzing a specific Dataset."""

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name="reports",
        help_text=_("The dataset this report analyzes."),
    )
    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.PENDING,
        help_text=_("The current status of the report generation."),
    )
    content = models.TextField(
        blank=True,
        help_text=_("The AI-generated report text in markdown format."),
    )
    error_message = models.TextField(
        blank=True,
        help_text=_("Error details if the report generation failed."),
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("Report")
        verbose_name_plural = _("Reports")

    def __str__(self) -> str:
        return f"Report {self.id} for {self.dataset.name} ({self.status})"
