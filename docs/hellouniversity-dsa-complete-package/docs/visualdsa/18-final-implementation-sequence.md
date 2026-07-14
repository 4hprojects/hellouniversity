---
status: active
last_updated: 2026-07-11
---

# VisualDSA Final Implementation Sequence

## Purpose

This document gives the final build order for the repository implementation.

Do not implement modules in a different order unless a documented repository dependency requires it.

## Implementation Stage 0: Repository verification

Confirm:

- Current branch
- Existing route registration
- Existing Supabase migration pattern
- Existing session and role model
- Existing class and enrollment identifiers
- Existing API security middleware
- Existing test helpers
- Existing CSRF protection

Deliverable:

```text
Updated implementation audit
```

## Implementation Stage 1: Protect existing behavior

Add regression tests for:

```text
/data-structures-and-algorithms
/data-structures-and-algorithms/arrays
/visualdsa
/visualdsa/array-visualizer
```

Confirm the current placeholder behavior before changing it.

## Implementation Stage 2: Shared VisualDSA shell

Build:

- Module registry
- Shared EJS shell
- Mode selector
- SVG canvas
- Pseudocode panel
- Explanation panel
- Variable panel
- Playback controls
- Feedback panel
- Mobile layout
- Keyboard support
- Reduced-motion support

No formal assessment yet.

## Implementation Stage 3: Shared state and playback engine

Build:

- Immutable state snapshots
- Previous and next
- Play and pause
- Reset
- Speed controls
- Step synchronization
- Module lifecycle
- State restoration

Test with a small mock module.

## Implementation Stage 4: Arrays

Build:

- Access
- Update
- Insert
- Delete
- Guided mode
- Exploration mode
- Practice mode
- Unit tests

## Implementation Stage 5: Stacks

Build:

- Push
- Pop
- Peek
- Overflow
- Underflow
- Practice mode
- Unit tests

## Implementation Stage 6: Queues

Build:

- Enqueue
- Dequeue
- Front
- Empty and full states
- Circular wraparound
- Practice mode
- Unit tests

## Implementation Stage 7: Database and API foundation

Add:

- Module tables
- Problem templates
- Problem instances
- Practice sessions
- Assessment assignments
- Assessment attempts
- Actions
- Events

Add API routes and authorization.

## Implementation Stage 8: Recorded assessment

Build:

- Server-issued seeds
- Attempt lifecycle
- Server-side action validation
- Server-side score calculation
- Hint and retry tracking
- Attempt resume
- Attempt lock after submission
- Duplicate action handling

Connect Arrays, Stacks, and Queues.

## Implementation Stage 9: Event logging and misconception classification

Build:

- Event ingestion
- Immutable raw events
- Event idempotency
- AR, ST, and QU classifiers
- Attempt summaries

## Implementation Stage 10: Binary Search

Build:

- Guided mode
- Exploration
- Practice
- Recorded assessment
- BS misconception classifier
- Tests

## Implementation Stage 11: Shared Sorting framework

Build:

- Sorting adapter
- Bubble Sort
- Selection Sort
- Insertion Sort
- Practice
- Assessment
- SO classifier
- Tests

## Implementation Stage 12: Binary Search Tree

Build:

- Search
- Insertion
- Traversals
- SVG layout
- Textual alternative
- Practice
- Assessment
- BT classifier
- Tests

## Implementation Stage 13: Student analytics

Build:

- Practice history
- Attempt history
- Topic mastery
- Recommendations
- Personal misconception summary

## Implementation Stage 14: Instructor analytics

Build:

- Class overview
- Mastery matrix
- Common misconceptions
- Difficult steps
- Student drill-down
- Intervention list
- Export

## Implementation Stage 15: Full stabilization

Run:

```text
npm test
npm run test:smoke
npm run lint
npm run lint:strict
npm run format:check
```

Complete:

- Security review
- Accessibility review
- Responsive checks
- Database integrity checks
- Route regression checks
- Performance checks

## Implementation Stage 16: Pilot

Conduct:

- Expert review
- Small student usability pilot
- Instructor analytics task test
- Event completeness check
- Artifact revision

## Implementation Stage 17: Formal evaluation

Use the approved design from:

```text
13-research-evaluation-plan.md
```

## Release gates

### Gate A: Shared engine ready

Required:

```text
shared shell
state history
keyboard support
mobile layout
```

### Gate B: Foundation modules ready

Required:

```text
arrays
stacks
queues
practice
unit tests
```

### Gate C: Assessment ready

Required:

```text
database
API
server validation
events
ownership tests
```

### Gate D: Six-module prototype ready

Required:

```text
binary search
sorting
BST
misconception classifiers
```

### Gate E: Pilot ready

Required:

```text
student analytics
instructor analytics
security
accessibility
no critical defects
```

## Final implementation rule

Do not move to the next release gate while a critical correctness, scoring, authorization, or data-integrity defect remains.
