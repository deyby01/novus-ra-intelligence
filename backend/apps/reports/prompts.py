"""Prompt construction for AI-generated dataset reports.

Pure, network-free helpers: given a Dataset, a DataFrame of its rows and the
ordered field definitions, produce a rich Markdown statistical summary and the
final senior-analyst prompt. Everything here is defensive so odd data (empty,
all-null, single-row, non-numeric junk in a number column) never raises.
"""

from collections.abc import Iterable

import pandas as pd

from apps.datasets.models import Dataset, DatasetField

_MAX_SAMPLE_ROWS = 5
_MAX_TOP_VALUES = 5
_MAX_CORRELATIONS = 5
_CORRELATION_THRESHOLD = 0.3
_MAX_CELL_LEN = 60

_Column = tuple[str, str, str]


def build_analysis_prompt(
    dataset: Dataset,
    df: pd.DataFrame,
    fields: Iterable[DatasetField],
) -> str:
    """Compose the senior-analyst prompt around a Markdown summary of the data."""
    summary = build_dataset_summary(dataset, df, list(fields))
    return (
        "You are a senior business intelligence analyst preparing an "
        "executive-ready report.\n"
        "Analyze the dataset summarized below and write a professional, "
        "insight-dense report in Markdown.\n\n"
        f"{summary}\n\n"
        "# Your task\n"
        "Write the report using these Markdown sections (use `##` headings):\n"
        "1. Executive Summary — 2–4 sentences on the single most important "
        "takeaway.\n"
        "2. Key Metrics — the most important figures as a compact Markdown "
        "table.\n"
        "3. Trends & Patterns — what the distributions and correlations "
        "reveal.\n"
        "4. Segment Breakdown — notable differences across the main "
        "categorical dimension(s).\n"
        "5. Anomalies & Data Quality — outliers, missing data, or "
        "inconsistencies worth attention.\n"
        "6. Recommendations — 3–5 concrete, prioritized actions grounded in "
        "the data.\n\n"
        "Rules:\n"
        "- Ground EVERY statement in the statistics provided above; never "
        "invent numbers or facts.\n"
        '- Cite concrete values when making a claim (e.g. "an average of 115 '
        'units across 4 rows").\n'
        "- If the dataset is too small or a section lacks support, say so "
        "briefly instead of padding.\n"
        "- Be concise and skimmable: short paragraphs, bullet points, and "
        "bold the key figures."
    )


def build_dataset_summary(
    dataset: Dataset,
    df: pd.DataFrame,
    fields: list[DatasetField],
) -> str:
    """Build the Markdown statistical summary the model reasons over."""
    columns = _resolve_columns(df, fields)
    parts = [
        _header_section(dataset, df, columns),
        _catalog_section(columns),
        _statistics_section(df, columns),
    ]
    correlations = _correlations_section(df, columns)
    if correlations:
        parts.append(correlations)
    parts.append(_sample_section(df, columns))
    return "\n\n".join(part for part in parts if part)


def _resolve_columns(df: pd.DataFrame, fields: list[DatasetField]) -> list[_Column]:
    """Merge declared fields with any undeclared DataFrame columns (inferred type)."""
    columns: list[_Column] = []
    seen: set[str] = set()
    for field in fields:
        columns.append((field.key, field.label, str(field.field_type)))
        seen.add(field.key)
    for col in df.columns:
        name = str(col)
        if name in seen:
            continue
        inferred = (
            DatasetField.FieldType.NUMBER
            if pd.api.types.is_numeric_dtype(df[col])
            else DatasetField.FieldType.TEXT
        )
        columns.append((name, name, str(inferred)))
        seen.add(name)
    return columns


def _header_section(dataset: Dataset, df: pd.DataFrame, columns: list[_Column]) -> str:
    """Dataset name, description, and shape."""
    description = (dataset.description or "").strip() or "—"
    return (
        "# Dataset summary\n"
        f"**Name:** {dataset.name}\n"
        f"**Description:** {description}\n"
        f"**Total rows:** {len(df)}\n"
        f"**Total columns:** {len(columns)}"
    )


def _catalog_section(columns: list[_Column]) -> str:
    """List every column as `key — label (type)`."""
    lines = ["## Column catalog"]
    lines.extend(f"- {key} — {label} ({ftype})" for key, label, ftype in columns)
    return "\n".join(lines)


def _statistics_section(df: pd.DataFrame, columns: list[_Column]) -> str:
    """Per-column statistics driven by each column's declared type."""
    lines = ["## Per-column statistics"]
    for key, label, ftype in columns:
        lines.append(f"- **{key}** — {label} ({ftype})")
        if key not in df.columns:
            lines.append("  - no data present in the rows")
            continue
        try:
            if ftype == DatasetField.FieldType.NUMBER:
                lines.extend(_numeric_stats(df[key]))
            else:
                lines.extend(_categorical_stats(df[key], len(df)))
        except Exception:  # never let odd data break the summary
            lines.append("  - statistics unavailable for this column")
    return "\n".join(lines)


