---
status: active
last_updated: 2026-07-11
phase: 3
---

# VisualDSA API and Security Contracts

## Purpose

This document defines the API boundary between the VisualDSA browser interface, the Express server, Supabase PostgreSQL, and existing HelloUniversity authentication.

## Architecture

```text
Browser
    ↓ authenticated request
Express VisualDSA routes
    ↓
VisualDSA service layer
    ├── module engine
    ├── assessment validator
    ├── event writer
    ├── mastery calculator
    └── authorization checks
    ↓
Supabase PostgreSQL
```

The browser must never directly calculate or write an official assessment score.

## Suggested repository structure

```text
routes/
└── visualDsaApiRoutes.js

app/visualdsa/
├── moduleRegistry.js
├── visualDsaService.js
├── practiceService.js
├── assessmentService.js
├── eventService.js
├── masteryService.js
├── analyticsService.js
├── authorization.js
├── validators.js
└── modules/
    ├── arrays.js
    ├── stacks.js
    └── queues.js

tests/
├── smoke/
│   └── visualDsaApiRoutes.test.js
└── visualdsa/
    ├── arrayModule.test.js
    ├── stackModule.test.js
    ├── queueModule.test.js
    ├── assessmentService.test.js
    └── eventService.test.js
```

## Authentication model

Use the existing Express session.

Required session-derived properties:

```text
userId
role
```

Where class and student identity differ from the user ID, resolve them server-side.

Never accept the authoritative student ID from the request body.

## Roles

### Visitor

Allowed:

- View public VisualDSA pages
- Use unrecorded guided and exploration demos

Not allowed:

- Start recorded practice
- Start assessment
- View progress
- View analytics

### Student

Allowed:

- Start own practice sessions
- Start eligible assessment attempts
- Submit own actions
- View own attempts and mastery

Not allowed:

- View another student's data
- Change assignment rules
- Invalidate attempts
- Access instructor aggregates

### Instructor

Allowed:

- Create assignments for authorized classes
- View authorized class analytics
- View enrolled student drill-down
- Invalidate attempts with a reason
- Export authorized reports

### Administrator

Allowed:

- Manage modules
- View wider operational data according to platform policy
- Recalculate aggregates
- Review audit records

## Public module endpoints

### Get VisualDSA module metadata

```text
GET /api/visualdsa/modules/:moduleKey
```

Response:

```json
{
  "moduleKey": "arrays",
  "version": "1.0.0",
  "title": "Array Operations",
  "lessonHref": "/data-structures-and-algorithms/arrays",
  "supportedModes": ["guided", "exploration", "practice", "assessment"],
  "status": "active"
}
```

Do not return scoring secrets or expected assessment steps.

## Practice endpoints

### Start practice

```text
POST /api/visualdsa/practice-sessions
```

Request:

```json
{
  "moduleKey": "arrays",
  "templateKey": "array-insert",
  "difficulty": "introductory"
}
```

Response:

```json
{
  "sessionId": "uuid",
  "moduleVersion": "1.0.0",
  "problem": {
    "seed": "AR-P-48192",
    "input": {
      "values": [4, 7, 12, 18],
      "insertValue": 9,
      "targetIndex": 2
    }
  },
  "feedbackMode": "immediate"
}
```

### Submit practice action

```text
POST /api/visualdsa/practice-sessions/:sessionId/actions
```

Request:

```json
{
  "clientEventId": "uuid",
  "stepNumber": 2,
  "actionType": "move",
  "payload": {
    "fromIndex": 2,
    "toIndex": 3
  },
  "clientTimestamp": "2026-07-11T06:00:00.000Z"
}
```

Practice response may include instructional feedback.

### Complete practice

```text
POST /api/visualdsa/practice-sessions/:sessionId/complete
```

Response:

```json
{
  "status": "completed",
  "firstAttemptAccuracy": 75,
  "finalAccuracy": 100,
  "hintsUsed": 1,
  "recommendedNext": {
    "type": "assessment",
    "moduleKey": "arrays"
  }
}
```

## Assessment endpoints

### Start assessment attempt

```text
POST /api/visualdsa/assessment-attempts
```

Request:

```json
{
  "assignmentId": "uuid"
}
```

Server checks:

- Student is authenticated
- Student belongs to the class
- Assignment is published
- Availability window is valid
- Attempt limit is not exceeded
- Module version is available

Response:

```json
{
  "attemptId": "uuid",
  "attemptNumber": 1,
  "moduleKey": "arrays",
  "moduleVersion": "1.0.0",
  "problem": {
    "seed": "AR-A-31092",
    "input": {
      "values": [3, 8, 11, 15],
      "insertValue": 6,
      "targetIndex": 1
    }
  },
  "expiresAt": "2026-07-11T06:20:00.000Z",
  "feedbackMode": "after_submission"
}
```

### Submit assessment action

```text
POST /api/visualdsa/assessment-attempts/:attemptId/actions
```

Request:

```json
{
  "clientEventId": "uuid",
  "stepNumber": 1,
  "actionType": "select-index",
  "payload": {
    "index": 1
  },
  "clientTimestamp": "2026-07-11T06:02:00.000Z"
}
```

Response under deferred feedback:

```json
{
  "accepted": true,
  "recorded": true,
  "stepCompleted": true,
  "nextStepNumber": 2
}
```

Do not return the expected value when feedback is deferred.

### Resume assessment

