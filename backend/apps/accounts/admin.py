"""Admin registration for accounts (users)."""

from django.contrib import admin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Admin configuration for the User model."""

    list_display = ("email", "is_staff", "is_superuser", "is_active", "created_at")
    search_fields = ("email",)
    list_filter = ("is_staff", "is_superuser", "is_active")
    ordering = ("-created_at",)
