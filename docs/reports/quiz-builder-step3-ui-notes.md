# Quiz Builder Step 3 UI Notes
Updated: 2026-03-26

## Summary

Step 3 in the teacher quiz builder was simplified to remove redundant status controls and tighten the settings layout.

## Changes

- Removed the editable quiz `Status` field from Step 3.
- Kept quiz creation defaulting to `draft` through builder state and API normalization.
- Moved `Show Score` into the `Review quiz details` group.
- Added an `info` tooltip to `Show Score` explaining:
  - `After Review`
  - `Immediately`
  - `Hidden`
- Moved the help tooltip above the trigger so it does not interfere with the score dropdown hover area.

## Rationale

- `Save Draft` and `Publish` already define the primary lifecycle actions, so exposing status in the form was redundant.
- `Show Score` is part of quiz-review behavior and fits better with quiz type than with schedule timing.
- The tooltip needed to stay out of the dropdown hit area to avoid accidental hover overlap.
