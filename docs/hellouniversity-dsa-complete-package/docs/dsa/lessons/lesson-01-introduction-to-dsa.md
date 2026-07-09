---
title: "Lesson 1: Introduction to Data Structures and Algorithms"
slug: "/data-structures-and-algorithms/introduction"
section: "Foundations"
lesson_number: 1
level: "Beginner"
estimated_time: "25 to 35 minutes"
primary_language: "Python"
related_visualdsa: "/visualdsa/introduction"
---

# Lesson 1: Introduction to Data Structures and Algorithms

## Lesson Header

- **Course:** Data Structures and Algorithms
- **Section:** Foundations
- **Lesson:** 1
- **Level:** Beginner
- **Estimated time:** 25 to 35 minutes
- **Primary language:** Python
- **Related VisualDSA page:** `/visualdsa/introduction`

## Lesson Overview

Data Structures and Algorithms, commonly called DSA, is the study of how data is stored, organized, processed, and used to solve problems.

A **data structure** is a way to organize data.

An **algorithm** is a step-by-step process for solving a problem.

When you write a program, you usually do two things:

- Store data
- Process data

DSA helps you decide the best way to do both.

For example, a student grade system may need to store student names, grades, subjects, and final averages. If the data is small, a simple list may be enough. If the system becomes larger, you may need better searching, sorting, and organization.

That is where DSA becomes important.

## Learning Objectives

At the end of this lesson, you should be able to:

- Define data structures
- Define algorithms
- Explain why data structures and algorithms are studied together
- Identify simple examples of data structures in real systems
- Describe how DSA affects program performance
- Recognize the role of DSA in software development

## Key Terms

| Term | Meaning |
|---|---|
| Data | Raw facts or values used by a program |
| Data structure | A way to organize and store data |
| Algorithm | A step-by-step process for solving a problem |
| Input | Data given to a program |
| Process | The steps performed by a program |
| Output | The result produced by a program |
| Efficiency | How well a program uses time and memory |

## Simple Explanation

Think about a class record.

You may have this data:

| Student Name | Grade |
|---|---:|
| Ana | 92 |
| Ben | 85 |
| Carlo | 88 |
| Dana | 95 |

The data structure answers this question:

> How will you store the student records?

Possible answers:

- A list
- A table
- A dictionary
- A database collection

The algorithm answers this question:

> What will you do with the student records?

Possible answers:

- Find a student
- Sort grades from highest to lowest
- Compute the class average
- Identify students who passed

DSA is the combination of these two decisions.

## Why DSA Matters

DSA matters because the same problem can be solved in different ways.

Some solutions are easy to write but slow.

Some solutions are harder to write but faster.

Some use less memory.

Some are easier to maintain.

A good programmer does not only ask:

> Does the program work?

A better programmer also asks:

> Is this the right way to solve the problem?

That question is one of the main reasons you study DSA.

## Basic Example

Suppose you need to find a student named "Carlo" in a list.

```python
students = ["Ana", "Ben", "Carlo", "Dana"]

search_name = "Carlo"

for student in students:
    if student == search_name:
        print("Student found")
```

This program checks each name one by one.

That process is an algorithm.

The list named `students` is the data structure.

## Code Walkthrough

```python
students = ["Ana", "Ben", "Carlo", "Dana"]
```

This line stores four student names in a list.

```python
search_name = "Carlo"
```

This line stores the name we want to find.

```python
for student in students:
```

This loop checks each student name one at a time.

```python
if student == search_name:
```

This condition checks if the current student is the one we are looking for.

```python
print("Student found")
```

This displays a message when the student is found.

## Step-by-Step Trace

| Step | Current Student | Is it Carlo? | Result |
|---:|---|---|---|
| 1 | Ana | No | Continue |
| 2 | Ben | No | Continue |
| 3 | Carlo | Yes | Student found |

Tracing helps you understand what the program is doing at each step.

## Data Structures and Algorithms Work Together

A data structure without an algorithm is only stored data.

An algorithm without data has nothing to process.

They work together.

Example:

| Problem | Data Structure | Algorithm |
|---|---|---|
| Store student names | List | Traversal |
| Find a student ID | List or dictionary | Search |
| Arrange grades | List | Sorting |
| Process enrollment line | Queue | Enqueue and dequeue |
| Undo typing action | Stack | Push and pop |
| Represent campus paths | Graph | Breadth-first search |

## Common Data Structures

You will study these structures in this course:

- Arrays
- Strings
- Linked lists
- Stacks
- Queues
- Trees
- Graphs
- Hash tables
- Sets
- Maps
- Tries

Each one solves a different type of problem.

## Common Algorithms

You will also study common algorithms such as:

- Linear search
- Binary search
- Bubble sort
- Selection sort
- Insertion sort
- Merge sort
- Quick sort
- Tree traversal
- Graph traversal
- Greedy algorithms
- Dynamic programming basics

## Time and Space Idea

Programs use two important resources:

- Time
- Memory

Time refers to how long the program takes to run.

Memory refers to how much storage the program uses while running.

In later lessons, you will learn how to describe this using **time complexity** and **space complexity**.

For now, remember this:

> A working program is good. A working program that uses the right structure and algorithm is better.

## Real-World Applications

DSA appears in many systems you already use.

| System | Possible DSA Concept |
|---|---|
| Search engine | Searching, ranking, graphs |
| Social media feed | Queues, graphs, sorting |
| Online shopping cart | Lists, maps, sorting |
| Navigation app | Graphs, shortest path |
| Undo button | Stack |
| Printer queue | Queue |
| File explorer | Trees |
| Login lookup | Hash table |

## Interactive Learning

Use VisualDSA to explore how data and operations change step by step.

Recommended VisualDSA activity:

- Open `/visualdsa/introduction`
- View a simple list of student names
- Run a step-by-step search
- Observe how each item is checked
- Answer the prediction question before the next step

### VisualDSA Data to Capture

For this lesson, VisualDSA may capture:

- Whether the student completed the demo
- Number of prediction attempts
- Correct or incorrect answers
- Time spent on the activity

This supports instructor analytics later.

## Practice Activity

Create a Python program that stores five student names in a list and searches for one name.

### Requirements

Your program should:

- Create a list of five names
- Ask the user to enter a name to search
- Check the names one by one
- Display whether the name was found or not

### Sample Output

```text
Enter name to search: Carlo
Carlo was found in the list.
```

## Quick Check

Answer the following questions.

1. What is a data structure?
2. What is an algorithm?
3. Why are data structures and algorithms studied together?
4. What data structure can be used to store a list of student names?
5. What algorithmic process checks each item one by one?

## Answer Key

1. A data structure is a way to organize and store data.
2. An algorithm is a step-by-step process for solving a problem.
3. They work together because data must be stored before it can be processed.
4. A list can be used.
5. Linear search or traversal.

## Common Mistakes

- Thinking DSA is only for competitive programming
- Memorizing code without understanding the process
- Confusing the data structure with the algorithm
- Ignoring how long a solution takes to run
- Ignoring how much memory a solution uses

## Summary

Data Structures and Algorithms help you organize data and solve problems effectively.

A data structure stores data.

An algorithm processes data.

Together, they help you build programs that are correct, organized, and easier to improve.

## Previous and Next Lesson

- Previous lesson: Course Overview
- Next lesson: Lesson 2, Algorithmic Thinking
