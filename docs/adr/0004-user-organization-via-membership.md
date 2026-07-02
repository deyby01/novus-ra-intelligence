# ADR-0004 — User ↔ Organization relationship via a `Membership` table

- **Status:** accepted
- **Date:** 2026-07-02

## Context

A user must belong to a tenant (Organization). The original plan used a direct `User.organization` FK (one user → one organization). But in a management SaaS for SMEs, a real recurring persona is the external accountant/consultant who serves several companies — they'd need one account per company under a plain FK. We must also decide where a user's role lives.

## Decision

We model the relationship with an explicit **`Membership`** join table between `User` and `Organization` (a many-to-many *through* model). A user can belong to several organizations; the **role lives on the membership**, not on the user, so the same person can be `admin` in one org and `viewer` in another.

- `Membership`: `user` FK, `organization` FK, `role` (choices for MVP: admin/manager/operator), `is_active`, plus audit fields. `UniqueConstraint(user, organization)`.
- Role starts as a choices enum on `Membership`. Fine-grained per-module permissions (the plan's `Role` table with JSON permissions) are deferred to a later ADR — YAGNI until Phase 4.

## Consequences

- (+) One account per human; multi-organization access via a workspace switcher (Slack/Notion/GitHub pattern).
- (+) Role is naturally scoped per organization.
- (+) Avoids the expensive data migration + permission rewrite that reversing a plain FK later would require.
- (-) **Ripple on ADR-0001 (tenant isolation):** the isolation mixin can no longer read `request.user.organization` (a user now has many). The "current organization" must be resolved from **request context** (chosen workspace — via header/subdomain/session) and the request must be rejected unless the user has an active `Membership` in that organization. This refines, but does not replace, ADR-0001. Details to be pinned in the API-design phase.
- (-) Slightly more complex queries and one extra table from day one.

## Alternatives considered

- **Plain `User.organization` FK** — simpler for the MVP, but blocks the multi-company user and is the plan's own "hardest to reverse" decision. Rejected.
- **Role as a separate global `Role` table now** — over-engineered before permissions exist; deferred to a later ADR.
