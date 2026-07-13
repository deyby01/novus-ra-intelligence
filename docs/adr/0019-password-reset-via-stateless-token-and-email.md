# ADR-0019 — Password reset via stateless token and email

- **Status:** accepted
- **Date:** 2026-07-13

## Context

Self-service signup shipped (ADR-0018), so real people now own accounts — but
there is **no way to recover one**. The auth surface is `register` / `login` /
`refresh` / `me` / `logout`; a pilot user who forgets their password is locked
out permanently, with the only recovery being an operator resetting it by hand in
the Django admin. For a real SMB pilot that is an unacceptable dead end.

Two things are missing: a **secure way to prove ownership of an email** without a
prior session, and a **channel to deliver** that proof. The app has never sent an
email; there is no `EMAIL_BACKEND`, `DEFAULT_FROM_EMAIL`, or a URL for the SPA
that a link in an email would point back to.

## Decision

**Add an open, throttled two-step password reset — request a link by email, then
confirm a new password with a stateless signed token — delivered through Django's
email framework.**

- **Stateless token, no new model.** Reuse Django's
  `PasswordResetTokenGenerator` (`default_token_generator`). The token is a signed
  hash of the user's pk, current password hash, and `last_login`, plus a
  timestamp — so it needs **no database row**, expires via
  `PASSWORD_RESET_TIMEOUT`, and is **single-use in practice**: once the password
  changes, the hash changes and every outstanding token for that user is void.
  The user id travels as a `urlsafe_base64` `uid` alongside the token.
- **Two endpoints, both `AllowAny` + throttled** (`ScopedRateThrottle`, scope
  `password_reset`):
  - `POST /api/v1/auth/password/reset/` — body `{ email }`. Always returns
    **200** with a generic message; it **never reveals whether the email exists**
    (anti-enumeration). If an active user owns the address, it emails them a link.
  - `POST /api/v1/auth/password/reset/confirm/` — body `{ uid, token,
    new_password }`. Validates the token, runs `validate_password`, sets the new
    password. An invalid/expired `uid`/`token` → 400 under `token`; a weak
    password → 400 under `new_password`.
- **Email via Django's framework, backend chosen by settings.** A small service
  builds the link (`FRONTEND_BASE_URL` + `/reset-password?uid=…&token=…`) and
  sends it with `send_mail`. `EMAIL_BACKEND` defaults to the **console backend**
  (dev prints the link to the logs — zero setup, no secrets) and is swapped for
  SMTP in production purely through environment variables. Django's
  `EMAIL_BACKEND` *is* the swappable port, so no custom adapter is introduced.
- **The link points at the SPA, not the API.** The email links to the frontend
  `/reset-password` route, which reads `uid`/`token` from the query string and
  calls the confirm endpoint — the API never renders HTML.
- **Synchronous send.** A single reset email is sent inline in the request. It is
  low-frequency and throttled; moving it onto the existing Celery worker is a
  trivial later change if latency ever matters.

## Consequences

- (+) A locked-out pilot user can recover their own account with no operator
  involvement — the last obvious dead end for real users is closed.
- (+) No schema change and no token table to store, expire, or clean up; security
  properties (expiry, invalidation on password change) come from Django's
  vetted generator rather than hand-rolled logic.
- (+) The app gains a configured, env-driven email capability that production
  deployment and any future notification work build on.
- (+) The anti-enumeration 200 on request means the reset flow does not leak which
  emails are registered (unlike signup, which necessarily does).
- (−) The console backend only *logs* the link in dev; a real SMTP provider must
  be configured in production or reset emails silently go nowhere. Documented in
  `.env.example` and the prod settings.
- (−) Synchronous SMTP send couples request latency to the mail provider; accepted
  at pilot scale, Celery-async is the escape hatch.
- (~) A stateless token cannot be explicitly revoked server-side before it
  expires; changing the password (the whole point of the flow) invalidates it,
  which is sufficient here.

## Alternatives considered

- **A `PasswordResetToken` DB model** (random token row, marked used). More
  explicit single-use semantics and revocability, but adds a table, a migration,
  and cleanup, and re-implements security that Django's stateless generator
  already provides correctly. Not worth it for the pilot.
- **A custom `NotificationChannel` / `EmailAdapter` port now.** The hexagonal
  port earns its keep once there are multiple channels or notification types
  (Phase 3). Today there is exactly one message on one channel; Django's
  `EMAIL_BACKEND` already gives provider-swap-by-config, so the port would be
  ceremony. Deferred to Phase 3, where real report email lives too.
- **Reset link pointing at a Django-rendered page.** Would split the UX across two
  frameworks and duplicate styling; the SPA owns all user-facing screens, so the
  link belongs in the frontend.
