"""Profile read/update (/auth/me/) and authenticated password change."""

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

ME_URL = "/api/v1/auth/me/"
CHANGE_URL = "/api/v1/auth/password/change/"
OLD_PASSWORD = "OldPass2026!"
NEW_PASSWORD = "FreshPass2026!"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    """Reset the throttle cache so password_change rate state never leaks."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user():
    return User.objects.create_user(email="user@example.com", password=OLD_PASSWORD)


@pytest.fixture
def client(user):
    api_client = APIClient()
    token = RefreshToken.for_user(user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


# --- Profile ---


@pytest.mark.django_db
def test_me_returns_name(client):
    response = client.get(ME_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["name"] == ""
    assert response.data["email"] == "user@example.com"


@pytest.mark.django_db
def test_patch_me_updates_and_trims_name(client, user):
    response = client.patch(ME_URL, {"name": "  Ada Lovelace  "}, format="json")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["name"] == "Ada Lovelace"
    user.refresh_from_db()
    assert user.name == "Ada Lovelace"


@pytest.mark.django_db
def test_patch_me_cannot_change_email(client, user):
    response = client.patch(ME_URL, {"email": "new@example.com", "name": "X"}, format="json")

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.email == "user@example.com"


@pytest.mark.django_db
def test_patch_me_requires_auth():
    response = APIClient().patch(ME_URL, {"name": "X"}, format="json")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# --- Password change ---


@pytest.mark.django_db
def test_change_password_success(client, user):
    response = client.post(
        CHANGE_URL,
        {"current_password": OLD_PASSWORD, "new_password": NEW_PASSWORD},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD)
    assert not user.check_password(OLD_PASSWORD)


@pytest.mark.django_db
def test_change_password_wrong_current_is_rejected(client, user):
    response = client.post(
        CHANGE_URL,
        {"current_password": "not-my-password", "new_password": NEW_PASSWORD},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    user.refresh_from_db()
    assert user.check_password(OLD_PASSWORD)


@pytest.mark.django_db
def test_change_password_weak_new_is_rejected(client):
    response = client.post(
        CHANGE_URL,
        {"current_password": OLD_PASSWORD, "new_password": "123"},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_change_password_requires_auth():
    response = APIClient().post(
        CHANGE_URL,
        {"current_password": OLD_PASSWORD, "new_password": NEW_PASSWORD},
        format="json",
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
