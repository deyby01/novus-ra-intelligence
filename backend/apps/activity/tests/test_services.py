"""Unit tests for the record_activity helper."""

import uuid

import pytest

from apps.activity.models import ActivityEvent
from apps.activity.services import record_activity
from apps.datasets.tests.factories import OrganizationFactory, UserFactory


@pytest.mark.django_db
def test_record_activity_persists_the_event():
    org = OrganizationFactory()
    actor = UserFactory()
    target_id = uuid.uuid4()

    event = record_activity(
        organization=org,
        actor=actor,
        verb=ActivityEvent.Verb.DATASET_IMPORTED,
        target_type="dataset",
        target_id=target_id,
        target_label="Ventas Q3",
    )

    assert event.pk is not None
    assert event.organization == org
    assert event.actor == actor
    assert event.verb == ActivityEvent.Verb.DATASET_IMPORTED
    assert event.target_type == "dataset"
    assert event.target_id == target_id
    assert event.target_label == "Ventas Q3"


@pytest.mark.django_db
def test_record_activity_allows_a_system_event_without_an_actor():
    org = OrganizationFactory()

    event = record_activity(
        organization=org,
        verb=ActivityEvent.Verb.REPORT_GENERATED,
        target_type="dataset",
        target_label="Inventario",
    )

    assert event.actor is None
    assert event.target_id is None
