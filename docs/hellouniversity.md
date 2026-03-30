# HelloUniversity: Current Capabilities and Roadmap

Updated: 2026-03-30

## Product Definition

HelloUniversity is not a university itself. It is a digital academic platform designed to support school and higher education workflows such as classes, assessments, communication, and learning management.

This note is meant to describe the product honestly based on the current codebase state. It separates what is already working, what is still transitional, and what should be treated as the next roadmap layer.

See also: [content-style-guide.md](./content-style-guide.md) for the app-wide rule that user-facing copy should stay in user POV rather than developer POV.

---

## Current Capabilities

### 1. Access and Role-Based Workspaces

- Authentication exists for students, teachers, and admins.
- Teacher signup supports an approval flow before full teacher access is granted.
- The app already uses role-aware pages and workspace routing for student, teacher, and admin users.

### 2. Class and Teaching Workspace

- Teachers can create, edit, and manage classes.
- Classes currently store academic fields such as course code, academic term, term system, section, room, schedule, and description.
- Students can join classes through class codes.
- Teachers can manage rosters and teaching-team access.
- Classes support modules and materials for organizing learning content.
- Classes support announcements, comments, and reactions for day-to-day communication.

### 3. Assessments and Quiz Workflows

- Teachers can create, edit, publish, close, archive, restore, duplicate, preview, and analyze quizzes.
- The quiz builder supports sections and multiple question types.
- Multiple-choice quizzes can now route students to different sections based on the selected answer.
- Quizzes can be assigned to classes and tracked through response and analytics views.
- Teachers can now narrow a class-linked quiz to selected students directly from the quiz dashboard instead of assigning only at the full-class level.
- Published quiz workflows now expose a canonical student responder page and teacher copy-link actions for assigned students.
- The canonical student responder now supports section-by-section quiz flow with path-aware previous/next navigation.
- The student responder now includes a sticky progress shell, review-before-submit flow, visible autosave state, and warning-based handling for unanswered required questions.
- A quiz can now be created without choosing a class immediately, then assigned later.
- Short-answer and paragraph questions can be configured for manual review by leaving the accepted answer blank.

### 4. Student Academic Experience

- Students already have dashboard, classes, activities, and attendance pages.
- Students can view joined classes, visible materials, and announcement feeds.
- Students can see activity state such as not started, in progress, submitted, late, and overdue.
- Students can access current grade records and course-linked grade summaries through the existing grade flow.

### 5. Grade and Admin Operations

- Admins can upload grade data and search grade records.
- Students can view current academic records through `/grades` and the existing grade endpoints.
- Legacy `/classrecords` and `/classrecords.html` now redirect to `/grades`.
- The student dashboard already surfaces recent final-grade information from available records.

### 6. Public Learning and Support Content

- The platform already includes a public lessons catalog and lesson detail pages.
- Blogs, books, archived events, search, and support/legal pages are part of the current public site.
- The public site and shared metadata now position HelloUniversity as a digital academic platform, not a university itself.
- Public-facing FAQ content on the home and help pages now explains HelloUniversity in product terms without exposing internal implementation details.
- The public `/about` page now presents students, teachers, and academic teams in direct platform language that matches the broader school and higher education scope.
- The public site now includes product-facing pages for `/features`, `/teacher-guide`, `/student-guide`, `/how-it-works`, and `/classrush-guide`.
- The public guide set now follows clearer user-POV copy and stronger public entry-point guidance so visitors can understand what they can do before login and where to start next.
- `/teacher-guide` now speaks from the classroom teacher point of view and is meant to help teachers understand what they can manage now before going deeper into `/features`.
- `/classrush-guide` now acts as a create-first teacher guide, pointing directly to the ClassRush builder while still exposing the public join path for live session access.
- New approval-oriented public blog content is now standardized around the Mongo-backed blog flow rather than static per-article templates.
- The public blogs hub now highlights a curated `Start Here: HelloUniversity Learning Guides` collection for review-friendly discovery.
- The `/lessons` page has been simplified into a lesson-first experience with clearer starting paths, a cleaner catalog flow, and separate low-emphasis support links.

### 7. Basic Monitoring and Insights

- Teachers already have basic class insights for student count, submissions, assignments, materials, announcements, and completion trends.
- Students already have class-level and activity-level summary views across joined classes.

### 8. Editorial and Publication Workflow

- Editorial article drafts can now be kept in the repo for review before publication.
- Approved blog content can now be imported into MongoDB through the repo-backed draft import workflow.
- The current direction is to treat MongoDB as the live source of truth for public blog/article publishing, while the repo remains the source of truth for drafts and templates.

### 9. Stability and Release Guardrails

