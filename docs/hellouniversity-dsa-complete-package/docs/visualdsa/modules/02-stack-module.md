---
status: active
last_updated: 2026-07-11
module: stacks
prototype_priority: 2
---

# VisualDSA Module Specification: Stack Operations

## Module identity

```text
Module key: stacks
Route: /visualdsa/stack-visualizer
Related lesson: /data-structures-and-algorithms/stacks
Initial version: 1.0.0
```

## Learning objectives

The student should be able to:

1. Explain Last In, First Out behavior.
2. Identify the top element.
3. Perform push, pop, and peek.
4. Predict the next removed element.
5. Recognize overflow and underflow conditions.
6. Trace a sequence of stack operations.
7. Relate stacks to undo, browser history, and function calls.

## Initial scope

Include:

- Array-based conceptual stack
- Push
- Pop
- Peek
- Is empty
- Is full when capacity is fixed
- Operation sequence tracing

Defer:

- Linked-list stack implementation
- Full expression conversion
- Full recursion visualization
- Language-specific call-stack internals

## Input rules

```text
Element type: integer or short string
Maximum display length per value: 12 characters
Default capacity: 6
Maximum capacity: 10
Duplicates: allowed
```

## Visual representation

Vertical stack:

```text
       TOP
     ┌──────┐
     │  24  │
     ├──────┤
     │  18  │
     ├──────┤
     │   7  │
     └──────┘
```

Also show:

```text
size
capacity
top index
next operation
```

## State rules

For an array-based stack:

```text
empty top index = -1
push increments top before or while placing value
pop reads and removes current top
peek reads top without changing state
```

The conceptual module may hide implementation detail in guided beginner mode and reveal it in implementation mode.

## Guided scenarios

### Push

Initial:

```text
[7, 18]
top = 1
push 24
```

Steps:

1. Check available capacity.
2. Increase top to 2.
3. Place 24 at index 2.
4. Mark 24 as the new top.

### Pop

Initial:

```text
[7, 18, 24]
top = 2
```

Steps:

1. Check that stack is not empty.
2. Read value at top.
3. Remove or clear 24.
4. Decrease top to 1.
5. Mark 18 as the new top.

### Peek

Initial:

```text
[7, 18, 24]
```

Steps:

1. Check that stack is not empty.
2. Read 24.
3. Keep stack unchanged.

## Pseudocode

### Push

```text
PUSH(stack, top, capacity, value)
1. if top = capacity - 1
2.     report overflow
3. top ← top + 1
4. stack[top] ← value
```

### Pop

```text
POP(stack, top)
1. if top = -1
2.     report underflow
3. value ← stack[top]
4. top ← top - 1
5. return value
```

### Peek

```text
PEEK(stack, top)
1. if top = -1
2.     report empty stack
3. return stack[top]
```

## Practice task types

### Predict pop

```text
Which value will POP remove next?
```

### Complete operation sequence

Example:

```text
PUSH 4
PUSH 9
POP
PUSH 2
PEEK
```

Student updates the stack after each operation.

### Choose valid operation

Student identifies whether push or pop is valid given size and capacity.

### Diagnose incorrect stack behavior

```text
The system removed the bottom value.
Which stack rule was violated?
```

### Undo simulation

A short sequence of user actions is pushed. Student selects which action is undone next.

## Assessment templates

### `stack-lifo-prediction-v1`

- Generated stack
- Student identifies top
- Student predicts next pop result

### `stack-operation-sequence-v1`

- Generated valid and invalid operations
- Student applies each operation
- Student identifies overflow or underflow

### `stack-peek-v1`

- Student selects top value
- Student confirms stack remains unchanged

## Scoring

### Operation sequence

| Component | Weight |
|---|---:|
| Correct push placement | 25% |
| Correct pop result | 25% |
| Correct top tracking | 25% |
| Correct invalid-state recognition | 15% |
| Correct final stack | 10% |

## Misconception codes

```text
ST01 Removed from the bottom
ST02 Predicted FIFO behavior
ST03 Ignored underflow
ST04 Incorrect top pointer
ST05 Peek changed the stack
ST06 Ignored fixed capacity
ST07 Pushed below the current top
```

## Required events

```text
module_opened
mode_selected
push_submitted
pop_submitted
peek_submitted
top_selected
overflow_identified
underflow_identified
action_correct
action_incorrect
hint_requested
step_completed
session_completed
assessment_submitted
```

## Counters

- Pushes
- Pops
- Peeks
- Current size
- Maximum size reached

## Complexity feedback

For standard stack operations:

```text
push: O(1)
pop: O(1)
peek: O(1)
is empty: O(1)
```

When discussing dynamic-array resizing, clarify that occasional resize cost is outside the fixed-capacity beginner visualization.

## Edge cases

- Push into empty stack
- Pop final element
- Pop empty stack
- Peek empty stack
- Push to exact capacity
- Push beyond capacity
- Duplicate values
- Mixed strings and numbers should be disallowed in one generated problem unless intentional
- Reset after invalid operation

## Accessibility

- Announce the current top.
- Each item must include its position and value.
- Push and pop animations must have text descriptions.
- Keyboard buttons must support all operations.
- Do not require dragging for assessment.
- Reduced-motion mode must add and remove items discretely.

## Acceptance criteria

```text
[ ] LIFO behavior is enforced
[ ] Top is always correct
[ ] Peek does not change state
[ ] Underflow is handled
[ ] Fixed-capacity overflow is handled
[ ] Previous step restores exact state
[ ] Practice feedback names the violated rule
[ ] Assessment validation is server-side
[ ] ST misconception codes are emitted
[ ] Keyboard and mobile use are tested
```
