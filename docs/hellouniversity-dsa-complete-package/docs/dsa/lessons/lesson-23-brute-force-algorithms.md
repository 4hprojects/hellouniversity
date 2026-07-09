# Lesson 23: Brute Force Algorithms

**Course:** Data Structures and Algorithms  
**Section:** Advanced Sorting and Algorithm Design  
**Level:** Beginner to Intermediate  
**Estimated Time:** 30 to 40 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/brute-force-tracing`

---

## Lesson Overview

A brute force algorithm solves a problem by trying all possible options or checking every possible case.

Brute force is usually simple to understand and easy to implement. The weakness is that it can become slow when the input becomes large.

In this lesson, you will learn when brute force is acceptable, when it becomes inefficient, and how to analyze its cost.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define brute force.
- Explain how brute force solves problems.
- Implement simple brute force solutions in Python.
- Analyze brute force time complexity.
- Identify when brute force is acceptable.
- Compare brute force with more optimized approaches.
- Recognize common brute force mistakes.

---

## Key Terms

| Term | Meaning |
|---|---|
| Brute Force | Trying all possible options or checking every case |
| Exhaustive Search | Searching through all possibilities |
| Candidate Solution | A possible answer to a problem |
| Optimization | Improving the solution to use less time or memory |
| Nested Loop | A loop inside another loop |
| Scalability | How well a solution works as input grows |

---

## Simple Explanation

Brute force is like checking every item one by one until you find an answer.

Example problem:

```text
Find two numbers that add up to 10.
```

List:

```text
[2, 4, 6, 8]
```

Brute force checks pairs:

```text
2 + 4 = 6
2 + 6 = 8
2 + 8 = 10
```

The pair is found:

```text
2 and 8
```

---

## Pair Sum Problem

Problem:

Given a list of numbers and a target, find if two numbers add up to the target.

Example:

```text
numbers = [2, 4, 6, 8]
target = 10
```

Answer:

```text
2 + 8 = 10
4 + 6 = 10
```

---

## Brute Force Python Implementation

```python
def find_pair_sum(numbers, target):
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            if numbers[i] + numbers[j] == target:
                print(numbers[i], numbers[j])


numbers = [2, 4, 6, 8]
target = 10

find_pair_sum(numbers, target)
```

Output:

```text
2 8
4 6
```

---

## Code Walkthrough

```python
for i in range(len(numbers)):
```

This selects the first number.

```python
for j in range(i + 1, len(numbers)):
```

This selects the second number after the first number.

```python
if numbers[i] + numbers[j] == target:
```

This checks if the pair reaches the target.

```python
print(numbers[i], numbers[j])
```

This prints a valid pair.

---

## Step-by-Step Trace

List:

```text
[2, 4, 6, 8]
```

Target:

```text
10
```

| Pair Checked | Sum | Result |
|---|---|---|
| 2 and 4 | 6 | Not match |
| 2 and 6 | 8 | Not match |
| 2 and 8 | 10 | Match |
| 4 and 6 | 10 | Match |
| 4 and 8 | 12 | Not match |
| 6 and 8 | 14 | Not match |

---

## Time and Space Complexity

For the pair sum brute force solution:

| Measurement | Complexity |
|---|---|
| Time Complexity | O(n²) |
| Space Complexity | O(1) |

The nested loops create many pair comparisons.

If the input size doubles, the number of comparisons can grow quickly.

---

## Brute Force Password Example

Suppose a PIN has 3 digits.

A brute force approach could try:

```text
000
001
002
...
999
```

This is simple, but not efficient for long passwords.

The number of possibilities grows fast.

---

## When Brute Force Is Acceptable

Brute force may be acceptable when:

- The input size is small.
- You need a simple first solution.
- You are testing correctness before optimizing.
- The problem has few possible cases.
- Performance is not important.

Brute force becomes a problem when:

- The input size is large.
- The program must run quickly.
- The number of combinations grows too fast.
- The same search is repeated many times.

---

## Better Approach Preview

For pair sum, a faster approach can use a set.

```python
def find_pair_sum_fast(numbers, target):
    seen = set()

    for number in numbers:
        needed = target - number

        if needed in seen:
            print(needed, number)

        seen.add(number)


numbers = [2, 4, 6, 8]
target = 10

find_pair_sum_fast(numbers, target)
```

This can run in O(n) time.

You will learn more about sets and maps in a later lesson.

---

## Common Mistakes

- Using brute force without checking input size.
- Forgetting to avoid duplicate pair checks.
- Writing unnecessary nested loops.
- Assuming simple code is always good code.
- Optimizing too early before understanding the problem.
- Ignoring time complexity.

---

## Real-World Applications

Brute force can be used in:

- Small search problems.
- Simple validation tasks.
- Testing and debugging.
- Game move checking.
- Generating possible combinations.
- Baseline comparison before optimization.

---

## VisualDSA Integration

Use the VisualDSA Brute Force Tracing Demo to see every candidate checked.

Recommended interactions:

- Enter a list and target.
- Step through each pair.
- Count comparisons.
- Predict the next pair checked.
- Compare brute force with a set-based solution.

Suggested VisualDSA route:

```text
/visualdsa/brute-force-tracing
```

Data that can be captured for analytics:

- Incorrect pair predictions.
- Difficulty counting comparisons.
- Misunderstanding of nested loops.
- Time spent before identifying a match.
- Ability to explain why O(n²) occurs.

---

## Practice Activity

Use brute force to find all pairs that add up to `12`.

List:

```text
[1, 3, 5, 7, 9, 11]
```

Tasks:

1. List all pairs checked.
2. Identify matching pairs.
3. Count the number of comparisons.
4. State the time complexity.

Reflection question:

When is brute force a good starting point?

---

## Quick Check

1. What is brute force?
2. Why can brute force be slow?
3. What does exhaustive search mean?
4. What is the time complexity of the nested-loop pair sum solution?
5. Why might you still write a brute force solution first?

---

## Answer Key

1. Brute force tries all possible options or checks every case.
2. It can be slow because it may perform many unnecessary checks.
3. Exhaustive search means checking all possibilities.
4. O(n²).
5. It is simple and helps confirm the logic before optimization.

---

## Summary

Brute force solves problems by checking all possible cases. It is easy to understand and useful for small inputs or first solutions, but it can become inefficient as input grows.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 22: Quick Sort](./lesson-22-quick-sort.md)  
Next Lesson: [Lesson 24: Divide and Conquer](./lesson-24-divide-and-conquer.md)
