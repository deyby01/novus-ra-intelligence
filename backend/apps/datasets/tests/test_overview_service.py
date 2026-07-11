"""Unit tests for the deterministic dataset overview engine."""

import pytest

from apps.datasets.models import DatasetField
from apps.datasets.services.overview_service import (
    MAX_METRIC_KPIS,
    build_dataset_overview,
)
from apps.datasets.tests.factories import (
    DatasetFactory,
    DatasetFieldFactory,
    DatasetRowFactory,
)


def _kpis(overview: dict) -> list[dict]:
    return [w for w in overview["widgets"] if w["chart_type"] == "kpi"]


@pytest.mark.django_db
def test_numeric_dataset_emits_count_sum_and_avg_kpis():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="units",
        label="Units",
        field_type=DatasetField.FieldType.NUMBER,
    )
    for value in (10, 5, 7):
        DatasetRowFactory(dataset=dataset, data={"units": value})

    overview = build_dataset_overview(dataset)

    kpis = _kpis(overview)
    titles = {w["config"]["title"] for w in kpis}
    aggs = {w["config"]["agg"] for w in kpis}
    assert "Total records" in titles
    assert "Sum of Units" in titles
    assert "Average Units" in titles
    assert {"count", "sum", "avg"} <= aggs

    count_kpi = next(w for w in kpis if w["config"]["agg"] == "count")
    assert count_kpi["results"] == [{"group": None, "value": 3}]


@pytest.mark.django_db
def test_low_cardinality_text_becomes_bar_grouped_by_it():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="region",
        label="Region",
        field_type=DatasetField.FieldType.TEXT,
    )
    DatasetFieldFactory(
        dataset=dataset,
        key="units",
        label="Units",
        field_type=DatasetField.FieldType.NUMBER,
    )
    rows = [
        {"region": "North", "units": 10},
        {"region": "North", "units": 5},
        {"region": "South", "units": 7},
        {"region": "South", "units": 3},
    ]
    for data in rows:
        DatasetRowFactory(dataset=dataset, data=data)

    overview = build_dataset_overview(dataset)

    bars = [w for w in overview["widgets"] if w["chart_type"] == "bar"]
    assert len(bars) == 1
    bar = bars[0]
    assert bar["group_by"] == "region"
    assert bar["config"]["group_by"] == "region"
    assert bar["config"]["agg"] == "sum"
    assert bar["metric"] == "units"
    assert {r["group"] for r in bar["results"]} == {"North", "South"}


@pytest.mark.django_db
def test_categorical_without_numbers_yields_count_bar():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="region",
        label="Region",
        field_type=DatasetField.FieldType.TEXT,
    )
    for region in ("North", "North", "South", "East"):
        DatasetRowFactory(dataset=dataset, data={"region": region})

    overview = build_dataset_overview(dataset)

    bar = next(w for w in overview["widgets"] if w["chart_type"] == "bar")
    assert bar["config"]["agg"] == "count"
    assert bar["metric"] is None
    assert bar["group_by"] == "region"


@pytest.mark.django_db
def test_second_categorical_becomes_pie():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="region",
        label="Region",
        field_type=DatasetField.FieldType.TEXT,
    )
    DatasetFieldFactory(
        dataset=dataset,
        key="channel",
        label="Channel",
        field_type=DatasetField.FieldType.SELECT,
    )
    rows = [
        {"region": "North", "channel": "online"},
        {"region": "North", "channel": "store"},
        {"region": "South", "channel": "online"},
        {"region": "South", "channel": "store"},
    ]
    for data in rows:
        DatasetRowFactory(dataset=dataset, data=data)

    overview = build_dataset_overview(dataset)

    bar = next(w for w in overview["widgets"] if w["chart_type"] == "bar")
    pie = next(w for w in overview["widgets"] if w["chart_type"] == "pie")
    assert bar["group_by"] == "region"
    assert pie["group_by"] == "channel"
    assert pie["config"]["agg"] == "count"


