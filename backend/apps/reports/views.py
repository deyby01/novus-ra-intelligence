import re

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.http import HttpResponse
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle, ScopedRateThrottle

from apps.core.tenancy import TenantQuerysetMixin
from apps.datasets.models import Dataset
from apps.reports.models import Report, ReportStatus
from apps.reports.pdf import render_report_pdf
from apps.reports.serializers import ReportSerializer
from apps.reports.services import ReportService


def _pdf_filename(report: Report) -> str:
    """Build a safe ASCII PDF filename from the dataset name."""
    slug = re.sub(r"[^A-Za-z0-9]+", "-", report.dataset.name).strip("-").lower()
    return f"{slug}-report.pdf" if slug else f"report-{report.id}.pdf"


class ReportViewSet(
    TenantQuerysetMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """List, retrieve, and request AI reports scoped to the current organization."""

    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    queryset = Report.objects.select_related("dataset")
    filterset_fields = ["dataset", "status"]
    ordering_fields = ["created_at"]

    def get_throttles(self) -> list[BaseThrottle]:
        """Throttle only the expensive actions (paid AI call, PDF render)."""
        scope = {"create": "reports_generate", "pdf": "reports_pdf"}.get(self.action)
        if scope:
            self.throttle_scope = scope
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def create(self, request: Request, *args, **kwargs) -> Response:
        """Request a new AI report for a dataset in the current organization."""
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
        report = ReportService.request_report(dataset=dataset, user=request.user)
        serializer = self.get_serializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request: Request, pk: str | None = None) -> HttpResponse | Response:
        """Download a completed report as a server-rendered PDF."""
        report = self.get_object()  # tenant-scoped: a foreign id 404s here.
        if report.status != ReportStatus.COMPLETED:
            return Response(
                {"detail": "Report is not ready."},
                status=status.HTTP_409_CONFLICT,
            )
        # A report's content is immutable for its id, so the rendered bytes never
        # go stale; cache them to skip the synchronous render on repeat downloads.
        cache_key = f"report-pdf:{report.id}"
        pdf_bytes = cache.get(cache_key)
        if pdf_bytes is None:
            pdf_bytes = render_report_pdf(report)
            cache.set(cache_key, pdf_bytes, timeout=60 * 60 * 24)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{_pdf_filename(report)}"'
        return response
