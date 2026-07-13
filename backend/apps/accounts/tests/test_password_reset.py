"""Tests for the password-reset flow (request link + confirm new password)."""

from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

User = get_user_model()

REQUEST_URL = "/api/v1/auth/password/reset/"
CONFIRM_URL = "/api/v1/auth/password/reset/confirm/"
OLD_PASSWORD = "OldSecurePass2026"
NEW_PASSWORD = "NewSecurePass2026"


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    """Reset the throttle cache before each test so rate state never leaks."""
    cache.clear()
    yield
    cache.clear()


def _make_user(email: str = "founder@acme.com", is_active: bool = True) -> User:
    return User.objects.create_user(email=email, password=OLD_PASSWORD, is_active=is_active)


def _uid_token(user: User) -> tuple[str, str]:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    return uid, default_token_generator.make_token(user)


@pytest.mark.django_db
def test_request_emails_a_reset_link_to_an_existing_user():
    _make_user()

    response = APIClient().post(REQUEST_URL, {"email": "founder@acme.com"})

    assert response.status_code == status.HTTP_200_OK
    assert len(mail.outbox) == 1
    sent = mail.outbox[0]
    assert sent.to == ["founder@acme.com"]
    assert "/reset-password?uid=" in sent.body
    assert "token=" in sent.body


@pytest.mark.django_db
def test_request_for_unknown_email_returns_200_but_sends_nothing():
    response = APIClient().post(REQUEST_URL, {"email": "nobody@acme.com"})

    assert response.status_code == status.HTTP_200_OK
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_request_for_inactive_user_sends_nothing():
    _make_user(is_active=False)

    response = APIClient().post(REQUEST_URL, {"email": "founder@acme.com"})

    assert response.status_code == status.HTTP_200_OK
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_confirm_sets_the_new_password_and_invalidates_the_old_one():
    user = _make_user()
    uid, token = _uid_token(user)

    response = APIClient().post(
        CONFIRM_URL, {"uid": uid, "token": token, "new_password": NEW_PASSWORD}
    )

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD) is True
    assert user.check_password(OLD_PASSWORD) is False


@pytest.mark.django_db
def test_confirm_with_an_invalid_token_returns_400_and_keeps_the_password():
    user = _make_user()
    uid, _ = _uid_token(user)

    response = APIClient().post(
        CONFIRM_URL,
        {"uid": uid, "token": "not-a-real-token", "new_password": NEW_PASSWORD},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "token" in response.data
    user.refresh_from_db()
    assert user.check_password(OLD_PASSWORD) is True


@pytest.mark.django_db
def test_confirm_with_a_weak_password_returns_400_under_new_password():
    user = _make_user()
    uid, token = _uid_token(user)

    response = APIClient().post(CONFIRM_URL, {"uid": uid, "token": token, "new_password": "123"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "new_password" in response.data
    user.refresh_from_db()
    assert user.check_password(OLD_PASSWORD) is True


@pytest.mark.django_db
def test_a_reset_token_cannot_be_reused_after_the_password_changes():
    user = _make_user()
    uid, token = _uid_token(user)
    client = APIClient()

    first = client.post(CONFIRM_URL, {"uid": uid, "token": token, "new_password": NEW_PASSWORD})
    second = client.post(
        CONFIRM_URL,
        {"uid": uid, "token": token, "new_password": "AnotherPass2026"},
    )

    assert first.status_code == status.HTTP_200_OK
    assert second.status_code == status.HTTP_400_BAD_REQUEST
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD) is True


@pytest.mark.django_db
def test_end_to_end_request_then_confirm_from_the_emailed_link():
    user = _make_user()

    APIClient().post(REQUEST_URL, {"email": "founder@acme.com"})
    link = next(line for line in mail.outbox[0].body.splitlines() if "/reset-password?" in line)
    params = parse_qs(urlparse(link).query)

    response = APIClient().post(
        CONFIRM_URL,
        {
            "uid": params["uid"][0],
            "token": params["token"][0],
            "new_password": NEW_PASSWORD,
        },
    )

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD) is True


@pytest.mark.django_db
def test_request_is_throttled_after_the_limit():
    _make_user()
    with patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"password_reset": "1/hour"}):
        first = APIClient().post(REQUEST_URL, {"email": "founder@acme.com"})
        second = APIClient().post(REQUEST_URL, {"email": "founder@acme.com"})

    assert first.status_code == status.HTTP_200_OK
    assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
