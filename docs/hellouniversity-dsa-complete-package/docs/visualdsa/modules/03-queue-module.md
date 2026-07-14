---
status: active
last_updated: 2026-07-11
module: queues
prototype_priority: 3
---

# VisualDSA Module Specification: Queue Operations

## Module identity

```text
Module key: queues
Route: /visualdsa/queue-visualizer
Related lesson: /data-structures-and-algorithms/queues
Initial version: 1.0.0
```

## Learning objectives

The student should be able to:

1. Explain First In, First Out behavior.
2. Identify the front and rear.
3. Perform enqueue, dequeue, and peek/front.
4. Predict the next removed element.
5. Update front and rear correctly.
6. Recognize empty and full conditions.
7. Trace a circular queue at an introductory level.

## Initial scope

Core:

- Linear conceptual queue
- Enqueue
- Dequeue
- Front/peek
- Is empty
- Fixed capacity

Extension within the same module:

- Circular queue
- Wraparound of front and rear

Defer:

- Priority queues
- Deques
- Linked-list queue implementation
- Concurrent queue behavior

## Input rules

```text
Element type: integer or short string
Default capacity: 6
Maximum capacity: 10
Maximum display length: 12 characters
Duplicates: allowed
```

## Visual representation

Horizontal queue:

```text
FRONT                              REAR
  ↓                                  ↓
┌──────┬──────┬──────┬──────┬──────┐
│  11  │  18  │  24  │      │      │
└──────┴──────┴──────┴──────┴──────┘
dequeue ←                      ← enqueue
```

For circular queue mode, show both:

- Circular conceptual arrangement
- Array indexes with front and rear pointers

This prevents the circular layout from hiding actual index behavior.

## Queue-state convention

Choose one implementation convention and use it consistently.

Recommended for fixed circular queue:

```text
front = index of current front element
rear = index of most recently inserted element
size = number of stored elements
empty when size = 0
full when size = capacity
```

This avoids the ambiguous “one unused slot” convention in the first release.

## Guided scenarios

### Enqueue

Initial:

```text
[11, 18]
front = 0
rear = 1
enqueue 24
```

Steps:

1. Check capacity.
2. Move rear to next available index.
3. Place 24.
4. Increase size.
5. Keep front unchanged.

### Dequeue

Initial:

```text
[11, 18, 24]
front = 0
rear = 2
```

Steps:

1. Check not empty.
2. Read value at front.
3. Remove 11.
4. Move front forward.
5. Decrease size.
6. Rear remains unchanged unless queue becomes empty and the selected convention resets pointers.

### Circular wraparound

Example:

```text
capacity = 5
front = 3
rear = 4
size = 2
enqueue 30
```

Correct next rear:

```text
(rear + 1) mod capacity = 0
```

## Pseudocode

### Enqueue with size tracking

```text
ENQUEUE(queue, front, rear, size, capacity, value)
1. if size = capacity
2.     report full queue
3. rear ← (rear + 1) mod capacity
4. queue[rear] ← value
5. size ← size + 1
6. if size = 1
7.     front ← rear
```

### Dequeue

```text
DEQUEUE(queue, front, rear, size, capacity)
1. if size = 0
2.     report empty queue
3. value ← queue[front]
4. front ← (front + 1) mod capacity
5. size ← size - 1
6. if size = 0
7.     reset front and rear using the module convention
8. return value
```

## Practice task types

### Predict dequeue

```text
Which value leaves the queue next?
```

### Update pointers

Student enters the new front and rear after an operation.

### Complete operation sequence

```text
ENQUEUE A
ENQUEUE B
DEQUEUE
ENQUEUE C
FRONT
```

### Circular wraparound

Student selects the next rear index.

### Diagnose error

```text
A value was removed from the rear.
Which queue rule was violated?
```

## Assessment templates

### `queue-fifo-prediction-v1`

- Generated queue
- Student identifies front
- Student predicts dequeue result

### `queue-operation-sequence-v1`

- Generated operation sequence
- Student performs updates
- Student identifies empty or full state

### `circular-queue-wrap-v1`

- Generated capacity, front, rear, and size
- Student calculates next pointer
- Student places value at correct index

## Scoring

### Operation sequence

| Component | Weight |
|---|---:|
| Correct enqueue position | 20% |
| Correct dequeue result | 25% |
| Correct front update | 20% |
| Correct rear update | 20% |
| Correct empty/full recognition | 10% |
| Correct final queue | 5% |

### Circular queue

| Component | Weight |
|---|---:|
| Correct modulo pointer calculation | 35% |
| Correct value placement | 25% |
| Correct size | 20% |
| Correct front and rear state | 20% |

## Misconception codes

```text
QU01 Removed from the rear
QU02 Added at the front
QU03 Failed to update front
QU04 Failed to update rear
QU05 Misidentified empty queue
QU06 Incorrect circular wraparound
QU07 Confused capacity with size
QU08 Changed front during normal enqueue
QU09 Changed rear during normal dequeue
```

## Required events

```text
module_opened
mode_selected
enqueue_submitted
dequeue_submitted
front_selected
rear_selected
pointer_updated
wraparound_calculated
queue_full_identified
queue_empty_identified
action_correct
action_incorrect
hint_requested
step_completed
session_completed
assessment_submitted
```

## Counters

- Enqueues
- Dequeues
- Front reads
- Current size
- Wraparounds

## Complexity feedback

For standard queue operations:

```text
enqueue: O(1)
dequeue: O(1)
front/peek: O(1)
is empty: O(1)
```

Clarify that an inefficient array implementation that physically shifts every element is not the intended queue representation.

## Edge cases

- Enqueue into empty queue
- Dequeue final element
- Dequeue empty queue
- Peek empty queue
- Enqueue to full queue
- Circular wrap from final index to zero
- Front greater than rear in circular representation
- Duplicate values
- Reset pointer convention after queue becomes empty

## Accessibility

- Announce front and rear values and indexes.
- Provide textual pointer changes.
- Do not rely on left-to-right position alone to communicate FIFO.
- Keyboard controls must support enqueue and dequeue.
- Circular view must have an array-table alternative.
- Reduced motion must use step-based updates.

## Acceptance criteria

```text
[ ] FIFO behavior is enforced
[ ] Front and rear conventions are documented
[ ] Enqueue does not incorrectly move front
[ ] Dequeue does not incorrectly move rear
[ ] Empty and full states are correct
[ ] Circular wraparound uses modulo correctly
[ ] Previous step restores exact state
[ ] Assessment validation is server-side
[ ] QU misconception codes are emitted
[ ] Keyboard, mobile, and reduced-motion modes are tested
```
