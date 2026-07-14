---
status: active
last_updated: 2026-07-11
phase: 2
---

# VisualDSA Learning Analytics

## Purpose

This document defines the student and instructor analytics produced from VisualDSA practice sessions, assessment attempts, and interaction events.

The purpose is instructional action.

A dashboard should help answer:

```text
What does the student understand?
Where is the student struggling?
What should the instructor review next?
```

## Analytics layers

```text
Raw interaction events
    ↓
Attempt summaries
    ↓
Topic mastery
    ↓
Class aggregates
    ↓
Instructor intervention signals
```

## Core principles

1. Keep raw events separate from summaries.
2. Document every metric formula.
3. Show uncertainty when data is limited.
4. Avoid labeling a student from one attempt.
5. Separate engagement from mastery.
6. Use misconception patterns to support reteaching.
7. Allow instructors to inspect the evidence behind an aggregate.
8. Recalculate aggregates when scoring rules change.
9. Limit instructors to authorized classes.
10. Do not expose another student's data to students.

## Student dashboard

### Required sections

- Current DSA course
- Assigned VisualDSA activities
- Practice history
- Assessment history
- Mastery by topic
- Common personal errors
- Recommended review
- Recent activity

### Example mastery display

| Topic | Status | Score |
|---|---|---:|
| Arrays | Mastered | 88% |
| Stacks | Mastered | 84% |
| Queues | Developing | 71% |
| Binary Search | Needs Review | 58% |
| Sorting | Not Started | — |
| BST | Not Started | — |

## Mastery status thresholds

Initial recommendation:

```text
Mastered: 85 to 100
Proficient: 75 to 84
Developing: 60 to 74
Needs Review: below 60
Not Started: no valid evidence
```

These thresholds must remain configurable.

## Mastery calculation

Recommended initial formula:

```text
topic_mastery =
  70% assessment performance
  + 20% practice first-attempt accuracy
  + 10% completion consistency
```

Do not include raw time as a direct mastery score.

Time may appear as supporting context.

## Assessment contribution

When multiple attempts exist, use the assignment policy:

```text
best
latest
average
first
```

The mastery record must store which policy produced the score.

## Practice contribution

Practice should emphasize:

- First-attempt accuracy
- Successful completion
- Hint dependence
- Improvement across retries

Do not reward unlimited guessing.

## Student recommendations

Recommendation rules may include:

```text
If midpoint errors occur repeatedly
→ Review Binary Search: Active Range and Midpoint

If queue front/rear errors occur repeatedly
→ Repeat Queue Practice: Front and Rear Tracking

If assessment score is high but hint use is high
→ Complete one independent practice set

If practice is complete but assessment is missing
→ Take the recorded assessment
```

Recommendations should be explainable.

## Instructor dashboard

### Class overview

Show:

- Total enrolled students
- Students who started
- Students who completed practice
- Students who completed assessment
- Average mastery
- Median mastery
- Average attempts
- Average first-attempt accuracy
- Common misconception count
- Students needing review

### Mastery matrix

```text
Student        Array   Stack   Queue   Search   Sorting   BST
Student A       90      85      77       68        61     55
Student B       88      91      89       82        80     76
Student C       72      60      54       49        45     42
```

Use accessible labels and table alternatives.

Do not rely only on heatmap color.

### Common misconception report

Example:

| Rank | Misconception | Students | Events |
|---|---|---:|---:|
| 1 | Incorrect binary-search midpoint | 14 | 31 |
| 2 | Queue front/rear confusion | 11 | 24 |
| 3 | Wrong BST left/right choice | 9 | 18 |
| 4 | Bubble-sort pass ended early | 8 | 15 |

The report should allow drill-down to:

- Affected students
- Related lesson
- Related module step
- Suggested intervention

### Difficult-step report

For each module step:

- First-attempt accuracy
- Average retries
- Hint use rate
- Average active response time
- Abandonment rate

