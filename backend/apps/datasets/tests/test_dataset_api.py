"""Tenant-isolation suite for the Dataset, DatasetField, and DatasetRow APIs."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.datasets.models import Dataset, DatasetField, DatasetRow
from apps.datasets.tests.factories import (
    DatasetFactory,
    DatasetFieldFactory,
    DatasetRowFactory,
    MembershipFactory,
)

DATASETS_URL = "/api/v1/datasets/"
FIELDS_URL = "/api/v1/dataset-fields/"
ROWS_URL = "/api/v1/dataset-rows/"


@pytest.fixture
def membership_a():
    """An active membership; its user acts as tenant A throughout."""
    return MembershipFactory()


@pytest.fixture
def org_a(membership_a):
    return membership_a.organization


@pytest.fixture
def user_a(membership_a):
    return membership_a.user


@pytest.fixture
def org_b():
    """A second organization the tenant-A user is not a member of."""
    return DatasetFactory().organization


def _auth_client(user):
    """Return an APIClient carrying a valid bearer token for the user."""
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def _org_header(organization):
    return {"HTTP_X_ORGANIZATION": str(organization.id)}


# --- List isolation (the money test) ---


@pytest.mark.django_db
def test_list_returns_only_current_org_datasets(user_a, org_a, org_b):
    mine = [DatasetFactory(organization=org_a) for _ in range(2)]
    DatasetFactory(organization=org_b)
    client = _auth_client(user_a)

    response = client.get(DATASETS_URL, **_org_header(org_a))

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 2
    returned_ids = {row["id"] for row in response.data["results"]}
    assert returned_ids == {str(d.id) for d in mine}


@pytest.mark.django_db
def test_retrieve_other_tenant_dataset_returns_404(user_a, org_a, org_b):
    others = DatasetFactory(organization=org_b)
    client = _auth_client(user_a)

    response = client.get(f"{DATASETS_URL}{others.id}/", **_org_header(org_a))

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_patch_other_tenant_dataset_returns_404(user_a, org_a, org_b):
    others = DatasetFactory(organization=org_b)
    client = _auth_client(user_a)

    response = client.patch(
        f"{DATASETS_URL}{others.id}/",
        {"name": "Hijacked"},
        format="json",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_delete_other_tenant_dataset_returns_404(user_a, org_a, org_b):
    others = DatasetFactory(organization=org_b)
    client = _auth_client(user_a)

    response = client.delete(f"{DATASETS_URL}{others.id}/", **_org_header(org_a))

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert Dataset.objects.filter(pk=others.id).exists()


# --- Create injects org + author, ignores client-supplied org ---


@pytest.mark.django_db
def test_create_injects_header_org_and_author_ignoring_payload(user_a, org_a, org_b):
    client = _auth_client(user_a)

    response = client.post(
        DATASETS_URL,
        {"name": "Sales", "organization": str(org_b.id)},
        format="json",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_201_CREATED
    created = Dataset.objects.get(pk=response.data["id"])
    assert created.organization == org_a
    assert created.organization != org_b
    assert created.created_by == user_a
    assert created.updated_by == user_a


# --- Header validation ---


@pytest.mark.django_db
def test_list_without_org_header_returns_400(user_a):
    client = _auth_client(user_a)

    response = client.get(DATASETS_URL)

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_create_without_org_header_returns_400(user_a):
    client = _auth_client(user_a)

    response = client.post(DATASETS_URL, {"name": "Sales"}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_header_org_without_membership_returns_404(user_a, org_b):
    client = _auth_client(user_a)

    response = client.get(DATASETS_URL, **_org_header(org_b))

    assert response.status_code == status.HTTP_404_NOT_FOUND


# --- Cross-tenant write guard on the related dataset field ---


@pytest.mark.django_db
def test_create_field_pointing_at_other_tenant_dataset_returns_400(user_a, org_a, org_b):
    foreign_dataset = DatasetFactory(organization=org_b)
    client = _auth_client(user_a)

    response = client.post(
        FIELDS_URL,
        {"dataset": str(foreign_dataset.id), "key": "region", "label": "Region"},
        format="json",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert not DatasetField.objects.filter(dataset=foreign_dataset).exists()


@pytest.mark.django_db
def test_create_row_pointing_at_other_tenant_dataset_returns_400(user_a, org_a, org_b):
    foreign_dataset = DatasetFactory(organization=org_b)
    client = _auth_client(user_a)

    response = client.post(
        ROWS_URL,
        {"dataset": str(foreign_dataset.id), "data": {"x": 1}},
        format="json",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert not DatasetRow.objects.filter(dataset=foreign_dataset).exists()


@pytest.mark.django_db
def test_create_field_on_own_dataset_succeeds(user_a, org_a):
    own_dataset = DatasetFactory(organization=org_a)
    client = _auth_client(user_a)

    response = client.post(
        FIELDS_URL,
        {"dataset": str(own_dataset.id), "key": "region", "label": "Region"},
        format="json",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_201_CREATED
    created = DatasetField.objects.get(pk=response.data["id"])
    assert created.organization == org_a
    assert created.dataset == own_dataset


# --- Update-path isolation (re-pointing and org drift) ---


@pytest.mark.django_db
def test_patch_own_field_to_foreign_dataset_returns_400(user_a, org_a, org_b):
    own_field = DatasetFieldFactory(dataset=DatasetFactory(organization=org_a))
    foreign_dataset = DatasetFactory(organization=org_b)
    client = _auth_client(user_a)

    response = client.patch(
        f"{FIELDS_URL}{own_field.id}/",
        {"dataset": str(foreign_dataset.id)},
        format="json",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    own_field.refresh_from_db()
    assert own_field.dataset.organization == org_a


@pytest.mark.django_db
def test_put_own_field_to_foreign_dataset_returns_400(user_a, org_a, org_b):
    own_field = DatasetFieldFactory(dataset=DatasetFactory(organization=org_a))
    foreign_dataset = DatasetFactory(organization=org_b)
    client = _auth_client(user_a)

    response = client.put(
        f"{FIELDS_URL}{own_field.id}/",
        {"dataset": str(foreign_dataset.id), "key": "region", "label": "Region"},
        format="json",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    own_field.refresh_from_db()
    assert own_field.dataset.organization == org_a


@pytest.mark.django_db
def test_update_payload_organization_on_dataset_is_ignored(user_a, org_a, org_b):
    own_dataset = DatasetFactory(organization=org_a)
    client = _auth_client(user_a)

    response = client.patch(
        f"{DATASETS_URL}{own_dataset.id}/",
        {"name": "Renamed", "organization": str(org_b.id)},
        format="json",
        **_org_header(org_a),
    )

    assert response.status_code == status.HTTP_200_OK
    own_dataset.refresh_from_db()
    assert own_dataset.name == "Renamed"
    assert own_dataset.organization == org_a


# --- Row filtering by dataset within the current org ---


@pytest.mark.django_db
def test_rows_filtered_by_dataset_within_current_org(user_a, org_a, org_b):
    dataset_one = DatasetFactory(organization=org_a)
    dataset_two = DatasetFactory(organization=org_a)
    DatasetRowFactory(dataset=dataset_one, data={"n": 1})
    DatasetRowFactory(dataset=dataset_one, data={"n": 2})
    DatasetRowFactory(dataset=dataset_two, data={"n": 3})
    DatasetRowFactory(organization=org_b, data={"n": 4})
    client = _auth_client(user_a)

    response = client.get(f"{ROWS_URL}?dataset={dataset_one.id}", **_org_header(org_a))

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 2
    returned = {row["data"]["n"] for row in response.data["results"]}
    assert returned == {1, 2}


# --- Authentication + pagination ---


@pytest.mark.django_db
def test_unauthenticated_request_returns_401(org_a):
    client = APIClient()

    response = client.get(DATASETS_URL, **_org_header(org_a))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_list_response_is_paginated(user_a, org_a):
    DatasetFactory(organization=org_a)
    client = _auth_client(user_a)

    response = client.get(DATASETS_URL, **_org_header(org_a))

    assert response.status_code == status.HTTP_200_OK
    assert "count" in response.data
    assert "results" in response.data
