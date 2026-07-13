"""Unit tests for the Excel import service (broker-free, no HTTP)."""

import datetime
from io import BytesIO

import pandas as pd
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import Workbook

from apps.datasets.models import DatasetField, DatasetRow, ImportJob
from apps.datasets.services.import_service import WorkbookImportError, import_workbook
from apps.datasets.tests.factories import DatasetFactory

_XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _workbook_bytes(frame: pd.DataFrame) -> bytes:
    """Serialize a dataframe to real ``.xlsx`` bytes on the first sheet."""
    buffer = BytesIO()
    frame.to_excel(buffer, index=False, engine="openpyxl")
    return buffer.getvalue()


def _raw_workbook_bytes(rows: list[list[object]]) -> bytes:
    """Build ``.xlsx`` bytes from raw cell rows (for headerless/empty layouts)."""
    workbook = Workbook()
    sheet = workbook.active
    for row in rows:
        sheet.append(row)
    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _job_from_bytes(dataset, content: bytes) -> ImportJob:
    """Attach arbitrary uploaded bytes to a fresh import job."""
    upload = SimpleUploadedFile("import.xlsx", content, content_type=_XLSX_CONTENT_TYPE)
    return ImportJob.objects.create(
        dataset=dataset,
        organization=dataset.organization,
        file=upload,
    )


def _import_job_for(dataset, frame: pd.DataFrame) -> ImportJob:
    """Attach a workbook built from ``frame`` to a fresh import job."""
    return _job_from_bytes(dataset, _workbook_bytes(frame))


@pytest.fixture
def typed_frame() -> pd.DataFrame:
    """A dataframe covering each inferable column type plus a missing cell."""
    return pd.DataFrame(
        {
            "Region": ["North", "South", None],
            "Units Sold": [10, 20, 30],
            "Price": [1.5, 2.5, 3.5],
            "Active": [True, False, True],
            "Sold On": pd.to_datetime(["2026-01-01", "2026-02-15", "2026-03-30"]),
        }
    )


@pytest.mark.django_db
def test_infers_field_types_and_normalizes_keys(typed_frame):
    dataset = DatasetFactory()
    job = _import_job_for(dataset, typed_frame)

    import_workbook(job)

    fields = {field.key: field for field in dataset.fields.all()}
    assert set(fields) == {"region", "units_sold", "price", "active", "sold_on"}
    assert fields["region"].field_type == DatasetField.FieldType.TEXT
    assert fields["units_sold"].field_type == DatasetField.FieldType.NUMBER
    assert fields["price"].field_type == DatasetField.FieldType.NUMBER
    assert fields["active"].field_type == DatasetField.FieldType.BOOLEAN
    assert fields["sold_on"].field_type == DatasetField.FieldType.DATE
    assert fields["units_sold"].label == "Units Sold"


@pytest.mark.django_db
def test_returns_row_count_and_creates_rows(typed_frame):
    dataset = DatasetFactory()
    job = _import_job_for(dataset, typed_frame)

    created = import_workbook(job)

    assert created == 3
    assert dataset.rows.count() == 3


@pytest.mark.django_db
def test_row_values_are_json_typed_and_roundtrip(typed_frame):
    dataset = DatasetFactory()
    job = _import_job_for(dataset, typed_frame)

    import_workbook(job)

    rows = list(dataset.rows.order_by("created_at"))
    first = rows[0].data
    assert first["units_sold"] == 10
    assert isinstance(first["units_sold"], int)
    assert first["price"] == 1.5
    assert isinstance(first["price"], float)
    assert first["active"] is True
    assert first["sold_on"] == "2026-01-01T00:00:00"
    assert isinstance(first["sold_on"], str)
    # The missing region cell on the third row becomes JSON null.
    assert rows[2].data["region"] is None
    # Re-fetch from the DB to prove the JSON encoder accepted every value.
    reloaded = DatasetRow.objects.get(pk=rows[0].pk)
    assert reloaded.data == first


@pytest.mark.django_db
def test_fields_and_rows_share_dataset_organization(typed_frame):
    dataset = DatasetFactory()
    job = _import_job_for(dataset, typed_frame)

    import_workbook(job)

    assert not dataset.fields.exclude(organization=dataset.organization).exists()
    assert not dataset.rows.exclude(organization=dataset.organization).exists()


@pytest.mark.django_db
def test_header_only_sheet_creates_fields_but_no_rows():
    dataset = DatasetFactory()
    frame = pd.DataFrame({"Region": [], "Price": []})
    job = _import_job_for(dataset, frame)

    created = import_workbook(job)

    assert created == 0
    assert dataset.rows.count() == 0
    assert set(dataset.fields.values_list("key", flat=True)) == {"region", "price"}


