---
status: active
last_updated: 2026-07-11
phase: 4
---

# VisualDSA Testing and Acceptance Plan

## Purpose

This document defines how VisualDSA will be tested before pilot use and formal research evaluation.

A module is not complete because its animation runs.

It must be correct, assessable, secure, accessible, and interpretable.

## Test layers

```text
Unit tests
Integration tests
Route and API tests
Database tests
Security tests
Accessibility tests
Responsive tests
Usability tests
Pilot validation
```

## 1. Module unit tests

Test pure module logic separately from rendering.

Each module should expose deterministic functions for:

- Input validation
- Initial state creation
- Step generation
- Student-action validation
- Error classification
- Scoring
- Problem generation from seed

### Determinism test

```text
same module version
+ same template
+ same seed
= same input and expected steps
```

### Reversibility test

```text
state N
→ previous
= exact state N - 1
```

## 2. Required module test cases

### Arrays

- Access valid index
- Reject invalid index
- Insert at beginning
- Insert at end
- Reject full capacity
- Shift right to left
- Delete at beginning
- Delete at end
- Shift left to right
- Preserve duplicates
- Correct logical size

### Stacks

- Push into empty stack
- Pop from one-element stack
- Peek does not mutate
- Reject underflow
- Reject overflow
- Preserve LIFO sequence
- Correct top index
- Restore state after previous

### Queues

- Enqueue into empty queue
- Dequeue one-element queue
- Reject empty dequeue
- Reject full enqueue
- Preserve FIFO sequence
- Correct front update
- Correct rear update
- Circular wraparound
- Correct empty reset convention

### Binary Search

- Find first element
- Find final element
- Find midpoint
- One-element found
- One-element absent
- Missing target
- Even-length input
- Duplicate target under “find any” policy
- Reject unsorted assessment input
- Final-element loop condition

### Sorting

Bubble Sort:

- Already sorted early termination
- Reverse order
- Duplicate values
- Correct adjacent comparisons
- Correct finalized suffix

Selection Sort:

- Minimum already at start
- Minimum at final index
- Correct scan before swap
- Correct sorted prefix

Insertion Sort:

- Key remains in place
- Key moves to beginning
- Duplicate values
- Correct shift order
- Correct sorted prefix

### BST

- Insert root
- Insert left
- Insert right
- Reject duplicate
- Search root
- Search missing
- Preorder
- Inorder
- Postorder
- Left-skewed tree
- Right-skewed tree
- Correct parent relationships

## 3. Scoring tests

For every assessment template:

- Perfect sequence = 100%
- Incorrect final state does not receive full credit
- Correct final state with wrong process receives limited credit
- Hint penalty matches policy
- Retry behavior preserves first-attempt accuracy
- Partial credit totals are correct
- Score stays within 0 to 100
- Server and recalculation job return the same score

## 4. Misconception-classification tests

Each misconception code requires:

- At least one positive test
- At least one negative test
- Classifier version
- Evidence action
- Recommended intervention mapping

Example:

```text
BS02 should trigger:
student sets low = mid instead of mid + 1

BS02 should not trigger:
student correctly sets low = mid + 1
```

## 5. API integration tests

Required route cases:

```text
public module metadata
start practice
submit practice action
complete practice
start assessment
submit assessment action
resume assessment
submit assessment
student progress
instructor overview
```

Test:

- Success
- Missing authentication
- Wrong role
- Wrong owner
- Invalid payload
- Expired attempt
- Submitted attempt
- Duplicate event
- Attempt limit
- Assignment outside availability window

## 6. Security tests

### Cross-user access

Student A must not:

- Read Student B’s attempt
- Submit to Student B’s attempt
- View Student B’s progress
- Use Student B’s session or action identifiers

### Instructor scope

Instructor A must not:

- View Instructor B’s class
- Export another class
- Invalidate another class’s attempt

### Client tampering

Reject or ignore:

- Client-provided score
- Client-provided correctness
- Client-provided student ID
- Client-provided module version that does not match the attempt
- Action after submission
- Hidden validation payload requests

### CSRF

State-changing routes require:

- Valid session
- Valid origin or referer policy
- Valid CSRF token where implemented

## 7. Database tests

Verify:

