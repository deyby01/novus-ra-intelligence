# ADR-0010 — Docker build-context layout (co-located Dockerfiles)

- **Status:** accepted
- **Date:** 2026-07-02

## Context

We must decide where Dockerfiles live. Two professional conventions exist: (A) a Dockerfile co-located inside each service folder (`backend/Dockerfile`, `frontend/Dockerfile`), or (B) a central `docker/` folder holding every image's Dockerfile (`docker/backend/`, `docker/postgres/`, `docker/nginx/`). A Dockerfile is only needed for **custom** images; services running official images as-is need none.

## Decision

Use **co-located Dockerfiles (Convention A)**. Only `backend` and `frontend` are custom images, and each maps 1:1 to a top-level stack folder. `db` (postgres:16) and `redis` use official images (compose service only, no Dockerfile). `nginx` uses the official image with a mounted config under `nginx/` (a small Dockerfile may be added in Phase 1 if we bake the config for production). The `docker-compose.yml` stays at the repository root as the orchestrator.

## Consequences

- (+) Each stack is self-contained; the Dockerfile sits next to the code it builds and the build context is simply the stack folder.
- (+) Idiomatic monorepo layout; no decorative `docker/` tree for just two images.
- (-) If the system later grows many custom images (custom Postgres with extensions/init scripts, extra microservices, shared base images), a central `docker/` folder becomes justified. **Mitigation:** migrating A→B is trivial (move Dockerfiles, set `build.context` / `build.dockerfile` in compose); not an irreversible decision, so not over-thought now.

## Alternatives considered

- **Central `docker/` folder (Convention B)** — better when there are many custom images or heavy infra customization (custom Postgres, multi-file Nginx). Overkill for two custom images here; separates the Dockerfile from the code it builds. Deferred until real complexity warrants it.
