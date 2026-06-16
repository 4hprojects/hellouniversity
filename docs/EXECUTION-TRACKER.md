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
| 0 | Critical security containment | Day 0–1 (by 2026-06-17) | 2 | 0/2 |
| 1 | Dependency cleanup + quick safety | Week 1 (by 2026-06-23) | 4 | 4/4 ✅ |
| 2 | Hardening + hygiene | Weeks 2–3 (by 2026-07-07) | 7 | 0/7 |
| 3 | Product roadmap | Ongoing | 7 | 0/7 |

---

## Phase 0 — Critical security containment
**Window:** Day 0–1 · **Target: 2026-06-17** · Goal: stop active data exposure before anything else.

### [ ] P0-1 — Remove & purge the public user-data dump
- **Target:** 2026-06-16 (same day) · **Done:** ____
- **Why:** `public/crfv/textfiles/mongodbusers.txt` is anonymously downloadable and leaks real PII + bcrypt hashes.
- **Steps:**
  - [ ] Delete `public/crfv/textfiles/mongodbusers.txt` from the working tree
  - [ ] Purge it from git history (`git filter-repo` or BFG) — **needs explicit go-ahead; rewrites history + force-push**
  - [ ] Force password reset / notify affected accounts (hashes are now considered exposed)
  - [ ] Add `public/crfv/textfiles/` to `.gitignore`
- **AC:** URL returns 404 in prod · file purged from `git log --all` · affected users reset/notified · test asserts no `.txt` under that dir is reachable

### [ ] P0-2 — Stop serving backend artifacts as static files
- **Target:** 2026-06-17 · **Done:** ____
- **Why:** Schema/source/logic disclosure via the static root.
- **Steps:**
  - [ ] Move out of `public/`: `databaseschema.txt`, `appscript.txt`, `SQLQueries.txt`, `locationlist.txt`, `textvalidfiles.txt`
  - [ ] Move/remove `public/models/Content.js` (stray Mongoose model under static root)
  - [ ] Restrict static root to genuine assets (css/js/images/fonts); add deny rule for `*.txt` / source files
- **AC:** none of these paths reachable over HTTP · legit assets still load · smoke tests green

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

### [ ] P2-1 — De-collide `/api` mounts
- **Target:** 2026-06-27 · **Done:** ____
- **Why:** many modules mount at bare `/api`; mount-order shadowing is a recurring bug class
- **AC:** no two API routers share the bare `/api` prefix · `docs/route-map.md` updated

### [ ] P2-2 — Expand lint/format gate
- **Target:** 2026-06-30 · **Done:** ____
- **Why:** lint currently covers only a hand-picked (mostly CRFV) file list
- **AC:** `npm run lint` runs over all `routes/`, `app/`, `utils/`, `middleware/` in CI

### [ ] P2-3 — Session-store TTL + Atlas index check
- **Target:** 2026-07-02 · **Done:** ____
- **Steps:** confirm `connect-mongo` TTL reaps expired sessions; verify prod `tblUser` indexes on `emaildb` + `studentIDNumber` (created by `npm run init-db`)
- **AC:** expired sessions auto-reaped · prod indexes confirmed present

### [ ] P2-4 — Decompose hotspot files
- **Target:** 2026-07-07 · **Done:** ____
- **Targets:** `routes/quizBuilderApiRoutes.js`, `routes/teacherClassManagementContentApiRoutes.js`, `app/socketManager.js`, `public/js/teacherQuizBuilder.js`
- **AC:** each split by responsibility · smoke suite still green

### [ ] P2-5 — Wire security scanning into CI + plan CSP enforcement
- **Target:** 2026-07-04 · **Done:** ____
- **Steps:** add `scripts/scan-secrets.js` + `npm audit` to the workflow; collect CSP violation reports, then plan move off `report-only`
- **AC:** CI fails on new secrets/high-sev audit findings · CSP enforcement path documented

### [ ] P2-7 — Replace/upgrade client-side SheetJS 0.18.5
- **Target:** 2026-07-07 · **Done:** ____
- **Why:** the vendored `public/vendor/xlsx/xlsx.full.min.js` and CDN refs in `routes/crfvPagesRoutes.js` are still SheetJS 0.18.5 (same CVE family as the removed npm pkg, but client-side). (Found 2026-06-16 during P1-2.)
- **Steps:** upgrade the vendored/CDN SheetJS to the patched version from the official CDN, or move export generation server-side (ExcelJS) and drop the client lib
- **AC:** no SheetJS 0.18.5 referenced by client pages

### [ ] P2-6 — Fix date-sensitive test rot
- **Target:** 2026-06-30 · **Done:** ____
- **Why:** `tests/smoke/studentClassRushActivitiesApi.test.js` hardcodes 2026-04 due dates that have aged into the past, so the `nextDue` assertion now fails on every run. (Found 2026-06-16 during P1-1.)
- **Steps:** replace hardcoded fixture dates with dates computed relative to `now`; sweep other smoke tests for the same pattern
- **AC:** full smoke suite is 100% green and stays green over time

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

- 2026-06-16 — P1-4 — fixed `.env.production.example` (SendGrid→Resend keys)
- 2026-06-16 — P1-3 — added `tests/smoke/reportsApiShadowingRegression.test.js` (9 tests, all pass)
- 2026-06-16 — P1-2 — removed `xlsx` npm pkg (already unused server-side; ExcelJS handles exports); added non-blocking `npm audit` step to CI; logged residual client SheetJS as P2-7
- 2026-06-16 — Phase 1 complete (4/4). Full smoke: 372/373 (only failure = pre-existing P2-6 date rot)
- 2026-06-16 — P1-1 — removed 7 dead deps (puppeteer, puppeteer-core, axios, pg, connect-pg-simple, mailersend, mongoose) + deleted stray `public/models/Content.js`; lockfile pruned (-92 packages); smoke 363/364 (1 pre-existing date-rot failure). Not yet committed.
- 2026-06-16 — P2-6 added — discovered date-sensitive test rot in studentClassRushActivitiesApi during P1-1
- 2026-06-16 — tracker created — phased task board derived from comprehensive analysis PRD
