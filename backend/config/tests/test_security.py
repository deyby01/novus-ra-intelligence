"""Tests for the settings-time security guards."""

import pytest
from django.core.exceptions import ImproperlyConfigured

from config.settings.security import (
    PLACEHOLDER_SECRET_KEY,
    ensure_strong_secret_key,
)


def test_placeholder_secret_key_is_rejected():
    with pytest.raises(ImproperlyConfigured):
        ensure_strong_secret_key(PLACEHOLDER_SECRET_KEY)


def test_short_secret_key_is_rejected():
    with pytest.raises(ImproperlyConfigured):
        ensure_strong_secret_key("too-short")


def test_strong_secret_key_passes():
    import secrets

    # token_urlsafe(64) yields ~86 chars — comfortably above the floor.
    ensure_strong_secret_key(secrets.token_urlsafe(64))
