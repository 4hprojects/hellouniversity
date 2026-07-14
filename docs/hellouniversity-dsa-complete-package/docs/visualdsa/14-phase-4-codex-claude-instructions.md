---
status: active
last_updated: 2026-07-11
phase: 4
audience: Codex or Claude
---

# Phase 4 Codex or Claude Implementation Instructions

## Purpose

Complete the remaining three research modules and add the test coverage needed for pilot readiness.

Modules:

1. Binary Search
2. Introductory Sorting
3. Binary Search Tree

## Read first

Read all active VisualDSA documents from Phase 1 through Phase 4.

Then inspect the current implementation of:

- Shared VisualDSA shell
- Module registry
- Arrays
- Stacks
- Queues
- Practice and assessment services
- Event service
- Database migrations
- API routes
- Test helpers

Do not assume Phase 3 was implemented exactly as planned. Verify the repository.

## Task

Extend the existing reusable engine.

Do not create separate page architectures for the three modules.

## Boundaries

Do not:

- Replace the DSA lesson package
- Rename public routes
- Implement advanced sorting in this phase
- Add BST deletion unless all required scope is complete and tested
- Add AVL balancing
- Add graph algorithms
- Duplicate the assessment engine
- Use client-side scoring as the source of truth
- Hide algorithm rules inside rendering code
- Mix module state generation with DOM manipulation
- Change existing Array, Stack, or Queue behavior without regression tests

## Implementation order

### Step 1: Add route and registry entries

Confirm or add:

```text
/visualdsa/binary-search-visualizer
/visualdsa/sorting-visualizer
/visualdsa/bubble-sort-visualizer
/visualdsa/selection-sort-visualizer
/visualdsa/insertion-sort-visualizer
/visualdsa/binary-search-tree-visualizer
```

Existing lesson-specific routes should load the shared module with the correct algorithm configuration.

### Step 2: Implement Binary Search

Required:

- Sorted-input validation
- Guided mode
- Exploration mode
- Practice templates
- Assessment templates
- Server validator
- BS misconception classifier
- State and scoring tests

### Step 3: Implement shared Sorting framework

Create one sorting adapter interface.

Example:

```javascript
{
  algorithmKey,
  generateSteps,
  validateAction,
  classifyError,
  calculateCounters,
  getPseudocode
}
```

Implement:

- Bubble Sort
- Selection Sort
- Insertion Sort

Do not duplicate the shell or assessment lifecycle.

### Step 4: Implement BST

Required:

- Search
- Insertion
- Duplicate rejection
- Preorder
- Inorder
- Postorder
- SVG rendering
- Textual tree alternative
- BT misconception classifier
- State and scoring tests

### Step 5: Add analytics definitions

Each module must define:

- Scored steps
- First-attempt metric
- Misconception mappings
- Difficult-step identifiers
- Recommended interventions

### Step 6: Complete test coverage

Follow:

```text
12-testing-and-acceptance-plan.md
```

Add:

- Unit tests
- API tests
- Security tests
- Route regression tests
- Score recalculation tests
- Event integrity tests

## Verification rules

Run applicable repository commands:

```text
npm test
npm run test:smoke
npm run lint
npm run lint:strict
npm run format:check
```

Manual checks:

- Keyboard-only use
- Reduced motion
- 320-pixel viewport
- Assessment resume
- Duplicate action retry
- Cross-user access
- Existing DSA lesson links
- Instructor analytics evidence

## Required evidence before completion

Provide:

```text
Binary Search test cases
Sorting test cases for all three algorithms
BST test cases
API test results
Security test results
Accessibility checklist
Responsive checklist
Known limitations
```

## Stop conditions

Stop and report when:

- Existing shared engine cannot support the module without architectural duplication
- Sorting counter semantics are inconsistent
- Same seed does not reproduce the same problem
- BST layout breaks parent-child relationships
- Assessment validation remains client-only
- Inorder traversal does not match sorted unique values
- Route changes would break indexed public pages
- Existing Phase 3 tests fail after the changes

## Definition of done

```text
[ ] Binary Search is research-complete
[ ] Bubble Sort is research-complete
[ ] Selection Sort is research-complete
[ ] Insertion Sort is research-complete
[ ] BST is research-complete
[ ] All six prototype modules share one engine
[ ] All six modules emit standard events
[ ] All six modules map misconceptions
[ ] Official scores are server-validated
[ ] Route regression tests pass
[ ] Security tests pass
[ ] Accessibility checks pass
[ ] Mobile checks pass
[ ] No critical defects remain
```

## Output format

```text
Files created
Files modified
Routes added or changed
Migrations added
Module versions
Tests added
Commands run
Test results
Accessibility results
Security results
Known limitations
Pilot-readiness recommendation
```
