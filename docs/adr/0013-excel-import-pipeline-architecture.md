# ADR-0013 — Excel import pipeline: async processing via Celery + Redis

- **Status:** accepted
- **Date:** 2026-07-07

## Context

The MVP's headline feature is turning an uploaded Excel file into a dynamic
dataset: detect its columns, infer their types, and load its rows into
`DatasetRow` (JSONB). Parsing a spreadsheet with pandas is CPU- and IO-heavy and
its size is unbounded from the server's point of view. Doing that work inside the
HTTP request would hold a web worker for the whole parse and risk request
timeouts behind Nginx/gunicorn. The ERD already models an `ImportJob` row to
track an import, which signals an asynchronous design.

## Decision

Uploads are processed **asynchronously with Celery**, using **Redis** as both the
broker and the result backend, with `ImportJob` as the state machine the client
polls.

**Flow.**
1. `POST /api/v1/import-jobs/` (multipart: `dataset` + `file`) validates the
   request, stores the file, and creates an `ImportJob` with status `pending`
   (tenant `organization` and `created_by` injected server-side, never from the
   client). It dispatches a Celery task and returns the job immediately.
2. The Celery task marks the job `processing`, runs the import service, then marks
   it `done` (recording `rows_processed`) or `error` (recording `errors`).
3. The client polls `GET /api/v1/import-jobs/{id}/` for status/progress.

**Layering.** The parsing logic lives in a plain **service**
(`apps/datasets/services/import_service.py`); the Celery **task** is a thin
wrapper that loads the job and calls the service. Celery is the async transport
boundary, not business logic — so the service is unit-testable synchronously with
no broker, and the task is covered separately (eager mode / dispatch assertion).
File parsing is not an external-integration port, so a plain service (not a
hexagonal port/adapter) is the right weight here.

**Column-type inference.** pandas dtype → `DatasetField.field_type`: numeric →
`number`, datetime → `date`, boolean → `boolean`, everything else → `text`
(`select` is a manual-only type, never auto-inferred). Each column header becomes
a normalized `key` (lowercased, non-alphanumerics collapsed to underscores) plus
the original header as `label`. Fields are upserted per dataset (respecting the
`UniqueConstraint(dataset, key)`); rows are appended as JSON documents keyed by
field `key`.

**Integrity.** The row load runs inside `transaction.atomic()` per job; a parse
failure flips the job to `error` with the message captured in `errors` and leaves
no half-written dataset.

**Storage.** Uploaded files are written under `MEDIA_ROOT/imports/` (local
filesystem in dev). Object storage (S3-compatible) is deferred to the deployment
phase.

## Consequences

- (+) Web workers stay responsive; large files can't time out a request.
- (+) `ImportJob` gives the client real progress/error feedback and an audit trail.
- (+) Redis is a single new dependency that also serves the throttle cache (Phase-1
  hardening) and Celery Beat (Phase-3 automations) later.
- (+) The service/task split keeps the heavy logic broker-free in tests.
- (−) One more moving part in the compose (a `redis` service and a `celery`
  worker) and in ops.
- (−) At-least-once delivery: a retried task would append rows again. For the MVP
  each import appends (no dedup); full idempotency (e.g. a content hash or a unique
  natural key) is deferred until a real re-import requirement exists.
- (−) `CELERY_TASK_ALWAYS_EAGER` must be enabled in tests so they don't need a
  running broker.

## Alternatives considered

- **Parse synchronously in the request.** Simplest, but blocks a web worker for the
  whole parse and times out on large files behind a proxy. Rejected.
- **A different task queue (RQ, Dramatiq, Django-Q).** Celery is the project's
  chosen stack, the most mature option, and the natural fit for the Phase-3
  Celery Beat automations. Rejected in favor of consistency.
- **RabbitMQ as the broker.** More robust delivery guarantees, but Redis is already
  needed for caching/throttling, so reusing it avoids a second infrastructure
  service for the MVP. Revisit if delivery guarantees become critical.
- **Inferring a `select` type from low-cardinality columns.** Overreach for the
  MVP; `select` stays a deliberate, user-chosen field type.
