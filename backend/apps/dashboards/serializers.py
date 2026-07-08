"""Serializers for the Dashboard and Widget APIs."""

from rest_framework import serializers

from apps.dashboards.models import Dashboard, Widget
from apps.datasets.models import Dataset


class DashboardSerializer(serializers.ModelSerializer):
    """Serialize dashboards, hiding the organization and authorship from writes."""

    class Meta:
        model = Dashboard
        fields = [
            "id",
            "name",
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


class WidgetSerializer(serializers.ModelSerializer):
    """Serialize widgets; related dashboard and dataset are scoped to the org.

    Restricting both related-field querysets to the current organization makes
    a cross-tenant ``dashboard`` or ``dataset`` id fail validation, so a widget
    can never bridge tenants.
    """

    class Meta:
        model = Widget
        fields = [
            "id",
            "dashboard",
            "dataset",
            "chart_type",
            "config",
            "position",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs) -> None:
        """Limit dashboard and dataset choices to the requesting organization."""
        super().__init__(*args, **kwargs)
        view = self.context.get("view")
        if view is None or getattr(view, "swagger_fake_view", False):
            return
        organization = view.current_organization
        self.fields["dashboard"].queryset = Dashboard.objects.filter(organization=organization)
        self.fields["dataset"].queryset = Dataset.objects.filter(organization=organization)
