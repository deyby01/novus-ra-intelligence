"""Tenant-scoped viewsets for datasets, their fields, and their rows."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.tenancy import AuthoredModelViewSetMixin, TenantQuerysetMixin
from apps.datasets.models import Dataset, DatasetField, DatasetRow
from apps.datasets.serializers import (
    DatasetFieldSerializer,
    DatasetRowSerializer,
    DatasetSerializer,
)


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
