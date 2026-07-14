---
status: active
last_updated: 2026-07-11
roadmap_type: phased
---

# VisualDSA Implementation Roadmap

## Roadmap objective

Extend the existing HelloUniversity DSA implementation into a research-ready VisualDSA platform without replacing working curriculum, routes, or lesson content.

## Phase 1: Audit and documentation baseline

### Deliverables

- `README.md`
- `01-current-implementation-audit.md`
- `02-target-architecture.md`
- `03-gap-analysis.md`
- `04-implementation-roadmap.md`

### Completion criteria

- Existing implementation is classified
- Files to preserve are identified
- Target architecture is fixed
- Initial six modules are confirmed
- Work is divided into testable phases

### Status

```text
STARTED
```

## Phase 2: Shared visualizer design system and shell

### Build

- VisualDSA module registry
- Shared EJS visualizer shell
- Mode selector
- Input panel
- SVG visualization region
- Pseudocode panel
- Explanation panel
- Variable and counter panel
- Playback controls
- Feedback panel
- Responsive mobile layout
- Keyboard navigation
- Reduced-motion support

### Repository direction

Extend:

```text
views/pages/site/visualDsaDetail.ejs
public/css/dsa.css
app/dsaContent.js
routes/webPagesRoutes.js
```

Add modular client files under a dedicated VisualDSA namespace, for example:

```text
public/js/visualdsa/
public/css/visualdsa/
```

### Acceptance criteria

- One placeholder route renders the reusable shell
- The shell loads a module by registry ID
- Previous, next, play, pause, and reset work with sample states
- Desktop and mobile layouts pass manual checks
- Keyboard controls work
- Existing routes remain unchanged

## Phase 3: Foundation modules

### Modules

1. Array operations
2. Stack operations
3. Queue operations

### Required modes

- Guided
- Exploration
- Practice

Assessment mode may use temporary in-memory data until Phase 4, but the module APIs must already follow the final contract.

### Acceptance criteria per module

- Input validation
- Deterministic state generation
- Forward and backward state history
- Pseudocode highlighting
- Explanation per step
- Practice prompts
- Immediate feedback
- Unit tests for algorithm states
- Mobile and keyboard checks

## Phase 4: Practice and assessment engine

### Build

- Problem templates
- Server-issued problem seeds
- Practice-session lifecycle
- Assessment-attempt lifecycle
- Attempt limits
- Time limits where configured
- Hint and retry rules
- Partial credit
- Server-side action and score validation
- Module versioning

### Suggested API groups

```text
POST /api/visualdsa/practice-sessions
POST /api/visualdsa/assessment-attempts
GET  /api/visualdsa/assessment-attempts/:id
POST /api/visualdsa/assessment-attempts/:id/actions
POST /api/visualdsa/assessment-attempts/:id/submit
```

### Acceptance criteria

- A student can start and complete a practice session
- A student can start and submit an assessment attempt
- The server rejects invalid or unauthorized actions
- The server calculates the official score
- Attempts retain problem seed and module version
- Tests cover success, retry, timeout, and unauthorized cases

## Phase 5: Interaction logging and misconception classification

### Build

- Event ingestion endpoint
- Event validation
- Raw event storage
- Response-time calculation
- Retry and hint tracking
- Misconception definitions
- Module-specific error classifiers
- Session recovery and abandonment handling

### Acceptance criteria

- Every meaningful assessment action creates an event
- Events cannot be written for another student
- Duplicate events are handled safely
- Raw events remain immutable
- Misconception codes can be traced back to source actions
- Event tests verify payload and authorization rules

## Phase 6: Complete the remaining research modules

### Modules

4. Binary search
5. Introductory sorting
6. Binary search tree insertion and traversal

### Sorting scope

- Bubble sort
- Selection sort
- Insertion sort

Use one shared sorting framework with algorithm-specific step generation and assessment rules.

### Acceptance criteria

Each module includes:

- Guided mode
- Exploration mode
- Practice mode
- Recorded assessment mode
- Event logging
- Misconception classification
- Analytics definitions
- Unit, route, and scoring tests
- Mobile and accessibility checks

## Phase 7: Student and instructor analytics

### Student dashboard

- Topic mastery
- Practice history
- Assessment results
- Attempts and hints
- Recommended review
- Recent activity

### Instructor dashboard

- Class overview
- Completion rates
- Mastery matrix
- Common misconception codes
- Difficult steps
- Student drill-down
- Intervention candidates
- Export capability

### Acceptance criteria

- Analytics use recorded events and attempts
- Aggregates can be recalculated
- Instructor access is limited to authorized classes
- Student views expose only the student’s own data
- Dashboard metrics have documented formulas
- Empty and low-data states are usable

## Phase 8: Stabilization and pilot readiness

### Testing

- Algorithm-state tests
- Assessment scoring tests
- API authorization tests
- Event-integrity tests
- Accessibility review
- Responsive testing
- Performance checks
- Instructor walkthrough
- Student usability pilot

### Documentation

- Module specifications
- Database schema
- API contracts
- Event catalog
- Misconception catalog
- Testing report
- Pilot protocol

### Acceptance criteria

- No critical correctness defects
- No cross-user access defects
- Six modules pass the research-complete checklist
- Pilot participants can complete the full lesson-to-assessment flow
- Instructors can identify a struggling student and a common class error

## Phase 9: Formal research evaluation

### Evidence sources

- Expert review
- Functional testing
- Student usability data
- Pretest and posttest where approved
- Interaction logs
- Instructor usefulness evaluation
- Interviews or open-ended responses

### Research boundary

Do not claim causal learning improvement unless the study design supports that conclusion.

## Phase 10: Curriculum expansion

### Batch 2

- Linked lists
- Recursion
- Merge sort
- Quick sort
- Heaps
- Hash tables
- BFS
- DFS

### Batch 3

- AVL trees
- Tries
- Disjoint sets
- Topological sorting
- Dijkstra
- Prim
- Kruskal
- Dynamic programming

## Research-complete module checklist

```text
[ ] Related lesson is linked
[ ] Learning objectives are defined
[ ] Inputs are validated
[ ] Algorithm states are verified
[ ] Guided mode works
[ ] Exploration mode works
[ ] Practice mode works
[ ] Assessment mode works
[ ] Official score is server-validated
[ ] Events are recorded
[ ] Errors map to misconception codes
[ ] Student mastery is updated
[ ] Instructor analytics receive data
[ ] Keyboard interaction works
[ ] Reduced motion works
[ ] Mobile layout is tested
[ ] Automated tests pass
[ ] Instructor content review is complete
```

## Immediate next batch

After approval of Phase 1, create:

```text
05-visualizer-design-system.md
06-practice-and-assessment-engine.md
07-interaction-event-model.md
08-learning-analytics.md
```

Then create the detailed specification for the Array module before writing production code.
