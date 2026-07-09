# Lesson 16: Linear Search

**Course:** Data Structures and Algorithms  
**Section:** Searching and Sorting  
**Level:** Beginner  
**Estimated Time:** 25 to 35 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/linear-search-visualizer`

---

## Lesson Overview

Linear search is one of the simplest searching algorithms.

It checks each element one by one until the target value is found or the list ends.

Linear search works on both sorted and unsorted data. This makes it easy to use, but it can be slow when the list is large.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define linear search.
- Explain how linear search checks each element.
- Trace linear search step by step.
- Implement linear search in Python.
- Identify best, average, and worst-case scenarios.
- Analyze the time and space complexity of linear search.
- Recognize when linear search is appropriate.

---

## Key Terms

| Term | Meaning |
|---|---|
| Search Algorithm | A process used to find a target value |
| Linear Search | A search that checks elements one by one |
| Target | The value being searched for |
| Index | The position of an element in a list |
| Best Case | The target is found immediately |
| Worst Case | The target is last or not found |
| Sequential | One after another |

---

## Simple Explanation

Linear search starts at the first item and moves forward.

Example list:

```text
[12, 25, 37, 41, 59]
```

Target:

```text
41
```

The algorithm checks:

```text
12 → not match
25 → not match
37 → not match
41 → found
```

---

## Step-by-Step Trace

List:

```text
[8, 14, 22, 31, 45]
```

Target:

```text
31
```

| Step | Current Index | Current Value | Result |
|---|---|---|---|
| 1 | 0 | 8 | Not found |
| 2 | 1 | 14 | Not found |
| 3 | 2 | 22 | Not found |
| 4 | 3 | 31 | Found |

The search stops when the target is found.

---

## Python Implementation

```python
def linear_search(numbers, target):
    for index in range(len(numbers)):
        if numbers[index] == target:
            return index

    return -1


scores = [85, 90, 78, 92, 88]
target_score = 92

result = linear_search(scores, target_score)

if result != -1:
    print("Found at index", result)
else:
    print("Value not found")
```

Output:

```text
Found at index 3
```

---

## Code Walkthrough

```python
def linear_search(numbers, target):
```

This defines a function that receives a list and a target value.

```python
for index in range(len(numbers)):
```

This loop checks every index in the list.

```python
if numbers[index] == target:
```

This compares the current value with the target.

```python
return index
```

If the target is found, the function returns its index.

```python
return -1
```

If the loop ends and the target was not found, the function returns `-1`.

---

## Best, Average, and Worst Case

| Case | Situation | Example | Time |
|---|---|---|---|
| Best Case | Target is first | Target is at index 0 | O(1) |
| Average Case | Target is somewhere in the middle | Target is around the middle | O(n) |
| Worst Case | Target is last or missing | Target is not in the list | O(n) |

---

## Time and Space Complexity

| Measurement | Complexity |
|---|---|
| Time Complexity | O(n) |
| Space Complexity | O(1) |

Linear search may need to check every item in the list.

It uses constant extra memory because it only stores a few variables.

---

## Linear Search with Strings

Linear search can also be used with names or words.

```python
students = ["Ana", "Ben", "Carlo", "Dana"]

target = "Carlo"

for index in range(len(students)):
    if students[index] == target:
        print("Student found at index", index)
        break
```

Output:

```text
Student found at index 2
```

---

## When to Use Linear Search

Use linear search when:

- The list is small.
- The data is unsorted.
- You only need a simple solution.
- Performance is not a major concern.
- You need to search through all items anyway.

Avoid linear search when:

- The list is very large.
- The data is sorted and binary search can be used.
- Search operations happen repeatedly.

---

## Common Mistakes

- Forgetting that list indexes start at `0`.
- Returning too early before checking all elements.
- Using linear search on large sorted data when binary search is better.
- Not handling the “not found” result.
- Confusing the value with its index.

---

## Real-World Applications

Linear search can be used in:

- Searching a small class list.
- Finding a student ID in an unsorted list.
- Checking if an item exists in a shopping list.
- Looking for a file in a small collection.
- Searching simple menu options.

---

## VisualDSA Integration

Use the VisualDSA Linear Search Visualizer to watch the search move from one element to the next.

Recommended interactions:

- Enter a list of values.
- Enter a target value.
- Predict the next index to be checked.
- Highlight matching and non-matching values.
- Compare found and not-found cases.

Suggested VisualDSA route:

```text
/visualdsa/linear-search-visualizer
```

Data that can be captured for analytics:

- Wrong target identification.
- Mistakes in index counting.
- Time spent tracing.
- Number of attempts.
- Accuracy in predicting the next checked element.

---

## Practice Activity

Create a program that searches for a student ID in a list.

Sample list:

```python
student_ids = ["2024001", "2024002", "2024003", "2024004"]
```

Task:

- Ask the user to enter a student ID.
- Search the list using linear search.
- Display whether the student ID was found.
- Display the index if found.

Reflection question:

Why can linear search work even if the list is not sorted?

---

## Quick Check

1. What is linear search?
2. Does linear search require sorted data?
3. What is the best-case time complexity?
4. What is the worst-case time complexity?
5. What should the function return if the target is not found?

---

## Answer Key

1. Linear search checks elements one by one until the target is found or the list ends.
2. No. Linear search works on sorted or unsorted data.
3. O(1).
4. O(n).
5. A common return value is `-1`.

---

## Summary

Linear search is a simple searching algorithm that checks each item one at a time. It is easy to understand and works on unsorted data, but it can be slow for large lists because it may need to inspect every element.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 15: Graph Traversals](./lesson-15-graph-traversals.md)  
Next Lesson: [Lesson 17: Binary Search](./lesson-17-binary-search.md)
