# ADR-0018 — Self-service registration and workspace creation

- **Status:** accepted
- **Date:** 2026-07-13

## Context

The product works end-to-end with **seeded** data, but there is no way for a
real person to start using it. The auth surface is `login` / `refresh` / `me` /
`logout` only — there is **no registration endpoint** — and organizations plus
memberships are created by hand (`createsuperuser` + Django admin). So onboarding
a real SMB today requires an operator to manually mint every account and tenant.

This is the single blocker between "demo with seeded data" and "a real pilot can
sign up and use it" — the pilot the LLM council named as the highest-value next
move. A tenant is resolved per-request from the `X-Organization` header validated
against an active `Membership` (ADR-0012), so a usable account needs three rows
created together: a `User`, an `Organization`, and a `Membership` linking them.

## Decision

**Add an open, self-service `POST /api/v1/auth/register/` that atomically creates
a user, their first organization, and an admin membership, then logs them in.**

- **One atomic step.** The endpoint takes `email`, `password`, and
  `organization_name` and creates all three rows inside a single
  `transaction.atomic()` — a mid-way failure leaves no orphan user or tenant. The
  registrant becomes the **`ADMIN`** of the new organization (the highest role in
  `Membership.Role`); the org starts on the `STARTER` plan, `is_active=True`.
- **Auto-login.** The 201 response returns the user, the organization, and a
  fresh JWT access/refresh pair (`RefreshToken.for_user`), so the frontend can
  drop the user straight into their new workspace without a second login round-trip.
- **Public but throttled.** Registration is unauthenticated (`AllowAny`) and
  rate-limited with `ScopedRateThrottle` (scope `register`, keyed by client IP
  for anonymous requests) to bound spam/abuse, mirroring the login throttle.
- **Validation is explicit, not incidental.** The serializer validates the
  password with Django's `validate_password`, rejects a duplicate email with a
  clean 400 (not an IntegrityError 500), and trims/requires the organization
  name. The org `slug` (a unique field, cosmetic here since tenancy rides the
  `X-Organization` UUID) is auto-generated from the name and de-duplicated.
- **Scope of this slice:** first-organization-at-signup only. Creating *additional*
  workspaces for an existing user (an `Organization` create endpoint) and
  invite-based joining are deferred to follow-up slices.

## Consequences

- (+) A real SMB can sign up and reach a usable, isolated workspace with no
  operator involvement — the pilot is unblocked.
- (+) Atomic creation guarantees no half-provisioned accounts; the registrant is
  correctly the admin of only their own tenant (no cross-tenant leak — the new
  org has exactly one member).
- (+) Auto-issued tokens make onboarding a single frictionless step.
- (−) Open registration invites spam accounts; the IP throttle bounds it but does
  not eliminate it. Email verification and/or invite-only signup can harden this
  later if the pilot needs it.
- (−) Returning "email already registered" is a minor account-enumeration vector.
  Accepted for pilot-stage UX (standard signup behavior); revisit with the
  privacy/ToS work.
- (~) `organization_name` is free text and a user can create a workspace whose
  name collides with another tenant's — expected in a multi-tenant product; the
  unique slug keeps identifiers distinct and tenancy is by UUID regardless.

## Alternatives considered

- **Invite-only onboarding.** An operator (or an existing admin) invites users.
  Safer against spam but reintroduces the manual step this ADR exists to remove;
  wrong for a self-service pilot. Can be added alongside open signup later.
- **Separate user-registration and organization-creation endpoints.** More
  flexible (a user could register, then create/join any org), but it makes the
  first-run a two-request dance and can strand a user with an account but no
  workspace. The atomic bundle is the smoother first-run; a standalone org-create
  endpoint is still a clean follow-up for additional workspaces.
- **No auto-login (register, then force a separate login).** Simpler endpoint,
  but a worse first impression and an extra round-trip for no security gain
  (the caller just proved the credentials).
