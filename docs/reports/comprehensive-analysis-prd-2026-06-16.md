# HelloUniversity — Comprehensive Analysis & PRD

**Date:** 2026-06-16
**Author:** Engineering analysis pass (workflow · efficiency · security · cost)
**Scope:** Full-repo review of runtime bootstrap, route/middleware layer, data layer, third-party service usage, dependency tree, and deployment posture.
**Status:** Draft for prioritization

---

## 1. Executive Summary

HelloUniversity is a mature, working Node/Express monolith — not a prototype. It serves a multi-role academic platform (public site, students, teachers, admins) plus two large embedded products: a **quiz builder** and **ClassRush** (live + self-paced game engine), and a separate **CRFV** event/attendance/payments surface. The codebase is well-modularized at the bootstrap level (`app/` split, 58 route modules, 38 utils, ~197 views) and has a real smoke-test suite (64 test files) with CI on every push/PR.

The platform is in good architectural shape. The highest-value work now is **not new features** — it is closing a small number of sharp risks and trimming structural waste:

| Area | Headline finding | Severity |
| --- | --- | --- |
| **Security** | `public/crfv/textfiles/mongodbusers.txt` is publicly downloadable and contains real user PII + bcrypt password hashes. Also in git history. | **Critical (P0)** |
| **Security** | Several backend artifacts (DB schema, Apps Script source, SQL queries, a Mongoose model) are served as static public files. | High (P0/P1) |
| **Cost / Efficiency** | `puppeteer` + `puppeteer-core` are dependencies but **unused** — they pull a ~300 MB Chromium on every install/deploy. Plus `axios`, `pg`, `connect-pg-simple`, `mailersend`, and effectively `mongoose` are dead weight. | High (P1) |
| **Security** | `xlsx@0.18.5` ships with unpatched advisories (prototype pollution / ReDoS). | High (P1) |
| **Workflow** | The earlier SEV1 `reportsApi` router-shadowing bug appears **resolved** (per-route guards replace the blanket `router.use`). Needs a regression test to lock it in. | Resolved — verify |

Below: detailed analysis by dimension, then a prioritized requirements list (PRD) with acceptance criteria.

---

## 2. System Overview

### 2.1 Stack
- **Runtime:** Node `>=18 <23` (pinned `20.17.0` via `.nvmrc`), Express 4.21.
- **Bootstrap:** `server.js` → `app/validateEnv` → `app/configureSession` → `app/setupCoreMiddleware` → `app/database` → `app/registerRoutes` (core + DB-dependent) → `app/registerErrorHandlers` → Socket.IO attach.
- **Data:**
  - **MongoDB** (Atlas, raw `mongodb` driver) — primary app store: users, classes, quizzes, attempts, live games, blogs, lessons, announcements. Sessions stored here via `connect-mongo`.
  - **Supabase (Postgres)** — CRFV reporting/payments/attendance records (via `@supabase/supabase-js` with service-role key).
  - **Cloudflare R2** — image/asset storage, served via `cdn.hellouniversity.online`.
  - **Google Sheets / Apps Script** — attendance relay + class-record lookups.
- **Realtime:** Socket.IO (`/game` namespace) for ClassRush; session middleware shared into the socket engine.
- **Email:** Resend (`utils/emailSender.js`).
- **View layer:** EJS, shared page/layout system (converging from older standalone views).
- **CSS:** Tailwind (built via `postinstall`) + a large legacy hand-written CSS footprint.

### 2.2 Security middleware (good baseline)
- Helmet with a real CSP (nonce-based `scriptSrc`, `report-only` by default in prod).
- Session cookies: `httpOnly`, `secure` in prod, configurable `sameSite`, 2h default TTL.
- Centralized, reusable primitives in `middleware/apiSecurity.js`: `requireSession`, `requireRole`, `requireCsrf`, `requireRateLimit` (named profiles for login, password-reset, signup, privileged-write, attendance-write, audit-write).
- CSRF tokens are session-bound and compared with `crypto.timingSafeEqual` (`utils/csrfToken.js`).
- `validateEnv()` hard-fails startup on missing secrets and enforces production hardening flags (`TRUST_PROXY`, `SESSION_COOKIE_SECURE`, `ENABLE_CSP`, etc.).
- A checked-in **route security matrix** (`docs/route-security-matrix.md`) documents access expectations per mount.

