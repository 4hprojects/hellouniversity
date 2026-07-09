# Codex or Claude Build Prompt: HelloUniversity DSA Content Implementation

## Purpose

Build or update the HelloUniversity DSA content section using the prepared Markdown content package.

The goal is to implement a clean, mobile-friendly, SEO-ready DSA learning section with separate but linked VisualDSA interactive routes.

---

## Task

Use the Markdown files in this package to create website pages for:

1. Data Structures and Algorithms lessons
2. Applied DSA projects
3. VisualDSA interactive demo placeholders
4. Navigation and internal links

---

## Context

This package contains:

```text
docs/dsa/00-master-content-plan.md
docs/dsa/01-site-architecture.md
docs/dsa/02-url-map-and-navigation.md
docs/dsa/03-lesson-page-template.md
docs/dsa/lessons/
docs/dsa/projects/
docs/visualdsa/00-visualdsa-integration-overview.md
```

The content strategy is:

```text
DSA Lessons = teaching content
VisualDSA = interactive demo, assessment, and analytics layer
```

The learning flow is:

```text
Read the lesson
→ Try VisualDSA
→ Answer quick check
→ Complete activity or project
→ Instructor reviews analytics
```

---

## Effort

Work carefully and avoid skipping files.

Preserve the lesson order.

Preserve headings, code blocks, tables, quick checks, answer keys, and related links.

Make the output mobile-friendly and easy to read.

---

## Boundaries

Do not merge DSA Lessons and VisualDSA into one route group.

Do not remove VisualDSA Integration sections from lessons.

Do not rename routes unless the URL map is also updated.

Do not change the primary programming language from Python.

Do not add Tailwind CSS unless the existing HelloUniversity project already uses it.

Do not invent analytics dashboards beyond the placeholder or requirements unless asked.

---

## Verification Rules

After implementation, verify:

1. All 30 lesson pages exist.
2. All 5 project pages exist.
3. The course landing page exists.
4. The VisualDSA main page exists.
5. VisualDSA demo placeholder routes exist.
6. Previous and next lesson links work.
7. Lesson-to-VisualDSA links work.
8. VisualDSA-to-lesson links work.
9. Sidebar navigation follows the official order.
10. Pages are mobile-friendly.
11. Code blocks render correctly.
12. Tables render correctly.
13. SEO titles and descriptions are present.

---

## Stop Conditions

Stop and report if:

- A required source Markdown file is missing.
- The project routing pattern is unclear.
- The existing site framework conflicts with the URL map.
- A page cannot be generated without breaking existing routes.

---

## Output Format

Provide:

1. Summary of implemented files.
2. List of routes created or updated.
3. Any missing or skipped items.
4. Any route conflicts found.
5. Suggested next implementation step.
