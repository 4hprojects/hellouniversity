# Project 5: Sorting Algorithm Visual Comparison

**Course:** Data Structures and Algorithms  
**Section:** Applied DSA Projects  
**Level:** Intermediate  
**Estimated Time:** 90 to 120 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/sorting-comparison-lab`

---

## Project Overview

In this project, you will compare different sorting algorithms using the same input list.

The goal is to observe how many comparisons, swaps, or steps each sorting algorithm performs.

This project helps you understand why time complexity matters.

---

## DSA Concepts Used

| Concept | How It Is Used |
|---|---|
| Sorting | Arranges values in order |
| Bubble Sort | Compares and swaps adjacent values |
| Selection Sort | Selects the minimum value each pass |
| Insertion Sort | Inserts values into a sorted portion |
| Merge Sort | Uses divide and conquer |
| Quick Sort | Uses pivot partitioning |
| Complexity Analysis | Compares algorithm performance |

---

## Problem Scenario

A student wants to compare sorting algorithms using the same list of quiz scores.

The program should sort the list using different algorithms and show:

- Sorted output
- Number of comparisons
- Number of swaps or moves when applicable
- General time complexity

This helps students see that algorithms can produce the same result but behave differently.

---

## Learning Objectives

After completing this project, you should be able to:

- Implement multiple sorting algorithms.
- Compare sorting outputs.
- Track comparisons and swaps.
- Explain why some algorithms are slower.
- Connect practical results to Big O notation.
- Use sorting comparison as a learning tool.

---

## System Requirements

The program should include these features:

1. Store a list of numbers.
2. Sort the list using bubble sort.
3. Sort the list using selection sort.
4. Sort the list using insertion sort.
5. Optional: sort using merge sort.
6. Optional: sort using quick sort.
7. Display comparison counts.
8. Display sorted output for each algorithm.

---

## Sample Input

```python
scores = [76, 89, 65, 92, 80, 70]
```

---

## Sample Output

```text
Original List:
[76, 89, 65, 92, 80, 70]

Bubble Sort:
Sorted: [65, 70, 76, 80, 89, 92]
Comparisons: 15
Swaps: 8

Selection Sort:
Sorted: [65, 70, 76, 80, 89, 92]
Comparisons: 15
Swaps: 5

Insertion Sort:
Sorted: [65, 70, 76, 80, 89, 92]
Comparisons: 12
Shifts: 8
```

---

## Starter Code

```python
def bubble_sort(numbers):
    arr = numbers.copy()
    comparisons = 0
    swaps = 0

    n = len(arr)

    for i in range(n):
        for j in range(0, n - i - 1):
            comparisons += 1

            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swaps += 1

    return arr, comparisons, swaps


def selection_sort(numbers):
    arr = numbers.copy()
    comparisons = 0
    swaps = 0

    n = len(arr)

    for i in range(n):
        min_index = i

        for j in range(i + 1, n):
            comparisons += 1

            if arr[j] < arr[min_index]:
                min_index = j

        if min_index != i:
            arr[i], arr[min_index] = arr[min_index], arr[i]
            swaps += 1

    return arr, comparisons, swaps


def insertion_sort(numbers):
    arr = numbers.copy()
    comparisons = 0
    shifts = 0

    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1

        while j >= 0:
            comparisons += 1

            if arr[j] > key:
                arr[j + 1] = arr[j]
                shifts += 1
                j -= 1
            else:
                break

        arr[j + 1] = key

    return arr, comparisons, shifts


scores = [76, 89, 65, 92, 80, 70]

print("Original List:")
print(scores)

bubble_result, bubble_comparisons, bubble_swaps = bubble_sort(scores)
selection_result, selection_comparisons, selection_swaps = selection_sort(scores)
insertion_result, insertion_comparisons, insertion_shifts = insertion_sort(scores)

print("\nBubble Sort:")
print("Sorted:", bubble_result)
print("Comparisons:", bubble_comparisons)
print("Swaps:", bubble_swaps)

print("\nSelection Sort:")
print("Sorted:", selection_result)
print("Comparisons:", selection_comparisons)
print("Swaps:", selection_swaps)

