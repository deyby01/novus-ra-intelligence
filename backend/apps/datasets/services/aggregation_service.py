"""Aggregate a dataset's JSONB rows inside PostgreSQL for dashboard widgets.

This is a plain service: it depends only on models and the ORM, never on DRF.
The database performs the grouping and aggregation; rows are never scanned in
Python.
"""

from django.db.models import (
    Aggregate,
    Avg,
    Case,
    CharField,
    Count,
    FloatField,
    Func,
    Max,
    Min,
    Sum,
    Value,
    When,
)
from django.db.models.fields.json import KeyTextTransform, KeyTransform
from django.db.models.functions import Cast
from django.db.models.lookups import Exact

from apps.datasets.models import Dataset, DatasetRow

MAX_GROUPS = 1000


class JSONBTypeof(Func):
    """Expose PostgreSQL's ``jsonb_typeof`` to classify a JSON value's type."""

    function = "jsonb_typeof"
    output_field = CharField()


_METRIC_AGGREGATES: dict[str, type[Aggregate]] = {
    "sum": Sum,
    "avg": Avg,
    "min": Min,
    "max": Max,
}

AGGREGATIONS = ("count", *_METRIC_AGGREGATES)


def aggregate_dataset(
    dataset: Dataset,
    aggregation: str,
    metric_key: str | None = None,
    group_by_key: str | None = None,
) -> list[dict[str, object]]:
    """Aggregate the dataset's rows, optionally grouped by a field key.

    ``count`` counts rows; every other aggregation casts the metric key's JSON
    value to a float and lets PostgreSQL ignore null cells. Grouped results are
    ordered by group and capped as a response-size guard.

    Args:
        dataset: The dataset whose rows are aggregated.
        aggregation: One of :data:`AGGREGATIONS`.
        metric_key: The field key to aggregate; unused for ``count``.
        group_by_key: The field key to group by, or ``None`` for a single total.

    Returns:
        A list of ``{"group", "value"}`` entries — exactly one, with ``group``
        ``None``, when no grouping is requested.
    """
    if aggregation == "count":
        expression = Count("id")
    else:
        # Guard the float cast with jsonb_typeof so a text cell in a number
        # field aggregates as NULL instead of raising a database error.
        is_json_number = Exact(JSONBTypeof(KeyTransform(metric_key, "data")), Value("number"))
        numeric_value = Case(
            When(
                is_json_number,
                then=Cast(KeyTextTransform(metric_key, "data"), FloatField()),
            ),
            default=None,
            output_field=FloatField(),
        )
        expression = _METRIC_AGGREGATES[aggregation](numeric_value)

    queryset = DatasetRow.objects.filter(dataset=dataset)
    if group_by_key is None:
        return [{"group": None, "value": queryset.aggregate(value=expression)["value"]}]

    grouped = (
        queryset.annotate(group=KeyTextTransform(group_by_key, "data"))
        .values("group")
        .annotate(value=expression)
        .order_by("group")[:MAX_GROUPS]
    )
    return [{"group": entry["group"], "value": entry["value"]} for entry in grouped]
