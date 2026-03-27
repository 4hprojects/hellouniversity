# Release Note - 2026-03-27

## Summary

This release strengthens quiz delivery on both the teacher and student sides.

## Included Changes

- Teacher quiz assignment controls are more granular:
  - `/teacher/quizzes` now includes an `Add Student` action for class-linked quizzes
  - teachers can load the linked roster, assign a quiz to selected students, or reset access to the whole class
  - selected-student quiz access now persists through the existing class-quiz assignment model
- Student quiz completion flow is more guided:
  - the responder now includes a sticky progress shell with answered, remaining, and required-missing counts
  - students now reach a dedicated review step before final submit
  - review can jump back to a specific section/question for fixes
  - missing required answers now trigger a warning-and-confirm flow instead of a silent submit
  - autosave, empty, load-failure, and submit-failure states now render clearly inside the responder shell
- Product notes were updated:
  - `docs/hellouniversity.md`
  - `docs/teacher-quiz-builder-notes.md`

## Verification

Verified with:

```powershell
npm test -- --runInBand tests/smoke/studentQuizPlayerClient.test.js tests/smoke/studentQuizRespondPage.test.js
npm test -- --runInBand tests/smoke/quizRuntimeApi.test.js
npm test -- --runInBand tests/smoke/teacherQuizBuilderApi.test.js
npm test -- --runInBand tests/smoke/teacherQuizDashboardClient.test.js tests/smoke/teacherQuizPages.test.js
```

Result: responder, runtime, builder-assignment, and teacher quiz dashboard smoke coverage passed.

## Git

- Branch: `main`
- Remote: `origin` (`https://github.com/4hprojects/hellouniversity.git`)
- Session commit: `731d904` `Enhance quiz responder and assignment flows`
