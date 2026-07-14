---
status: active
last_updated: 2026-07-11
module: arrays
prototype_priority: 1
---

# VisualDSA Module Specification: Array Operations

## Module identity

```text
Module key: arrays
Route: /visualdsa/array-visualizer
Related lesson: /data-structures-and-algorithms/arrays
Initial version: 1.0.0
```

## Learning objectives

After completing the module, the student should be able to:

1. Identify an array element using its index.
2. Explain contiguous indexed storage at a conceptual level.
3. Access and update an element.
4. Trace array traversal.
5. Perform insertion by shifting elements in the correct direction.
6. Perform deletion by shifting elements in the correct direction.
7. Relate operations to common time-complexity costs.

## Initial scope

Include:

- Access
- Update
- Traverse
- Insert
- Delete

Defer:

- Dynamic array capacity resizing internals
- Multidimensional arrays
- Sparse arrays
- Language-specific memory allocation details

## Input rules

```text
Element type: integer
Minimum elements: 1
Maximum elements: 12
Allowed range: -99 to 999
Duplicates: allowed
```

Insertion task also requires:

```text
insert value
target index
available capacity
```

## Visual representation

Show:

- Array cells
- Index row
- Current logical size
- Optional capacity cells
- Current element
- Source and destination during shifts
- Operation counter

Example:

```text
Index:   0    1    2    3    4
       ┌────┬────┬────┬────┬────┐
Value: │  4 │  8 │ 12 │ 18 │    │
       └────┴────┴────┴────┴────┘
Size: 4     Capacity: 5
```

## Guided scenarios

### Access

Input:

```text
[4, 8, 12, 18]
index = 2
```

Steps:

1. Validate index.
2. Highlight index 2.
3. Read value 12.
4. Explain constant-time indexed access.

### Update

Input:

```text
[4, 8, 12, 18]
index = 1
new value = 9
```

Steps:

1. Validate index.
2. Highlight current value.
3. Replace 8 with 9.
4. Explain that array length does not change.

### Insertion

Input:

```text
[4, 8, 12, 18]
insert 9 at index 2
capacity = 5
```

Correct shift sequence:

```text
18: index 3 → 4
12: index 2 → 3
9: inserted at index 2
```

Important teaching point:

Shift from right to left to avoid overwriting values.

### Deletion

Input:

```text
[4, 8, 12, 18]
delete index 1
```

Correct sequence:

```text
12: index 2 → 1
18: index 3 → 2
logical size decreases
```

Important teaching point:

Shift from left to right after removal.

## Pseudocode

### Insert

```text
INSERT(array, size, capacity, index, value)
1. if index < 0 or index > size
2.     report invalid index
3. if size = capacity
4.     report full array
5. for i from size - 1 down to index
6.     array[i + 1] ← array[i]
7. array[index] ← value
8. size ← size + 1
```

### Delete

```text
DELETE(array, size, index)
1. if index < 0 or index ≥ size
2.     report invalid index
3. removed ← array[index]
4. for i from index to size - 2
5.     array[i] ← array[i + 1]
6. size ← size - 1
7. return removed
```

## Practice task types

### Select index

```text
Which cell contains the value at index 3?
```

### Predict next shift

```text
Which value must move next before inserting at index 2?
```

### Perform insertion

Student selects or drags values in the correct shift order.

### Perform deletion

Student moves remaining values to close the gap.

### Diagnose error

```text
A student moved index 2 to index 3 before moving index 3 to index 4.
What value will be overwritten?
```

## Assessment templates

### `array-access-v1`

- Generated array
- Generated valid index
- Student selects the indexed cell
- Student enters the value

### `array-insert-v1`

- Generated array with available capacity
- Generated insertion value and index
- Student performs shift sequence
- Student places new value
- Student confirms final size

### `array-delete-v1`

- Generated array
- Generated deletion index
- Student selects removed value
- Student performs shift sequence
- Student confirms final size

## Scoring

### Insertion

| Component | Weight |
|---|---:|
| Correct target index | 15% |
| Correct shift direction | 20% |
| Correct shift order | 35% |
| Correct value placement | 20% |
| Correct final size | 10% |

### Deletion

| Component | Weight |
|---|---:|
| Correct removed index/value | 20% |
| Correct shift direction | 20% |
| Correct shift order | 30% |
| Correct final array | 20% |
| Correct final size | 10% |

## Misconception codes

```text
AR01 Incorrect target index
AR02 Shifted in the wrong direction
AR03 Overwrote a value before shifting
AR04 Incorrect final size
AR05 Confused access with search
AR06 Treated unused capacity as logical data
AR07 Inserted without checking capacity
```

## Required events

```text
module_opened
mode_selected
custom_input_submitted
practice_started
assessment_started
index_selected
shift_submitted
value_inserted
value_removed
size_updated
action_correct
action_incorrect
hint_requested
step_completed
session_completed
assessment_submitted
```

## Counters

Show where relevant:

- Reads
- Writes
- Shifts
- Comparisons

## Complexity feedback

| Operation | Typical cost |
|---|---|
| Access by index | O(1) |
| Update by index | O(1) |
| Traverse | O(n) |
| Insert at end with capacity | O(1) |
| Insert near beginning | O(n) |
| Delete near beginning | O(n) |

Do not claim all insertion is always O(n) without context.

## Edge cases

Test:

- Insert at index 0
- Insert at logical end
- Delete index 0
- Delete last index
- Single-element deletion
- Full capacity
- Invalid negative index
- Index greater than logical size
- Duplicate values
- Negative values

## Accessibility

- Each cell must have an accessible label with index and value.
- Shift animation must have a textual equivalent.
- Drag actions must have keyboard alternatives.
- Current, source, and destination cells must use labels and borders.
- Reduced-motion mode must apply shifts as discrete steps.

## Acceptance criteria

```text
[ ] Access, update, insert, and delete are correct
[ ] Previous step restores exact state
[ ] Insert shifts right to left
[ ] Delete shifts left to right
[ ] Logical size and capacity are distinct
[ ] Practice gives specific feedback
[ ] Assessment validates sequence server-side
[ ] AR misconception codes are emitted
[ ] Keyboard operation is possible
[ ] Mobile layout remains readable
[ ] Algorithm-state tests cover edge cases
```
