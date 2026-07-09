# HelloUniversity DSA URL Map and Navigation

**Package:** HelloUniversity DSA Complete Content Package  
**Purpose:** Official route and navigation guide for Codex or Claude implementation  
**Recommended Architecture:** DSA Lessons and VisualDSA should be separate but tightly hyperlinked.

---

## Core Website Structure

```text
HelloUniversity
│
├── /data-structures-and-algorithms
│   ├── /introduction
│   ├── /algorithmic-thinking
│   ├── /time-and-space-complexity
│   ├── /arrays
│   ├── /strings
│   ├── /recursion
│   ├── /linked-lists
│   ├── /stacks
│   ├── /queues
│   ├── /trees
│   ├── ...
│   └── /projects
│
└── /visualdsa
    ├── /array-visualizer
    ├── /stack-visualizer
    ├── /queue-visualizer
    ├── /sorting-visualizer
    ├── /bst-visualizer
    ├── /graph-traversal-visualizer
    └── /instructor-dashboard
```

---

## Learning Flow

```text
Read the DSA lesson
→ Try the VisualDSA demo
→ Answer the quick check
→ Complete the activity or project
→ Instructor reviews analytics
```

---

## Main Course Route

| Page | Route | Source File |
|---|---|---|
| DSA Course Landing Page | `/data-structures-and-algorithms` | `docs/dsa/00-master-content-plan.md` |

---

## Lesson Routes

| Lesson | Route | Source File | VisualDSA Route |
|---|---|---|---|
| Lesson 1: Introduction to DSA | `/data-structures-and-algorithms/introduction` | `docs/dsa/lessons/lesson-01-introduction-to-dsa.md` | `/visualdsa/dsa-overview` |
| Lesson 2: Algorithmic Thinking | `/data-structures-and-algorithms/algorithmic-thinking` | `docs/dsa/lessons/lesson-02-algorithmic-thinking.md` | `/visualdsa/algorithmic-thinking-demo` |
| Lesson 3: Time and Space Complexity | `/data-structures-and-algorithms/time-and-space-complexity` | `docs/dsa/lessons/lesson-03-time-and-space-complexity.md` | `/visualdsa/complexity-comparison` |
| Lesson 4: Arrays | `/data-structures-and-algorithms/arrays` | `docs/dsa/lessons/lesson-04-arrays.md` | `/visualdsa/array-visualizer` |
| Lesson 5: Strings | `/data-structures-and-algorithms/strings` | `docs/dsa/lessons/lesson-05-strings.md` | `/visualdsa/string-visualizer` |
| Lesson 6: Recursion | `/data-structures-and-algorithms/recursion` | `docs/dsa/lessons/lesson-06-recursion.md` | `/visualdsa/recursion-call-stack-visualizer` |
| Lesson 7: Linked Lists | `/data-structures-and-algorithms/linked-lists` | `docs/dsa/lessons/lesson-07-linked-lists.md` | `/visualdsa/linked-list-visualizer` |
| Lesson 8: Stacks | `/data-structures-and-algorithms/stacks` | `docs/dsa/lessons/lesson-08-stacks.md` | `/visualdsa/stack-visualizer` |
| Lesson 9: Queues | `/data-structures-and-algorithms/queues` | `docs/dsa/lessons/lesson-09-queues.md` | `/visualdsa/queue-visualizer` |
| Lesson 10: Trees | `/data-structures-and-algorithms/trees` | `docs/dsa/lessons/lesson-10-trees.md` | `/visualdsa/tree-visualizer` |
| Lesson 11: Binary Search Trees | `/data-structures-and-algorithms/binary-search-trees` | `docs/dsa/lessons/lesson-11-binary-search-trees.md` | `/visualdsa/binary-search-tree-visualizer` |
| Lesson 12: Tree Traversals | `/data-structures-and-algorithms/tree-traversals` | `docs/dsa/lessons/lesson-12-tree-traversals.md` | `/visualdsa/tree-traversal-visualizer` |
| Lesson 13: Heaps | `/data-structures-and-algorithms/heaps` | `docs/dsa/lessons/lesson-13-heaps.md` | `/visualdsa/heap-visualizer` |
| Lesson 14: Graphs | `/data-structures-and-algorithms/graphs` | `docs/dsa/lessons/lesson-14-graphs.md` | `/visualdsa/graph-builder` |
| Lesson 15: Graph Traversals | `/data-structures-and-algorithms/graph-traversals` | `docs/dsa/lessons/lesson-15-graph-traversals.md` | `/visualdsa/graph-traversal-visualizer` |
| Lesson 16: Linear Search | `/data-structures-and-algorithms/linear-search` | `docs/dsa/lessons/lesson-16-linear-search.md` | `/visualdsa/linear-search-visualizer` |
| Lesson 17: Binary Search | `/data-structures-and-algorithms/binary-search` | `docs/dsa/lessons/lesson-17-binary-search.md` | `/visualdsa/binary-search-visualizer` |
| Lesson 18: Bubble Sort | `/data-structures-and-algorithms/bubble-sort` | `docs/dsa/lessons/lesson-18-bubble-sort.md` | `/visualdsa/bubble-sort-visualizer` |
| Lesson 19: Selection Sort | `/data-structures-and-algorithms/selection-sort` | `docs/dsa/lessons/lesson-19-selection-sort.md` | `/visualdsa/selection-sort-visualizer` |
| Lesson 20: Insertion Sort | `/data-structures-and-algorithms/insertion-sort` | `docs/dsa/lessons/lesson-20-insertion-sort.md` | `/visualdsa/insertion-sort-visualizer` |
| Lesson 21: Merge Sort | `/data-structures-and-algorithms/merge-sort` | `docs/dsa/lessons/lesson-21-merge-sort.md` | `/visualdsa/merge-sort-visualizer` |
| Lesson 22: Quick Sort | `/data-structures-and-algorithms/quick-sort` | `docs/dsa/lessons/lesson-22-quick-sort.md` | `/visualdsa/quick-sort-visualizer` |
| Lesson 23: Brute Force Algorithms | `/data-structures-and-algorithms/brute-force-algorithms` | `docs/dsa/lessons/lesson-23-brute-force-algorithms.md` | `/visualdsa/brute-force-tracing` |
| Lesson 24: Divide and Conquer | `/data-structures-and-algorithms/divide-and-conquer` | `docs/dsa/lessons/lesson-24-divide-and-conquer.md` | `/visualdsa/divide-and-conquer-flow` |
| Lesson 25: Greedy Algorithms | `/data-structures-and-algorithms/greedy-algorithms` | `docs/dsa/lessons/lesson-25-greedy-algorithms.md` | `/visualdsa/greedy-choice-visualizer` |
| Lesson 26: Dynamic Programming Basics | `/data-structures-and-algorithms/dynamic-programming` | `docs/dsa/lessons/lesson-26-dynamic-programming.md` | `/visualdsa/dynamic-programming-visualizer` |
| Lesson 27: Hash Tables | `/data-structures-and-algorithms/hash-tables` | `docs/dsa/lessons/lesson-27-hash-tables.md` | `/visualdsa/hash-table-visualizer` |
| Lesson 28: Sets and Maps | `/data-structures-and-algorithms/sets-and-maps` | `docs/dsa/lessons/lesson-28-sets-and-maps.md` | `/visualdsa/sets-and-maps-visualizer` |
| Lesson 29: Tries | `/data-structures-and-algorithms/tries` | `docs/dsa/lessons/lesson-29-tries.md` | `/visualdsa/trie-visualizer` |
| Lesson 30: DSA Review and Integration | `/data-structures-and-algorithms/dsa-review-and-integration` | `docs/dsa/lessons/lesson-30-dsa-review-and-integration.md` | `/visualdsa/dsa-review-dashboard` |