This is a stronger-than-average security foundation for a project this size. The findings below are concentrated, not systemic.

---

## 3. Workflow Analysis

### 3.1 Strengths
- **Modular route registration.** `registerCoreRoutes` / `registerDatabaseRoutes` cleanly separate routes that need a live DB connection from those that don't. Collections are passed as lazy getters (`() => collections.x`), avoiding null-at-import bugs.
- **Role model is explicit.** `routeAuthGuards.js` centralizes `isAuthenticated / isAdmin / isTeacherOrAdmin / isTeacherOrAdminOrPending / isAdminOrManager`, each correctly branching JSON vs. redirect/`403` render by request type.
- **`returnTo` deep-link preservation** and **forced-password-reset gating** are handled in middleware, not ad hoc per page.
- **Documentation discipline is unusually high** — `docs/` holds route maps, security matrix, UX audit set, ClassRush PRD/backlog, and dated release notes. This is a real asset.

### 3.2 Friction points
1. **Mount-order coupling (latent class of bug).** `app.use('/api', ...)` is used by *many* modules at the same prefix. Express dispatches in registration order, so a broad guard or broad path in an early-mounted `/api` router can shadow later ones. The previously-documented `reportsApi` SEV1 was exactly this. It's fixed, but the architecture still invites recurrence. **Recommendation:** give each API module a unique, specific prefix (`/api/reports`, `/api/account`, …) instead of mounting many modules at bare `/api`.
2. **Two Mongo access styles.** Raw `mongodb` driver is the real app data path, but `mongoose` is also a dependency (used only by `public/models/Content.js`, which is itself misplaced — see §5). Pick one; remove the other.
3. **Env/doc drift.** `.env.production.example` still lists `SENDGRID_API_KEY` / `SENDER_EMAIL`, but `validateEnv` requires `RESEND_API_KEY` / `SENDER_EMAIL_NOREPLY`. A fresh deploy following the example will fail to start. The example file should match `validateEnv`'s required set exactly.
4. **`lint`/`format` scripts cover only a hand-curated file list** (mostly CRFV). Most of the 58 route files and app code are outside the lint gate, so style/quality enforcement is partial.

---

## 4. Efficiency Analysis

### 4.1 Dependency bloat (install + cold-start + image size)
Confirmed by repo-wide `require` grep:

| Package | Status | Impact |
| --- | --- | --- |
| `puppeteer` + `puppeteer-core` | **Unused in app code** | Downloads full Chromium (~170–300 MB) on install; inflates deploy time, slug/image size, and memory headroom needs. Biggest single win. |
| `axios` | **Unused** (everything uses `node-fetch`) | Dead dependency. |
| `pg` + `connect-pg-simple` | **Unused** (sessions use `connect-mongo`; Postgres access is via `supabase-js`) | Dead dependencies. |
| `mailersend` | **Unused** (email is Resend) | Dead dependency. |
| `mongoose` | Only referenced by a stray `public/models/Content.js` | Effectively dead for the running app. |
| `xlsx` **and** `exceljs` | Both present | Overlapping spreadsheet libs; consolidate to one (prefer `exceljs`; `xlsx`/SheetJS npm build has open advisories). |

Removing the unused set should meaningfully cut `npm ci` time, deploy duration, and the deployed footprint with **zero behavior change**.

