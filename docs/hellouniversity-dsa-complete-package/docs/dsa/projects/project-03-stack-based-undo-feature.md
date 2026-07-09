# Project 3: Stack-Based Undo Feature

**Course:** Data Structures and Algorithms  
**Section:** Applied DSA Projects  
**Level:** Beginner  
**Estimated Time:** 45 to 75 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/stack-undo-feature`

---

## Project Overview

In this project, you will build a simple Stack-Based Undo Feature.

The program will store user actions in a stack. When the user chooses undo, the most recent action is removed first.

This project focuses on the stack data structure and the Last In, First Out principle.

---

## DSA Concepts Used

| Concept | How It Is Used |
|---|---|
| Stack | Stores action history |
| LIFO | The last action is undone first |
| Push | Adds a new action |
| Pop | Removes the most recent action |
| Peek | Views the most recent action |
| Traversal | Displays action history |

---

## Problem Scenario

Many applications have an undo feature.

Examples:

- Text editors
- Drawing tools
- Form builders
- File managers
- Code editors

When a user performs actions, the system stores them. When the user clicks undo, the most recent action should be reversed first.

---

## Learning Objectives

After completing this project, you should be able to:

- Implement a stack using a Python list.
- Use push, pop, and peek operations.
- Simulate an undo feature.
- Handle an empty stack.
- Create a menu-based program.
- Explain why a stack is the correct structure for undo.

---

## System Requirements

The program should include these features:

1. Add an action.
2. Undo the last action.
3. View the latest action.
4. View all actions.
5. Clear all actions.
6. Exit the program.

Each action can be stored as text.

Example actions:

```text
Typed "Hello"
Changed font size
Deleted paragraph
Inserted image
```

---

## Suggested Data Structure

Use a Python list as a stack.

```python
action_stack = []
```

Push action:

```python
action_stack.append(action)
```

Pop action:

```python
action_stack.pop()
```

Peek action:

```python
action_stack[-1]
```

---

## Sample Menu

```text
Stack-Based Undo Feature

1. Add action
2. Undo last action
3. View latest action
4. View all actions
5. Clear all actions
6. Exit

Enter choice:
```

---

## Sample Output

Adding actions:

```text
Enter action: Typed Hello
Action added.
```

Undo:

```text
Undo completed:
Typed Hello
```

View latest action:

```text
Latest action:
Changed font size
```

---

## Starter Code

```python
action_stack = []


def add_action():
    action = input("Enter action: ")

    action_stack.append(action)

    print("Action added.")


def undo_action():
    if len(action_stack) == 0:
        print("No actions to undo.")
        return

    removed_action = action_stack.pop()

    print("Undo completed:")
    print(removed_action)


def view_latest_action():
    if len(action_stack) == 0:
        print("No actions available.")
        return

    print("Latest action:")
    print(action_stack[-1])


def view_all_actions():
    if len(action_stack) == 0:
        print("No actions available.")
        return

    print("Action history:")

    for index, action in enumerate(action_stack, start=1):
        print(index, ".", action)


def clear_actions():
    action_stack.clear()

    print("All actions cleared.")


while True:
    print("\nStack-Based Undo Feature")
    print("1. Add action")
    print("2. Undo last action")
    print("3. View latest action")
    print("4. View all actions")
    print("5. Clear all actions")
    print("6. Exit")

    choice = input("Enter choice: ")

    if choice == "1":
        add_action()
    elif choice == "2":
        undo_action()
    elif choice == "3":
        view_latest_action()
    elif choice == "4":
        view_all_actions()
    elif choice == "5":
        clear_actions()
    elif choice == "6":
        print("Program ended.")
        break
    else:
        print("Invalid choice.")
```

---

## Code Walkthrough

The stack is created using:

```python
action_stack = []
```

An action is pushed using:

```python
action_stack.append(action)
```

The latest action is undone using:

```python
action_stack.pop()
```

The latest action is viewed using:

```python
action_stack[-1]
```

The stack must be checked before `pop()` or `[-1]` to avoid errors.

---

## Time Complexity Guide

| Operation | Time Complexity | Reason |
|---|---|---|
| Add action | O(1) | Adds to the top |
| Undo action | O(1) | Removes from the top |
| View latest action | O(1) | Reads the top |
| View all actions | O(n) | Displays every action |
| Clear actions | O(n) | Removes stored actions |

---

## VisualDSA Integration

Use the VisualDSA Stack Undo Feature demo to visualize action history.

Suggested VisualDSA route:

```text
/visualdsa/stack-undo-feature
```

Recommended interactions:

- Push actions into the stack.
- Pop the most recent action.
- Peek at the latest action.
- Predict which action will be undone.
- Trigger and explain stack underflow.

Data that can be captured for analytics:

- Wrong undo prediction.
- Stack top confusion.
- Underflow attempts.
- Time spent tracing action history.
- Completion status.

---

## Project Checklist

Your output should include:

- A working menu.
- Add action feature.
- Undo last action feature.
- View latest action feature.
- View all actions feature.
- Empty stack handling.
- Clear action history feature.
- Clear output messages.

---

## Suggested Improvements

After completing the basic version, improve the program by adding:

- Redo feature using another stack.
- Timestamp for each action.
- Action categories.
- Save action history to a file.
- Undo confirmation.
- Maximum stack size.

---

## Rubric

| Criteria | Points |
|---|---:|
| Correct stack implementation | 25 |
| Push action feature works | 15 |
| Pop or undo feature works | 20 |
| Peek feature works | 10 |
| Empty stack handling | 10 |
| View action history works | 10 |
| Code readability and organization | 5 |
| Reflection answers | 5 |
| Total | 100 |

---

## Reflection Questions

1. Why is stack the correct structure for undo?
2. What does Last In, First Out mean in this project?
3. What happens if the user clicks undo with no actions?
4. How could redo be added?
5. What other applications use stacks?

---

## Related Lessons

- [Lesson 8: Stacks](../lessons/lesson-08-stacks.md)
- [Lesson 6: Recursion](../lessons/lesson-06-recursion.md)
- [Lesson 30: DSA Review and Integration](../lessons/lesson-30-dsa-review-and-integration.md)
