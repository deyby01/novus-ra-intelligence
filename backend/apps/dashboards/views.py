"""Tenant-scoped viewsets for dashboards and their widgets."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import BaseSerializer

from apps.activity.models import ActivityEvent
from apps.activity.services import record_activity
from apps.core.tenancy import AuthoredModelViewSetMixin, TenantQuerysetMixin
from apps.dashboards.models import Dashboard, Widget
from apps.dashboards.serializers import DashboardSerializer, WidgetSerializer


class DashboardViewSet(
    AuthoredModelViewSetMixin,
    TenantQuerysetMixin,
    viewsets.ModelViewSet,
):
    """CRUD for dashboards, scoped to the current organization and authored."""

    permission_classes = [IsAuthenticated]
    serializer_class = DashboardSerializer
    # Prefetch widgets so the serializer can expose each dashboard's widget
    # types + connected datasets (for the card preview) without an N+1.
    queryset = Dashboard.objects.select_related(
        "organization", "created_by", "updated_by"
    ).prefetch_related("widgets")
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer: BaseSerializer) -> None:
        """Create the dashboard, then record it on the activity feed."""
        super().perform_create(serializer)
        dashboard = serializer.instance
        record_activity(
            organization=dashboard.organization,
            actor=self.request.user,
            verb=ActivityEvent.Verb.DASHBOARD_CREATED,
            target_type="dashboard",
            target_id=dashboard.id,
            target_label=dashboard.name,
        )


class WidgetViewSet(
    TenantQuerysetMixin,
    viewsets.ModelViewSet,
):
    """CRUD for widgets, scoped to the current organization."""

    permission_classes = [IsAuthenticated]
    serializer_class = WidgetSerializer
    queryset = Widget.objects.select_related("dashboard", "dataset")
    filterset_fields = ["dashboard", "chart_type"]
    ordering_fields = ["created_at"]
