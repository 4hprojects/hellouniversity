# Teacher Quiz Builder Notes
Updated: 2026-03-26

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

Current quiz-info behavior:
- `Class` is optional during create, edit, save, and publish flows.
- `No class selected` is a valid builder state.
- A quiz can be published without a linked class and assigned later.

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
- hidden `Questions` and `Review` tabs remain in the DOM for current tab/panel wiring
- the visible step chips (`Quiz Info`, `Questions`, `Review`) now navigate within the builder
- settings are still reachable inside the builder, but they are no longer the dock’s primary action
- readiness chip now sits on the same row as the dock title input
- `Preview`, `Save Draft`, and `Publish` now share the same action group
- `Add Section` and `Add Question` remain grouped as the centered quick-add cluster on desktop
- tablet widths now follow the same icon-first dock button treatment as phone widths

## Preview Behavior

The current teacher preview should be understood as a saved teacher preview, not the real student runtime.

What `/teacher/quizzes/:quizId/preview` currently does:
- loads saved quiz data through the teacher quiz-builder API
- renders a balanced teacher review surface with:
  - a light review summary
  - a preview-only notice
  - a compact section jump list
  - a cleaner student-like quiz body below
- shows disabled answer controls
- preserves section grouping and question order
- keeps continuous question numbering across sections
- exposes light teacher-facing quiz facts such as status, class, type, totals, schedule, time limit, and score visibility mode

What it does not do:
- start a real student attempt
- autosave answers
- submit a response
- enforce the full runtime access/attempt flow

Practical meaning:
- it is accurate enough for layout and question-surface checking
- it is not a full substitute for the real student runtime under `/api/quizzes*` and `take_quiz.js`
- it stays within the shared teacher shell and does not introduce a quiz-level secondary workspace nav

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
- The `Question Map` now supports drag reordering with a dedicated handle per question item:
  - questions can move within a section or across sections
  - section-end dropzones support moving a question to the end of a target section
  - drag works from the map on all layouts without changing the existing main-card drag engine
  - dropping from the map keeps focus anchored in the map instead of jumping the main editor card into view
- Teacher preview was refreshed into a more structured author-validation page:
  - top review summary uses light signal cards instead of a single raw metadata block
  - preview-only messaging now explains that answers are disabled and no submission is recorded
  - a section jump list improves navigation for longer quizzes without adding a new page-level subnav
  - question cards now use quieter type/points chips and clearer section/question hierarchy
  - loading, empty, and error states now render as intentional preview states instead of falling back to a single line of text

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
- main question-card drag remains desktop-only
- compact layouts still rely on move up/down controls
- Question Map adds a separate pointer-driven drag flow for all layouts

Known design position:
- the drag engine is considered acceptable
- the main investment was in feedback, not replacing it with a third-party sortable system
- Question Map drag reuses `moveQuestion(...)` for persistence/order logic instead of introducing a second ordering model

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
- Both `short_answer` and `paragraph` can use zero or more accepted answers.
- Leaving accepted answers blank is allowed and indicates manual review.
- Both support case-sensitive checking when accepted answers are present.
- Open-text summary chips are grouped with the right-side action stack instead of sitting on a separate row.
- `short_answer` exposes `Response validation` through the `...` menu.
- `paragraph` does not expose response validation.
- Description editing remains separate from response validation.
- Invalid `short_answer` response-validation rules still block save/publish.

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

- Requires at least 1 option.
- Requires at least 1 correct answer.

### True / False

- Uses fixed `True` and `False` options.
- Requires exactly 1 correct answer.

### Short Answer

- Uses zero or more accepted answers.
- Blank accepted answers are allowed for manual review.
- Supports case-sensitive checking when accepted answers are present.
- Exposes `Response validation` through the question settings menu.
- Supports the structured response-validation rule model.

### Paragraph

- Uses zero or more accepted answers.
- Blank accepted answers are allowed for manual review.
- Supports case-sensitive checking when accepted answers are present.
- Shares the accepted-answer authoring flow, but does not currently expose response validation.

## Test Coverage

Relevant automated coverage:
- `tests/smoke/teacherQuizBuilderClient.test.js`
- `tests/smoke/teacherQuizBuilderApi.test.js`
- `tests/smoke/teacherQuizBuilderShortAnswerClient.test.js`
- `tests/smoke/teacherQuizPages.test.js`

Current validated areas:
- open-text accepted-answer editor behavior
- blank accepted-answer manual-review behavior for `short_answer` and `paragraph`
- short-answer response-validation panel rendering
- operator-dependent validation inputs
- builder-side short-answer validation blocking invalid publish/save states
- new response-validation payload shape and persistence
- API rejection of invalid numeric/range/regex short-answer rules
- optional class selection during create/edit/publish flows
- builder page rendering smoke coverage
- drag preview helper logic
- question settings menu placement helper logic
- preview save-before-open decision logic
- unified dock rendering expectations

## Manual QA Follow-Up

Still worth checking live in the browser:
1. Optional class-field copy and publish flow when the builder stays on `No class selected`.
2. Open-text right-side control stack alignment at desktop, tablet, and phone widths.
3. Placement of open-text summary chips relative to the case-sensitivity toggle and `...` button.
4. Blank accepted-answer behavior for manual-review authoring across save, reload, and publish.
5. Short-answer response-validation panel layout for no-value, one-value, and two-value operators.
6. Switching between validation categories/operators repeatedly without stale values leaking across operators.
7. Hover-label behavior for icon-only actions on touch devices.
8. Card header alignment after adding many badges or long section/question titles.
9. Unified dock spacing on wide desktop, tablet, and narrow phone widths.
10. Unified dock icon-button behavior on non-desktop widths.
11. Dock preview flow when:
   - quiz is new and unsaved
   - quiz has unsaved edits
   - save fails
12. Teacher preview fidelity compared with the actual responder runtime.
13. Question settings popover positioning near viewport edges and near the bottom dock.
