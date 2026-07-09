# ADR-0016 — Redis cache backend and AI-endpoint throttling

- **Status:** accepted
- **Date:** 2026-07-09

## Context

Two report endpoints are expensive and abusable. `POST /api/v1/reports/`
enqueues an AI report — each request ultimately triggers a **paid Gemini call**.
`GET /api/v1/reports/{id}/pdf/` (ADR-0015) runs a **synchronous WeasyPrint
render** on the request thread. Both should be rate-limited per user, and the
PDF render should not repeat for content that never changes.

DRF throttling stores its per-key request counters in the Django cache. Until
now the project set **no `CACHES`**, so Django fell back to the in-process
`LocMemCache`. That store is **per worker**: with multiple Gunicorn/Uvicorn
workers (or the separate Celery process) each holds its own counters, so a
"10/min" limit effectively multiplies by the worker count and throttling cannot
be trusted in production. This is the carried Phase-0 follow-up — *throttle needs
a shared cache before multi-worker prod* — coming due now that we are adding
throttles that actually matter (money and CPU).

Redis is already in `docker-compose.yml` and drives Celery (broker/result on
db 1). It is the obvious shared store, but the cache must not collide with
Celery's keyspace.

The rendered PDF has a useful property: a `Report`'s `content` is **immutable for
its id**. Regenerating a report creates a new `Report` row with a new id; an
existing id's bytes never change. So a per-id PDF cache can never go stale.

## Decision

**(a) Redis is the Django default cache.** `CACHES["default"]` uses Django's
built-in `django.core.cache.backends.redis.RedisCache` on a **dedicated Redis
DB (db 2)**, separate from Celery's db 1, read from `REDIS_CACHE_URL`
(default `redis://redis:6379/2`). This gives DRF throttling a **shared** counter
store across every worker and an app-level cache for the PDF bytes. The test
settings override `CACHES` to `LocMemCache` so the suite needs no running Redis
and stays isolated per process.

**(b) The two expensive endpoints are throttled with `ScopedRateThrottle`,
per action.** `ReportViewSet` mixes cheap actions (`list`, `retrieve`) with
expensive ones (`create`, `pdf`); only the expensive two are throttled. Rather
than a class-level `throttle_scope` (which would throttle every action), the
viewset overrides `get_throttles()` to attach a scope **only** for `create` and
`pdf`. Rates live in `DEFAULT_THROTTLE_RATES`:

| Scope | Rate | Endpoint |
|---|---|---|
| `reports_generate` | `30/hour` | `POST /reports/` (paid Gemini call) |
| `reports_pdf` | `120/hour` | `GET /reports/{id}/pdf/` (WeasyPrint render) |

`ScopedRateThrottle` keys authenticated requests by user id, so these are
per-user limits. They are deliberately generous — they bound abuse without
getting in a normal user's way — and are **tunable** in settings without code
changes.

**(c) Rendered PDF bytes are cached in Redis, keyed by report id.** The `pdf`
action reads `report-pdf:{report.id}` before rendering; on a miss it renders and
stores the bytes with a 24-hour TTL. Because the content is immutable for its id,
the cache never serves stale bytes; the TTL is only a housekeeping bound on
Redis memory. The read/write sits **after** the `COMPLETED` check, so only
finished reports are ever cached.

## Consequences

- (+) Throttling is now correct under multiple workers — counters are shared in
  Redis instead of fragmented per process. Closes the Phase-0 follow-up.
- (+) The AI generate and PDF endpoints are bounded against runaway cost
  (Gemini) and CPU (WeasyPrint), per user.
- (+) Repeat PDF downloads of the same report skip the render entirely — a warm
  hit is a single Redis read. Removes the "re-rendered on every download"
  drawback noted in ADR-0015.
- (+) Rates and the cache location are settings, tunable without a deploy of code.
- (−) The app now depends on Redis for request throttling and PDF caching, not
  only for Celery. Redis was already a hard dependency, so this widens its blast
  radius but adds no new service.
- (−) A dedicated cache DB (db 2) is one more Redis logical database to keep
  straight (db 0 spare, db 1 Celery, db 2 cache).
- (~) The throttle counts every request to the action, including a warm PDF
  cache hit and a request rejected for bad input (missing/invalid dataset) —
  throttling runs before the view body. This is intentional: the limit bounds
  request volume per user, not only the expensive work behind it.

## Alternatives considered

- **Keep LocMem.** Zero infra, but per-worker counters make throttling
  unenforceable in prod and give no cross-worker PDF reuse. Rejected — the whole
  point of adding throttles is that they hold under real deployment.
- **Reuse Celery's Redis db 1 for the cache.** One fewer logical DB, but the
  cache and the broker would share a keyspace; a `cache.clear()` (used in tests
  and conceivable in ops) would wipe Celery state. Rejected for isolation.
- **Class-level `throttle_scope` on the viewset.** Simpler, but would throttle
  `list`/`retrieve` too — cheap reads that should stay unlimited. Rejected in
  favour of per-action `get_throttles()`.
- **Persist the PDF on the model (`Report.pdf_file`).** Durable across Redis
  restarts and enables signed URLs, but adds a field, a migration, and storage
  wiring (see ADR-0015's deferral). The immutable-per-id cache gives most of the
  benefit now; persistence stays deferred until storage is otherwise needed.
- **A time/user cache-key salt for the PDF.** Unnecessary — the id already
  identifies immutable content, so id alone is a safe, collision-free key.
