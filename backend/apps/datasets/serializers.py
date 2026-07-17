"""Serializers for the Dataset, DatasetField, DatasetRow, and ImportJob APIs."""

from rest_framework import serializers

from apps.datasets.models import Dataset, DatasetField, DatasetRow, ImportJob
from apps.datasets.services.aggregation_service import AGGREGATIONS

ALLOWED_IMPORT_EXTENSIONS = (".xlsx", ".xls")


class DatasetSerializer(serializers.ModelSerializer):
    """Serialize datasets, hiding the organization and authorship from writes."""

    row_count = serializers.SerializerMethodField()
    field_count = serializers.SerializerMethodField()
    has_report = serializers.SerializerMethodField()

    class Meta:
        model = Dataset
        fields = [
            "id",
            "name",
            "description",
            "source",
            "row_count",
            "field_count",
            "has_report",
            "last_opened_at",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "last_opened_at",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]

    def get_row_count(self, obj: Dataset) -> int:
        """Return how many rows the dataset holds.

        Reads the viewset's queryset annotation to keep list responses at one
        query; falls back to a count for unannotated instances (e.g. the object
        echoed back by create).
        """
        annotated = getattr(obj, "row_count", None)
        return annotated if annotated is not None else obj.rows.count()

    def get_field_count(self, obj: Dataset) -> int:
        """Return how many columns (fields) the dataset's schema defines."""
        annotated = getattr(obj, "field_count", None)
        return annotated if annotated is not None else obj.fields.count()

    def get_has_report(self, obj: Dataset) -> bool:
        """Whether the AI has produced at least one report for this dataset."""
        annotated = getattr(obj, "has_report", None)
        return annotated if annotated is not None else obj.reports.exists()


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


class ImportJobSerializer(TenantScopedDatasetSerializer):
    """Serialize import jobs; only ``dataset`` and ``file`` are client-writable."""

    class Meta:
        model = ImportJob
        fields = [
            "id",
            "dataset",
            "file",
            "status",
            "rows_processed",
            "errors",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "rows_processed",
            "errors",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate_file(self, value: object) -> object:
        """Reject uploads whose name lacks an Excel extension."""
        name = getattr(value, "name", "") or ""
        if not name.lower().endswith(ALLOWED_IMPORT_EXTENSIONS):
            allowed = ", ".join(ALLOWED_IMPORT_EXTENSIONS)
            raise serializers.ValidationError(f"The file must be an Excel workbook ({allowed}).")
        return value


class AggregationQuerySerializer(serializers.Serializer):
    """Validate the query params of the dataset aggregation endpoint.

    Instantiate with ``context={"dataset": dataset}``; field keys are checked
    against that dataset's dynamic schema so typos surface as 400 responses
    rather than silent empty results.
    """

    agg = serializers.ChoiceField(choices=AGGREGATIONS)
    metric = serializers.CharField(required=False)
    group_by = serializers.CharField(required=False)

    def validate(self, attrs: dict) -> dict:
        """Cross-check the params against the dataset's field definitions."""
        dataset = self.context["dataset"]
        fields_by_key = {field.key: field for field in dataset.fields.all()}

        metric = attrs.get("metric")
        if attrs["agg"] != "count":
            if metric is None:
                raise serializers.ValidationError(
                    {"metric": f"A metric is required for '{attrs['agg']}'."}
                )
            metric_field = fields_by_key.get(metric)
            if metric_field is None:
                raise serializers.ValidationError({"metric": "Unknown field key for this dataset."})
            if metric_field.field_type != DatasetField.FieldType.NUMBER:
                raise serializers.ValidationError(
                    {"metric": "The metric field must be a number field."}
                )

        group_by = attrs.get("group_by")
        if group_by is not None and group_by not in fields_by_key:
            raise serializers.ValidationError({"group_by": "Unknown field key for this dataset."})
        return attrs
