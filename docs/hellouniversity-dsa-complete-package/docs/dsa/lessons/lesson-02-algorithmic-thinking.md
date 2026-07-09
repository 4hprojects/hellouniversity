---
title: "Lesson 2: Algorithmic Thinking"
slug: "/data-structures-and-algorithms/algorithmic-thinking"
section: "Foundations"
lesson_number: 2
level: "Beginner"
estimated_time: "30 to 40 minutes"
primary_language: "Python"
related_visualdsa: "/visualdsa/algorithmic-thinking"
---

# Lesson 2: Algorithmic Thinking

## Lesson Header

- **Course:** Data Structures and Algorithms
- **Section:** Foundations
- **Lesson:** 2
- **Level:** Beginner
- **Estimated time:** 30 to 40 minutes
- **Primary language:** Python
- **Related VisualDSA page:** `/visualdsa/algorithmic-thinking`

## Lesson Overview

Algorithmic thinking is the ability to solve a problem using clear, ordered, and logical steps.

Before you write code, you need to understand the problem.

A common mistake among beginners is to write code immediately. This often leads to confusion because the solution is not yet clear.

Algorithmic thinking helps you slow down and ask better questions:

- What is the input?
- What should the output be?
- What steps are needed?
- What conditions should be checked?
- What should happen when the input is invalid?

This lesson teaches you how to think before coding.

## Learning Objectives

At the end of this lesson, you should be able to:

- Explain what algorithmic thinking means
- Identify input, process, and output
- Break a problem into smaller steps
- Write simple pseudocode
- Trace an algorithm manually
- Convert a simple algorithm into Python code

## Key Terms

| Term | Meaning |
|---|---|
| Algorithmic thinking | Solving problems through clear and logical steps |
| Input | Data given to the algorithm |
| Process | Steps performed to solve the problem |
| Output | Result produced by the algorithm |
| Decomposition | Breaking a problem into smaller parts |
| Pseudocode | A plain-language version of an algorithm |
| Dry run | Manually tracing an algorithm with sample data |
| Condition | A decision point in an algorithm |

## Simple Explanation

Algorithmic thinking means you can explain your solution before writing the code.

For example, suppose the task is:

> Compute the average of three grades.

You should not start with code right away.

First, identify the parts.

| Part | Example |
|---|---|
| Input | Three grades |
| Process | Add the grades, then divide by 3 |
| Output | Average grade |

Then write the steps.

```text
1. Get the first grade.
2. Get the second grade.
3. Get the third grade.
4. Add the three grades.
5. Divide the total by 3.
6. Display the average.
```

Now the program is easier to write.

## Input, Process, Output

The Input, Process, Output model is one of the easiest ways to design an algorithm.

### Input

Input is what the program needs.

Examples:

- Student name
- Student grade
- Search value
- Number of items
- Menu choice

### Process

Process is what the program does.

Examples:

- Add values
- Compare values
- Sort items
- Search for an item
- Check conditions

### Output

Output is what the program displays or returns.

Examples:

- Average grade
- Search result
- Sorted list
- Error message
- Final total

## Example Problem

Problem:

> Create an algorithm that determines if a student passed or failed. A grade of 75 or higher means passed. A grade below 75 means failed.

### Input

```text
Student grade
```

### Process

```text
Check if grade is greater than or equal to 75
```

### Output

```text
Passed or Failed
```

## Pseudocode

Pseudocode lets you write the logic without worrying about exact programming syntax.

```text
START
  INPUT grade

  IF grade >= 75 THEN
    DISPLAY "Passed"
  ELSE
    DISPLAY "Failed"
  END IF
END
```

This is not Python yet.

It is a planning version of the solution.

## Python Code Example

```python
grade = int(input("Enter grade: "))

if grade >= 75:
    print("Passed")
else:
    print("Failed")
```

## Code Walkthrough

```python
grade = int(input("Enter grade: "))
```

This asks the user to enter a grade and converts it into an integer.

```python
if grade >= 75:
```

This checks if the grade is 75 or higher.

