---
status: active
last_updated: 2026-07-11
module: binary-search
prototype_priority: 4
---

# VisualDSA Module Specification: Binary Search

## Module identity

```text
Module key: binary-search
Route: /visualdsa/binary-search-visualizer
Related lesson: /data-structures-and-algorithms/binary-search
Initial version: 1.0.0
```

## Learning objectives

The student should be able to:

1. Explain why binary search requires sorted data.
2. Track the active search range.
3. Calculate the midpoint correctly.
4. Compare the midpoint value with the target.
5. Update `low` and `high` correctly.
6. Identify when the target is found.
7. Identify when the target is absent.
8. Relate repeated range reduction to logarithmic time complexity.

## Initial scope

Include:

- Iterative binary search
- Successful search
- Unsuccessful search
- Duplicate values with a defined “find any matching index” policy
- Midpoint and boundary tracing

Defer:

- First occurrence and last occurrence variants
- Recursive implementation as a separate assessment
- Binary search on answer space
- Rotated arrays
- Floating-point search

## Input rules

```text
Element type: integer
Minimum elements: 1
Maximum elements: 15
Allowed range: -99 to 999
Input order: ascending
Duplicates: allowed
Target: integer
```

Exploration mode may allow unsorted input only to demonstrate why the precondition matters.

Assessment mode must use sorted input.

## Visual representation

Show:

- Full array
- Index row
- `low`
- `high`
- `mid`
- Target
- Active range
- Discarded range
- Comparison result
- Step counter

Example:

```text
Index:  0   1   2   3   4   5   6
Value:  4   9  13  18  24  31  42
        L           M           H
Target: 31
```

Discarded cells must remain visible but clearly marked as inactive.

## Midpoint policy

Use:

```text
mid = low + floor((high - low) / 2)
```

This avoids overflow in languages with fixed-size integers and gives one consistent formula across pseudocode, Python, Java, and JavaScript.

## Guided scenario

Input:

```text
values = [4, 9, 13, 18, 24, 31, 42]
target = 31
```

### Step 1

```text
low = 0
high = 6
mid = 3
values[mid] = 18
18 < 31
low becomes 4
```

### Step 2

```text
low = 4
high = 6
mid = 5
values[mid] = 31
target found at index 5
```

## Pseudocode

```text
BINARY_SEARCH(array, target)
1. low ← 0
2. high ← length(array) - 1
3. while low ≤ high
4.     mid ← low + floor((high - low) / 2)
5.     if array[mid] = target
6.         return mid
7.     else if array[mid] < target
8.         low ← mid + 1
9.     else
10.        high ← mid - 1
11. return NOT_FOUND
```

## Guided mode behavior

Each step should:

1. Show current `low`, `high`, and `mid`.
2. Highlight the midpoint cell.
3. Ask the student to predict the comparison result.
4. Reveal the result.
5. Ask which boundary changes.
6. Explain why half of the range is discarded.
7. Update operation counters.

## Exploration mode

Allow:

- Custom sorted arrays
- Target selection
- Auto-sort toggle for demonstration
- Step-by-step execution
- Compare with linear search
- Operation-count comparison

When the student enters unsorted data:

```text
This input does not satisfy binary search's sorted-data requirement.
You may sort it, switch to linear search, or continue only in demonstration mode.
```

## Practice task types

### Midpoint calculation

```text
low = 2
high = 8
What is mid?
```

### Boundary update

```text
array[mid] = 18
target = 31
Which boundary changes?
```

### Active-range selection

Student marks the remaining valid range.

### Next-step prediction

Student enters the next values of `low`, `high`, and `mid`.

### Diagnose error

```text
The student reset low to 0 after the first comparison.
Which binary-search rule was violated?
```

### Search completion

Student decides whether the target is found or absent.

## Assessment templates

### `binary-search-step-sequence-v1`

- Generated sorted array
- Generated target
- Student completes midpoint and boundary updates
- Assessment ends when found or range is empty

### `binary-search-missing-target-v1`

- Target is guaranteed absent
- Student must continue until `low > high`
- Early termination is scored as incorrect

### `binary-search-precondition-v1`

- Student identifies whether binary search is appropriate for the given data

## Scoring

| Component | Weight |
|---|---:|
| Correct midpoint calculations | 30% |
| Correct comparisons | 15% |
| Correct low updates | 20% |
| Correct high updates | 20% |
| Correct termination/result | 15% |

First-attempt correctness must be retained separately.

## Misconception codes

```text
BS01 Incorrect midpoint
BS02 Incorrect low update
BS03 Incorrect high update
BS04 Returned to discarded range
BS05 Ignored sorted-input requirement
BS06 Stopped before confirming absence
BS07 Used full-array boundaries after narrowing
BS08 Excluded the midpoint incorrectly
BS09 Used low < high instead of low ≤ high in a case requiring the final element
```

## Required events

```text
module_opened
mode_selected
custom_input_submitted
precondition_checked
midpoint_submitted
comparison_submitted
boundary_updated
active_range_selected
target_found
target_not_found
action_correct
action_incorrect
hint_requested
step_completed
session_completed
assessment_submitted
```

## Counters

- Comparisons
- Iterations
- Remaining range size
- Discarded elements

## Complexity feedback

Show the active range sequence.

Example:

```text
7 → 3 → 1
```

Explain:

```text
The search range is reduced by about half each iteration.
Time complexity: O(log n)
Space complexity for iterative binary search: O(1)
```

## Edge cases

Test:

- One-element array, found
- One-element array, absent
- Target at first index
- Target at last index
- Target at midpoint
- Target absent below minimum
- Target absent above maximum
- Duplicate values
- Negative values
- Even-length arrays
- Final remaining element
- Unsorted custom input

## Accessibility

- Announce active range and midpoint.
- Each cell must expose index, value, and state.
- Boundary markers must have text labels.
- Keyboard input must support midpoint and boundary selection.
- Reduced-motion mode must update ranges discretely.
- Discarded cells must remain understandable without opacity alone.

## Acceptance criteria

```text
[ ] Sorted-input requirement is enforced in assessment
[ ] Midpoint formula is consistent
[ ] Low and high updates are correct
[ ] Final-element cases work
[ ] Unsuccessful search ends only when low > high
[ ] Previous step restores the exact range
[ ] BS misconception codes are emitted
[ ] Official validation is server-side
[ ] Mobile and keyboard use are tested
[ ] Complexity explanation matches executed steps
```
