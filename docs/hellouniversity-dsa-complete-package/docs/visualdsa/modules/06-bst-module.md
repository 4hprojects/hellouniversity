---
status: active
last_updated: 2026-07-11
module: bst
prototype_priority: 6
---

# VisualDSA Module Specification: Binary Search Tree

## Module identity

```text
Module key: bst
Route: /visualdsa/binary-search-tree-visualizer
Related lessons:
- /data-structures-and-algorithms/binary-search-trees
- /data-structures-and-algorithms/tree-traversals

Initial version: 1.0.0
```

## Learning objectives

The student should be able to:

1. Explain the Binary Search Tree ordering rule.
2. Trace search decisions.
3. Insert a value at the correct position.
4. Identify parent, child, root, leaf, depth, and height.
5. Perform preorder, inorder, and postorder traversals.
6. Explain why inorder traversal produces sorted values for a valid BST.
7. Recognize invalid placements.
8. Distinguish tree shape from insertion order.

## Initial scope

Include:

- Search
- Insertion
- Duplicate-value policy
- Preorder
- Inorder
- Postorder
- Basic terminology

Optional if time permits:

- Level-order traversal

Defer:

- Deletion
- AVL balancing
- Red-black trees
- Self-balancing behavior
- Full memory-pointer implementation

## Input rules

```text
Element type: integer
Minimum nodes: 1
Maximum nodes: 15
Allowed range: -99 to 999
Duplicate policy: reject duplicates in version 1
```

The duplicate policy must be explicit in the interface and validator.

## Visual representation

Show:

- Root
- Nodes and edges
- Current node
- Comparison path
- Candidate insertion location
- Depth labels when enabled
- Traversal output queue
- Optional array of insertion order

Example:

```text
        20
       /  \
     10    30
    /  \     \
   5   15     40
```

## Layout rules

- Keep parents above children.
- Avoid edge crossings for valid trees.
- Recalculate positions after insertion.
- Preserve mental continuity by minimizing unnecessary movement.
- Use SVG groups for nodes and edges.
- Give every node a stable ID.

## BST ordering rule

Version 1:

```text
left subtree values < node value
right subtree values > node value
duplicates are rejected
```

## Guided insertion scenario

Insertion order:

```text
20, 10, 30, 5, 15
```

Insert:

```text
12
```

Decision path:

```text
12 < 20 → left
12 > 10 → right
12 < 15 → left
insert as left child of 15
```

The visualization must show each comparison before moving to the next node.

## Guided search scenario

Search for:

```text
15
```

Path:

```text
15 < 20
15 > 10
15 = 15
found
```

## Pseudocode

### Search

```text
BST_SEARCH(node, target)
1. current ← node
2. while current is not null
3.     if target = current.value
4.         return current
5.     else if target < current.value
6.         current ← current.left
7.     else
8.         current ← current.right
9. return NOT_FOUND
```

### Insert

```text
BST_INSERT(root, value)
1. if root is null
2.     return new node(value)
3. current ← root
4. loop
5.     if value = current.value
6.         report duplicate
7.     else if value < current.value
8.         if current.left is null
9.             current.left ← new node(value)
10.            stop
11.        current ← current.left
12.    else
13.        if current.right is null
14.            current.right ← new node(value)
15.            stop
16.        current ← current.right
```

### Traversals

```text
PREORDER(node)
1. if node is null, return
2. visit node
3. PREORDER(node.left)
4. PREORDER(node.right)
```

```text
INORDER(node)
1. if node is null, return
2. INORDER(node.left)
3. visit node
4. INORDER(node.right)
```

```text
POSTORDER(node)
1. if node is null, return
2. POSTORDER(node.left)
3. POSTORDER(node.right)
4. visit node
```

## Practice task types

### Choose direction

```text
Insert 12.
At node 20, should you move left or right?
```

### Select parent

Student selects the final parent node.

### Place node

Student chooses the correct empty child position.

### Search path

Student selects the next node.

### Traversal prediction

Student selects the next visited node.

### Construct BST

Student inserts a short sequence.

### Diagnose invalid placement

```text
Value 8 was placed in the right subtree of 10.
Which rule was violated?
```

## Assessment templates

### `bst-insert-one-v1`

- Generated valid BST
- Generated non-duplicate value
- Student completes all comparison decisions
- Student chooses final parent and side

### `bst-search-path-v1`

- Target may be present or absent
- Student follows the exact search path

### `bst-traversal-v1`

- Generated tree
- Assignment specifies preorder, inorder, or postorder
- Student submits node sequence

### `bst-construct-v1`

- Small insertion sequence
- Student constructs final tree
- Score includes intermediate decisions

## Scoring

### Insertion

| Component | Weight |
|---|---:|
| Correct comparison at each node | 30% |
| Correct left or right decisions | 30% |
| Correct final parent | 20% |
| Correct child side | 10% |
| Correct final tree | 10% |

### Traversal

| Component | Weight |
|---|---:|
| Correct visit order | 70% |
| Correct recursive branch order | 20% |
| Complete sequence | 10% |

## Misconception codes

```text
BT01 Incorrect left or right choice
BT02 Inserted under the wrong parent
BT03 Broke the tree connection
BT04 Incorrect duplicate handling
BT05 Incorrect traversal order
BT06 Confused depth with height
BT07 Compared with the root after moving to a child
BT08 Ignored subtree constraints
BT09 Treated inorder as root-left-right
BT10 Stopped search before reaching null
```

## Required events

```text
module_opened
mode_selected
tree_input_submitted
comparison_submitted
direction_selected
node_selected
parent_selected
child_side_selected
node_inserted
duplicate_identified
search_completed
traversal_type_selected
traversal_node_submitted
action_correct
action_incorrect
hint_requested
step_completed
session_completed
assessment_submitted
```

## Counters

- Comparisons
- Nodes visited
- Current depth
- Tree height
- Recursive calls during traversal

## Complexity feedback

Explain that BST performance depends on shape.

```text
Balanced-like tree:
search and insert often O(log n)

Highly skewed tree:
search and insert can degrade to O(n)
```

Do not claim that all BST operations are always O(log n).

## Edge cases

- Empty tree insertion
- Single-node tree
- Insert as left leaf
- Insert as right leaf
- Search root
- Search missing value
- Reject duplicate
- Left-skewed tree
- Right-skewed tree
- Negative values
- Traversal of one node
- Inorder result verification

## Accessibility

- Every node must expose value, role, depth, and state.
- Edges need textual relationship alternatives.
- Node navigation must work by keyboard.
- Direction choices must have buttons, not only drag gestures.
- Traversal output must be announced as it changes.
- Reduced-motion mode must update node positions discretely.
- A textual tree representation should be available.

## Acceptance criteria

```text
[ ] BST ordering rule is enforced
[ ] Duplicate policy is explicit
[ ] Search and insertion paths are correct
[ ] Parent and child relationships remain valid
[ ] Preorder, inorder, and postorder are correct
[ ] Inorder produces sorted values for valid unique-key BSTs
[ ] BT misconception codes are emitted
[ ] Official validation is server-side
[ ] Skewed-tree complexity is explained
[ ] Keyboard, mobile, and reduced-motion modes work
[ ] Edge-case tests pass
```
