# Lesson 10: Trees

**Course:** Data Structures and Algorithms  
**Section:** Non-Linear Data Structures  
**Level:** Beginner to Intermediate  
**Estimated Time:** 35 to 45 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/tree-visualizer`

---

## Lesson Overview

A tree is a non-linear data structure made of connected nodes.

Unlike arrays, stacks, and queues, a tree does not store data in a simple sequence. Instead, it organizes data in a hierarchy.

Trees are useful for representing file systems, organization charts, family trees, decision processes, and searchable data.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a tree data structure.
- Identify the root, parent, child, leaf, and edge.
- Explain how trees represent hierarchical data.
- Differentiate linear and non-linear structures.
- Create a basic tree node in Python.
- Recognize common tree applications.

---

## Key Terms

| Term | Meaning |
|---|---|
| Tree | A hierarchical data structure made of nodes |
| Root | The topmost node |
| Parent | A node that has child nodes |
| Child | A node connected below another node |
| Leaf | A node with no children |
| Edge | A connection between two nodes |
| Level | The position of a node from the root |
| Height | The longest path from a node to a leaf |
| Subtree | A smaller tree inside a larger tree |

---

## Simple Explanation

A tree is like a folder structure in a computer.

Example:

```text
School
├── IT Department
│   ├── DSA
│   └── Web Systems
└── Business Department
    ├── Accounting
    └── Marketing
```

`School` is the root.

`IT Department` and `Business Department` are children of `School`.

`DSA`, `Web Systems`, `Accounting`, and `Marketing` are leaf nodes because they have no children.

---

## Tree Diagram

```text
        A
       / \
      B   C
     / \   \
    D   E   F
```

In this tree:

- `A` is the root.
- `B` and `C` are children of `A`.
- `A` is the parent of `B` and `C`.
- `D`, `E`, and `F` are leaf nodes.
- The lines between nodes are edges.

---

## Linear vs Non-Linear Structures

| Structure Type | Example | Arrangement |
|---|---|---|
| Linear | Array, Stack, Queue | One element after another |
| Non-Linear | Tree, Graph | Connected in hierarchical or network form |

A tree is non-linear because one node can connect to multiple child nodes.

---

## Basic Tree Node in Python

```python
class TreeNode:
    def __init__(self, data):
        self.data = data
        self.children = []

    def add_child(self, child):
        self.children.append(child)


root = TreeNode("School")

it_department = TreeNode("IT Department")
business_department = TreeNode("Business Department")

root.add_child(it_department)
root.add_child(business_department)

it_department.add_child(TreeNode("DSA"))
it_department.add_child(TreeNode("Web Systems"))

business_department.add_child(TreeNode("Accounting"))
business_department.add_child(TreeNode("Marketing"))
```

---

## Code Walkthrough

```python
class TreeNode:
```

This defines a class for a tree node.

```python
self.data = data
```

This stores the value of the node.

```python
self.children = []
```

This stores the child nodes.

```python
def add_child(self, child):
    self.children.append(child)
```

This adds a child to the current node.

```python
root = TreeNode("School")
```

This creates the root node.

---

## Displaying a Tree

```python
def display_tree(node, level=0):
    print("  " * level + str(node.data))

    for child in node.children:
        display_tree(child, level + 1)


display_tree(root)
```

Output:

```text
School
  IT Department
    DSA
    Web Systems
  Business Department
    Accounting
    Marketing
```

---

## Step-by-Step Trace

| Step | Node Visited | Level |
|---|---|---|
| 1 | School | 0 |
| 2 | IT Department | 1 |
| 3 | DSA | 2 |
| 4 | Web Systems | 2 |
| 5 | Business Department | 1 |
| 6 | Accounting | 2 |
| 7 | Marketing | 2 |

This display function uses recursion to visit each child node.

---

## Binary Tree Preview

A binary tree is a special type of tree where each node can have at most two children.

Example:

```text
        50
       /  \
      30   70
```

Each node has:

- Left child.
- Right child.

Binary trees will be discussed in more detail in the next lessons.

---

## Time and Space Complexity

For visiting every node in a tree:

| Operation | Complexity |
|---|---|
| Visit all nodes | O(n) |
| Search in a general tree | O(n) |
| Add child to a node | O(1) average when the node is already known |

Space complexity:

```text
O(n)
```

The tree stores `n` nodes.

Recursive traversal also uses call stack space.

---

## Common Mistakes

- Confusing trees with graphs.
- Thinking all trees are binary trees.
- Forgetting that a tree has only one root.
- Calling every node a leaf.
- Forgetting that recursion is often used in tree operations.
- Not understanding parent-child relationships.

---

## Real-World Applications

Trees are used in:

- File systems.
- Organization charts.
- HTML DOM structure.
- Decision trees.
- Database indexing.
- Syntax trees in compilers.
- Search trees.
- Artificial intelligence search problems.

---

## VisualDSA Integration

Use the VisualDSA Tree Visualizer to explore parent-child relationships and tree traversal.

Recommended interactions:

- Create a root node.
- Add child nodes.
- Identify leaves.
- Highlight parent-child relationships.
- Trace a recursive display process.

Suggested VisualDSA route:

```text
/visualdsa/tree-visualizer
```

Data that can be captured for analytics:

- Incorrect root identification.
- Leaf node confusion.
- Parent-child relationship mistakes.
- Traversal prediction errors.
- Time spent building tree structures.

---

## Practice Activity

Draw or create a tree that represents a school department structure.

Your tree should include:

- One root node.
- At least two department nodes.
- At least two subject nodes under each department.
- At least one leaf node explanation.

Example root:

```text
University
```

Reflection question:

Why is a tree better than a list for representing departments and subjects?

---

## Quick Check

1. What is the root of a tree?
2. What is a leaf node?
3. What is an edge?
4. Is a tree linear or non-linear?
5. What real-world example can be represented using a tree?

---

## Answer Key

1. The root is the topmost node.
2. A leaf node is a node with no children.
3. An edge is a connection between two nodes.
4. A tree is non-linear.
5. Examples include file systems, family trees, organization charts, and HTML DOM.

---

## Summary

A tree is a hierarchical, non-linear data structure made of connected nodes. It begins with a root and branches into children. Trees are useful for representing relationships where data has levels, categories, or parent-child connections.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 9: Queues](./lesson-09-queues.md)  
Next Lesson: [Lesson 11: Binary Search Trees](./lesson-11-binary-search-trees.md)
