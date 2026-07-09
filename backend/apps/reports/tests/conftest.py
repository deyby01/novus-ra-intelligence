"""Shared fixtures for the reports test suite."""

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_cache():
    """Clear the cache around every test so throttle counters / PDFs never leak."""
    cache.clear()
    yield
    cache.clear()
