from django.apps import AppConfig


class OrganizationsConfig(AppConfig):
    """App config for organizations (tenants and memberships)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.organizations"
