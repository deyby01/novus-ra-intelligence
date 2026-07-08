"""Serializers for the organizations app."""

from rest_framework import serializers

from apps.organizations.models import Membership, Organization


class OrganizationSummarySerializer(serializers.ModelSerializer):
    """Minimal organization representation for a workspace picker."""

    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "plan"]
        read_only_fields = fields


class MembershipSerializer(serializers.ModelSerializer):
    """A user's membership with its organization summary and scoped role."""

    organization = OrganizationSummarySerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "role", "organization"]
        read_only_fields = fields
