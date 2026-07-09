# Lesson 12: Tree Traversals

**Course:** Data Structures and Algorithms  
**Section:** Non-Linear Data Structures  
**Level:** Intermediate  
**Estimated Time:** 35 to 45 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/tree-traversal-visualizer`

---

## Lesson Overview

Tree traversal means visiting each node in a tree in a specific order.

Since trees are not arranged in a single line, there are different ways to visit the nodes.

In this lesson, you will learn four common traversal methods:

- Preorder
- Inorder
- Postorder
- Level-order

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define tree traversal.
- Explain preorder, inorder, and postorder traversal.
- Explain level-order traversal.
- Trace traversal output from a tree diagram.
- Implement recursive tree traversals in Python.
- Identify which traversal is useful for a given task.

---

## Key Terms

| Term | Meaning |
|---|---|
| Traversal | Visiting each node in a tree |
| Preorder | Visit root, then left, then right |
| Inorder | Visit left, then root, then right |
| Postorder | Visit left, then right, then root |
| Level-order | Visit nodes level by level |
| Recursive Traversal | Traversal that uses function calls |
| Queue | A structure used in level-order traversal |

---

## Sample Tree

We will use this tree:

```text
        A
       / \
      B   C
     / \   \
    D   E   F
```

Nodes:

- Root: `A`
- Left subtree: `B, D, E`
- Right subtree: `C, F`

---

## Preorder Traversal

Preorder follows this order:

```text
Root → Left → Right
```

For the sample tree:

```text
A, B, D, E, C, F
```

Reason:

1. Visit `A`.
2. Go to left subtree `B`.
3. Visit `D`.
4. Visit `E`.
5. Go to right subtree `C`.
6. Visit `F`.

---

## Inorder Traversal

Inorder follows this order:

```text
Left → Root → Right
```

For the sample tree:

```text
D, B, E, A, C, F
```

In a Binary Search Tree, inorder traversal gives values in sorted order.

Example BST:

```text
        50
       /  \
     30    70
```

Inorder output:

```text
30, 50, 70
```

---

## Postorder Traversal

Postorder follows this order:

```text
Left → Right → Root
```

For the sample tree:

```text
D, E, B, F, C, A
```

Postorder is useful when deleting nodes because children are processed before the parent.

---

## Level-Order Traversal

Level-order visits nodes from top to bottom, left to right.

For the sample tree:

```text
A, B, C, D, E, F
```

This traversal uses a queue.

---

## Python Node Structure

```python
class Node:
    def __init__(self, data):
        self.data = data
        self.left = None
        self.right = None
```

---

## Building the Sample Tree

```python
root = Node("A")
root.left = Node("B")
root.right = Node("C")
root.left.left = Node("D")
root.left.right = Node("E")
root.right.right = Node("F")
```

This creates:

```text
        A
       / \
      B   C
     / \   \
    D   E   F
```

---

## Preorder Code

```python
def preorder(node):
    if node is None:
        return

    print(node.data)
    preorder(node.left)
    preorder(node.right)
```

Output:

```text
A
B
D
E
C
F
```

---

## Inorder Code

```python
def inorder(node):
    if node is None:
        return

    inorder(node.left)
    print(node.data)
    inorder(node.right)
```

Output:

```text
D
B
E
A
C
F
```

---

## Postorder Code

```python
def postorder(node):
    if node is None:
        return

    postorder(node.left)
    postorder(node.right)
    print(node.data)
```

Output:

```text
D
E
B
F
C
A
```

---

## Level-Order Code

```python
from collections import deque

def level_order(root):
    if root is None:
        return

    queue = deque()
    queue.append(root)

    while queue:
        current = queue.popleft()
        print(current.data)

        if current.left is not None:
            queue.append(current.left)

        if current.right is not None:
            queue.append(current.right)
```

Output:

```text
A
B
C
D
E
F
```

---

## Traversal Comparison

| Traversal | Order | Common Use |
|---|---|---|
| Preorder | Root, Left, Right | Copying a tree |
| Inorder | Left, Root, Right | Getting sorted values from a BST |
| Postorder | Left, Right, Root | Deleting or freeing a tree |
| Level-order | Level by level | Breadth-first tree processing |

---

## Step-by-Step Trace for Preorder

Tree:

```text
        A
       / \
      B   C
     / \   \
    D   E   F
```

| Step | Visit | Reason |
|---|---|---|
| 1 | A | Visit root |
| 2 | B | Move left |
| 3 | D | Move left again |
| 4 | E | Return to B, visit right |
| 5 | C | Return to A, visit right |
| 6 | F | Visit right child of C |

Output:

```text
A, B, D, E, C, F
```

---

## Time and Space Complexity

For all traversal methods:

| Measurement | Complexity |
|---|---|
| Time Complexity | O(n) |
| Space Complexity | O(h) for recursive traversals |
| Level-order Space | O(n) in the worst case |

`n` is the number of nodes.  
`h` is the height of the tree.

---

## Common Mistakes

- Confusing preorder and inorder.
- Forgetting that inorder on a BST gives sorted output.
- Visiting the root at the wrong time.
- Forgetting the base case in recursive traversal.
- Using a stack when a queue is needed for level-order traversal.
- Assuming all traversals produce the same result.

---

## Real-World Applications

Tree traversal is used in:

- File system scanning.
- Expression tree evaluation.
- HTML DOM processing.
- Compiler syntax trees.
- Searching hierarchical data.
- Deleting tree structures safely.
- Displaying tree menus.

---

## VisualDSA Integration

Use the VisualDSA Tree Traversal Visualizer to trace traversal order.

Recommended interactions:

- Select preorder, inorder, postorder, or level-order.
- Predict the next node to be visited.
- Highlight the current node.
- Compare traversal outputs.
- Replay the traversal step by step.

Suggested VisualDSA route:

```text
/visualdsa/tree-traversal-visualizer
```

Data that can be captured for analytics:

- Wrong next-node predictions.
- Confusion between traversal types.
- Time spent per traversal.
- Number of retries.
- Accuracy by traversal method.

---

## Practice Activity

Given this tree:

```text
        10
       /  \
      5    15
     / \     \
    2   7     20
```

Write the output for:

1. Preorder
2. Inorder
3. Postorder
4. Level-order

Reflection question:

Why does inorder traversal produce sorted output for a Binary Search Tree?

---

## Quick Check

1. What is tree traversal?
2. What is the order of preorder traversal?
3. What is the order of inorder traversal?
4. What traversal uses a queue?
5. Which traversal gives sorted output in a BST?

---

## Answer Key

1. Tree traversal means visiting each node in a tree.
2. Root, Left, Right.
3. Left, Root, Right.
4. Level-order traversal.
5. Inorder traversal.

---

## Summary

Tree traversal allows you to visit all nodes in a tree. Preorder visits the root first. Inorder visits the root between the left and right subtrees. Postorder visits the root last. Level-order visits nodes by level using a queue.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 11: Binary Search Trees](./lesson-11-binary-search-trees.md)  
Next Lesson: [Lesson 13: Heaps](./lesson-13-heaps.md)
