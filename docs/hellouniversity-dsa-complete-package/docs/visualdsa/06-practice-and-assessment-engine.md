---
status: active
last_updated: 2026-07-11
phase: 2
---

# VisualDSA Practice and Assessment Engine

## Purpose

This document defines how VisualDSA generates tasks, records attempts, validates actions, calculates scores, and separates practice from formal assessment.

## Core rule

Practice and assessment may use the same visualization engine, but they must not use the same behavior rules.

```text
Practice
= feedback, hints, retries, learning support

Assessment
= independent performance, recorded actions, controlled feedback
```

## Core entities

```text
Module
Problem Template
Problem Instance
Practice Session
Assessment Assignment
Assessment Attempt
Student Action
Attempt Response
Score Result
Mastery Update
```

## Problem template

A problem template defines a family of equivalent tasks.

Example:

```json
{
  "id": "binary-search-find-target",
  "moduleId": "binary-search",
  "version": 1,
  "difficulty": "introductory",
  "taskType": "step-sequence",
  "generator": "generateSortedArrayTarget",
  "scoringPolicy": "binary-search-standard-v1"
}
```

## Problem instance

A problem instance is generated from a template and seed.

```json
{
  "templateId": "binary-search-find-target",
  "seed": "BS-20260711-48192",
  "input": {
    "values": [4, 9, 13, 18, 24, 31, 42],
    "target": 31
  },
  "expectedStepsHash": "server-generated-hash",
  "moduleVersion": "1.0.0"
}
```

The seed must be stored with the session or attempt.

## Seed rules

- The server issues assessment seeds.
- Practice may use client-generated seeds only for non-recorded exploration.
- The same seed and module version must reproduce the same problem.
- The seed must not expose the complete answer.
- The server must retain enough information to validate the attempt.

## Practice-session flow

```text
Student selects practice
    ↓
System creates practice session
    ↓
Problem instance is generated
    ↓
Student submits prediction or action
    ↓
System validates action
    ↓
Immediate feedback is shown
    ↓
Student retries or requests hint
    ↓
Session is completed or abandoned
```

## Assessment-attempt flow

```text
Student opens assigned assessment
    ↓
Server checks eligibility
    ↓
Server creates attempt and problem instance
    ↓
Attempt timer starts
    ↓
Student submits actions
    ↓
Server records and validates actions
    ↓
Student submits attempt
    ↓
Server calculates official score
    ↓
Attempt is locked
    ↓
Mastery is updated
```

## Attempt states

```text
created
started
in_progress
paused
submitted
graded
expired
abandoned
invalidated
```

Allowed transitions must be enforced server-side.

Example:

```text
created → started → in_progress → submitted → graded
```

## Practice behavior

Practice mode should support:

- Unlimited or configurable retries
- Immediate correctness feedback
- Step explanations
- Optional hints
- Correct-answer reveal after a threshold
- New equivalent problem
- Resume within a reasonable period

Practice should record:

- First response
- Final response
- Retry count
- Hint use
- Time per step
- Completion

## Assessment behavior

Assessment mode should support:

- Assignment availability window
- Attempt limits
- Optional time limit
- Configurable feedback policy
- Configurable hint policy
- Server-side validation
- Attempt lock after submission
- Module version retention
- Score recalculation

Assessment mode should not allow:

- Client-submitted final score as the source of truth
- Changing the problem seed after attempt start
- Reopening a submitted attempt without an instructor-authorized workflow
- Accessing another student's attempt
- Revealing hidden expected states through the API

## Action types

Standard action types:

```text
select
predict
enter-value
drag
swap
insert
remove
connect
choose-direction
mark-visited
update-boundary
submit-sequence
diagnose-error
explain
```

Each module defines which actions are valid for each step.

## Action payload

```json
{
  "attemptId": "uuid",
  "stepNumber": 3,
  "actionType": "update-boundary",
  "payload": {
    "boundary": "low",
    "value": 5
  },
  "clientEventId": "uuid",
  "clientTimestamp": "2026-07-11T05:30:00.000Z"
}
```

The server must derive the student identity from the authenticated session.

## Action validation result

```json
{
  "accepted": true,
  "isCorrect": false,
  "stepCompleted": false,
  "attemptNumber": 2,
  "misconceptionCode": "BS02",
  "feedbackPolicy": "deferred",
  "nextAllowedActions": ["update-boundary"]
}
```

Do not return hidden expected values during restricted assessment.

## Scoring dimensions

A module may score:

- Correct intermediate actions
- Correct final state
- Correct explanation
- First-attempt accuracy
- Hint independence
- Completion
- Valid operation sequence

## Default score model

Suggested initial model:

