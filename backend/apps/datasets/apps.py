from django.apps import AppConfig


class DatasetsConfig(AppConfig):
    """App config for datasets (dynamic tenant-scoped datasets and imports)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.datasets"
