# Lesson 25: Greedy Algorithms

**Course:** Data Structures and Algorithms  
**Section:** Advanced Sorting and Algorithm Design  
**Level:** Intermediate  
**Estimated Time:** 35 to 45 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/greedy-choice-visualizer`

---

## Lesson Overview

A greedy algorithm solves a problem by choosing the best option available at the current step.

It does not always look ahead to check every possible future result.

Greedy algorithms can be fast and simple, but they only work correctly for certain types of problems.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a greedy algorithm.
- Explain local optimum and global optimum.
- Apply a greedy strategy to simple problems.
- Identify when greedy may fail.
- Implement a simple greedy algorithm in Python.
- Compare greedy algorithms with brute force and dynamic programming.
- Recognize common greedy algorithm mistakes.

---

## Key Terms

| Term | Meaning |
|---|---|
| Greedy Algorithm | An algorithm that chooses the best current option |
| Local Optimum | The best choice at the current step |
| Global Optimum | The best overall solution |
| Greedy Choice | The selected best immediate option |
| Feasible Solution | A solution that satisfies the problem rules |
| Optimal Solution | The best possible solution |
| Counterexample | An example that proves an approach does not always work |

---

## Simple Explanation

A greedy algorithm makes the best-looking choice right now.

Example:

You want to give change using the fewest coins.

Coin values:

```text
10, 5, 1
```

Amount:

```text
18
```

Greedy choice:

```text
Take 10
Take 5
Take 1
Take 1
Take 1
```

Result:

```text
10 + 5 + 1 + 1 + 1 = 18
```

This uses 5 coins.

For this coin system, greedy works well.

---

## Local Optimum vs Global Optimum

| Term | Meaning | Example |
|---|---|---|
| Local Optimum | Best choice now | Choose the largest coin available |
| Global Optimum | Best final result | Use the fewest coins overall |

A greedy algorithm hopes that choosing the local optimum each step leads to the global optimum.

This is not always true.

---

## Coin Change Example

Problem:

Given coin values and an amount, use the fewest coins possible.

Coins:

```text
[10, 5, 1]
```

Amount:

```text
28
```

Greedy process:

| Step | Remaining Amount | Coin Chosen |
|---|---|---|
| 1 | 28 | 10 |
| 2 | 18 | 10 |
| 3 | 8 | 5 |
| 4 | 3 | 1 |
| 5 | 2 | 1 |
| 6 | 1 | 1 |

Result:

```text
10 + 10 + 5 + 1 + 1 + 1 = 28
```

---

## Python Implementation

```python
def greedy_coin_change(coins, amount):
    result = []

    for coin in coins:
        while amount >= coin:
            result.append(coin)
            amount -= coin

    return result


coins = [10, 5, 1]
amount = 28

change = greedy_coin_change(coins, amount)

print(change)
print("Number of coins:", len(change))
```

Output:

```text
[10, 10, 5, 1, 1, 1]
Number of coins: 6
```

---

## Code Walkthrough

```python
result = []
```

This stores the selected coins.

```python
for coin in coins:
```

This checks each coin from largest to smallest.

```python
while amount >= coin:
```

This uses the current coin as long as it fits the remaining amount.

```python
result.append(coin)
amount -= coin
```

This adds the coin and reduces the remaining amount.

```python
return result
```

This returns the chosen coins.

---

## When Greedy Fails

Greedy does not always produce the best answer.

Coins:

```text
[4, 3, 1]
```

Amount:

```text
6
```

Greedy choice:

```text
4 + 1 + 1 = 6
```

This uses 3 coins.

Better answer:

```text
3 + 3 = 6
```

This uses 2 coins.

This is a counterexample.

It shows that greedy must be proven correct for the problem before you rely on it.

---

## Activity Selection Example

Greedy is often useful for selecting non-overlapping activities.

Example activities:

| Activity | Start | End |
|---|---|---|
| A | 1 | 3 |
| B | 2 | 5 |
| C | 4 | 6 |
| D | 6 | 8 |

Greedy strategy:

Choose the activity that finishes earliest.

Selected:

```text
A, C, D
```

This works because selecting the earliest finishing activity leaves more room for future activities.

---

## Activity Selection Python Example

```python
def select_activities(activities):
    activities.sort(key=lambda activity: activity[1])

    selected = []
    last_end_time = 0

    for activity in activities:
        start, end, name = activity

        if start >= last_end_time:
            selected.append(name)
            last_end_time = end

    return selected


