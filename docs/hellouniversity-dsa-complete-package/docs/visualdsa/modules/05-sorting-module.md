---
status: active
last_updated: 2026-07-11
module: sorting
prototype_priority: 5
---

# VisualDSA Module Specification: Introductory Sorting

## Module identity

```text
Module key: sorting
Primary route: /visualdsa/sorting-visualizer
Related lessons:
- /data-structures-and-algorithms/bubble-sort
- /data-structures-and-algorithms/selection-sort
- /data-structures-and-algorithms/insertion-sort

Initial version: 1.0.0
```

Existing algorithm-specific routes may redirect to or load the shared sorting module with a selected algorithm:

```text
/visualdsa/bubble-sort-visualizer
/visualdsa/selection-sort-visualizer
/visualdsa/insertion-sort-visualizer
```

## Learning objectives

The student should be able to:

1. Trace Bubble Sort.
2. Trace Selection Sort.
3. Trace Insertion Sort.
4. Distinguish comparisons, swaps, and writes.
5. Identify the sorted and unsorted regions.
6. Predict the next algorithm-specific action.
7. Compare the three algorithms using operation counts.
8. Explain why a correct final array does not prove the correct algorithm was followed.

## Initial scope

Include:

- Ascending order
- Bubble Sort
- Selection Sort
- Insertion Sort
- Comparison, swap, write, and pass counters
- Stable-state and sorted-region explanations

Defer:

- Descending mode in formal assessment
- Merge Sort
- Quick Sort
- Heap Sort
- Non-comparison sorts
- Large performance benchmarking

## Input rules

```text
Element type: integer
Minimum elements: 2
Maximum elements: 12
Allowed range: -99 to 999
Duplicates: allowed
Order: ascending
```

## Shared visual representation

Show:

- Array cells
- Index row
- Compared elements
- Current key or minimum
- Sorted region
- Unsorted region
- Current pass
- Pseudocode
- Operation counters

## Algorithm selector

Modes:

```text
Bubble Sort
Selection Sort
Insertion Sort
Compare Algorithms
```

Assessment assignments should select one algorithm explicitly.

Do not ask the student to infer the algorithm unless that is the stated task.

# Bubble Sort

## Core behavior

- Compare adjacent elements.
- Swap when left is greater than right.
- After each pass, the largest remaining value reaches its final position.

## Pseudocode

```text
BUBBLE_SORT(array)
1. for end from length(array) - 1 down to 1
2.     swapped ← false
3.     for i from 0 to end - 1
4.         if array[i] > array[i + 1]
5.             swap array[i] and array[i + 1]
6.             swapped ← true
7.     if swapped = false
8.         stop
```

## Practice tasks

- Select the next compared pair.
- Decide whether to swap.
- Mark the finalized value after a pass.
- Identify early termination.
- Diagnose a skipped comparison.

# Selection Sort

## Core behavior

- Find the minimum in the unsorted region.
- Swap it into the first unsorted position.
- Expand the sorted prefix.

## Pseudocode

```text
SELECTION_SORT(array)
1. for start from 0 to length(array) - 2
2.     minIndex ← start
3.     for i from start + 1 to length(array) - 1
4.         if array[i] < array[minIndex]
5.             minIndex ← i
6.     swap array[start] and array[minIndex]
```

## Practice tasks

- Select the current minimum.
- Update `minIndex`.
- Choose the final swap pair.
- Mark the sorted prefix.
- Diagnose a premature swap.

# Insertion Sort

## Core behavior

- Treat the left portion as sorted.
- Remove the current key.
- Shift larger values right.
- Insert the key into the gap.

## Pseudocode

```text
INSERTION_SORT(array)
1. for i from 1 to length(array) - 1
2.     key ← array[i]
3.     j ← i - 1
4.     while j ≥ 0 and array[j] > key
5.         array[j + 1] ← array[j]
6.         j ← j - 1
7.     array[j + 1] ← key
```

## Practice tasks

- Identify the key.
- Select which values shift.
- Choose the insertion position.
- Mark the sorted prefix.
- Diagnose a direct swap that does not follow insertion-sort shifting.

## Guided scenarios

Use one shared input for comparison:

```text
[5, 2, 4, 1]
```

The compare mode should run each algorithm independently and display:

| Algorithm | Comparisons | Swaps | Writes | Passes |
|---|---:|---:|---:|---:|
| Bubble | computed | computed | computed | computed |
| Selection | computed | computed | computed | computed |
| Insertion | computed | n/a or computed | computed | computed |

