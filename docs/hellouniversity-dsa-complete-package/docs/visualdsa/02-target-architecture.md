---
status: active
last_updated: 2026-07-11
target: research-ready VisualDSA
---

# VisualDSA Target Architecture

## Product position

VisualDSA is the interactive instructional layer of the HelloUniversity DSA curriculum.

```text
HelloUniversity DSA
= structured lessons, examples, code, activities, and projects

VisualDSA
= visualization, guided interaction, practice, recorded assessment,
  learning analytics, and instructor intervention support
```

VisualDSA must not become a separate general learning management system.

## Target learning flow

```text
Student reads lesson
    ↓
Student opens related VisualDSA module
    ↓
Guided mode explains the operation
    ↓
Exploration mode allows custom input
    ↓
Practice mode gives immediate feedback
    ↓
Assessment mode records independent performance
    ↓
Mastery and misconception data are updated
    ↓
Instructor reviews class and student analytics
```

## Target route structure

Preserve the existing routes:

```text
/data-structures-and-algorithms
/data-structures-and-algorithms/<lesson-slug>
/data-structures-and-algorithms/projects/<project-slug>
/visualdsa
/visualdsa/<demo-slug>
```

Add authenticated workspace routes only where needed:

```text
/visualdsa/progress
/visualdsa/assessments
/visualdsa/instructor
/visualdsa/instructor/classes/<class-id>
/visualdsa/instructor/students/<student-id>
```

Add API routes under a dedicated namespace:

```text
/api/visualdsa/modules
/api/visualdsa/practice-sessions
/api/visualdsa/assessment-attempts
/api/visualdsa/events
/api/visualdsa/mastery
/api/visualdsa/instructor
```

## VisualDSA module modes

### Guided mode

- Uses a prepared example
- Explains each operation
- Highlights pseudocode
- Shows current variables and structure state
- Allows previous, next, replay, and reset
- Does not produce a graded score

### Exploration mode

- Accepts validated custom input
- Allows free execution
- Shows state history
- Supports edge-case testing
- Records optional non-graded usage analytics

### Practice mode

- Generates a task
- Requires student prediction or manipulation
- Gives immediate corrective feedback
- Allows hints and retries
- Records attempts for learning analytics
- Does not automatically count as a formal grade

### Assessment mode

- Uses a server-issued problem seed
- Requires independent direct interaction
- Restricts hints based on assignment rules
- Records every meaningful action
- Validates the official result on the server
- Updates mastery only after submission

### Instructor demonstration mode

- Enlarges the visualization
- Supports classroom-controlled examples
- Can hide answers and explanation panels
- Allows question pauses before revealing a step
- Does not create student assessment records

## Shared visualizer shell

```text
VisualDsaShell
├── ModuleHeader
├── ModeSelector
├── InputPanel
├── PseudocodePanel
├── VisualizationCanvas
├── ExplanationPanel
├── VariableAndCounterPanel
├── PlaybackControls
├── PredictionOrActionPanel
├── FeedbackPanel
└── CompletionAndMasteryPanel
```

## Shared engine

```text
VisualDSA Engine
├── Module Registry
├── Input Validator
├── State Manager
├── Step Generator
├── Playback Controller
├── State History
├── Renderer Adapter
├── Pseudocode Synchronizer
├── Practice Controller
├── Assessment Controller
├── Scoring Engine
├── Misconception Classifier
├── Event Logger
├── Session Recovery
└── Accessibility Adapter
```

## Required module contract

Each module must implement a common interface.

```javascript
{
  id,
  version,
  title,
  relatedLessonSlug,
  supportedModes,

  validateInput(input),
  createInitialState(input),
  generateSteps(initialState),
  renderState(state, context),
  getPseudocode(),
  validateStudentAction(action, state, task),
  classifyError(action, state, task),
  calculateScore(attempt),
  generateProblem(seed, difficulty),
  getAnalyticsDefinitions()
}
```

## Rendering policy

Use SVG by default for:

- Arrays
- Stacks
- Queues
- Linked nodes
- Trees
- Graphs
- Pointer changes
- Highlighted elements

Use HTML and CSS for:

- Controls
- Pseudocode
- Variable tables
- Feedback
- Forms
- Dashboards

Use Canvas only when SVG performance becomes a measured problem.

## Assessment architecture

```text
Problem template
    ↓
server-issued seed
    ↓
generated problem instance
    ↓
student attempt
    ↓
interaction events
    ↓
server validation
    ↓
score and misconception results
    ↓
topic mastery update
```

The final state alone is not enough. Intermediate actions must be evaluated when the algorithm requires a specific process.

## Event architecture

Every recorded event should include:

```text
event ID
session ID
attempt ID
student ID
class ID
lesson ID
module ID
module version
mode
problem seed
step number
event type
submitted value
expected value
correctness
attempt number
hint state
response time
timestamp
```

## Analytics architecture

### Student analytics

- Lesson completion
- Practice completion
- Assessment score
- Attempts
- Hint use
- Response time
- Mastery by topic
- Recommended review

### Instructor analytics

- Class completion
- Class mastery matrix
- Most difficult steps
- Common misconception codes
- Student drill-down
- Practice-to-assessment comparison
- Intervention candidates

## Initial research-complete modules

### 1. Arrays

Scope:

- Access
- Update
- Traversal
- Insertion
- Deletion
- Element shifting

### 2. Stacks

Scope:

- Push
- Pop
- Peek
- LIFO prediction
- Overflow
- Underflow

### 3. Queues

Scope:

- Enqueue
- Dequeue
- Peek/front
- FIFO prediction
- Front and rear updates
- Circular queue as an extension

### 4. Binary search

Scope:

- Sorted-input requirement
- Low, high, and midpoint
- Search-range reduction
- Successful and unsuccessful search

### 5. Introductory sorting

Scope:

- Bubble sort
- Selection sort
- Insertion sort
- Comparisons
- Swaps and writes
- Pass-level reasoning

### 6. Binary search trees

Scope:

- Search
- Insertion
- Left and right decisions
- Preorder, inorder, and postorder tracing
- Deletion deferred unless time permits

## Expansion sequence

Batch 2:

- Linked lists
- Recursion and call stacks
- Merge sort
- Quick sort
- Heaps
- Hash tables
- BFS
- DFS

Batch 3:

- AVL trees
- Tries
- Disjoint sets
- Topological sorting
- Dijkstra
- Prim
- Kruskal
- Dynamic programming modules

## Non-negotiable architecture rules

1. Preserve all existing public DSA routes.
2. Do not duplicate lesson content inside VisualDSA.
3. Use one reusable engine rather than isolated visualizer pages.
4. Validate official assessment results on the server.
5. Version modules and assessment definitions.
6. Keep raw interaction events separate from aggregated mastery.
7. Support keyboard interaction and reduced motion.
8. Use symbols or labels in addition to color.
9. Test mobile behavior for every module.
10. Treat instructor analytics as part of the artifact, not a later optional dashboard.
