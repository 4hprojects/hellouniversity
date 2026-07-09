# HelloUniversity DSA Complete Content Package

**Prepared for:** Codex or Claude  
**Project:** HelloUniversity  
**Course:** Data Structures and Algorithms  
**Architecture:** DSA Lessons separated from VisualDSA, but tightly hyperlinked  
**Primary Language:** Python

---

## Package Purpose

This package contains the complete first version of the HelloUniversity DSA content system.

It includes:

- Course planning documents
- Website architecture guidance
- Official URL map
- Lesson page template
- 30 student-facing DSA lessons
- 5 applied DSA project pages
- VisualDSA integration overview
- Codex or Claude build prompt

---

## Recommended Use

Use this package as the source of truth for implementing the DSA section of HelloUniversity.

Do not treat the Markdown files as random notes.

Treat them as structured source content for:

```text
/data-structures-and-algorithms
```

and the linked interactive layer:

```text
/visualdsa
```

---

## Folder Structure

```text
hellouniversity-dsa-complete-package/
│
├── README.md
│
├── docs/
│   ├── dsa/
│   │   ├── 00-master-content-plan.md
│   │   ├── 01-site-architecture.md
│   │   ├── 02-url-map-and-navigation.md
│   │   ├── 03-lesson-page-template.md
│   │   │
│   │   ├── lessons/
│   │   │   ├── lesson-01-introduction-to-dsa.md
│   │   │   ├── lesson-02-algorithmic-thinking.md
│   │   │   ├── ...
│   │   │   └── lesson-30-dsa-review-and-integration.md
│   │   │
│   │   └── projects/
│   │       ├── project-01-student-grade-record-system.md
│   │       ├── project-02-queue-based-enrollment-system.md
│   │       ├── project-03-stack-based-undo-feature.md
│   │       ├── project-04-graph-based-campus-navigation.md
│   │       └── project-05-sorting-algorithm-visual-comparison.md
│   │
│   └── visualdsa/
│       └── 00-visualdsa-integration-overview.md
│
└── prompts/
    └── codex-claude-build-dsa-content.md
```

---

## Included Lesson Count

Copied lesson files: **30**

Expected lesson files: **30**

Status:

```text
Complete
```

---

## Included Project Count

Copied project files: **5**

Expected project files: **5**

Status:

```text
Complete
```

---

## Core Learning Architecture

```text
DSA Lessons = concept explanation, examples, activities, quick checks
VisualDSA = interactive demo, guided tracing, assessment, analytics
```

Student flow:

```text
Read the lesson
→ Try VisualDSA
→ Answer quick check
→ Complete activity or project
→ Instructor reviews analytics
```

---

## Main Implementation Files

Start here:

1. `docs/dsa/00-master-content-plan.md`
2. `docs/dsa/01-site-architecture.md`
3. `docs/dsa/02-url-map-and-navigation.md`
4. `docs/dsa/03-lesson-page-template.md`
5. `prompts/codex-claude-build-dsa-content.md`

---

## Final URL Pattern

DSA lesson pages should use:

```text
/data-structures-and-algorithms/<lesson-slug>
```

VisualDSA pages should use:

```text
/visualdsa/<demo-slug>
```

Project pages should use:

```text
/data-structures-and-algorithms/projects/<project-slug>
```

---

## Content Standard

Each lesson should preserve:

- Lesson overview
- Learning objectives
- Key terms
- Simple explanation
- Python examples
- Code walkthrough
- Step-by-step tracing
- Time and space complexity
- Common mistakes
- Real-world applications
- VisualDSA integration
- Practice activity
- Quick check
- Answer key
- Previous and next lesson links

Each project should preserve:

- Project overview
- DSA concepts used
- Problem scenario
- Learning objectives
- System requirements
- Suggested data structure
- Sample menu
- Sample output
- Starter code
- Code walkthrough
- Time complexity guide
- VisualDSA integration
- Project checklist
- Suggested improvements
- Rubric
- Reflection questions
- Related lessons

---

## Recommended Codex or Claude Instruction

Use this file as the implementation prompt:

```text
prompts/codex-claude-build-dsa-content.md
```

Before implementation, review:

```text
docs/dsa/02-url-map-and-navigation.md
```

This prevents route mismatch.

---

## Build Priority

Recommended build order:

1. Course landing page
2. DSA lesson layout component
3. Lesson routes
4. Sidebar navigation
5. Applied project routes
6. VisualDSA landing page
7. VisualDSA demo placeholder pages
8. Lesson-to-demo links
9. Demo-to-lesson links
10. Instructor dashboard placeholder

---

## Important Decision

Do not combine all content into one long page.

Use separate pages for each lesson and each project.

The site should feel like:

```text
Structured learning platform
```

not:

```text
A collection of disconnected blog posts
```
