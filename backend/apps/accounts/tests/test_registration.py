"""Tests for self-service registration (user + organization + admin membership)."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.organizations.models import Membership, Organization

User = get_user_model()

REGISTER_URL = "/api/v1/auth/register/"
STRONG_PASSWORD = "SecurePass2026"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    """Reset the throttle cache before each test so rate state never leaks."""
    cache.clear()
    yield
    cache.clear()


def _payload(**overrides) -> dict:
    payload = {
        "email": "founder@acme.com",
        "password": STRONG_PASSWORD,
        "organization_name": "Acme Corp",
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_register_creates_user_org_and_admin_membership():
    response = APIClient().post(REGISTER_URL, _payload())

    assert response.status_code == status.HTTP_201_CREATED
    user = User.objects.get(email="founder@acme.com")
    org = Organization.objects.get(name="Acme Corp")
    membership = Membership.objects.get(user=user, organization=org)
    assert membership.role == Membership.Role.ADMIN
    assert membership.is_active is True
    assert org.plan == Organization.Plan.STARTER


@pytest.mark.django_db
def test_register_returns_tokens_that_authenticate_me():
    response = APIClient().post(REGISTER_URL, _payload())

    assert "access" in response.data
    assert "refresh" in response.data

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    me = client.get("/api/v1/auth/me/")
    assert me.status_code == status.HTTP_200_OK
    assert me.data["email"] == "founder@acme.com"


@pytest.mark.django_db
def test_register_response_includes_the_new_organization():
    response = APIClient().post(REGISTER_URL, _payload())

    org = response.data["organization"]
    assert org["name"] == "Acme Corp"
    assert org["slug"]
    assert "id" in org


@pytest.mark.django_db
def test_register_with_duplicate_email_returns_400_and_creates_nothing():
    User.objects.create_user(email="founder@acme.com", password=STRONG_PASSWORD)

    response = APIClient().post(REGISTER_URL, _payload())

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert Organization.objects.count() == 0
    assert Membership.objects.count() == 0


@pytest.mark.django_db
def test_register_with_weak_password_returns_400():
    response = APIClient().post(REGISTER_URL, _payload(password="123"))

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert User.objects.count() == 0
    assert Organization.objects.count() == 0


@pytest.mark.django_db
def test_register_with_blank_organization_name_returns_400():
    response = APIClient().post(REGISTER_URL, _payload(organization_name="   "))

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert User.objects.count() == 0


@pytest.mark.django_db
def test_duplicate_organization_names_get_distinct_slugs():
    first = APIClient().post(REGISTER_URL, _payload(email="a@acme.com"))
    second = APIClient().post(REGISTER_URL, _payload(email="b@acme.com"))

    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_201_CREATED
    slugs = set(Organization.objects.values_list("slug", flat=True))
    assert len(slugs) == 2


@pytest.mark.django_db
def test_register_is_throttled_after_the_limit():
    with patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"register": "1/min"}):
        first = APIClient().post(REGISTER_URL, _payload(email="one@acme.com"))
        second = APIClient().post(REGISTER_URL, _payload(email="two@acme.com"))

    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_registered_user_sees_only_their_own_workspace():
    response = APIClient().post(REGISTER_URL, _payload())

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    memberships = client.get("/api/v1/memberships/")

    assert memberships.status_code == status.HTTP_200_OK
    results = memberships.data["results"]
    assert len(results) == 1
    assert results[0]["organization"]["name"] == "Acme Corp"
