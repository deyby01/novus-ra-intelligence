"""Development settings."""

from .base import *  # noqa: F401, F403

# Dev-only tweaks live here (debug tools, relaxed config).
# DEBUG and ALLOWED_HOSTS come from the environment (see base.py + .env).

# Allow the local Vite dev server to call the API. Vite falls back to 5174+
# when 5173 is already taken, so match localhost/127.0.0.1 on any port here.
# This relaxed rule is development-only; production uses explicit origins.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]
