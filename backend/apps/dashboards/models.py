"""Dashboard models: tenant-owned dashboards composed of dataset-fed widgets."""

from django.db import models

from apps.core.models import AuthoredModel, TenantBaseModel


class Dashboard(TenantBaseModel, AuthoredModel):
    """A tenant-owned canvas that groups widgets over the tenant's datasets."""

    name = models.CharField(max_length=255)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Widget(TenantBaseModel):
    """A single visualization on a dashboard, fed by one dataset."""

    class ChartType(models.TextChoices):
        """The visualization a widget renders."""

        LINE = "line", "Line"
        BAR = "bar", "Bar"
        PIE = "pie", "Pie"
        KPI = "kpi", "KPI"
        TABLE = "table", "Table"

    dashboard = models.ForeignKey(
        Dashboard,
        on_delete=models.CASCADE,
        related_name="widgets",
    )
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.PROTECT,
        related_name="widgets",
    )
    chart_type = models.CharField(max_length=20, choices=ChartType.choices)
    config = models.JSONField(default=dict)
    position = models.JSONField(default=dict)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.dashboard} · {self.chart_type}"
