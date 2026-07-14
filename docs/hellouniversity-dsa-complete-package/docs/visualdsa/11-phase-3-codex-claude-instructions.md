---
status: active
last_updated: 2026-07-11
phase: 3
audience: Codex or Claude
---

# Phase 3 Codex or Claude Implementation Instructions

## Purpose

Implement the VisualDSA foundation and the first three modules without replacing the existing DSA curriculum or public routes.

## Read first

```text
docs/hellouniversity-dsa-complete-package/docs/visualdsa/README.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/01-current-implementation-audit.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/02-target-architecture.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/03-gap-analysis.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/04-implementation-roadmap.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/05-visualizer-design-system.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/06-practice-and-assessment-engine.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/07-interaction-event-model.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/08-learning-analytics.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/09-database-schema.md
docs/hellouniversity-dsa-complete-package/docs/visualdsa/10-api-security-contracts.md
```

Then read the three module specifications.

## Purpose

Build a reusable VisualDSA shell and initial module engine for:

1. Arrays
2. Stacks
3. Queues

## Context

The current repository already contains:

- DSA curriculum markdown
- DSA content loader
- Public lesson routes
- VisualDSA landing route
- VisualDSA placeholder detail route
- EJS templates
- Existing session authentication
- Jest and Supertest

Do not regenerate those systems.

## Required first action

Audit the current repository branch before editing.

Confirm:

- Existing route registration pattern
- Existing Supabase service conventions
- Existing user, student, instructor, class, and enrollment identifiers
- Existing CSRF approach
- Existing API security middleware
- Existing test helpers
- Current CSS conventions

## Boundaries

Do not:

- Delete or rename existing DSA routes
- Replace the 30 lesson markdown files
- Replace the 5 project markdown files
- Expose the Supabase service-role key
- Let the browser write official scores
- Build binary search, sorting, or BST in this phase
- Add a second authentication system
- Add React unless the current repository architecture is deliberately migrated in a separate approved project
- Rewrite unrelated HelloUniversity features
- Make recorded assessment depend only on client-side validation

## Recommended implementation order

### Step 1: Add tests protecting current routes

Test:

```text
GET /data-structures-and-algorithms
GET /data-structures-and-algorithms/arrays
GET /visualdsa
GET /visualdsa/array-visualizer
```

### Step 2: Add module registry

Create a server registry mapping route slugs to module metadata and status.

### Step 3: Replace placeholder-only rendering with a shared shell

Keep unfinished modules on a clear unavailable or planned state.

### Step 4: Add the client engine

Implement:

- State manager
- Playback controller
- Step history
- Module loader
- Accessibility helpers

### Step 5: Implement Arrays

Complete guided and exploration modes first.

Then add practice.

### Step 6: Implement Stacks

Reuse the shell and state manager.

### Step 7: Implement Queues

Reuse the shell and state manager.

### Step 8: Add database migration

Use current Supabase migration conventions.

Create only tables required for the implemented phase.

It is acceptable to stage the schema:

```text
modules
problem templates
problem instances
practice sessions
attempts
actions
events
```

Analytics aggregate tables may be migrated before their dashboards are built, but do not add unused complexity without explanation.

### Step 9: Add API routes

Implement practice endpoints first.

Implement assessment endpoints only when server-side validators exist.

### Step 10: Add tests

Required tests:

- State generation
- Previous and next behavior
- Invalid input
- Edge cases
- Practice ownership
- Assessment ownership
- Duplicate action handling
- Score calculation
- Cross-user access denial

## Verification rules

Before marking work complete:

```text
npm test
npm run lint
```

Also manually verify:

- Desktop layout
- Narrow mobile layout
- Keyboard-only operation
- Reduced motion
- Logged-out public exploration
- Logged-in student practice
- Unauthorized API access
- Attempt resume
- Duplicate action retry

## Stop conditions

Stop and report instead of guessing when:

- Existing class or student IDs are unclear
- The repository has no established Supabase migration path
- Current middleware conflicts with the proposed API
- Required route changes would break public URLs
- A module cannot reproduce a problem from the same seed
- Official score validation would remain client-only
- Tests reveal unrelated failures that block safe implementation

## Output format

When implementation is complete, report:

```text
Files created
Files modified
Migrations added
Routes added
Tests added
Commands run
Test results
Known limitations
Next recommended task
```

## Definition of done

Phase 3 implementation is complete only when:

```text
[ ] Shared VisualDSA shell exists
[ ] Arrays use the shell
[ ] Stacks use the shell
[ ] Queues use the shell
[ ] Guided mode works
[ ] Exploration mode works
[ ] Practice mode works
[ ] Server APIs enforce ownership
[ ] Step histories are reversible
[ ] Module tests pass
[ ] Route tests pass
[ ] Mobile and keyboard checks pass
[ ] Existing DSA routes remain unchanged
```
