---
status: active
last_updated: 2026-07-11
phase: 2
---

# VisualDSA Interaction Event Model

## Purpose

This document defines the raw interaction events VisualDSA records for practice, assessment, and instructor analytics.

The final score is not enough.

VisualDSA must preserve enough evidence to explain how the student reached the result.

## Event design principles

1. Record meaningful learning actions, not every mouse movement.
2. Preserve the first response.
3. Separate raw events from calculated analytics.
4. Use stable event names.
5. Version module and event definitions.
6. Derive identity from the authenticated session.
7. Make event ingestion idempotent.
8. Avoid storing unnecessary personal data.
9. Store timestamps in UTC.
10. Keep analytics formulas documented.

## Event categories

### Session lifecycle

```text
module_opened
mode_selected
practice_started
assessment_started
session_paused
session_resumed
session_completed
session_abandoned
assessment_submitted
assessment_graded
```

### Visualization control

```text
visualization_started
play_pressed
pause_pressed
step_advanced
step_reversed
reset_pressed
speed_changed
custom_input_submitted
example_generated
```

### Learning interaction

```text
prediction_submitted
action_submitted
action_correct
action_incorrect
hint_requested
hint_viewed
retry_started
step_completed
explanation_viewed
pseudocode_viewed
```

### System and integrity

```text
connection_lost
connection_restored
event_retried
event_duplicate
attempt_expired
attempt_invalidated
validation_error
```

## Core event schema

```json
{
  "eventId": "uuid",
  "eventType": "action_submitted",
  "schemaVersion": 1,

  "studentId": "server-derived",
  "classId": "uuid",
  "courseId": "uuid",

  "lessonId": "binary-search",
  "moduleId": "binary-search",
  "moduleVersion": "1.0.0",
  "mode": "assessment",

  "sessionId": "uuid",
  "attemptId": "uuid",
  "problemTemplateId": "binary-search-find-target",
  "problemSeed": "BS-20260711-48192",

  "stepNumber": 3,
  "actionType": "update-boundary",
  "submittedValue": {
    "boundary": "low",
    "value": 5
  },
  "expectedValueRef": "server-only-or-redacted",
  "isCorrect": false,
  "attemptNumber": 1,
  "hintLevel": 0,
  "responseTimeMs": 8421,
  "misconceptionCode": "BS02",

  "clientTimestamp": "2026-07-11T05:30:00.000Z",
  "serverTimestamp": "2026-07-11T05:30:00.214Z"
}
```

## Privacy rule

Do not store the student's name or email in every event.

Use the internal student ID and join profile information only when displaying authorized reports.

## Required event fields

| Field | Required | Purpose |
|---|---:|---|
| `eventId` | Yes | Idempotency |
| `eventType` | Yes | Stable event classification |
| `schemaVersion` | Yes | Future migration |
| `studentId` | Yes for authenticated learning events | Ownership |
| `lessonId` | Yes | Curriculum mapping |
| `moduleId` | Yes | Visualizer mapping |
| `moduleVersion` | Yes | Reproducibility |
| `mode` | Yes | Guided, exploration, practice, assessment |
| `sessionId` | Yes | Session grouping |
| `attemptId` | For assessment events | Attempt grouping |
| `problemSeed` | For generated tasks | Reproducibility |
| `stepNumber` | For step actions | Sequence analysis |
| `serverTimestamp` | Yes | Authoritative timing |

## Event naming convention

Use lowercase snake case.

Good:

```text
action_submitted
hint_requested
assessment_submitted
```

Avoid:

```text
clickedThing
wrongAnswerEvent2
studentDidSomething
```

## Event payload policy

Event-specific data should use a structured `metadata` object.

Example:

```json
{
  "eventType": "speed_changed",
  "metadata": {
    "from": 1,
    "to": 0.5
  }
}
```

Do not add unstable top-level fields for every new module.

## First-response preservation

For each step:

- Store the first submitted action.
- Store every retry as a separate event.
- Mark the final accepted action.
- Do not update the first event in place.

This supports:

- First-attempt accuracy
- Guessing analysis
- Retry patterns
- Misconception frequency

## Response-time calculation

Response time should measure active time between:

```text
step presented
→ first meaningful student action
```

