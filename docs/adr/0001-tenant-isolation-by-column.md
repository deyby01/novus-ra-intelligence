# ADR-0001 — Multi-tenant isolation via `organization_id` column

- **Status:** accepted (current-organization resolution refined by [ADR-0004](0004-user-organization-via-membership.md))
- **Date:** 2026-07-01

## Context

The product is a SaaS where multiple companies (tenants) share the same instance. One company's data must **never** be visible to another. There are three standard strategies in Django/PostgreSQL, from least to most isolated: a tenant FK column, one PostgreSQL schema per tenant (`django-tenants`), or one database per tenant.

## Decision

We will use **a single `organization` FK column** on every business model, via an abstract `TenantBaseModel` that they all inherit from. Every view filters mandatorily through a `TenantQuerysetMixin` that reads `request.user.organization` — **never** a `tenant_id` sent by the client.

## Consequences

- (+) The simplest option: a single database, normal migrations, normal queries.
- (+) Sufficient for the expected volume (SMEs) and migratable to `django-tenants` (schemas) if the product grows.
- (-) Isolation depends on code discipline: forgetting the mixin on a view means a data leak between companies. **Mitigation:** mandatory tenant-isolation test suite that verifies, for every endpoint, that a tenant-A user cannot see tenant-B resources; the mixin is a fixed item on the review checklist.
- (-) Every query carries an extra `organization_id` filter. Negligible impact with proper indexing.

## Alternatives considered

- **Schema per tenant (`django-tenants`)** — more isolation, but complicates migrations, tests, and the local environment; unnecessary for the MVP. Kept as a documented evolution path.
- **Database per tenant** — only makes sense for Enterprise/on-premise clients; disproportionate operational cost and complexity to start with.
