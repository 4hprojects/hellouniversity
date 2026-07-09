# Lesson 20: Insertion Sort

**Course:** Data Structures and Algorithms  
**Section:** Searching and Sorting  
**Level:** Beginner to Intermediate  
**Estimated Time:** 30 to 40 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/insertion-sort-visualizer`

---

## Lesson Overview

Insertion sort is a sorting algorithm that builds a sorted list one item at a time.

It takes one value from the unsorted portion and inserts it into the correct position in the sorted portion.

Insertion sort is useful for small lists and lists that are already almost sorted.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define insertion sort.
- Explain sorted and unsorted portions.
- Trace how values are shifted.
- Insert a value into its correct position.
- Implement insertion sort in Python.
- Analyze best, average, and worst-case complexity.
- Compare insertion sort with bubble sort and selection sort.

---

## Key Terms

| Term | Meaning |
|---|---|
| Insertion Sort | A sorting algorithm that inserts each item into the correct position |
| Sorted Portion | The left side that is already arranged |
| Unsorted Portion | The right side that still needs processing |
| Key | The current value being inserted |
| Shift | Moving elements to make space |
| Nearly Sorted | Data that is already close to sorted |

---

## Simple Explanation

Insertion sort works like arranging playing cards in your hand.

You take one card at a time and place it in the correct position among the cards already arranged.

Example:

```text
[5, 3, 4, 1]
```

Start with `5` as sorted.

Take `3`.

Since `3` is smaller than `5`, shift `5` to the right and insert `3`.

```text
[3, 5, 4, 1]
```

Then take `4` and insert it between `3` and `5`.

```text
[3, 4, 5, 1]
```

---

## Step-by-Step Trace

List:

```text
[5, 3, 4, 1]
```

| Pass | Key | Action | List After Pass |
|---|---|---|---|
| 1 | 3 | Shift 5, insert 3 | [3, 5, 4, 1] |
| 2 | 4 | Shift 5, insert 4 | [3, 4, 5, 1] |
| 3 | 1 | Shift 5, 4, 3, insert 1 | [1, 3, 4, 5] |

Sorted list:

```text
[1, 3, 4, 5]
```

---

## Python Implementation

```python
def insertion_sort(numbers):
    for i in range(1, len(numbers)):
        key = numbers[i]
        j = i - 1

        while j >= 0 and numbers[j] > key:
            numbers[j + 1] = numbers[j]
            j -= 1

        numbers[j + 1] = key

    return numbers


grades = [85, 70, 90, 75, 88]

sorted_grades = insertion_sort(grades)

print(sorted_grades)
```

Output:

```text
[70, 75, 85, 88, 90]
```

---

## Code Walkthrough

```python
for i in range(1, len(numbers)):
```

Insertion sort starts at index `1` because the first item can be treated as already sorted.

```python
key = numbers[i]
```

The key is the value being inserted into the correct position.

```python
j = i - 1
```

This points to the last item in the sorted portion.

```python
while j >= 0 and numbers[j] > key:
```

This loop shifts larger values to the right.

```python
numbers[j + 1] = numbers[j]
```

This performs the shift.

```python
j -= 1
```

This moves left through the sorted portion.

```python
numbers[j + 1] = key
```

This inserts the key into the correct position.

---

## Sorted and Unsorted Portions

Example during sorting:

```text
[3, 4, 5 | 1]
```

Left side:

```text
[3, 4, 5]
```

This is sorted.

Right side:

```text
[1]
```

This is unsorted.

The algorithm takes the next unsorted value and inserts it into the sorted side.

---

## Time and Space Complexity

| Case | Situation | Time Complexity |
|---|---|---|
| Best Case | Already sorted | O(n) |
| Average Case | Random order | O(n²) |
| Worst Case | Reverse order | O(n²) |

Space complexity:

```text
O(1)
```

Insertion sort sorts in place.

---

## Why Insertion Sort Can Be Good

Insertion sort can perform well when:

- The list is small.
- The list is almost sorted.
- New items are added one at a time.
- Simplicity is more important than speed.

Example:

If scores are already sorted and only one new score is added, insertion sort can place that new score with little work.

---

## Insertion Sort vs Bubble Sort vs Selection Sort

| Feature | Bubble Sort | Selection Sort | Insertion Sort |
|---|---|---|---|
| Main idea | Swap adjacent values | Select minimum value | Insert value into sorted portion |
| Best case | O(n) with optimization | O(n²) | O(n) |
| Worst case | O(n²) | O(n²) | O(n²) |
| Good for nearly sorted data | Sometimes | No | Yes |
| Easy to trace | Yes | Yes | Yes |

---

## Common Mistakes

- Starting the loop at index `0` unnecessarily.
- Forgetting to store the key before shifting.
- Overwriting the key during shifting.
- Using the wrong condition in the while loop.
- Forgetting to insert the key after shifting.
- Confusing shifting with swapping.

---

## Real-World Applications

Insertion sort is useful in:

- Small data sets.
- Nearly sorted data.
- Incremental sorting.
- Teaching sorting logic.
- Simple ranking systems.
- Situations where new values arrive one by one.

---

## VisualDSA Integration

Use the VisualDSA Insertion Sort Visualizer to watch values shift and insert.

Recommended interactions:

- Enter a list of numbers.
- Highlight the key.
- Predict which values will shift.
- Insert the key into the correct position.
- Compare nearly sorted and reverse-sorted input.

Suggested VisualDSA route:

```text
/visualdsa/insertion-sort-visualizer
```

Data that can be captured for analytics:

- Incorrect key placement.
- Confusion between shift and swap.
- Wrong sorted portion identification.
- Time spent per insertion.
- Accuracy in predicting shifted values.

---

## Practice Activity

Sort these student grades using insertion sort:

```text
[82, 75, 91, 78, 88]
```

Tasks:

1. Identify the key during the first pass.
2. Show the list after the first pass.
3. Show the list after the second pass.
4. Show the final sorted list.

Reflection question:

Why does insertion sort work well when data is already almost sorted?

---

## Quick Check

1. What does insertion sort do with each new value?
2. What is the key?
3. What does shifting mean?
4. What is the best-case time complexity?
5. What type of data is insertion sort good for?

---

## Answer Key

1. It inserts each value into the correct position in the sorted portion.
2. The key is the current value being inserted.
3. Shifting means moving larger values to the right to make space.
4. O(n).
5. Small or nearly sorted data.

---

## Summary

Insertion sort builds a sorted list one value at a time. It shifts larger values to make space for the current key. It is simple, in-place, and effective for small or nearly sorted data.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 19: Selection Sort](./lesson-19-selection-sort.md)  
Next Lesson: [Lesson 21: Merge Sort](./lesson-21-merge-sort.md)
