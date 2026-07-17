"""Tenant-scoped viewsets for dashboards and their widgets."""

from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.throttling import BaseThrottle, ScopedRateThrottle

from apps.activity.models import ActivityEvent
from apps.activity.services import record_activity
from apps.core.tenancy import AuthoredModelViewSetMixin, TenantQuerysetMixin
from apps.dashboards.models import Dashboard, Widget
from apps.dashboards.serializers import DashboardSerializer, WidgetSerializer
from apps.dashboards.services.generation_service import (
    EmptyDatasetError,
    generate_dashboard,
)
from apps.datasets.models import Dataset


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

    def get_throttles(self) -> list[BaseThrottle]:
        """Throttle only the AI generation (a paid Gemini call)."""
        if self.action == "generate":
            self.throttle_scope = "dashboards_generate"
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def perform_create(self, serializer: BaseSerializer) -> None:
        """Create the dashboard, then record it on the activity feed."""
        super().perform_create(serializer)
        self._record_created(serializer.instance)

    def _record_created(self, dashboard: Dashboard) -> None:
        """Emit a DASHBOARD_CREATED activity event for a new dashboard."""
        record_activity(
            organization=dashboard.organization,
            actor=self.request.user,
            verb=ActivityEvent.Verb.DASHBOARD_CREATED,
            target_type="dashboard",
            target_id=dashboard.id,
            target_label=dashboard.name,
        )

    @action(detail=True, methods=["post"], url_path="duplicate")
    def duplicate(self, request: Request, pk: str | None = None) -> Response:
        """Copy a dashboard and all its widgets into a new one."""
        source = self.get_object()  # tenant-scoped: a foreign id 404s here.
        organization = self.current_organization
        with transaction.atomic():
            copy = Dashboard.objects.create(
                name=f"{source.name} (copia)",
                organization=organization,
                created_by=request.user,
                updated_by=request.user,
            )
            Widget.objects.bulk_create(
                Widget(
                    dashboard=copy,
                    dataset=widget.dataset,
                    chart_type=widget.chart_type,
                    config=widget.config,
                    position=widget.position,
                    organization=organization,
                )
                for widget in source.widgets.all()
            )
        self._record_created(copy)
        serializer = self.get_serializer(copy)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request: Request) -> Response:
        """Generate a dashboard from a dataset (deterministic widgets + AI naming)."""
        dataset_id = request.data.get("dataset")
        if not dataset_id:
            return Response(
                {"detail": "Dataset ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            dataset = Dataset.objects.get(id=dataset_id, organization=self.current_organization)
        except (Dataset.DoesNotExist, ValidationError, ValueError):
            return Response({"detail": "Dataset not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            dashboard = generate_dashboard(dataset, request.user)
        except EmptyDatasetError:
            return Response(
                {"detail": "El dataset no tiene datos suficientes para un dashboard."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self._record_created(dashboard)
        serializer = self.get_serializer(dashboard)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
