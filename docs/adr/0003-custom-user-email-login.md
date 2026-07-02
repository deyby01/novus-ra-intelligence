# ADR-0003 — Custom User model with email login via `AbstractBaseUser`

- **Status:** accepted
- **Date:** 2026-07-02

## Context

Django wires `AUTH_USER_MODEL` on the first migration; several built-in tables create foreign keys to it, so swapping the user model later is officially "much more difficult." We must decide the user model before the first `migrate`. Django's default user logs in with `username`; a SaaS logs in with `email`. Django offers two base classes to customize the user: `AbstractUser` (inherits the full default user, keeps a `username` field) and `AbstractBaseUser` (blank canvas, full control, requires a custom manager).

## Decision

We define a custom `User` inheriting from **`AbstractBaseUser`** (+ `PermissionsMixin`), with `email` as `USERNAME_FIELD`, no `username` field, and a custom `UserManager` implementing `create_user` / `create_superuser`. `AUTH_USER_MODEL` is set before the first migration. PK is UUID v4 per ADR-0002.

## Consequences

- (+) Clean email-only identity, no vestigial `username` to null out or patch.
- (+) Forces us to understand Django's auth internals (manager, `USERNAME_FIELD`, `REQUIRED_FIELDS`) — a learning goal of the project.
- (-) More code than `AbstractUser`: we write the fields and the manager ourselves (~40 lines). Official full example is the reference: <https://docs.djangoproject.com/en/5.2/topics/auth/customizing/#a-full-example>.
- (-) Must remember `REQUIRED_FIELDS` and admin/form wiring; covered by tests.

## Alternatives considered

- **`AbstractUser` with email as USERNAME_FIELD** — faster, but drags the `username` column (must be nulled/ignored), which is a known source of ugly patches. Rejected for a real product.
- **Default Django User** — would force the painful mid-project swap the docs warn against. Rejected.
