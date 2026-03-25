# Teacher Quiz Builder Notes
Updated: 2026-03-25

## Scope

- Product area: `Teacher Quiz Builder`
- Main teacher routes:
  - `/teacher/quizzes`
  - `/teacher/quizzes/new`
  - `/teacher/quizzes/:quizId/edit`
  - `/teacher/quizzes/:quizId/preview`
- Builder page template:
  - `views/pages/teacher/quizzes/builder.ejs`
- Builder client:
  - `public/js/teacherQuizBuilder.js`
- Builder styles:
  - `public/css/teacher_quiz_builder.css`
- Builder API:
  - `routes/quizBuilderApiRoutes.js`

## Current Builder Direction

The quiz builder is now treated as a compact structured editor instead of a loose form page.

Current layout goals:
- stable card structure across desktop, tablet, and mobile
- compact spacing with less dead space
- predictable control placement for drag, move, duplicate, and delete actions
- consistent teacher-app typography instead of the legacy quiz font stack
- denser workflow panels for readiness, progress, and publishing state
- one consistent bottom-dock interaction model across desktop, tablet, and mobile
- progressive disclosure for optional question features instead of always-visible controls

## Current Dock Direction

The builder no longer uses separate desktop and mobile dock concepts.

Current dock goals:
- one shared bottom-fixed dock across all screen sizes
- same action order and action grouping on desktop, tablet, and mobile
- quiz title mirror and readiness state always visible in the dock
- quick access to:
  - preview
  - add section
  - add question
  - save draft
  - publish
- responsive density only:
  - desktop uses fuller text buttons with balanced widths
  - tablet and phone use icon-first controls to preserve horizontal space

Current dock behavior:
- `Preview` opens the saved teacher preview in a new tab
- preview saves first when the quiz has no saved draft yet
- preview also saves first when the builder has unsaved changes
- the visible dock `Questions` tab was removed to free space
- the hidden `Questions` tab remains in the DOM only for current tab/panel wiring
- settings are still reachable inside the builder, but they are no longer the dock’s primary action
- readiness chip now sits on the same row as the dock title input
- `Preview`, `Save Draft`, and `Publish` now share the same action group
- `Add Section` and `Add Question` remain grouped as the centered quick-add cluster on desktop
- tablet widths now follow the same icon-first dock button treatment as phone widths

## Preview Behavior

The current teacher preview should be understood as a saved teacher preview, not the real student runtime.

What `/teacher/quizzes/:quizId/preview` currently does:
- loads saved quiz data through the teacher quiz-builder API
- renders the quiz in a student-like layout for teacher checking
- shows disabled answer controls
- preserves section grouping and question order

What it does not do:
- start a real student attempt
- autosave answers
- submit a response
- enforce the full runtime access/attempt flow

Practical meaning:
- it is accurate enough for layout and question-surface checking
- it is not a full substitute for the real student runtime under `/api/quizzes*` and `take_quiz.js`

## Recent UX Changes

Implemented builder UX updates include:
- Builder now uses the same `Poppins` app typography as `/teacher/quizzes`.
- Legacy `/css/quiz.css` leakage was removed from the teacher builder route.
- Builder action groups were tightened into denser single-row controls where space allows.
- Question and section headers were reworked into a fixed top-bar layout:
  - left: identity label
  - middle: drag handle
  - right: action buttons
- Section action buttons now use icon-only controls with hover labels.
- Question action controls remain available across desktop, tablet, and mobile.
- The section `Add Question` menu now opens upward instead of dropping below the button.
- Shared scroll-to-top control was added to the builder and repositioned above the floating menu.
- Multiple choice authoring was clarified with explicit answer-mode guidance.
- Objective-answer selection no longer falls back to option A when a blank option is clicked.
- New multiple-choice questions now start with no selected correct answer.
- Optional question descriptions are hidden by default and can be added only when needed.
- Question settings now open from a dedicated submenu instead of exposing all optional actions inline.
- Inline `Add description` in the question panel was removed; description is now driven from question settings.
- Question points and summary chips were reorganized into tighter authoring rows.
- Question footer metadata was consolidated into a single more stable row.
- Choice-row alignment was tightened so option icon, choice text, correct-answer control, and remove control align more cleanly.
- Drag handles and destructive/correct-answer actions now use clearer hover labels.

## Question Settings Menu

The question settings button now behaves as a proper submenu rather than a plain expand/collapse toggle.