- Startup env validation is active and documented against the current R2 + Resend requirements.
- The smoke suite now covers public guide pages, `/grades`, admin pages, ClassRush pages, `/play`, search-record escaping, and the legacy `/classrecords` redirect behavior.
- The repo now has a project-level smoke CI workflow on Node 20.
- Unsupported teacher and admin placeholder surfaces have been hidden until backed workflows are ready.

---

## Transitional or Partial Areas

These areas exist in some form, but they should not yet be treated as fully productized.

### 1. Academic Structure

- Academic term, term system, course code, and section are currently class-level fields.
- There is not yet a full institution-level academic structure layer for academic terms, course offerings, sections, and global scheduling rules.

### 2. Assignments

- The current assignment model is mostly quiz assignment.
- A full assignment workflow with distinct coursework submission, file submission, feedback, and grading states is still incomplete.

### 3. Grade Portal and Grade Governance

- Grade viewing exists through `/grades` and the current grade endpoints.
- Legacy class-record paths now redirect to `/grades`.
- Faculty-controlled grade release, score-breakdown visibility rules, and a dedicated teacher gradebook workflow are not yet complete.

### 4. Invitations and Membership Automation

- Join-code and roster update flows already exist.
- A complete email-based class invitation workflow with invitation tracking is not yet a finished product area.

### 5. Notifications and Reminders

- Announcements are live.
- A broader reminders and notification system is still missing as a first-class workflow.

### 6. AI-Assisted Academic Support

- AI-assisted quiz drafting, announcement drafting, or content support is still a roadmap idea.
- It should not be described as a live product capability yet.

---

## Direction Check

Yes, the direction is correct.

The strongest current foundation is in:

- class management,
- quiz workflows,
- class communication,
- student activity visibility,
- and public learning content.

The next stage is not about changing direction. It is about finishing the product layers that are still partial, especially:

- academic structure,
- assignments,
- grade governance,
- notifications,
- and AI-assisted support.

---

## Recommended Roadmap Priorities

### 1. Complete the Academic Core

- Introduce first-class academic terms, course offerings, section structures, and cleaner scheduling rules.
- Reduce dependence on isolated class-level fields for core academic structure.

### 2. Build a Real Gradebook and Release Workflow

- Build beyond the current transitional `/grades` portal into a full in-app gradebook and release workflow.
- Add teacher-controlled grade entry, review, release, audit trail, and student visibility controls.

### 3. Finish Assignments as a Separate Product Area

- Support non-quiz assignments, submission files, due dates, checking states, teacher feedback, and grading flows.

### 4. Strengthen Communication

- Add reminders, scheduled announcements, and broader notification delivery beyond the current announcement feed.

### 5. Expand Monitoring Carefully

- Deepen class insights, completion tracking, and progress summaries for both teachers and students.
- Keep analytics operational and useful, not just decorative.

### 6. Add AI Only After Core Workflows Are Stable

- Start with drafting assistance for quizzes, announcements, and content outlines.
- Keep publishing, grading, and academic decisions under human control.

---

## Positioning Summary

HelloUniversity already has the shape of a digital academic platform for school and higher education workflows.

What it still needs is not a new identity. It needs stronger execution in the areas that are currently transitional:

- institutional academic structure,
- assignment workflows,
- gradebook and release controls,
- notifications,
- and carefully scoped AI support.

That is the right direction for the platform.

From a public-web and AdSense perspective, the immediate direction is now clearer:

- keep public content focused on education and academic workflows,
- treat the blog as a curated publisher surface,
- keep `/lessons` intuitive and lesson-first,
- and avoid mixing thin utility pages into the review surface.


## Core Pillars of the System - do not change this section 


### 1. Academic Management
This pillar focuses on the organisational structure of the platform. It includes academic terms, classes, courses, sections, and student class membership. Its purpose is to help institutions organise academic operations in a clear and manageable way.

### 2. Learning Management
This pillar covers the delivery of learning within the platform. It includes learning materials, quizzes, online activities, assignments, and submissions. Its purpose is to support teaching and learning in one digital environment.

### 3. Communication and Engagement
This pillar supports the flow of information between faculty and students. It includes announcements, reminders, and class updates. Its purpose is to improve coordination, keep learners informed, and reduce missed academic information.

### 4. Grading and Student Academic Access
This pillar focuses on grade management and student access to academic results. It includes grade encoding, grade computation, released grade viewing, optional score breakdowns, faculty-controlled grade release, and authorised grade editing. Its purpose is to support both academic control and student transparency.

### 5. Monitoring and Intelligent Support
This pillar focuses on tracking and support. It includes academic monitoring, progress tracking, and AI-assisted support for selected academic tasks such as drafting quizzes or announcements. Its purpose is to help faculty manage workload more efficiently and respond to student needs more effectively.
