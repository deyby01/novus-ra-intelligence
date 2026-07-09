from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    """Serializer for the Report model."""

    class Meta:
        model = Report
        fields = (
            "id",
            "dataset",
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
