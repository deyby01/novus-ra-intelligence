"""Serializers for the Dashboard and Widget APIs."""

from rest_framework import serializers

from apps.dashboards.models import Dashboard, Widget
from apps.datasets.models import Dataset


class DashboardSerializer(serializers.ModelSerializer):
    """Serialize dashboards, hiding the organization and authorship from writes."""

    widget_types = serializers.SerializerMethodField()
    dataset_ids = serializers.SerializerMethodField()

    class Meta:
        model = Dashboard
        fields = [
            "id",
            "name",
            "description",
            "widget_types",
            "dataset_ids",
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

    def get_widget_types(self, obj: Dashboard) -> list[str]:
        """The chart types of the dashboard's widgets, in order.

        Drives the card's mini-preview, so it only ever names chart types the
        product can actually build. The viewset prefetches ``widgets``, so this
        adds no query when listing.
        """
        return [widget.chart_type for widget in obj.widgets.all()]

    def get_dataset_ids(self, obj: Dashboard) -> list[str]:
        """Distinct dataset ids the dashboard's widgets are connected to."""
        seen: list[str] = []
        for widget in obj.widgets.all():
            dataset_id = str(widget.dataset_id)
            if dataset_id not in seen:
                seen.append(dataset_id)
        return seen


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