- Unique `client_event_id`
- Unique attempt number per student and assignment
- One session type per action
- Submitted attempt lock
- Append-only raw events
- Foreign-key integrity
- Aggregate recalculation
- Invalidated attempts remain auditable

## 8. Route-regression tests

Protect existing routes:

```text
/data-structures-and-algorithms
/data-structures-and-algorithms/arrays
/data-structures-and-algorithms/stacks
/data-structures-and-algorithms/queues
/data-structures-and-algorithms/binary-search
/data-structures-and-algorithms/bubble-sort
/data-structures-and-algorithms/binary-search-trees
/visualdsa
/visualdsa/array-visualizer
/visualdsa/stack-visualizer
/visualdsa/queue-visualizer
/visualdsa/binary-search-visualizer
/visualdsa/bubble-sort-visualizer
/visualdsa/binary-search-tree-visualizer
```

## 9. Accessibility tests

### Keyboard

Verify:

- All controls are reachable
- Focus order is logical
- No keyboard trap
- Drag actions have button-based alternatives
- Current focus is visible

### Screen reader

Verify:

- Module title is announced
- Mode is announced
- Current step is announced
- State changes have live-region support where appropriate
- Cells and nodes have meaningful labels
- Feedback is announced

### Motion

Verify:

- `prefers-reduced-motion` is respected
- Step changes remain understandable without animation
- No essential information exists only in motion

### Color

Verify:

- Every state uses a non-color cue
- Contrast meets project accessibility targets
- Heatmaps have textual values

## 10. Responsive testing

Target viewport widths:

```text
320
375
768
1024
1366
```

Verify:

- Visualization remains usable
- Controls remain reachable
- Panels do not overlap
- Tables scroll or stack safely
- Sticky controls do not cover content
- Touch targets remain large enough

## 11. Performance testing

Initial practical targets:

- Public module page interactive within a reasonable time on mid-range mobile hardware
- Step transition under 100 ms excluding intentional animation
- Assessment action response typically under 500 ms on a stable connection
- Class overview query under 2 seconds for pilot-sized classes
- No unbounded SVG growth
- No event sent for every animation frame

## 12. Manual instructional review

Each module requires review by a DSA instructor for:

- Algorithm correctness
- Terminology
- Pseudocode consistency
- Learning-objective alignment
- Feedback quality
- Misconception mapping
- Assessment appropriateness

## 13. Usability test tasks

Student participants should be asked to:

1. Open a lesson.
2. Open the related VisualDSA module.
3. Complete guided mode.
4. Enter a custom input.
5. Complete practice.
6. Start and submit an assessment.
7. View mastery feedback.

Instructor participants should be asked to:

1. Open a class overview.
2. Identify the lowest-mastery topic.
3. Identify the most common misconception.
4. Open one student’s detail.
5. Decide what to reteach.
6. Export a report.

## 14. Severity classification

```text
Critical:
wrong score
wrong algorithm state
cross-user data exposure
assessment bypass
data loss

High:
module cannot complete
incorrect misconception label
mobile interaction blocked
attempt cannot resume

Medium:
unclear feedback
layout issue
non-critical counter error
minor accessibility defect

Low:
copy issue
small alignment issue
optional visual polish
```

No critical defect may remain before pilot use.

## 15. Research-complete acceptance checklist

```text
[ ] Lesson and module are linked
[ ] Algorithm states are verified
[ ] Practice works
[ ] Recorded assessment works
[ ] Server validates official score
[ ] Events are stored
[ ] Misconceptions are classified
[ ] Mastery is updated
[ ] Instructor analytics display evidence
[ ] Security tests pass
[ ] Accessibility checks pass
[ ] Mobile checks pass
[ ] Instructor review is complete
[ ] No critical defects remain
```

## 16. Required commands

Use existing repository scripts:

```text
npm test
npm run test:smoke
npm run lint
npm run lint:strict
npm run format:check
```

Only run scripts that exist and are applicable to the changed files.

## 17. Test report format

```text
Build or commit:
Environment:
Database migration:
Modules tested:
Automated test results:
Manual test results:
Accessibility results:
Security results:
Known defects:
Pilot readiness decision:
Reviewer:
Date:
```
