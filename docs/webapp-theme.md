# Web App Theme Guide

## Theme Version

- Version: `2026.03`
- Product: `HelloUniversity`
- Scope: EJS-rendered pages and remaining static `public/*.html` pages
- Source of truth for shared shell tokens: `public/css/ustyles.css`
- Shared universal app layer for non-CRFV pages: `public/css/app_theme.css`
- Feature-layer theme extensions:
  - `public/css/auth.css`
  - `public/css/admin_dashboard.css`
  - `public/css/teacher_quizzes.css`
  - `public/css/student_dashboard.css`
  - `public/css/lessons.css`
  - `public/css/search.css`
  - `public/css/about.css`
  - `public/css/contact.css`
  - `public/css/help.css`
  - `public/css/events.css`
  - `public/css/archiveDetail.css`
  - `public/css/books.css`
  - `public/css/blogsPage.css`
  - `public/css/blogDetail.css`
  - `public/css/attendance.css`
  - `public/css/privacy.css`
  - `public/css/cookie.css`
  - `public/css/terms.css`

## Brand Goals

The interface should consistently feel:
- Trustworthy
- Practical
- Student-friendly
- Institution-ready

Voice guidance:
- Clear, direct, helpful copy
- Minimal slang in system-critical workflows (auth, attendance, reports, payments)
- Prefer platform/workspace terminology over wording that implies HelloUniversity is an institution itself
- Keep public-facing copy product-oriented; do not describe databases, server behavior, or other internal implementation details on marketing/support surfaces
- Avoid defensive public copy that implies prior UX problems; describe the current user experience directly instead of contrasting it against older issues

## Auth Experience Notes

Auth pages now use a dedicated EJS-first auth layer instead of standalone static HTML files.

Current auth routes/pages:
- `/login`
- `/signup`
- `/reset-password`
- `/approval-pending`
- confirmation and resend-confirmation status pages

Auth UI rules:
- Use `public/css/auth.css` for login, signup, reset, approval, and confirmation states
- Keep auth copy explicit and low-friction
- Prioritize trust and task clarity over decorative UI
- Use the same shared app nav as the rest of the non-CRFV experience
- Keep approval and account-state pages visually consistent with login/signup

Auth product rules now reflected in the UI:
- Signup supports `student` and `teacher`
- Teacher signup creates a pending teacher-access state until admin approval
- Institution capture supports:
  - senior high school
  - college
  - university
  - `School not listed` manual fallback

## Color System (Current Production)

Core brand tokens:
- `--primary`: `#10B981`
- `--primary-dark`: `#059669`
- `--primary-light`: `#D1FAE5`
- `--accent`: `#047857`

Text and neutral tokens:
- `--text-dark`: `#1F2937`
- `--text-light`: `#6B7280`
- `--light`: `#FFFFFF`
- `--light-bg`: `#F9FAFB`
- `--border`: `#E5E7EB`

Semantic colors in active use:
- Success: `#22c55e`, `#16a34a`, `#15803d`, `#166534`
- Info/links: `#3b82f6`, `#2563eb`, `#1d4ed8`
- Error/danger: `#ef4444`, `#dc2626`

Standard gradients:
- Brand accent gradient: `linear-gradient(135deg, #10B981 0%, #047857 100%)`
- Light hero/surface gradient: `linear-gradient(135deg, #FFFFFF 0%, #D1FAE5 100%)`

## Component Theme Rules

Navigation:
- Use white or near-white background (`--light`)
- Hover and active link states should use `--primary-light` background + `--primary-dark` text
- Keep nav text on `--text-dark`
- Shared non-CRFV nav now uses:
  - two-tone `HelloUniversity` brand text
  - `hellouniversity-new-icon.webp` with aspect-ratio-preserving sizing
  - icon-first desktop navigation with hover/focus label chips
  - adaptive mobile behavior that can use inline icons or a hamburger menu depending on available width
- The shared nav is now the standard for current non-CRFV pages, including landing/home and the authenticated admin/teacher/student dashboards

Footer:
- Use brand gradient or dark-green treatment derived from `--primary` and `--accent`
- Ensure links and supporting text remain readable at AA contrast
- Footer links should use the current shared hover/focus highlight treatment instead of plain text-only color shifts

Floating utilities:
- The reusable non-CRFV scroll-up button should come from `views/partials/scrollTopButton.ejs` through `views/layouts/main.ejs`
- Shared scroll-up behavior should stay in `public/js/uscripts.js`
- Page-specific inline scroll-top buttons should be removed from pages that already render through the shared layout
- Pages can opt out only when there is a clear UI reason, by passing `showScrollTop: false`

Buttons:
- Primary CTA: `--primary` background, white text; hover to `--primary-dark`
- Secondary CTA: transparent/white background with `--primary` border and dark-green text
- Danger CTA: use red semantic palette only for destructive actions

Cards and surfaces:
- Base card background: white (`--light`)
- Secondary sections: `--light-bg`
- Borders/dividers: `--border`

