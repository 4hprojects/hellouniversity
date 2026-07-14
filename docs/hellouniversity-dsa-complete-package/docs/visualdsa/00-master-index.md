---
status: active
last_updated: 2026-07-11
authoritative_source: true
project: VisualDSA
---

# VisualDSA Master Documentation Index

## Purpose

This package is the authoritative implementation and research specification for VisualDSA inside HelloUniversity.

VisualDSA is the interactive instructional layer connected to the existing HelloUniversity Data Structures and Algorithms curriculum.

It combines:

- Interactive visualization
- Guided formative assessment
- Recorded student interaction
- Topic mastery
- Misconception analysis
- Instructor-facing learning analytics

## Repository location

Place this package under:

```text
docs/hellouniversity-dsa-complete-package/docs/visualdsa/
```

## Reading order

### Foundation

1. `README.md`
2. `01-current-implementation-audit.md`
3. `02-target-architecture.md`
4. `03-gap-analysis.md`
5. `04-implementation-roadmap.md`

### Design and learning engine

6. `05-visualizer-design-system.md`
7. `06-practice-and-assessment-engine.md`
8. `07-interaction-event-model.md`
9. `08-learning-analytics.md`

### Technical architecture

10. `09-database-schema.md`
11. `10-api-security-contracts.md`

### Module specifications

12. `modules/01-array-module.md`
13. `modules/02-stack-module.md`
14. `modules/03-queue-module.md`
15. `modules/04-binary-search-module.md`
16. `modules/05-sorting-module.md`
17. `modules/06-bst-module.md`

### Testing and research

18. `12-testing-and-acceptance-plan.md`
19. `13-research-evaluation-plan.md`

### Implementation prompts

20. `11-phase-3-codex-claude-instructions.md`
21. `14-phase-4-codex-claude-instructions.md`
22. `15-final-codex-claude-implementation-prompt.md`

### Project-control documents

23. `16-document-status-map.md`
24. `17-change-log.md`
25. `18-final-implementation-sequence.md`

## Source-of-truth priority

When documents conflict, use this order:

1. `00-master-index.md`
2. `01-current-implementation-audit.md`
3. `02-target-architecture.md`
4. `09-database-schema.md`
5. `10-api-security-contracts.md`
6. Active module specification
7. `12-testing-and-acceptance-plan.md`
8. `13-research-evaluation-plan.md`
9. Existing DSA curriculum documents
10. Superseded or archived documents

## Fixed project decisions

```text
Platform:
HelloUniversity

Backend:
Node.js and Express

Templates:
EJS

Content:
MarkdownIt

Database for new VisualDSA learning records:
Supabase PostgreSQL

Existing platform database support:
Supabase and MongoDB

Visualization direction:
SVG-first

Initial research-complete modules:
Arrays
Stacks
Queues
Binary Search
Bubble Sort
Selection Sort
Insertion Sort
Binary Search Tree

Assessment:
Direct interactive and server-validated

Analytics:
Student mastery and instructor intervention support

Research scope:
Selected DSA topics, not the entire DSA curriculum
```

## Existing public routes to preserve

```text
/data-structures-and-algorithms
/data-structures-and-algorithms/<lesson-slug>
/data-structures-and-algorithms/projects/<project-slug>
/visualdsa
/visualdsa/<demo-slug>
```

## Core learning flow

```text
Read lesson
→ Open related VisualDSA module
→ Complete guided interaction
→ Explore with custom input
→ Complete practice
→ Take recorded assessment
→ Review mastery feedback
→ Instructor reviews class analytics
```

## Completion definition

VisualDSA is not complete when animations run.

The first research prototype is complete only when:

```text
[ ] Six module specifications are implemented
[ ] Practice is available
[ ] Assessment is recorded
[ ] Official score is server-validated
[ ] Raw interaction events are stored
[ ] Misconceptions are classified
[ ] Student mastery is calculated
[ ] Instructor analytics are available
[ ] Security tests pass
[ ] Accessibility checks pass
[ ] Mobile checks pass
[ ] Pilot readiness is approved
```
