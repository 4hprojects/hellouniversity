# CSS Audit

Updated: 2026-03-16

## Purpose

This note maps the CSS currently used across the HelloUniversity web app and gives a practical recommendation for each file:

- `Keep`
- `Merge`
- `Remove later`
- `Legacy / isolate`

Scope:

- Main web app
- Teacher/admin/student pages
- Static public pages
- `/crfv` excluded from the shared-theme recommendation, but noted where relevant

## Active CSS Layering

### Non-CRFV shared stack

Most modern EJS pages now load:

1. [ustyles.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/ustyles.css)
2. [app_theme.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/app_theme.css)
3. page-specific CSS such as:
   - [teacher_quizzes.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/teacher_quizzes.css)
   - [admin_dashboard.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/admin_dashboard.css)
   - [student_dashboard.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/student_dashboard.css)
   - [lessons.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/lessons.css)
   - [search.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/search.css)
   - [events.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/events.css)
   - [archiveDetail.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/archiveDetail.css)
   - [books.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/books.css)
   - [blogsPage.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/blogsPage.css)
   - [blogDetail.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/blogDetail.css)
   - [attendance.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/attendance.css)
   - [about.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/about.css)
   - [contact.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/contact.css)
   - [help.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/help.css)
   - [privacy.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/privacy.css)
   - [cookie.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/cookie.css)
   - [terms.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/terms.css)
   - [blogs.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/blogs.css)

### CRFV stack

CRFV uses its own route-mounted CSS and explicitly opts out of `app_theme.css`.

## Audit Table