Forms and inputs:
- Default border: neutral (`--border` / equivalent gray)
- Focus/active ring: blue info tone (`#3b82f6` family) or primary green, but keep one consistent per page

## Typography

- Primary family: `Poppins` for current shared pages
- Prioritize legibility over decorative styling
- Maintain clear heading hierarchy and comfortable body line length

Teacher workspace typography:
- Keep dashboard and builder headings direct, operational, and high-contrast
- Avoid playful or decorative type treatment in academic workflow pages

## UX Principles

1. Clarity first: primary actions must be obvious.
2. Role-aware UX: student, teacher, admin, and CRFV actions should be context-specific.
3. Consistency: shared nav, footer, buttons, forms, and feedback patterns.
4. Accessibility: keyboard support, semantic markup, readable contrast, descriptive labels.
5. Mobile-first reliability: all core workflows must remain usable on small screens.

## Teacher Workspace Notes

Teacher surfaces now use a dedicated visual layer in `public/css/teacher_quizzes.css`.

Current teacher direction:
- Green-led academic workspace palette
- White card surfaces over soft green-to-light backgrounds
- Strong card separation for dashboard, class-management, and quiz-builder flows
- Reusable teacher shell, page header, KPI cards, and panel patterns

Teacher UI rules:
- Use the existing teacher shell and card system before inventing one-off layouts
- Keep builder/editor pages dense enough for productivity but not visually crowded
- Use status pills consistently:
  - draft: warm amber
  - published/live: green
  - inactive/archived/closed: neutral slate
- Preserve the current toolbar, form-grid, and card-action patterns for new teacher modules
- Teacher dashboard quick links currently use:
  - icon-first menu cards
  - hover/focus label chips like the shared nav
  - a collapsible sidebar toggle pinned to the upper-right of the panel
  - compact-view behavior that keeps the panel open instead of auto-hiding its content

## Admin Workspace Notes

Admin surfaces now use `public/css/admin_dashboard.css` and should remain more operational than marketing-oriented.

Admin UI rules:
- Keep data tables, filters, and management panels visually direct
- Prefer neutral surfaces with green accents instead of decorative treatments
- Use modals and alerts sparingly and only for workflow-critical actions
- Admin dashboard now uses the shared `views/partials/nav.ejs` top navigation instead of a page-local custom header

## Student Workspace Notes

Student surfaces now use `public/css/student_dashboard.css` for the current dashboard path.

Student UI rules:
- Keep the student dashboard simpler than teacher/admin views
- Prioritize fast visibility of:
  - identity
  - current courses
  - grade summary
  - direct links to attendance, class records, and activities
- Use the shared nav/footer and shared app shell language before adding student-specific visual patterns
- Student pages should stay lighter and less tool-dense than teacher/admin workspaces
- `/attendance` now layers `public/css/attendance.css` on top of `public/css/student_dashboard.css`
- `/attendance` action tiles and overview shortcuts currently use:
  - desktop: shared icon-first controls with hover/focus label chips
  - tablet: icon-first tiles with hover/focus labels
  - mobile: compact 2-column tiles with visible inline labels for touch clarity

## Learning Content Notes

Lessons and companion-reading pages now run through the shared EJS shell instead of isolated static HTML.

Current content routes/pages:
- `/lessons`
- `/books`
- `/blogs/`
- `/blogs/:category/:slug`
- `/events`
- `/events/:slug`
- `/submissions/:slug`
- `/lessons/:track/:lesson`
- `/books/:series/:entry`
- `/search`

Content UI rules:
- Use `public/css/lessons.css` for the lessons landing/catalog experience.
- Use `public/css/blogsPage.css` for the `/blogs/` discovery page.
- Use `public/css/blogDetail.css` for shared blog article pages under `/blogs/:category/:slug`.
- Use `public/css/archiveDetail.css` for shared event-archive details and archived submission pages.
- Use `public/css/blogs.css` for legacy lesson/article bodies that still depend on the older article styling stack.
- Preserve shared nav/footer and shared app shell framing for learning pages.
- Keep lesson discovery pages task-oriented and filterable rather than long static link dumps.
- Preserve `data-blog-id` on article-style pages so shared comments/related-content scripts continue to work.

## Support Content Notes

- Public FAQ content should answer real HelloUniversity questions first:
  - what HelloUniversity is
  - who it serves
  - supported school levels
  - account access
  - student and teacher workflows
- Keep homepage and `/help` FAQ language SEO-friendly but natural; do not stuff keywords or repeat awkward phrasing
- Avoid technical wording such as database names, server-side reshuffling, storage details, or internal catalog mechanics in public FAQ/support copy
- Shared FAQ content now lives in `app/faqContent.js`
- Home (`/`) and help (`/help`) can publish `FAQPage` JSON-LD through route-level `extraHead` metadata when FAQ content is present

## CRFV Theme Notes