| Dimension | Weight |
|---|---:|
| Correct intermediate actions | 60% |
| Correct final state | 20% |
| Correct reasoning | 10% |
| Hint independence | 5% |
| Completion within expected range | 5% |

The time component should remain small.

Speed must not outweigh correctness.

## Module-specific scoring

### Arrays

- Correct shift order
- Correct insertion or deletion index
- Correct final array

### Stack

- Correct LIFO operation
- Correct top value
- No invalid underflow action

### Queue

- Correct FIFO operation
- Correct front and rear updates
- Correct final queue

### Binary search

- Correct midpoint
- Correct low and high updates
- Correct search result
- No return to discarded range

### Sorting

- Correct compared elements
- Correct swap or placement
- Correct algorithm-specific intermediate states
- Correct final array

### BST

- Correct left or right decision
- Correct parent
- Correct insertion position
- Correct traversal sequence

## Partial credit

Partial credit should be based on meaningful algorithm steps.

Do not award most of the score for the final state when the process matters.

Example:

A student who manually sorts the array but does not follow insertion sort should not receive full insertion-sort credit.

## Hint policy

Hint levels:

```text
Level 1: Restate the rule
Level 2: Narrow the valid choices
Level 3: Identify the relevant element or variable
Level 4: Reveal the correct next action
```

Suggested penalties:

| Hint level | Suggested deduction |
|---|---:|
| 1 | 0% |
| 2 | 2% |
| 3 | 5% |
| 4 | 10% for the affected step |

In practice mode, penalties may be shown only as learning analytics and not affect a grade.

## Retry policy

Record:

- First attempt correctness
- Number of retries
- Final correctness

Do not overwrite the first response.

The first response is valuable for misconception analysis.

## Time policy

Track:

- Time to first action
- Time per step
- Paused duration
- Total active duration

Do not treat background browser time as active work.

The client may emit focus and visibility events, but the server should calculate durations conservatively.

## Assignment configuration

```json
{
  "moduleId": "binary-search",
  "templateIds": ["binary-search-find-target"],
  "availableFrom": "2026-08-01T00:00:00+08:00",
  "availableUntil": "2026-08-08T23:59:59+08:00",
  "attemptLimit": 2,
  "timeLimitMinutes": 20,
  "passingScore": 75,
  "feedbackMode": "after-submission",
  "hintPolicy": "disabled",
  "scorePolicy": "best"
}
```

## Score policies

Supported assignment policies:

```text
best
latest
average
first
```

Default recommendation:

```text
best for formative classroom use
latest for mastery retakes
first for controlled measurement
```

## Server-side validation

The server should:

1. Load the attempt.
2. Verify authenticated ownership.
3. Verify attempt state.
4. Verify module and problem version.
5. Recreate or load the expected step.
6. Validate the submitted action.
7. Store the action and result.
8. Update the attempt state.
9. Return only feedback allowed by policy.

## Idempotency

Every action must include a client-generated event ID.

The server should reject or safely return the existing result for duplicates.

This prevents double submissions caused by unstable connections.

## Offline and recovery behavior

For recorded assessment:

- Do not promise full offline support in the first release.
- Queue only unsent actions temporarily.
- Show connection state.
- Prevent final submission until actions are synchronized.
- Resume an in-progress attempt when allowed.
- Never silently discard a recorded action.

## Suggested API contract

### Start practice

```text
POST /api/visualdsa/practice-sessions
```

### Submit practice action

```text
POST /api/visualdsa/practice-sessions/:sessionId/actions
```

### Complete practice

```text
POST /api/visualdsa/practice-sessions/:sessionId/complete
```

### Start assessment

```text
POST /api/visualdsa/assessment-attempts
```

### Submit assessment action

```text
POST /api/visualdsa/assessment-attempts/:attemptId/actions
```

### Submit assessment

```text
POST /api/visualdsa/assessment-attempts/:attemptId/submit
```

### Resume attempt

```text
GET /api/visualdsa/assessment-attempts/:attemptId
```

## Security requirements

- Use authenticated session identity.
- Enforce student ownership.
- Enforce instructor class access.
- Validate all input.
- Apply rate limits.
- Do not expose answer keys.
- Do not trust client time or score.
- Store module version.
- Log administrative invalidation.
- Keep assessment routes separate from public demo routes.

## Practice and assessment acceptance criteria

```text
[ ] Practice and assessment are separate modes
[ ] Server issues assessment problem seeds
[ ] Same seed reproduces same problem
[ ] Attempt states are enforced
[ ] Official score is server-calculated
[ ] First response is preserved
[ ] Retries and hints are recorded
[ ] Partial credit follows module rules
[ ] Duplicate actions are handled safely
[ ] Unauthorized attempt access is rejected
[ ] Submitted attempts are locked
[ ] Tests cover state transitions and scoring
```
