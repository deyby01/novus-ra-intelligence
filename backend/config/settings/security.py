"""Settings-time security guards."""

from django.core.exceptions import ImproperlyConfigured

PLACEHOLDER_SECRET_KEY = "change-me-to-a-long-random-key"
MIN_SECRET_KEY_LENGTH = 50


def ensure_strong_secret_key(secret_key: str) -> None:
    """Raise if the signing key is the public placeholder or too short.

    `SECRET_KEY` doubles as the JWT (simplejwt) signing key. On a public repo a
    placeholder or low-entropy value would let anyone forge tokens for any user
    and organization, so production must refuse to boot with one.
    """
    if secret_key == PLACEHOLDER_SECRET_KEY or len(secret_key) < MIN_SECRET_KEY_LENGTH:
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY must be a unique, high-entropy value in production "
            "(at least 50 characters, never the .env.example placeholder)."
        )
