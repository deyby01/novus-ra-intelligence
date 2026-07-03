"""Production settings."""

from .base import *  # noqa: F401,F403

# Security hardening for production (expanded in Phase 4).
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