activities = [
    (1, 3, "A"),
    (2, 5, "B"),
    (4, 6, "C"),
    (6, 8, "D")
]

print(select_activities(activities))
```

Output:

```text
['A', 'C', 'D']
```

---

## Time and Space Complexity

For coin change with sorted coins:

| Measurement | Complexity |
|---|---|
| Time Complexity | Depends on amount and coin values |
| Space Complexity | O(k), where k is the number of selected coins |

For activity selection:

| Measurement | Complexity |
|---|---|
| Time Complexity | O(n log n) because of sorting |
| Space Complexity | O(n) for selected activities |

---

## Greedy vs Brute Force vs Dynamic Programming

| Approach | Main Idea | Strength | Weakness |
|---|---|---|---|
| Brute Force | Try all possibilities | Simple and complete | Can be very slow |
| Greedy | Choose best current option | Fast and simple | May fail without proof |
| Dynamic Programming | Reuse solved subproblems | Finds optimal results for many problems | More complex |

Dynamic programming will be discussed in a later lesson.

---

## When to Use Greedy

Use greedy when:

- A local best choice can lead to a global best result.
- The problem has a known greedy property.
- You can justify why the greedy choice is safe.
- You need a fast solution.
- The problem is related to scheduling, intervals, or priority choices.

Be careful when:

- The problem has many future consequences.
- A current good choice may block a better later choice.
- You cannot provide a counterexample-free explanation.

---

## Common Mistakes

- Assuming greedy always works.
- Choosing a local optimum without checking the global result.
- Forgetting to sort when sorting is required.
- Ignoring counterexamples.
- Comparing greedy only against one sample input.
- Not explaining why the greedy choice is valid.

---

## Real-World Applications

Greedy algorithms are used in:

- Activity scheduling.
- Interval selection.
- Huffman coding.
- Minimum spanning tree algorithms.
- Some routing and network problems.
- Resource allocation.
- Task prioritization.

---

## VisualDSA Integration

Use the VisualDSA Greedy Choice Visualizer to test local choices and final results.

Recommended interactions:

- Select coins for a target amount.
- Choose activities from a schedule.
- Compare greedy result with optimal result.
- Identify counterexamples.
- Explain whether the greedy choice is safe.

Suggested VisualDSA route:

```text
/visualdsa/greedy-choice-visualizer
```

Data that can be captured for analytics:

- Incorrect local choice.
- Failure to identify counterexamples.
- Confusion between local and global optimum.
- Time spent evaluating alternatives.
- Accuracy in explaining why greedy works or fails.

---

## Practice Activity

Use greedy coin change for this problem:

Coins:

```text
[25, 10, 5, 1]
```

Amount:

```text
63
```

Tasks:

1. List the coins selected by greedy.
2. Count the number of coins.
3. Explain each greedy choice.
4. State whether you think greedy is safe for this coin system.

Then test this case:

Coins:

```text
[4, 3, 1]
```

Amount:

```text
6
```

Reflection question:

What does the second case teach you about greedy algorithms?

---

## Quick Check

1. What is a greedy algorithm?
2. What is a local optimum?
3. What is a global optimum?
4. Does greedy always give the best final answer?
5. Why are counterexamples important?

---

## Answer Key

1. A greedy algorithm chooses the best current option at each step.
2. A local optimum is the best choice at the current step.
3. A global optimum is the best overall solution.
4. No. Greedy does not always give the best final answer.
5. Counterexamples show when a greedy strategy fails.

---

## Summary

Greedy algorithms make the best immediate choice at each step. They can be fast and simple, but they must be used carefully. A greedy strategy is strong only when the local choices can be shown to lead to the best overall result.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 24: Divide and Conquer](./lesson-24-divide-and-conquer.md)  
Next Lesson: [Lesson 26: Dynamic Programming Basics](./lesson-26-dynamic-programming.md)
