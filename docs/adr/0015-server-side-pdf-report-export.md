# ADR-0015 — Server-side PDF export for AI reports

- **Status:** accepted
- **Date:** 2026-07-09

## Context

AI reports are generated as Markdown (`Report.content`) and rendered in the
browser (ADR-0014's sibling reports feature). Users need to take a finished
report out of the app as a document — email it, archive it, hand it to a
stakeholder. The first cut used the browser's own print / "Save as PDF" dialog:
the frontend opened a popup, wrote the report body into it, and called
`window.print()`. That path is fragile — it depends on popups being allowed, it
rasterizes whatever the browser feels like, the output carries no consistent
branding, and it is invisible to the backend (the ERD's `Report.pdf_file`
intent implies the server owns the document, not the browser).

A report is a finished artifact of a `COMPLETED` report only; a `PENDING` or
`FAILED` report has no document to hand out.

## Decision

AI report PDFs are rendered **server-side** with **WeasyPrint**
(Markdown → HTML → PDF), exposed as a tenant-scoped detail action
**`GET /api/v1/reports/{id}/pdf/`** on the existing `ReportViewSet`.

**Rendering.** `render_report_pdf(report)` converts `report.content` from
Markdown to HTML with the `markdown` package (`tables`, `fenced_code`,
`sane_lists` extensions so the Key Metrics GFM table becomes a real `<table>`),
wraps it in a branded print document (title header, "Generated on …" line,
serif body, bordered tables, a `@page` footer with the app name and page
counter), and writes PDF bytes with `weasyprint.HTML(string=…).write_pdf()`.

**Untrusted content — SSRF/local-file hardening.** `report.content` is AI output
derived from tenant-controlled dataset values, and `markdown` passes raw HTML
through verbatim (it does not sanitize). WeasyPrint does not execute JavaScript,
but its default resource fetcher resolves `http(s)://` and `file://` URLs, so a
crafted `<img src="http://169.254.169.254/…">` or `<img src="file:///app/.env">`
in the content would trigger a server-side request or local-file read (SSRF).
The renderer therefore passes a restrictive `url_fetcher` that permits only
inline `data:` URIs and rejects every network/local URL, neutralizing the vector
regardless of what HTML the model emits.

**Generation is on-the-fly.** The PDF is built per request and streamed back;
it is **not** persisted. No `Report.pdf_file` field is added yet — storage is
deferred until there is a reason to keep the bytes (re-download without
re-render, signed URLs, retention). The action returns:

| Condition | Status |
|---|---|
| own report, `status == COMPLETED` | `200` `application/pdf`, `Content-Disposition: attachment` |
| report of another organization (or unknown id) | `404` |
| own report, `status != COMPLETED` | `409` `{"detail": "Report is not ready."}` |

**Tenancy.** The action rides `ReportViewSet.get_object()`, already scoped by
`TenantQuerysetMixin`, so a foreign report id 404s before any rendering runs.
The action never bypasses `get_object()`.

## Consequences

- (+) Selectable-text, branded, deterministic output — the server owns the
  document, not the browser; no popup/print dependency.
- (+) Tenant isolation is free: it rides the same `get_object()` every other
  report action uses.
- (+) Aligns with the ERD's `Report.pdf_file` intent; adding storage later is
  additive (render into a field instead of a response).
- (−) WeasyPrint needs system libraries (Pango, HarfBuzz, a default font) added
  to the backend `slim` image — a heavier image and a longer build. Both the
  `backend` and `celery` services share the image, so both carry the libs.
- (−) Generation is synchronous. For text reports this is sub-second and fine;
  if reports grow large or embed heavy assets, revisit with a Celery task that
  renders into stored `pdf_file` bytes.
- (−) The document is re-rendered on every download (no caching). Acceptable at
  MVP scale; the persisted-`pdf_file` path removes it when needed.

## Alternatives considered

- **Client-side browser print (the status quo).** Popup-dependent, rasterized,
  unbranded, invisible to the backend. Replaced.
- **Client-side rasterization (`html2canvas` + `jsPDF`).** Produces an image,
  not selectable text; fonts and tables degrade; large bundle. Rejected.
- **Persist `Report.pdf_file` now.** Adds a model field, a migration, storage
  wiring, and a stale-on-regenerate question, none of which the download needs
  today. Deferred, not rejected.
- **Async Celery rendering.** Warranted only once generation is slow enough to
  block a request; on-the-fly is simpler and fast enough for text reports.
  Deferred.
