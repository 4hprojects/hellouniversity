# Teacher Tasks: Class Management (HelloUniversity)
Updated: 2026-03-24

## 1. Create a Class

Teachers can create a class with:

- class name
- course code
- academic term
- section
- subject description
- meeting days / time / room
- class status: `draft`, `active`, `archived`
- self-enrollment toggle

Current teacher actions:

- create class
- save as draft
- activate class
- regenerate join code

## 2. Edit Class Information

Teachers can update:

- class name
- course code
- section
- term system / academic term
- schedule
- room
- description
- self-enrollment

Current teacher actions:

- update class details
- regenerate join code
- archive / restore through lifecycle controls

## 3. Manage Students

Current roster flow is teacher-driven and preview-first.

Supported actions:

- preview student IDs before adding
- add students manually by ID
- remove enrolled students

Student information shown:

- name
- student ID
- email
- enrollment status

Not currently implemented:

- CSV upload
- invite by email
- pending enrollment approval
- per-student access disable

## 4. Manage Teaching Team

Current teaching-team flow supports:

- preview teacher accounts by ID or email
- add collaborators
- assign `co_teacher`, `teaching_assistant`, or `viewer`
- remove collaborators

Current rule:

- owner manages roles and membership
- `co_teacher` can manage roster, modules, materials, settings, and announcements
- `teaching_assistant` can manage modules and materials only
- `viewer` is read-only
- lifecycle, join-code regeneration, duplicate, and team governance remain owner-only

## 5. Organize Class Structure

Modules are live and support:

- create module
- rename module
- update description
- hide / show module
- delete module
- atomic reorder

Current structure style:

- weeks
- units
- topics
- custom teacher-defined sections

## 6. Manage Class Materials

Materials now support both URL-based resources and upload-backed files.

Supported material types:

- link
- video
- document upload
- file upload
- note

Current teacher actions:

- create material
- edit material metadata
- upload document/file materials
- replace uploaded material files
- remove an uploaded file while keeping the material entry
- attach material to module
- hide / show material
- delete material
- atomic reorder

Current limits:

- one uploaded file per material
- no bulk upload
- no file version history
- legacy `document` and `file` URL references still remain supported

## 7. Create Assessments

Class management links naturally to quizzes, but assessment authoring still belongs to the quiz flow.

Current teacher actions from class workspace:

- navigate to quiz creation

Not currently part of class-management runtime:

- module-attached assessment scheduling
- assignment workflow
- survey / exit-ticket management inside class pages

## 8. Post Announcements

Announcements are live for class communication.

Current teacher actions:

- post announcement
- edit announcement
- delete announcement
- comment
- moderate discussion

Current collaborator announcement rule:

- `co_teacher` can post announcements and edit/delete their own posts
- `teaching_assistant` and `viewer` are read-only in teacher announcement management

Current student actions:

- comment
- like

Not currently implemented:

- pin announcement
- schedule announcement
- file attachments

## 9. Monitor Class Activity

Current class overview shows:

- enrolled student count
- teaching-team count
- schedule
- academic term
- visible module count
- visible material count
- announcement count
- assigned quiz count
- roster preview
- teaching-team preview
- insight cards for open quizzes, due soon, overdue, content readiness, and announcement readiness
- engagement summary from attempts
- recent class activity feed
- quick links into roster, team, modules, materials, announcements, and quizzes

Not currently implemented as a class-management feature:

- deep analytics
- missing-work monitoring beyond summary counts
- submission dashboards beyond overview summary
- material engagement analytics

## 10. Grade Management

Gradebook-style management is not part of the current class-management module.

Current related controls:

- grade visibility rule in class settings
- quiz-specific analytics and responses live elsewhere

## 11. Class Settings

Settings page is now live.

Current settings:

- self-enrollment enabled / disabled
- discussion enabled / disabled
- late submission policy
- grade visibility

Lifecycle controls also available there:

- regenerate join code
- archive class
- restore class

Permission rule:

- owner and `co_teacher` can update class settings
- `teaching_assistant` and `viewer` can only view settings

## 12. Archive / Restore / Duplicate

Current teacher actions:

- archive class with reason
- restore class with reason
- duplicate class

Current duplicate behavior:

- duplicates core class metadata
- resets ownership to the acting teacher
- clears students
- resets teaching team to owner only

Not duplicated:

- roster
- grading / responses
- live student state
