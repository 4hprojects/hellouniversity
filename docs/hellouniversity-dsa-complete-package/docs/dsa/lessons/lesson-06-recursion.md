# Lesson 6: Recursion

**Course:** Data Structures and Algorithms  
**Section:** Foundations  
**Level:** Beginner to Intermediate  
**Estimated Time:** 30 to 40 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/recursion-call-stack-visualizer`

---

## Lesson Overview

Recursion is a programming technique where a function calls itself to solve a smaller version of the same problem.

Many Data Structures and Algorithms topics use recursion, especially trees, graphs, searching, sorting, and divide-and-conquer algorithms.

In this lesson, you will learn how recursion works, why a base case is important, and how to trace recursive calls using the call stack.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define recursion in programming.
- Identify the base case and recursive case.
- Explain how recursive calls are stored in the call stack.
- Trace simple recursive functions.
- Write basic recursive functions in Python.
- Recognize common recursion errors.

---

## Key Terms

| Term | Meaning |
|---|---|
| Recursion | A technique where a function calls itself |
| Base Case | The condition that stops recursion |
| Recursive Case | The part where the function calls itself again |
| Call Stack | The structure used by the program to track function calls |
| Infinite Recursion | A recursion error caused by missing or incorrect stopping condition |

---

## Simple Explanation

A recursive function solves a problem by breaking it into smaller problems.

For recursion to work correctly, two things must exist:

1. A **base case** that stops the function.
2. A **recursive case** that moves the problem closer to the base case.

Without a base case, the function may call itself forever until the program crashes.

---

## Basic Example

```python
def countdown(n):
    if n == 0:
        print("Done")
    else:
        print(n)
        countdown(n - 1)

countdown(5)
```

Output:

```text
5
4
3
2
1
Done
```

---

## Code Walkthrough

```python
def countdown(n):
```

This defines a function named `countdown`.

```python
if n == 0:
```

This is the base case. The recursion stops when `n` becomes `0`.

```python
print("Done")
```

This displays the final message.

```python
else:
    print(n)
    countdown(n - 1)
```

This is the recursive case. The function prints the current value and calls itself again with a smaller value.

---

## Step-by-Step Trace

| Step | Function Call | Action |
|---|---|---|
| 1 | countdown(5) | Print 5 |
| 2 | countdown(4) | Print 4 |
| 3 | countdown(3) | Print 3 |
| 4 | countdown(2) | Print 2 |
| 5 | countdown(1) | Print 1 |
| 6 | countdown(0) | Print Done |

The value of `n` becomes smaller each time. This means the function is moving toward the base case.

---

## Factorial Example

The factorial of a number is the product of all positive integers from that number down to 1.

Example:

```text
5! = 5 × 4 × 3 × 2 × 1 = 120
```

Python code:

```python
def factorial(n):
    if n == 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
```

Output:

```text
120
```

---

## Factorial Trace

| Call | Result |
|---|---|
| factorial(5) | 5 × factorial(4) |
| factorial(4) | 4 × factorial(3) |
| factorial(3) | 3 × factorial(2) |
| factorial(2) | 2 × factorial(1) |
| factorial(1) | 1 |

Then the results return upward:

```text
factorial(1) = 1
factorial(2) = 2 × 1 = 2
factorial(3) = 3 × 2 = 6
factorial(4) = 4 × 6 = 24
factorial(5) = 5 × 24 = 120
```

---

## How the Call Stack Works

Every time a function is called, it is placed on the call stack.

For `factorial(5)`, the stack grows like this:

```text
factorial(5)
factorial(4)
factorial(3)
factorial(2)
factorial(1)
```

When the base case is reached, the stack starts returning results.

This is why recursion can use more memory than a loop.

---

## Time and Space Complexity

For the factorial example:

| Measurement | Complexity | Reason |
|---|---|---|
| Time Complexity | O(n) | The function runs once for each number from n to 1 |
| Space Complexity | O(n) | Each recursive call is stored in the call stack |

---

## Common Mistakes

- Forgetting the base case.
- Writing a base case that is never reached.
- Calling the function with the same value again and again.
- Using recursion when a simple loop would be clearer.
- Not understanding that each function call has its own local value.

---

## Real-World Applications

Recursion is used in:

- Tree traversal.
- Graph traversal.
- Searching folders and files.
- Divide-and-conquer algorithms.
- Merge sort.
- Quick sort.
- Backtracking problems.

---

## VisualDSA Integration

Use the VisualDSA Recursion Call Stack Visualizer to see how recursive calls are added and removed from the call stack.

Recommended interactions:

- Enter a value for `n`.
- Step through each recursive call.
- Identify the base case.
- Watch the stack grow and shrink.
- Predict the next function call before clicking next.

Suggested VisualDSA route:

```text
/visualdsa/recursion-call-stack-visualizer
```

Data that can be captured for analytics:

- Number of attempts.
- Incorrect base case predictions.
- Time spent tracing.
- Completion status.
- Common misunderstanding points.

---

## Practice Activity

Create a recursive function that computes the sum of numbers from `n` down to `1`.

Example:

```text
sum_recursive(5) = 5 + 4 + 3 + 2 + 1 = 15
```

Expected output:

```text
15
```

Guide questions:

- What is the base case?
- What value should the function return when the base case is reached?
- How does each call move closer to the base case?

---

## Quick Check

1. What is recursion?
2. What is the purpose of a base case?
3. What happens if a recursive function has no valid base case?
4. What data structure tracks function calls?
5. What is the time complexity of the factorial function?

---

## Answer Key

1. Recursion is a technique where a function calls itself.
2. The base case stops the recursion.
3. The function may call itself until an error occurs.
4. The call stack tracks function calls.
5. The time complexity is O(n).

---

## Summary

Recursion allows a function to solve a problem by calling itself with a smaller version of the same problem. A recursive function must have a base case and a recursive case. The call stack stores each function call, which makes recursion powerful but memory-sensitive.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 5: Strings](./lesson-05-strings.md)  
Next Lesson: [Lesson 7: Linked Lists](./lesson-07-linked-lists.md)