A difficult step is not determined by time alone.

## Student drill-down

Required sections:

```text
Student profile summary
Assigned activities
Practice history
Assessment history
Topic mastery
Misconception pattern
Response-time pattern
Recommended intervention
Raw-attempt evidence
```

Example:

```text
Topic: Binary Search
Assessment score: 68%
Attempts: 3
First-attempt accuracy: 54%
Hints used in practice: 4
Primary misconception: BS02 Incorrect low update
Recommended intervention: Review active search boundaries
```

## Intervention signals

Initial rules:

### High-priority intervention

- Assessment below 60 after two attempts
- Same misconception appears in three or more independent steps
- Practice completed but assessment accuracy drops sharply
- Repeated invalid actions suggest a core rule misunderstanding
- Activity abandonment occurs twice on the same module

### Medium-priority intervention

- Mastery between 60 and 74
- High hint use
- Slow completion with correct results
- Incomplete assigned activity near the deadline

### No automatic concern

- One isolated incorrect action
- One long step without repeated errors
- High exploration activity without low assessment performance

## Analytics formulas

### First-attempt accuracy

```text
correct first responses
÷
total scored steps
× 100
```

### Hint dependency rate

```text
steps with hint use
÷
total completed steps
× 100
```

### Retry rate

```text
steps requiring more than one response
÷
total scored steps
× 100
```

### Completion rate

```text
completed assigned activities
÷
assigned activities
× 100
```

### Abandonment rate

```text
abandoned sessions
÷
started sessions
× 100
```

### Practice-to-assessment change

```text
assessment first-attempt accuracy
-
final practice first-attempt accuracy
```

Interpret this carefully.

A negative difference may indicate difficulty transfer, assessment pressure, or different problem complexity.

## Low-data handling

When fewer than three valid scored steps exist:

```text
Display:
Insufficient evidence

Do not display:
Needs Review
At Risk
Mastered
```

Do not overinterpret one response.

## Aggregation schedule

Recommended:

- Update attempt summary immediately after submission.
- Update student mastery immediately or through a short queue.
- Update class aggregates on demand or every few minutes.
- Allow full recalculation after scoring-rule changes.

## Suggested logical tables

```text
visualdsa_attempt_summaries
visualdsa_topic_mastery
visualdsa_misconception_summaries
visualdsa_class_aggregates
visualdsa_student_recommendations
```

Raw events remain in:

```text
visualdsa_interaction_events
```

## Instructor authorization

An instructor may view:

- Classes they own or are assigned to
- Students enrolled in those classes
- Activities assigned to those classes
- Aggregates from those classes

An administrator may view wider data based on existing platform policy.

## Research export

Authorized research export may include:

- De-identified participant ID
- Module ID and version
- Attempt score
- First-attempt accuracy
- Hint use
- Retry count
- Response times
- Misconception codes
- Completion status

Do not include names or emails unless explicitly approved and necessary.

## Export formats

Instructor operational exports:

- CSV
- PDF summary

Research exports:

- CSV
- JSON where needed for event analysis

## Dashboard acceptance criteria

```text
[ ] Student sees only personal data
[ ] Instructor sees only authorized classes
[ ] Every displayed metric has a formula
[ ] Raw evidence can explain summaries
[ ] Low-data states are handled
[ ] Mastery thresholds are configurable
[ ] Misconception reports link to lessons
[ ] Recommendations are explainable
[ ] Aggregates can be recalculated
[ ] Exports respect authorization
[ ] Mobile tables remain usable
[ ] Color is not the only status cue
```

## Initial analytics scope

The first research prototype must implement:

1. Student topic mastery
2. Student attempt history
3. Class completion
4. Class mastery matrix
5. Common misconception report
6. Student drill-down
7. Recommended intervention text

Advanced predictive models are outside the initial scope.

The research value comes from interpretable instructional analytics, not opaque prediction.
