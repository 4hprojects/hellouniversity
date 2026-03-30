# ClassRush P3 QA Checklist

Use this checklist for the manual browser pass after the P3 rollout.

## Teacher Class Workspace

- Verify `/teacher/classes` on desktop, tablet, and mobile.
- Verify each rendered class card shows a same-tab `ClassRush` link.
- Open ClassRush from the class board and confirm it lands on `/teacher/live-games/new` with the launching class preselected.
- Resize the class board through edge widths and confirm card actions stay readable and clickable.

## Teacher Class Overview

- Verify `/teacher/classes/:classId` on desktop, tablet, and mobile.
- Confirm the `Manage This Class` grid shows `Create ClassRush`.
- Confirm the `Follow Up` quick links include `Create ClassRush` and `ClassRush Dashboard`.
- Open ClassRush from the overview page and confirm it uses the current class as the starting prefill.

## ClassRush Builder Launch Context

- Verify the builder shows the class-workspace context strip only when launched with `launchContext=class-workspace`.
- Confirm the strip shows the selected class label once classes finish loading.
- Confirm `Back to Class` returns to the launching class workspace.
- Confirm the linked-class selector stays editable.
- Clear the selector and verify the game can remain unlinked.
- Change to another active class and verify the new class becomes the saved linked class.
- Test an invalid or inaccessible `linkedClassId` in the URL and confirm the builder clears the selector and shows a non-blocking note.

## Existing ClassRush Flow

- From a class-aware launch, create or save a game, host it, join it from `/play`, finish the session, open report detail, and download CSV.
- Confirm the class-aware launch does not break pause/resume, join lock, or class-linked access rules.
- Confirm report detail and CSV export still work after entering from a class workspace.

## Responsive Checks

- Drag-resize `/teacher/classes`, `/teacher/classes/:classId`, and `/teacher/live-games/new` across desktop, tablet, and mobile widths.
- Check edge widths between breakpoints, not only fixed device presets.
- Verify no action rows overflow and no important ClassRush CTA becomes hidden or ambiguous.

## Notes

- Record any layout issue, missing prefill, bad fallback copy, or broken navigation in the session log before the next ClassRush planning pass.
