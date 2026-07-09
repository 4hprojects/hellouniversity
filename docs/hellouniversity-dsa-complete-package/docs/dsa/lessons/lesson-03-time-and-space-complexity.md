---
title: "Lesson 3: Time and Space Complexity"
slug: "/data-structures-and-algorithms/time-and-space-complexity"
section: "Foundations"
lesson_number: 3
level: "Beginner"
estimated_time: "35 to 45 minutes"
primary_language: "Python"
related_visualdsa: "/visualdsa/complexity"
---

# Lesson 3: Time and Space Complexity

## Lesson Header

- **Course:** Data Structures and Algorithms
- **Section:** Foundations
- **Lesson:** 3
- **Level:** Beginner
- **Estimated time:** 35 to 45 minutes
- **Primary language:** Python
- **Related VisualDSA page:** `/visualdsa/complexity`

## Lesson Overview

Time and space complexity help you describe how an algorithm behaves as the input grows.

A program can work correctly but still be slow when the data becomes large.

For example, searching for one name in a list of 10 students is easy.

Searching in a list of 1,000,000 students is different.

This lesson introduces how to compare algorithms using simple performance ideas.

## Learning Objectives

At the end of this lesson, you should be able to:

- Explain time complexity
- Explain space complexity
- Describe why input size matters
- Identify simple examples of O(1), O(n), and O(n²)
- Compare basic algorithms by number of steps
- Understand why Big O notation is used

## Key Terms

| Term | Meaning |
|---|---|
| Complexity | A way to describe how an algorithm uses resources |
| Time complexity | How the running time grows as input size grows |
| Space complexity | How memory use grows as input size grows |
| Input size | The amount of data processed by the algorithm |
| Big O notation | A notation used to describe algorithm growth |
| Constant time | A process that does not grow with input size |
| Linear time | A process that grows directly with input size |
| Quadratic time | A process that grows based on nested loops |

## Simple Explanation

Imagine you are looking for a student ID.

If you check the first record and immediately find the student, the search is fast.

If the student is at the end of the list, you may need to check every record.

If the list has 10 students, checking every record is fine.

If the list has 100,000 students, checking every record takes more work.

Time complexity helps you describe this growth.

## What Is Input Size?

Input size is often represented by the letter `n`.

Examples:

| Problem | Input Size |
|---|---|
| Search in a list of students | Number of students |
| Sort quiz scores | Number of scores |
| Count characters in a word | Number of characters |
| Visit nodes in a graph | Number of nodes and edges |

When `n` grows, some algorithms remain fast while others slow down quickly.

## Big O Notation

Big O notation describes how an algorithm grows.

It does not usually measure exact seconds.

It focuses on the pattern of growth.

Common Big O examples:

| Big O | Name | Simple Meaning |
|---|---|---|
| O(1) | Constant time | Same number of steps |
| O(log n) | Logarithmic time | Cuts the problem smaller each step |
| O(n) | Linear time | Steps grow with input size |
| O(n log n) | Linearithmic time | Common in efficient sorting |
| O(n²) | Quadratic time | Often caused by nested loops |

## O(1): Constant Time

Constant time means the algorithm takes about the same number of steps no matter how large the input is.

Example:

```python
students = ["Ana", "Ben", "Carlo", "Dana"]

print(students[0])
```

This gets the first item.

Even if the list has 4 students or 4,000 students, accessing index 0 is still one direct operation.

## O(n): Linear Time

Linear time means the number of steps grows with the number of items.

Example:

```python
students = ["Ana", "Ben", "Carlo", "Dana"]

for student in students:
    print(student)
```

If there are 4 students, the loop runs 4 times.

If there are 100 students, the loop runs 100 times.

That is O(n).

## O(n²): Quadratic Time

Quadratic time often happens when there is a loop inside another loop.

Example:

```python
students = ["Ana", "Ben", "Carlo"]

for student1 in students:
    for student2 in students:
        print(student1, student2)
```

If there are 3 students, the output has 9 combinations.

If there are 10 students, the output has 100 combinations.

The number of steps grows quickly.

That is O(n²).

## Step Count Comparison

