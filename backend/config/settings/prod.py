"""Production settings."""

from .base import *  # noqa: F401,F403
from .base import SECRET_KEY
from .security import ensure_strong_secret_key

# Refuse to boot with a weak or placeholder signing key. SECRET_KEY doubles as
# the JWT signing key, and the repo is public — shipping the placeholder would
# let anyone forge tokens for any tenant. Generate a strong key with:
#   python -c "import secrets; print(secrets.token_urlsafe(64))"
ensure_strong_secret_key(SECRET_KEY)

# Security hardening for production (expanded in Phase 4).
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
