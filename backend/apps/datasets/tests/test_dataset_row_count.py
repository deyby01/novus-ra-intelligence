"""Tests for the dataset list's row_count and recency ordering (Home redesign R1)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.tests.factories import (
    DatasetFactory,
    DatasetRowFactory,
    MembershipFactory,
)

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


@pytest.mark.django_db
def test_dataset_list_includes_row_count(membership):
    dataset = DatasetFactory(organization=membership.organization)
    DatasetRowFactory.create_batch(3, dataset=dataset)

    response = _client(membership.user).get(DATASETS_URL, **_header(membership.organization))

    assert response.status_code == status.HTTP_200_OK
    assert response.data["results"][0]["row_count"] == 3


@pytest.mark.django_db
def test_row_count_is_zero_for_a_dataset_without_rows(membership):
    DatasetFactory(organization=membership.organization)

    response = _client(membership.user).get(DATASETS_URL, **_header(membership.organization))

    assert response.data["results"][0]["row_count"] == 0


@pytest.mark.django_db
def test_row_count_counts_only_the_datasets_own_rows(membership):
    """Each dataset reports its own rows, not the organization's total."""
    first = DatasetFactory(organization=membership.organization, name="A dataset")
    second = DatasetFactory(organization=membership.organization, name="B dataset")
    DatasetRowFactory.create_batch(2, dataset=first)
    DatasetRowFactory.create_batch(5, dataset=second)

    response = _client(membership.user).get(DATASETS_URL, **_header(membership.organization))

    counts = {row["name"]: row["row_count"] for row in response.data["results"]}
    assert counts == {"A dataset": 2, "B dataset": 5}


@pytest.mark.django_db
def test_dataset_list_can_be_ordered_by_recency(membership):
    """The Home lists most-recent-first, so `updated_at` must be orderable.

    The names are deliberately reverse-alphabetical to recency: the model's
    default ordering is by name, so this only passes if `-updated_at` is
    genuinely applied.
    """
    older = DatasetFactory(organization=membership.organization, name="Alpha")
    newer = DatasetFactory(organization=membership.organization, name="Zeta")
    newer.save()  # bump updated_at

    response = _client(membership.user).get(
        DATASETS_URL, {"ordering": "-updated_at"}, **_header(membership.organization)
    )

    names = [row["name"] for row in response.data["results"]]
    assert names.index(newer.name) < names.index(older.name)


@pytest.mark.django_db
def test_created_dataset_reports_a_row_count(membership):
    """A create response is not annotated; row_count must still serialize."""
    response = _client(membership.user).post(
        DATASETS_URL,
        {"name": "Fresh", "source": "manual"},
        **_header(membership.organization),
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["row_count"] == 0
