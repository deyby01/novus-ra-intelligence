"""AI dashboard generation: deterministic widgets + a Gemini "smart layer".

The widgets are picked by the deterministic overview engine — always valid,
instant, free. Gemini only *enhances* the result (a dashboard name, per-widget
titles, and a short executive summary). Any AI failure falls back to
deterministic values, so generation can never be blocked or broken by the LLM.
"""

from __future__ import annotations

import json

from django.contrib.auth import get_user_model
from django.db import transaction

from apps.dashboards.models import Dashboard, Widget
from apps.datasets.models import Dataset
from apps.datasets.services.overview_service import build_dataset_overview
from apps.reports.adapters import GeminiAdapter
from apps.reports.ports import AIProvider

User = get_user_model()


class EmptyDatasetError(Exception):
    """Raised when a dataset has no data to build a dashboard from."""


def generate_dashboard(
    dataset: Dataset,
    user: User,
    ai_provider: AIProvider | None = None,
) -> Dashboard:
    """Build a dashboard (+ widgets) from a dataset, named by the AI.

    Raises:
        EmptyDatasetError: the dataset has no widgets to build (no rows/fields).
    """
    specs = build_dataset_overview(dataset)["widgets"]
    if not specs:
        raise EmptyDatasetError("The dataset has no data to build a dashboard from.")

    deterministic_titles = [spec["config"].get("title", "") for spec in specs]
    name, titles, summary = _smart_layer(dataset, specs, deterministic_titles, ai_provider)

    with transaction.atomic():
        dashboard = Dashboard.objects.create(
            name=name,
            description=summary,
            organization=dataset.organization,
            created_by=user,
            updated_by=user,
        )
        Widget.objects.bulk_create(
            Widget(
                dashboard=dashboard,
                dataset=dataset,
                chart_type=spec["chart_type"],
                config={**spec["config"], "title": title},
                position={},
                organization=dataset.organization,
            )
            for spec, title in zip(specs, titles, strict=True)
        )
    return dashboard


def _smart_layer(
    dataset: Dataset,
    specs: list[dict],
    deterministic_titles: list[str],
    ai_provider: AIProvider | None,
) -> tuple[str, list[str], str]:
    """Ask the AI for a name/titles/summary; fall back to deterministic on failure."""
    try:
        provider = ai_provider or GeminiAdapter()
        raw = provider.generate_text(_build_prompt(dataset, specs, deterministic_titles))
        data = json.loads(_extract_json(raw))

        name = (str(data.get("name") or "")).strip() or dataset.name
        ai_titles = data.get("widget_titles") or []
        titles = [
            (str(ai_titles[i]).strip() or deterministic_titles[i])
            if i < len(ai_titles)
            else deterministic_titles[i]
            for i in range(len(deterministic_titles))
        ]
        summary = (str(data.get("summary") or "")).strip()
        return name, titles, summary
    except Exception:  # noqa: BLE001 — AI must enhance, never block: fall back.
        return dataset.name, deterministic_titles, ""


def _build_prompt(dataset: Dataset, specs: list[dict], deterministic_titles: list[str]) -> str:
    """A compact prompt asking only for a name, widget titles, and a summary."""
    widget_lines = "\n".join(
        f"{i + 1}. {spec['chart_type']} — {title}"
        for i, (spec, title) in enumerate(zip(specs, deterministic_titles, strict=True))
    )
    return (
        "Eres un analista de negocio. Vas a nombrar un panel (dashboard) para el "
        f"dataset llamado «{dataset.name}». El panel tiene estos widgets, en orden:\n"
        f"{widget_lines}\n\n"
        "Devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional, con esta forma:\n"
        '{"name": "<nombre corto y claro del panel, en español>", '
        '"widget_titles": ["<un título corto por widget, mismo orden>", ...], '
        '"summary": "<resumen ejecutivo de 1-2 frases, en español>"}\n'
        "No inventes cifras ni datos; básate solo en los nombres de los widgets."
    )


def _extract_json(text: str) -> str:
    """Pull the first {...} JSON object out of the model's reply (may be fenced)."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("No JSON object in the AI response.")
    return text[start : end + 1]
