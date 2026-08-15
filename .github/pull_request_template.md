<!--
Write everything in English: title, description, code, comments.
Title format: <type>(<scope>): <summary>   e.g. feat(datasets): add column type inference
Read docs/CONTRIBUTING.md before opening your first pull request.
-->

## What & why

<!-- What does this change do, and what problem does it solve? Link the issue: Closes #123 -->

## Changes

<!-- Group the changes so a reviewer can follow them. -->

-

## Multi-tenant isolation

<!--
REQUIRED when this PR touches data access (models, viewsets, serializers, services, query hooks).
State how the change stays scoped to the current organization. Write "N/A — no data access touched" otherwise.
-->

## How to test

<!-- The steps a reviewer follows to see this working. -->

1.

## Checklist

- [ ] Branch is named `feature/<username>/<specific-feature>` (or `fix/…`, `chore/…`, `docs/…`) and targets `development`
- [ ] Code, comments, docs, commit messages, and UI strings are in **English**
- [ ] New behaviour is covered by tests
- [ ] Backend gate passes: `pytest`, `ruff check .`, `ruff format --check .`, `makemigrations --check --dry-run`
- [ ] Frontend gate passes: `npm test`, `npm run lint`, `npm run format:check`, `npm run build`
- [ ] No secrets, credentials, or `.env` files are included
- [ ] An ADR was added under `docs/adr/` if this introduces an architecture decision

---

@deyby01 is requested as reviewer automatically via `.github/CODEOWNERS`.
