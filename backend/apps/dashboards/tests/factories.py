"""Factory-boy factories for dashboard tests."""

import factory

from apps.dashboards.models import Dashboard, Widget
from apps.datasets.tests.factories import DatasetFactory, OrganizationFactory


class DashboardFactory(factory.django.DjangoModelFactory):
    """Build dashboards scoped to an organization."""

    class Meta:
        model = Dashboard

    organization = factory.SubFactory(OrganizationFactory)
    name = factory.Sequence(lambda n: f"Dashboard {n}")


class WidgetFactory(factory.django.DjangoModelFactory):
    """Build widgets sharing their dashboard's organization."""

    class Meta:
        model = Widget

    dashboard = factory.SubFactory(DashboardFactory)
    organization = factory.SelfAttribute("dashboard.organization")
    dataset = factory.SubFactory(
        DatasetFactory,
        organization=factory.SelfAttribute("..dashboard.organization"),
    )
    chart_type = Widget.ChartType.KPI
