"""Serializers for the accounts app."""

from uuid import uuid4

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.organizations.models import Membership, Organization

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Read-only representation of the authenticated user."""

    class Meta:
        model = User
        fields = ["id", "email"]
        read_only_fields = ["id", "email"]


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
