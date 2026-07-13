# ADR-0017 — Importer resilience: defensive-first, evidence-driven

- **Status:** accepted
- **Date:** 2026-07-13

## Context

The Excel importer (ADR-0013) assumes a clean sheet: the **first sheet**, the
**first row is the header**, and every following row is data. Real spreadsheets
from non-technical users are messier — spacer rows, a totals row after a blank
line, phantom empty columns, a title/logo above the header, several sheets,
merged cells, mixed-type columns.

Two failure modes matter for the upcoming pilot:

1. **Garbage In, Garbage Out (the higher risk).** A "dirty but parseable" file
   imports *silently*: fully-blank spacer rows become empty `DatasetRow`s, and
   phantom empty columns become useless fields. The auto-overview (Phase 2.5)
   then shows KPIs computed over junk — the product looks wrong without ever
   erroring. The LLM council flagged this exact class as the top pilot risk.
2. **Cryptic errors.** `process_import_job` already catches every exception and
   records `str(exc)` on the job (so the API never 500s), but that string is a
   raw pandas/openpyxl message ("No columns to parse from file") — useless to an
   SMB.

The full fix (multi-sheet selection, header-row detection, merged-cell unspill,
junk-row trimming, type coercion) is large and **speculative**: we do not yet
have real pilot files telling us which messes actually occur. Building all of it
up front is the over-engineering the council warned against.

## Decision

**Phase 2.6 proceeds defensive-first. Slice 2.6.1 hardens only the high-value,
low-risk cases; everything speculative is deferred until a real file demands it.**

**(a) Trim obvious noise before inference.**
- Drop **fully-blank rows** (every cell empty) — spacer/separator rows that
  otherwise become empty `DatasetRow`s.
- Drop **unnamed *and* fully-empty columns** — the phantom `Unnamed: N` columns
  pandas invents for trailing empty cells. A *named* empty column (e.g. an
  intentionally-blank "Notes") is **kept**, and a header-only sheet (columns, no
  data rows) keeps its columns — so a template upload still creates its fields.

**(b) Friendly, actionable errors via a `WorkbookImportError`.** The service
raises this typed exception with a human message; the task already surfaces
`str(exc)` to the job, so the message reaches the user unchanged. Two triggers:
- The file can't be read as a workbook (corrupt / not Excel) →
  *"We couldn't read this file as an Excel workbook. Make sure it's a valid
  .xlsx or .xls file and try again."*
- After trimming, the sheet has **no columns** →
  *"We couldn't find any columns in the first sheet. Make sure the first row
  contains column headers."*

**(c) Explicitly OUT of scope for 2.6.1 (deferred until a real pilot file needs
it):** multi-sheet selection, header-row detection (title/logo rows above the
header), merged-cell unspill, junk/total-row trimming, and coercion of
mixed-type columns. Each lands as its own slice **when evidence demands it**, not
speculatively.

## Consequences

- (+) The most common real-world noise (spacer rows, phantom empty columns) no
  longer pollutes datasets or the auto-overview — directly de-risks the pilot's
  first impression.
- (+) A failed import now tells the user what to do, in their language, instead
  of a pandas stack message.
- (+) No speculative code or UI: scope stays small, reviewable, and reversible.
- (−) "Dirty but parseable in a hard way" files (title rows above the header,
  multi-sheet, merged cells) still import wrong or error — but now with a
  friendly message where they error, and they are explicitly the next slices'
  job when a real file surfaces them.
- (~) Dropping unnamed-empty columns is a heuristic; the named-empty and
  header-only carve-outs keep it from eating legitimate structure.

## Alternatives considered

- **Build full importer robustness now.** Multi-sheet + header detection +
  unspill + coercion. Rejected — speculative without real pilot files; exactly
  the back-office over-build the council said to avoid before validating the core.
- **Do nothing (rely on the existing catch-all).** The API already never 500s.
  Rejected — silent garbage import (GIGO) is the real risk, and it produces a
  wrong-looking overview with no error at all.
- **Auto-detect the header row now (skip leading title rows).** High value but
  genuinely hard to do reliably without heuristics that themselves misfire;
  deferred to its own evidence-driven slice rather than guessed at here.