Define counter semantics clearly.

Example:

```text
One swap = three writes
```

or:

```text
Swaps and writes are reported separately.
```

Use one convention consistently.

## Assessment templates

### `bubble-sort-one-pass-v1`

- Student completes one full pass.
- Student selects pairs and swap decisions.
- Finalized suffix is identified.

### `bubble-sort-full-trace-v1`

- Small array
- Student completes all passes
- Early termination may appear

### `selection-sort-minimum-v1`

- Student identifies minimum through comparisons
- Student performs one final swap

### `selection-sort-full-trace-v1`

- Student completes all outer-loop iterations

### `insertion-sort-place-key-v1`

- Student identifies key
- Student shifts larger elements
- Student inserts key

### `insertion-sort-full-trace-v1`

- Student completes each sorted-prefix expansion

### `sorting-algorithm-identification-v1`

- Optional diagnostic task
- Student identifies which algorithm produced a shown trace

## Scoring

### Bubble Sort

| Component | Weight |
|---|---:|
| Correct compared pair | 25% |
| Correct swap decision | 30% |
| Correct pass completion | 20% |
| Correct finalized region | 15% |
| Correct final array | 10% |

### Selection Sort

| Component | Weight |
|---|---:|
| Correct minimum tracking | 35% |
| Correct comparison sequence | 20% |
| Correct final swap | 25% |
| Correct sorted prefix | 10% |
| Correct final array | 10% |

### Insertion Sort

| Component | Weight |
|---|---:|
| Correct key | 15% |
| Correct shift decisions | 35% |
| Correct shift order | 20% |
| Correct insertion position | 20% |
| Correct final array | 10% |

## Misconception codes

```text
SO01 Compared the wrong elements
SO02 Applied the wrong swap rule
SO03 Ended a pass too early
SO04 Changed the finalized region
SO05 Produced the final array with the wrong algorithm
SO06 Misidentified the insertion position
SO07 Swapped during Selection Sort before finding the full minimum
SO08 Failed to update minIndex
SO09 Treated Insertion Sort as adjacent swapping
SO10 Shifted values in the wrong direction
SO11 Misidentified the current key
SO12 Ignored early termination condition in optimized Bubble Sort
```

## Required events

```text
module_opened
algorithm_selected
mode_selected
comparison_selected
swap_decision_submitted
swap_performed
minimum_selected
min_index_updated
key_selected
shift_submitted
insertion_position_selected
pass_completed
sorted_region_updated
action_correct
action_incorrect
hint_requested
session_completed
assessment_submitted
```

## Counters

- Comparisons
- Swaps
- Writes
- Passes
- Current sorted-region size

## Complexity feedback

| Algorithm | Best | Average | Worst | Extra space |
|---|---|---|---|---|
| Bubble Sort, optimized | O(n) | O(n²) | O(n²) | O(1) |
| Selection Sort | O(n²) | O(n²) | O(n²) | O(1) |
| Insertion Sort | O(n) | O(n²) | O(n²) | O(1) |

Discuss stability carefully:

- Bubble Sort can be stable when swapping only strict inversions.
- Insertion Sort can be stable with the standard comparison.
- Selection Sort is generally not stable in its basic swap form.

## Edge cases

- Already sorted input
- Reverse-sorted input
- Duplicate values
- All equal values
- Two-element array
- Negative values
- Bubble Sort early termination
- Selection Sort minimum already at start
- Insertion key already in position
- Insertion key moves to index 0

## Accessibility

- Compared elements must be announced.
- Sorted regions need labels, not only color.
- Swap and shift actions require keyboard alternatives.
- The current key and minimum must have text badges.
- Reduced-motion mode must apply one discrete state per step.
- Comparison tables must remain readable on mobile.

## Acceptance criteria

```text
[ ] One shared shell supports all three algorithms
[ ] Algorithm-specific rules remain distinct
[ ] Final state alone cannot earn full score
[ ] Bubble Sort pair selection is adjacent
[ ] Selection Sort scans before final swap
[ ] Insertion Sort uses shifts and a key
[ ] Counter semantics are documented
[ ] SO misconception codes are emitted
[ ] Official validation is server-side
[ ] Edge-case traces are tested
[ ] Mobile, keyboard, and reduced-motion modes work
```
