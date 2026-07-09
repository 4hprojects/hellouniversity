# Lesson 26: Dynamic Programming Basics

**Course:** Data Structures and Algorithms  
**Section:** Hashing, Maps, Tries, and Dynamic Programming  
**Level:** Intermediate  
**Estimated Time:** 40 to 50 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/dynamic-programming-visualizer`

---

## Lesson Overview

Dynamic programming is an algorithm design technique used to solve problems by breaking them into smaller subproblems and storing the results.

It is useful when the same subproblems are solved again and again.

Instead of repeating work, dynamic programming saves answers and reuses them later.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define dynamic programming.
- Explain overlapping subproblems.
- Explain optimal substructure.
- Differentiate memoization and tabulation.
- Implement a simple dynamic programming solution in Python.
- Compare recursive Fibonacci and dynamic programming Fibonacci.
- Identify when dynamic programming may be useful.

---

## Key Terms

| Term | Meaning |
|---|---|
| Dynamic Programming | A technique that solves problems by storing results of subproblems |
| Overlapping Subproblems | Smaller problems that repeat |
| Optimal Substructure | A problem where the best solution depends on best solutions to smaller problems |
| Memoization | Top-down dynamic programming using saved results |
| Tabulation | Bottom-up dynamic programming using a table |
| Cache | Storage for previously computed results |
| State | A subproblem representation |

---

## Simple Explanation

Dynamic programming avoids repeated work.

Example:

To compute Fibonacci numbers:

```text
fib(5) = fib(4) + fib(3)
fib(4) = fib(3) + fib(2)
```

Notice that `fib(3)` appears more than once.

A basic recursive solution computes `fib(3)` repeatedly.

Dynamic programming stores the answer the first time, then reuses it.

---

## Fibonacci Sequence

The Fibonacci sequence starts like this:

```text
0, 1, 1, 2, 3, 5, 8, 13
```

Formula:

```text
fib(n) = fib(n - 1) + fib(n - 2)
```

Base cases:

```text
fib(0) = 0
fib(1) = 1
```

---

## Basic Recursive Fibonacci

```python
def fibonacci(n):
    if n == 0:
        return 0

    if n == 1:
        return 1

    return fibonacci(n - 1) + fibonacci(n - 2)


print(fibonacci(6))
```

Output:

```text
8
```

This works, but it repeats many calls.

---

## Repeated Work Problem

For `fibonacci(5)`:

```text
fib(5)
├── fib(4)
│   ├── fib(3)
│   └── fib(2)
└── fib(3)
```

`fib(3)` appears more than once.

As `n` grows, repeated work increases quickly.

---

## Memoization Approach

Memoization stores answers in a dictionary.

```python
def fibonacci_memo(n, memo={}):
    if n in memo:
        return memo[n]

    if n == 0:
        return 0

    if n == 1:
        return 1

    memo[n] = fibonacci_memo(n - 1, memo) + fibonacci_memo(n - 2, memo)

    return memo[n]


print(fibonacci_memo(6))
```

Output:

```text
8
```

---

## Memoization Code Walkthrough

```python
if n in memo:
    return memo[n]
```

If the answer was already computed, return it immediately.

```python
memo[n] = fibonacci_memo(n - 1, memo) + fibonacci_memo(n - 2, memo)
```

This computes the answer and stores it.

```python
return memo[n]
```

This returns the saved answer.

---

## Safer Memoization Version

Using a mutable default dictionary can be confusing for beginners.

A safer version is:

```python
def fibonacci_memo(n, memo=None):
    if memo is None:
        memo = {}

    if n in memo:
        return memo[n]

    if n == 0:
        return 0

    if n == 1:
        return 1

    memo[n] = fibonacci_memo(n - 1, memo) + fibonacci_memo(n - 2, memo)

    return memo[n]


