# Novus RA Intelligence

**Multi-tenant** SaaS platform for business management: centralizes the data SMEs keep scattered across Excel files, turns it into queryable datasets, and powers it with dashboards, AI-generated reports, and rule-based automations.

> 📌 Project status, roadmap, and working agreement live in `PROJECT_STATE.md` (local only, not versioned). Architecture decisions live in [docs/adr/](docs/adr/).

## Stack

| Layer | Technology |
|---|---|
| Backend | Django 5 · Django REST Framework · JWT (simplejwt) |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · React Query |
| Data | PostgreSQL 16 (JSONB for dynamic datasets) · Redis |
| Async | Celery + Celery Beat (imports, reports, automations) |
| AI | Google Gemini (behind a swappable `AIProvider` port) |
| Infra | Docker Compose · Nginx |

## Repository structure

```
├── docs/
│   ├── adr/                # architecture decision records (ADRs)
│   └── erd/                # database diagrams
├── backend/                # Django + DRF (own Docker image)
│   └── requirements/       # base.txt / dev.txt / prod.txt
├── frontend/                # React + Vite + TS (own Docker image)
├── nginx/                    # reverse proxy (added in Phase 1)
├── docker-compose.yml
└── .env.example               # variable template (copy values into .env)
```

## Running the environment

> 🚧 Work in progress — the project is in **Phase 0 (Foundations)**. This section will be completed once the compose setup is operational. The flow will be:
>
> 1. Copy variables: fill in `.env` based on `.env.example`
> 2. `docker compose up --build`
> 3. Migrations: `docker compose exec backend python manage.py migrate`

## Architecture (summary)

- Layered backend: `View → Serializer → Service → Model`. Business logic lives in the **service layer**, never in the views.
- **Selective hexagonal architecture**: external dependencies (Gemini, email/WhatsApp) are consumed through ports with swappable adapters — tests inject fakes.
- **Multi-tenant isolation** via an `organization_id` column with a mandatory filtering mixin and a tenant-isolation test suite ([ADR-0001](docs/adr/0001-tenant-isolation-by-column.md)).
- TDD on services and security-critical logic; integration tests on the API layer.
