# Lesson 13: Heaps

**Course:** Data Structures and Algorithms  
**Section:** Non-Linear Data Structures  
**Level:** Intermediate  
**Estimated Time:** 35 to 45 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/heap-visualizer`

---

## Lesson Overview

A heap is a special tree-based data structure that follows a priority rule.

The most common types are:

- Max heap
- Min heap

In a max heap, the largest value is at the root.  
In a min heap, the smallest value is at the root.

Heaps are often used to implement priority queues.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a heap.
- Differentiate max heap and min heap.
- Explain the complete binary tree property.
- Perform basic heap insertion.
- Explain heapify.
- Describe how heaps support priority queues.
- Recognize common heap mistakes.

---

## Key Terms

| Term | Meaning |
|---|---|
| Heap | A complete binary tree that follows a priority rule |
| Max Heap | A heap where each parent is greater than or equal to its children |
| Min Heap | A heap where each parent is less than or equal to its children |
| Complete Binary Tree | A tree filled from left to right on each level |
| Heapify | The process of restoring the heap property |
| Priority Queue | A queue where items are removed based on priority |

---

## Simple Explanation

A heap is like a priority-based tree.

In a max heap, the highest value stays at the top.

Example max heap:

```text
        90
       /  \
     70    80
    / \   /
   40 50 60
```

The root is `90`, which is the largest value.

---

## Heap Properties

A heap must satisfy two main properties.

## 1. Shape Property

A heap must be a complete binary tree.

This means the tree is filled level by level from left to right.

Valid:

```text
        10
       /  \
      8    9
     /
    5
```

Invalid:

```text
        10
       /  \
      8    9
       \
        5
```

The second tree is invalid because a node is placed on the right before the left side is filled.

## 2. Heap Order Property

For a max heap:

```text
parent >= child
```

For a min heap:

```text
parent <= child
```

---

## Max Heap vs Min Heap

| Feature | Max Heap | Min Heap |
|---|---|---|
| Root value | Largest | Smallest |
| Parent rule | Parent greater than or equal to children | Parent less than or equal to children |
| Common use | Get highest priority | Get lowest priority |
| Example | Highest score first | Shortest task first |

---

## Heap as an Array

A heap is often stored in an array.

Example heap:

```text
        90
       /  \
     70    80
    / \   /
   40 50 60
```

Array form:

```text
[90, 70, 80, 40, 50, 60]
```

For a node at index `i`:

```text
left child index = 2i + 1
right child index = 2i + 2
parent index = (i - 1) // 2
```

---

## Python Min Heap Using heapq

Python has a built-in module named `heapq`. It implements a min heap.

```python
import heapq

numbers = []

heapq.heappush(numbers, 40)
heapq.heappush(numbers, 10)
heapq.heappush(numbers, 30)
heapq.heappush(numbers, 20)

print(numbers)

smallest = heapq.heappop(numbers)

print("Removed:", smallest)
print("Heap:", numbers)
```

Output may look like:

```text
[10, 20, 30, 40]
Removed: 10
Heap: [20, 40, 30]
```

The internal array may not look fully sorted, but it still follows the heap property.

---

## Code Walkthrough

```python
import heapq
```

This imports Python’s heap module.

```python
heapq.heappush(numbers, 40)
```

This inserts a value while keeping the heap property.

```python
heapq.heappop(numbers)
```

This removes and returns the smallest value.

In Python’s `heapq`, the smallest value has the highest priority by default.

---

## Manual Max Heap Insert Concept

When inserting into a max heap:

1. Add the new value at the next open position.
2. Compare it with its parent.
3. If it is greater than the parent, swap.
4. Repeat until the heap property is restored.

Example:

Insert `100` into this max heap:

```text
        90
       /  \
     70    80
```

Add `100`:

```text
        90
       /  \
     70    80
    /
  100
```

Swap with `70`:

```text
        90
       /  \
    100    80
    /
   70
```

Swap with `90`:

```text
       100
       /  \
     90    80
    /
   70
```

---

## Priority Queue Example

Suppose tasks have priorities.

Lower number means higher priority:

```python
import heapq

tasks = []

heapq.heappush(tasks, (1, "Submit assignment"))
heapq.heappush(tasks, (3, "Check email"))
heapq.heappush(tasks, (2, "Review notes"))

while tasks:
    priority, task = heapq.heappop(tasks)
    print(priority, task)
```

Output:

```text
1 Submit assignment
2 Review notes
3 Check email
```

---

## Time and Space Complexity

| Operation | Complexity |
|---|---|
| Insert | O(log n) |
| Remove root | O(log n) |
| Peek root | O(1) |
| Build heap | O(n) |

Space complexity:

```text
O(n)
```

The heap stores `n` values.

---

## Common Mistakes

- Thinking a heap is always fully sorted.
- Confusing heap with Binary Search Tree.
- Forgetting the complete binary tree requirement.
- Assuming Python `heapq` creates a max heap by default.
- Removing from the wrong position.
- Forgetting to heapify after insertion or deletion.

---

## Real-World Applications

Heaps are used in:

- Priority queues.
- Task scheduling.
- Dijkstra’s shortest path algorithm.
- Heap sort.
- Event simulation.
- Finding top values.
- Operating system scheduling.

---

## VisualDSA Integration

Use the VisualDSA Heap Visualizer to build and modify heaps step by step.

Recommended interactions:

- Insert values into a max heap.
- Insert values into a min heap.
- Predict swaps during heapify.
- Remove the root.
- Compare heap and BST structures.

Suggested VisualDSA route:

```text
/visualdsa/heap-visualizer
```

Data that can be captured for analytics:

- Incorrect swap predictions.
- Confusion between min heap and max heap.
- Wrong parent or child index calculations.
- Time spent restoring heap property.
- Number of heapify attempts.

---

## Practice Activity

Create a priority queue using Python’s `heapq`.

The program should store tasks using this format:

```text
(priority, task_name)
```

Sample tasks:

```text
(2, "Review lesson")
(1, "Submit assignment")
(3, "Read notes")
```

Expected output order:

```text
Submit assignment
Review lesson
Read notes
```

Reflection question:

Why is a heap useful for a priority queue?

---

## Quick Check

1. What is a heap?
2. What value is at the root of a max heap?
3. What value is at the root of a min heap?
4. What does heapify do?
5. What Python module can be used for heaps?

---

## Answer Key

1. A heap is a complete binary tree that follows a priority rule.
2. The largest value.
3. The smallest value.
4. Heapify restores the heap property.
5. `heapq`.

---

## Summary

A heap is a complete binary tree that keeps the highest or lowest priority value at the root. Max heaps place the largest value at the top. Min heaps place the smallest value at the top. Heaps are useful for priority queues, scheduling, and algorithms that repeatedly need the next highest or lowest value.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 12: Tree Traversals](./lesson-12-tree-traversals.md)  
Next Lesson: [Lesson 14: Graphs](./lesson-14-graphs.md)
