# ClassRush Next Update Backlog

This file turns the next-update scope into a strict implementation backlog.

It should be reviewed before any ClassRush feature work starts.

Use this together with:

- `docs/classrush/classrush-current-state-and-next-update.md`
- `docs/classrush/classrush-prd.md`

Priority rule:

- `P1` must be completed first because it sets the baseline contracts and academic guardrails for the rest of the update.
- `P2` added the main feature expansion once the baseline was stable.
- `P3` now finishes the rollout, teacher entry-path polish, and verification work before any broader ClassRush expansion.

Status note:

- `P1` was implemented on 2026-03-30.
- `P2` was implemented on 2026-03-30.
- `P3` was implemented on 2026-03-30.
- The planned ClassRush P1-P3 rollout wave is complete.

## P1

Status: Implemented on 2026-03-30

### P1-01 Foundation cleanup and naming normalization

Needed work:

- normalize ClassRush naming across docs, runtime notes, and implementation references
- treat current route ownership and current runtime behavior as the baseline
- clean legacy internal names such as `odId` and `odName`
- standardize core names such as `timeLimitSeconds` and `showLeaderboardAfterEach`

Why this is first:

- this reduces confusion before new builder, socket, and report work is added
- this prevents more mixed naming from spreading across the feature

### P1-02 Academic linkage foundation

Needed work:

- allow a ClassRush game or live session to link to a class
- require verified login for class-linked academic sessions
- ensure class-linked ClassRush sessions are treated as academic flows, not anonymous public-only sessions

Why this is first:

- class linkage changes how sessions are launched and who is allowed to join
- this is the minimum academic foundation before broader ClassRush expansion

### P1-03 Live session safety controls

Needed work:

- lock joining after session start
- pause a live session
- resume a live session

Why this is first:

- these controls improve classroom reliability immediately
- they affect the host flow and session state rules that later features will depend on

### P1-04 Report baseline improvements

Needed work:

- show non-responders in teacher reports
- show average response time clearly in teacher reports

Why this is first:

- these are direct teacher-value improvements using the current completed-session model
- they strengthen the reporting surface before export work is added

## P2

Status: Implemented on 2026-03-30

### P2-01 Builder expansion: poll

Needed work:

- add `poll` question type to the builder
- add the supporting live-session runtime behavior for poll questions
- ensure reports can display poll response distribution correctly

### P2-02 Builder expansion: type answer

Needed work:

- add `type_answer` question type to the builder
- add the supporting live-session runtime behavior for typed answers
- ensure teacher reports can display typed-answer results appropriately

### P2-03 Live session randomization controls

Needed work:

- add randomize answer order
- add randomize question order

Why this is P2:

- these are meaningful classroom controls, but they depend on the earlier session baseline being stable
- they also affect report readability and host/player synchronization

### P2-04 CSV export for completed sessions

Needed work:

- add export-ready CSV output for completed sessions
- keep CSV aligned with the current report model and new report fields added in P1

## P3

Status: Implemented on 2026-03-30

### P3-01 Teacher launch-path clarity

Needed work:

- make teacher launch paths clearer from the teaching workspace
- make it easier for teachers to reach ClassRush from the parts of the product where class work already happens
- keep class-linked launch behavior consistent with the academic linkage added in P1

Why this is P3:

- this is important for adoption, but it should follow the class-link and session-rule work first

### P3-02 Verification and coverage completion

Needed work:

- expand smoke coverage for new builder question types
- expand smoke coverage for class-linked and verified-login session rules
- expand smoke coverage for live-session controls and CSV export
- update ClassRush planning notes so they match the implemented runtime after the work is done
- run manual QA across teacher host, player join, reports, and responsive layouts

Why this is P3:

- this closes the implementation wave and prepares the feature for the next planning pass

## Not In This Backlog

The following items are intentionally not part of this update wave:

- self-paced assignment mode
- slide blocks or mixed lecture sequences
- team mode
- question banks and shared content libraries
- department or institution adoption dashboards
- gradebook sync or release workflows
- institution-wide collaboration and approval workflows
- AI-assisted generation or import flows
- broader mastery analytics
- institution event or tournament layers

## Review Summary

The planned implementation order is complete.

Future ClassRush work should now be chosen from `Not In This Backlog` or a new scoped follow-up backlog.
Do not reopen `P1`, `P2`, or `P3` unless the current academic/session baseline, rollout polish, or shipped gameplay expansion needs correction.