Current menu items:
- `Add/Edit description`
- `Shuffle option order`
- `Go to section based on answer`
- `Advanced settings` for `short_answer` and `paragraph`

Current implementation notes:
- the menu uses one anchored popover model across desktop, tablet, and mobile
- it is no longer a separate mobile sheet pattern
- menu position is computed relative to the trigger button and the viewport
- the menu can:
  - open above or below
  - align left or right
  - clamp itself within the viewport
- menu position is recomputed on resize and scroll

Current data shape notes:
- question-level flags now exist for:
  - `shuffleOptionOrder`
  - `goToSectionBasedOnAnswer`
- these flags are preserved in builder normalization and payload generation
- this pass focused on storing and exposing the setting in the builder UI, not completing downstream runtime branching behavior

## Drag and Reorder Notes

Drag-and-drop still uses the existing HTML5 drag architecture, but UX feedback is stronger now.

Implemented drag UX improvements:
- stronger dragged-source styling
- visible before/after/end drop indicators
- target highlighting for sections, questions, and section dropzones
- drag preview state separate from persisted builder state
- desktop-only drag remains in place
- compact layouts still rely on move up/down controls

Known design position:
- the drag engine is considered acceptable
- the main investment was in feedback, not replacing it with a third-party sortable system

## Delete Confirmation Notes

Native browser `confirm()` dialogs were removed from quiz-builder delete flows.

Current delete UX:
- reusable teacher-style modal
- used for:
  - question delete
  - section delete
- supports:
  - confirm
  - cancel
  - backdrop close
  - `Escape` close
  - focus return to the triggering control

## Short Answer Validation

Short-answer questions now support stored response validation rules in addition to accepted answers.

Supported validation fields:
- `minLength`
- `maxLength`
- `patternMode`
- `patternPreset`
- `customPattern`

Supported preset patterns:
- `numbers_only`
- `letters_only`
- `alphanumeric`
- `email`
- `url`
- `student_id`

Current behavior:
- Validation UI is shown only for `short_answer`.
- `paragraph` remains on the existing accepted-answer flow and does not expose response validation.
- Length rules are optional.
- Publish is blocked when:
  - minimum length is greater than maximum length
  - custom regex is syntactically invalid
- Empty validation fields do not block drafts.
- Validation is preserved through create, save, update, and reload flows.

Persistence path:
- Builder payload includes `responseValidation` only for `short_answer`.
- Server sanitization keeps the field for `short_answer` questions.
- Persisted quiz normalization restores the field when an existing quiz is loaded back into the builder.

## Current Question-Type Behavior

### Multiple Choice

- Requires at least 2 options.
- Requires exactly 1 correct answer.
- Blank options cannot be selected as the answer key.
- New questions default to no selected answer.

### Checkbox

- Requires at least 2 options.
- Requires at least 1 correct answer.

### True / False

- Uses fixed `True` and `False` options.
- Requires exactly 1 correct answer.

### Short Answer

- Uses one or more accepted answers.
- Supports case-sensitive checking.
- Supports response validation rules.

### Paragraph

- Uses one or more accepted answers.
- Supports case-sensitive checking.
- Does not currently use response validation rules.

## Test Coverage

Relevant automated coverage:
- `tests/smoke/teacherQuizBuilderClient.test.js`
- `tests/smoke/teacherQuizBuilderApi.test.js`
- `tests/smoke/teacherQuizPages.test.js`

Current validated areas:
- short-answer validation object normalization
- payload sanitization for validation rules
- invalid short-answer validation rejection on save/publish
- validation persistence through create and detail load
- builder page rendering smoke coverage
- drag preview helper logic
- question settings menu placement helper logic
- preview save-before-open decision logic
- unified dock rendering expectations

## Manual QA Follow-Up

Still worth checking live in the browser:
1. Short-answer validation layout at desktop, tablet, and phone widths.
2. Long custom regex input rendering inside question cards.
3. Hover-label behavior for icon-only actions on touch devices.
4. Card header alignment after adding many badges or long section/question titles.
5. Unified dock spacing on wide desktop, tablet, and narrow phone widths.
6. Unified dock icon-button behavior on non-desktop widths.
7. Dock preview flow when:
   - quiz is new and unsaved
   - quiz has unsaved edits
   - save fails
8. Teacher preview fidelity compared with the actual responder runtime.
9. Question settings popover positioning near viewport edges and near the bottom dock.
