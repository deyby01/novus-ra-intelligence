"""Admin registrations for dashboards and widgets."""

from django.contrib import admin

from apps.dashboards.models import Dashboard, Widget


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    """Browse dashboards by tenant."""

    list_display = ("name", "organization", "created_at")
    list_filter = ("organization",)
    search_fields = ("name",)


@admin.register(Widget)
class WidgetAdmin(admin.ModelAdmin):
    """Browse widgets by dashboard and chart type."""

    list_display = ("dashboard", "chart_type", "dataset", "created_at")
    list_filter = ("chart_type", "organization")
