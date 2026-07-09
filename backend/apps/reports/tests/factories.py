"""Factory-boy factories for reports tenant-isolation tests."""

import factory

from apps.datasets.tests.factories import DatasetFactory, UserFactory
from apps.reports.models import Report


class ReportFactory(factory.django.DjangoModelFactory):
    """Build reports sharing their dataset's organization."""

    class Meta:
        model = Report

    dataset = factory.SubFactory(DatasetFactory)
    organization = factory.SelfAttribute("dataset.organization")
    created_by = factory.SubFactory(UserFactory)
    updated_by = factory.SubFactory(UserFactory)
