# Route Map
Updated: 2026-03-17

## Server Mount Order (from `server.js`)

1. Global middleware/session/user context
2. Web/auth/config/password-reset routes
3. Core API mounts (`events`, `register`, `attendance`, `reports`, etc.)
4. DB-dependent API mounts after successful DB connection
5. Student/admin page routes and utility web routes
6. Static content routes
7. Error handler
8. 404 handler

## Mounted Route Owners

### Web Pages
- `routes/webPagesRoutes.js`
  - `/` (home now renders with shared `views/partials/nav.ejs`)
  - `/about`
  - `/blogs`, `/blogs/`, `/blog`, `/blog.html`, `/blogs/index`, `/blogs/index.html`
  - `/blogs/:legacySlug`, `/blogs/:legacySlug.html` redirect old uncategorized blog slugs to canonical category routes
  - `/blogs/:category/:slug`, `/blogs/:category/:slug.html` for shared blog-detail rendering and canonical article redirects
  - `/blogs/events/:slug`, `/blogs/events/:slug.html` redirect to `/events/:slug`
  - `/contact`, `/contact.html` redirect
  - `/events`, `/events.html` redirect, `/events/events` redirect
  - `/events/:slug`, `/events/:slug.html` redirect for shared event archive pages
  - `/help`, `/help.html` redirect
  - `/privacy-policy`, `/privacy-policy.html` redirect
  - `/cookie-policy`, `/cookie-policy.html` redirect
  - `/terms-and-conditions`, `/terms-and-conditions.html` redirect
  - `/search`, `/search.html` redirect
  - `/submissions/:slug`, `/submissions/:slug.html` redirect for archived submission pages
  - `/lessons` + lesson EJS routes
  - `/books`, `/books.html` redirect, `/books/:series` redirect, `/books/:series/:entry`, `/books/:series/:entry.html` redirect

### Auth and Account
- `routes/authWebRoutes.js`
  - `/login`, `/login.html`
  - `/signup`, `/signup.html`
  - `/reset-password`, `/reset-password.html`
  - `/approval-pending`
  - `/auth/login`, `/logout` variants
  - `/session-check`, `/api/check-auth`
  - `/user-details`, `/api/user-details`
- `routes/signupApi.js`
  - `POST /signup`
  - supports `student` and `teacher` signup, institution capture, and pending-teacher requests
- `routes/passwordResetRoutes.js`
  - `POST /send-password-reset`
  - `POST /verify-reset-code`
  - `POST /reset-password`
- `routes/institutionsApiRoutes.js`
  - `GET /api/institutions/search`
- `routes/confirmEmailApi.js`
  - `GET /confirm-email/:token`
- `routes/resendConfirmationApi.js`
  - `GET /resend-confirmation`

### Config
- `routes/configRoutes.js`
  - `/api/config`

### Student and Admin Pages
- `routes/studentPagesRoutes.js`
  - `/dashboard` (now renders EJS student dashboard with shared nav)
  - `/attendance`, `/attendance.html` redirect
  - `/activities`, `/activities.html` redirect
  - `/classes`
  - `/classes/:classId`
- `routes/adminPagesRoutes.js`
  - `/admin_dashboard` (now renders with shared `views/partials/nav.ejs`)

### Teacher Pages
- `routes/teacherPagesRoutes.js`
  - `/teacher/dashboard`
  - `/teacher/classes`
  - `/teacher/classes/new`
  - `/teacher/classes/:classId`
  - `/teacher/classes/:classId/edit`
  - `/teacher/classes/:classId/students`
  - `/teacher/classes/:classId/team`
  - `/teacher/classes/:classId/announcements`
  - `/teacher/quizzes*`

### Student Web Utilities
- `routes/studentWebRoutes.js`
  - `/classrecords`, `/classrecords.html`
  - `/get-grades/:studentIDNumber`
  - `/get-courses/:studentIDNumber`
  - `/api/student/attendance`
  - `/api/student/activities`
  - `/api/student/classes`
  - `/api/student/classes/:classId`
  - `/api/log-user`

### Quizzes / Classes / Assignments
- `routes/assignmentsRoutes.js`
  - `/api/quizzes/assign`
  - `/api/assignments/*`