@pytest.mark.django_db
def test_identifier_like_text_is_not_grouped_by():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="name",
        label="Name",
        field_type=DatasetField.FieldType.TEXT,
    )
    for index in range(6):
        DatasetRowFactory(dataset=dataset, data={"name": f"unique-{index}"})

    overview = build_dataset_overview(dataset)

    group_bys = {w["group_by"] for w in overview["widgets"]}
    assert "name" not in group_bys
    assert all(w["chart_type"] not in {"bar", "pie"} for w in overview["widgets"])


@pytest.mark.django_db
def test_date_field_emits_monthly_line():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="sold_at",
        label="Sold At",
        field_type=DatasetField.FieldType.DATE,
    )
    DatasetFieldFactory(
        dataset=dataset,
        key="units",
        label="Units",
        field_type=DatasetField.FieldType.NUMBER,
    )
    rows = [
        {"sold_at": "2026-01-05T00:00:00", "units": 10},
        {"sold_at": "2026-01-20T00:00:00", "units": 5},
        {"sold_at": "2026-02-03T00:00:00", "units": 7},
    ]
    for data in rows:
        DatasetRowFactory(dataset=dataset, data=data)

    overview = build_dataset_overview(dataset)

    line = next(w for w in overview["widgets"] if w["chart_type"] == "line")
    assert line["group_by"] == "sold_at"
    assert line["config"]["bucket"] == "month"
    assert {r["group"] for r in line["results"]} == {"2026-01", "2026-02"}


@pytest.mark.django_db
def test_empty_dataset_has_headline_but_no_widgets():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="units",
        field_type=DatasetField.FieldType.NUMBER,
    )

    overview = build_dataset_overview(dataset)

    assert overview["widgets"] == []
    assert overview["headline"]["row_count"] == 0
    assert overview["headline"]["field_count"] == 1
    assert "generated_at" in overview["headline"]


@pytest.mark.django_db
def test_sum_kpis_are_capped_at_max_metric_kpis():
    dataset = DatasetFactory()
    for index in range(MAX_METRIC_KPIS + 2):
        DatasetFieldFactory(
            dataset=dataset,
            key=f"n{index}",
            label=f"N{index}",
            field_type=DatasetField.FieldType.NUMBER,
        )
    DatasetRowFactory(
        dataset=dataset,
        data={f"n{index}": index for index in range(MAX_METRIC_KPIS + 2)},
    )

    overview = build_dataset_overview(dataset)

    sum_kpis = [
        w for w in overview["widgets"] if w["chart_type"] == "kpi" and w["config"]["agg"] == "sum"
    ]
    assert len(sum_kpis) <= MAX_METRIC_KPIS


@pytest.mark.django_db
def test_every_widget_has_results_and_config():
    dataset = DatasetFactory()
    DatasetFieldFactory(
        dataset=dataset,
        key="region",
        label="Region",
        field_type=DatasetField.FieldType.TEXT,
    )
    DatasetFieldFactory(
        dataset=dataset,
        key="units",
        label="Units",
        field_type=DatasetField.FieldType.NUMBER,
    )
    DatasetFieldFactory(
        dataset=dataset,
        key="sold_at",
        label="Sold At",
        field_type=DatasetField.FieldType.DATE,
    )
    rows = [
        {"region": "North", "units": 10, "sold_at": "2026-01-05T00:00:00"},
        {"region": "South", "units": 5, "sold_at": "2026-02-05T00:00:00"},
    ]
    for data in rows:
        DatasetRowFactory(dataset=dataset, data=data)

    overview = build_dataset_overview(dataset)

    assert overview["widgets"]
    for widget in overview["widgets"]:
        assert isinstance(widget["results"], list)
        config = widget["config"]
        assert "agg" in config
        assert "title" in config
        assert "size" in config
