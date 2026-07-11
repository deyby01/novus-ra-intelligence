"""Unit tests for the aggregation service's month-bucket grouping."""

import pytest

from apps.datasets.models import DatasetField
from apps.datasets.services.aggregation_service import aggregate_dataset
from apps.datasets.tests.factories import (
    DatasetFactory,
    DatasetFieldFactory,
    DatasetRowFactory,
)


@pytest.mark.django_db
def test_month_bucket_collapses_rows_in_the_same_month():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="sold_at",
        field_type=DatasetField.FieldType.DATE,
    )
    for sold_at in (
        "2026-01-05T00:00:00",
        "2026-01-20T00:00:00",
        "2026-02-03T00:00:00",
    ):
        DatasetRowFactory(dataset=dataset, data={"sold_at": sold_at})

    results = aggregate_dataset(dataset, "count", group_by_key="sold_at", bucket="month")

    assert results == [
        {"group": "2026-01", "value": 2},
        {"group": "2026-02", "value": 1},
    ]


@pytest.mark.django_db
def test_month_bucket_sums_metric_per_month():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="sold_at",
        field_type=DatasetField.FieldType.DATE,
    )
    DatasetFieldFactory(
        dataset=dataset,
        key="units",
        field_type=DatasetField.FieldType.NUMBER,
    )
    rows = [
        {"sold_at": "2026-01-05T00:00:00", "units": 10},
        {"sold_at": "2026-01-20T00:00:00", "units": 5},
        {"sold_at": "2026-02-03T00:00:00", "units": 7},
    ]
    for data in rows:
        DatasetRowFactory(dataset=dataset, data=data)

    results = aggregate_dataset(
        dataset,
        "sum",
        metric_key="units",
        group_by_key="sold_at",
        bucket="month",
    )

    assert results == [
        {"group": "2026-01", "value": 15.0},
        {"group": "2026-02", "value": 7.0},
    ]


@pytest.mark.django_db
def test_bucket_none_keeps_raw_group_values():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="sold_at",
        field_type=DatasetField.FieldType.DATE,
    )
    for sold_at in ("2026-01-05T00:00:00", "2026-01-20T00:00:00"):
        DatasetRowFactory(dataset=dataset, data={"sold_at": sold_at})

    results = aggregate_dataset(dataset, "count", group_by_key="sold_at")

    assert results == [
        {"group": "2026-01-05T00:00:00", "value": 1},
        {"group": "2026-01-20T00:00:00", "value": 1},
    ]