Subtract:

- Explicit pauses
- Long background-tab intervals
- Connection interruption when detectable

Keep both raw timestamps and calculated duration.

## Misconception mapping

A misconception event should reference:

- Module
- Step
- Submitted action
- Rule violated
- Misconception code
- Classifier version

Example:

```json
{
  "misconceptionCode": "BS04",
  "classifierVersion": 1,
  "rule": "searched_discarded_range"
}
```

## Initial misconception code catalog

### Arrays

```text
AR01 Incorrect target index
AR02 Shifted in the wrong direction
AR03 Overwrote a value before shifting
AR04 Incorrect final size
AR05 Confused access with search
```

### Stacks

```text
ST01 Removed from the bottom
ST02 Predicted FIFO behavior
ST03 Ignored underflow
ST04 Incorrect top pointer
ST05 Peek changed the stack
```

### Queues

```text
QU01 Removed from the rear
QU02 Added at the front
QU03 Failed to update front
QU04 Failed to update rear
QU05 Misidentified empty queue
QU06 Incorrect circular wraparound
```

### Binary search

```text
BS01 Incorrect midpoint
BS02 Incorrect low update
BS03 Incorrect high update
BS04 Returned to discarded range
BS05 Ignored sorted-input requirement
BS06 Stopped before confirming absence
```

### Sorting

```text
SO01 Compared the wrong elements
SO02 Applied the wrong swap rule
SO03 Ended a pass too early
SO04 Changed the sorted region
SO05 Produced the final array with the wrong algorithm
SO06 Misidentified the insertion position
```

### Binary search trees

```text
BT01 Incorrect left or right choice
BT02 Inserted under the wrong parent
BT03 Broke the tree connection
BT04 Incorrect duplicate handling
BT05 Incorrect traversal order
BT06 Confused depth with height
```

## Raw-event storage

Recommended logical table:

```text
visualdsa_interaction_events
```

Suggested fields:

```text
id
event_id
schema_version
student_id
class_id
course_id
lesson_id
module_id
module_version
mode
session_id
attempt_id
problem_template_id
problem_seed
event_type
step_number
action_type
submitted_value_json
is_correct
attempt_number
hint_level
response_time_ms
misconception_code
metadata_json
client_timestamp
server_timestamp
created_at
```

## Immutability

Raw learning events should be append-only.

Corrections should be recorded through:

- A new event
- An invalidation record
- A recalculation job

Do not silently modify historical student actions.

## Event ingestion endpoint

```text
POST /api/visualdsa/events
```

Recommended behavior:

1. Authenticate the session.
2. Validate the event schema.
3. Replace any client identity field with server-derived identity.
4. Verify session or attempt ownership.
5. Check duplicate `eventId`.
6. Store the event.
7. Return the stored event reference.

For assessment actions, prefer action-specific endpoints that also create events internally. Do not rely on the browser to truthfully label correctness.

## Client event queue

The client should:

- Assign UUIDs before sending.
- Queue unsent events temporarily.
- Retry with backoff.
- Stop retrying on validation failure.
- Show connection status during assessment.
- Preserve order for step actions.

## Event retention

Keep raw events long enough to support:

- Research analysis
- Score audit
- Misconception recalculation
- Instructor reports

The final retention period should follow the approved research and institutional data policy.

## Analytics derived from events

Examples:

```text
first_attempt_accuracy
average_step_response_time
hint_dependency_rate
retry_rate
completion_rate
abandonment_rate
most_common_misconception
practice_to_assessment_change
```

## Event-quality checks

Automated checks should detect:

- Missing module version
- Missing attempt ID for assessment
- Duplicate event ID
- Step numbers out of sequence
- Negative response time
- Events after submission
- Student mismatch
- Unknown misconception code
- Unknown event type

## Event model acceptance criteria

```text
[ ] Event names follow one convention
[ ] Event schema is versioned
[ ] Student identity is server-derived
[ ] First response is preserved
[ ] Retries are separate events
[ ] Events are idempotent
[ ] Raw events are append-only
[ ] Misconception codes are versioned
[ ] Assessment correctness is server-derived
[ ] Connection recovery does not duplicate events
[ ] Event-quality tests exist
```
