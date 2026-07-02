# ADR-0007 — JSONB for dynamic dataset rows

- **Status:** accepted
- **Date:** 2026-07-02

## Context

Datasets have a user-defined, runtime-determined shape: each imported Excel has different columns. We cannot know the schema ahead of time, so fixed SQL columns per dataset are impossible without either creating tables at runtime or an EAV design.

## Decision

Store each row's payload as a single **JSONB document** in `DatasetRow.data`, using Django's `JSONField` (which maps to PostgreSQL `jsonb`). The dataset's schema is described by `DatasetField` rows (`key`, `label`, `field_type`, ...). **Type validation lives in the service layer**, driven by the `DatasetField` definitions, since JSONB does not enforce value types at the database level.

Scope rule: JSONB is used **only where the schema is genuinely dynamic** — `DatasetRow.data`, and small structured-config fields (`Widget.config`, `Widget.position`, `Automation.condition`, `Automation.action`). Everything with a known, stable shape (Organization, User, Dataset metadata, Membership, ...) uses normal typed columns.

## Consequences

- (+) Any Excel structure imports trivially: one Excel row → one `DatasetRow`.
- (+) JSONB is queryable and indexable (Postgres operators `->`, `->>`, `@>`; GIN indexing covered in ADR-0008), unlike a plain text blob.
- (+) The ORM can query it (`DatasetRow.objects.filter(data__stock__lt=10)`).
- (-) The database no longer enforces value types; a wrong-typed value can be stored. **Mitigation:** the `ImportService`/serializers validate each row against its `DatasetField` definitions before saving. This is a first-class responsibility, not an afterthought.
- (-) Config JSON fields need their own validation (dedicated serializers) to avoid becoming untyped swamps.

## Alternatives considered

- **Dynamic SQL tables per dataset** — `CREATE TABLE` at request time: thousands of tables, unmanageable migrations, unsupported by the ORM, security/perf risk. Rejected.
- **EAV (Entity-Attribute-Value)** — one row per (row, field, value): a classic anti-pattern; reconstructing a row needs many joins and performance collapses. Rejected.
- **JSONB everywhere** — the opposite mistake; using JSONB for stable-shape data throws away type safety and relational integrity for no benefit. Explicitly scoped out.