| File | Current Usage | Current Role | Recommendation |
|---|---|---|---|
| [ustyles.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/ustyles.css) | Loaded globally by [head.ejs](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/views/partials/head.ejs); also directly linked by many static HTML pages | Legacy global base: tokens, nav, footer, shared scroll-top utility, landing-page sections, utilities, mixed old rules | `Keep for now`, then split. This is still the backbone, but it is too broad to remain the long-term source of truth. |
| [app_theme.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/app_theme.css) | Loaded globally for non-CRFV EJS pages by [head.ejs](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/views/partials/head.ejs) | New universal non-CRFV shell layer based on landing-page language, including shared-nav polish | `Keep and expand`. This should become the real shared app theme. |
| [auth.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/auth.css) | Used by EJS auth pages under [views/pages/auth/](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/views/pages/auth) | Shared auth UI layer for login/signup/reset/approval/confirmation flows | `Keep`. This is now the canonical auth stylesheet. |
| [teacher_quizzes.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/teacher_quizzes.css) | Used by all current teacher EJS routes in [teacherPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/teacherPagesRoutes.js) | Teacher workspace layout and feature UI | `Keep`, but gradually reduce duplicated tokens and body-level theme rules. |
| [admin_dashboard.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/admin_dashboard.css) | Used by [views/pages/admin/dashboard.ejs](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/views/pages/admin/dashboard.ejs); also linked by old [public/admin_dashboard.html](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/admin_dashboard.html) | Admin workspace styling under the shared top nav | `Keep`, but align to shared tokens and eventually retire the old static admin HTML page. |
| [student_dashboard.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/student_dashboard.css) | Used by [views/pages/student/dashboard.ejs](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/views/pages/student/dashboard.ejs) | Student dashboard layout and grade-summary UI | `Keep`. This is the new canonical student dashboard layer. |
| [lessons.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/lessons.css) | Used by the lessons catalog route in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated lessons discovery/catalog shell aligned with the shared app theme | `Keep`. This is the canonical lessons landing stylesheet. |
| [search.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/search.css) | Used by the shared-layout search page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated site-search page layer around Google CSE results | `Keep`. This is the canonical search page stylesheet. |
| [events.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/events.css) | Used by the shared-layout events page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated event archive/discovery page layer aligned with the shared app shell | `Keep`. This is the canonical events landing stylesheet. |
| [archiveDetail.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/archiveDetail.css) | Used by shared event-detail and archived-submission routes in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Shared archive/detail page layer for cleaned event pages and archived submission content | `Keep`. This is now the canonical detail-page stylesheet for event archives outside the blog/article stack. |
| [books.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/books.css) | Used by the shared-layout books page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated companion-reading discovery page aligned with the shared app shell | `Keep`. This is the canonical books landing stylesheet. |
| [blogsPage.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/blogsPage.css) | Used by the shared-layout blogs page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated blog discovery/catalog page layer aligned with the shared app shell | `Keep`. This is the canonical `/blogs/` landing stylesheet. |
| [blogDetail.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/blogDetail.css) | Used by shared blog-detail routes in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Shared article wrapper for migrated `/blogs/:category/:slug` pages | `Keep`. This is the canonical blog-detail stylesheet. |
| [about.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/about.css) | Used by the shared-layout about page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated trust/about page layer aligned with the shared app shell | `Keep`. This is the canonical about page stylesheet. |
| [contact.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/contact.css) | Used by the shared-layout contact page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated contact/support page layer aligned with the shared app shell | `Keep`. This is the canonical contact page stylesheet. |
| [help.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/help.css) | Used by the shared-layout help page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated support/help-center page layer aligned with the shared app shell | `Keep`. This is the canonical help page stylesheet. |
| [privacy.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/privacy.css) | Used by the shared-layout privacy policy page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated privacy/trust page layer aligned with the shared app shell | `Keep`. This is the canonical privacy policy stylesheet. |
| [cookie.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/cookie.css) | Used by the shared-layout cookie policy page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated cookie/trust page layer aligned with the shared app shell | `Keep`. This is the canonical cookie policy stylesheet. |
| [terms.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/terms.css) | Used by the shared-layout terms page in [webPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/webPagesRoutes.js) | Dedicated terms/legal page layer aligned with the shared app shell | `Keep`. This is the canonical terms stylesheet. |
| [index.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/index.css) | Still used by some legacy/static landing-style pages, but no longer by `/lessons` | Older marketing/landing page styling bundle | `Reduce over time`. Do not treat this as the lessons stylesheet anymore. |
| [blogs.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/blogs.css) | Used by lesson/article pages and some remaining static content pages | Content/article layout system | `Keep`. This remains a legitimate content-specific layer, but it is no longer the canonical stylesheet for migrated `/blogs/:category/:slug` pages. |
| `login.css` | Retired with static auth pages | Old login-only styling | `Removed`. Replaced by `auth.css`. |
| `signup.css` | Retired with static auth pages | Old signup-only styling | `Removed`. Replaced by `auth.css`. |
| `reset-password.css` | Retired with static auth pages | Old reset-password styling | `Removed`. Replaced by `auth.css`. |
| [attendance.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/attendance.css) | Used by the shared-layout attendance route in [studentPagesRoutes.js](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/routes/studentPagesRoutes.js) and [views/pages/student/attendance.ejs](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/views/pages/student/attendance.ejs) | Attendance-specific student page layer: records layout, filters, table styling, and responsive action/overview tile behavior layered on top of `student_dashboard.css` | `Keep`. This is the canonical attendance page stylesheet. |
| [view_styles.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/view_styles.css) | Used by [public/view_class.html](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/view_class.html) | Old class-view page styling | `Legacy / likely merge`. Only keep if that page is still a live workflow. |
| [view_quizzes.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/view_quizzes.css) | Used by [public/view_quizzes.html](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/view_quizzes.html) | Old quiz viewer page styling | `Legacy / likely merge`. Very narrow file; probably better folded into the replacement page when retired. |
| [lesson.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/lesson.css) | No clear active route hit found in current EJS routing | Likely old lesson-specific styling | `Audit for live usage, then merge or remove`. |
| [styles.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/styles.css) | No clear active inclusion found in current route/view scan | Generic legacy stylesheet | `Remove later` after confirming no off-route static page depends on it. |
| [footer.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/footer.css) | No clear active inclusion found in current route/view scan | Old footer-specific styling | `Merge or remove`. Footer styles now largely belong in shared global CSS. |
| [uheader.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/uheader.css) | Still referenced by some legacy static article pages | Old blog-header customization | `Legacy / isolate`. The old static `/blogs/` landing page is retired, so this should not be expanded further. |
| [header-blogs.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/header-blogs.css) | Still referenced by some static blog/article pages | Blog header variation layer | `Keep short-term`, then retire as article pages move off the static stack. |
| [quiz.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/quiz.css) | No clear active inclusion found in current route/view scan | Older quiz page styling | `Legacy / likely remove later`. |
| [lessons_.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/lessons_.css) | No clear active inclusion found | Old or experimental lesson stylesheet | `Remove later` unless a hidden page still depends on it. |
| [2025BYTeFunRun.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/2025BYTeFunRun.css) | No clear inclusion found in current route/view scan | Event-specific one-off | `Legacy / isolate`. Keep only if event page still uses it. |
| [funrunregistration.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/funrunregistration.css) | No clear inclusion found in current route/view scan | Event registration one-off | `Legacy / isolate`. |

## Key Findings

### 1. `ustyles.css` is overloaded

It currently contains:

- design tokens
- shared nav/footer
- landing-page sections
- utility classes
- some compatibility CSS for older pages

That makes it too large and too ambiguous to serve as a clean long-term foundation.

