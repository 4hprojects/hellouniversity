# HelloUniversity Web App Improvement Checklist
Updated: 2026-03-26

Status legend: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`

## Rebrand Context

- This repository is a rebrand migration project to `hellouniversity.online`.
- HelloUniversity is not a university itself. It is a digital academic platform designed to support school and higher education workflows such as classes, assessments, communication, and learning management.
- All future improvements should account for domain, branding text, links, SEO metadata, email templates, and API/client base URL consistency under the new brand/domain.
- The `CRFV` area is a special service created for a special project: an event attendance monitoring system.
- Treat CRFV improvements as a dedicated track so changes do not unintentionally break its attendance/reporting workflows.

## 1) Immediate Security and Correctness

| ID | Task | Priority | Status | Owner | Success Criteria | Notes |
|---|---|---|---|---|---|---|
| SEC-01 | Enforce BYTe Fun Run cutoff on backend (`/api/bytefunrun2025`) | P1 | DONE | Codex | API rejects submissions after configured cutoff with clear message | Added server-side cutoff with `BYTE_FUNRUN_2025_CUTOFF_ISO` env override |
| SEC-02 | Enforce waiver acknowledgement and signature checks server-side | P1 | DONE | Codex | API requires waiver accepted + signature present and valid | Added waiver + signature-name match validation on backend |
| SEC-03 | Remove password debug logging from login flow | P1 | DONE | Codex | No password/hash values logged in runtime logs | Removed direct password debug log in `/login` handler |
| SEC-04 | Fix login null-user flow before password access | P1 | DONE | Codex | Invalid user returns 401/400 without runtime exceptions | Added `!user` guard before password checks/compare |
| SEC-05 | Protect secrets and credential artifacts | P1 | DONE | Codex | No plaintext service-account secrets tracked in repo; docs updated for env usage | Removed tracked `credentials/service-account.json`, added ignore rules, and documented env-only setup |

## 2) Auth and API Consistency

| ID | Task | Priority | Status | Owner | Success Criteria | Notes |
|---|---|---|---|---|---|---|
| AUTH-01 | Choose one canonical auth API (`/auth/*` vs legacy endpoints) | P1 | DONE | Codex | Single documented auth contract used by frontend and backend | Canonicalized on `/auth/*` with backward-compatible legacy aliases |
| AUTH-02 | Standardize auth check endpoint response shape | P1 | DONE | Codex | Frontend auth client works against one stable response schema | `/api/check-auth` now returns consistent JSON `{ success, authenticated, user }` |
| AUTH-03 | Standardize user details endpoint path/shape | P1 | DONE | Codex | One endpoint (`/api/user-details`) with consistent payload | Added `/api/user-details`; retained `/user-details` alias for compatibility |
| AUTH-04 | Consolidate middleware location (`middleware/` vs `middlewares/`) | P2 | DONE | Codex | One middleware source path, all imports updated | Consolidated to `middleware/`; removed duplicate `middlewares/` auth middleware |

## 3) Server Structure and Route Wiring

| ID | Task | Priority | Status | Owner | Success Criteria | Notes |
|---|---|---|---|---|---|---|
| STR-01 | Split `server.js` into bootstrap + feature route modules | P2 | DONE | Codex | `server.js` reduced significantly and only wires app setup | Completed bootstrap decomposition via `app/configureSession.js`, `app/database.js`, `app/registerRoutes.js`, and `app/registerErrorHandlers.js` |
| STR-02 | Remove duplicate middleware registrations | P2 | DONE | Codex | `express.json`, static middleware, and major mounts registered once | Consolidated into `configureCoreMiddleware(app, __dirname)` |
| STR-03 | Remove duplicate route mounts/handlers | P2 | DONE | Codex | Each API route mounted once; no shadowed handlers | Includes reports/events/fun-run patterns |
| STR-04 | Audit unused route files and either mount or remove | P3 | TODO | Unassigned | No dead route modules without purpose | Add route map in docs |

## 4) Reliability and Developer Experience

| ID | Task | Priority | Status | Owner | Success Criteria | Notes |
|---|---|---|---|---|---|---|
| DX-01 | Fix test toolchain (`jest` install/config) | P2 | DONE | Codex | `npm test` runs successfully in local dev | Jest config/scripts active; smoke suite runs cleanly |
| DX-02 | Add API smoke tests (auth, session, fun-run submit guard) | P2 | DONE | Codex | At least 3 passing smoke tests | Smoke suite expanded and passing (16 tests) |
| DX-03 | Add lint/format tooling and scripts | P3 | TODO | Unassigned | Consistent formatting and lint checks available | Add optional pre-commit later |
| DX-04 | Add startup env validation | P2 | DONE | Codex | App fails fast with clear missing-env messages | Implemented in `app/validateEnv.js` and called at startup |

## 5) Product and Data Quality

| ID | Task | Priority | Status | Owner | Success Criteria | Notes |
|---|---|---|---|---|---|---|
| PROD-01 | Move hardcoded event IDs/dates/strings to config/env | P3 | TODO | Unassigned | Event behavior configurable without code edits | Includes spreadsheet IDs/dates |
| PROD-02 | Standardize request validation strategy across routes | P3 | TODO | Unassigned | Shared validation approach used in key endpoints | Reduce inconsistent checks |
| PROD-03 | Normalize audit trail logging patterns | P3 | TODO | Unassigned | Sensitive endpoints produce consistent audit records | Align Mongo/Supabase logging intent |

## 6) Frontend Consistency

| ID | Task | Priority | Status | Owner | Success Criteria | Notes |
|---|---|---|---|---|---|---|
| UI-01 | Remove Tailwind CDN/Flowbite from active pages and standardize CSS includes | P2 | DONE | Codex | No `cdn.tailwindcss.com` or Flowbite CDN refs in `public/*.html`; shared CSS-first pattern in place | Completed with `/dist/output.css` + existing project CSS; validated by repo grep |

## Current Sprint Candidates (Recommended)

| ID | Task | Status |
|---|---|---|
| STR-04 | Audit unused route files and either mount or remove | TODO |
| DX-03 | Add lint/format tooling and scripts | TODO |
| PROD-02 | Standardize request validation strategy across routes | TODO |

## Change Log

- 2026-02-27: Initial checklist created from analysis findings.
- 2026-02-27: Added potential feature refinement list for roadmap planning.
- 2026-02-27: Migrated home, lessons index, teacher dashboard, and error pages to shared EJS layout.
- 2026-02-27: Migrated `about`, `contact`, and authenticated `activities` to shared EJS layout.
- 2026-02-27: Batch-migrated lessons (`mst24`, `it114`, `node`, `java`, `dsalgo`, `mini`) from static HTML to EJS views.
- 2026-02-27: Removed duplicated legacy lesson HTML files and cleaned confirmed unused HTML artifacts.
- 2026-02-27: Completed security sprint items `SEC-01` to `SEC-04` (backend cutoff, waiver/signature backend enforcement, login debug log removal, null-user guard).
- 2026-02-27: Completed `SEC-05` by removing tracked service-account credential file, adding credential ignore rules, and documenting env-based secret setup.
- 2026-02-27: Completed `AUTH-01` to `AUTH-03` by canonicalizing auth routes, standardizing `/api/check-auth`, and introducing `/api/user-details` with compatibility aliases.
- 2026-02-27: Completed `STR-02` by deduplicating core middleware and centralizing setup in `app/setupCoreMiddleware.js`; started `STR-01`.
- 2026-02-27: Continued `STR-01` by extracting home/about/contact/lessons page-render routes into `routes/webPagesRoutes.js` and mounting them in `server.js`.
- 2026-02-27: Continued `STR-01` by extracting auth/session web routes into `routes/authWebRoutes.js` (`/login`, `/auth/login`, logout aliases, `/session-check`, `/api/check-auth`, `/user-details`, `/api/user-details`) and removing inline duplicates from `server.js`.
- 2026-02-27: Continued `STR-01` by extracting student-facing routes into `routes/studentWebRoutes.js` (`/classrecords(.html)`, `/get-grades/:studentIDNumber`, `/get-courses/:studentIDNumber`, `/api/log-user`) and removing inline duplicates from `server.js`.
- 2026-02-27: Continued `STR-01` by extracting student page routes into `routes/studentPagesRoutes.js` (`/dashboard`, `/attendance`, `/activities`) and removing inline duplicates; fixed latent `renderBodyInMainLayout` reference risk in `server.js`.
- 2026-02-27: Continued `STR-01` by extracting `/search` into `routes/searchRoutes.js` and removing the inline search handler from `server.js`.
- 2026-02-27: Continued `STR-01` by extracting `/api/bytefunrun2025` into `routes/byteFunRunRoutes.js` (including cutoff + waiver/signature validation parity) and removing inline handler + related Google service-account setup from `server.js`.
- 2026-02-27: Continued `STR-01` by mounting existing `routes/classRecordsRoutes.js` for `/api/getClassRecordFromSheet` and `/api/getClassRecordFromMasterList`, then removing inline duplicate handlers and direct utility imports from `server.js`.
- 2026-02-27: Continued `STR-01` by extracting legacy `/submit` and `/api/contact` into `routes/legacyWebPostRoutes.js`, removing inline duplicates from `server.js`, and removing the redundant inline `POST /api/register` in favor of mounted `routes/registerApi.js`.
- 2026-02-27: Advanced `STR-03` by removing duplicate route mounts in `server.js` (`reportsApi` inline require duplicate, `eventsApi` duplicate require mount, and redundant `/api` mount for `paymentsReportsApi` while keeping canonical `/api/payments-report`).
- 2026-02-27: Advanced `STR-03` by removing overlapping `GET /api/events` from `routes/reportsApi.js` so `eventsApi` is the sole owner; added frontend compatibility parsing in `public/crfv/js/reports.js` for `{ events: [...] }` vs `[...]` payloads.
- 2026-02-27: Advanced `STR-03` by cleaning `routes/eventsApi.js`: removed duplicate `GET /` handler, removed stray browser-only table-render function from server route file, and guarded `GET /:id` to pass through `/today` to avoid route shadowing.
- 2026-02-27: Advanced `STR-03` by de-conflicting quiz submit endpoints: kept canonical `POST /api/quizzes/:quizId/attempts/:attemptId/submit` in `server.js`, removed overlapping handlers from `routes/classesQuizzesRoutes.js` and `routes/quizzesApi.js`, and removed an accidental module-scope `fetch(...)` snippet from `routes/quizzesApi.js`.
- 2026-02-27: Continued `STR-01` by mounting `routes/assignmentsRoutes.js` after DB connection and removing inline assignment endpoints from `server.js` (`POST /api/quizzes/assign`, `GET /api/assignments/class/:classId`, `GET /api/assignments/student`, `DELETE /api/assignments/:assignmentId`, `PUT /api/assignments/:assignmentId`); also declared `classQuizCollection` explicitly.
- 2026-02-27: Continued `STR-01` by extracting class-related endpoints into `routes/classesRoutes.js` (`/api/classes`, `/api/classes/generate-code`, `/api/classes/upload-temp-students`, `/api/class-quiz`, `/api/classes/:classId/students`, `/api/classes/join`, compatibility `/api/classes/:classId/enroll`) and removing inline duplicates from `server.js`; fixed broken join/enroll inline logic during extraction.
- 2026-02-27: Continued `STR-01` by extracting quiz-management endpoints into `routes/quizManagementRoutes.js` (`/api/quiz-responses`, `/api/quizzes`, `/api/quizzes/:quizId/start`, `/api/quizzes/:quizId/attempts/:attemptId`, `/api/quizzes/:quizId/attempts/:attemptId/submit`, `/api/quizzes/:quizId/export`, `/api/quizzes/:quizId/active`, `/api/quizzes/:quizId`) and removing inline duplicates from `server.js`; fixed known start/partial-save defects during extraction.
- 2026-02-27: Continued `STR-01` by extracting password recovery endpoints into `routes/passwordResetRoutes.js` (`/send-password-reset`, `/verify-reset-code`, `/reset-password`) and removing inline duplicates from `server.js`.
- 2026-02-27: Continued `STR-01` by extracting admin grades upload into `routes/adminGradesRoutes.js` (`/upload-grades`) and reusing `routes/blogsCommentsRoutes.js` for comment/blog API (`/api/comments*`, `/api/blogs`), then removing corresponding inline route blocks and parser/limiter helpers from `server.js`.
- 2026-02-27: Continued `STR-01` by extracting static content/file-serving routes into `routes/staticContentRoutes.js` (`/blogs/:blogId`, lesson/event/book html shortcuts, `/blogs/tech-comparison/:slug`, `/ads.txt`, and generic html catch-all resolvers), removing inline duplicates from `server.js`.
- 2026-02-27: Continued `STR-01` by extracting `/admin_dashboard` into `routes/adminPagesRoutes.js` and removing the inline page handler from `server.js`.
- 2026-02-27: Continued `STR-01` by extracting `/api/config` into `routes/configRoutes.js`; `server.js` now acts as bootstrap/wiring only with no direct `app.get/post/put/delete` handlers.
- 2026-02-28: Performed route health pass (`STR-03`): removed duplicate `/api/audit-trail` owner from `routes/reportsApi.js`, fixed static fallback route precedence in `routes/staticContentRoutes.js`, and added `docs/route-map.md` with mount ownership + cleanup candidates.
- 2026-02-28: Archived unmounted legacy route modules to `routes/_archived_unmounted/` (`classesQuizzesRoutes`, `quizzesApi`, `commentRoutes`, `blogRoutes`, `teacherPages`, `attendanceRoutes`, `gradeRoutes`, `gradesRoutes`, `classRecordsPageRoutes`, `event-reportsApi`, `settingsApi`, `miscRoutes`) after reference audit.
- 2026-02-28: Completed `DX-04` baseline by adding startup env validation (`app/validateEnv.js`) and enforcing fail-fast checks in `server.js` before route initialization.
- 2026-02-28: Completed `AUTH-04` by consolidating auth middleware to `middleware/` and removing duplicate `middlewares/` implementation.
- 2026-02-28: Continued `STR-01` cleanup by moving auth guards out of `server.js` to `middleware/routeAuthGuards.js` and removing dead inline helpers/imports.
- 2026-02-28: Started Batch 2 rebrand/runtime updates by introducing `utils/publicBaseUrl.js` and replacing active hardcoded legacy-domain links in `signupApi`, `resendConfirmationApi`, `byteFunRunRoutes`, and `userRegisterApi`.
- 2026-02-28: Started `DX-01`/`DX-02` by adding Jest scaffolding (`jest.config.js`, `test:smoke`) and initial smoke tests under `tests/smoke/` for env validation and auth guards.
- 2026-02-28: Continued lessons stabilization by removing legacy static lesson shortcuts from `routes/staticContentRoutes.js` and introducing manifest-backed lesson metadata via `app/lessonMeta.js` in `routes/webPagesRoutes.js`.
- 2026-02-28: Refined lessons content baseline by rebranding all `views/pages/lessons/*` links to `hellouniversity.online`, expanding `/lessons` index coverage (Java 6-12, Node 7, DSAlgo set, Mini algo-flowchart), and adding additional key lesson metadata entries in `app/lessonMeta.js`.
- 2026-02-28: Normalized lesson-to-lesson links in `views/pages/lessons/*` from legacy `/blogs/*` lesson slugs to canonical `/lessons/:track/:lesson` routes (including IT114 and MST24 legacy slug variants), while retaining non-lesson blog references.
- 2026-02-28: Standardized remaining lesson-template blog links from absolute domain URLs to relative `/blogs/...` paths for routing consistency across environments.
- 2026-02-28: Removed `target="_blank"` from internal relative lesson/blog/book links in `views/pages/lessons/*` to keep in-app navigation within the same tab while preserving external link behavior.
- 2026-02-28: Ran lessons internal-link QA audit and bulk-fixed broken legacy references (63 -> 1 remaining); audit report saved at `docs/reports/lessons-link-audit.md`.
- 2026-02-28: Resolved the final lessons-link audit issue in `views/pages/lessons/java/lesson2_.ejs` by mapping the missing blog reference to an existing lesson route; latest lessons audit now reports 0 broken internal links.
- 2026-02-28: Removed legacy `public/lessons/` directory after EJS migration completion; lessons now source from `views/pages/lessons/` and remaining links were updated to `/lessons`.
- 2026-02-28: Completed large-scale frontend consistency pass across `views/` and active `public/` pages: removed Tailwind CDN/Flowbite usage, standardized CSS-first includes, and aligned landing/shared navigation/footer patterns.
- 2026-02-28: Consolidated shared footer usage for consistency via `views/partials/footerContent.ejs`, with both home and app partials consuming the same footer content.
- 2026-02-28: Completed runtime verification after UI migration: `npm test` passing (5 suites, 16 tests), with one observed transient timeout on `mutationRouteGuards` resolved on rerun.
- 2026-02-28: Finished `public` HTML CDN cleanup baseline: `rg` check now reports 0 Tailwind/Flowbite CDN refs in `public/*.html`.
- 2026-03-12: Completed production-hardening baseline by moving session setup to `app/configureSession.js` (secure-cookie defaults, trusted proxy support), enabling CSP rollout support in `app/setupCoreMiddleware.js` (`ENABLE_CSP`, `CSP_REPORT_ONLY`), and finishing `STR-01` server decomposition with modular route/database/error bootstraps.
- 2026-03-12: Added explicit production security validation in `app/validateEnv.js` (requires `TRUST_PROXY`, `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAMESITE`, `ENABLE_CSP`, `CSP_REPORT_ONLY` when `NODE_ENV=production`), added `.env.production.example`, and expanded env documentation.
- 2026-03-15: Converted the main auth experience from static HTML to EJS (`/login`, `/signup`, `/reset-password`, approval pending, confirmation/resend states), organized auth browser code under `public/js/auth/`, introduced shared `public/css/auth.css`, and removed retired static auth pages.
- 2026-03-15: Expanded signup to support `student` vs `teacher`, institution type capture, searchable institution directory with `School not listed`, and safe pending-teacher signup state (`teacher_pending`) with role-aware redirect to `/approval-pending`.
- 2026-03-15: Expanded the shared non-CRFV nav with icon-first desktop behavior, adaptive mobile inline-icons-or-hamburger behavior, two-tone branding, and shared-logo updates; migrated the admin dashboard onto the shared nav.
- 2026-03-15: Refined teacher dashboard sidebar behavior with icon-first quick links, hover/focus label chips, upper-right toggle positioning, and compact-view open-state improvements.
- 2026-03-15: Fixed landing-page shared stylesheet loading to `/css/ustyles.css`, restoring correct skip-link behavior on the home page.
- 2026-03-15: Migrated the landing page to the shared `views/partials/nav.ejs` path so home now follows the same non-CRFV nav system as the rest of the app.
- 2026-03-15: Migrated `/dashboard` from static `public/dashboard.html` to EJS student dashboard rendering with shared nav, dedicated `public/js/studentDashboard.js`, and `public/css/student_dashboard.css`.
- 2026-03-16: Migrated `/search` from legacy `public/search.html` to shared-layout EJS with dedicated `public/css/search.css`, `public/js/searchPage.js`, `/search.html` redirect handling, and CSP allowance for Google CSE; the old record-search endpoint now lives at `/api/search-records`.
- 2026-03-16: Migrated `/help` from legacy `public/help.html` to shared-layout EJS with dedicated `public/css/help.css`, refreshed support content, `/help.html` redirect handling, and removal of the stale static help page.
- 2026-03-16: Migrated `/privacy-policy` from legacy `public/privacy-policy.html` to shared-layout EJS with dedicated `public/css/privacy.css`, refreshed notice structure, `/privacy-policy.html` redirect handling, and removal of the stale static privacy page.
- 2026-03-16: Added `/cookie-policy` as a shared-layout EJS trust page with dedicated `public/css/cookie.css`, `/cookie-policy.html` redirect handling, shared footer links, and cross-links from the privacy notice.
- 2026-03-16: Migrated `/terms-and-conditions` from legacy `public/terms-and-conditions.html` to shared-layout EJS with dedicated `public/css/terms.css`, refreshed legal/use structure, `/terms-and-conditions.html` redirect handling, and removal of the stale static terms page.
- 2026-03-16: Migrated `/events` from the legacy static landing pages (`public/events.html` and `public/events/events.html`) to shared-layout EJS with dedicated `public/css/events.css`, `public/js/eventsPage.js`, redirect handling for stale landing paths, and fallback routing for older `/events/:slug` detail pages across both legacy event directories.
- 2026-03-16: Migrated the main published `/events/:slug` detail pages to shared-layout archive rendering via `views/pages/site/archiveDetail.ejs` and `public/css/archiveDetail.css`, cleaned legacy event content/results copy, and moved the non-event `it114finalproject2025` page to `/submissions/it114finalproject2025`.
- 2026-03-16: Added a real `/books` discovery page with dedicated `public/css/books.css`, `public/js/booksPage.js`, `/books.html` redirect handling, `/books/:series` anchor redirects, and centralized book-series metadata in `app/bookMeta.js` for both the landing page and detail-route meta.
- 2026-03-16: Migrated the `/blogs/` landing page from legacy `public/blogs/index.html` to shared-layout EJS via `views/pages/site/blogs.ejs`, added `app/blogCatalog.js`, `public/css/blogsPage.css`, and `public/js/blogsPage.js`, preserved old `/blog` and uncategorized blog-slug redirects, and archived the retired static landing page under `legacy/migrated-html/blogs/`.
- 2026-03-16: Migrated blog article pages under the former `public/blogs/tech/*.html`, `public/blogs/gen/*.html`, and `public/blogs/finance/*.html` trees to shared-layout `/blogs/:category/:slug` rendering via `views/pages/site/blogDetail.ejs`, `public/css/blogDetail.css`, `app/blogDetailContent.js`, and archived the raw HTML source directories under `legacy/migrated-html/blogs/`; old `/blogs/events/:slug` links now redirect into the shared `/events/:slug` archive routes.
- 2026-03-16: Refined `/contact` into a dedicated shared-layout support page with `public/css/contact.css`, `public/js/contactPage.js`, `/contact.html` redirect handling, and a validated in-app `/api/contact` submit path instead of the older bare utility-only form and external-post flow.
- 2026-03-16: Rebuilt `/lessons` as a data-driven EJS catalog backed by `app/lessonsCatalog.js`, with dedicated `public/css/lessons.css`, `public/js/lessonsPage.js`, grouped learning tracks, featured lessons, searchable/filterable discovery, and a reorganized `More Insights` companion-reading panel.
- 2026-03-16: Migrated the remaining book-track learning content from `public/books/*` into `views/pages/books/*`, added `app/bookMeta.js`, and introduced shared-layout `/books/:series/:entry` EJS rendering plus `.html` redirects.
- 2026-03-16: Extended `views/layouts/main.ejs` with optional `bodyAttributes` so lesson and book pages can preserve `data-blog-id` hooks for shared article/comment scripts under the common shell.
- 2026-03-16: Added a reusable non-CRFV shared-layout scroll-up button via `views/partials/scrollTopButton.ejs`, centralized its behavior in `public/js/uscripts.js`, and removed duplicated inline scroll-to-top buttons from shared-layout lesson, book, and contact pages.
- 2026-03-16: Refined `/attendance` as a shared student page with dedicated `public/css/attendance.css` layered over `public/css/student_dashboard.css`, plus attendance-specific responsive icon-tile behavior for hero actions and overview shortcuts across desktop, tablet, and mobile.
- 2026-03-16: Completed a second-pass `/attendance` polish with clearer loading/error/empty states, tablet-visible action labels, shared student-shell nav context, and smoke coverage for the student attendance page.
- 2026-03-16: Rebuilt `/activities` as a shared student page with `public/css/activities.css`, `public/js/activities.js`, `/activities.html` redirect handling, grouped class/activity discovery, student-shell nav integration, and smoke coverage.
- 2026-03-16: Added `/api/student/activities` to `routes/studentWebRoutes.js` so student activities load from assigned classes, quizzes, and attempts with status-aware summaries.
- 2026-03-16: Marked `legacy/` and `routes/_archived_unmounted/` as local-only legacy references in `.gitignore` so migrated/archive code does not get included in future GitHub pushes.
- 2026-03-17: Retired the old static footer fragment by replacing `fetch('/footer.html')` with `fetch('/footer-fragment')` in `public/js/uscripts.js`, adding `/footer-fragment` in `routes/webPagesRoutes.js`, and treating `views/partials/footerContent.ejs` as the only live shared footer source.
- 2026-03-17: Archived the remaining root and `public/` HTML files into `legacy/`, completing the repository-side static HTML retirement pass; any still-needed behaviors now require explicit EJS pages or route-backed fragments rather than relying on leftover `public/*.html` files.
- 2026-03-26: Updated the teacher quiz builder so class selection is optional across create/edit/publish flows, and `short_answer` / `paragraph` questions can keep accepted answers blank for manual-review authoring; refreshed the related builder notes and smoke coverage references.
- 2026-03-26: Updated public-site branding copy and the related notes so HelloUniversity is consistently described as a digital academic platform for school and higher education workflows, not a university itself.
- 2026-03-26: Reworked homepage and help-page FAQs into HelloUniversity-specific, SEO-friendly question sets backed by `app/faqContent.js`, added `FAQPage` structured data on `/` and `/help`, and removed implementation-heavy public copy from the learning section.
- 2026-03-26: Updated `/about` so its core pillars follow the canonical five-pillar model and its audience copy for students, teachers, and academic teams stays direct, role-aware, and free of defensive wording.
- 2026-03-26: Added a short release summary for this push in `docs/reports/release-note-2026-03-26.md`.

## Migration Progress (Completed)

### Shared Layout and Partials
- `views/layouts/main.ejs` is active for migrated pages.
- Shared partials in use: `views/partials/head.ejs`, `views/partials/nav.ejs`, `views/partials/footer.ejs`.

### EJS Routes Now Active
- `/` (home)
- `/dashboard` (student dashboard)
- `/attendance` (authenticated)
- `/search`
- `/help`
- `/privacy-policy`
- `/terms-and-conditions`
- `/events`
- `/events/:slug`
- `/submissions/:slug`
- `/blogs` and `/blogs/`
- `/blogs/:category/:slug`
- `/lessons` and `/lessons/index`
- `/books`
- `/lessons/:track/:lesson` (generic EJS lesson rendering if template exists)
- `/books/:series/:entry`
- `/about`
- `/contact`
- `/activities` (authenticated)
- Error pages: `403`, `404`, `500` render from EJS

### Lessons Migration Status
- Migrated tracks: `mst24`, `it114`, `node`, `java`, `dsalgo`, `mini`
- Migrated companion reading/book tracks: `7-habits`, `the-way-of-the-shepherd`
- Source lesson HTML duplicates removed from `public/lessons/<track>/`
- Current lesson templates live under `views/pages/lessons/<track>/`
- Current book-reading templates live under `views/pages/books/<series>/`

### Cleanup Status
- Removed confirmed-unused legacy HTML artifacts (old/copy/template/backup files previously identified in `public/`).
- Kept intentional special-service areas (notably `public/crfv/*`) unless explicitly migrated/removed.
- Local-only migration/archive references remain under `legacy/` and `routes/_archived_unmounted/` for fallback reference, but they are not active runtime code.
- Post-archive follow-up still needed: replace stale runtime assumptions that referenced archived static files, especially `/classrecords`, legacy quiz list/take paths, and old header/partial fragment fetches that formerly targeted `public/*.html`.

## Potential Features To Refine

1. Unified authentication experience:
Single login flow, clearer role-based redirects (student/teacher/admin/CRFV manager), better session timeout UX.

2. Role-based dashboards:
Purpose-built dashboards per role with quick actions, pending items, and alerts.

3. Quiz and assignment lifecycle:
Better scheduling, draft/publish states, attempt analytics, late-submission handling, and export quality.

4. Class management:
Cleaner class creation/join flows, roster import validation, and student status tracking.

5. Gradebook and performance analytics:
Per-student trends, class-level insights, and downloadable reports with consistent formatting.

6. Event registration system:
Server-enforced cutoff/waiver rules, waitlist support, duplicate-checking, and automated confirmations.

7. CRFV attendance monitoring (special service):
Faster check-in/check-out, QR reliability, attendance anomaly detection, and stronger reporting filters.

8. CRFV reporting and audit trail:
Unified event/payment/attendance reports, audit log search, and export-ready summaries.

9. Content platform (blogs/lessons/events pages):
Editor workflow, SEO consistency, internal linking, and reusable content templates.

10. Notification system:
Centralized email/SMS/in-app notifications for resets, assignments, event reminders, and attendance updates.

11. Search and discovery:
Smarter search across lessons, blogs, events, and classes with tags/categories.

12. Admin controls and governance:
Better user provisioning, permissions matrix, account lockout controls, and security policies.

13. API consistency and validation:
Standard response schema, shared validators, better error messages, and API docs.

14. Rebrand readiness (HelloUniversity):
Global domain/link replacement, branding assets, metadata updates, and redirect strategy.

15. Reliability and developer tooling:
Working tests, CI checks, env validation, and modularized server structure for safer releases.

## Target Directory (EJS Migration)

```txt
/ (project root)
  /src
    /app
      app.js
      server.js
      routes.js
    /config
      env.js
      db.js
      session.js
      constants.js
    /middleware
      auth.js
      roles.js
      errorHandler.js
      notFound.js
      rateLimit.js
    /controllers
      auth.controller.js
      dashboard.controller.js
      blog.controller.js
      events.controller.js
      quizzes.controller.js
      crfv.controller.js
    /services
      auth.service.js
      email.service.js
      events.service.js
      quiz.service.js
      crfv.service.js
      sheets.service.js
      supabase.service.js
    /repositories
      user.repo.js
      quiz.repo.js
      class.repo.js
      event.repo.js
      crfv.repo.js
    /validators
      auth.validator.js
      event.validator.js
      quiz.validator.js
      crfv.validator.js
    /utils
      logger.js
      date.js
      format.js
  /views
    /layouts
      main.ejs
      auth.ejs
      admin.ejs
      crfv.ejs
    /partials
      head.ejs
      header.ejs
      footer.ejs
      nav.ejs
      scripts.ejs
      alerts.ejs
    /pages
      /home
        index.ejs
      /auth
        login.ejs
        signup.ejs
        reset-password.ejs
      /dashboard
        student.ejs
        teacher.ejs
        admin.ejs
      /blogs
        index.ejs
        detail.ejs
      /events
        list.ejs
        detail.ejs
        bytefunrun2025.ejs
      /lessons
        list.ejs
        detail.ejs
      /crfv
        index.ejs
        attendance.ejs
        reports.ejs
        event-create.ejs
        payment-reports.ejs
      /errors
        403.ejs
        404.ejs
        500.ejs
  /public
    /assets
      /css
      /js
      /images
      /fonts
  /routes
    web.routes.js
    api.routes.js
    auth.routes.js
    crfv.routes.js
  /docs
  /tests
    /unit
    /integration
```
