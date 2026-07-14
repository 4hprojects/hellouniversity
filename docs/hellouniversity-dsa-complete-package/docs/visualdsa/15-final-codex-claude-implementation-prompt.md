---
status: active
last_updated: 2026-07-11
authoritative_prompt: true
audience: Codex or Claude
---

# Final VisualDSA Codex or Claude Implementation Prompt

## Purpose

Implement VisualDSA inside the existing HelloUniversity repository as an integrated visualization, formative assessment, interaction-recording, and instructor analytics platform for Data Structures and Algorithms education.

## Task

Extend the current DSA and VisualDSA implementation.

Do not create a new standalone application.

Implement the shared VisualDSA engine, the six research-complete modules, recorded assessments, learning events, topic mastery, and instructor analytics.

## Context

Repository:

```text
4hprojects/hellouniversity
```

Current stack:

```text
Node.js
Express
EJS
MarkdownIt
Supabase PostgreSQL
MongoDB
Jest
Supertest
Tailwind build pipeline
Project CSS
```

Current implementation already includes:

- 30 DSA lessons
- 5 DSA projects
- DSA lesson routes
- VisualDSA landing route
- VisualDSA placeholder routes
- Lesson quick checks
- Existing authentication and roles
- Existing test infrastructure

## Mandatory reading

Read all active documents in:

```text
docs/hellouniversity-dsa-complete-package/docs/visualdsa/
```

Start with:

```text
00-master-index.md
01-current-implementation-audit.md
02-target-architecture.md
18-final-implementation-sequence.md
```

Then read all design, API, database, module, testing, and research documents.

## Scope

Implement:

1. Shared VisualDSA shell
2. Shared state and playback engine
3. Arrays
4. Stacks
5. Queues
6. Binary Search
7. Bubble Sort
8. Selection Sort
9. Insertion Sort
10. Binary Search Tree
11. Practice sessions
12. Recorded assessment attempts
13. Interaction events
14. Misconception classification
15. Student mastery
16. Instructor analytics

## Required module modes

```text
Guided
Exploration
Practice
Assessment
Instructor demonstration
```

Instructor demonstration may follow after the core four learner modes if documented.

## Boundaries

Do not:

- Delete or rename public DSA routes
- Replace the 30 lesson files
- Replace the 5 project files
- Add a separate authentication system
- Expose Supabase service credentials
- Trust client-provided scores
- Trust client-provided student IDs
- Store hidden expected answers in browser-accessible payloads
- Build unrelated advanced algorithms
- Rewrite unrelated HelloUniversity features
- Introduce React without an independently approved migration
- Mark a module complete because animation alone works

## Required architecture

### Browser

Responsible for:

- Rendering
- Controls
- Local state display
- Temporary action queue
- Accessibility behavior

Not authoritative for:

- Identity
- Official correctness
- Official score
- Attempt eligibility
- Mastery

### Express server

Responsible for:

- Authentication
- Authorization
- Problem generation
- Action validation
- Scoring
- Event creation
- Attempt lifecycle
- Mastery calculation
- Analytics access

### Supabase PostgreSQL

Responsible for:

- Modules
- Problem templates
- Sessions
- Assignments
- Attempts
- Actions
- Raw events
- Misconceptions
- Mastery
- Aggregates

## Implementation sequence

Follow:

```text
18-final-implementation-sequence.md
```

Do not skip route-regression tests.

## Verification rules

For every module:

```text
same seed
+ same module version
= same problem and expected steps
```

For every assessment:

```text
official score = server calculated
```

For every student resource:

```text
authenticated student owns the resource
```

For every instructor report:

```text
instructor is authorized for the class
```

## Required testing

Add:

- Module unit tests
- Scoring tests
- Misconception tests
- Route regression tests
- API ownership tests
- Cross-user access tests
- Duplicate-event tests
- Attempt-state tests
- Database-integrity tests
- Accessibility checklist
- Mobile checklist

Run applicable commands:

```text
npm test
npm run test:smoke
npm run lint
npm run lint:strict
npm run format:check
```

## Stop conditions

Stop and report instead of guessing when:

- Current user or class identifiers are unclear
- Existing database conventions conflict with the proposed schema
- Public routes would break
- Assessment validation would remain client-only
- Same seed does not reproduce the same problem
- A module requires a duplicate engine
- Existing tests fail and the cause is unclear
- Hidden answers would need to be exposed
- Authorization cannot be verified

## Required output after each implementation stage

```text
Stage completed
Files created
Files modified
Migrations added
Routes added or changed
Tests added
Commands run
Test results
Security results
Accessibility results
Known limitations
Next stage
```

## Definition of done

The VisualDSA research prototype is complete only when:

```text
[ ] Existing DSA routes still work
[ ] Shared shell is used by all modules
[ ] Six module specifications are implemented
[ ] Practice is available
[ ] Assessment is recorded
[ ] Official score is server-validated
[ ] Raw events are stored
[ ] Misconceptions are classified
[ ] Student mastery is calculated
[ ] Instructor analytics work
[ ] Cross-user access is blocked
[ ] Accessibility requirements pass
[ ] Mobile requirements pass
[ ] No critical defects remain
[ ] Pilot-readiness review is complete
```
