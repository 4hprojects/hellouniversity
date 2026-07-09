---
title: "Lesson 4: Arrays"
slug: "/data-structures-and-algorithms/arrays"
section: "Linear Data Structures"
lesson_number: 4
level: "Beginner"
estimated_time: "35 to 45 minutes"
primary_language: "Python"
related_visualdsa: "/visualdsa/array-visualizer"
---

# Lesson 4: Arrays

## Lesson Header

- **Course:** Data Structures and Algorithms
- **Section:** Linear Data Structures
- **Lesson:** 4
- **Level:** Beginner
- **Estimated time:** 35 to 45 minutes
- **Primary language:** Python
- **Related VisualDSA page:** `/visualdsa/array-visualizer`

## Lesson Overview

An array is a linear data structure that stores multiple values in a single ordered collection.

In Python, the closest beginner-friendly structure is the **list**.

Arrays and lists allow you to store values such as names, grades, scores, products, or numbers.

Each value has a position called an **index**.

Most programming languages start counting indexes from 0.

That means the first item is at index 0, not index 1.

## Learning Objectives

At the end of this lesson, you should be able to:

- Define an array
- Explain how indexing works
- Access array elements by index
- Traverse an array
- Insert and remove elements
- Search for a value in an array
- Identify basic time complexity for common array operations

## Key Terms

| Term | Meaning |
|---|---|
| Array | A collection of values stored in order |
| Element | A value stored inside an array |
| Index | The position of an element |
| Traversal | Visiting each element one by one |
| Insertion | Adding an element |
| Deletion | Removing an element |
| Search | Finding a specific element |
| Length | Number of elements in the array |

## Simple Explanation

An array is like a row of boxes.

Each box stores one value.

Each box has a number that tells its position.

Example:

| Index | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Value | Ana | Ben | Carlo | Dana |

The value at index 0 is Ana.

The value at index 1 is Ben.

The value at index 2 is Carlo.

The value at index 3 is Dana.

## Python List Example

```python
students = ["Ana", "Ben", "Carlo", "Dana"]

print(students[0])
print(students[2])
```

Output:

```text
Ana
Carlo
```

## Code Walkthrough

```python
students = ["Ana", "Ben", "Carlo", "Dana"]
```

This creates a list named `students`.

```python
print(students[0])
```

This displays the first item.

```python
print(students[2])
```

This displays the third item because indexing starts at 0.

## Traversing an Array

Traversal means visiting each element one by one.

```python
students = ["Ana", "Ben", "Carlo", "Dana"]

for student in students:
    print(student)
```

Output:

```text
Ana
Ben
Carlo
Dana
```

## Traversal with Index

Sometimes, you need both the index and the value.

```python
students = ["Ana", "Ben", "Carlo", "Dana"]

for index in range(len(students)):
    print(index, students[index])
```

Output:

```text
0 Ana
1 Ben
2 Carlo
3 Dana
```

## Step-by-Step Trace

| Step | Index | Value Displayed |
|---:|---:|---|
| 1 | 0 | Ana |
| 2 | 1 | Ben |
| 3 | 2 | Carlo |
| 4 | 3 | Dana |

This trace shows how the loop moves through the array.

## Adding Elements

In Python, you can use `append()` to add an element at the end.

```python
students = ["Ana", "Ben"]

students.append("Carlo")

print(students)
```

Output:

```text
['Ana', 'Ben', 'Carlo']
```

## Inserting Elements

You can insert an element at a specific index.

```python
students = ["Ana", "Carlo"]

students.insert(1, "Ben")

print(students)
```

Output:

```text
['Ana', 'Ben', 'Carlo']
```

When you insert at the middle, some elements shift to the right.

## Removing Elements

You can remove an element by value.

```python
students = ["Ana", "Ben", "Carlo"]

students.remove("Ben")

print(students)
```

Output:

```text
['Ana', 'Carlo']
```

You can also remove by index.

```python
students = ["Ana", "Ben", "Carlo"]

removed_student = students.pop(1)

print(removed_student)
print(students)
```

Output:

```text
Ben
['Ana', 'Carlo']
```

## Searching in an Array

A simple search checks each item one by one.

```python
students = ["Ana", "Ben", "Carlo", "Dana"]

target = "Carlo"
found = False

for student in students:
    if student == target:
        found = True
        break

if found:
    print("Student found")
else:
    print("Student not found")
```

## Search Trace

| Step | Current Student | Is it Carlo? |
|---:|---|---|
| 1 | Ana | No |
| 2 | Ben | No |
| 3 | Carlo | Yes |

The loop stops when the target is found.

## Time and Space Complexity

| Operation | Common Time Complexity | Explanation |
|---|---|---|
| Access by index | O(1) | Direct access to a known position |
| Traversal | O(n) | Visits each element |
| Search | O(n) | May check all elements |
| Insert at end | O(1) average | Adds to the end |
| Insert at middle | O(n) | Elements may shift |
| Delete from middle | O(n) | Elements may shift |

Space complexity is usually O(n) because the array stores n elements.

## Common Mistakes

- Forgetting that indexes start at 0
- Accessing an index that does not exist
- Confusing index with value
- Modifying a list while looping without care
- Assuming search is always instant

Example of an index error:

```python
students = ["Ana", "Ben"]

print(students[2])
```

This causes an error because valid indexes are only 0 and 1.

## Real-World Applications

Arrays and lists are used in:

- Student records
- Grade lists
- Product lists
- Menu options
- Search results
- Leaderboards
- Attendance lists
- Scores and rankings

In many programs, arrays are the first structure used to group related values.

## Interactive Learning

Use VisualDSA to explore array operations.

Recommended VisualDSA activity:

- Open `/visualdsa/array-visualizer`
- Create an array of numbers
- Access an element by index
- Traverse the array step by step
- Insert a value
- Delete a value
- Search for a target value

### Student Actions

The student should be able to:

- Select an index
- Predict the value at an index
- Step through traversal
- Choose where to insert a value
- Identify which elements shift

### VisualDSA Data to Capture

For this lesson, VisualDSA may capture:

- Incorrect index selections
- Search prediction accuracy
- Number of traversal steps completed
- Mistakes during insertion and deletion
- Time spent on the activity

## Practice Activity

Create a Python program that stores student scores and displays useful information.

### Requirements

Your program should:

- Create a list of at least five scores
- Display all scores
- Display the first score
- Display the last score
- Compute the total
- Compute the average
- Search for a specific score

### Starter Code

```python
scores = [90, 85, 88, 92, 80]

# Display all scores
for score in scores:
    print(score)
```

## Quick Check

Answer the following questions.

1. What is an array?
2. What is an index?
3. What is the index of the first element?
4. What does traversal mean?
5. What is the common time complexity of searching an unsorted array?

## Answer Key

1. An array is an ordered collection of values.
2. An index is the position of an element.
3. The first element is at index 0.
4. Traversal means visiting each element one by one.
5. Searching an unsorted array is commonly O(n).

## Summary

Arrays store multiple values in order.

Each value has an index.

Arrays are useful for storing lists of related data.

Common operations include access, traversal, insertion, deletion, and search.

Understanding arrays is important because many other data structures build on the same idea of organized storage.

## Previous and Next Lesson

- Previous lesson: Lesson 3, Time and Space Complexity
- Next lesson: Lesson 5, Strings
