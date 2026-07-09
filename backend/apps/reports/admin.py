from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    """Admin interface for the Report model."""

    list_display = ("id", "dataset", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("dataset__name", "id")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