def _numeric_stats(series: pd.Series) -> list[str]:
    """Descriptive statistics for a numeric column (non-numeric coerced to NaN)."""
    numeric = pd.to_numeric(series, errors="coerce")
    count = int(numeric.notna().sum())
    missing = int(numeric.isna().sum())
    if count == 0:
        return [f"  - count: 0, missing: {missing} — no numeric values"]
    return [
        f"  - count: {count}, missing: {missing}",
        f"  - mean: {_fmt_num(numeric.mean())}, "
        f"median: {_fmt_num(numeric.median())}, std: {_fmt_num(numeric.std())}",
        f"  - min: {_fmt_num(numeric.min())}, "
        f"25%: {_fmt_num(numeric.quantile(0.25))}, "
        f"75%: {_fmt_num(numeric.quantile(0.75))}, "
        f"max: {_fmt_num(numeric.max())}",
        f"  - sum: {_fmt_num(numeric.sum())}",
    ]


def _categorical_stats(series: pd.Series, total_rows: int) -> list[str]:
    """Frequency statistics for a categorical column."""
    non_null = int(series.notna().sum())
    missing = int(series.isna().sum())
    try:
        unique = int(series.nunique(dropna=True))
        counts = series.value_counts(dropna=True).head(_MAX_TOP_VALUES)
    except TypeError:
        # Unhashable values (e.g. nested JSON) can't be counted.
        return [f"  - non-null: {non_null}, missing: {missing}, unique: n/a"]
    lines = [f"  - non-null: {non_null}, missing: {missing}, unique: {unique}"]
    if counts.empty:
        lines.append("  - no non-null values")
        return lines
    lines.append("  - top values:")
    for value, count in counts.items():
        pct = (count / total_rows * 100) if total_rows else 0.0
        lines.append(f"    - {_fmt_cell(value)} — {int(count)} ({round(pct, 1)}%)")
    return lines


def _correlations_section(df: pd.DataFrame, columns: list[_Column]) -> str:
    """Strongest Pearson correlations between numeric columns, if any qualify."""
    numeric_keys = [
        key
        for key, _label, ftype in columns
        if ftype == DatasetField.FieldType.NUMBER and key in df.columns
    ]
    if len(numeric_keys) < 2:
        return ""
    try:
        numeric_df = df[numeric_keys].apply(pd.to_numeric, errors="coerce")
        matrix = numeric_df.corr(method="pearson")
    except Exception:  # defensive against degenerate input
        return ""

    pairs: list[tuple[float, str, str]] = []
    for i in range(len(numeric_keys)):
        for j in range(i + 1, len(numeric_keys)):
            a, b = numeric_keys[i], numeric_keys[j]
            try:
                r = matrix.loc[a, b]
            except KeyError:
                continue
            if pd.isna(r) or abs(r) < _CORRELATION_THRESHOLD:
                continue
            pairs.append((abs(r), a, b))

    if not pairs:
        return ""
    pairs.sort(reverse=True)
    lines = ["## Correlations"]
    for _abs_r, a, b in pairs[:_MAX_CORRELATIONS]:
        lines.append(f"- {a} ↔ {b}: r={matrix.loc[a, b]:.2f}")
    return "\n".join(lines)


def _sample_section(df: pd.DataFrame, columns: list[_Column]) -> str:
    """A compact Markdown table of the first few rows."""
    keys = [key for key, _label, _ftype in columns if key in df.columns]
    lines = [f"## Sample rows (first {min(_MAX_SAMPLE_ROWS, len(df))})"]
    if not keys or len(df) == 0:
        lines.append("_No rows to display._")
        return "\n".join(lines)
    try:
        sample = df.loc[:, keys].head(_MAX_SAMPLE_ROWS)
        lines.append("| " + " | ".join(_fmt_cell(key) for key in keys) + " |")
        lines.append("| " + " | ".join("---" for _ in keys) + " |")
        for _idx, row in sample.iterrows():
            cells = [_fmt_cell(row[key]) for key in keys]
            lines.append("| " + " | ".join(cells) + " |")
    except Exception:  # never let rendering break the summary
        return "## Sample rows\n_Sample unavailable._"
    return "\n".join(lines)


def _fmt_num(value: object) -> str:
    """Render a numeric statistic, rounding floats to 2dp; NaN -> 'n/a'."""
    if value is None or pd.isna(value):
        return "n/a"
    number = float(value)
    rounded = round(number, 2)
    if rounded == int(rounded):
        return str(int(rounded))
    return f"{rounded:.2f}"


def _fmt_cell(value: object) -> str:
    """Render a table/top-value cell: bounded, single-line, pipe-safe."""
    if value is None or (not isinstance(value, list | dict) and pd.isna(value)):
        return "—"
    text = str(value).replace("\n", " ").replace("|", "\\|").strip()
    if len(text) > _MAX_CELL_LEN:
        text = text[: _MAX_CELL_LEN - 1] + "…"
    return text or "—"
