"""Tenant-isolation suite for the activity feed API."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.activity.models import ActivityEvent
from apps.activity.tests.factories import ActivityEventFactory
from apps.datasets.tests.factories import MembershipFactory, OrganizationFactory

ACTIVITY_URL = "/api/v1/activity/"


@pytest.fixture
def membership():
    """An active membership; its user acts as the tenant throughout."""
    return MembershipFactory()


@pytest.fixture
def org(membership):
    return membership.organization


@pytest.fixture
def client(membership):
    """An APIClient authenticated as the member with the org header set."""
    api_client = APIClient()
    token = RefreshToken.for_user(membership.user).access_token
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {token}",
        HTTP_X_ORGANIZATION=str(membership.organization.id),
    )
    return api_client


# --- Auth ---


@pytest.mark.django_db
def test_list_activity_requires_auth():
    response = APIClient().get(ACTIVITY_URL)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# --- Tenant isolation ---


@pytest.mark.django_db
def test_list_returns_only_the_current_organizations_events(client, org):
    ActivityEventFactory(organization=org, target_label="Mine")
    ActivityEventFactory(organization=OrganizationFactory(), target_label="Theirs")

    response = client.get(ACTIVITY_URL)

    assert response.status_code == status.HTTP_200_OK
    labels = [event["target_label"] for event in response.data["results"]]
    assert labels == ["Mine"]


# --- Ordering ---


@pytest.mark.django_db
def test_events_are_listed_newest_first(client, org):
    older = ActivityEventFactory(organization=org, target_label="Older")
    newer = ActivityEventFactory(organization=org, target_label="Newer")
    # created_at is auto_now_add; force a definite order regardless of clock ties.
    ActivityEvent.objects.filter(pk=older.pk).update(created_at="2026-07-10T00:00:00Z")
    ActivityEvent.objects.filter(pk=newer.pk).update(created_at="2026-07-15T00:00:00Z")

    response = client.get(ACTIVITY_URL)

    labels = [event["target_label"] for event in response.data["results"]]
    assert labels == ["Newer", "Older"]


# --- Serialized shape ---


@pytest.mark.django_db
def test_serializes_the_fields_the_feed_needs(client, org):
    event = ActivityEventFactory(
        organization=org,
        verb=ActivityEvent.Verb.DASHBOARD_CREATED,
        target_type="dashboard",
        target_label="Finanzas",
    )

    response = client.get(ACTIVITY_URL)

    payload = response.data["results"][0]
    assert payload["verb"] == ActivityEvent.Verb.DASHBOARD_CREATED
    assert payload["target_type"] == "dashboard"
    assert payload["target_label"] == "Finanzas"
    assert payload["target_id"] == str(event.target_id)
    assert payload["actor_email"] == event.actor.email
    assert "created_at" in payload


@pytest.mark.django_db
def test_actor_email_is_null_for_a_system_event(client, org):
    ActivityEventFactory(organization=org, actor=None)

    response = client.get(ACTIVITY_URL)

    assert response.data["results"][0]["actor_email"] is None


# --- Read-only ---


@pytest.mark.django_db
def test_the_feed_is_read_only(client, org):
    response = client.post(ACTIVITY_URL, {"verb": ActivityEvent.Verb.DATASET_IMPORTED})

    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
