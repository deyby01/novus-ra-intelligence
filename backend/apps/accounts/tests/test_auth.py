"""Test for JWT authentication endpoints (login, refresh, me, logout)."""

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    """Reset the throttle cache before each test so rate state never leaks."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user():
    return User.objects.create_user(email="user@example.com", password="pass1234")


@pytest.mark.django_db
def test_login_with_valid_credentials_returns_tokens(user):
    client = APIClient()

    response = client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": "pass1234"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data
    assert "refresh" in response.data


@pytest.mark.django_db
def test_login_with_invalid_password_returns_401(user):
    client = APIClient()

    response = client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": "wrongpassword"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_refresh_with_valid_token_returns_new_access(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)

    response = client.post(
        "/api/v1/auth/refresh/",
        {"refresh": str(refresh)},
    )

    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data


@pytest.mark.django_db
def test_me_without_token_returns_401():
    client = APIClient()

    response = client.get("/api/v1/auth/me/")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_me_with_valid_token_returns_user(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    response = client.get("/api/v1/auth/me/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["email"] == user.email


@pytest.mark.django_db
def test_login_is_throttled_after_rate_exceeded(user):
    client = APIClient()
    payload = {"email": user.email, "password": "wrongpassword"}

    # The "login" scope allows 10/min; the 11th request must be throttled.
    for _ in range(10):
        client.post("/api/v1/auth/login/", payload)

    response = client.post("/api/v1/auth/login/", payload)

    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_refresh_rotates_and_blacklists_old_token(user):
    client = APIClient()
    refresh = str(RefreshToken.for_user(user))

    first = client.post("/api/v1/auth/refresh/", {"refresh": refresh})

    assert first.status_code == status.HTTP_200_OK
    assert "access" in first.data
    assert "refresh" in first.data

    # Reusing the now-rotated (blacklisted) refresh must be rejected.
    second = client.post("/api/v1/auth/refresh/", {"refresh": refresh})

    assert second.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    response = client.post("/api/v1/auth/logout/", {"refresh": str(refresh)})

    assert response.status_code == status.HTTP_205_RESET_CONTENT

    reuse = client.post("/api/v1/auth/refresh/", {"refresh": str(refresh)})

    assert reuse.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_logout_without_authentication_returns_401(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)

    response = client.post("/api/v1/auth/logout/", {"refresh": str(refresh)})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_logout_with_invalid_refresh_returns_400(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    response = client.post("/api/v1/auth/logout/", {"refresh": "not-a-real-token"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST
