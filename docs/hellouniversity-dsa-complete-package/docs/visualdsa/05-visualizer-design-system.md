---
status: active
last_updated: 2026-07-11
phase: 2
---

# VisualDSA Visualizer Design System

## Purpose

This document defines the reusable interface, behavior, accessibility, and visual rules for all VisualDSA modules.

The goal is consistency.

Students should learn the data structure or algorithm, not relearn the interface for every topic.

## Design principles

1. Show the current algorithm state clearly.
2. Explain why the current step happens.
3. Require student prediction before revealing key transitions.
4. Keep controls consistent across modules.
5. Separate practice from recorded assessment.
6. Support mobile, keyboard, and reduced-motion use.
7. Use color as a secondary cue, not the only cue.
8. Keep the visualization synchronized with pseudocode and variables.
9. Preserve step history so students can move backward.
10. Avoid decorative animation that does not teach a concept.

## Standard page layout

### Desktop

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Module title                  Mode selector      Progress / status   │
├─────────────────────┬────────────────────────────────────────────────┤
│ Input and controls  │                                                │
│                     │            Visualization canvas                │
│ Pseudocode          │                                                │
│                     │                                                │
├─────────────────────┴────────────────────────────────────────────────┤
│ Current operation | Explanation | Variables | Counters              │
├──────────────────────────────────────────────────────────────────────┤
│ Previous | Play/Pause | Next | Reset | Speed | Hint | Submit        │
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile

```text
[ Visualization ]
[ Controls ]

Tabs:
[ Explanation ] [ Pseudocode ] [ Variables ] [ Activity ]
```

Mobile rules:

- Keep the visualization first.
- Keep playback controls sticky near the bottom.
- Convert side panels to tabs or accordions.
- Avoid horizontal scrolling except where a structure cannot reasonably fit.
- Use touch targets of at least 44 by 44 CSS pixels.
- Keep primary actions visible without zooming.

## Shared component structure

```text
VisualDsaShell
├── VisualDsaHeader
├── VisualDsaModeSelector
├── VisualDsaInputPanel
├── VisualDsaPseudocodePanel
├── VisualDsaCanvas
├── VisualDsaExplanationPanel
├── VisualDsaVariablePanel
├── VisualDsaCounterPanel
├── VisualDsaPlaybackControls
├── VisualDsaActivityPanel
├── VisualDsaFeedbackPanel
└── VisualDsaCompletionPanel
```

## Shared control set

Every module should support the controls that make sense for its state model.

### Required controls

- Start
- Previous step
- Play
- Pause
- Next step
- Reset
- Speed
- Generate example
- Enter custom input
- Show or hide pseudocode
- Show or hide explanation

### Contextual controls

- Hint
- Submit prediction
- Submit action
- Undo student action
- Retry
- Finish practice
- Submit assessment
- Full-screen classroom mode

## Standard modes

### Guided

- Uses a prepared example.
- Explains each transition.
- Allows previous, next, play, pause, and reset.
- Shows the correct path.
- Does not produce a formal grade.

### Exploration

- Accepts custom input.
- Allows free execution.
- Shows operation counts.
- Allows replay and edge-case testing.
- Can record engagement data without grading.

### Practice

- Presents a generated task.
- Requires prediction or manipulation.
- Gives immediate feedback.
- Allows hints and retries.
- Records first response and retry behavior.

### Assessment

- Uses a server-issued problem instance.
- Records all meaningful actions.
- Restricts hints based on assignment rules.
- Does not reveal the correct answer before submission.
- Calculates the official score on the server.

### Instructor demonstration

- Enlarges the visualization.
- Supports classroom pacing.
- Can hide explanations before discussion.
- Can pause on prediction prompts.
- Does not create student attempts.

## Visual state vocabulary

All modules must reuse the same semantic state names.

| State | Meaning |
|---|---|
| `current` | Element or node currently being processed |
| `candidate` | Possible next choice |
| `compared` | Element involved in the current comparison |
| `selected` | Student-selected element |
| `visited` | Already processed in a traversal |
| `finalized` | State will no longer change |
| `inserted` | Newly added element |
| `removed` | Element being deleted or popped |
| `invalid` | Student action violates a rule |
| `hinted` | Item revealed by a hint |
| `discarded` | Search region or choice removed from consideration |
| `active-path` | Current traversal or decision path |

## Accessibility cues

Do not rely on color alone.

Each visual state must use at least two signals, such as:

- Color and border style
- Color and icon
- Color and text label
- Fill pattern and outline
- Shape and annotation

Example:

```text
current
= highlighted fill + thick border + "Current" label
```

## Motion rules

- Default animation should be moderate, not fast.
- Students must be able to pause at any time.
- Step transitions should be reversible.
- Respect `prefers-reduced-motion`.
- Reduced-motion mode should use immediate state changes or short fades.
- Avoid bouncing, spinning, and decorative movement.
- Do not animate when a textual update alone is enough.

## Pseudocode panel

The pseudocode panel must show:

- Stable line numbers
- Current line highlight
- Optional variable substitution
- Optional language tabs
- No hidden lines during assessment

Recommended language order:

```text
Pseudocode
Python
Java
JavaScript
```

The first research implementation may use pseudocode plus Python first, then add Java and JavaScript after the engine is stable.

## Explanation panel

Each step should include:

```text
Operation:
Compare array[2] and array[3]

Reason:
Bubble sort checks adjacent values from left to right.

Result:
43 is greater than 18, so the values swap.

Cost:
Comparisons: 4
Swaps: 2
```

The explanation must describe the algorithm decision, not only narrate the animation.

## Variable panel

Use a consistent key-value table.

Example:

| Variable | Value |
|---|---:|
| `low` | 2 |
| `high` | 7 |
| `mid` | 4 |
| `target` | 31 |

Variables that changed in the current step should receive a temporary non-color cue, such as an update badge.

## Counter panel

Supported counters include:

- Comparisons
- Swaps
- Writes
- Reads
- Pushes
- Pops
- Enqueues
- Dequeues
- Recursive calls
- Queue size
- Stack size
- Visited nodes
- Maximum recursion depth

Only show counters that teach something for the current module.

## Input standards

### Validation

Every input panel must:

- State allowed values
- Reject empty input when required
- Reject invalid types
- Enforce safe size limits
- Explain why an input is invalid
- Prevent duplicate values only when the module requires uniqueness

### Recommended limits for the first release

| Module | Default maximum |
|---|---:|
| Arrays | 12 elements |
| Stack | 10 elements |
| Queue | 10 elements |
| Binary search | 15 elements |
| Introductory sorting | 12 elements |
| BST | 15 nodes |

These limits are usability defaults, not algorithm restrictions.

## Activity panel

The activity panel may ask the student to:

- Predict the next value
- Select the next element
- Choose a direction
- Drag an item
- Enter a variable
- Construct a structure
- Diagnose an incorrect step
- Explain a decision

The interaction type must match the concept being assessed.

## Feedback rules

### Practice feedback

After an incorrect action:

1. State that the action is incorrect.
2. Explain the violated rule.
3. Keep the learner in the current step.
4. Offer a retry.
5. Offer a hint when allowed.

### Assessment feedback

During the attempt:

- Confirm that the response was recorded.
- Do not reveal the correct answer unless the assessment policy allows immediate feedback.
- Do not expose hidden scoring logic.

After submission:

- Show score and mastery result.
- Show allowed review details.
- Show recommended lesson or practice activity.

## Error-message standard

Use specific messages.

Weak:

```text
Wrong answer.
```

Better:

```text
The selected midpoint is outside the active search range.
Recalculate using low and high, not the full array.
```

## Module loading

The route should load the module through a registry.

Example:

```javascript
const moduleRegistry = {
  'array-visualizer': loadArrayModule,
  'stack-visualizer': loadStackModule,
  'queue-visualizer': loadQueueModule,
  'binary-search-visualizer': loadBinarySearchModule,
  'sorting-visualizer': loadSortingModule,
  'binary-search-tree-visualizer': loadBstModule
};
```

Unknown or unfinished modules should render a documented unavailable state rather than a generic broken page.

## Standard client-side module interface

```javascript
export function createModule(config) {
  return {
    id: config.id,
    version: config.version,
    mount,
    unmount,
    setMode,
    setInput,
    reset,
    next,
    previous,
    play,
    pause,
    submitAction,
    requestHint,
    getState,
    getTelemetrySnapshot
  };
}
```

## State-history requirement

Each module must store immutable snapshots or reproducible transitions.

```text
initial state
→ step 1
→ step 2
→ step 3
```

The Previous control must restore the exact prior state without rerunning random logic.

## Suggested repository structure

```text
public/js/visualdsa/
├── core/
│   ├── moduleRegistry.js
│   ├── stateManager.js
│   ├── playbackController.js
│   ├── eventClient.js
│   ├── apiClient.js
│   └── accessibility.js
├── modules/
│   ├── arrays/
│   ├── stacks/
│   ├── queues/
│   ├── binary-search/
│   ├── sorting/
│   └── bst/
└── visualDsaPage.js
```

```text
public/css/visualdsa/
├── shell.css
├── controls.css
├── states.css
├── activity.css
├── responsive.css
└── reduced-motion.css
```

## Visualizer acceptance criteria

```text
[ ] Uses the shared shell
[ ] Uses standard controls
[ ] Preserves step history
[ ] Synchronizes visualization and pseudocode
[ ] Provides step explanation
[ ] Supports keyboard navigation
[ ] Supports reduced motion
[ ] Uses non-color state cues
[ ] Works on mobile
[ ] Handles invalid input
[ ] Exposes mode-specific behavior
[ ] Can emit standard interaction events
```
