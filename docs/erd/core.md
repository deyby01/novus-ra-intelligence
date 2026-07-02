# Core ERD — Novus RA Intelligence

The core database model, synthesized from ADR-0001 through ADR-0009. This is the source of truth we translate into Django models — **read the ADRs for the *why* of each choice**; this file captures the *what*.

> GitHub renders the Mermaid diagram below automatically. Notation is crow's foot: `||` = exactly one, `o{` = zero-or-many. So `Organization ||--o{ Dataset` reads "one Organization owns zero or many Datasets".

## Abstract bases (not tables — mixed into the models)

These are Django abstract models; their fields appear on every table that inherits them.

| Abstract | Adds | Applied to |
|---|---|---|
| `BaseModel` | `id` (UUID PK, ADR-0002), `created_at`, `updated_at` | everything |
| `TenantBaseModel` (`BaseModel`) | `organization` FK (denormalized, ADR-0006) | every tenant-scoped table |
| `AuthoredModel` (mixin) | `created_by`, `updated_by` (nullable FK → User, ADR-0005) | business entities only |

## Diagram

```mermaid
erDiagram
    Organization ||--o{ Membership : "has"
    User         ||--o{ Membership : "has"

    Organization ||--o{ Dataset     : "owns"
    Dataset      ||--o{ DatasetField : "defines"
    Dataset      ||--o{ DatasetRow   : "contains"
    Dataset      ||--o{ ImportJob    : "loaded by"

    Organization ||--o{ Dashboard : "owns"
    Dashboard    ||--o{ Widget    : "contains"
    Dataset      ||--o{ Widget    : "feeds"

    Organization ||--o{ Report     : "owns"
    Organization ||--o{ Automation : "owns"
    Dataset      ||--o{ Automation : "watches"

    Organization {
        uuid id PK
        string name
        string slug UK
        string plan "starter | pro | enterprise"
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    User {
        uuid id PK
        string email UK
        string password "hashed"
        boolean is_active
        boolean is_staff
        datetime date_joined
        datetime created_at
        datetime updated_at
    }
    Membership {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        string role "admin | manager | operator"
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    Dataset {
        uuid id PK
        uuid organization_id FK
        string name
        text description
        string source "excel | manual"
        uuid created_by FK "nullable"
        uuid updated_by FK "nullable"
        datetime created_at
        datetime updated_at
    }
    DatasetField {
        uuid id PK
        uuid organization_id FK
        uuid dataset_id FK
        string key
        string label
        string field_type "text | number | date | boolean | select"
        int order
    }
    DatasetRow {
        uuid id PK
        uuid organization_id FK
        uuid dataset_id FK
        jsonb data "GIN indexed"
        datetime created_at
        datetime updated_at
    }
    ImportJob {
        uuid id PK
        uuid organization_id FK
        uuid dataset_id FK
        string status "pending | processing | done | error"
        string file "uploaded Excel"
        int rows_processed
        jsonb errors "per-row error report"
        uuid created_by FK "nullable"
        datetime created_at
        datetime updated_at
    }
    Dashboard {
        uuid id PK
        uuid organization_id FK
        string name
        uuid created_by FK "nullable"
        uuid updated_by FK "nullable"
        datetime created_at
        datetime updated_at
    }
    Widget {
        uuid id PK
        uuid organization_id FK
        uuid dashboard_id FK
        uuid dataset_id FK
        string chart_type "line | bar | pie | kpi | table"
        jsonb config "axes, aggregations, filters"
        jsonb position "x, y, w, h"
    }
    Report {
        uuid id PK
        uuid organization_id FK
        string title
        text prompt
        text content "AI-generated"
        string status "pending | done | error"
        string pdf_file "nullable"
        uuid created_by FK "nullable"
        datetime created_at
        datetime updated_at
    }
    Automation {
        uuid id PK
        uuid organization_id FK
        string name
        uuid dataset_id FK
        jsonb condition
        jsonb action
        boolean is_active
        uuid created_by FK "nullable"
        datetime created_at
        datetime updated_at
    }
```

## Constraints & indexes (ADR-0008)

| Table | Rule | Kind |
|---|---|---|
| `Organization` | `slug` unique | constraint |
| `Membership` | `UniqueConstraint(user, organization)` | constraint |
| `DatasetField` | `UniqueConstraint(dataset, key)` | constraint |
| `DatasetRow` | `GinIndex(fields=["data"])` | index |
| all FKs | auto-indexed by Django | index (implicit) |

## Referential actions — `on_delete` (ADR-0009)

| FK | on_delete | Why |
|---|---|---|
| `Membership.user` | CASCADE | membership is part of the user |
| `Membership.organization` | CASCADE | membership is part of the org |
| `Dataset.organization` | CASCADE | ownership |
| `DatasetField.dataset` / `.organization` | CASCADE | ownership |
| `DatasetRow.dataset` / `.organization` | CASCADE | ownership |
| `ImportJob.dataset` / `.organization` | CASCADE | ownership |
| `Dashboard.organization` | CASCADE | ownership |
| `Widget.dashboard` / `.organization` | CASCADE | widget lives in the dashboard |
| `Widget.dataset` | **PROTECT** | can't delete a dataset a widget uses |
| `Report.organization` | CASCADE | ownership |
| `Automation.organization` | CASCADE | ownership |
| `Automation.dataset` | **PROTECT** | can't delete a dataset an automation watches |
| every `created_by` / `updated_by` | SET_NULL | keep the row, drop the author link |

> ⚠️ Because `Widget.dataset` / `Automation.dataset` are `PROTECT`, full tenant deletion is a deliberate, ordered **service operation** (widgets/automations → datasets → org), not a naive `organization.delete()`. See ADR-0009.

## Not modeled yet (future ADRs)

- Fine-grained per-module permissions (plan's `Role` table with JSON permissions) — deferred to Phase 4 (ADR-0004).
- Soft delete (`deleted_at`) — deferred (ADR-0005).
- `Report` ↔ `Dataset` link — additive if needed later (ADR-0006).
- "Current organization" resolution mechanism (header / subdomain / session) — API-design phase (ADR-0004).