```text
GET /api/visualdsa/assessment-attempts/:attemptId
```

Return:

- Public problem input
- Submitted action state needed to resume
- Current step
- Remaining time
- Allowed controls

Do not return hidden validation data.

### Submit assessment

```text
POST /api/visualdsa/assessment-attempts/:attemptId/submit
```

Response:

```json
{
  "status": "graded",
  "score": {
    "raw": 16,
    "maximum": 20,
    "percentage": 80
  },
  "masteryStatus": "proficient",
  "feedbackAvailable": true
}
```

## Student endpoints

```text
GET /api/visualdsa/me/progress
GET /api/visualdsa/me/attempts
GET /api/visualdsa/me/recommendations
```

All identity must be session-derived.

## Instructor endpoints

```text
GET  /api/visualdsa/instructor/classes
GET  /api/visualdsa/instructor/classes/:classId/overview
GET  /api/visualdsa/instructor/classes/:classId/mastery
GET  /api/visualdsa/instructor/classes/:classId/misconceptions
GET  /api/visualdsa/instructor/classes/:classId/students/:studentId
POST /api/visualdsa/instructor/assignments
PATCH /api/visualdsa/instructor/assignments/:assignmentId
POST /api/visualdsa/instructor/attempts/:attemptId/invalidate
```

Every instructor endpoint must verify class authorization.

## Error response format

```json
{
  "error": {
    "code": "ATTEMPT_LIMIT_REACHED",
    "message": "No assessment attempts remain for this assignment.",
    "requestId": "uuid"
  }
}
```

Do not return stack traces in production.

## Recommended error codes

```text
AUTH_REQUIRED
ROLE_FORBIDDEN
CLASS_ACCESS_DENIED
MODULE_NOT_FOUND
MODULE_VERSION_UNAVAILABLE
INVALID_INPUT
PRACTICE_SESSION_NOT_FOUND
ATTEMPT_NOT_FOUND
ATTEMPT_ACCESS_DENIED
ATTEMPT_LIMIT_REACHED
ATTEMPT_NOT_ACTIVE
ATTEMPT_EXPIRED
ATTEMPT_ALREADY_SUBMITTED
ACTION_OUT_OF_SEQUENCE
DUPLICATE_EVENT
ASSIGNMENT_NOT_AVAILABLE
VALIDATION_FAILED
RATE_LIMITED
```

## Validation rules

Use centralized validators for:

- UUIDs
- Module keys
- Action types
- Step number
- Input size
- Numeric value range
- Payload shape
- Event timestamps
- Assignment settings

Reject unknown properties for security-sensitive assessment payloads where practical.

## CSRF protection

Because HelloUniversity uses cookie-based sessions, VisualDSA write endpoints should use CSRF protection.

At minimum:

- SameSite cookies
- Origin or referer validation
- CSRF token for state-changing routes

Do not rely on CORS alone.

## Rate limiting

Recommended initial limits:

### Public exploration

```text
60 requests per minute per IP
```

### Practice actions

```text
120 actions per minute per authenticated user
```

### Assessment actions

```text
120 actions per minute per authenticated user
```

### Assignment creation and exports

```text
20 requests per minute per instructor
```

Rate limits should prevent abuse without blocking legitimate step-by-step work.

## Authorization checks

### Practice session ownership

```text
session.student_id === authenticatedStudentId
```

### Assessment ownership

```text
attempt.student_id === authenticatedStudentId
```

### Instructor class access

```text
authenticated instructor is assigned to class
or has approved administrator role
```

### Attempt invalidation

Requires:

- Instructor or administrator authorization
- Non-empty reason
- Audit record
- Attempt must belong to authorized class

## Assessment integrity

The server must:

- Issue the problem seed
- Recreate or load expected steps
- Validate every scored action
- Calculate official score
- Lock submitted attempts
- Reject events after submission
- Store module and scoring versions
- Ignore client-provided correctness
- Ignore client-provided final score

## Event integrity

The API should set:

```text
student_id
server_timestamp
is_correct
misconception_code
validation_version
```

The client may propose:

```text
client_event_id
client_timestamp
action payload
```

## Logging and audit

Log:

- Attempt creation
- Attempt submission
- Attempt expiration
- Attempt invalidation
- Assignment change
- Module publication
- Aggregate recalculation

Do not log hidden answers in general application logs.

## Response privacy

Student responses must not include:

- Other student identifiers
- Class-wide raw events
- Hidden expected steps
- Instructor-only notes
- Service-role credentials

## API test matrix

| Scenario | Expected result |
|---|---|
| Visitor starts practice | 401 |
| Student starts own practice | 201 |
| Student reads another attempt | 403 or 404 |
| Student exceeds attempt limit | 409 |
| Student submits duplicate event | Same stored result or 409 |
| Student acts after submission | 409 |
| Instructor views unauthorized class | 403 |
| Instructor invalidates without reason | 400 |
| Expired attempt receives action | 409 |
| Client submits fake score | Ignored |
| Invalid module action | 422 |

## API acceptance criteria

```text
[ ] Session identity is authoritative
[ ] Every write route validates CSRF
[ ] Instructor class access is checked
[ ] Assessment score is server-controlled
[ ] Hidden answers are not returned
[ ] Duplicate events are idempotent
[ ] Attempt state transitions are enforced
[ ] Errors use stable codes
[ ] Rate limits are configured
[ ] Security tests cover cross-user access
```
