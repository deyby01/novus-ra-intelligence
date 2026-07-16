# ADR-0021 — Workspace activity feed as denormalized, recorded events

- **Status:** accepted
- **Date:** 2026-07-16

## Context

The redesigned Home has an "Actividad reciente" panel that, until now, rendered
hardcoded sample data. To make it real, the workspace needs a record of the
notable things that have happened in it — an import finishing, the AI producing a
report, a dashboard being created — listed newest-first and scoped to the current
tenant like every other resource (`X-Organization` → active `Membership`,
ADR-0012).

Two shapes were possible: derive the feed on the fly by unioning the recent rows
of `Dataset`, `Report`, and `Dashboard`, or persist a first-class event whenever
something happens. The derived approach needs no new table but couples the feed
to the internals of every source model, cannot describe an event whose source
row was later deleted, and grows a fan-out query per event type. The domain also
has natural "moment it happened" points already in the code: the import Celery
task marking a job `DONE`, the report task marking a report `COMPLETED`, and the
dashboard viewset's create.

## Decision

**Add a dedicated, append-only `ActivityEvent` model and record one event at each
domain moment. The event denormalizes its target rather than holding a foreign
key.**

- **New `apps.activity` app.** `ActivityEvent(TenantBaseModel)` with: `actor`
  (`SET_NULL` FK to the user, like `AuthoredModel` — a deleted user leaves the
  event intact), a `verb` (`TextChoices`: `DATASET_IMPORTED`, `REPORT_GENERATED`,
  `DASHBOARD_CREATED`), and a **denormalized target** as `target_type` (string,
  e.g. `"dataset"`), `target_id` (nullable UUID), and `target_label` (the name
  captured at record time). Ordered `-created_at` with a
  `(organization, -created_at)` index for the feed query.
- **Denormalized, not a generic FK.** Storing the label at write time means the
  feed renders with **no cross-app joins** and keeps reading correctly even if the
  target is later renamed or deleted; `target_id` still lets the client deep-link
  to the target when it survives. This trades a little duplication for decoupling
  and a stable historical record — the right call for an audit-style log.
- **Recorded at the source, best-effort, never destructive.** A small
  `record_activity(...)` service is called from the three existing success paths.
  In the Celery tasks the call sits **after** the job/report is marked done (and,
  for reports, after the `try/except` that returns on failure), so a feed write
  can never flip a genuinely successful import/report to a failed state, and a
  failed operation records nothing.
- **Read-only, tenant-scoped endpoint.** `GET /api/v1/activity/` is list-only
  (`ListModelMixin` + `TenantQuerysetMixin`), newest-first, filterable by `verb`
  / `target_type`. Events are system-written; clients never create them.
- **Scope of this slice (R5a).** Three honest verbs only. Manual single-row adds
  are **not** recorded (the API adds rows one at a time, so a per-row event would
  be feed noise; the meaningful bulk case is the import, already covered).
  "Dataset opened" tracking and the "recently opened" datasets ordering it powers
  are deferred to **R5b** — they need a write-on-open path and would otherwise
  flood the feed.

## Consequences

- (+) The activity panel shows real, tenant-scoped events with no fan-out query
  and no coupling to the source models' internals.
- (+) Events survive their target being renamed or deleted; the label is a stable
  historical fact, and `target_id` still enables deep-linking when possible.
- (+) Recording is isolated to one helper and three call sites; adding a new verb
  later is a one-line `record_activity(...)` at the new moment.
- (−) The `target_label` duplicates the source name at a point in time; it will
  not track later renames (intended for an audit log, but worth stating).
- (−) Recording is best-effort and synchronous at the call site; if a
  `record_activity` insert itself failed it would surface as a task/request error
  rather than being silently dropped. Accepted — the insert is trivial and we
  prefer loudness over hidden data loss; a fully decoupled (signal/outbox)
  recorder is a later option if needed.
- (~) The feed currently attributes events by `actor_email`; richer actor display
  names wait on the user model gaining a name field.

## Alternatives considered

- **Derive the feed on the fly (union recent datasets/reports/dashboards).** No
  new table, but couples the feed to every source model, needs a fan-out query
  per type, cannot represent an event whose source row was deleted, and has no
  clean home for future verbs (e.g. "rows added", "member invited"). Rejected.
- **Generic foreign key (`contenttypes`) to the target.** Keeps a live link to
  the target but reintroduces cross-app joins, breaks when the target is deleted,
  and pulls in the `contenttypes` framework for little gain over a denormalized
  `type`/`id`/`label`. Rejected for an append-only log.
- **Django signals to record events.** Decouples recording from the call sites,
  but hides the write behind implicit signal wiring, is harder to test, and risks
  firing on unintended saves (e.g. a report status bouncing). Explicit calls at
  the three known moments are clearer and safer.
