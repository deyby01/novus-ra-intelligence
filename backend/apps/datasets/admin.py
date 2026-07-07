"""Admin registration for datasets and import jobs."""

from django.contrib import admin

from apps.datasets.models import Dataset, ImportJob


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    """Admin configuration for the Dataset model."""

    list_display = ("name", "organization", "source", "created_at")
    list_filter = ("source",)
    search_fields = ("name",)
    raw_id_fields = ("organization", "created_by", "updated_by")


@admin.register(ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    """Admin configuration for the ImportJob model."""

    list_display = ("dataset", "status", "rows_processed", "created_at")
    list_filter = ("status",)
    raw_id_fields = ("organization", "dataset", "created_by")
