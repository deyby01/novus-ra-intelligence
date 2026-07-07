# ADR-0012 — Resolving the "current organization" from request context

- **Status:** accepted
- **Date:** 2026-07-07

## Context

ADR-0001 isolates tenants by an `organization_id` column and ADR-0004 links a user
to organizations through a `Membership` join table (a user can belong to several).
ADR-0004 explicitly deferred one consequence to "the API-design phase": because a
user now has **many** organizations, the isolation layer can no longer read a single
`request.user.organization`. Every tenant-scoped request must therefore declare
**which** organization it acts in, and the server must reject it unless the user
holds an **active** membership there.

Phase 1 introduces the first tenant-scoped endpoints (the dataset API), so the
mechanism must be pinned now. The product's security core is tenant isolation: a
user of tenant A must never read or modify tenant B's data.

## Decision

The current organization is resolved from an **`X-Organization` request header**
carrying the organization's **UUID**, validated on **every** request against an
active `Membership` for the authenticated user.

- The header only *names* the workspace the client wants to act in. It is **never
  trusted as authority**: the server looks up an active `Membership(user=request.user,
  organization=<header>, is_active=True)` on the organization (which must itself be
  active) before any data is read or written. No membership → the request is refused
  and no tenant data is touched.
- Resolution is **stateless** (no server session), which fits the JWT/bearer SPA:
  switching workspace is a header change on the client, never a re-login or token
  refresh.
- The resolved organization is the single source for both filtering
  (`queryset.filter(organization=...)`) and assignment (injected on create) — the
  client never sends an `organization` field in a payload, and one sent is ignored.

**Failure responses** (kept deliberately non-revealing, since isolation is the
security core):

| Situation | Response |
|---|---|
| Header missing or not a valid UUID | `400 Bad Request` — organization context required |
| Header names an org where the user has no active membership, or the org is inactive | `404 Not Found` — do not confirm the organization exists to a non-member |

`404` (not `403`) on the "not a member" case avoids confirming an organization's
existence to outsiders, preventing tenant enumeration.

## Consequences

- (+) Stateless and simple: no subdomains, no wildcard TLS/DNS, no per-tenant CORS,
  no server-side session store. Works today with the existing bearer-token setup.
- (+) Matches the ADR-0004 "workspace switcher" persona (Slack/Notion/GitHub): the
  external accountant switches company by changing one header, staying logged in.
- (+) Membership is re-validated on **every** request, so deactivating a membership
  takes effect immediately — unlike an organization baked into the JWT, which would
  stay valid until the token expired and could not be revoked mid-life.
- (+) The tenant is cross-cutting request *context*, not a resource in the URL, so
  endpoints stay resource-oriented (`/api/v1/datasets/`, not
  `/api/v1/orgs/<id>/datasets/`).
- (−) Every tenant-scoped view depends on a correct header; the frontend must attach
  it on all data requests (handled once in the axios client, mirroring the bearer
  interceptor).
- (−) A shared reusable enforcement point is required so no view forgets to filter —
  addressed by a `TenantQuerysetMixin` (+ a permission) applied to every
  tenant-scoped viewset, rather than ad-hoc filtering per view.

## Alternatives considered

- **Organization as a custom JWT claim (baked in at login).** Rejected: switching
  workspace would need a token refresh, and — worse — a membership revoked mid-token
  could not be enforced until expiry. A per-request header re-validates every time.
- **Subdomain per tenant (`acme.novus.app`).** Rejected for the MVP: wildcard DNS +
  TLS, per-subdomain CORS, and cookie-scope complexity with no benefit over a header
  for a bearer-auth SPA. Reconsider only if per-tenant vanity domains become a
  product requirement.
- **Organization in the URL path (`/api/v1/orgs/<id>/datasets/`).** Rejected: makes
  the tenant look like a resource hierarchy the client constructs, bloats every route,
  and still requires the same membership check. The tenant is context, not a resource.
- **Server-side session holding the chosen workspace.** Rejected: reintroduces
  stateful sessions the JWT design deliberately avoids, and complicates horizontal
  scaling.
- **Slug instead of UUID in the header.** Viable, but a slug can be renamed; the
  immutable UUID PK is the canonical, rename-proof identifier. The frontend already
  fetches the membership list (id + name + slug) and holds the selected id.
