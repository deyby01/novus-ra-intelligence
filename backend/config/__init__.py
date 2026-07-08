"""Config package: expose the Celery app so tasks register on Django startup."""

from .celery import app as celery_app

__all__ = ("celery_app",)
