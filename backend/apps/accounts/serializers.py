"""Serializers for the accounts app."""

from uuid import uuid4

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.organizations.models import Membership, Organization

from .services.password_reset import get_user_from_reset_token

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """The authenticated user; the display name is the only editable field.

    Email is intentionally read-only — changing it would need a re-verification
    flow we don't have yet.
    """

    class Meta:
        model = User
        fields = ["id", "email", "name"]
        read_only_fields = ["id", "email"]

    def validate_name(self, value: str) -> str:
        """Trim surrounding whitespace so names stay tidy."""
        return value.strip()


class PasswordChangeSerializer(serializers.Serializer):
    """Validate a signed-in user's password change (current + new password)."""

    current_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_current_password(self, value: str) -> str:
        """Reject the change unless the current password is correct."""
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Your current password is incorrect.")
        return value

    def validate_new_password(self, value: str) -> str:
        """Enforce the project's password policy on the new password."""
        user = self.context["request"].user
        try:
            validate_password(value, user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def save(self) -> User:
        """Persist the new password for the request's user."""
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class LogoutSerializer(serializers.Serializer):
    """Validate the refresh token supplied to the logout endpoint."""

    refresh = serializers.CharField()


def _unique_organization_slug(name: str) -> str:
    """Build a URL-safe organization slug unique across all tenants."""
    base = slugify(name) or "workspace"
    slug = base
    while Organization.objects.filter(slug=slug).exists():
        slug = f"{base}-{uuid4().hex[:6]}"
    return slug


class RegisterSerializer(serializers.Serializer):
    """Validate a signup and create the user, their organization, and membership."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    organization_name = serializers.CharField(max_length=255)

    def validate_email(self, value: str) -> str:
        """Reject a duplicate email with a clean 400 instead of an integrity error."""
        normalized = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def validate_password(self, value: str) -> str:
        """Enforce the project's password policy."""
        validate_password(value)
        return value

    def validate_organization_name(self, value: str) -> str:
        """Require a non-blank organization name."""
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Organization name cannot be blank.")
        return name

    def create(self, validated_data: dict) -> dict:
        """Create the user, organization, and admin membership in one transaction."""
        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
            )
            organization = Organization.objects.create(
                name=validated_data["organization_name"],
                slug=_unique_organization_slug(validated_data["organization_name"]),
            )
            Membership.objects.create(
                user=user,
                organization=organization,
                role=Membership.Role.ADMIN,
                is_active=True,
            )
        return {"user": user, "organization": organization}


class PasswordResetRequestSerializer(serializers.Serializer):
    """Validate the email a reset link is requested for (existence not checked)."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Validate a reset token and the new password, then set it."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict) -> dict:
        """Check the token before the password so a bad link fails fast."""
        user = get_user_from_reset_token(attrs["uid"], attrs["token"])
        if user is None:
            raise serializers.ValidationError(
                {"token": "The reset link is invalid or has expired."}
            )
        try:
            validate_password(attrs["new_password"], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc
        attrs["user"] = user
        return attrs

    def save(self) -> User:
        """Persist the new password, invalidating every outstanding reset token."""
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
