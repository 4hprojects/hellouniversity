---
status: active
last_updated: 2026-07-11
authoritative_source: true
project: VisualDSA
---

# VisualDSA Implementation Documentation

This directory is the authoritative planning and implementation layer for VisualDSA inside HelloUniversity.

VisualDSA is not a separate website and not a generic collection of animations. It is the interactive teaching, formative assessment, interaction-recording, and instructor analytics layer connected to the existing HelloUniversity Data Structures and Algorithms curriculum.

## Current repository location

The existing DSA package is located at:

```text
docs/hellouniversity-dsa-complete-package/
```

The existing application already loads the markdown curriculum through:

```text
app/dsaContent.js
```

The current public routes are:

```text
/data-structures-and-algorithms
/data-structures-and-algorithms/<lesson-slug>
/data-structures-and-algorithms/projects/<project-slug>
/visualdsa
/visualdsa/<demo-slug>
```

## Documentation priority

When documents conflict, use this order:

1. `01-current-implementation-audit.md`
2. `02-target-architecture.md`
3. `03-gap-analysis.md`
4. `04-implementation-roadmap.md`
5. Active module specifications
6. Existing DSA curriculum documents
7. Superseded or archived documents

## Core implementation principle

```text
DSA lessons
    ↓
guided VisualDSA interaction
    ↓
independent practice
    ↓
recorded interactive assessment
    ↓
student mastery update
    ↓
instructor analytics and intervention
```

## Initial research-complete modules

1. Array operations
2. Stack operations
3. Queue operations
4. Binary search
5. Introductory sorting
6. Binary search tree insertion and traversal

Linked lists remain in the full curriculum and become the first major module in the next expansion batch.

## Existing documents

The following existing documents must be preserved:

```text
docs/hellouniversity-dsa-complete-package/README.md
docs/hellouniversity-dsa-complete-package/docs/dsa/
docs/hellouniversity-dsa-complete-package/docs/visualdsa/00-visualdsa-integration-overview.md
docs/hellouniversity-dsa-complete-package/prompts/
```

The new files extend the existing package. They do not create a competing source of truth.

## Implementation rule for Codex or Claude

Before changing VisualDSA code:

1. Read all active VisualDSA documentation.
2. Inspect the current route, template, service, database, and test files.
3. Extend working implementation instead of regenerating it.
4. Do not delete or rename existing public DSA routes.
5. Do not replace the 30 lesson files or 5 project files.
6. Keep VisualDSA tightly linked to the lesson pages.
7. Validate recorded assessment results on the server.
8. Add tests before marking a phase complete.
