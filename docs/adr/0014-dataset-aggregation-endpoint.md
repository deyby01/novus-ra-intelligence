# ADR-0014 — Dataset aggregation endpoint for dashboard widgets

- **Status:** accepted
- **Date:** 2026-07-08

## Context

Phase 1's milestone is "upload a real Excel file and see its dashboard". Widgets
(KPI, bar, line) need aggregated data — a total, or a metric grouped by a
column. Rows live as JSONB documents (`DatasetRow.data`, ADR-0007) with a
GIN index (ADR-0008), and the schema is dynamic per dataset (`DatasetField`).
Aggregating in the frontend would require shipping every row to the browser,
which breaks pagination and tenant-scale performance; the database must do the
work.

## Decision

A read-only **`GET /api/v1/datasets/{id}/aggregate/`** action on the existing
`DatasetViewSet`, backed by a plain **service** that pushes the aggregation
into PostgreSQL over the JSONB column.

**Query contract.**

| Param | Required | Values |
|---|---|---|
| `agg` | yes | `count`, `sum`, `avg`, `min`, `max` |
| `metric` | for every `agg` except `count` | a `DatasetField.key` of the dataset with `field_type=number` |
| `group_by` | no | any `DatasetField.key` of the dataset |

**Response contract (uniform for KPI and charts).**

```json
{
  "aggregation": "sum",
  "metric": "units",
  "group_by": "region",
  "results": [{"group": "North", "value": 105.0}]
}
```

Without `group_by` the response has exactly one entry with `"group": null` —
the KPI case. The frontend therefore needs a single parser for every widget
type.

**Validation (serializer layer).** `agg` must be a known aggregation;
`metric`/`group_by` must name fields that exist **on this dataset** (unknown
keys → 400, never a silent empty result); `sum/avg/min/max` require a
`number` metric field. Validation reads `DatasetField`, so the dynamic schema
stays the single source of truth.

**Execution (service layer, `services/aggregation_service.py`).** The metric
value is extracted with `KeyTextTransform` and `Cast` to a float; grouping uses
the key's text value. SQL `GROUP BY` + aggregate functions run in PostgreSQL —
no Python-side row scanning. PostgreSQL aggregates ignore JSON `null` cells
natively (`count` counts rows, not non-null metric values). Results are ordered
by group for deterministic output, and the group list is capped at **1000
buckets** as a response-size guard.

**Tenancy.** The action rides `DatasetViewSet.get_object()`, which is already
scoped by `TenantQuerysetMixin`, so a foreign dataset id 404s before any
aggregation runs.

## Consequences

- (+) One endpoint serves KPI, bar, and line widgets with a uniform shape.
- (+) The database aggregates; rows never stream to the app or the browser.
- (+) Schema-validated params mean typos surface as 400s, not empty charts.
- (−) Casting JSONB text to float at query time can't use the GIN index
  (it's for containment, not math); acceptable at MVP scale, revisit with
  materialized stats if datasets grow.
- (−) Non-numeric garbage in a `number` field would break the cast;
  the importer types columns and the row editor coerces, so this is
  defense-covered at write time.
- (−) Date bucketing (day/week/month) is not in this contract; line charts
  group by the raw ISO date string (which sorts correctly). Bucketing is
  deferred until a real widget needs it.

## Alternatives considered

- **Aggregate in the frontend.** Ships unbounded rows to the browser; breaks
  at any real scale. Rejected.
- **A standalone `/aggregations/` resource.** The aggregation is a *view of a
  dataset*, not a resource with identity; a detail action keeps tenancy and
  routing free. Rejected.
- **Widget-config-driven server rendering (store the query on a Widget model
  first).** Widgets will store their config later, but the aggregation
  contract is independent of storage and unblocks the frontend now. Deferred,
  not rejected.
- **Raw SQL.** The ORM (`KeyTextTransform` + `Cast` + `annotate`) expresses
  this fully and stays injection-safe by construction. Rejected.
