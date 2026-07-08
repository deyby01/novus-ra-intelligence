"""Parse an uploaded Excel workbook into a dataset's fields and rows.

This is a plain service: it depends only on models and third-party parsing
libraries, never on DRF, views, or serializers. The Celery task is a thin
wrapper that loads the job and calls :func:`import_workbook`.
"""

import datetime
import re

import pandas as pd
from django.db import transaction
from pandas.api import types as pdt

from apps.datasets.models import DatasetField, DatasetRow, ImportJob

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def import_workbook(import_job: ImportJob) -> int:
    """Parse the job's Excel file into its dataset and return rows created.

    Reads the first sheet only (the first row is the header), infers a field
    type per column, upserts the dataset's fields, and appends one row per data
    line as a JSON document. The field upsert and row load run in a single
    transaction so a mid-file failure leaves no half-written dataset.

    Args:
        import_job: The job whose ``file`` is parsed into its ``dataset``.

    Returns:
        The number of :class:`~apps.datasets.models.DatasetRow` rows created.
    """
    dataset = import_job.dataset
    organization = dataset.organization

    with import_job.file.open("rb") as handle:
        frame = pd.read_excel(handle, sheet_name=0, engine="openpyxl")

    columns = _resolve_columns(frame)

    with transaction.atomic():
        for order, column in enumerate(columns):
            DatasetField.objects.get_or_create(
                dataset=dataset,
                key=column["key"],
                defaults={
                    "organization": organization,
                    "label": column["label"],
                    "field_type": column["field_type"],
                    "order": order,
                },
            )
        rows = [
            DatasetRow(
                dataset=dataset,
                organization=organization,
                data={column["key"]: _to_jsonable(record[column["source"]]) for column in columns},
            )
            for record in frame.to_dict(orient="records")
        ]
        DatasetRow.objects.bulk_create(rows)

    return len(rows)


def _resolve_columns(frame: pd.DataFrame) -> list[dict[str, object]]:
    """Build a normalized column descriptor list from the frame's headers.

    Each descriptor carries the original ``source`` header (to read cells), the
    normalized ``key``, the original ``label``, and the inferred ``field_type``.
    Blank and duplicate headers are disambiguated deterministically with a
    numeric suffix so every key on the dataset stays unique.
    """
    columns: list[dict[str, object]] = []
    seen: dict[str, int] = {}
    for source in frame.columns:
        label = _header_label(source)
        base_key = _normalize_key(label) or "column"
        key = _deduplicate(base_key, seen)
        columns.append(
            {
                "source": source,
                "key": key,
                "label": label,
                "field_type": _infer_field_type(frame[source]),
            }
        )
    return columns


def _header_label(source: object) -> str:
    """Return a display label for a header, blanking pandas' unnamed markers."""
    text = str(source).strip()
    if not text or text.startswith("Unnamed:"):
        return ""
    return text


def _normalize_key(label: str) -> str:
    """Lowercase a header and collapse non-alphanumeric runs to single ``_``."""
    return _NON_ALNUM.sub("_", label.lower()).strip("_")


def _deduplicate(base_key: str, seen: dict[str, int]) -> str:
    """Suffix repeated keys (``amount`` -> ``amount_2``) to keep them unique."""
    count = seen.get(base_key, 0) + 1
    seen[base_key] = count
    if count == 1:
        return base_key
    return f"{base_key}_{count}"


def _infer_field_type(series: pd.Series) -> str:
    """Map a column's pandas dtype to a :class:`DatasetField.FieldType`.

    A column with no values carries no type signal, so it defaults to text
    rather than the numeric type an all-empty column reads back as.
    """
    if series.dropna().empty:
        return DatasetField.FieldType.TEXT
    if pdt.is_bool_dtype(series):
        return DatasetField.FieldType.BOOLEAN
    if pdt.is_datetime64_any_dtype(series):
        return DatasetField.FieldType.DATE
    if pdt.is_numeric_dtype(series):
        return DatasetField.FieldType.NUMBER
    return DatasetField.FieldType.TEXT


def _to_jsonable(value: object) -> object:
    """Convert a pandas/numpy cell to a natively JSON-serializable value.

    Missing values become ``None``; numpy scalars unwrap to Python primitives;
    dates and datetimes become ISO-8601 strings. Everything else passes through.
    """
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    if hasattr(value, "item"):
        return value.item()
    return value