```python
print("Passed")
```

This displays Passed when the condition is true.

```python
else:
    print("Failed")
```

This displays Failed when the condition is false.

## Step-by-Step Trace

Sample input:

```text
82
```

| Step | Action | Value |
|---:|---|---|
| 1 | Input grade | 82 |
| 2 | Check grade >= 75 | True |
| 3 | Display result | Passed |

Sample input:

```text
70
```

| Step | Action | Value |
|---:|---|---|
| 1 | Input grade | 70 |
| 2 | Check grade >= 75 | False |
| 3 | Display result | Failed |

## Decomposition

Decomposition means breaking a problem into smaller tasks.

Example problem:

> Create a program that computes the average grade of a student and displays the remarks.

Break it down:

1. Get the student name
2. Get the grades
3. Compute the total
4. Compute the average
5. Check if the student passed
6. Display the result

Each part is easier to solve than the full problem.

## Algorithm Design Questions

Before writing code, ask these questions:

- What data do I need?
- What should the program produce?
- What steps should happen first?
- Are there conditions?
- Are there repeated actions?
- What can go wrong?
- How can I test the solution?

These questions help you avoid unclear code.

## Time and Space Idea

Even simple algorithms use time and memory.

For this lesson, you only need the basic idea.

| Resource | Meaning |
|---|---|
| Time | How many steps the algorithm performs |
| Space | How much memory the algorithm needs |

Example:

Computing the average of three grades always takes a small fixed number of steps.

It does not matter if the grades are high or low.

This kind of process is usually simple and predictable.

## Real-World Applications

Algorithmic thinking is useful in:

- Writing programs
- Debugging errors
- Designing systems
- Creating workflows
- Solving math problems
- Planning database operations
- Explaining technical solutions to others

In software development, unclear thinking often creates unclear code.

Clear algorithmic thinking makes your code easier to write, test, and explain.

## Interactive Learning

Use VisualDSA to practice tracing algorithm steps.

Recommended VisualDSA activity:

- Open `/visualdsa/algorithmic-thinking`
- Choose a simple grade-checking algorithm
- Enter a sample grade
- Predict the output before running the next step
- Compare your answer with the actual result

### VisualDSA Data to Capture

For this lesson, VisualDSA may capture:

- Number of correct predictions
- Number of incorrect predictions
- Time spent tracing
- Whether the student can identify input, process, and output

## Practice Activity

Create an algorithm and Python program that computes the average of three grades.

### Requirements

Your program should:

- Ask for three grades
- Compute the total
- Compute the average
- Display the average
- Display Passed if the average is 75 or higher
- Display Failed if the average is below 75

### Suggested Pseudocode

```text
START
  INPUT grade1
  INPUT grade2
  INPUT grade3

  total = grade1 + grade2 + grade3
  average = total / 3

  DISPLAY average

  IF average >= 75 THEN
    DISPLAY "Passed"
  ELSE
    DISPLAY "Failed"
  END IF
END
```

## Quick Check

Answer the following questions.

1. What is algorithmic thinking?
2. What are the three parts of the Input, Process, Output model?
3. Why is pseudocode useful?
4. What does dry run mean?
5. Why should you understand the problem before writing code?

## Answer Key

1. Algorithmic thinking is solving a problem using clear and logical steps.
2. Input, process, and output.
3. Pseudocode helps plan the logic without worrying about exact programming syntax.
4. Dry run means manually tracing an algorithm using sample data.
5. It helps avoid unclear logic and coding mistakes.

## Common Mistakes

- Writing code before understanding the problem
- Skipping input and output analysis
- Forgetting possible conditions
- Not testing with different values
- Confusing pseudocode with actual programming syntax

## Summary

Algorithmic thinking helps you create clear steps before writing code.

It starts with understanding the problem, identifying input, process, and output, then writing the solution in simple steps.

A clear algorithm makes coding easier.

## Previous and Next Lesson

- Previous lesson: Lesson 1, Introduction to DSA
- Next lesson: Lesson 3, Time and Space Complexity