### 2. `app_theme.css` is the right new center

This is the cleanest place to centralize:

- app shell backgrounds
- shared panel/card feel
- shared page-header styling
- universal non-CRFV visual language
- shared-nav state/interaction polish

### 3. Feature CSS is valid, but should consume shared tokens

Teacher and admin CSS are not the problem conceptually. The issue is that they currently act partly as local theme definitions rather than purely feature/layout extensions.

### 4. Static HTML pages are still a major reason CSS is fragmented

A lot of direct CSS links come from `public/*.html` pages and older content pages. Until those are moved behind shared EJS layouts, some duplication will remain.

## Recommended Cleanup Plan

### Phase 1

- Keep `ustyles.css`, `app_theme.css`, `auth.css`, `teacher_quizzes.css`, `admin_dashboard.css`, `blogs.css`, and current page CSS.
- Keep `lessons.css` and `search.css` as first-class page layers in the shared app stack.
- Keep `events.css` as the dedicated events discovery/archive page layer instead of returning to the older static landing-page bundle.
- Keep `archiveDetail.css` as the shared detail-page layer for event archives and archived submissions instead of using one-off static event/blog assets.
- Keep `books.css` as the dedicated companion-reading discovery page layer instead of leaving `/books` without a first-class entry page.
- Keep `blogsPage.css` as the dedicated blog discovery page layer instead of reviving the retired static `public/blogs/index.html` landing page.
- Keep `blogDetail.css` as the shared article wrapper for migrated blog pages instead of keeping `public/blogs/<category>/*.html` on the live static route path.
- Keep `attendance.css` as the dedicated attendance page layer instead of treating `/attendance` as a leftover static page.
- Keep `about.css` as the dedicated about/trust page layer instead of folding that page back into generic utility styling.
- Keep `contact.css` as the dedicated contact/support page layer instead of falling back to bare utility markup or external-form-only flows.
- Keep `help.css` as the dedicated help/support page layer instead of falling back to static utility-only markup.
- Keep `privacy.css` as the dedicated privacy/trust page layer instead of relying on retired static legal-page markup.
- Keep `cookie.css` as the dedicated cookie/trust page layer instead of burying browser-storage disclosure inside the broader privacy page.
- Keep `terms.css` as the dedicated terms/legal page layer instead of relying on retired static legal-page markup.
- Keep the canonical non-CRFV scroll-top button in `ustyles.css` and `views/partials/scrollTopButton.ejs` rather than reintroducing page-local floating buttons across article and support pages.
- Treat `app_theme.css` as the official universal non-CRFV shell.

### Phase 2

- Split `ustyles.css` into:
  - `app_base.css` or equivalent for tokens/nav/footer/utilities
  - landing-page-only sections
- Move reusable visual rules from legacy landing stylesheets such as `index.css` into `app_theme.css` where they truly belong.

### Phase 3

- Refactor `teacher_quizzes.css` and `admin_dashboard.css` to remove duplicated token declarations where possible.
- Refactor `teacher_quizzes.css`, `admin_dashboard.css`, and `student_dashboard.css` to remove duplicated token declarations where possible.
- Convert remaining live static pages to EJS/layout-based pages.

### Phase 4

- Remove or archive low-confidence legacy files:
  - `styles.css`
  - `footer.css`
  - `lesson.css`
  - `lessons_.css`
  - `quiz.css`
  - event one-offs not referenced anymore

## Immediate Keep List

If cleanup started today, the safest keep list is:

- [ustyles.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/ustyles.css)
- [app_theme.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/app_theme.css)
- [auth.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/auth.css)
- [teacher_quizzes.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/teacher_quizzes.css)
- [admin_dashboard.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/admin_dashboard.css)
- [student_dashboard.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/student_dashboard.css)
- [lessons.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/lessons.css)
- [search.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/search.css)
- [events.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/events.css)
- [archiveDetail.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/archiveDetail.css)
- [books.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/books.css)
- [blogsPage.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/blogsPage.css)
- [blogDetail.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/blogDetail.css)
- [about.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/about.css)
- [contact.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/contact.css)
- [help.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/help.css)
- [privacy.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/privacy.css)
- [cookie.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/cookie.css)
- [terms.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/terms.css)
- [blogs.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/blogs.css)
- [attendance.css](/c:/Users/Kayla%20Ryhs/Desktop/PersonalProjects/helloUniversity/public/css/attendance.css)

## Next Step

The most useful follow-up is a second-pass audit of legacy static pages:

- `public/*.html`
- old `views/teacher/*.ejs`
- event/article one-off assets

That would let us mark each CSS file as:

- definitely live
- transitional
- safe to delete
