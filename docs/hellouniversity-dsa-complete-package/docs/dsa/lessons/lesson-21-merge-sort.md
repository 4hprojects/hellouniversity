# Lesson 21: Merge Sort

**Course:** Data Structures and Algorithms  
**Section:** Advanced Sorting and Algorithm Design  
**Level:** Intermediate  
**Estimated Time:** 40 to 50 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/merge-sort-visualizer`

---

## Lesson Overview

Merge sort is an efficient sorting algorithm that uses the divide and conquer strategy.

It works by dividing a list into smaller parts, sorting those parts, and merging them back together in sorted order.

Merge sort is faster than bubble sort, selection sort, and insertion sort for large data sets.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define merge sort.
- Explain the divide and conquer strategy.
- Trace how a list is split and merged.
- Implement merge sort in Python.
- Analyze the time and space complexity of merge sort.
- Compare merge sort with basic sorting algorithms.
- Identify when merge sort is useful.

---

## Key Terms

| Term | Meaning |
|---|---|
| Merge Sort | A sorting algorithm that divides and merges lists |
| Divide and Conquer | A strategy that breaks a problem into smaller parts |
| Divide | Split the list into smaller lists |
| Merge | Combine sorted lists into one sorted list |
| Recursive Case | The part that keeps dividing the list |
| Base Case | The condition that stops division |
| Stable Sort | A sort that preserves the order of equal values |

---

## Simple Explanation

Merge sort follows three main steps:

1. Divide the list into smaller lists.
2. Sort the smaller lists.
3. Merge the sorted lists back together.

Example:

```text
[8, 3, 5, 1]
```

Split:

```text
[8, 3] and [5, 1]
```

Split again:

```text
[8] [3] [5] [1]
```

Merge in sorted order:

```text
[3, 8] and [1, 5]
```

Final merge:

```text
[1, 3, 5, 8]
```

---

## Step-by-Step Split

Original list:

```text
[38, 27, 43, 3, 9, 82, 10]
```

Split process:

```text
[38, 27, 43, 3, 9, 82, 10]
[38, 27, 43] and [3, 9, 82, 10]
[38] [27, 43] and [3, 9] [82, 10]
[38] [27] [43] [3] [9] [82] [10]
```

The base case is reached when each list has one element.

A one-element list is already sorted.

---

## Step-by-Step Merge

Merge smaller lists in sorted order:

```text
[27] and [43] → [27, 43]
[3] and [9] → [3, 9]
[10] and [82] → [10, 82]
```

Then merge larger sorted lists:

```text
[38] and [27, 43] → [27, 38, 43]
[3, 9] and [10, 82] → [3, 9, 10, 82]
```

Final merge:

```text
[27, 38, 43] and [3, 9, 10, 82]
→ [3, 9, 10, 27, 38, 43, 82]
```

---

## Python Implementation

```python
def merge_sort(numbers):
    if len(numbers) <= 1:
        return numbers

    mid = len(numbers) // 2

    left_half = numbers[:mid]
    right_half = numbers[mid:]

    sorted_left = merge_sort(left_half)
    sorted_right = merge_sort(right_half)

    return merge(sorted_left, sorted_right)


def merge(left, right):
    result = []
    i = 0
    j = 0

    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1

    result.extend(left[i:])
    result.extend(right[j:])

    return result


scores = [38, 27, 43, 3, 9, 82, 10]

print(merge_sort(scores))
```

Output:

```text
[3, 9, 10, 27, 38, 43, 82]
```

---

## Code Walkthrough

```python
if len(numbers) <= 1:
    return numbers
```

This is the base case. A list with zero or one element is already sorted.

```python
mid = len(numbers) // 2
```

This finds the middle index.

```python
left_half = numbers[:mid]
right_half = numbers[mid:]
```

This divides the list into two parts.

```python
sorted_left = merge_sort(left_half)
sorted_right = merge_sort(right_half)
```

This recursively sorts both halves.

```python
return merge(sorted_left, sorted_right)
```

This combines the sorted halves.

---

## Merge Function Walkthrough

```python
while i < len(left) and j < len(right):
```

This loop continues while both lists still have items.

```python
if left[i] <= right[j]:
```

This compares the current values from both lists.

```python
result.append(left[i])
```

The smaller value is added to the result.

```python
result.extend(left[i:])
result.extend(right[j:])
```

Any remaining values are added after one list becomes empty.

---

## Time and Space Complexity

| Case | Time Complexity |
|---|---|
| Best Case | O(n log n) |
| Average Case | O(n log n) |
| Worst Case | O(n log n) |

Space complexity:

```text
O(n)
```

Merge sort needs extra space for the temporary merged lists.

---

## Merge Sort vs Basic Sorts

| Algorithm | Average Time | Good For |
|---|---|---|
| Bubble Sort | O(n²) | Learning swaps |
| Selection Sort | O(n²) | Learning minimum selection |
| Insertion Sort | O(n²) | Small or nearly sorted data |
| Merge Sort | O(n log n) | Larger data sets |

Merge sort is more efficient for larger lists because it reduces the problem size through division.

---

## Common Mistakes

- Forgetting the base case.
- Splitting the list incorrectly.
- Not returning the merged list.
- Forgetting to add remaining values after merging.
- Confusing merge sort with quick sort.
- Thinking merge sort sorts in place without extra memory.

---

## Real-World Applications

Merge sort is useful in:

- Sorting large data sets.
- External sorting.
- Sorting linked lists.
- Stable sorting needs.
- Teaching divide and conquer.
- Systems where predictable O(n log n) performance matters.

---

## VisualDSA Integration

Use the VisualDSA Merge Sort Visualizer to see how the list splits and merges.

Recommended interactions:

- Enter a list of values.
- Watch the recursive split.
- Predict the next merge result.
- Compare left and right list values.
- Count the number of merge operations.

Suggested VisualDSA route:

```text
/visualdsa/merge-sort-visualizer
```

Data that can be captured for analytics:

- Incorrect split prediction.
- Incorrect merge order.
- Confusion about base case.
- Time spent tracing recursion.
- Accuracy in comparing values during merge.

---

## Practice Activity

Trace merge sort on this list:

```text
[12, 5, 9, 1, 15, 3]
```

Tasks:

1. Show the first split.
2. Continue splitting until each list has one element.
3. Show the first two merge operations.
4. Show the final sorted list.

Reflection question:

Why does merge sort have O(n log n) time complexity?

---

## Quick Check

1. What strategy does merge sort use?
2. What is the base case in merge sort?
3. What does the merge step do?
4. What is the time complexity of merge sort?
5. Why does merge sort need extra space?

---

## Answer Key

1. Divide and conquer.
2. A list with zero or one element.
3. It combines two sorted lists into one sorted list.
4. O(n log n).
5. It creates temporary lists during merging.

---

## Summary

Merge sort uses divide and conquer to split a list into smaller parts, sort them, and merge them back together. It has predictable O(n log n) time complexity, but it requires extra memory.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 20: Insertion Sort](./lesson-20-insertion-sort.md)  
Next Lesson: [Lesson 22: Quick Sort](./lesson-22-quick-sort.md)
