# Lesson 11: Binary Search Trees

**Course:** Data Structures and Algorithms  
**Section:** Non-Linear Data Structures  
**Level:** Intermediate  
**Estimated Time:** 35 to 45 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/binary-search-tree-visualizer`

---

## Lesson Overview

A Binary Search Tree, or BST, is a type of binary tree where each node follows a specific ordering rule.

For every node:

- Values smaller than the node go to the left subtree.
- Values greater than the node go to the right subtree.

This rule makes searching, insertion, and retrieval more organized than a general tree.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a Binary Search Tree.
- Explain the BST ordering property.
- Insert values into a BST.
- Search for a value in a BST.
- Identify minimum and maximum values.
- Trace BST operations step by step.
- Recognize common BST mistakes.

---

## Key Terms

| Term | Meaning |
|---|---|
| Binary Tree | A tree where each node has at most two children |
| Binary Search Tree | A binary tree that follows the left-smaller and right-greater rule |
| Root | The top node of the tree |
| Left Child | The child node with a smaller value |
| Right Child | The child node with a greater value |
| Subtree | A smaller tree inside another tree |
| Search Path | The path followed while looking for a value |

---

## Simple Explanation

A BST helps organize values so that searching can be faster.

Example values:

```text
50, 30, 70, 20, 40, 60, 80
```

BST structure:

```text
        50
       /  \
     30    70
    / \    / \
   20 40  60 80
```

Values smaller than `50` are placed on the left.  
Values greater than `50` are placed on the right.

---

## BST Property

For every node in a Binary Search Tree:

```text
left subtree value < current node value < right subtree value
```

Example:

```text
        40
       /  \
     20    60
```

This is valid because:

- `20` is smaller than `40`.
- `60` is greater than `40`.

Invalid example:

```text
        40
       /  \
     50    60
```

This is not valid because `50` is greater than `40`, but it is placed on the left side.

---

## Python Node Structure

```python
class Node:
    def __init__(self, data):
        self.data = data
        self.left = None
        self.right = None
```

Each node stores:

- `data`
- `left`
- `right`

---

## Insert Operation

```python
class Node:
    def __init__(self, data):
        self.data = data
        self.left = None
        self.right = None


def insert(root, value):
    if root is None:
        return Node(value)

    if value < root.data:
        root.left = insert(root.left, value)
    elif value > root.data:
        root.right = insert(root.right, value)

    return root


root = None

values = [50, 30, 70, 20, 40, 60, 80]

for value in values:
    root = insert(root, value)
```

---

## Code Walkthrough

```python
if root is None:
    return Node(value)
```

If the current position is empty, create a new node.

```python
if value < root.data:
    root.left = insert(root.left, value)
```

If the value is smaller, move to the left subtree.

```python
elif value > root.data:
    root.right = insert(root.right, value)
```

If the value is greater, move to the right subtree.

```python
return root
```

Return the updated tree.

---

## Insertion Trace

Insert these values:

```text
50, 30, 70, 20, 40
```

| Step | Value Inserted | Action |
|---|---|---|
| 1 | 50 | Becomes root |
| 2 | 30 | Goes left of 50 |
| 3 | 70 | Goes right of 50 |
| 4 | 20 | Goes left of 50, then left of 30 |
| 5 | 40 | Goes left of 50, then right of 30 |

Final tree:

```text
        50
       /  \
     30    70
    / \
   20 40
```

---

## Search Operation

```python
def search(root, target):
    if root is None:
        return False

    if root.data == target:
        return True

    if target < root.data:
        return search(root.left, target)

    return search(root.right, target)


print(search(root, 60))
print(search(root, 90))
```

Output:

```text
True
False
```

---

## Search Trace

Search for `40`:

| Step | Current Node | Decision |
|---|---|---|
| 1 | 50 | 40 is smaller, go left |
| 2 | 30 | 40 is greater, go right |
| 3 | 40 | Found |

Search path:

```text
50 → 30 → 40
```

---

## Finding Minimum and Maximum

The minimum value is found by moving left until there is no more left child.

```python
def find_min(root):
    current = root

    while current.left is not None:
        current = current.left

    return current.data
```

The maximum value is found by moving right until there is no more right child.

```python
def find_max(root):
    current = root

    while current.right is not None:
        current = current.right

    return current.data
```

---

## Time and Space Complexity

| Operation | Average Case | Worst Case |
|---|---|---|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Find minimum | O(log n) | O(n) |
| Find maximum | O(log n) | O(n) |

The worst case happens when the tree becomes unbalanced.

Example of an unbalanced BST:

```text
10
  \
   20
     \
      30
        \
         40
```

This behaves like a linked list.

---

## Common Mistakes

- Placing smaller values on the right side.
- Placing greater values on the left side.
- Forgetting to return the root after insertion.
- Assuming every binary tree is a Binary Search Tree.
- Thinking BST operations are always O(log n).
- Ignoring unbalanced tree cases.

---

## Real-World Applications

Binary Search Trees can be used in:

- Searching sorted data.
- Dictionary-like structures.
- Range queries.
- Ordered data storage.
- Database indexing concepts.
- Auto-suggestion and ranking systems when combined with other structures.

---

## VisualDSA Integration

Use the VisualDSA Binary Search Tree Visualizer to insert and search values step by step.

Recommended interactions:

- Insert a list of values.
- Predict whether the next value goes left or right.
- Search for a target value.
- Identify minimum and maximum values.
- Compare balanced and unbalanced trees.

Suggested VisualDSA route:

```text
/visualdsa/binary-search-tree-visualizer
```

Data that can be captured for analytics:

- Wrong left or right placement.
- Search path mistakes.
- Time spent on insertion.
- Number of attempts before correct tree construction.
- Common confusion between binary tree and BST.

---

## Practice Activity

Create a Binary Search Tree from these values:

```text
45, 25, 65, 15, 35, 55, 75
```

Then answer:

1. What is the root?
2. What values are in the left subtree of the root?
3. What values are in the right subtree of the root?
4. What is the minimum value?
5. What is the maximum value?

---

## Quick Check

1. What rule does a Binary Search Tree follow?
2. Where should a smaller value be inserted?
3. Where should a greater value be inserted?
4. What is the average search complexity of a balanced BST?
5. Why can a BST become O(n) in the worst case?

---

## Answer Key

1. Smaller values go left, greater values go right.
2. A smaller value should be inserted in the left subtree.
3. A greater value should be inserted in the right subtree.
4. O(log n).
5. A BST becomes O(n) when it is unbalanced and behaves like a linked list.

---

## Summary

A Binary Search Tree organizes values using a clear ordering rule. Smaller values go left, and greater values go right. This structure can make search and insertion faster when the tree is balanced, but it can become slow if the tree is badly unbalanced.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 10: Trees](./lesson-10-trees.md)  
Next Lesson: [Lesson 12: Tree Traversals](./lesson-12-tree-traversals.md)
