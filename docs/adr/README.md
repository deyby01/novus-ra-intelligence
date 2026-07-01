# ADRs — Architecture Decision Records

An ADR documents **one** architecture decision: what was decided, in what context, which alternatives were discarded, and what consequences (good AND bad) we accept. It's written **before** the decision is implemented.

## Rules

- One file per decision: `NNNN-title-in-kebab-case.md` (sequential numbering).
- ADRs are **immutable**: if a decision changes, the old ADR isn't edited — a new one is written to replace it, and the old one is marked `superseded by ADR-NNNN`.
- Possible states: `proposed` → `accepted` | `rejected` | `superseded by ADR-NNNN`.
- `PROJECT_STATE.md` (repo root) keeps the ADR index.

## Template

```markdown
# ADR-NNNN — Decision title

- **Status:** proposed | accepted | rejected | superseded by ADR-NNNN
- **Date:** YYYY-MM-DD

## Context
What problem or question forces this decision? What constraints apply?

## Decision
What was decided, in one or two affirmative sentences ("We will use X because Y").

## Consequences
- (+) What we gain
- (-) What we accept losing or the risk we take on, and how we mitigate it

## Alternatives considered
- **Alternative A** — why not
- **Alternative B** — why not
```
