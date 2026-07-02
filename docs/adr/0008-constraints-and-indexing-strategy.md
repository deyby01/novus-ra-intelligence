# ADR-0008 — Constraints and indexing strategy

- **Status:** accepted
- **Date:** 2026-07-02

## Context

We need to pin the data-integrity rules (constraints) and the performance structures (indexes) for the core schema. Two facts frame the decision: Django auto-creates an index on every `ForeignKey`, and the product's central operation is filtering `DatasetRow` by the *contents* of its JSONB `data` column, which a B-tree index cannot serve.

## Decision

**Constraints (integrity):**
- `DatasetField`: `UniqueConstraint(dataset, key)` — no duplicate column keys within a dataset.
- `Membership`: `UniqueConstraint(user, organization)` — a user joins an org at most once.
- `Organization`: `slug` unique.
- Use `Meta.constraints` with `UniqueConstraint` (not the semi-deprecated `unique_together`).

**Indexes (performance):**
- `GinIndex(fields=["data"])` on `DatasetRow` — the only index we add up front by design, because content queries on JSONB need GIN, not B-tree.
- Rely on Django's automatic FK indexes (e.g. `DatasetRow.dataset`, `DatasetRow.organization`); do **not** re-declare them. The plan's explicit `Index(fields=["dataset"])` was redundant.
- **Add any further index only with evidence** (a real slow query), never on a hunch.

## Consequences

- (+) Business rules enforced at the database level, not just in code.
- (+) Content filtering on datasets stays fast at scale (read-heavy workload favors GIN).
- (-) GIN slows writes slightly and uses extra space — an accepted trade-off for an import-once/query-many product.
- (-) "Indexes by evidence" means we may hit a slow query later and add an index then; acceptable and healthier than premature, bloating indexes.

## Alternatives considered

- **B-tree on `data`** — cannot index *inside* the JSON document; useless for content queries. Rejected.
- **Index everything defensively** — bloats the DB and slows writes for no measured benefit. Rejected in favor of evidence-driven indexing (GIN excepted, which is known-critical from the design).
- **`unique_together`** — legacy API; `UniqueConstraint` is the documented modern replacement.
