from django.core.exceptions import ValidationError
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.tenancy import TenantQuerysetMixin
from apps.datasets.models import Dataset
from apps.reports.models import Report
from apps.reports.serializers import ReportSerializer
from apps.reports.services import ReportService


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
