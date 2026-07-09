# Lesson 17: Binary Search

**Course:** Data Structures and Algorithms  
**Section:** Searching and Sorting  
**Level:** Beginner to Intermediate  
**Estimated Time:** 30 to 40 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/binary-search-visualizer`

---

## Lesson Overview

Binary search is an efficient searching algorithm for sorted data.

Instead of checking each value one by one, binary search repeatedly divides the search range in half.

This makes binary search much faster than linear search for large sorted lists.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define binary search.
- Explain why binary search requires sorted data.
- Identify the low, mid, and high positions.
- Trace binary search step by step.
- Implement binary search in Python.
- Compare binary search with linear search.
- Analyze the time and space complexity of binary search.

---

## Key Terms

| Term | Meaning |
|---|---|
| Binary Search | A search algorithm that divides a sorted list in half |
| Sorted Data | Data arranged in order |
| Low | The starting index of the current search range |
| High | The ending index of the current search range |
| Mid | The middle index of the current search range |
| Divide and Conquer | A strategy that breaks a problem into smaller parts |

---

## Simple Explanation

Binary search works like guessing a number.

If the list is sorted, you can check the middle value first.

Example list:

```text
[10, 20, 30, 40, 50, 60, 70]
```

Target:

```text
60
```

Steps:

```text
Middle is 40.
60 is greater than 40, so search the right half.

Right half is [50, 60, 70].
Middle is 60.
Target found.
```

---

## Important Rule

Binary search only works correctly on sorted data.

Valid input:

```text
[5, 10, 15, 20, 25]
```

Invalid input:

```text
[20, 5, 25, 10, 15]
```

If the list is not sorted, binary search may remove the wrong half and miss the target.

---

## Step-by-Step Trace

List:

```text
[3, 8, 12, 18, 25, 31, 40]
```

Target:

```text
31
```

| Step | Low | Mid | High | Middle Value | Decision |
|---|---|---|---|---|---|
| 1 | 0 | 3 | 6 | 18 | Target is greater, move right |
| 2 | 4 | 5 | 6 | 31 | Found |

---

## Python Implementation

```python
def binary_search(numbers, target):
    low = 0
    high = len(numbers) - 1

    while low <= high:
        mid = (low + high) // 2

        if numbers[mid] == target:
            return mid
        elif target > numbers[mid]:
            low = mid + 1
        else:
            high = mid - 1

    return -1


numbers = [3, 8, 12, 18, 25, 31, 40]
target = 31

result = binary_search(numbers, target)

if result != -1:
    print("Found at index", result)
else:
    print("Value not found")
```

Output:

```text
Found at index 5
```

---

## Code Walkthrough

```python
low = 0
high = len(numbers) - 1
```

These variables define the search range.

```python
while low <= high:
```

The loop continues while the search range is valid.

```python
mid = (low + high) // 2
```

This finds the middle index.

```python
if numbers[mid] == target:
```

This checks if the middle value is the target.

```python
elif target > numbers[mid]:
    low = mid + 1
```

If the target is greater, search the right half.

```python
else:
    high = mid - 1
```

If the target is smaller, search the left half.

---

## Recursive Binary Search

Binary search can also be written recursively.

```python
def binary_search_recursive(numbers, target, low, high):
    if low > high:
        return -1

    mid = (low + high) // 2

    if numbers[mid] == target:
        return mid
    elif target > numbers[mid]:
        return binary_search_recursive(numbers, target, mid + 1, high)
    else:
        return binary_search_recursive(numbers, target, low, mid - 1)


numbers = [3, 8, 12, 18, 25, 31, 40]

print(binary_search_recursive(numbers, 31, 0, len(numbers) - 1))
```

Output:

```text
5
```

---

## Binary Search vs Linear Search

| Feature | Linear Search | Binary Search |
|---|---|---|
| Requires sorted data | No | Yes |
| Strategy | Check one by one | Divide in half |
| Best case | O(1) | O(1) |
| Worst case | O(n) | O(log n) |
| Beginner difficulty | Easier | Slightly harder |
| Good for large sorted lists | No | Yes |

---

## Time and Space Complexity

Iterative binary search:

| Measurement | Complexity |
|---|---|
| Time Complexity | O(log n) |
| Space Complexity | O(1) |

Recursive binary search:

| Measurement | Complexity |
|---|---|
| Time Complexity | O(log n) |
| Space Complexity | O(log n) |

Recursive binary search uses call stack space.

---

## Common Mistakes

- Using binary search on unsorted data.
- Updating `low` and `high` incorrectly.
- Forgetting the `low <= high` condition.
- Using `mid` without recalculating it each loop.
- Returning the value instead of the index when the task asks for index.
- Confusing integer division with normal division.

---

## Real-World Applications

Binary search can be used in:

- Searching sorted student IDs.
- Finding a word in a sorted dictionary.
- Searching sorted product prices.
- Looking up records in ordered data.
- Guessing games.
- Database and indexing concepts.

---

## VisualDSA Integration

Use the VisualDSA Binary Search Visualizer to see how the search range becomes smaller.

Recommended interactions:

- Enter a sorted list.
- Enter a target value.
- Highlight low, mid, and high.
- Predict whether the next search goes left or right.
- Compare binary search and linear search step counts.

Suggested VisualDSA route:

```text
/visualdsa/binary-search-visualizer
```

Data that can be captured for analytics:

- Wrong left or right prediction.
- Incorrect mid calculation.
- Attempt to use unsorted data.
- Number of steps needed.
- Accuracy in updating low and high.

---

## Practice Activity

Create a binary search program for sorted student scores.

Sample list:

```python
scores = [65, 70, 75, 80, 85, 90, 95]
```

Task:

- Ask the user to enter a score.
- Use binary search to find the score.
- Display the index if found.
- Display “Score not found” if missing.

Reflection question:

What could go wrong if the scores were not sorted?

---

## Quick Check

1. What is binary search?
2. What important condition must the data satisfy?
3. What are low, mid, and high used for?
4. What is the worst-case time complexity?
5. Why is binary search faster than linear search for large sorted lists?

---

## Answer Key

1. Binary search repeatedly divides a sorted search range in half.
2. The data must be sorted.
3. They define the current search range and middle position.
4. O(log n).
5. It removes half of the remaining search range each step.

---

## Summary

Binary search is an efficient algorithm for searching sorted data. It uses low, mid, and high positions to divide the search range in half until the target is found or the range becomes invalid.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 16: Linear Search](./lesson-16-linear-search.md)  
Next Lesson: [Lesson 18: Bubble Sort](./lesson-18-bubble-sort.md)
