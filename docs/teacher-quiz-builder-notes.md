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
- Open-text question controls were tightened:
  - `Add alternative answer` stays left
  - case-sensitivity now sits on the right
  - open-text summary chips now sit with the right-side control stack
  - the `...` settings button now sits below the case-sensitivity toggle for open-text questions
- Short-answer response validation was reintroduced as a dedicated builder feature with its own client helper module instead of being folded into the main builder file.
- Choice-row alignment was tightened so option icon, choice text, correct-answer control, and remove control align more cleanly.
- Drag handles and destructive/correct-answer actions now use clearer hover labels.

## Question Settings Menu

The question settings button now behaves as a proper submenu rather than a plain expand/collapse toggle.

Current menu items:
- `Add/Edit description`
- `Shuffle option order`
- `Go to section based on answer`
- `Response validation` for `short_answer`

Placement notes:
- objective question types keep the `...` settings button in the footer row
- `short_answer` and `paragraph` render the `...` settings button inside the open-text editor control stack on the right side
- only `short_answer` currently exposes the dedicated `Response validation` submenu action

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

## Open-Text Authoring

Short answer and paragraph questions share the accepted-answer flow, but `short_answer` now has an additional dedicated response-validation panel.

Current behavior:
- Both `short_answer` and `paragraph` use one or more accepted answers.
- Both support case-sensitive checking.
- Open-text summary chips are grouped with the right-side action stack instead of sitting on a separate row.
- `short_answer` exposes `Response validation` through the `...` menu.
- `paragraph` does not expose response validation.
- Description editing remains separate from response validation.

Persistence notes:
- Builder-side payload generation sends `responseValidation` only for meaningful short-answer validation rules.
- Old stored validation objects using the legacy min/max/pattern shape are normalized to empty validation in the current builder.

## Short-Answer Response Validation

Response validation now lives in a separate client helper:
- `public/js/teacherQuizBuilderResponseValidation.js`

Current structured shape:
- `category`
- `operator`
- `value`
- `secondaryValue`
- `customErrorText`

Supported categories and operators:
- `Number`
  - `Greater than`
  - `Greater than or equal to`
  - `Less than`
  - `Less than or equal to`
  - `Equal to`
  - `Not equal to`
  - `Between`
  - `Not between`
  - `Is number`
  - `Whole number`
- `Text`
  - `Contains`
  - `Doesn't contain`
  - `Email`
  - `URL`
- `Length`
  - `Maximum character count`
  - `Minimum character count`
- `Regular expression`
  - `Contains`
  - `Doesn't contain`
  - `Matches`
  - `Doesn't match`

Current builder behavior:
- only one response-validation rule is supported per short-answer question
- operators with no operand render no value input
- single-value rules render one input
- range rules render two inputs
- `Custom error text` is always available
- `Clear` removes the active validation rule from the short-answer question

Current validation behavior:
- builder and API validation both reject incomplete or invalid rules
- numeric range rules reject reversed bounds
- regex-based rules reject invalid regex syntax
- `customErrorText` is persisted but not yet used in the student runtime

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
- Exposes `Response validation` through the question settings menu.
- Supports the structured response-validation rule model.

### Paragraph

- Uses one or more accepted answers.
- Supports case-sensitive checking.
- Shares the accepted-answer authoring flow, but does not currently expose response validation.

## Test Coverage

Relevant automated coverage:
- `tests/smoke/teacherQuizBuilderClient.test.js`
- `tests/smoke/teacherQuizBuilderApi.test.js`
- `tests/smoke/teacherQuizPages.test.js`

Current validated areas:
- open-text accepted-answer editor behavior
- short-answer response-validation panel rendering
- operator-dependent validation inputs
- builder-side short-answer validation blocking invalid publish/save states
- new response-validation payload shape and persistence
- API rejection of invalid numeric/range/regex short-answer rules
- builder page rendering smoke coverage
- drag preview helper logic
- question settings menu placement helper logic
- preview save-before-open decision logic
- unified dock rendering expectations

## Manual QA Follow-Up

Still worth checking live in the browser:
1. Open-text right-side control stack alignment at desktop, tablet, and phone widths.
2. Placement of open-text summary chips relative to the case-sensitivity toggle and `...` button.
3. Short-answer response-validation panel layout for no-value, one-value, and two-value operators.
4. Switching between validation categories/operators repeatedly without stale values leaking across operators.
5. Hover-label behavior for icon-only actions on touch devices.
6. Card header alignment after adding many badges or long section/question titles.
7. Unified dock spacing on wide desktop, tablet, and narrow phone widths.
8. Unified dock icon-button behavior on non-desktop widths.
9. Dock preview flow when:
   - quiz is new and unsaved
   - quiz has unsaved edits
   - save fails
10. Teacher preview fidelity compared with the actual responder runtime.
11. Question settings popover positioning near viewport edges and near the bottom dock.
