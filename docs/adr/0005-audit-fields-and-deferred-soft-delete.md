# ADR-0005 — Audit fields (`created_by`/`updated_by`) and deferred soft delete

- **Status:** accepted
- **Date:** 2026-07-02

## Context

Every row already carries `created_at` / `updated_at` from `BaseModel`. Enterprise apps often add two more kinds of metadata: **authorship** (`created_by` / `updated_by` — which user did it) and **soft delete** (`deleted_at` / `is_deleted` — hide rows instead of physically deleting them). Both are useful but have different cost/benefit, and we want to avoid over-engineering the MVP.

## Decision

- **Authorship:** add `created_by` / `updated_by` (nullable FK to `User`, `on_delete=SET_NULL`) via a **separate `AuthoredModel` mixin**, applied only to business entities (Dataset, Report, Automation, ...). It is **not** put on `BaseModel`, so tables like `Membership` or internal logs don't carry it unnecessarily.
- **Soft delete:** **deferred.** We use normal (hard) deletes for now. Revisit in Phase 4 (alongside the action audit log) with its own ADR if a real "restore my data" need appears.

## Consequences

- (+) Basic "who did this" traceability from day one, cheaply, only where it matters.
- (+) No soft-delete filter leaking into every query and every test yet (keeps the isolation/query story simple — YAGNI).
- (-) `created_by`/`updated_by` must be populated by the service layer (from the request user), not automatically — a small, explicit responsibility we accept.
- (-) If soft delete is added later, some already-hard-deleted data is unrecoverable. Accepted for the MVP.

## Alternatives considered

- **Put authorship on `BaseModel`** — simpler, but pollutes join/log tables that don't need it. Rejected in favor of a mixin.
- **Soft delete from day one** — adds a cross-cutting `is_deleted=False` filter (custom manager) to every model and test before any real need exists. Deferred.
