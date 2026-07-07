"""Development settings."""

from .base import *  # noqa: F401, F403

# Dev-only tweaks live here (debug tools, relaxed config).
# DEBUG and ALLOWED_HOSTS come from the environment (see base.py + .env).

# Allow the local Vite dev server (running on the host) to call the API.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
