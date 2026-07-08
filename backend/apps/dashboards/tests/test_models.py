"""Model tests for dashboards and widgets: integrity and referential actions."""

import pytest
from django.db.models import ProtectedError

from apps.dashboards.models import Widget
from apps.dashboards.tests.factories import DashboardFactory, WidgetFactory


@pytest.mark.django_db
def test_deleting_a_dashboard_cascades_to_its_widgets():
    widget = WidgetFactory()

    widget.dashboard.delete()

    assert not Widget.objects.filter(pk=widget.pk).exists()


@pytest.mark.django_db
def test_deleting_a_dataset_used_by_a_widget_is_protected():
    widget = WidgetFactory()

    with pytest.raises(ProtectedError):
        widget.dataset.delete()


@pytest.mark.django_db
def test_widget_defaults_are_independent_dicts():
    first = WidgetFactory()
    second = WidgetFactory()
    first.config["metric"] = "units"

    assert second.config == {}
    assert first.position == {}


@pytest.mark.django_db
def test_dashboard_str_is_its_name():
    dashboard = DashboardFactory(name="Sales overview")

    assert str(dashboard) == "Sales overview"