CRFV pages should stay visually aligned with the main product while emphasizing:
- Operational speed
- Data accuracy
- Reporting clarity
- Auditability
- CRFV explicitly opts out of the shared non-CRFV app theme layer
- Detailed CRFV migration, route, and QA notes: `docs/crfv-notes.md`

## Rebrand Notes

When touching old pages, always align:
- Product naming/logo (`HelloUniversity`)
- Official product definition: HelloUniversity is not a university itself. It is a digital academic platform designed to support school and higher education workflows such as classes, assessments, communication, and learning management.
- Prefer copy that describes HelloUniversity as a platform, workspace, or product surface rather than as a school, campus, or institution.
- For public audience sections such as `/about`, describe students, teachers, and academic teams in current-value terms; avoid phrases that suggest the platform used to be fragmented or broken.
- Canonical/domain references (`hellouniversity.online`)
- Meta descriptions and social tags
- Email and system-facing copy

## Implementation Notes (2026-03-16)

- Active pages use project CSS assets rather than CDN-driven UI frameworks.
- Non-CRFV shared pages now load `public/css/app_theme.css` through the common head partial.
- Shared nav/footer are standardized via EJS partials for consistency.
- Major authenticated dashboards are now EJS-first rather than static HTML-first.
- Teacher dashboards, class management, and quiz builder pages use `public/css/teacher_quizzes.css`.
- Admin dashboard pages use `public/css/admin_dashboard.css`.
- Student dashboard pages now use `public/css/student_dashboard.css`.
- Attendance now uses dedicated `public/css/attendance.css` on top of `public/css/student_dashboard.css` for attendance-specific layout and responsive action-tile behavior.
- Auth pages now use `public/css/auth.css` with browser code organized under `public/js/auth/`.
- Lessons catalog now uses dedicated `public/css/lessons.css` and `public/js/lessonsPage.js` instead of the older lessons landing stack.
- Search now uses dedicated `public/css/search.css` and `public/js/searchPage.js` under the shared shell.
- Event detail archives now use `views/pages/site/archiveDetail.ejs` with `public/css/archiveDetail.css` instead of the older static event/blog page stack.
- Events now use dedicated `public/css/events.css` and `public/js/eventsPage.js` under the shared shell instead of the older static landing page.
- Books now use dedicated `public/css/books.css` and `public/js/booksPage.js` for the `/books` discovery page, while `/books/:series/:entry` remains on the article-style book detail stack.
- Blogs now use dedicated `public/css/blogsPage.css` and `public/js/blogsPage.js` for the shared `/blogs/` landing page.
- Blog article pages now render through `views/pages/site/blogDetail.ejs` with `public/css/blogDetail.css` instead of serving static HTML directly from `public/blogs/<category>/*.html`.
- About now uses dedicated `public/css/about.css` under the shared shell instead of the legacy utility-only page body.
- The `/about` page now uses five canonical platform pillars plus direct audience copy for students, teachers, and academic teams without defensive wording about prior page structure.
- Contact now uses dedicated `public/css/contact.css` and `public/js/contactPage.js` under the shared shell instead of utility-only markup and the old external form-post flow.
- Help now uses dedicated `public/css/help.css` under the shared shell instead of legacy static HTML and utility-only support content.
- Home and `/help` FAQ content now share `app/faqContent.js`, with HelloUniversity-specific question sets and `FAQPage` structured data for SEO.
- Privacy Policy now uses dedicated `public/css/privacy.css` under the shared shell instead of the legacy static legal/trust page.
- Cookie Policy now uses dedicated `public/css/cookie.css` under the shared shell instead of relying on the privacy page's cookie subsection alone.
- Terms and Conditions now uses dedicated `public/css/terms.css` under the shared shell instead of the legacy static legal page.
- Book-track companion reading pages now render from `views/pages/books/*` through the shared layout instead of `public/books/*.html`.
- Shared layout body attributes support is active for lesson/book article pages so legacy `data-blog-id`-driven scripts still work.
- Shared non-CRFV pages now inherit a reusable scroll-up button from `views/layouts/main.ejs` via `views/partials/scrollTopButton.ejs`, with behavior centralized in `public/js/uscripts.js`.
- Shared-layout lesson, book, and contact pages no longer carry duplicated inline scroll-top markup.
- Legacy static auth pages (`public/login.html`, `public/signup.html`, `public/reset-password.html`) have been retired in favor of EJS routes.
- Shared nav behavior was expanded:
  - desktop: icon-first with visible label chips on hover/focus
  - mobile: adaptive inline-icons-or-hamburger approach for the shared nav
- Landing page now uses the same shared `views/partials/nav.ejs` path as the rest of the non-CRFV app
- Landing page head loading was corrected to use `/css/ustyles.css`, which keeps the skip-link hidden by default and only visible on focus
- New role-based dashboard work should inherit the universal app theme first, then extend page-specific CSS layers only where needed.
- No Tailwind CDN or Flowbite CDN dependency is required for updated pages.
