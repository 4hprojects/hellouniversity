# Lesson 7: Linked Lists

**Course:** Data Structures and Algorithms  
**Section:** Linear Data Structures  
**Level:** Beginner to Intermediate  
**Estimated Time:** 35 to 45 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/linked-list-visualizer`

---

## Lesson Overview

A linked list is a linear data structure made of nodes. Each node stores data and a reference to the next node.

Unlike arrays, linked lists do not require elements to be stored beside each other in memory. This makes insertion and deletion more flexible in some situations.

In this lesson, you will learn how linked lists work, how nodes are connected, and how to perform basic operations such as traversal and insertion.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a linked list.
- Explain the role of nodes and references.
- Identify the head of a linked list.
- Traverse a linked list.
- Insert a new node at the beginning.
- Compare arrays and linked lists.
- Recognize common linked list mistakes.

---

## Key Terms

| Term | Meaning |
|---|---|
| Node | A container that stores data and a reference |
| Head | The first node in a linked list |
| Data | The value stored inside a node |
| Reference | A link to another node |
| `None` | A value that means there is no next node |
| Traversal | Visiting each node one by one |

---

## Simple Explanation

A linked list is like a chain of connected nodes.

Each node has two parts:

1. The value or data.
2. A link to the next node.

Example:

```text
10 → 20 → 30 → None
```

The last node points to `None`, which means the list has ended.

---

## Basic Node Structure

In Python, we can represent a node using a class:

```python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None
```

This node stores:

- `data` for the value.
- `next` for the reference to the next node.

---

## Creating a Simple Linked List

```python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

first = Node(10)
second = Node(20)
third = Node(30)

first.next = second
second.next = third

current = first

while current is not None:
    print(current.data)
    current = current.next
```

Output:

```text
10
20
30
```

---

## Code Walkthrough

```python
first = Node(10)
second = Node(20)
third = Node(30)
```

This creates three separate nodes.

```python
first.next = second
second.next = third
```

This connects the nodes.

```python
current = first
```

This starts traversal at the first node.

```python
while current is not None:
```

The loop continues until the end of the list.

```python
print(current.data)
current = current.next
```

This prints the current node and moves to the next node.

---

## Step-by-Step Trace

| Step | Current Node | Output | Next Node |
|---|---|---|---|
| 1 | 10 | 10 | 20 |
| 2 | 20 | 20 | 30 |
| 3 | 30 | 30 | None |
| 4 | None | Stop | None |

---

## Linked List Class Example

```python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None


class LinkedList:
    def __init__(self):
        self.head = None

    def insert_at_beginning(self, data):
        new_node = Node(data)
        new_node.next = self.head
        self.head = new_node

    def display(self):
        current = self.head

        while current is not None:
            print(current.data)
            current = current.next


numbers = LinkedList()

numbers.insert_at_beginning(30)
numbers.insert_at_beginning(20)
numbers.insert_at_beginning(10)

numbers.display()
```

Output:

```text
10
20
30
```

---

## How Insertion at the Beginning Works

Before insertion:

```text
20 → 30 → None
```

Insert `10`:

1. Create a new node with value `10`.
2. Point the new node to the current head.
3. Update the head to the new node.

After insertion:

```text
10 → 20 → 30 → None
```

---

## Arrays vs Linked Lists

| Feature | Array | Linked List |
|---|---|---|
| Memory layout | Stored in sequence | Nodes can be scattered |
| Access by index | Fast | Slow |
| Insertion at beginning | May require shifting | Easier |
| Deletion | May require shifting | Easier if node is known |
| Extra memory | Less | More because of references |

---

## Time and Space Complexity

For a singly linked list:

| Operation | Time Complexity |
|---|---|
| Access by position | O(n) |
| Search | O(n) |
| Insert at beginning | O(1) |
| Delete at beginning | O(1) |
| Traverse all nodes | O(n) |

Space complexity:

```text
O(n)
```

Each node stores data and a reference.

---

## Common Mistakes

- Forgetting to update the head.
- Losing the reference to the next node.
- Creating a node but not linking it.
- Traversing without moving to `current.next`.
- Confusing a node with the entire linked list.
- Forgetting that linked lists do not support direct indexing like arrays.

---

## Real-World Applications

Linked lists can be used in:

- Undo and redo features.
- Music playlists.
- Browser history.
- Memory management.
- Implementing stacks and queues.
- Lists with frequent insertion and deletion.

---

## VisualDSA Integration

Use the VisualDSA Linked List Visualizer to create, connect, insert, and delete nodes.

Recommended interactions:

- Add a node at the beginning.
- Add a node at the end.
- Traverse the list.
- Delete a node.
- Predict which node becomes the new head.

Suggested VisualDSA route:

```text
/visualdsa/linked-list-visualizer
```

Data that can be captured for analytics:

- Incorrect head updates.
- Missed pointer changes.
- Traversal mistakes.
- Time spent on insertion tasks.
- Number of attempts before correct completion.

---

## Practice Activity

Create a linked list that stores student names.

The program should:

- Insert names at the beginning.
- Display all names.
- Stop when the list reaches at least five names.

Sample output:

```text
Henson
Maria
Juan
Ana
Carlo
```

Reflection question:

Why does inserting at the beginning reverse the order of input?

---

## Quick Check

1. What are the two main parts of a node?
2. What is the head of a linked list?
3. What does `None` mean at the end of a linked list?
4. What is the time complexity of traversing all nodes?
5. Why is insertion at the beginning O(1)?

---

## Answer Key

1. Data and a reference to the next node.
2. The head is the first node in the list.
3. It means there is no next node.
4. O(n).
5. Because only the new node and head reference need to be updated.

---

## Summary

A linked list stores data using connected nodes. Each node points to the next node. Linked lists are useful when insertion and deletion are frequent, but they are slower than arrays when accessing values by position.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 6: Recursion](./lesson-06-recursion.md)  
Next Lesson: [Lesson 8: Stacks](./lesson-08-stacks.md)
