# Lesson 18: Bubble Sort

**Course:** Data Structures and Algorithms  
**Section:** Searching and Sorting  
**Level:** Beginner  
**Estimated Time:** 30 to 40 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/bubble-sort-visualizer`

---

## Lesson Overview

Bubble sort is a simple sorting algorithm.

It repeatedly compares adjacent elements and swaps them if they are in the wrong order.

After each pass, the largest unsorted value moves toward the end of the list.

Bubble sort is easy to understand, but it is not efficient for large data sets.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define bubble sort.
- Explain adjacent comparison.
- Trace bubble sort pass by pass.
- Implement bubble sort in Python.
- Explain the swapped flag optimization.
- Analyze the time and space complexity of bubble sort.
- Recognize when bubble sort is not practical.

---

## Key Terms

| Term | Meaning |
|---|---|
| Sorting | Arranging data in a specific order |
| Bubble Sort | A sorting algorithm that swaps adjacent elements |
| Adjacent | Beside each other |
| Swap | Exchange positions of two elements |
| Pass | One full scan through the list |
| Swapped Flag | A variable used to detect if a swap happened |

---

## Simple Explanation

Bubble sort compares two values beside each other.

If the left value is greater than the right value, they swap.

Example:

```text
[5, 2, 4, 1]
```

Compare `5` and `2`.

Since `5` is greater than `2`, swap them:

```text
[2, 5, 4, 1]
```

The larger values slowly move to the right side.

---

## Step-by-Step Trace

List:

```text
[5, 2, 4, 1]
```

First pass:

| Comparison | Action | List |
|---|---|---|
| 5 and 2 | Swap | [2, 5, 4, 1] |
| 5 and 4 | Swap | [2, 4, 5, 1] |
| 5 and 1 | Swap | [2, 4, 1, 5] |

After the first pass, `5` is in the correct final position.

Second pass:

| Comparison | Action | List |
|---|---|---|
| 2 and 4 | No swap | [2, 4, 1, 5] |
| 4 and 1 | Swap | [2, 1, 4, 5] |

Third pass:

| Comparison | Action | List |
|---|---|---|
| 2 and 1 | Swap | [1, 2, 4, 5] |

Sorted list:

```text
[1, 2, 4, 5]
```

---

## Python Implementation

```python
def bubble_sort(numbers):
    n = len(numbers)

    for i in range(n):
        for j in range(0, n - i - 1):
            if numbers[j] > numbers[j + 1]:
                numbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]

    return numbers


scores = [85, 70, 90, 60, 75]

sorted_scores = bubble_sort(scores)

print(sorted_scores)
```

Output:

```text
[60, 70, 75, 85, 90]
```

---

## Code Walkthrough

```python
n = len(numbers)
```

This stores the number of elements.

```python
for i in range(n):
```

This controls the number of passes.

```python
for j in range(0, n - i - 1):
```

This compares adjacent elements.

The `n - i - 1` part avoids checking values already placed at the end.

```python
if numbers[j] > numbers[j + 1]:
```

This checks whether two adjacent elements are in the wrong order.

```python
numbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]
```

This swaps the two values.

---

## Optimized Bubble Sort

If no swaps happen during a pass, the list is already sorted.

```python
def bubble_sort_optimized(numbers):
    n = len(numbers)

    for i in range(n):
        swapped = False

        for j in range(0, n - i - 1):
            if numbers[j] > numbers[j + 1]:
                numbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]
                swapped = True

        if not swapped:
            break

    return numbers
```

---

## Time and Space Complexity

| Case | Time Complexity |
|---|---|
| Best Case | O(n) with optimization |
| Average Case | O(n²) |
| Worst Case | O(n²) |

Space complexity:

```text
O(1)
```

Bubble sort sorts the list in place and does not need another list.

---

## Common Mistakes

- Forgetting to compare adjacent elements.
- Using the wrong loop range.
- Forgetting that the last elements become sorted after each pass.
- Swapping when values are already in correct order.
- Thinking bubble sort is good for large data sets.
- Forgetting to reset the swapped flag each pass.

---

## Real-World Applications

Bubble sort is rarely used in real systems for large data.

It is useful for:

- Learning sorting logic.
- Practicing nested loops.
- Understanding swaps.
- Visualizing how sorting works.
- Small lists where performance does not matter.

---

## VisualDSA Integration

Use the VisualDSA Bubble Sort Visualizer to see comparisons and swaps.

Recommended interactions:

- Enter a list of numbers.
- Highlight adjacent elements.
- Predict whether a swap is needed.
- Watch each pass.
- Count total comparisons and swaps.

Suggested VisualDSA route:

```text
/visualdsa/bubble-sort-visualizer
```

Data that can be captured for analytics:

- Wrong swap predictions.
- Number of comparisons understood.
- Confusion about passes.
- Time spent tracing.
- Accuracy in identifying the sorted portion.

---

## Practice Activity

Sort these quiz scores using bubble sort:

```text
[76, 89, 65, 92, 80]
```

Tasks:

1. Show the list after the first pass.
2. Show the final sorted list.
3. Count how many swaps happened in the first pass.

Reflection question:

Why does the largest value move to the end after the first pass?

---

## Quick Check

1. What does bubble sort compare?
2. What does swap mean?
3. What happens after each pass?
4. What is the worst-case time complexity?
5. What does the swapped flag help detect?

---

## Answer Key

1. Bubble sort compares adjacent elements.
2. Swap means exchange the positions of two values.
3. One large unsorted value moves to its correct position near the end.
4. O(n²).
5. It detects whether the list is already sorted.

---

## Summary

Bubble sort is a simple sorting algorithm that compares adjacent values and swaps them when needed. It is easy to trace and useful for learning, but it is inefficient for large lists.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 17: Binary Search](./lesson-17-binary-search.md)  
Next Lesson: [Lesson 19: Selection Sort](./lesson-19-selection-sort.md)
