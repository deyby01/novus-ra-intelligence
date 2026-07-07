"""Admin registration for organizations and memberships."""

from django.contrib import admin

from apps.organizations.models import Membership, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Admin configuration for the Organization model."""

    list_display = ("name", "slug", "plan", "is_active", "created_at")
    list_filter = ("plan", "is_active")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    """Admin configuration for the Membership model."""

    list_display = ("user", "organization", "role", "is_active", "created_at")
    list_filter = ("role", "is_active")
    search_fields = ("user__email", "organization__name")
    raw_id_fields = ("user", "organization")
