---
status: active
last_updated: 2026-07-11
---

# VisualDSA Gap Analysis

## Purpose

This document compares the current repository implementation with the target research-ready VisualDSA platform.

## Platform-level gaps

| Area | Current state | Target state | Gap | Action |
|---|---|---|---|---|
| DSA curriculum | 30 lessons and 5 projects implemented | Preserve and connect to modules | No major gap | Keep |
| DSA routes | Implemented | Preserve | No gap | Protect with tests |
| VisualDSA routes | Landing and detail routes implemented | Interactive modules | Detail routes are placeholders | Replace placeholder body with module shell |
| Lesson mapping | Each lesson maps to a VisualDSA route | Maintain mapping | Some routes have no real module | Add module registry and status |
| Quick checks | Seeded lesson quick checks | Direct interactive assessment | Quick checks do not evaluate algorithm actions | Build VisualDSA assessment engine |
| Authentication | Existing session-based role handling | Student and instructor access controls | VisualDSA-specific authorization not defined | Add middleware and policies |
| Database | Supabase and MongoDB available | Sessions, attempts, events, mastery | No confirmed VisualDSA schema | Add migrations/schema |
| Testing | Jest and Supertest available | Route, engine, scoring, and event tests | No confirmed VisualDSA test suite | Add test layers |
| Accessibility | Existing site conventions | Keyboard, reduced motion, textual state | No module standard | Define and test design system |
| Mobile | Existing responsive site | Responsive visualizer shell | No module implementation | Build mobile-first shell |

## Instructional gaps

| Requirement | Current state | Gap |
|---|---|---|
| Guided visualization | Described in placeholder text | Not implemented |
| Custom-input exploration | Not confirmed | Missing |
| Prediction before reveal | Documented as a goal | Missing |
| Direct manipulation | Not implemented | Missing |
| Immediate formative feedback | Lesson quick checks only | Missing for visual actions |
| Hints and retries | Not confirmed | Missing |
| Pseudocode synchronization | Not implemented | Missing |
| Variable and counter tracking | Not implemented | Missing |
| Previous-step state history | Not implemented | Missing |
| Mastery feedback | Not implemented | Missing |

## Assessment gaps

| Requirement | Current state | Required implementation |
|---|---|---|
| Practice session | No VisualDSA session model | Create practice-session API and storage |
| Assessment attempt | No VisualDSA attempt model | Create attempt lifecycle |
| Problem generation | Lesson quick checks use seeded option randomization | Create module-specific seeded generators |
| Direct action validation | Not implemented | Add module validators |
| Partial credit | Not implemented | Add scoring rules |
| Hint penalties | Not implemented | Add assignment-configurable policy |
| Attempt limits | Not implemented | Add assessment assignment rules |
| Server validation | Not implemented for visual actions | Recompute official score server-side |
| Module versioning | Not implemented | Store module and scoring version |
| Abandonment handling | Not implemented | Add timeout and resume rules |

## Interaction-recording gaps

Missing event categories:

```text
module_opened
mode_selected
input_submitted
visualization_started
step_advanced
step_reversed
prediction_submitted
student_action_submitted
incorrect_action
hint_requested
attempt_paused
attempt_resumed
attempt_completed
attempt_abandoned
```

Missing event data:

- Problem seed
- Step number
- Expected action
- Submitted action
- First-response correctness
- Retry count
- Hint state
- Response time
- Module version

## Analytics gaps

### Student view

Missing:

- VisualDSA practice history
- Assessment history
- Topic mastery
- Misconception feedback
- Recommended next lesson
- Practice-to-assessment comparison

### Instructor view

Missing:

- Class completion overview
- Mastery matrix
- Common errors
- Difficult steps
- Student drill-down
- Intervention list
- Exportable reports

## Module gaps

| Module | Existing lesson | Existing route | Interactive module | Priority |
|---|---:|---:|---:|---:|
| Arrays | Yes | Yes | No | Phase 3 |
| Stacks | Yes | Yes | No | Phase 3 |
| Queues | Yes | Yes | No | Phase 3 |
| Binary search | Yes | Yes | No | Phase 6 |
| Bubble sort | Yes | Yes | No | Phase 6 |
| Selection sort | Yes | Yes | No | Phase 6 |
| Insertion sort | Yes | Yes | No | Phase 6 |
| Binary search tree | Yes | Yes | No | Phase 6 |
| Linked list | Yes | Yes | No | Expansion |
| Recursion | Yes | Yes | No | Expansion |
| Graph traversal | Yes | Yes | No | Expansion |

## Documentation gaps

Existing `00-visualdsa-integration-overview.md` gives the correct high-level direction but does not fully specify:

- Reusable engine structure
- Mode behavior
- Assessment lifecycle
- Event schema
- Misconception model
- Analytics calculations
- Database tables
- API contracts
- Module acceptance criteria
- Testing strategy
- Research prototype scope

These documents should be added rather than rewriting the entire DSA package.

## Main implementation risk

The largest risk is building many visually attractive demos before creating the common assessment, event, and analytics foundations.

That would produce route coverage but not a research-ready artifact.

## Priority decision

The project should implement:

```text
shared engine
→ arrays, stacks, queues
→ assessment and event model
→ analytics foundation
→ binary search, sorting, BST
→ formal testing and evaluation
→ curriculum expansion
```
