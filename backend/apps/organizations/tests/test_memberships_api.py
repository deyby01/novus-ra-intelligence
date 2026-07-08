"""Tests for the "my workspaces" memberships endpoint."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.organizations.models import Membership
from apps.organizations.tests.factories import (
    MembershipFactory,
    OrganizationFactory,
    UserFactory,
)

MEMBERSHIPS_URL = "/api/v1/memberships/"


def _auth_client(user):
    """Return an APIClient carrying a valid bearer token for the user."""
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.mark.django_db
def test_lists_only_the_users_active_memberships():
    user = UserFactory()
    mine = [MembershipFactory(user=user) for _ in range(2)]
    MembershipFactory()  # another user's membership
    client = _auth_client(user)

    response = client.get(MEMBERSHIPS_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 2
    returned = {row["id"] for row in response.data["results"]}
    assert returned == {str(m.id) for m in mine}


@pytest.mark.django_db
def test_membership_payload_carries_organization_summary_and_role():
    user = UserFactory()
    membership = MembershipFactory(user=user, role=Membership.Role.ADMIN)
    client = _auth_client(user)

    response = client.get(MEMBERSHIPS_URL)

    row = response.data["results"][0]
    assert row["role"] == Membership.Role.ADMIN
    assert row["organization"]["id"] == str(membership.organization.id)
    assert row["organization"]["name"] == membership.organization.name
    assert row["organization"]["slug"] == membership.organization.slug
    assert row["organization"]["plan"] == membership.organization.plan


@pytest.mark.django_db
def test_inactive_membership_is_excluded():
    user = UserFactory()
    MembershipFactory(user=user, is_active=False)
    client = _auth_client(user)

    response = client.get(MEMBERSHIPS_URL)

    assert response.data["count"] == 0


@pytest.mark.django_db
def test_membership_on_inactive_organization_is_excluded():
    user = UserFactory()
    MembershipFactory(user=user, organization=OrganizationFactory(is_active=False))
    client = _auth_client(user)

    response = client.get(MEMBERSHIPS_URL)

    assert response.data["count"] == 0


@pytest.mark.django_db
def test_can_retrieve_own_membership():
    user = UserFactory()
    membership = MembershipFactory(user=user)
    client = _auth_client(user)

    response = client.get(f"{MEMBERSHIPS_URL}{membership.id}/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["id"] == str(membership.id)
    assert response.data["organization"]["id"] == str(membership.organization.id)


@pytest.mark.django_db
def test_cannot_retrieve_another_users_membership():
    user = UserFactory()
    others = MembershipFactory()
    client = _auth_client(user)

    response = client.get(f"{MEMBERSHIPS_URL}{others.id}/")

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_unauthenticated_request_is_rejected():
    response = APIClient().get(MEMBERSHIPS_URL)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