---

## Project Routes

| Project | Route | Source File | VisualDSA Route |
|---|---|---|---|
| Student Grade Record System | `/data-structures-and-algorithms/projects/student-grade-record-system` | `docs/dsa/projects/project-01-student-grade-record-system.md` | `/visualdsa/student-grade-record-system` |
| Queue-Based Enrollment System | `/data-structures-and-algorithms/projects/enrollment-queue-system` | `docs/dsa/projects/project-02-queue-based-enrollment-system.md` | `/visualdsa/enrollment-queue-system` |
| Stack-Based Undo Feature | `/data-structures-and-algorithms/projects/stack-based-undo-feature` | `docs/dsa/projects/project-03-stack-based-undo-feature.md` | `/visualdsa/stack-undo-feature` |
| Graph-Based Campus Navigation | `/data-structures-and-algorithms/projects/campus-navigation-graph` | `docs/dsa/projects/project-04-graph-based-campus-navigation.md` | `/visualdsa/campus-navigation-graph` |
| Sorting Algorithm Visual Comparison | `/data-structures-and-algorithms/projects/sorting-algorithm-comparison` | `docs/dsa/projects/project-05-sorting-algorithm-visual-comparison.md` | `/visualdsa/sorting-comparison-lab` |

---

## Sidebar Navigation Order

Use this order in the DSA sidebar:

1. Course Overview
2. Foundations
   - Introduction to DSA
   - Algorithmic Thinking
   - Time and Space Complexity
   - Recursion
3. Linear Data Structures
   - Arrays
   - Strings
   - Linked Lists
   - Stacks
   - Queues
4. Non-Linear Data Structures
   - Trees
   - Binary Search Trees
   - Tree Traversals
   - Heaps
   - Graphs
   - Graph Traversals
5. Searching and Sorting
   - Linear Search
   - Binary Search
   - Bubble Sort
   - Selection Sort
   - Insertion Sort
   - Merge Sort
   - Quick Sort
6. Algorithm Design
   - Brute Force Algorithms
   - Divide and Conquer
   - Greedy Algorithms
   - Dynamic Programming Basics
7. Hashing and Advanced Structures
   - Hash Tables
   - Sets and Maps
   - Tries
8. Review
   - DSA Review and Integration
9. Applied Projects
   - Student Grade Record System
   - Queue-Based Enrollment System
   - Stack-Based Undo Feature
   - Graph-Based Campus Navigation
   - Sorting Algorithm Visual Comparison

---

## Breadcrumb Pattern

Use this pattern for lessons:

```text
Home > Data Structures and Algorithms > Section Name > Lesson Title
```

Example:

```text
Home > Data Structures and Algorithms > Linear Data Structures > Stacks
```

Use this pattern for projects:

```text
Home > Data Structures and Algorithms > Applied Projects > Project Title
```

---

## Internal Linking Rules

Each lesson page must include:

- Previous lesson link
- Next lesson link
- Related VisualDSA demo link
- Related practice or project link when available

Each VisualDSA page must include:

- Related DSA lesson link
- Learning objective
- Demo instructions
- Assessment or quick check
- Analytics events to capture

---

## VisualDSA Analytics Events

Recommended event names:

```text
demo_started
step_completed
prediction_submitted
prediction_correct
prediction_incorrect
operation_completed
operation_error
quiz_started
quiz_completed
lesson_completed
project_completed
```

Recommended analytics fields:

```text
user_id
lesson_slug
visualdsa_slug
event_type
attempt_number
is_correct
time_spent_seconds
mistake_type
created_at
```