### 4.2 Data-layer efficiency
- **Indexing is mostly handled.** `app/database.js` creates indexes for lessons + live-game collections at boot, and `scripts/initializeCollections.js` creates the user indexes (email / studentIDNumber). *Caveat:* user indexes only exist if `npm run init-db` was actually run against the target DB — worth confirming on production, since hot auth lookups (`emaildb`, `studentIDNumber`) depend on them.
- **Hotspot files** flagged previously remain large: `routes/quizBuilderApiRoutes.js`, `routes/teacherClassManagementContentApiRoutes.js`, `app/socketManager.js`, `public/js/teacherQuizBuilder.js`. These are maintenance/efficiency risks, not correctness bugs.
- **In-memory live sessions.** `socketManager` holds `activeSessions` in a process-local `Map`. This is fine for a single instance but blocks horizontal scaling (a second dyno/instance won't share live game state). Acceptable today; document it as a scaling boundary.

### 4.3 Build / asset efficiency
- Large mixed CSS footprint (Tailwind output **plus** dozens of legacy hand-written CSS files in `public/css/` and `public/crfv/css/`). `docs/css-audit.md` already flags removals. Trimming reduces page weight and cognitive load.
- A vendored `public/vendor/xlsx/xlsx.full.min.js` ships to clients — large client-side parse cost where used.

---

## 5. Security Analysis

### 5.1 CRITICAL — Public exposure of user data dump (P0)
`public/` is the Express static root (`express.static(.../public)`). Therefore **every file under it is anonymously downloadable**, including:

- **`public/crfv/textfiles/mongodbusers.txt`** — a dump of real `tblUser` records: `firstName`, `lastName`, `emaildb`, **bcrypt password hash**, `studentIDNumber`, `role`, lockout/disabled flags, timestamps. This is a live PII + credential-hash disclosure reachable at `https://<host>/crfv/textfiles/mongodbusers.txt`. Even hashed, this enables offline cracking, targeted phishing, account-enumeration, and is a privacy/regulatory exposure.

**Required actions (all of them):**
1. Delete the file from the working tree **and** purge it from git history (`git filter-repo` / BFG) — it is committed, so deletion alone leaves it in history and on any clone/mirror.
2. **Rotate** affected users' credentials / force password reset, since hashes are now considered exposed.
3. Add `public/crfv/textfiles/` (and any data-dump paths) to `.gitignore` and to a deny rule so such files can never be served.

### 5.2 HIGH — Other backend artifacts served publicly (P0/P1)
Same static-root problem, lower blast radius but still wrong:
- `public/crfv/textfiles/databaseschema.txt` — full Postgres schema disclosure.
- `public/crfv/textfiles/appscript.txt` — Google Apps Script backend source (reveals integration logic/endpoints).
- `public/crfv/textfiles/SQLQueries.txt`, `locationlist.txt`, `textvalidfiles.txt` — internal artifacts.
- `public/models/Content.js` — a Mongoose model source file living under the public static root.

**Action:** Move all non-asset/source/data files out of `public/`. Restrict the static root to genuine front-end assets (css/js/images/fonts). Consider an explicit static `index: false` + an allowlist or a deny middleware for `*.txt`, `*.js` model/source files, and any `textfiles/` directory.

### 5.3 Resolved — `reportsApi` router shadowing (verify with test)
The previously-documented SEV1 (a blanket `router.use(requirePrivilegedRole)` shadowing all `/api/*` for non-admin/manager sessions) is **no longer present**. The guard is now applied **per route** (`router.get('/accommodation', requirePrivilegedRole, …)`, etc.), so student/teacher `/api/*` traffic is no longer blocked by this module. **Action:** add a regression test asserting a non-privileged session can reach `/api/student/classes`, `/api/teacher/classes`, `/api/quiz-builder/quizzes`, and `/api/live-games`, so this can't silently regress.

### 5.4 MEDIUM/HIGH — Dependency vulnerabilities (P1)
- `xlsx@0.18.5` (SheetJS via npm) has open prototype-pollution and ReDoS advisories with no fixed version on the npm registry. Either migrate fully to `exceljs`, or pull SheetJS from the vendor-recommended CDN tarball, or sandbox/validate all spreadsheet input.
- Run `npm audit` as part of CI and triage the result. (Not currently in the smoke workflow.)

### 5.5 LOW/INFO — Hardening opportunities
- CSP is `report-only` in production by default (`CSP_REPORT_ONLY` defaults true). Plan a path to **enforcing** CSP after collecting violation reports.
- `cors: { origin: false }` on Socket.IO is good (same-origin only).
- No `npm audit` / dependency scanning, no secret-scanning in CI (a `scripts/scan-secrets.js` exists but isn't wired into the workflow).
- Single Mongo connection shared app-wide is fine; ensure connection-string credentials are least-privilege.

---

## 6. Cost Analysis

### 6.1 Infrastructure cost drivers (recurring)
| Service | Cost shape | Notes / levers |
| --- | --- | --- |
| Hosting (Render, per memory) | Per-instance compute + build minutes | **Unused Puppeteer/Chromium inflates build time and required memory tier.** Removing it may allow a smaller instance. |
| MongoDB Atlas | Tier by storage/throughput | Sessions live in Mongo; ensure TTL/cleanup on the sessions collection so it doesn't grow unbounded. Confirm indexes exist (avoid collection scans = lower tier headroom). |
| Supabase | Free/low tier likely | CRFV reporting only; modest. |
| Cloudflare R2 | Storage + egress | R2 egress is free to the custom CDN domain — good cost posture. `sharp` resizing before upload keeps stored bytes down. |
| Resend | Per-email | Transactional only; low. |
| Google API/Sheets | Quota-based, free tier | Watch rate limits, not cost. |

### 6.2 Cost-reduction opportunities (ranked by effort:impact)
1. **Remove unused heavy deps (puppeteer, puppeteer-core, axios, pg, connect-pg-simple, mailersend, mongoose).** Low effort, immediate build-time + footprint + (possibly) instance-tier savings. **Do this first.**
2. **Session store hygiene.** Confirm `connect-mongo` TTL is set so expired sessions are reaped; otherwise the sessions collection grows and pushes Atlas storage up.
3. **Consolidate spreadsheet libs** (drop `xlsx`, keep `exceljs`) — smaller install, fewer CVEs.
4. **Trim legacy CSS / vendored client libs** — lower bandwidth/egress and faster loads (per `docs/css-audit.md`).
5. **Single-instance assumption is cheap today**; only revisit Socket.IO state externalization (Redis adapter) when scaling demand actually justifies the added managed-Redis cost.

### 6.3 Build-time cost
- `postinstall` runs a Tailwind build on every `npm ci` (including CI). Fine, but combined with the Chromium download it makes installs slow. Removing Puppeteer is the dominant lever.

---

## 7. Requirements (Prioritized PRD)

Each item: **what**, **why**, **acceptance criteria (AC)**.

### P0 — Critical, do immediately

**P0-1 — Remove and purge the public user-data dump**
- *What:* Delete `public/crfv/textfiles/mongodbusers.txt`; purge from git history; rotate/force-reset exposed accounts; gitignore the path.
- *Why:* Live anonymous PII + password-hash disclosure (§5.1).
- *AC:* (1) URL `…/crfv/textfiles/mongodbusers.txt` returns 404 in prod. (2) `git log --all -- public/crfv/textfiles/mongodbusers.txt` shows the file purged. (3) Affected users have been force-reset or notified. (4) A test asserts no `.txt` under `public/crfv/textfiles/` is reachable.

**P0-2 — Stop serving backend artifacts as static files**
- *What:* Move `databaseschema.txt`, `appscript.txt`, `SQLQueries.txt`, `locationlist.txt`, `textvalidfiles.txt`, and `public/models/Content.js` out of `public/`; restrict static root to real assets.
- *Why:* Schema/source/logic disclosure (§5.2).
- *AC:* None of these paths are reachable over HTTP; legitimate assets (css/js/images) still load; smoke tests green.

### P1 — High, this iteration

**P1-1 — Remove dead/heavy dependencies**
- *What:* Drop `puppeteer`, `puppeteer-core`, `axios`, `pg`, `connect-pg-simple`, `mailersend`, and `mongoose` (after relocating/removing `Content.js`). Consolidate `xlsx`→`exceljs`.
- *Why:* Build time, deploy footprint, instance cost, CVE surface (§4.1, §6.2).
- *AC:* App boots and full smoke suite passes with these removed from `package.json`; `npm ci` time and `node_modules` size measurably drop; `npm ls` shows no remaining references.

**P1-2 — Patch/replace vulnerable `xlsx`**
- *What:* Migrate spreadsheet read/write to `exceljs` or a patched source; add `npm audit` to CI.
- *Why:* Unpatched prototype-pollution/ReDoS (§5.4).
- *AC:* `npm audit --production` reports no high/critical from spreadsheet libs; export/import flows still pass smoke tests.

**P1-3 — Lock the reportsApi fix with a regression test**
- *What:* Add a smoke test that a student and a teacher session reach their own `/api/*` endpoints (not 403).
- *Why:* Prevent recurrence of the resolved SEV1 (§5.3).
- *AC:* Test fails if a blanket `/api` guard is reintroduced.

**P1-4 — Fix env example drift**
- *What:* Align `.env.production.example` with `validateEnv` required keys (Resend, not SendGrid).
- *Why:* Following the example currently produces a startup failure (§3.2).
- *AC:* A clean deploy populated only from the example passes `validateEnv`.

### P2 — Medium, next iteration

**P2-1 — De-collide `/api` mounts.** Give each API module a specific prefix to eliminate the mount-order shadowing class of bug (§3.2). *AC:* No two API routers share the bare `/api` prefix; route map updated.

**P2-2 — Expand lint/format gate** to cover all `routes/`, `app/`, `utils/`, `middleware/`. *AC:* `npm run lint` runs over the whole server codebase in CI.

**P2-3 — Session-store TTL + Atlas hygiene.** Confirm/configure `connect-mongo` TTL and verify production user indexes. *AC:* Expired sessions are auto-reaped; `tblUser` has indexes on `emaildb` and `studentIDNumber` in prod.

**P2-4 — Decompose hotspot files** (`quizBuilderApiRoutes`, `teacherClassManagementContentApiRoutes`, `socketManager`, `teacherQuizBuilder.js`) by responsibility before further feature growth (§4.2).

**P2-5 — Wire `scripts/scan-secrets.js` + `npm audit` into CI**; plan CSP enforcement (move off `report-only`) after collecting reports (§5.5).

### P3 — Product/roadmap (tracked elsewhere, unchanged by this pass)
Teacher manual grading, teacher lesson authoring, real gradebook + release controls, admin import/reports, notifications, deeper analytics, AI-assisted workflows — carry forward from `docs/reports/repo-analysis-2026-03-30.md` and the ClassRush backlog.

---

## 8. Recommended Sequencing

1. **Today (security):** P0-1, P0-2 — stop the data exposure and purge history.
2. **This week (cost + safety):** P1-1, P1-2, P1-3, P1-4 — strip dead deps, fix CVE, lock the regression, fix env drift. High value, low risk.
3. **Next iteration (hardening + hygiene):** P2-1…P2-5.
4. **Ongoing (product):** P3 roadmap per existing plans.

---

## 9. Evidence / Files Reviewed
- Bootstrap: `server.js`, `app/registerRoutes.js`, `app/configureSession.js`, `app/setupCoreMiddleware.js`, `app/validateEnv.js`, `app/database.js`, `app/socketManager.js`
- Security: `middleware/apiSecurity.js`, `middleware/routeAuthGuards.js`, `utils/csrfToken.js`, `routes/reportsApi.js`, `docs/route-security-matrix.md`
- Deploy/config: `package.json`, `.env.production.example`, `.github/workflows/smoke.yml`, `.nvmrc`
- Static exposure: `public/crfv/textfiles/*`, `public/models/Content.js`
- Dependency usage: repo-wide `require()` grep (puppeteer, axios, pg, mailersend, mongoose, resend, sharp, qrcode, xlsx/exceljs)
- Prior context: `docs/reports/repo-analysis-2026-03-30.md`, `docs/ux/*`
