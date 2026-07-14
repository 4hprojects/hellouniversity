---
status: active
last_updated: 2026-07-11
---

# VisualDSA Document Status Map

## Purpose

This file prevents Codex, Claude, or future developers from following outdated or conflicting project documents.

## Active authoritative documents

| Document | Status | Purpose |
|---|---|---|
| `00-master-index.md` | Active | Master navigation and source-of-truth rules |
| `README.md` | Active | Package overview |
| `01-current-implementation-audit.md` | Active | Current repository state |
| `02-target-architecture.md` | Active | Final system direction |
| `03-gap-analysis.md` | Active | Difference between current and target state |
| `04-implementation-roadmap.md` | Active | Development phases |
| `05-visualizer-design-system.md` | Active | Shared interface and module behavior |
| `06-practice-and-assessment-engine.md` | Active | Practice and assessment rules |
| `07-interaction-event-model.md` | Active | Raw learning events |
| `08-learning-analytics.md` | Active | Student and instructor metrics |
| `09-database-schema.md` | Active | PostgreSQL schema direction |
| `10-api-security-contracts.md` | Active | API and authorization rules |
| `12-testing-and-acceptance-plan.md` | Active | Quality requirements |
| `13-research-evaluation-plan.md` | Active | Research evaluation |
| `15-final-codex-claude-implementation-prompt.md` | Active | Main implementation prompt |
| `18-final-implementation-sequence.md` | Active | Final work order |

## Active module documents

| Document | Status |
|---|---|
| `modules/01-array-module.md` | Active |
| `modules/02-stack-module.md` | Active |
| `modules/03-queue-module.md` | Active |
| `modules/04-binary-search-module.md` | Active |
| `modules/05-sorting-module.md` | Active |
| `modules/06-bst-module.md` | Active |

## Supporting implementation prompts

| Document | Status | Use |
|---|---|---|
| `11-phase-3-codex-claude-instructions.md` | Supporting | First three modules |
| `14-phase-4-codex-claude-instructions.md` | Supporting | Remaining modules |
| `15-final-codex-claude-implementation-prompt.md` | Authoritative | Full implementation |

When the prompts conflict, use the final prompt.

## Existing document to preserve

```text
00-visualdsa-integration-overview.md
```

Status:

```text
Preserve as original high-level VisualDSA overview.
The newer documents expand it.
```

Do not delete it.

## Existing DSA package status

```text
docs/hellouniversity-dsa-complete-package/docs/dsa/
```

Status:

```text
Active curriculum source
```

Do not replace or regenerate the 30 lessons or 5 projects.

## Document classification rules

### Active

Use for current implementation.

Front matter:

```yaml
status: active
```

### Superseded

Retain for history but do not implement from it.

Front matter:

```yaml
status: superseded
superseded_by: path/to/new-document.md
```

### Archived

No longer part of the active implementation path.

Move only after verifying that all useful requirements exist in active documents.

### Needs verification

Use when a document references a repository feature that has not been confirmed.

## Conflict-resolution rule

When a technical specification conflicts with the actual current repository:

1. Stop implementation.
2. Record the conflict.
3. Inspect the current code and database.
4. Update `01-current-implementation-audit.md`.
5. Update the affected active specification.
6. Continue only after the source of truth is corrected.

Do not silently choose one version.
