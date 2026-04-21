# Route Security Matrix

Updated: 2026-04-21

This document is the checked-in source of truth for API access expectations from `app/registerRoutes.js`.

## Categories

- `public`: anonymous access is allowed.
- `authenticated`: a session is required.
- `privileged`: authenticated plus elevated role checks such as `admin`, `manager`, or teacher/admin-only access.
- `system/webhook`: machine-facing or infrastructure-driven endpoints; keep them off the normal session + CSRF path unless intentionally browser-facing.

## Core API Mounts

| Mount                     | Module                                   | Primary access  | Notes                                                                                   |
| ------------------------- | ---------------------------------------- | --------------- | --------------------------------------------------------------------------------------- |
| `/api`                    | `routes/auditTrailApi.js`                | `privileged`    | CRFV audit reads and writes; writes now require CSRF.                                   |
| `/api`                    | `routes/crfvSettingsApi.js`              | `privileged`    | CRFV defaults/settings; writes require CSRF.                                            |
| `/api`                    | `routes/userSignInOutApi.js`             | `authenticated` | Session-backed user detail read.                                                        |
| `/api/payments-report`    | `routes/paymentsReportsApi.js`           | `privileged`    | Payment report edits and deletes require CSRF.                                          |
| `/api/payment-audits`     | `routes/paymentAuditsApi.js`             | `privileged`    | Read-only audit-style payment reporting.                                                |
| `/api`                    | `routes/emailApi.js`                     | `public`        | Public registration email relay; rate-limited.                                          |
| `/api/institutions`       | `routes/institutionsApiRoutes.js`        | `public`        | Search-only lookup endpoints.                                                           |
| `/api`                    | `routes/userRegisterApi.js`              | `public`        | Public CRFV attendee self-registration flow.                                            |
| `/api`                    | `routes/accountApiRoutes.js`             | `authenticated` | Profile/password/session routes; mutations require CSRF.                                |
| `/api/bulk-register`      | `routes/bulkRegisterApi.js`              | `privileged`    | Admin-only bulk import path.                                                            |
| `/api/events`             | `routes/eventsApi.js`                    | `public`        | Public event reads; admin/manager writes and deletes live in the same module.           |
| `/api/register`           | `routes/registerApi.js`                  | `public`        | Public CRFV registration + duplicate checks.                                            |
| `/api/attendance`         | `routes/attendanceApi.js`                | `authenticated` | Live attendance reads and writes now require a session; writes require CSRF.            |
| `/api`                    | `routes/reportsApi.js`                   | `privileged`    | CRFV attendee/accommodation/attendance/payment reporting and edits.                     |
| `/api/attendance-summary` | `routes/attendanceSummaryApi.js`         | `privileged`    | Manager/admin summary reporting.                                                        |
| `/api`                    | `routes/byteFunRunRoutes.js`             | `public`        | Public event registration flow with external integrations.                              |
| `/api`                    | `routes/classRecordsRoutes.js`           | `public`        | Sheet-backed student/class lookups; review separately if promoted beyond admin tooling. |
| `/api/lesson-quiz`        | `routes/lessonQuizRoutes.js`             | `public`        | Self-service lesson attempt endpoint; rate-limited.                                     |
| `/api/student-ethnicity`  | `routes/studentEthnicityRoutes.js`       | `public`        | Public form submission path backed by Sheets.                                           |
| `/api/quiz-builder`       | `routes/quizBuilderApiRoutes.js`         | `privileged`    | Teacher/admin-only builder surface.                                                     |
| `/api/live-games`         | `routes/liveGameBuilderApiRoutes.js`     | `privileged`    | Teacher/admin live-game authoring.                                                      |
| `/api/live-games`         | `routes/liveGameAssignmentsApiRoutes.js` | `privileged`    | Teacher/admin assignment management.                                                    |
| `/api/teacher`            | `routes/teacherVerificationRoutes.js`    | `authenticated` | Pending-teacher verification upload flow.                                               |

## Database-Dependent API Mounts

| Mount                   | Module                                      | Primary access  | Notes                                                                                               |
| ----------------------- | ------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `/api/admin/users`      | `routes/adminUsersRoutes.js`                | `privileged`    | Admin-only user management; mutations require CSRF.                                                 |
| `/api`                  | `routes/assignmentsRoutes.js`               | `authenticated` | Student reads plus teacher/admin assignment mutations.                                              |
| `/api`                  | `routes/classesRoutes.js`                   | `authenticated` | Authenticated reads; teacher/admin class mutations.                                                 |
| `/api/teacher/classes`  | `routes/teacherClassManagementApiRoutes.js` | `privileged`    | Teacher/admin class ownership surface.                                                              |
| `/api`                  | `routes/quizManagementRoutes.js`            | `authenticated` | Authenticated quiz play plus admin-only management.                                                 |
| `/api`                  | `routes/blogsCommentsRoutes.js`             | `public`        | Public comment reads and writes with rate limits and sanitization.                                  |
| `/api`                  | `routes/blogManagementRoutes.js`            | `authenticated` | Author reads/writes plus admin moderation paths.                                                    |
| `/api`                  | `routes/activityRandomRoutes.js`            | `public`        | Public by default, optionally staff-gated via env flag. Treat as sensitive because it emails users. |
| `/api/classes`          | `routes/classAnnouncementsRoutes.js`        | `authenticated` | Class announcements/comments/reactions require a session.                                           |
| `/api/admin/grades`     | `routes/adminGradesRoutes.js`               | `privileged`    | Self-mounted admin-only API module.                                                                 |
| `/api/admin/attendance` | `routes/adminAttendanceRoutes.js`           | `privileged`    | Self-mounted admin-only API module.                                                                 |

## Rules For New Routes

- Choose one primary access category before adding the mount.
- Session-backed `POST`, `PUT`, `PATCH`, and `DELETE` routes should use shared CSRF middleware unless the endpoint is explicitly `public` or `system/webhook`.
- Prefer shared middleware from `middleware/apiSecurity.js` over ad hoc inline auth checks.
- If a module mixes public reads with privileged writes, keep that exception documented in this matrix and in the route file header comment.
- Sensitive CRFV/report/payment/account surfaces should default to `privileged` or `authenticated`, never client-side-only gating.

## Ownership Conventions

- Route/controller layer: keep request auth, validation, and response shaping close to the route file.
- Service/store layer: move Supabase/Mongo query batches and external relays into `utils/*Store.js` or focused helper modules.
- Validator/parsing layer: put reusable query/body parsing in shared helpers such as `utils/requestParsers.js`.
- Presentation helpers: keep serializer/label/export formatting small and local to the feature that owns the response or page.