- `routes/classesRoutes.js`
  - `/api/classes*`
  - `/api/class-quiz*`
- `routes/teacherClassManagementApiRoutes.js`
  - `/api/teacher/classes*`
- `routes/classAnnouncementsRoutes.js`
  - `/api/classes/:classId/announcements`
  - `/api/classes/:classId/announcements/:announcementId`
  - `/api/classes/:classId/announcements/:announcementId/comments`
  - `/api/classes/:classId/announcements/:announcementId/comments/:commentId`
  - `/api/classes/:classId/announcements/:announcementId/reactions/like`
- `routes/quizManagementRoutes.js`
  - `/api/quiz-responses`
  - `/api/quizzes*` (list, create, start, save, submit, export, active, get one)
- `routes/lessonQuizRoutes.js`
  - `/api/lesson-quiz/*`

### Events / Registration / Attendance / Reports
- `routes/eventsApi.js` mounted at `/api/events`
- `routes/registerApi.js` mounted at `/api/register`
- `routes/attendanceApi.js` mounted at `/api/attendance`
- `routes/reportsApi.js` mounted at `/api`
- `routes/paymentsReportsApi.js` mounted at `/api/payments-report`
- `routes/attendanceSummaryApi.js` mounted at `/api/attendance-summary`
- `routes/byteFunRunRoutes.js` mounted at `/api`
- `routes/classRecordsRoutes.js` mounted at `/api`
- `routes/studentEthnicityRoutes.js` mounted at `/api/student-ethnicity`
- `routes/userRegisterApi.js` mounted at `/api`
- `routes/userSignInOutApi.js` mounted at `/api`
- `routes/emailApi.js` mounted at `/api`
- `routes/auditTrailApi.js` mounted at `/api`
- `routes/bulkRegisterApi.js` mounted at `/api/bulk-register`
- `routes/adminUsersRoutes.js` mounted at `/api/admin/users` (after DB connect)

### Blogs / Comments
- `routes/blogsCommentsRoutes.js` mounted at `/api`
  - `/api/comments/*`
  - `/api/blogs`

### Search / Legacy / Static
- `routes/searchRoutes.js`
  - `/api/search-records`
- `routes/legacyWebPostRoutes.js`
  - `/submit`
  - `/api/contact` (validated contact-form submit path used by the shared `/contact` page)
- `routes/staticContentRoutes.js`
  - static html shortcuts (`/blogs/:blogId`, `/events/:blogId`, etc.)
  - `/blogs/:blogId` is now only a guarded fallback for any leftover top-level legacy static blog files; the main `/blogs/` landing page and `/blogs/:category/:slug` article pages are owned by `routes/webPagesRoutes.js`
  - `/events/:blogId` now checks both `public/events/*.html` and `public/blogs/events/*.html` for any remaining unconverted legacy event files
  - `/events/css/:asset` and `/events/js/:asset` support older event detail pages that still reference legacy event-asset paths
  - `/ads.txt`
  - generic html resolver (`/:folder/:page`, then `/*`)

## Route Health Fixes Applied

- Removed duplicate owner of `/api/audit-trail` from `routes/reportsApi.js`.
  - Canonical owner is now `routes/auditTrailApi.js`.
- Reordered fallback routes in `routes/staticContentRoutes.js`.
  - `/:folder/:page` now runs before `/*` so it is reachable.
- Confirmed no direct `app.get/post/put/delete` handlers remain in `server.js`.

## Archived Legacy Routes

Archived unmounted route files were moved to `routes/_archived_unmounted/`:
- `attendanceRoutes.js`
- `blogRoutes.js`
- `classesQuizzesRoutes.js`
- `classRecordsPageRoutes.js`
- `commentRoutes.js`
- `event-reportsApi.js`
- `gradeRoutes.js`
- `gradesRoutes.js`
- `miscRoutes.js`
- `quizzesApi.js`
- `settingsApi.js`
- `teacherPages.js`

These are retained for reference only and are not active in runtime.
They are also treated as local-only legacy code and should stay excluded from GitHub via `.gitignore`.
