"""Test settings: run Celery tasks eagerly so tests need no broker."""

from .dev import *  # noqa: F401, F403

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Use an in-process cache so the suite needs no running Redis and each test
# process stays isolated (throttle counters / cached PDFs cannot leak).
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
