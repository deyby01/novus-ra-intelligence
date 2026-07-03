#!/usr/bin/env bash
# Container entrypoint: prepare the app, then hand off to the given command.
set -e

if [ "$DJANGO_ENV" = "development" ]; then
    echo "🚧  DEVELOPMENT mode"
    echo "→  Applying database migrations..."
    python manage.py migrate --noinput
else
    echo "🏭  PRODUCTION"
    echo "→  Migrations are handled by the deploy script, not on startup."
fi

# Replace this shell with the container command (runserver / gunicorn / pytest...)
# so it becomes PID 1 and receives signals (Ctrl+C, SIGTERM) correctly.
exec "$@"