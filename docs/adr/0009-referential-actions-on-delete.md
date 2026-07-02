# ADR-0009 — Referential actions (`on_delete`)

- **Status:** accepted
- **Date:** 2026-07-02

## Context

Django requires an explicit `on_delete` on every `ForeignKey`. The behavior splits along two relationship kinds: **ownership/composition** (a child that cannot exist without its parent) and **reference/association** (an object that *uses* another it does not own). Getting this wrong either orphans data or silently breaks live dashboards.

## Decision

**Ownership tree → `CASCADE`** (deleting the parent removes its children):
- `Organization` → `Membership`, `Dataset`, `Dashboard`, `Report`, `Automation`
- `Dataset` → `DatasetField`, `DatasetRow`, `ImportJob`
- `Dashboard` → `Widget`
- `User` → `Membership`

**Authorship (`created_by` / `updated_by` → `User`) → `SET_NULL`** (row survives, author reference cleared) — consistent with ADR-0005.

**Cross-references → `PROTECT`**:
- `Widget.dataset` and `Automation.dataset`: deleting a dataset still used by a widget/automation is **blocked** with a clear error ("in use by N widgets"). Nothing silently disappears.

## Consequences

- (+) Normal app flow is safe: a user cannot pull a dataset out from under a live dashboard by accident.
- (+) Tenant offboarding intent is modeled correctly (deleting an Organization removes all its data).
- (-) **`PROTECT` interacts with tenant-wide `CASCADE`:** a naive `organization.delete()` can raise `ProtectedError` if datasets are collected before the widgets that reference them. **Mitigation:** tenant deletion must be an explicit, ordered **service operation** (tear down widgets/automations → datasets → org), performed with a prior backup and an audit log entry. This is best practice for destructive tenant operations regardless, so we accept it deliberately rather than working around it with weaker `on_delete` rules.
- (-) `SET_NULL` on authorship requires those FKs to be `null=True`.

## Alternatives considered

- **`SET_NULL` on cross-references** — dataset deletes freely; the widget survives as "source removed". Good UX and sidesteps the cascade conflict, but allows silently orphaned widgets. Rejected in favor of explicit blocking.
- **`CASCADE` on cross-references** — simplest, no conflict, but deleting a dataset would silently delete widgets from dashboards. Rejected: too surprising.
