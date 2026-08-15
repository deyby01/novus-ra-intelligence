# Contributing to Novus RA Intelligence

Thanks for your interest in the project. This guide covers everything you need to go from a clone to a merged pull request: local setup, the branching model, the checks your change must pass, and the standards the codebase follows.

Novus RA Intelligence is MIT-licensed and open to contributions. It is maintained by [@deyby01](https://github.com/deyby01), who reviews and merges every pull request.

---

## 1. The one rule that applies everywhere: write in English

**All code, comments, docstrings, documentation, commit messages, pull requests, and user-facing UI strings are written in English.** No exceptions, regardless of the language you speak day to day or the language a design handoff arrives in.

This keeps the codebase readable to any contributor and consistent with the Django and React ecosystems it builds on. Some Spanish strings from earlier UI work still exist; they are technical debt being migrated to English feature by feature. Do not add new ones — if you touch a file with Spanish strings, translating them is a welcome part of your change.

| Where | Language |
|---|---|
| Python and TypeScript code, identifiers, comments, docstrings | English |
| Documentation, ADRs, this guide, the README | English |
| Commit messages, branch names, pull request titles and bodies | English |
| UI labels, buttons, empty states, error messages | English |
| Issue discussion | English preferred; Spanish is fine if that's what you're comfortable with |

---

## 2. Ways to contribute

- **Report a bug** — open an issue with reproduction steps, what you expected, and what happened. Include your OS, Docker version, and relevant logs.
- **Propose a feature** — open an issue describing the problem first, not just the solution. Features that change architecture need an [ADR](#10-architecture-decisions-adrs) before implementation.
- **Improve documentation** — small fixes to the README, this guide, or the ADRs are genuinely useful and get merged fast.
- **Write code** — pick an open issue or propose one. For anything larger than a small fix, comment on the issue first so nobody duplicates work.

**Security issues:** do not open a public issue. This project handles multi-tenant business data; report vulnerabilities privately to the maintainer.

---

## 3. Get the code

### If you are an external contributor: fork

You will not have push access to this repository, so work from a fork.

```bash
gh repo fork deyby01/novus-ra-intelligence --clone
```

Or, without the GitHub CLI: click **Fork** on GitHub, then

```bash
git clone https://github.com/<your-username>/novus-ra-intelligence.git
cd novus-ra-intelligence
git remote add upstream https://github.com/deyby01/novus-ra-intelligence.git
```

Keep your fork current before starting new work:

```bash
git switch development && git fetch upstream && git merge --ff-only upstream/development
```

### If you have write access: clone directly

```bash
git clone https://github.com/deyby01/novus-ra-intelligence.git
cd novus-ra-intelligence
```

The default branch is `development`. There is no `main`.

---

## 4. Run it locally

### Prerequisites

- **Docker** and **Docker Compose** (the whole stack runs in containers — you do not need Python, Postgres, or Redis installed)
- **Node.js 22+** and npm, only if you want the Vite dev server with hot reload
- A **Google Gemini API key** if you want to exercise the AI features ([get one free](https://aistudio.google.com/apikey)); everything else works without it

### Setup

**1. Create your environment file.**

```bash
cp .env.example .env
```

Open `.env` and replace the placeholders. Two of them matter:

- `DJANGO_SECRET_KEY` — this doubles as the JWT signing key. Generate a real one:
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(64))"
  ```
- `POSTGRES_PASSWORD` — any value locally, but change it from `change-me`.

Optionally set `GEMINI_API_KEY` to enable AI reports and AI dashboard generation.

> `.env` is git-ignored and must never be committed. The repository is public and pull requests are scanned for secrets.

**2. Start the stack.**

```bash
docker compose up -d --build
```

This builds and starts five services: `db` (PostgreSQL 16), `redis`, `backend` (Django), `celery` (async worker), and `frontend` (Nginx serving the built SPA). Database migrations run automatically in development via the container entrypoint.

**3. Create an account.**

Either sign up through the UI at http://localhost, or create an admin user for the Django admin:

```bash
docker compose exec backend python manage.py createsuperuser
```

**4. Open the app.**

| URL | What |
|---|---|
| http://localhost | The application (Nginx + built frontend) |
| http://localhost:8000/api/v1/ | The REST API |
| http://localhost:8000/api/v1/health/ | Health check |
| http://localhost:8000/admin/ | Django admin |

**5. Optional — frontend with hot reload.**

The `frontend` container serves a *baked* production build, so UI changes will not appear until you rebuild it. While working on the frontend, run Vite on your host instead:

```bash
cd frontend && npm install && npm run dev
```

Then use http://localhost:5173, which calls the Dockerized API on port 8000.

> Always run `npm install` from inside `frontend/`, never from the repository root — installing at the root creates a second copy of React and breaks the app at runtime.

### Environment gotchas that will bite you

- **The Celery worker does not auto-reload.** After editing a `tasks.py` or a service it calls: `docker compose restart celery`.
- **Changing `.env` requires a recreate, not a restart:** `docker compose up -d`.
- **New URL routes may not hot-reload** in the backend container: `docker compose restart backend`.
- **To rebuild the served frontend:** `docker compose up -d --build frontend`.
- **To reset the database completely:** `docker compose down -v && docker compose up -d`.

---

## 5. Run the checks (the gate)

Every pull request must pass these locally before you push. CI runs the same checks and will fail the pull request otherwise.

### Backend

```bash
docker compose run --rm --entrypoint pytest backend
```

```bash
docker compose run --rm --no-deps --entrypoint ruff backend check .
```

```bash
docker compose run --rm --no-deps --entrypoint ruff backend format --check .
```

```bash
docker compose run --rm --entrypoint python backend manage.py makemigrations --check --dry-run
```

`ruff check` and `ruff format --check` are **two separate gates** — passing one does not mean the other passes. Use `ruff check . --fix` and `ruff format .` to fix issues automatically.

The migrations check catches model changes that were never turned into a migration file. If it fails, run `makemigrations` and commit the generated file.

### Frontend

Run these from `frontend/`:

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run format:check
```

```bash
npm run build
```

ESLint and Prettier are separate too: `npm run lint` will not catch formatting problems. Run `npm run format` to fix them.

### Verify it in a browser

If your change is visible in the UI, open it in a real browser against the running stack before you open the pull request — desktop and mobile widths. Check the loading, empty, and error states, not just the happy path. Automated tests do not catch a broken layout.

---

## 6. Branching model

**Never commit directly to `development`.** Every change reaches it through a pull request.

Start from an up-to-date `development`:

```bash
git switch development && git pull --ff-only
```

Then create your branch using the naming convention:

```
<type>/<your-github-username>/<specific-feature>
```

```bash
git switch -c feature/janedoe/csv-import
```

| Part | Rule |
|---|---|
| `<type>` | `feature` for new capability, `fix` for a bug fix, `chore` for tooling and dependencies, `docs` for documentation |
| `<your-github-username>` | Your actual GitHub username, so branches are traceable to a person |
| `<specific-feature>` | Short, kebab-case, and **specific**. `dataset-column-filters`, not `improvements` or `changes` |

Good: `feature/janedoe/dataset-column-filters` · `fix/janedoe/widget-resize-overflow` · `docs/janedoe/api-examples`

Bad: `my-branch` · `feature/new-stuff` · `janedoe-patch-1`

Keep one branch to one logical change. If you find an unrelated problem while working, open a separate issue or a separate branch rather than growing the current one.

---

## 7. Commits

The project uses [Conventional Commits](https://www.conventionalcommits.org/), in English:

```
<type>(<scope>): <short summary in the imperative>

Explain WHY this change is needed and what it enables, not just what
changed — the diff already shows what changed.

Files touched:
- path/to/file.py — one line on its purpose
```

`<type>` is one of `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. `<scope>` is the area touched: `datasets`, `dashboards`, `accounts`, `reports`, `ci`.

```
feat(datasets): infer column types when importing a workbook
fix(dashboards): keep widget order stable after a reorder
docs(readme): document the local Docker setup
```

Stage files explicitly (`git add path/to/file`) rather than `git add .`, so nothing unintended slips in. Keep commits atomic: each one should leave the repository in a working state.

---

## 8. Open a pull request

**Everything goes through a pull request targeting `development`.** No direct pushes, no self-merges.

```bash
git push -u origin feature/janedoe/csv-import
```

Then open the pull request on GitHub, or:

```bash
gh pr create --base development --title "feat(datasets): add CSV import" --body "..."
```

A pull request template will be filled in for you. Complete every section:

- **What & why** — the problem, not only the solution. Link the issue with `Closes #123`.
- **Changes** — grouped so a reviewer can follow them.
- **Multi-tenant isolation** — required whenever you touch data access. See [section 9](#9-multi-tenant-isolation-security-critical).
- **How to test** — the steps a reviewer follows to see it working.
- **Checklist** — tick it honestly. An unticked box is fine; a wrongly ticked one wastes the reviewer's time.

### Review

**[@deyby01](https://github.com/deyby01) is assigned as reviewer automatically** through [`.github/CODEOWNERS`](../.github/CODEOWNERS). You do not need to add them manually. Only the repository owner merges pull requests.

What happens next:

1. **CI runs** — ruff, pytest, migration check, ESLint, Prettier, Vitest, and the production build. A red build will not be reviewed; fix it and push again.
2. **The maintainer reviews.** Expect questions about tenant isolation, test coverage, and whether the change fits the existing architecture.
3. **Push follow-up commits to the same branch** to address feedback. Do not force-push after a review has started — it makes comments harder to follow.
4. **The maintainer merges** with a squash merge, and deletes the branch.

After your pull request is merged, clean up locally:

```bash
git switch development && git pull --ff-only && git branch -d feature/janedoe/csv-import
```

---

## 9. Multi-tenant isolation (security critical)

This is the single most important correctness property in the codebase, and historically the one most likely to break. Every row of business data belongs to exactly one organization, and users of one organization must never be able to read or write another's data.

How it works ([ADR-0001](adr/0001-tenant-isolation-by-column.md), [ADR-0012](adr/0012-current-organization-resolution.md)):

- The current organization is resolved **server-side** from the `X-Organization` header and validated on every request against an active `Membership`. The client names the workspace; it never authorizes access to it.
- Tenant models extend `TenantBaseModel` (an `organization` foreign key). Viewsets use `TenantQuerysetMixin` so querysets are filtered by organization before anything else happens.
- Any foreign key a client can set is re-scoped to the current organization in the serializer. An unknown or foreign id returns **404, never 403** — a 403 would confirm that the record exists.
- Custom `@action`s must use `self.get_object()` or `Model.objects.get(id=..., organization=self.current_organization)`. Never `Model.objects.get(id=...)` on its own.
- On the frontend, every workspace-scoped React Query hook includes `organizationId` in its query key, so cached data cannot leak across a workspace switch.

**If your change touches data access, add a test that proves organization B cannot reach organization A's records**, and describe the isolation in your pull request. Look at `backend/apps/datasets/tests/` for the established pattern.

---

## 10. Code standards

### Python

- Type-annotate every argument and return value (except `*args` / `**kwargs`).
- Layering is `View → Serializer → Service → Model`. Business logic lives in `services/`, never in views. Services never import from the API layer.
- **Never filter in Python.** Push the work into the queryset: `.filter()`, `.exists()`, `.count()`, `.only()`. Use `select_related` / `prefetch_related` to avoid N+1 queries.
- Wrap multi-table writes in `transaction.atomic()`.
- List endpoints are paginated and tenant-filtered.
- Concise docstrings; comments only where the logic is genuinely non-obvious. Do not reference ADR numbers in code.
- `ruff` enforces both linting and formatting.

### Frontend

- TypeScript **strict** — no `any`.
- Organize by feature: `src/features/<feature>/{components,pages,api.ts,hooks.ts,types.ts}`.
- Hooks own data and state; components render. Prefer composition over adding boolean flags to a component.
- **Server state lives in React Query; client state lives in Zustand.** Do not cache server data in Zustand.
- Follow the existing design tokens (`--g0` … `--g950`) and the shadcn/ui components already in the project rather than introducing new styling approaches.
- ESLint and Prettier both have to pass.

### Tests

New behaviour needs a test. The project follows TDD for services and security-critical logic, and integration tests at the API layer. Backend tests live in `backend/apps/<app>/tests/`; frontend tests sit next to the code they cover as `*.test.ts(x)` and use MSW to mock the API.

---

## 11. Architecture decisions (ADRs)

Decisions that shape the architecture are recorded in [`docs/adr/`](adr/) **before** they are implemented — what was decided, why, which alternatives were rejected, and what trade-offs are accepted.

Write an ADR if your change introduces a new external dependency or integration, changes how data is modelled or isolated, adds a new architectural layer or pattern, or changes an existing decision. Follow the template and rules in [`docs/adr/README.md`](adr/README.md). Small features, bug fixes, and refactors that follow existing patterns do not need one.

---

## 12. Project layout

```
├── backend/                  # Django + DRF
│   ├── apps/
│   │   ├── accounts/         # custom email-based User, JWT auth, profile
│   │   ├── organizations/    # Organization + Membership (multi-tenancy core)
│   │   ├── datasets/         # dynamic datasets, Excel import, aggregation
│   │   ├── dashboards/       # dashboards and chart widgets
│   │   ├── reports/          # AI reports (Gemini) and PDF export
│   │   ├── activity/         # workspace activity feed
│   │   └── core/             # shared base models and mixins
│   ├── config/settings/      # base / dev / test / prod
│   └── requirements/         # base.txt, dev.txt, prod.txt
├── frontend/                 # React + Vite + TypeScript
│   ├── src/features/         # one folder per feature
│   ├── nginx.conf            # serves the SPA and proxies /api/ to Django
│   └── Dockerfile            # multi-stage: Vite build → Nginx
├── docs/
│   ├── adr/                  # architecture decision records
│   ├── erd/                  # database diagrams
│   └── CONTRIBUTING.md       # this file
└── docker-compose.yml
```

---

## 13. Licensing of contributions

By contributing, you agree that your contributions are licensed under the [MIT License](../LICENSE) that covers this project.
