# Lesson 19: Selection Sort

**Course:** Data Structures and Algorithms  
**Section:** Searching and Sorting  
**Level:** Beginner  
**Estimated Time:** 30 to 40 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/selection-sort-visualizer`

---

## Lesson Overview

Selection sort is a sorting algorithm that repeatedly selects the smallest value from the unsorted part of the list and places it in the correct position.

It divides the list into two parts:

- Sorted part
- Unsorted part

Selection sort is simple and predictable, but it is slow for large lists.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define selection sort.
- Identify the sorted and unsorted portions of a list.
- Find the minimum value in the unsorted portion.
- Trace selection sort step by step.
- Implement selection sort in Python.
- Analyze its time and space complexity.
- Compare selection sort with bubble sort.

---

## Key Terms

| Term | Meaning |
|---|---|
| Selection Sort | A sorting algorithm that selects the minimum value each pass |
| Minimum Value | The smallest value in the unsorted section |
| Sorted Portion | The part of the list already arranged |
| Unsorted Portion | The part of the list still being checked |
| Swap | Exchange the positions of two values |
| Pass | One full process of finding and placing a minimum value |

---

## Simple Explanation

Selection sort looks for the smallest value and places it at the beginning.

Example:

```text
[29, 10, 14, 37, 13]
```

The smallest value is `10`.

Swap it with the first value:

```text
[10, 29, 14, 37, 13]
```

Now the first position is sorted.

The algorithm repeats this process for the remaining unsorted values.

---

## Step-by-Step Trace

List:

```text
[29, 10, 14, 37, 13]
```

| Pass | Unsorted Portion | Minimum | Action | List After Pass |
|---|---|---|---|---|
| 1 | [29, 10, 14, 37, 13] | 10 | Swap with 29 | [10, 29, 14, 37, 13] |
| 2 | [29, 14, 37, 13] | 13 | Swap with 29 | [10, 13, 14, 37, 29] |
| 3 | [14, 37, 29] | 14 | No swap needed | [10, 13, 14, 37, 29] |
| 4 | [37, 29] | 29 | Swap with 37 | [10, 13, 14, 29, 37] |

Sorted list:

```text
[10, 13, 14, 29, 37]
```

---

## Python Implementation

```python
def selection_sort(numbers):
    n = len(numbers)

    for i in range(n):
        min_index = i

        for j in range(i + 1, n):
            if numbers[j] < numbers[min_index]:
                min_index = j

        numbers[i], numbers[min_index] = numbers[min_index], numbers[i]

    return numbers


prices = [29, 10, 14, 37, 13]

sorted_prices = selection_sort(prices)

print(sorted_prices)
```

Output:

```text
[10, 13, 14, 29, 37]
```

---

## Code Walkthrough

```python
for i in range(n):
```

This loop marks the current position where the next smallest value should go.

```python
min_index = i
```

This assumes the current position contains the minimum value.

```python
for j in range(i + 1, n):
```

This searches the unsorted portion of the list.

```python
if numbers[j] < numbers[min_index]:
    min_index = j
```

This updates the minimum index if a smaller value is found.

```python
numbers[i], numbers[min_index] = numbers[min_index], numbers[i]
```

This places the minimum value in the correct position.

---

## Selection Sort Sections

During sorting, the list has two sections.

Example:

```text
[10, 13 | 14, 37, 29]
```

Left side:

```text
[10, 13]
```

This is sorted.

Right side:

```text
[14, 37, 29]
```

This is unsorted.

The boundary moves to the right after each pass.

---

## Selection Sort vs Bubble Sort

| Feature | Bubble Sort | Selection Sort |
|---|---|---|
| Main action | Swap adjacent elements | Select minimum value |
| Swaps | Can be many | Fewer swaps |
| Comparisons | Many | Many |
| Time complexity | O(n²) | O(n²) |
| Easy to visualize | Yes | Yes |

Selection sort usually performs fewer swaps than bubble sort, but both are inefficient for large lists.

---

## Time and Space Complexity

| Case | Time Complexity |
|---|---|
| Best Case | O(n²) |
| Average Case | O(n²) |
| Worst Case | O(n²) |

Space complexity:

```text
O(1)
```

Selection sort sorts the list in place.

---

## Common Mistakes

- Forgetting to reset `min_index`.
- Searching the sorted portion again.
- Swapping inside the inner loop too early.
- Confusing the minimum value with the minimum index.
- Thinking selection sort becomes O(n) when the list is already sorted.
- Forgetting that the sorted portion grows after each pass.

---

## Real-World Applications

Selection sort is useful for learning:

- How minimum selection works.
- How sorted and unsorted portions are managed.
- How nested loops are used in sorting.
- How swap counts can be reduced.

It is not usually chosen for large real-world systems.

---

## VisualDSA Integration

Use the VisualDSA Selection Sort Visualizer to identify the minimum value in each pass.

Recommended interactions:

- Enter a list of numbers.
- Highlight the unsorted portion.
- Select the current minimum value.
- Predict the swap.
- Watch the sorted portion grow.

Suggested VisualDSA route:

```text
/visualdsa/selection-sort-visualizer
```

Data that can be captured for analytics:

- Wrong minimum selection.
- Confusion between value and index.
- Incorrect swap prediction.
- Time spent per pass.
- Accuracy in identifying sorted and unsorted portions.

---

## Practice Activity

Sort these product prices using selection sort:

```text
[45, 12, 78, 23, 10]
```

Tasks:

1. Identify the minimum value in the first pass.
2. Show the list after the first pass.
3. Show the final sorted list.
4. Count how many passes are needed.

Reflection question:

Why does selection sort still take O(n²) even if the list is already sorted?

---

## Quick Check

1. What does selection sort select each pass?
2. What are the two sections of the list during selection sort?
3. When does the swap usually happen?
4. What is the time complexity of selection sort?
5. Does selection sort require extra memory?

---

## Answer Key

1. It selects the minimum value from the unsorted portion.
2. The sorted portion and the unsorted portion.
3. After the minimum value is found.
4. O(n²).
5. No. It uses O(1) extra space.

---

## Summary

Selection sort works by repeatedly finding the minimum value in the unsorted portion and moving it to the correct position. It is simple and performs fewer swaps than bubble sort, but it still requires many comparisons.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 18: Bubble Sort](./lesson-18-bubble-sort.md)  
Next Lesson: [Lesson 20: Insertion Sort](./lesson-20-insertion-sort.md)