| Input Size n | O(1) | O(n) | O(n²) |
|---:|---:|---:|---:|
| 10 | 1 | 10 | 100 |
| 100 | 1 | 100 | 10,000 |
| 1,000 | 1 | 1,000 | 1,000,000 |
| 10,000 | 1 | 10,000 | 100,000,000 |

This table shows why complexity matters.

A small difference in algorithm design can become a big difference when the input becomes large.

## Best Case, Average Case, and Worst Case

Algorithms can behave differently depending on the input.

### Best Case

The easiest possible situation.

Example:

The target item is the first item in a list.

### Average Case

The expected situation for typical input.

Example:

The target item is somewhere near the middle.

### Worst Case

The hardest possible situation.

Example:

The target item is the last item, or the item is not in the list.

## Example: Linear Search

```python
numbers = [10, 20, 30, 40, 50]

target = 40

for number in numbers:
    if number == target:
        print("Found")
        break
```

### Trace

| Step | Number Checked | Target Found? |
|---:|---:|---|
| 1 | 10 | No |
| 2 | 20 | No |
| 3 | 30 | No |
| 4 | 40 | Yes |

The algorithm checks each item until it finds the target.

Worst-case time complexity is O(n).

## Space Complexity

Space complexity describes how much memory an algorithm uses.

Example 1:

```python
numbers = [1, 2, 3, 4, 5]

total = 0

for number in numbers:
    total += number

print(total)
```

This uses only one extra variable named `total`.

The extra space is small.

Example 2:

```python
numbers = [1, 2, 3, 4, 5]
copy_numbers = []

for number in numbers:
    copy_numbers.append(number)
```

This creates another list.

The memory grows as the input grows.

## Time and Space Trade-Off

Sometimes, you use more memory to make a program faster.

Example:

A dictionary can find values quickly, but it may use more memory than a simple list.

This is a common trade-off in DSA.

You should ask:

- Do I need faster searching?
- Is memory limited?
- Is the input small or large?
- Is the code easy to understand?

## Common Complexity Examples

| Code Pattern | Common Complexity |
|---|---|
| Direct access by index | O(1) |
| One loop over a list | O(n) |
| Loop inside another loop | O(n²) |
| Divide input in half repeatedly | O(log n) |
| Efficient sorting such as merge sort | O(n log n) |

## Interactive Learning

Use VisualDSA to compare how algorithms grow.

Recommended VisualDSA activity:

- Open `/visualdsa/complexity`
- Change the input size
- Compare O(1), O(n), and O(n²)
- Predict which algorithm will grow fastest
- Observe the plotted step count

### VisualDSA Data to Capture

For this lesson, VisualDSA may capture:

- Student predictions about growth
- Correct or incorrect complexity identification
- Time spent comparing algorithms
- Common confusion between O(n) and O(n²)

## Practice Activity

Given the following code, identify the likely time complexity.

```python
scores = [90, 85, 88, 92]

for score in scores:
    print(score)
```

Answer:

```text
O(n)
```

Reason:

The loop runs once for each score.

### Coding Task

Write a Python program that prints all pairs of numbers from a list.

Then answer:

- Does it use one loop or nested loops?
- What is the time complexity?
- Why?

## Quick Check

Answer the following questions.

1. What does time complexity describe?
2. What does space complexity describe?
3. What does O(1) mean?
4. What does O(n) mean?
5. Why can O(n²) become slow for large input?

## Answer Key

1. Time complexity describes how running time grows as input size grows.
2. Space complexity describes how memory use grows as input size grows.
3. O(1) means constant time.
4. O(n) means the number of steps grows with the input size.
5. O(n²) grows quickly because nested operations multiply the number of steps.

## Common Mistakes

- Thinking Big O measures exact seconds
- Ignoring input size
- Assuming all working programs are equally good
- Forgetting that nested loops can grow quickly
- Confusing time complexity with space complexity

## Summary

Time complexity describes how running time grows.

Space complexity describes how memory use grows.

Big O notation helps compare algorithms by growth pattern.

Understanding complexity helps you choose better solutions when data becomes large.

## Previous and Next Lesson

- Previous lesson: Lesson 2, Algorithmic Thinking
- Next lesson: Lesson 4, Arrays
