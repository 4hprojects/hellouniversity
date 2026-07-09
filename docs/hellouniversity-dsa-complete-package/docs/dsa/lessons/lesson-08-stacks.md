# Lesson 8: Stacks

**Course:** Data Structures and Algorithms  
**Section:** Linear Data Structures  
**Level:** Beginner  
**Estimated Time:** 25 to 35 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/stack-visualizer`

---

## Lesson Overview

A stack is a linear data structure that follows the Last In, First Out principle.

This means the last item added to the stack is the first item removed.

Stacks are useful in many programming tasks, such as undo features, browser history, expression evaluation, and function calls.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a stack.
- Explain the Last In, First Out principle.
- Perform push, pop, and peek operations.
- Trace stack operations.
- Implement a stack using a Python list.
- Identify stack overflow and underflow.

---

## Key Terms

| Term | Meaning |
|---|---|
| Stack | A data structure that follows Last In, First Out |
| LIFO | Last In, First Out |
| Push | Add an item to the stack |
| Pop | Remove the top item |
| Peek | View the top item without removing it |
| Top | The most recently added item |
| Underflow | Removing from an empty stack |
| Overflow | Adding beyond capacity in a fixed-size stack |

---

## Simple Explanation

Think of a stack as a pile of plates.

You place a new plate on top. When you remove a plate, you also remove from the top.

You cannot remove the bottom plate first without disturbing the plates above it.

---

## Stack Example

```text
push(10)
push(20)
push(30)
pop()
```

Trace:

| Step | Operation | Stack Content |
|---|---|---|
| 1 | push(10) | [10] |
| 2 | push(20) | [10, 20] |
| 3 | push(30) | [10, 20, 30] |
| 4 | pop() | [10, 20] |

The removed value is `30` because it was the last value added.

---

## Python Implementation

```python
stack = []

stack.append(10)
stack.append(20)
stack.append(30)

print("Stack:", stack)

top_item = stack.pop()

print("Removed:", top_item)
print("Updated Stack:", stack)
```

Output:

```text
Stack: [10, 20, 30]
Removed: 30
Updated Stack: [10, 20]
```

---

## Code Walkthrough

```python
stack = []
```

This creates an empty stack.

```python
stack.append(10)
```

This pushes `10` onto the stack.

```python
stack.pop()
```

This removes and returns the top item.

In Python, the end of the list acts as the top of the stack.

---

## Stack Class Example

```python
class Stack:
    def __init__(self):
        self.items = []

    def push(self, value):
        self.items.append(value)

    def pop(self):
        if self.is_empty():
            return "Stack underflow"
        return self.items.pop()

    def peek(self):
        if self.is_empty():
            return "Stack is empty"
        return self.items[-1]

    def is_empty(self):
        return len(self.items) == 0

    def display(self):
        print(self.items)


stack = Stack()

stack.push("Login")
stack.push("View Dashboard")
stack.push("Edit Profile")

stack.display()
print("Top:", stack.peek())
print("Undo:", stack.pop())
stack.display()
```

---

## How Stack Operations Work

| Operation | Description |
|---|---|
| Push | Adds a new item at the top |
| Pop | Removes the top item |
| Peek | Reads the top item |
| Is Empty | Checks whether the stack has no items |

---

## Time and Space Complexity

| Operation | Time Complexity |
|---|---|
| Push | O(1) |
| Pop | O(1) |
| Peek | O(1) |
| Search | O(n) |

Space complexity:

```text
O(n)
```

The stack stores `n` items.

---

## Common Mistakes

- Confusing stack with queue.
- Removing from the wrong end.
- Calling `pop()` on an empty stack.
- Forgetting that the last item added is removed first.
- Thinking that stack search is always O(1).

---

## Real-World Applications

Stacks are used in:

- Undo features.
- Browser back buttons.
- Function call stack.
- Text editor history.
- Reversing data.
- Checking balanced parentheses.
- Expression evaluation.

---

## VisualDSA Integration

Use the VisualDSA Stack Visualizer to perform stack operations interactively.

Recommended interactions:

- Push an item.
- Pop the top item.
- Peek at the top item.
- Predict the next removed item.
- Trigger and explain underflow.

Suggested VisualDSA route:

```text
/visualdsa/stack-visualizer
```

Data that can be captured for analytics:

- Incorrect pop prediction.
- Underflow attempts.
- Number of completed stack operations.
- Time spent on tracing.
- Quiz score after demo use.

---

## Practice Activity

Create a simple undo simulation.

The program should:

- Add actions to a stack.
- Undo the most recent action.
- Display remaining actions.

Sample actions:

```text
Typed "Hello"
Bolded text
Changed font size
```

When undo is selected, the last action should be removed first.

---

## Quick Check

1. What principle does a stack follow?
2. What operation adds an item to a stack?
3. What operation removes the top item?
4. What does peek do?
5. What happens when you pop from an empty stack?

---

## Answer Key

1. Last In, First Out.
2. Push.
3. Pop.
4. Peek views the top item without removing it.
5. Stack underflow occurs.

---

## Summary

A stack stores items using the Last In, First Out principle. The main operations are push, pop, and peek. Stacks are useful for undo features, browser history, function calls, and many algorithmic problems.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 7: Linked Lists](./lesson-07-linked-lists.md)  
Next Lesson: [Lesson 9: Queues](./lesson-09-queues.md)
