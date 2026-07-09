# Project 2: Queue-Based Enrollment System

**Course:** Data Structures and Algorithms  
**Section:** Applied DSA Projects  
**Level:** Beginner  
**Estimated Time:** 45 to 75 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/enrollment-queue-system`

---

## Project Overview

In this project, you will build a simple Queue-Based Enrollment System.

The system will simulate students waiting to be processed for enrollment.

This project focuses on the queue data structure and the First In, First Out principle.

---

## DSA Concepts Used

| Concept | How It Is Used |
|---|---|
| Queue | Stores students waiting for enrollment |
| FIFO | The first student added is processed first |
| Enqueue | Adds a student to the queue |
| Dequeue | Processes the next student |
| Front | Shows who will be processed next |
| Traversal | Displays all waiting students |

---

## Problem Scenario

During enrollment, students line up and wait for processing.

The first student in line should be served first.

Your task is to create a program that simulates this process.

---

## Learning Objectives

After completing this project, you should be able to:

- Implement a queue in Python.
- Use enqueue and dequeue operations.
- Display the front of the queue.
- Handle an empty queue.
- Create a menu-based simulation.
- Explain why a queue fits the enrollment process.

---

## System Requirements

The program should include these features:

1. Add a student to the queue.
2. Process the next student.
3. View the next student.
4. View all waiting students.
5. Check if the queue is empty.
6. Exit the program.

Each student entry should include:

- Student ID
- Student name
- Program or course

---

## Suggested Data Structure

Use `deque` from Python’s `collections` module.

```python
from collections import deque

enrollment_queue = deque()
```

Each queue item can be a dictionary.

```python
{
    "id": "2024001",
    "name": "Ana",
    "program": "BSIT"
}
```

---

## Sample Menu

```text
Queue-Based Enrollment System

1. Add student to queue
2. Process next student
3. View next student
4. View all waiting students
5. Check if queue is empty
6. Exit

Enter choice:
```

---

## Sample Output

Adding a student:

```text
Enter student ID: 2024001
Enter student name: Ana
Enter program: BSIT

Ana was added to the enrollment queue.
```

Processing a student:

```text
Now processing:
ID: 2024001
Name: Ana
Program: BSIT
```

Viewing queue:

```text
Waiting students:
1. Ben - BSCS
2. Carlo - BSIT
3. Dana - BSIS
```

---

## Starter Code

```python
from collections import deque

enrollment_queue = deque()


def add_student():
    student_id = input("Enter student ID: ")
    name = input("Enter student name: ")
    program = input("Enter program: ")

    student = {
        "id": student_id,
        "name": name,
        "program": program
    }

    enrollment_queue.append(student)

    print(name, "was added to the enrollment queue.")


def process_student():
    if len(enrollment_queue) == 0:
        print("No students waiting.")
        return

    student = enrollment_queue.popleft()

    print("Now processing:")
    print("ID:", student["id"])
    print("Name:", student["name"])
    print("Program:", student["program"])


def view_next_student():
    if len(enrollment_queue) == 0:
        print("No students waiting.")
        return

    student = enrollment_queue[0]

    print("Next student:")
    print("ID:", student["id"])
    print("Name:", student["name"])
    print("Program:", student["program"])


def view_all_students():
    if len(enrollment_queue) == 0:
        print("No students waiting.")
        return

    print("Waiting students:")

    for index, student in enumerate(enrollment_queue, start=1):
        print(index, ".", student["name"], "-", student["program"])


def check_empty():
    if len(enrollment_queue) == 0:
        print("The queue is empty.")
    else:
        print("There are", len(enrollment_queue), "students waiting.")


while True:
    print("\nQueue-Based Enrollment System")
    print("1. Add student to queue")
    print("2. Process next student")
    print("3. View next student")
    print("4. View all waiting students")
    print("5. Check if queue is empty")
    print("6. Exit")

    choice = input("Enter choice: ")

    if choice == "1":
        add_student()
    elif choice == "2":
        process_student()
    elif choice == "3":
        view_next_student()
    elif choice == "4":
        view_all_students()
    elif choice == "5":
        check_empty()
    elif choice == "6":
        print("Program ended.")
        break
    else:
        print("Invalid choice.")
```

---

## Code Walkthrough

The queue is created using:

```python
enrollment_queue = deque()
```

Students are added using:

```python
enrollment_queue.append(student)
```

This is the enqueue operation.

Students are processed using:

```python
enrollment_queue.popleft()
```

This is the dequeue operation.

The next student is viewed using:

```python
enrollment_queue[0]
```

This shows the front of the queue without removing the student.

---

## Time Complexity Guide

| Operation | Time Complexity | Reason |
|---|---|---|
| Add student | O(1) | Adds to the rear |
| Process student | O(1) | Removes from the front |
| View next student | O(1) | Reads the front |
| View all students | O(n) | Displays every waiting student |
| Check empty | O(1) | Checks queue length |

---

## VisualDSA Integration

Use the VisualDSA Enrollment Queue System demo to visualize queue behavior.

Suggested VisualDSA route:

```text
/visualdsa/enrollment-queue-system
```

Recommended interactions:

- Enqueue a student.
- Dequeue the next student.
- Highlight front and rear.
- Predict who will be processed next.
- Compare queue behavior with stack behavior.

Data that can be captured for analytics:

- Wrong next-student prediction.
- Front and rear confusion.
- Dequeue mistakes.
- Time spent completing queue tasks.
- Completion status.

---

## Project Checklist

Your output should include:

- A working menu.
- Add student feature.
- Process next student feature.
- View next student feature.
- View all waiting students feature.
- Empty queue handling.
- Clear messages.

---

## Suggested Improvements

After completing the basic version, improve the program by adding:

- Priority queue for special cases.
- Duplicate student ID checking.
- Estimated waiting number.
- Search for student in queue.
- Remove a student who cancels.
- Save queue records to a file.

---

## Rubric

| Criteria | Points |
|---|---:|
| Correct queue implementation | 25 |
| Enqueue feature works | 15 |
| Dequeue feature works | 15 |
| Front display works | 10 |
| View all waiting students works | 10 |
| Empty queue handling | 10 |
| Code readability and organization | 10 |
| Reflection answers | 5 |
| Total | 100 |

---

## Reflection Questions

1. Why is a queue better than a stack for enrollment?
2. What happens when you process a student from an empty queue?
3. What does FIFO mean in this project?
4. Which part of the queue is the front?
5. How could this be improved for real enrollment processing?

---

## Related Lessons

- [Lesson 9: Queues](../lessons/lesson-09-queues.md)
- [Lesson 15: Graph Traversals](../lessons/lesson-15-graph-traversals.md)
- [Lesson 30: DSA Review and Integration](../lessons/lesson-30-dsa-review-and-integration.md)
