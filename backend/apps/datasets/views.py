"""Tenant-scoped viewsets for datasets, their fields, rows, and import jobs."""

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from apps.core.tenancy import AuthoredModelViewSetMixin, TenantQuerysetMixin
from apps.datasets.models import Dataset, DatasetField, DatasetRow, ImportJob
from apps.datasets.serializers import (
    AggregationQuerySerializer,
    DatasetFieldSerializer,
    DatasetRowSerializer,
    DatasetSerializer,
    ImportJobSerializer,
)
from apps.datasets.services.aggregation_service import aggregate_dataset
from apps.datasets.services.overview_service import build_dataset_overview
from apps.datasets.tasks import process_import_job


class DatasetViewSet(
    AuthoredModelViewSetMixin,
    TenantQuerysetMixin,
    viewsets.ModelViewSet,
):
    """CRUD for datasets, scoped to the current organization and authored."""

    permission_classes = [IsAuthenticated]
    serializer_class = DatasetSerializer
    queryset = Dataset.objects.select_related("organization", "created_by", "updated_by")
    filterset_fields = ["source"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    @action(detail=True, methods=["get"])
    def aggregate(self, request: Request, pk: str | None = None) -> Response:
        """Aggregate the dataset's rows for a widget (KPI, bar, or line)."""
        dataset = self.get_object()
        query = AggregationQuerySerializer(data=request.query_params, context={"dataset": dataset})
        query.is_valid(raise_exception=True)
        params = query.validated_data

        results = aggregate_dataset(
            dataset,
            aggregation=params["agg"],
            metric_key=params.get("metric"),
            group_by_key=params.get("group_by"),
        )
        return Response(
            {
                "aggregation": params["agg"],
                "metric": params.get("metric"),
                "group_by": params.get("group_by"),
                "results": results,
            }
        )

    @action(detail=True, methods=["get"], url_path="overview")
    def overview(self, request: Request, pk: str | None = None) -> Response:
        """Return a deterministic, ephemeral overview (KPIs + charts) of the dataset."""
        dataset = self.get_object()
        return Response(build_dataset_overview(dataset))


class DatasetFieldViewSet(
    TenantQuerysetMixin,
    viewsets.ModelViewSet,
):
    """CRUD for dataset field definitions, scoped to the current organization."""

    permission_classes = [IsAuthenticated]
    serializer_class = DatasetFieldSerializer
    queryset = DatasetField.objects.select_related("dataset")
    filterset_fields = ["dataset", "field_type"]
    ordering_fields = ["order"]


class DatasetRowViewSet(
    TenantQuerysetMixin,
    viewsets.ModelViewSet,
):
    """CRUD for dataset rows, scoped to the current organization."""

    permission_classes = [IsAuthenticated]
    serializer_class = DatasetRowSerializer
    queryset = DatasetRow.objects.select_related("dataset").order_by("created_at")
    filterset_fields = ["dataset"]
    ordering_fields = ["created_at"]


class ImportJobViewSet(
    TenantQuerysetMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Create, retrieve, and list import jobs for the current organization.

    Jobs are append-only from the client's view: an upload is created, then
    polled for status. Update and delete are intentionally unsupported, so the
    viewset omits those mixins rather than restricting a full ``ModelViewSet``.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = ImportJobSerializer
    queryset = ImportJob.objects.select_related("dataset", "created_by").order_by("created_at")
    filterset_fields = ["dataset", "status"]
    ordering_fields = ["created_at"]

    def perform_create(self, serializer: BaseSerializer) -> None:
        """Persist the job with the org + author, then dispatch the import task."""
        super().perform_create(serializer, created_by=self.request.user)
        process_import_job.delay(str(serializer.instance.pk))
