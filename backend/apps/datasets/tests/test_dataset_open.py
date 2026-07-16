"""Tests for the dataset 'open' action and last_activity ordering (R5b)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.tests.factories import DatasetFactory, MembershipFactory

DATASETS_URL = "/api/v1/datasets/"


@pytest.fixture
def membership():
    return MembershipFactory()


def _client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def _header(organization):
    return {"HTTP_X_ORGANIZATION": str(organization.id)}


def _open_url(dataset_id):
    return f"{DATASETS_URL}{dataset_id}/open/"


@pytest.mark.django_db
def test_open_sets_last_opened_at(membership):
    """POSTing to /datasets/{id}/open/ sets last_opened_at (was null)."""
    dataset = DatasetFactory(organization=membership.organization)
    assert dataset.last_opened_at is None

    response = _client(membership.user).post(
        _open_url(dataset.id), **_header(membership.organization)
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT
    dataset.refresh_from_db()
    assert dataset.last_opened_at is not None


@pytest.mark.django_db
def test_open_is_tenant_scoped(membership):
    """A member of org A cannot open a dataset belonging to org B (404)."""
    other_membership = MembershipFactory()
    foreign_dataset = DatasetFactory(organization=other_membership.organization)

    response = _client(membership.user).post(
        _open_url(foreign_dataset.id), **_header(membership.organization)
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_open_requires_authentication(membership):
    """An anonymous request returns 401."""
    dataset = DatasetFactory(organization=membership.organization)
    client = APIClient()

    response = client.post(_open_url(dataset.id), **_header(membership.organization))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_last_activity_ordering_prefers_opened_over_newer_unopened(membership):
    """Ordering by -last_activity puts a just-opened older dataset first."""
    org = membership.organization
    older = DatasetFactory(organization=org, name="Older")
    newer = DatasetFactory(organization=org, name="Newer")  # noqa: F841
    # newer was created second, so its updated_at is later — without opening,
    # ordering by -last_activity should put newer first.

    # Open the older dataset so its last_opened_at > newer's updated_at.
    _client(membership.user).post(_open_url(older.id), **_header(org))

    response = _client(membership.user).get(
        DATASETS_URL, {"ordering": "-last_activity"}, **_header(org)
    )

    names = [row["name"] for row in response.data["results"]]
    assert names.index("Older") < names.index("Newer")


@pytest.mark.django_db
def test_last_activity_falls_back_to_updated_at_when_never_opened(membership):
    """Datasets that have never been opened use updated_at for last_activity."""
    org = membership.organization
    first = DatasetFactory(organization=org, name="First")  # noqa: F841
    second = DatasetFactory(organization=org, name="Second")
    # Bump second so it's clearly more recent.
    second.save()

    response = _client(membership.user).get(
        DATASETS_URL, {"ordering": "-last_activity"}, **_header(org)
    )

    names = [row["name"] for row in response.data["results"]]
    assert names.index("Second") < names.index("First")
