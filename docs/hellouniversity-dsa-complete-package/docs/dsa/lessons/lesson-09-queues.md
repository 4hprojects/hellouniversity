# Lesson 9: Queues

**Course:** Data Structures and Algorithms  
**Section:** Linear Data Structures  
**Level:** Beginner  
**Estimated Time:** 25 to 35 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/queue-visualizer`

---

## Lesson Overview

A queue is a linear data structure that follows the First In, First Out principle.

This means the first item added to the queue is the first item removed.

Queues are common in real-world systems such as enrollment lines, ticketing systems, printer queues, and customer service systems.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a queue.
- Explain the First In, First Out principle.
- Perform enqueue and dequeue operations.
- Identify the front and rear of a queue.
- Trace queue operations.
- Implement a queue in Python.
- Compare stacks and queues.

---

## Key Terms

| Term | Meaning |
|---|---|
| Queue | A data structure that follows First In, First Out |
| FIFO | First In, First Out |
| Enqueue | Add an item to the rear |
| Dequeue | Remove an item from the front |
| Front | The item that will be removed next |
| Rear | The most recently added item |
| Underflow | Removing from an empty queue |
| Overflow | Adding beyond capacity in a fixed-size queue |

---

## Simple Explanation

Think of a queue as a line of students waiting for enrollment.

The student who arrives first should be served first.

New students join at the back of the line. The next student served comes from the front.

---

## Queue Example

```text
enqueue("Ana")
enqueue("Ben")
enqueue("Carlo")
dequeue()
```

Trace:

| Step | Operation | Queue Content |
|---|---|---|
| 1 | enqueue("Ana") | [Ana] |
| 2 | enqueue("Ben") | [Ana, Ben] |
| 3 | enqueue("Carlo") | [Ana, Ben, Carlo] |
| 4 | dequeue() | [Ben, Carlo] |

The removed value is `Ana` because it was added first.

---

## Python Implementation

```python
queue = []

queue.append("Ana")
queue.append("Ben")
queue.append("Carlo")

print("Queue:", queue)

served_student = queue.pop(0)

print("Served:", served_student)
print("Updated Queue:", queue)
```

Output:

```text
Queue: ['Ana', 'Ben', 'Carlo']
Served: Ana
Updated Queue: ['Ben', 'Carlo']
```

---

## Code Walkthrough

```python
queue = []
```

This creates an empty queue.

```python
queue.append("Ana")
```

This adds an item to the rear of the queue.

```python
queue.pop(0)
```

This removes the first item in the queue.

---

## Better Queue Implementation Using deque

For larger programs, Python’s `deque` is better for queues.

```python
from collections import deque

queue = deque()

queue.append("Ana")
queue.append("Ben")
queue.append("Carlo")

print("Queue:", queue)

served_student = queue.popleft()

print("Served:", served_student)
print("Updated Queue:", queue)
```

`popleft()` removes the item from the front more efficiently than `pop(0)`.

---

## Queue Class Example

```python
from collections import deque

class Queue:
    def __init__(self):
        self.items = deque()

    def enqueue(self, value):
        self.items.append(value)

    def dequeue(self):
        if self.is_empty():
            return "Queue underflow"
        return self.items.popleft()

    def front(self):
        if self.is_empty():
            return "Queue is empty"
        return self.items[0]

    def is_empty(self):
        return len(self.items) == 0

    def display(self):
        print(list(self.items))


queue = Queue()

queue.enqueue("Student 1")
queue.enqueue("Student 2")
queue.enqueue("Student 3")

queue.display()
print("Next:", queue.front())
print("Served:", queue.dequeue())
queue.display()
```

---

## Stack vs Queue

| Feature | Stack | Queue |
|---|---|---|
| Principle | Last In, First Out | First In, First Out |
| Add operation | Push | Enqueue |
| Remove operation | Pop | Dequeue |
| Removal point | Top | Front |
| Example | Undo feature | Waiting line |

---

## Time and Space Complexity

Using `deque`:

| Operation | Time Complexity |
|---|---|
| Enqueue | O(1) |
| Dequeue | O(1) |
| Front | O(1) |
| Search | O(n) |

Space complexity:

```text
O(n)
```

The queue stores `n` items.

---

## Common Mistakes

- Confusing queue with stack.
- Removing from the rear instead of the front.
- Using `pop()` instead of `pop(0)` or `popleft()`.
- Forgetting to check if the queue is empty.
- Assuming all list-based queue operations are efficient.

---

## Real-World Applications

Queues are used in:

- Enrollment systems.
- Printer queues.
- Customer service lines.
- Ticket booking systems.
- Task scheduling.
- Breadth-first search.
- Message processing.

---

## VisualDSA Integration

Use the VisualDSA Queue Visualizer to perform queue operations interactively.

Recommended interactions:

- Enqueue a student.
- Dequeue the next student.
- Identify the front and rear.
- Predict who will be served next.
- Compare queue behavior with stack behavior.

Suggested VisualDSA route:

```text
/visualdsa/queue-visualizer
```

Data that can be captured for analytics:

- Incorrect next-student prediction.
- Front and rear confusion.
- Underflow attempts.
- Completion time.
- Queue operation accuracy.

---

## Practice Activity

Create a queue-based enrollment simulation.

The program should:

- Add a student to the queue.
- Process the next student.
- Show all waiting students.
- Check if the queue is empty.
- Exit the program.

Sample menu:

```text
1. Add student
2. Process student
3. View queue
4. Exit
```

Reflection question:

Why is a queue better than a stack for enrollment processing?

---

## Quick Check

1. What principle does a queue follow?
2. What operation adds an item to the queue?
3. What operation removes an item from the queue?
4. Where is a new item added?
5. Where is an item removed?

---

## Answer Key

1. First In, First Out.
2. Enqueue.
3. Dequeue.
4. At the rear.
5. From the front.

---

## Summary

A queue stores items using the First In, First Out principle. The first item added is the first item removed. Queues are useful for waiting lines, task scheduling, message processing, and breadth-first search.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 8: Stacks](./lesson-08-stacks.md)  
Next Lesson: [Lesson 10: Trees](./lesson-10-trees.md)
