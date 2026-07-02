# ADR-0006 — Core entity model and denormalized tenant FK

- **Status:** accepted
- **Date:** 2026-07-02

## Context

Before writing any model we need the core entity set, their cardinalities, and a rule for how the tenant (`Organization`) reference propagates to child tables. A `DatasetRow` reaches its organization indirectly through `dataset → organization`; the question is whether it should also carry its own `organization` FK (denormalized) or rely on the join (normalized).

## Decision

Core entities and cardinalities (crow's foot):

- `Organization ||--o{ Membership }o--|| User` — user↔org via Membership (ADR-0004)
- `Organization ||--o{ Dataset`
- `Dataset ||--o{ DatasetField` — dynamic column definitions
- `Dataset ||--o{ DatasetRow` — rows, payload in JSONB (ADR-0007, pending)
- `Dataset ||--o{ ImportJob` — an Excel load with its own status/errors (many imports may append to one dataset over time)
- `Organization ||--o{ Dashboard ||--o{ Widget` and `Dataset ||--o{ Widget` — a widget lives in a dashboard but reads from a dataset (two distinct relations)
- `Organization ||--o{ Report` — kept independent of Dataset (generated from a point-in-time data summary)
- `Organization ||--o{ Automation` and `Dataset ||--o{ Automation` — an automation watches a dataset

**Tenant FK:** every tenant-scoped table carries its **own** `organization` FK via an abstract `TenantBaseModel` (denormalized). The isolation mixin filters `organization=<current org>` uniformly on every viewset.

## Consequences

- (+) Uniform, predictable, auditable tenant isolation: the exact same `filter(organization=...)` on every model; defense in depth if a query forgets a parent join.
- (+) More intuitive access path (`row.organization` vs `row.dataset.organization`) — matters for readability in a real team.
- (-) `organization` is redundant on child tables and must be set consistently on create; this responsibility lives in the service layer.
- (-) Risk of an inconsistent `organization` between a child and its parent. **Mitigation:** always derive the child's `organization` from its parent in the service; can be enforced later with a DB constraint/trigger if needed.

## Alternatives considered

- **Normalized (only `Dataset` holds `organization`; children join via `dataset__organization`)** — no redundancy, but every child query needs the join and the isolation mixin must know each model's relation path. More fragile; security uniformity beats relational purity here. Rejected.
- **Report linked to Dataset** — deferred; reports are point-in-time and independent for now. Adding the link later is an additive change.
