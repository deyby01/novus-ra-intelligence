# ADR-0002 — UUID v4 as primary key for business models

- **Status:** accepted
- **Date:** 2026-07-02

## Context

Every table needs a primary key. PostgreSQL offers two dominant strategies: `BIGSERIAL` (64-bit auto-incrementing integer, Django's `BigAutoField` default) or `UUID` (128-bit value, Django's `UUIDField`). Since this is a multi-tenant SaaS whose resource IDs are exposed in REST URLs (`/api/v1/datasets/{id}/`) and sent to the frontend, the choice has security and portability implications, not just storage ones.

## Decision

All business models inherit from an abstract `BaseModel` whose primary key is a **UUID version 4** (`UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`). Purely internal / high-volume log tables (none exist yet) may keep `BIGSERIAL` if their IDs are never exposed.

## Consequences

- (+) IDs are **not enumerable**: exposing `/api/v1/users/{uuid}/` leaks neither the row count nor an ordering, and blocks ID-enumeration attacks.
- (+) **Globally unique**: IDs can be generated without central coordination, which keeps future options open (data merges, sharding, offline clients).
- (-) 16 bytes vs 8, so slightly larger indexes and JOIN cost. Negligible at the expected SME scale.
- (-) UUID v4 is fully random, hurting B-tree insert locality on write-heavy tables. **Mitigation / future path:** if write volume ever justifies it, migrate to time-ordered UUID v7 (native `uuidv7()` lands in PostgreSQL 18; a Python lib can provide it on PG 16). Recorded here as a possible future ADR, not needed for the MVP.

## Alternatives considered

- **`BIGSERIAL` everywhere** — smaller and marginally faster, but predictable/enumerable IDs on public URLs are a real information-leak and enumeration-attack vector for a multi-tenant product. Rejected as the default.
- **UUID v7 now** — best of both worlds (random + time-ordered), but not native in PostgreSQL 16 and adds a dependency/complexity we don't need for MVP volumes. Deferred.