print(fibonacci_memo(6))
```

---

## Tabulation Approach

Tabulation builds the answer from the bottom up.

```python
def fibonacci_table(n):
    if n == 0:
        return 0

    table = [0] * (n + 1)

    table[0] = 0
    table[1] = 1

    for i in range(2, n + 1):
        table[i] = table[i - 1] + table[i - 2]

    return table[n]


print(fibonacci_table(6))
```

Output:

```text
8
```

---

## Tabulation Trace

For `n = 6`:

| Index | Value |
|---|---|
| 0 | 0 |
| 1 | 1 |
| 2 | 1 |
| 3 | 2 |
| 4 | 3 |
| 5 | 5 |
| 6 | 8 |

Each value uses earlier values in the table.

---

## Memoization vs Tabulation

| Feature | Memoization | Tabulation |
|---|---|---|
| Direction | Top-down | Bottom-up |
| Uses recursion | Yes | Usually no |
| Storage | Dictionary or cache | Table or list |
| Starts from | Original problem | Smallest subproblem |
| Good for | Natural recursive problems | Iterative table-building problems |

---

## Time and Space Complexity

For Fibonacci:

| Approach | Time Complexity | Space Complexity |
|---|---|---|
| Basic recursion | O(2ⁿ) | O(n) |
| Memoization | O(n) | O(n) |
| Tabulation | O(n) | O(n) |

Dynamic programming improves performance by avoiding repeated calculations.

---

## When to Use Dynamic Programming

Dynamic programming may be useful when:

- The problem has repeated subproblems.
- The answer depends on smaller answers.
- A recursive solution repeats work.
- You need an optimal result.
- You can store and reuse results.

Common examples include:

- Fibonacci numbers.
- Coin change.
- Longest common subsequence.
- Knapsack problem.
- Shortest path variations.
- Edit distance.

---

## Common Mistakes

- Using dynamic programming when there are no repeated subproblems.
- Forgetting the base cases.
- Storing the wrong state.
- Confusing memoization and tabulation.
- Building a table with the wrong size.
- Returning the wrong table value.

---

## Real-World Applications

Dynamic programming is used in:

- Route planning.
- Text comparison.
- Spell checking.
- Resource allocation.
- Game decision systems.
- Bioinformatics.
- Optimization problems.
- Machine learning support algorithms.

---

## VisualDSA Integration

Use the VisualDSA Dynamic Programming Visualizer to compare recursive calls with stored results.

Recommended interactions:

- Enter a Fibonacci value.
- Watch repeated recursive calls.
- Enable memoization.
- Highlight cached results.
- Build a tabulation table step by step.

Suggested VisualDSA route:

```text
/visualdsa/dynamic-programming-visualizer
```

Data that can be captured for analytics:

- Base case mistakes.
- Repeated subproblem recognition.
- Memoization cache confusion.
- Tabulation table errors.
- Time spent comparing recursion and DP.

---

## Practice Activity

Compute `fibonacci(7)` using tabulation.

Tasks:

1. Create a table from index `0` to `7`.
2. Fill in each value.
3. Identify which previous values were used for each step.
4. State the final answer.
5. Compare the table method with basic recursion.

Reflection question:

How does dynamic programming reduce repeated work?

---

## Quick Check

1. What is dynamic programming?
2. What are overlapping subproblems?
3. What is memoization?
4. What is tabulation?
5. Why is basic recursive Fibonacci inefficient?

---

## Answer Key

1. Dynamic programming solves problems by storing and reusing subproblem results.
2. Overlapping subproblems are smaller problems that repeat.
3. Memoization is top-down dynamic programming that stores computed results.
4. Tabulation is bottom-up dynamic programming that builds a table.
5. It recomputes the same Fibonacci values many times.

---

## Summary

Dynamic programming improves performance by storing answers to repeated subproblems. Memoization solves from the top down using saved results. Tabulation solves from the bottom up using a table. It is useful for problems with overlapping subproblems and optimal substructure.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 25: Greedy Algorithms](./lesson-25-greedy-algorithms.md)  
Next Lesson: [Lesson 27: Hash Tables](./lesson-27-hash-tables.md)
