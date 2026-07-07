"""Serializers for the accounts app."""

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Read-only representation of the authenticated user."""

    class Meta:
        model = User
        fields = ["id", "email"]
        read_only_fields = ["id", "email"]
