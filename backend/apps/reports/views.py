from django.db.models import QuerySet
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.datasets.models import Dataset
from apps.reports.models import Report
from apps.reports.serializers import ReportSerializer
from apps.reports.services import ReportService


class ReportViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """API ViewSet for managing AI Reports."""

    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet:
        """Return all reports. Tenant filtering is handled via the organizations app implicitly."""
        return Report.objects.select_related("dataset").all()

    def create(self, request: Request, *args, **kwargs) -> Response:  # type: ignore
        """Request a new AI report for a specific dataset."""
        dataset_id = request.data.get("dataset")
        if not dataset_id:
            return Response(
                {"detail": "Dataset ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"detail": "Dataset not found."}, status=status.HTTP_404_NOT_FOUND)

        report = ReportService.request_report(dataset=dataset, user=request.user)
        serializer = self.get_serializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
