# HelloUniversity — Execution Tracker

**Created:** 2026-06-16
**Owner:** hensonsagorsor@gmail.com
**Source of truth for findings:** [`docs/reports/comprehensive-analysis-prd-2026-06-16.md`](reports/comprehensive-analysis-prd-2026-06-16.md)
**Purpose:** Living, phased task board for cleaning up and hardening HelloUniversity. Track here; record actual completion in the Changelog at the bottom.

## How to use this file
- **Status legend:** `[ ]` Not started · `[~]` In progress · `[x]` Done · `[!]` Blocked
- When a task starts/finishes, tick the box **and** add a dated line in the [Changelog](#changelog).
- "Target" = planned window (relative to 2026-06-16). "Done" = fill the real date when complete.
- Don't delete completed tasks — strike or mark `[x]` so history stays visible.

## Status snapshot
| Phase | Theme | Window | Items | Done |
| --- | --- | --- | --- | --- |
| 0 | Critical security containment | Day 0–1 (by 2026-06-17) | 2 | 1/2 (P0-1 code done; history purge + credential reset pending) |
| 1 | Dependency cleanup + quick safety | Week 1 (by 2026-06-23) | 4 | 4/4 ✅ |
| 2 | Hardening + hygiene | Weeks 2–3 (by 2026-07-07) | 10 | 7/10 |
| 3 | Product roadmap | Ongoing | 7 | 0/7 |

---

## Phase 0 — Critical security containment
**Window:** Day 0–1 · **Target: 2026-06-17** · Goal: stop active data exposure before anything else.

### [~] P0-1 — Remove & purge the public user-data dump
- **Target:** 2026-06-16 · **Done (code):** 2026-06-16 · **Done (history+creds):** ____
- **Why:** `public/crfv/textfiles/mongodbusers.txt` was anonymously downloadable and leaked real PII + bcrypt hashes.
- **Steps:**
  - [x] Delete `public/crfv/textfiles/mongodbusers.txt` from the working tree
  - [x] Add `.gitignore` entries so a dump/`.sql` can't be re-added under the web root
  - [x] Defense-in-depth static allowlist guard (404s the path) + regression test
  - [ ] **Purge from git history** (`git filter-repo`/BFG) — **STILL NEEDS GO-AHEAD; rewrites history + force-push.** File remains in history until done.
  - [~] **Force password reset / notify affected accounts** — script drafted: `scripts/reset-exposed-accounts.js` (dry-run by default; `--apply`, optional `--email`). Targets the 4 exposed accounts (studentIDNumbers 2507152–2507155). **Needs to be RUN against prod with `--apply` (DB access).**
- **AC:** (1) ✅ path 404s (test) (2) ⏳ history purge pending (3) ⏳ credential reset pending (4) ✅ test asserts unreachable

### [x] P0-2 — Stop serving backend artifacts as static files
- **Target:** 2026-06-17 · **Done:** 2026-06-16
- **Why:** Schema/source/logic disclosure via the static root.
- **Outcome:**
  - Moved out of `public/` → `docs/crfv/reference/`: `databaseschema.txt`, `appscript.txt`, `SQLQueries.txt`, `locationlist.txt`, `textvalidfiles.txt` (+ a README explaining why).
  - `public/models/Content.js` already removed in P1-1.
  - Added a static allowlist guard in `app/setupCoreMiddleware.js`: anything under `/crfv/textfiles/` except the two genuine public assets (province JSON + attendee template) returns 404. Verified which files were client-fetched first (the province JSON is, via `user-register.js`) so nothing broke.
  - Added `tests/smoke/staticTextfilesGuard.test.js` (9 tests).
- **AC:** ✅ internal paths 404 · ✅ legit assets still load (province JSON + xlsx) · ✅ smoke green (382/382).

---

## Phase 1 — Dependency cleanup + quick safety fixes
**Window:** Week 1 · **Target: 2026-06-23** · Goal: cut waste and CVE surface; lock the resolved SEV1.

### [x] P1-1 — Remove dead/heavy dependencies
- **Target:** 2026-06-18 · **Done:** 2026-06-16
- **Removed:** `puppeteer`, `puppeteer-core` (unused, ~300 MB Chromium), `axios`, `pg`, `connect-pg-simple`, `mailersend`, `mongoose` — all verified zero-reference via repo-wide grep. Deleted the only `mongoose` consumer, the stray `public/models/Content.js` (also advances P0-2). **92 transitive packages removed.**
- **Deferred to P1-2:** dropping `xlsx` (needs migration to `exceljs` first).
- **AC:** ✅ app boots · ✅ smoke suite 363/364 pass (1 failure is pre-existing, unrelated — see note) · ✅ `npm ls` clean.
- **⚠️ Pre-existing test rot found (not caused by this work):** `tests/smoke/studentClassRushActivitiesApi.test.js:262` fails because fixtures hardcode due dates `2026-04-05`/`2026-04-06`, now ~2 months past, so `nextDue` is correctly `null`. Should use relative dates. Tracked as new item P2-6.

### [x] P1-2 — Patch/replace vulnerable `xlsx@0.18.5`
- **Target:** 2026-06-20 · **Done:** 2026-06-16
- **Why:** unpatched prototype-pollution / ReDoS advisories
- **Outcome — no migration needed:** the npm `xlsx` package was **already unused server-side**. Server Excel export uses `ExcelJS` (`routes/quizManagementRoutes.js`: `workbook.xlsx.write()`). The only `xlsx` references are client-side CDN script URLs and the vendored `public/vendor/xlsx/xlsx.full.min.js`. So `xlsx` was simply **removed** from `package.json` (CVEs pruned from the tree; `npm ls xlsx` → empty). Added a **non-blocking** `npm audit --audit-level=high` step to `.github/workflows/smoke.yml` (blocking gate decision deferred to P2-5).
- **AC:** ✅ `npm ls xlsx` empty · ✅ quiz attempt export still works (ExcelJS) · ✅ smoke suite green.
- **⚠️ Residual (client-side, lower risk):** vendored `public/vendor/xlsx/xlsx.full.min.js` and CDN refs in `routes/crfvPagesRoutes.js` are still SheetJS 0.18.5. Track replacing/upgrading the client copy separately — added as P2-7.

### [x] P1-3 — Regression test for the resolved reportsApi shadowing
- **Target:** 2026-06-19 · **Done:** 2026-06-16
- **Why:** SEV1 is fixed (per-route guards) but unguarded against reintroduction
- **Outcome:** added `tests/smoke/reportsApiShadowingRegression.test.js` (9 tests). Mounts `reportsApi` at `/api` ahead of stubbed downstream routes (real mount order) and asserts student + teacher sessions reach `/api/student/classes`, `/api/teacher/classes`, `/api/quiz-builder/quizzes`, `/api/live-games`, while still 403-ing a student on a reportsApi privileged endpoint. Fails if a blanket `router.use(<role guard>)` is reintroduced.
- **AC:** ✅ all 9 assertions pass.

### [x] P1-4 — Fix `.env.production.example` drift
- **Target:** 2026-06-18 · **Done:** 2026-06-16
- **Why:** example lists SendGrid keys but `validateEnv` requires Resend → a clean deploy fails to start
- **Outcome:** replaced `SENDGRID_API_KEY` / `SENDER_EMAIL` with `RESEND_API_KEY` / `SENDER_EMAIL_NOREPLY` (the keys `validateEnv` + `utils/emailSender.js` actually require) and documented the optional `RESEND_DAILY_LIMIT`.
- **AC:** ✅ example now matches `validateEnv`'s required email keys.

---

## Phase 2 — Hardening + hygiene
**Window:** Weeks 2–3 · **Target: 2026-07-07** · Goal: remove structural risk classes and tighten the build.

### [ ] P2-1 — De-collide `/api` mounts  ⚠️ LARGER REFACTOR — needs focused effort
- **Target:** 2026-06-27 · **Done:** ____
- **Why:** many modules mount at bare `/api`; mount-order shadowing is a recurring bug class
- **Status note (2026-06-16):** deliberately NOT auto-executed during the Phase-2 continuation — re-prefixing many routers touches client `fetch` URLs across the app and risks regressions. Should be done as a dedicated pass with route-by-route verification (the P1-3 regression test guards the worst symptom in the meantime).
- **AC:** no two API routers share the bare `/api` prefix · `docs/route-map.md` updated · smoke green

### [x] P2-2 — Expand lint/format gate
- **Target:** 2026-06-30 · **Done:** 2026-06-16
- **Why:** lint covered only a hand-picked file list — and `eslint.config.js` had **`rules: {}`** with no Node globals, so it was effectively a no-op (parse errors only).
- **Outcome:** rewrote `eslint.config.js` with `@eslint/js` recommended + Node globals (server/Jest) and browser globals (client `public/**`), `no-unused-vars` ignoring `^_`, and ignores for `dist`/`vendor`/`back-up`/`_archived_unmounted`. Pinned `@eslint/js` + `globals` as devDeps. `lint` now covers `app routes utils middleware scripts server.js supabaseClient.js`; added `lint:strict` (zero-warnings) for the future. Wired a **blocking** `npm run lint` step into CI. Fixed 2 `no-useless-escape` errors in `quizManagementRoutes.js`. Confirmed the 5 `no-undef` were all in dead `routes/_archived_unmounted/` (no live bugs).
- **AC:** ✅ `npm run lint` → 0 errors (34 unused-vars warnings remain) · ✅ runs over all server dirs in CI · ✅ smoke green.
- **Follow-up:** 34 `no-unused-vars` warnings to clean incrementally, then flip CI to `lint:strict`. Tracked as P2-9.

### [x] P2-3 — Session-store TTL + Atlas index check
- **Target:** 2026-07-02 · **Done:** 2026-06-16 (code) · prod index verification = ops follow-up
- **Outcome:**
  - **Session reaping made explicit** in `app/configureSession.js`: `MongoStore.create({ ttl, autoRemove: 'native', touchAfter: 600 })` — native TTL index aligned to cookie maxAge, plus `touchAfter` to throttle session writes (write/cost reduction).
  - **Found + fixed an index bug:** the app queries the login email as **`emaildb`**, but `scripts/initializeCollections.js` indexed a non-existent `email` field. Fixed the script to index `emaildb`, and added `emaildb` (sparse) + `studentIDNumber` (unique, sparse) indexes at boot in `app/database.js` so prod no longer depends on a manual `init-db` run.
- **AC:** ✅ explicit reaping config · ✅ `emaildb`/`studentIDNumber` indexes ensured at boot · ⏳ confirm indexes present on prod Atlas (ops step — needs DB access).
- **Follow-up:** login uses a **case-insensitive regex** on `emaildb` (`$options:'i'`), which a plain index can't accelerate. Real win needs email normalization-to-lowercase on write + exact-match query, or a collation index. Tracked as P2-8.

### [ ] P2-4 — Decompose hotspot files  ⚠️ LARGER REFACTOR — needs focused effort
- **Status note (2026-06-16):** deliberately NOT auto-executed — splitting large route/socket files is high-churn and regression-prone; should be a dedicated pass per file with smoke coverage at each step. (Original detail below.)
- **Target:** 2026-07-07 · **Done:** ____
- **Targets:** `routes/quizBuilderApiRoutes.js`, `routes/teacherClassManagementContentApiRoutes.js`, `app/socketManager.js`, `public/js/teacherQuizBuilder.js`
- **AC:** each split by responsibility · smoke suite still green

### [x] P2-5 — Wire security scanning into CI + plan CSP enforcement
- **Target:** 2026-07-04 · **Done:** 2026-06-16
- **Outcome — CI (`/.github/workflows/smoke.yml`):**
  - **Secret scan** (`npm run scan:secrets`) — **blocking** gate (verified passing on current tree).
  - **Dependency audit** (`npm audit --audit-level=high`) — non-blocking for now (48 transitive findings remain); flip to blocking after triage.
- **CSP enforcement plan (documented):** today `CSP_REPORT_ONLY` defaults `true`, so the policy in `app/setupCoreMiddleware.js` only reports. To enforce:
  1. Add a `report-uri`/`report-to` endpoint and collect violations from real traffic for ~1–2 weeks.
  2. Resolve legitimate violations (tighten `scriptSrc`/`styleSrc` — note `styleSrc` currently allows `'unsafe-inline'` + `https:`, the main thing to tighten).
  3. Set `CSP_REPORT_ONLY=false` in prod to enforce; keep the nonce flow.
- **AC:** ✅ CI fails on committed secrets · ✅ audit visible in CI · ✅ CSP enforcement path documented.

### [x] P2-7 — Replace/upgrade client-side SheetJS 0.18.5
- **Target:** 2026-07-07 · **Done:** 2026-07-06
- **Why:** the vendored `public/vendor/xlsx/xlsx.full.min.js` and CDN refs in `routes/crfvPagesRoutes.js` are still SheetJS 0.18.5 (same CVE family as the removed npm pkg, but client-side). (Found 2026-06-16 during P1-2.)
- **Outcome:** vendored a patched SheetJS 0.20.3 build (`public/vendor/xlsx/xlsx.full.min.js`, sourced from cdn.sheetjs.com, documented in a new `public/vendor/xlsx/README.md`). Repointed all 7 CRFV pages in `routes/crfvPagesRoutes.js` (attendance, admin-register, reports, attendanceSummary, audittrail, payment-reports, payment-audits) from three different CDN hosts to the single vendored copy; student `/attendance` already used the vendored path and now inherits the patched build. `XLSX.read`/`sheet_to_json`/`writeFile`/`encode_cell` are stable across 0.18→0.20, so no client JS changed.
- **AC:** ✅ `grep -rn "0.18.5"` in routes/ is clean · ✅ CRFV smoke tests pass · CSP `scriptSrc` CDN allowances left untouched this pass (tightening tracked under the P2-5 CSP-enforcement plan).

### [x] P2-8 — Optimize case-insensitive login lookup
- **Target:** 2026-07-07 · **Done:** 2026-07-06
- **Why:** login queries `{ emaildb: { $regex: '^...$', $options: 'i' } }` (`routes/authWebRoutes.js`), which can't use a standard index. (Found 2026-06-16 during P2-3.)
- **Outcome:** added `utils/emailLookup.js` (`normalizeEmail` + `findUserByEmail`): exact-matches the lowercased input against `emaildb` first (indexed fast path — every write path already lowercases), falling back to the old case-insensitive regex only for legacy mixed-case records. Wired into login (`authWebRoutes.js`), and — **found as a real bug while auditing all `emaildb` readers**, not just an optimization — into `passwordResetRoutes.js` (all 3 handlers) and `resendConfirmationApi.js`, which previously matched `emaildb` on **raw, case-sensitive** input and silently failed to find the user for mixed-case email entry. Reset-password updates now target `_id` and the reset email is sent to the stored address rather than echoing back user input. Added `scripts/normalize-emaildb.js` (dry-run by default, `--apply`, mirrors `reset-exposed-accounts.js` conventions) to lowercase legacy mixed-case `emaildb` values and flag would-be collisions instead of merging them; a local dry-run found 2 such accounts. Added `tests/smoke/emailLookup.test.js` (10 tests: helper unit tests + login/reset mixed-case integration tests).
- **AC:** ✅ primary login/reset/resend-confirmation lookups use an exact match on the indexed `emaildb` value · ✅ mixed-case input works via login and password reset · ✅ smoke green (new suite 10/10).
- **Follow-up (ops):** run `node scripts/normalize-emaildb.js --apply` against prod to eliminate the 2 known legacy mixed-case accounts (needs DB access, same posture as the pending P0-1 credential-reset run).

### [x] P2-6 — Fix date-sensitive test rot
- **Target:** 2026-06-30 · **Done:** 2026-06-16
- **Why:** `tests/smoke/studentClassRushActivitiesApi.test.js` hardcoded 2026-04 due dates that aged into the past, so the `nextDue` assertion failed on every run.
- **Outcome:** replaced the hardcoded fixture dates with a `daysFromNow(n)` helper (relative to `now`). Swept the other smoke tests using 2026 dates — they assert stored values verbatim (not comparisons vs. now), so they don't rot.
- **AC:** ✅ full smoke suite 373/373 green.

### [x] P2-9 — Clean remaining lint warnings, then enforce `lint:strict`
- **Target:** 2026-07-07 · **Done:** 2026-07-06
- **Why:** 34 `no-unused-vars` warnings remain after P2-2 (config is real now but warnings are non-blocking).
- **Outcome:** removed all 34 warnings across 22 files — dropped genuinely dead imports/helpers (`uuidv4`, `normalizeCategory`, `normalizeQuizType`, `normalizeEditableStatus`, `toIsoString`, `buildStudentAttemptFilters`, `isArchivedClass` + its now-orphaned `normalizeClassStatus`, unused destructured `data`/`error`/`result` bindings) and prefixed intentionally-unused params/caught errors with `_` where the binding is structurally required (config already ignores `^_`). `.github/workflows/smoke.yml` lint step now runs `npm run lint:strict`.
- **AC:** ✅ `npm run lint:strict` exits 0 · ✅ CI uses the strict gate · ✅ smoke green.

---

## Phase 3 — Product roadmap (ongoing)
**Window:** Ongoing · carried from `docs/reports/repo-analysis-2026-03-30.md` + ClassRush backlog. Not blocking the cleanup phases.

- [ ] P3-1 — Teacher manual grading queue (short-answer/paragraph review, score override)
- [ ] P3-2 — Teacher lesson authoring flow (create/edit, publish/visibility)
- [ ] P3-3 — Real gradebook + faculty-controlled release + grade-change audit trail
- [ ] P3-4 — Admin operational workflows (attendance import, generated reports/exports)
- [ ] P3-5 — Notifications / reminders
- [ ] P3-6 — Deeper analytics
- [ ] P3-7 — ClassRush UI/UX polish plan (14 items, Tier 1 = silent-failure handling + End Game confirm)

---

## Changelog
Record actual work here as it happens — newest first. Format: `YYYY-MM-DD — <task id> — <what changed> — <commit/PR if any>`

- 2026-07-06 — Phase 2 continuation — user decision: this pass scoped to P2-7/8/9 only; P2-1 (/api de-collision) and P2-4 (hotspot decomposition) stay deferred as dedicated passes; P0-1 remainder (git-history purge + prod password reset) explicitly deferred, still pending.
- 2026-07-06 — noted (not fixed, out of this pass's scope) — `tests/smoke/blogImport.test.js` (2 tests) fails independent of this session's changes: `app/blogCatalog.js` reads legacy blog HTML from `legacy/migrated-html/blogs` / `public/blogs`, and that source directory isn't present in this checkout, so `buildLegacyBlogDocuments()` returns 0 entries. Confirmed pre-existing by re-running the full suite with this session's 3 commits stashed — same failure. New total: 390/392 passing (up from the 373/373 baseline noted in earlier phases; count includes the 10 new P2-8 tests plus other suite growth since).
- 2026-07-06 — P2-9 — removed all 34 `no-unused-vars` lint warnings across 22 files; CI lint step switched to `lint:strict` (`--max-warnings=0`)
- 2026-07-06 — P2-8 — added `utils/emailLookup.js` (indexed exact-match + legacy regex fallback); fixed login, password-reset, and resend-confirmation to use it — **found and fixed a real bug**: password-reset/resend-confirmation were matching `emaildb` case-sensitively on raw input, so mixed-case email entry silently failed; added `scripts/normalize-emaildb.js` (dry-run found 2 legacy mixed-case accounts, ops follow-up to `--apply`); added `tests/smoke/emailLookup.test.js` (10 tests)
- 2026-07-06 — P2-7 — vendored patched SheetJS 0.20.3 (was 0.18.5), repointed all 7 CRFV pages off three different CDN hosts onto the single vendored copy
- 2026-07-06 — pre-req — `npm ci` to sync `node_modules` with `package.json` (stale install had ESLint 6.4.0 resolving instead of the pinned ^9.25.0, so `npm run lint` failed outright before this)
- 2026-06-16 — P0-1/P0-2 — deleted public mongodbusers.txt dump; moved 5 internal artifacts to docs/crfv/reference/; added static allowlist guard + .gitignore protection + staticTextfilesGuard test (9). Smoke 382/382. **History purge + credential reset still pending (need go-ahead/DB access).**
- 2026-06-16 — P2-2 — real ESLint config (recommended + globals), expanded `lint` to all server dirs, wired blocking lint to CI, fixed 2 escape errors; 34 unused-vars warnings remain (→ P2-9)
- 2026-06-16 — P2-5 — added blocking secret-scan + non-blocking audit to CI; documented CSP enforcement plan
- 2026-06-16 — P2-3 — explicit session TTL/reaping + write throttling; ensured `emaildb`/`studentIDNumber` indexes at boot; fixed init script indexing wrong `email` field (→ P2-8 follow-up for regex login)
- 2026-06-16 — P2-6 — fixed date-rot in studentClassRushActivitiesApi (relative dates); suite now 373/373
- 2026-06-16 — Phase 2 progress: 4/10 (P2-2/3/5/6 done; P2-1 & P2-4 flagged as larger refactors; P2-7/8/9 queued)
- 2026-06-16 — P1-4 — fixed `.env.production.example` (SendGrid→Resend keys)
- 2026-06-16 — P1-3 — added `tests/smoke/reportsApiShadowingRegression.test.js` (9 tests, all pass)
- 2026-06-16 — P1-2 — removed `xlsx` npm pkg (already unused server-side; ExcelJS handles exports); added non-blocking `npm audit` step to CI; logged residual client SheetJS as P2-7
- 2026-06-16 — Phase 1 complete (4/4). Full smoke: 372/373 (only failure = pre-existing P2-6 date rot)
- 2026-06-16 — P1-1 — removed 7 dead deps (puppeteer, puppeteer-core, axios, pg, connect-pg-simple, mailersend, mongoose) + deleted stray `public/models/Content.js`; lockfile pruned (-92 packages); smoke 363/364 (1 pre-existing date-rot failure). Not yet committed.
- 2026-06-16 — P2-6 added — discovered date-sensitive test rot in studentClassRushActivitiesApi during P1-1
- 2026-06-16 — tracker created — phased task board derived from comprehensive analysis PRD