@pytest.mark.django_db
def test_rerun_appends_rows_without_duplicating_fields(typed_frame):
    dataset = DatasetFactory()
    first_job = _import_job_for(dataset, typed_frame)
    second_job = _import_job_for(dataset, typed_frame)

    import_workbook(first_job)
    import_workbook(second_job)

    assert dataset.rows.count() == 6
    assert dataset.fields.count() == 5


@pytest.mark.django_db
def test_duplicate_and_empty_headers_are_disambiguated():
    dataset = DatasetFactory()
    # On read-back pandas renames the second "Amount" to "Amount.1" and the blank
    # header to "Unnamed: 2"; every resulting key must still be distinct.
    frame = pd.DataFrame(
        [[1, 2, 3]],
        columns=["Amount", "Amount", ""],
    )
    job = _import_job_for(dataset, frame)

    import_workbook(job)

    keys = set(dataset.fields.values_list("key", flat=True))
    assert "amount" in keys
    # No two fields share a key on the same dataset.
    assert len(keys) == 3
    assert dataset.fields.count() == len(keys)


@pytest.mark.django_db
def test_headers_that_normalize_to_the_same_key_get_a_suffix():
    dataset = DatasetFactory()
    # Distinct headers that collapse to the same normalized key must not collide.
    frame = pd.DataFrame([[1, 2]], columns=["Amount", "Amount!"])
    job = _import_job_for(dataset, frame)

    import_workbook(job)

    keys = set(dataset.fields.values_list("key", flat=True))
    assert keys == {"amount", "amount_2"}


@pytest.mark.django_db
def test_all_empty_column_infers_text_and_serializes_null():
    dataset = DatasetFactory()
    frame = pd.DataFrame({"Region": ["North", "South"], "Notes": [None, None]})
    job = _import_job_for(dataset, frame)

    import_workbook(job)

    notes = dataset.fields.get(key="notes")
    assert notes.field_type == DatasetField.FieldType.TEXT
    assert dataset.rows.count() == 2
    assert all(row.data["notes"] is None for row in dataset.rows.all())


@pytest.mark.django_db
def test_date_only_values_serialize_as_iso_strings():
    dataset = DatasetFactory()
    frame = pd.DataFrame({"Day": [datetime.date(2026, 7, 7)]})
    job = _import_job_for(dataset, frame)

    import_workbook(job)

    row = dataset.rows.get()
    assert row.data["day"] == "2026-07-07T00:00:00"


@pytest.mark.django_db
def test_fully_blank_rows_are_skipped():
    dataset = DatasetFactory()
    frame = pd.DataFrame({"Region": ["North", None, "South"], "Units": [10, None, 20]})
    job = _import_job_for(dataset, frame)

    created = import_workbook(job)

    assert created == 2
    assert {row.data["region"] for row in dataset.rows.all()} == {"North", "South"}


@pytest.mark.django_db
def test_unnamed_empty_columns_are_dropped():
    dataset = DatasetFactory()
    job = _job_from_bytes(
        dataset,
        _raw_workbook_bytes(
            [
                ["Region", None, "Units"],
                ["North", None, 10],
                ["South", None, 20],
            ]
        ),
    )

    import_workbook(job)

    assert set(dataset.fields.values_list("key", flat=True)) == {"region", "units"}


@pytest.mark.django_db
def test_unreadable_file_raises_a_friendly_error():
    dataset = DatasetFactory()
    job = _job_from_bytes(dataset, b"this is not an excel workbook")

    with pytest.raises(WorkbookImportError) as exc_info:
        import_workbook(job)

    assert "Excel" in str(exc_info.value)
    assert dataset.fields.count() == 0
    assert dataset.rows.count() == 0


@pytest.mark.django_db
def test_empty_sheet_raises_a_friendly_error():
    dataset = DatasetFactory()
    job = _job_from_bytes(dataset, _raw_workbook_bytes([]))

    with pytest.raises(WorkbookImportError) as exc_info:
        import_workbook(job)

    assert "column" in str(exc_info.value).lower()
    assert dataset.rows.count() == 0


@pytest.mark.django_db
def test_process_import_job_records_the_friendly_message():
    from apps.datasets.tasks import process_import_job

    dataset = DatasetFactory()
    job = _job_from_bytes(dataset, b"definitely not a workbook")

    process_import_job(str(job.pk))

    job.refresh_from_db()
    assert job.status == ImportJob.Status.ERROR
    assert "Excel" in job.errors["detail"]
