# ADR-0020 — Production signing-key hardening (fail fast on a weak key)

- **Status:** accepted
- **Date:** 2026-07-14

## Context

The repository is **public**. Secrets have always lived in `.env` (git-ignored),
with only placeholders in `.env.example` — so no secret was ever committed. But a
review of the running stack found the container was booting with
`SECRET_KEY == "change-me-to-a-long-random-key"` — the **`.env.example`
placeholder**, copied into `.env` and never replaced (its 30-byte length is what
triggered simplejwt's `InsecureKeyLengthWarning` in tests).

`SECRET_KEY` doubles as the **JWT signing key** (simplejwt signs with it by
default). Because the placeholder is published in the public repo, running with
it means the signing key is effectively public: anyone could **forge a valid JWT
for any user and any organization**, defeating authentication and the
`X-Organization` tenant isolation entirely. Harmless on localhost (unreachable),
but a critical auth-bypass the moment the app is deployed. "We keep secrets in
`.env`" only protects if the placeholders are actually replaced — which had not
happened.

## Decision

**Refuse to boot production with a weak or placeholder signing key, and make the
requirement impossible to miss.**

- **Fail fast in `prod.py`.** On import, `config/settings/prod.py` raises
  `ImproperlyConfigured` if `SECRET_KEY` equals the known placeholder or is
  shorter than 50 characters. A misconfigured production deploy stops at boot
  instead of silently serving forgeable tokens.
- **The key stays env-only.** No key is added to the repo; the rotation of the
  actual value happens in each environment's `.env` / host secrets. The local
  dev key was rotated to a fresh high-entropy value out of band.
- **`.env.example` documents it.** The `DJANGO_SECRET_KEY` entry now states it is
  required, doubles as the JWT signing key, is rejected in prod if weak, and
  gives the generation command
  (`python -c "import secrets; print(secrets.token_urlsafe(64))"`).
- **Scope:** the signing key only. Other placeholder secrets (`POSTGRES_PASSWORD`)
  and broader prod hardening (`DEBUG=False`, `ALLOWED_HOSTS`, `SECURE_*`, HSTS)
  are tracked for the deployment slice; this ADR closes the one materialized
  vulnerability now.

## Consequences

- (+) A deploy carrying the placeholder or a low-entropy key cannot start —
  the forge-any-token vulnerability cannot reach production by accident.
- (+) The fix needs no code that holds a secret, so it is safe on the public repo.
- (+) `.env.example` now teaches the requirement instead of quietly inviting the
  footgun.
- (−) `prod.py` now has import-time logic that can halt boot; that is the intended
  behavior, but it means a prod misconfig surfaces as a startup crash (loud, which
  is correct) rather than a warning.
- (~) 50 characters is a pragmatic floor (`token_urlsafe(64)` yields ~86), not a
  formal entropy measure; it reliably rejects the placeholder and casual keys
  without over-engineering.

## Alternatives considered

- **Just rotate the `.env` key, no code guard.** Fixes today's instance but leaves
  the footgun for the next environment/clone — the placeholder would silently work
  again. The guard makes the failure mode impossible, not just currently-absent.
- **Warn instead of raise.** A log warning is ignorable and would still serve
  forgeable tokens. For an auth-critical key, failing closed is the only safe call.
- **A dedicated `DJANGO_JWT_SIGNING_KEY` separate from `SECRET_KEY`.** Cleaner
  separation of concerns, but an extra knob a solo dev must set; one strong
  `SECRET_KEY` is sufficient for the pilot. Can be split later if needed.
