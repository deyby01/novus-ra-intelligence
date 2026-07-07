"""Serializers for the Dataset, DatasetField, and DatasetRow APIs."""

from rest_framework import serializers

from apps.datasets.models import Dataset, DatasetField, DatasetRow


class DatasetSerializer(serializers.ModelSerializer):
    """Serialize datasets, hiding the organization and authorship from writes."""

    class Meta:
        model = Dataset
        fields = [
            "id",
            "name",
            "description",
            "source",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]


class TenantScopedDatasetSerializer(serializers.ModelSerializer):
    """Base serializer whose ``dataset`` relation is scoped to the current org.

    Restricting the related-field queryset to the current organization's datasets
    makes a cross-tenant ``dataset`` id fail validation, so a tenant can never
    attach a child row to another tenant's dataset.
    """

    def __init__(self, *args, **kwargs) -> None:
        """Limit the ``dataset`` choices to the requesting organization's datasets."""
        super().__init__(*args, **kwargs)
        view = self.context.get("view")
        if view is None or getattr(view, "swagger_fake_view", False):
            return
        self.fields["dataset"].queryset = Dataset.objects.filter(
            organization=view.current_organization
        )


class DatasetFieldSerializer(TenantScopedDatasetSerializer):
    """Serialize dataset field definitions, hiding the organization from writes."""

    class Meta:
        model = DatasetField
        fields = [
            "id",
            "dataset",
            "key",
            "label",
            "field_type",
            "order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DatasetRowSerializer(TenantScopedDatasetSerializer):
    """Serialize dataset rows, hiding the organization from writes."""

    class Meta:
        model = DatasetRow
        fields = [
            "id",
            "dataset",
            "data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
