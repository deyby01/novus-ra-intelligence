from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    """Serializer for the Report model."""

    # Reports are listed across datasets (the Home), where an id is not a label.
    # The viewset select_relateds `dataset`, so this costs no extra query.
    dataset_name = serializers.CharField(source="dataset.name", read_only=True)

    class Meta:
        model = Report
        fields = (
            "id",
            "dataset",
            "dataset_name",
            "status",
            "content",
            "error_message",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "content",
            "error_message",
            "created_at",
            "updated_at",
        )
