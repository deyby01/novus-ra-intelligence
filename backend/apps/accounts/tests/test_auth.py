"""Test for JWT authentication endpoints (login, refresh, me)."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


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
