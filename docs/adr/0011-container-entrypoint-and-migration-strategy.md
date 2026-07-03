# ADR-0011 — Container entrypoint and migration strategy

- **Status:** accepted
- **Date:** 2026-07-02

## Context

The backend container needs a consistent startup routine. A key question is *when* database migrations run. Auto-running `migrate` on container startup is convenient in development but is an anti-pattern in production: with multiple replicas, each would race to alter the schema, and schema changes (which can lock tables or be irreversible) must never happen accidentally on a restart.

## Decision

Add a `backend/entrypoint.sh` that branches on a `DJANGO_ENV` env var:

- **`DJANGO_ENV=development`** → print a dev banner and run `python manage.py migrate --noinput`, then hand off to the container command.
- **anything else (production)** → print a prod banner and do **not** migrate. Migrations are applied by a dedicated, deliberate step in the future deploy script.

The script uses `set -e` (abort on any error) and ends with `exec "$@"` (replace the shell with the container's command so it becomes PID 1 and receives signals correctly). The Dockerfile sets `ENTRYPOINT ["/app/entrypoint.sh"]` and keeps the server `CMD`.

## Consequences

- (+) Dev startup is one command (`docker compose up`) and the schema is always current.
- (+) Production is safe: no uncontrolled, racing migrations on startup; schema changes are a conscious deploy step.
- (+) `DJANGO_ENV` makes the mode explicit and readable.
- (-) The entrypoint runs for **every** `docker compose run` too, so one-off commands also trigger a dev migrate check. `migrate` is idempotent (no-op when nothing is pending), so the cost is a few seconds; acceptable. Can be gated to server commands only if it becomes annoying.
- (-) `entrypoint.sh` must be executable and use LF line endings, or the container fails to start.

## Alternatives considered

- **Auto-migrate in all environments** — simplest, but unsafe in production (replica races, accidental schema changes). Rejected.
- **Never auto-migrate (manual in dev too)** — safe but tedious for the tight dev loop. Rejected for dev; adopted for prod.
- **Derive the mode from `DJANGO_SETTINGS_MODULE`** instead of a dedicated `DJANGO_ENV` — works, but a purpose-built variable is clearer.
