"""Deterministically derive a dataset's read-only overview of chart/KPI widgets.

Given a dataset's inferred schema this builds a small, stable set of widget specs
— KPIs, a bar, a pie, a line — each carrying its aggregation results embedded.
Pure service: models, the ORM, and the aggregation service only; no DRF, and
nothing is persisted (the overview is ephemeral).
"""

from django.utils import timezone

from apps.datasets.models import Dataset, DatasetField
from apps.datasets.services.aggregation_service import aggregate_dataset

MAX_METRIC_KPIS = 3
MAX_BAR_GROUPS = 12
MAX_PIE_GROUPS = 6

_CATEGORICAL_TYPES = frozenset(
    {
        DatasetField.FieldType.TEXT,
        DatasetField.FieldType.BOOLEAN,
        DatasetField.FieldType.SELECT,
    }
)


def _widget(
    dataset: Dataset,
    *,
    chart_type: str,
    agg: str,
    title: str,
    size: str,
    metric: str | None = None,
    group_by: str | None = None,
    bucket: str | None = None,
) -> dict:
    """Build one widget spec, embedding the aggregation results for it."""
    config: dict[str, object] = {
        "agg": agg,
        "metric": metric,
        "group_by": group_by,
        "title": title,
        "size": size,
    }
    if bucket is not None:
        config["bucket"] = bucket
    results = aggregate_dataset(
        dataset,
        aggregation=agg,
        metric_key=metric,
        group_by_key=group_by,
        bucket=bucket,
    )
    return {
        "chart_type": chart_type,
        "config": config,
        "aggregation": agg,
        "metric": metric,
        "group_by": group_by,
        "results": results,
    }


def _field_cardinality(dataset: Dataset, key: str) -> int:
    """Count a field's distinct groups by reusing the aggregation service."""
    return len(aggregate_dataset(dataset, "count", group_by_key=key))


def _is_chartable(cardinality: int, row_count: int, max_groups: int) -> bool:
    """Report whether a categorical field is a good grouping dimension.

    Rejects constant/empty fields, fields with too many groups for the chart,
    and identifier-like columns whose values are (nearly) unique per row.
    """
    if not 2 <= cardinality <= max_groups:
        return False
    return cardinality < row_count


def build_dataset_overview(dataset: Dataset) -> dict:
    """Derive a deterministic set of overview widgets for a dataset.

    The same schema and rows always yield the same specs. Returns a headline
    summary plus a small list of widget specs (KPIs, an optional bar, pie, and
    line) with each widget's aggregation results embedded. An empty dataset
    yields a headline and no widgets.
    """
    row_count = dataset.rows.count()
    fields = list(dataset.fields.order_by("order", "id"))
    number_fields = [f for f in fields if f.field_type == DatasetField.FieldType.NUMBER]

    headline = {
        "row_count": row_count,
        "field_count": len(fields),
        "numeric_field_count": len(number_fields),
        "generated_at": timezone.now().isoformat(),
    }
    if row_count == 0:
        return {"headline": headline, "widgets": []}

    categorical_fields = [f for f in fields if f.field_type in _CATEGORICAL_TYPES]
    date_fields = [f for f in fields if f.field_type == DatasetField.FieldType.DATE]
    metric_field = number_fields[0] if number_fields else None
    cardinalities = {f.key: _field_cardinality(dataset, f.key) for f in categorical_fields}

    widgets: list[dict] = [
        _widget(
            dataset,
            chart_type="kpi",
            agg="count",
            title="Total records",
            size="small",
        )
    ]
    if metric_field is not None:
        widgets.append(
            _widget(
                dataset,
                chart_type="kpi",
                agg="avg",
                metric=metric_field.key,
                title=f"Average {metric_field.label}",
                size="small",
            )
        )
    for field in number_fields[:MAX_METRIC_KPIS]:
        widgets.append(
            _widget(
                dataset,
                chart_type="kpi",
                agg="sum",
                metric=field.key,
                title=f"Sum of {field.label}",
                size="small",
            )
        )

    bar_group_by: str | None = None
    for field in categorical_fields:
        if _is_chartable(cardinalities[field.key], row_count, MAX_BAR_GROUPS):
            if metric_field is not None:
                agg, metric = "sum", metric_field.key
                title = f"Sum of {metric_field.label} by {field.label}"
            else:
                agg, metric = "count", None
                title = f"Count by {field.label}"
            widgets.append(
                _widget(
                    dataset,
                    chart_type="bar",
                    agg=agg,
                    metric=metric,
                    group_by=field.key,
                    title=title,
                    size="medium",
                )
            )
            bar_group_by = field.key
            break

    for field in categorical_fields:
        if field.key == bar_group_by:
            continue
        if _is_chartable(cardinalities[field.key], row_count, MAX_PIE_GROUPS):
            widgets.append(
                _widget(
                    dataset,
                    chart_type="pie",
                    agg="count",
                    group_by=field.key,
                    title=f"Share by {field.label}",
                    size="medium",
                )
            )
            break

    if date_fields:
        date_field = date_fields[0]
        if metric_field is not None:
            agg, metric = "sum", metric_field.key
            title = f"Sum of {metric_field.label} by month"
        else:
            agg, metric = "count", None
            title = "Records by month"
        widgets.append(
            _widget(
                dataset,
                chart_type="line",
                agg=agg,
                metric=metric,
                group_by=date_field.key,
                title=title,
                size="large",
                bucket="month",
            )
        )

    return {"headline": headline, "widgets": widgets}
