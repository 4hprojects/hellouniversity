# Lesson 22: Quick Sort

**Course:** Data Structures and Algorithms  
**Section:** Advanced Sorting and Algorithm Design  
**Level:** Intermediate  
**Estimated Time:** 40 to 50 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/quick-sort-visualizer`

---

## Lesson Overview

Quick sort is an efficient sorting algorithm that also uses divide and conquer.

It selects a value called a pivot and partitions the list around that pivot.

Values smaller than the pivot go to one side. Values greater than the pivot go to the other side.

Quick sort is often fast in practice, but its performance depends on how well the pivot divides the list.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define quick sort.
- Explain the role of the pivot.
- Explain partitioning.
- Trace quick sort step by step.
- Implement quick sort in Python.
- Analyze best, average, and worst-case complexity.
- Compare quick sort with merge sort.

---

## Key Terms

| Term | Meaning |
|---|---|
| Quick Sort | A sorting algorithm that partitions around a pivot |
| Pivot | The selected value used for comparison |
| Partition | The process of arranging values around the pivot |
| Left Partition | Values smaller than the pivot |
| Right Partition | Values greater than the pivot |
| Divide and Conquer | Solving a problem by breaking it into smaller parts |
| In-Place Sorting | Sorting with little extra memory |

---

## Simple Explanation

Quick sort chooses a pivot.

Example list:

```text
[8, 3, 5, 1, 9]
```

Choose `5` as the pivot.

Values smaller than `5`:

```text
[3, 1]
```

Pivot:

```text
[5]
```

Values greater than `5`:

```text
[8, 9]
```

Then sort the left and right sides:

```text
[1, 3] + [5] + [8, 9]
```

Final result:

```text
[1, 3, 5, 8, 9]
```

---

## Step-by-Step Partition Example

List:

```text
[10, 7, 8, 9, 1, 5]
```

Use `5` as the pivot.

Compare each value with `5`:

| Value | Compared to Pivot 5 | Group |
|---|---|---|
| 10 | Greater | Right |
| 7 | Greater | Right |
| 8 | Greater | Right |
| 9 | Greater | Right |
| 1 | Smaller | Left |

Partition result:

```text
[1] + [5] + [10, 7, 8, 9]
```

The pivot is now in its correct sorted position.

---

## Python Implementation

```python
def quick_sort(numbers):
    if len(numbers) <= 1:
        return numbers

    pivot = numbers[-1]

    left = []
    right = []

    for value in numbers[:-1]:
        if value <= pivot:
            left.append(value)
        else:
            right.append(value)

    return quick_sort(left) + [pivot] + quick_sort(right)


scores = [10, 7, 8, 9, 1, 5]

print(quick_sort(scores))
```

Output:

```text
[1, 5, 7, 8, 9, 10]
```

---

## Code Walkthrough

```python
if len(numbers) <= 1:
    return numbers
```

This is the base case.

```python
pivot = numbers[-1]
```

This chooses the last value as the pivot.

```python
left = []
right = []
```

These lists store values smaller or greater than the pivot.

```python
for value in numbers[:-1]:
```

This checks every value except the pivot.

```python
if value <= pivot:
    left.append(value)
else:
    right.append(value)
```

This partitions the list.

```python
return quick_sort(left) + [pivot] + quick_sort(right)
```

This sorts both sides and combines the result.

---

## Quick Sort Trace

List:

```text
[8, 3, 5, 1, 9]
```

Pivot:

```text
9
```

Partition:

```text
[8, 3, 5, 1] + [9] + []
```

Sort left side:

```text
[8, 3, 5, 1]
```

Pivot:

```text
1
```

Partition:

```text
[] + [1] + [8, 3, 5]
```

Sort right side:

```text
[8, 3, 5]
```

Pivot:

```text
5
```

Partition:

```text
[3] + [5] + [8]
```

Final result:

```text
[1, 3, 5, 8, 9]
```

---

## Time and Space Complexity

| Case | Time Complexity | Reason |
|---|---|---|
| Best Case | O(n log n) | Pivot divides the list evenly |
| Average Case | O(n log n) | Pivot usually gives reasonable partitions |
| Worst Case | O(n²) | Pivot creates very unbalanced partitions |

Space complexity for the simple Python version:

```text
O(n)
```

In-place quick sort can reduce extra space, but it is harder to implement.

---

## Quick Sort vs Merge Sort

| Feature | Quick Sort | Merge Sort |
|---|---|---|
| Strategy | Partition around pivot | Split and merge |
| Average time | O(n log n) | O(n log n) |
| Worst time | O(n²) | O(n log n) |
| Extra memory | Can be low if in-place | Usually O(n) |
| Stability | Usually not stable | Stable in many implementations |
| Practical speed | Often fast | Predictable |

---

## Pivot Choice Matters

A poor pivot can make quick sort slow.

Example of bad pivot choice:

```text
[1, 2, 3, 4, 5]
```

If the last element is always chosen as pivot, the partitions become unbalanced.

Better pivot strategies include:

- Choose the middle value.
- Choose a random value.
- Use median-of-three.

---

## Common Mistakes

- Forgetting the base case.
- Including the pivot in the partition loop.
- Placing equal values inconsistently.
- Thinking quick sort is always O(n log n).
- Confusing partitioning with merging.
- Assuming the pivot is always the middle value.

---

## Real-World Applications

Quick sort is useful in:

- General-purpose sorting.
- In-memory sorting.
- Performance-focused sorting tasks.
- Teaching partition-based algorithms.
- Algorithm comparison activities.

---

## VisualDSA Integration

Use the VisualDSA Quick Sort Visualizer to explore pivot choice and partitioning.

Recommended interactions:

- Select a pivot.
- Drag values into left or right partition.
- Predict the next partition.
- Compare good and poor pivot choices.
- Trace recursive sorting.

Suggested VisualDSA route:

```text
/visualdsa/quick-sort-visualizer
```

Data that can be captured for analytics:

- Incorrect partition placement.
- Confusion about pivot role.
- Wrong recursive call prediction.
- Time spent per partition.
- Understanding of best and worst cases.

---

## Practice Activity

Trace quick sort on this list:

```text
[6, 2, 9, 3, 7]
```

Use the last value as the pivot.

Tasks:

1. Identify the first pivot.
2. Write the left partition.
3. Write the right partition.
4. Continue sorting until the list is sorted.
5. Write the final sorted list.

Reflection question:

How can a poor pivot choice affect quick sort performance?

---

## Quick Check

1. What is a pivot?
2. What does partitioning do?
3. What is the average time complexity of quick sort?
4. What is the worst-case time complexity?
5. How is quick sort different from merge sort?

---

## Answer Key

1. The pivot is the selected value used to divide the list.
2. Partitioning places smaller and greater values around the pivot.
3. O(n log n).
4. O(n²).
5. Quick sort partitions around a pivot, while merge sort splits and merges lists.

---

## Summary

Quick sort sorts data by choosing a pivot and partitioning values around it. It is often fast in practice, but its worst-case performance can become O(n²) when partitions are badly unbalanced.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 21: Merge Sort](./lesson-21-merge-sort.md)  
Next Lesson: [Lesson 23: Brute Force Algorithms](./lesson-23-brute-force-algorithms.md)
