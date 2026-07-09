# Project 1: Student Grade Record System

**Course:** Data Structures and Algorithms  
**Section:** Applied DSA Projects  
**Level:** Beginner to Intermediate  
**Estimated Time:** 60 to 90 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/student-grade-record-system`

---

## Project Overview

In this project, you will build a simple Student Grade Record System using basic Data Structures and Algorithms.

The system will store student records, display records, search for a student, and sort students by grade.

This project connects arrays, records, linear search, and sorting.

---

## DSA Concepts Used

| Concept | How It Is Used |
|---|---|
| List or Array | Stores multiple student records |
| Dictionary | Stores one student record |
| Linear Search | Finds a student by ID |
| Sorting | Arranges students by grade |
| Traversal | Displays all records |
| Algorithmic Thinking | Breaks the system into clear operations |

---

## Problem Scenario

A teacher needs a simple program to manage student grades.

The program should allow the teacher to:

- Add student records.
- View all student records.
- Search for a student by ID.
- Sort students by grade.
- Display the highest and lowest grade.

This is a simplified version of a student record system.

---

## Learning Objectives

After completing this project, you should be able to:

- Store records using a list of dictionaries.
- Search for a record using linear search.
- Sort records based on a numeric value.
- Create a menu-based Python program.
- Explain which DSA concepts were used.
- Analyze the basic time complexity of each operation.

---

## System Requirements

The program should include these features:

1. Add a student record.
2. View all student records.
3. Search student by ID.
4. Sort students by grade.
5. Show highest and lowest grade.
6. Exit the program.

Each student record should include:

- Student ID
- Student name
- Grade

---

## Suggested Data Structure

Use a list of dictionaries.

```python
students = [
    {"id": "2024001", "name": "Ana", "grade": 92},
    {"id": "2024002", "name": "Ben", "grade": 88}
]
```

Each dictionary represents one student.

The list stores all student records.

---

## Sample Menu

```text
Student Grade Record System

1. Add student
2. View all students
3. Search student by ID
4. Sort students by grade
5. Show highest and lowest grade
6. Exit

Enter choice:
```

---

## Sample Output

```text
Enter student ID: 2024001
Enter student name: Ana
Enter grade: 92

Student added successfully.
```

View all students:

```text
ID: 2024001 | Name: Ana | Grade: 92
ID: 2024002 | Name: Ben | Grade: 88
ID: 2024003 | Name: Carlo | Grade: 95
```

Search output:

```text
Student found:
ID: 2024002
Name: Ben
Grade: 88
```

Sort output:

```text
Students sorted by grade:
ID: 2024002 | Name: Ben | Grade: 88
ID: 2024001 | Name: Ana | Grade: 92
ID: 2024003 | Name: Carlo | Grade: 95
```

---

## Starter Code

```python
students = []


def add_student():
    student_id = input("Enter student ID: ")
    name = input("Enter student name: ")
    grade = float(input("Enter grade: "))

    student = {
        "id": student_id,
        "name": name,
        "grade": grade
    }

    students.append(student)

    print("Student added successfully.")


def view_students():
    if len(students) == 0:
        print("No student records available.")
        return

    for student in students:
        print("ID:", student["id"], "| Name:", student["name"], "| Grade:", student["grade"])


def search_student():
    target_id = input("Enter student ID to search: ")

    for student in students:
        if student["id"] == target_id:
            print("Student found:")
            print("ID:", student["id"])
            print("Name:", student["name"])
            print("Grade:", student["grade"])
            return

    print("Student not found.")


def sort_by_grade():
    students.sort(key=lambda student: student["grade"])

    print("Students sorted by grade.")


def show_highest_lowest():
    if len(students) == 0:
        print("No student records available.")
        return

    highest = max(students, key=lambda student: student["grade"])
    lowest = min(students, key=lambda student: student["grade"])

    print("Highest Grade:", highest["name"], highest["grade"])
    print("Lowest Grade:", lowest["name"], lowest["grade"])


while True:
    print("\nStudent Grade Record System")
    print("1. Add student")
    print("2. View all students")
    print("3. Search student by ID")
    print("4. Sort students by grade")
    print("5. Show highest and lowest grade")
    print("6. Exit")

    choice = input("Enter choice: ")

    if choice == "1":
        add_student()
    elif choice == "2":
        view_students()
    elif choice == "3":
        search_student()
    elif choice == "4":
        sort_by_grade()
    elif choice == "5":
        show_highest_lowest()
    elif choice == "6":
        print("Program ended.")
        break
    else:
        print("Invalid choice.")
```

---

## Code Walkthrough

The program uses:

```python
students = []
```

This list stores all student records.

Each student record uses a dictionary:

```python
{
    "id": student_id,
    "name": name,
    "grade": grade
}
```

The `search_student()` function uses linear search.

The `sort_by_grade()` function sorts students based on their grade.

The `show_highest_lowest()` function uses `max()` and `min()` to find grade extremes.

---

## Time Complexity Guide

| Operation | Time Complexity | Reason |
|---|---|---|
| Add student | O(1) | Appends to the list |
| View all students | O(n) | Displays every record |
| Search by ID | O(n) | May check every record |
| Sort by grade | O(n log n) | Python sort is efficient |
| Highest and lowest | O(n) | Checks records |

---

## VisualDSA Integration

Use the VisualDSA Student Grade Record System demo to visualize how records are added, searched, and sorted.

Suggested VisualDSA route:

```text
/visualdsa/student-grade-record-system
```

Recommended interactions:

- Add a student record.
- Highlight each record during linear search.
- Sort records by grade.
- Identify highest and lowest grade.
- Compare unsorted and sorted records.

Data that can be captured for analytics:

- Search accuracy.
- Sorting interpretation.
- Time spent finding a record.
- Mistakes in identifying highest and lowest.
- Completion status.

---

## Project Checklist

Your output should include:

- A working menu.
- Add student feature.
- View all records feature.
- Search by ID feature.
- Sort by grade feature.
- Highest and lowest grade feature.
- Proper handling of empty records.
- Clear output messages.

---

## Suggested Improvements

After completing the basic version, improve the program by adding:

- Duplicate student ID checking.
- Grade validation from 0 to 100.
- Search by name.
- Sort from highest to lowest.
- Save records to a file.
- Load records from a file.

---

## Rubric

| Criteria | Points |
|---|---:|
| Correct use of list and dictionary | 20 |
| Add and view records work correctly | 20 |
| Search by ID works correctly | 20 |
| Sorting by grade works correctly | 15 |
| Highest and lowest grade feature works | 10 |
| Code readability and organization | 10 |
| Error handling | 5 |
| Total | 100 |

---

## Reflection Questions

1. Why is a list useful for storing multiple student records?
2. Why does searching by ID use O(n) time in this version?
3. What data structure could make student ID lookup faster?
4. Why is sorting useful in a grade record system?
5. How could this project be improved for a real school system?

---

## Related Lessons

- [Lesson 4: Arrays](../lessons/lesson-04-arrays.md)
- [Lesson 16: Linear Search](../lessons/lesson-16-linear-search.md)
- [Lesson 18: Bubble Sort](../lessons/lesson-18-bubble-sort.md)
- [Lesson 27: Hash Tables](../lessons/lesson-27-hash-tables.md)
- [Lesson 30: DSA Review and Integration](../lessons/lesson-30-dsa-review-and-integration.md)
