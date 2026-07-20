"""Base settings shared by every environment.

Environment-specific overrides live in dev.py / prod.py.
Values are read from the container environment (docker-compose env_file).
"""

from datetime import timedelta
from pathlib import Path

import environ
from corsheaders.defaults import default_headers

# BASE_DIR points to backend/  (base.py -> settings -> config -> backend = 3 parents)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()

# --- Security / core (from environment) ---
SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

# Browser origins allowed to call the API (the SPA). Empty by default;
# dev.py adds the local Vite origin, prod reads it from the environment.
CORS_ALLOWED_ORIGINS = env.list("DJANGO_CORS_ALLOWED_ORIGINS", default=[])

# The SPA sends the tenant context in a custom header, which the browser only
# forwards cross-origin if it is echoed in the CORS preflight response.
CORS_ALLOW_HEADERS = (*default_headers, "x-organization")

# --- Applications ---
DJANGO_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]
THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
]
LOCAL_APPS = [
    "apps.core",
    "apps.accounts",
    "apps.organizations",
    "apps.datasets",
    "apps.dashboards",
    "apps.reports",
    "apps.activity",
]
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --- Database: PostgreSQL via the `db` service ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB"),
        "USER": env("POSTGRES_USER"),
        "PASSWORD": env("POSTGRES_PASSWORD"),
        "HOST": env("POSTGRES_HOST", default="db"),
        "PORT": env("POSTGRES_PORT", default="5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Django REST Framework ---
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.exception_handler",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/min",
        "refresh": "30/min",
        "register": "20/hour",
        "password_reset": "5/hour",
        "password_change": "10/hour",
        "reports_generate": "30/hour",
        "reports_pdf": "120/hour",
        "dashboards_generate": "30/hour",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ),
}
SPECTACULAR_SETTINGS = {
    "TITLE": "Novus RA Intelligence API",
    "VERSION": "0.1.0",
}

# --- JSON Web Tokens (simplejwt) ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# --- Internationalization ---
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Static & media files ---
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- Celery (async task queue) ---
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/1")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://redis:6379/1")
CELERY_TASK_TRACK_STARTED = True

# --- Cache (Redis, dedicated DB) ---
# A shared cache across workers: backs DRF throttle counters (correct under
# multiple workers) and app-level caching (e.g. rendered report PDFs). Uses a
# dedicated Redis DB (db 2) so it never collides with Celery's keyspace (db 1).
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_CACHE_URL", default="redis://redis:6379/2"),
    }
}

# --- AI provider (Google Gemini, Phase 2) ---
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")

# --- Email (password reset, ADR-0019) ---
# Defaults to the console backend so dev needs no secrets — reset links are
# printed to the backend logs. Production sets EMAIL_BACKEND to SMTP via the
# environment (see .env.example) and fills in the host/credentials below.
EMAIL_BACKEND = env(
    "DJANGO_EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = env("DJANGO_EMAIL_HOST", default="")
EMAIL_PORT = env.int("DJANGO_EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("DJANGO_EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("DJANGO_EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("DJANGO_EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env(
    "DJANGO_DEFAULT_FROM_EMAIL",
    default="Novus RA Intelligence <no-reply@novus.local>",
)

# Public base URL of the SPA; password-reset emails link back here so the
# frontend can drive the confirm step. No trailing slash.
FRONTEND_BASE_URL = env("DJANGO_FRONTEND_BASE_URL", default="http://localhost:5173")

# How long a password-reset link stays valid (seconds). One hour by default.
PASSWORD_RESET_TIMEOUT = env.int("DJANGO_PASSWORD_RESET_TIMEOUT", default=3600)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Jazzmin Admin Panel Settings ---
JAZZMIN_SETTINGS = {
    "site_title": "Novus Admin",
    "site_header": "Novus RA",
    "site_brand": "Novus RA Intelligence",
    "welcome_sign": "Welcome to Novus RA Intelligence Admin",
    "copyright": "Novus RA Intelligence",
    "search_model": ["accounts.User", "organizations.Organization"],
    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "View Site", "url": "/"},
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
    "icons": {
        "accounts.User": "fas fa-users",
        "organizations.Organization": "fas fa-building",
        "organizations.Membership": "fas fa-id-badge",
        "datasets.Dataset": "fas fa-database",
        "reports.Report": "fas fa-file-alt",
        "dashboards.Dashboard": "fas fa-chart-line",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
}

JAZZMIN_UI_TWEAKS = {
    "navbar": "navbar-dark",
    "theme": "darkly",
    "dark_mode_theme": "darkly",
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "brand_small_text": False,
    "brand_colour": "navbar-dark",
    "accent": "accent-primary",
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success",
    },
}
