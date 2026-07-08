"""Tenant-scoped viewsets for dashboards and their widgets."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

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
    queryset = Dashboard.objects.select_related("organization", "created_by", "updated_by")
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]


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
