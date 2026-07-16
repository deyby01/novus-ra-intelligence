"""Factory-boy factories for activity feed tests."""

import uuid

import factory

from apps.activity.models import ActivityEvent
from apps.datasets.tests.factories import OrganizationFactory, UserFactory


class ActivityEventFactory(factory.django.DjangoModelFactory):
    """Build activity events scoped to an organization."""

    class Meta:
        model = ActivityEvent

    organization = factory.SubFactory(OrganizationFactory)
    actor = factory.SubFactory(UserFactory)
    verb = ActivityEvent.Verb.DATASET_IMPORTED
    target_type = "dataset"
    target_id = factory.LazyFunction(uuid.uuid4)
    target_label = factory.Sequence(lambda n: f"Target {n}")
