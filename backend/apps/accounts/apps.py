from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """App config for accounts (users and authentication)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
