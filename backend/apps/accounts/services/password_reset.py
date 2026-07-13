"""Password-reset token and email mechanics (stateless, no DB model).

Reuses Django's `default_token_generator`: the token is a signed hash of the
user's pk, password hash, and last login plus a timestamp, so it needs no
storage, expires via `PASSWORD_RESET_TIMEOUT`, and is invalidated the moment the
password changes. See ADR-0019.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

User = get_user_model()


def build_reset_url(user: User) -> str:
    """Build the SPA reset link carrying the user id and a signed token."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{settings.FRONTEND_BASE_URL}/reset-password?uid={uid}&token={token}"


def send_password_reset_email(email: str) -> None:
    """Email a reset link if an active user owns the address; no-op otherwise.

    The caller returns the same response either way so the endpoint never leaks
    whether an email is registered (anti-enumeration, ADR-0019).
    """
    normalized = User.objects.normalize_email(email)
    user = User.objects.filter(email__iexact=normalized, is_active=True).first()
    if user is None:
        return
    reset_url = build_reset_url(user)
    send_mail(
        subject="Reset your Novus RA Intelligence password",
        message=(
            "We received a request to reset your password.\n\n"
            f"Open this link to choose a new one:\n{reset_url}\n\n"
            "The link expires in one hour. If you did not request this, you can "
            "safely ignore this email — your password will not change."
        ),
        from_email=None,  # falls back to DEFAULT_FROM_EMAIL
        recipient_list=[user.email],
    )


def get_user_from_reset_token(uidb64: str, token: str) -> User | None:
    """Return the user for a valid uid+token pair, or None if it does not check out."""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, ValidationError, User.DoesNotExist):
        return None
    if not default_token_generator.check_token(user, token):
        return None
    return user
