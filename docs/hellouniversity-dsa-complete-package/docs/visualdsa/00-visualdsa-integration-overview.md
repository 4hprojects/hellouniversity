# VisualDSA Integration Overview

**Purpose:** Define the role of VisualDSA inside the HelloUniversity DSA learning flow.

---

## Positioning

VisualDSA should be separate from the DSA lesson pages but tightly connected through internal links.

```text
DSA Lessons = teaching content
VisualDSA = interactive visualization, formative assessment, and instructor analytics
```

This keeps HelloUniversity clean for SEO and reading, while VisualDSA remains strong as the capstone and research system.

---

## Student Learning Flow

```text
Read lesson
→ Try interactive demo
→ Predict next step
→ Perform operation
→ Receive feedback
→ Complete quick check
```

---

## Instructor Analytics Flow

```text
Student uses VisualDSA
→ VisualDSA records attempts, mistakes, time, and scores
→ Instructor dashboard summarizes class progress
→ Instructor identifies topics needing intervention
```

---

## Recommended VisualDSA MVP Demos

1. Array Visualizer
2. Stack Visualizer
3. Queue Visualizer
4. Linked List Visualizer
5. Recursion Call Stack Visualizer
6. Binary Search Visualizer
7. Bubble Sort Visualizer
8. Binary Search Tree Visualizer
9. Graph Traversal Visualizer
10. DSA Review Dashboard

---

## VisualDSA Page Format

Each VisualDSA page should include:

1. Demo title
2. Related DSA lesson link
3. Learning objective
4. Instructions
5. Interactive controls
6. Prediction prompt
7. Feedback display
8. Attempt tracking
9. Completion status
10. Instructor analytics events

---

## Example

```text
VisualDSA Page: Stack Visualizer
Route: /visualdsa/stack-visualizer
Related Lesson: /data-structures-and-algorithms/stacks
Student Actions:
- Push
- Pop
- Peek
- Predict next removed item
Analytics:
- wrong_pop_prediction
- underflow_attempt
- completed_stack_demo
```