print("\nInsertion Sort:")
print("Sorted:", insertion_result)
print("Comparisons:", insertion_comparisons)
print("Shifts:", insertion_shifts)
```

---

## Code Walkthrough

Each sorting function starts with:

```python
arr = numbers.copy()
```

This keeps the original list unchanged.

Each algorithm tracks comparisons.

Bubble sort tracks swaps between adjacent values.

Selection sort tracks swaps after finding the minimum.

Insertion sort tracks shifts while inserting the key.

This makes the algorithms easier to compare.

---

## Optional Merge Sort Extension

You can add merge sort as an extension.

```python
def merge_sort(numbers):
    if len(numbers) <= 1:
        return numbers

    mid = len(numbers) // 2
    left = merge_sort(numbers[:mid])
    right = merge_sort(numbers[mid:])

    return merge(left, right)


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
```

---

## Optional Quick Sort Extension

You can add quick sort as an extension.

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
```

---

## Comparison Table

| Algorithm | Average Time | Main Behavior |
|---|---|---|
| Bubble Sort | O(n²) | Many adjacent swaps |
| Selection Sort | O(n²) | Fewer swaps, many comparisons |
| Insertion Sort | O(n²) | Good for nearly sorted data |
| Merge Sort | O(n log n) | Splits and merges |
| Quick Sort | O(n log n) average | Partitions around pivot |

---

## Test Cases

Try these input lists:

Already sorted:

```python
[1, 2, 3, 4, 5]
```

Reverse sorted:

```python
[5, 4, 3, 2, 1]
```

Random order:

```python
[8, 3, 7, 1, 9]
```

Nearly sorted:

```python
[1, 2, 4, 3, 5]
```

Questions to observe:

- Which algorithm performs fewer swaps?
- Which algorithm benefits from nearly sorted data?
- Which algorithm performs poorly on reverse sorted data?
- Do all algorithms produce the same final sorted list?

---

## Time Complexity Guide

| Algorithm | Best Case | Average Case | Worst Case |
|---|---|---|---|
| Bubble Sort | O(n) with optimization | O(n²) | O(n²) |
| Selection Sort | O(n²) | O(n²) | O(n²) |
| Insertion Sort | O(n) | O(n²) | O(n²) |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) |
| Quick Sort | O(n log n) | O(n log n) | O(n²) |

---

## VisualDSA Integration

Use the VisualDSA Sorting Comparison Lab to compare algorithms visually.

Suggested VisualDSA route:

```text
/visualdsa/sorting-comparison-lab
```

Recommended interactions:

- Enter one input list.
- Run multiple sorting algorithms.
- Count comparisons and swaps.
- Show bar-style step comparison.
- Animate sorting side by side.
- Compare sorted, reverse sorted, random, and nearly sorted inputs.

Data that can be captured for analytics:

- Algorithm comparison accuracy.
- Complexity interpretation.
- Mistakes in identifying swaps and comparisons.
- Time spent per algorithm.
- Difficulty recognizing best and worst cases.
- Final review score.

---

## Project Checklist

Your output should include:

- Original list display.
- Bubble sort result.
- Selection sort result.
- Insertion sort result.
- Comparison counts.
- Swap or shift counts.
- Same sorted output across algorithms.
- Clear comparison table or summary.
- Optional merge sort and quick sort.

---

## Suggested Improvements

After completing the basic version, improve the program by adding:

- User input for custom numbers.
- Random list generator.
- Runtime measurement.
- Bar chart using a plotting library.
- Export comparison results to a file.
- Web-based visualization.
- VisualDSA animation support.

---

## Rubric

| Criteria | Points |
|---|---:|
| Bubble sort implementation | 15 |
| Selection sort implementation | 15 |
| Insertion sort implementation | 15 |
| Correct comparison tracking | 15 |
| Correct swap or shift tracking | 10 |
| Clear output comparison | 10 |
| Explanation of complexity | 10 |
| Code readability and organization | 5 |
| Reflection answers | 5 |
| Total | 100 |

---

## Reflection Questions

1. Why do different sorting algorithms produce the same final output but use different steps?
2. Which algorithm made the most swaps?
3. Which algorithm is better for nearly sorted data?
4. Why is O(n log n) better than O(n²) for large inputs?
5. How would a visual comparison help beginners understand sorting?

---

## Related Lessons

- [Lesson 18: Bubble Sort](../lessons/lesson-18-bubble-sort.md)
- [Lesson 19: Selection Sort](../lessons/lesson-19-selection-sort.md)
- [Lesson 20: Insertion Sort](../lessons/lesson-20-insertion-sort.md)
- [Lesson 21: Merge Sort](../lessons/lesson-21-merge-sort.md)
- [Lesson 22: Quick Sort](../lessons/lesson-22-quick-sort.md)
- [Lesson 30: DSA Review and Integration](../lessons/lesson-30-dsa-review-and-integration.md)
