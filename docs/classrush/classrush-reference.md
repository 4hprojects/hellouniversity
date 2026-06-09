# ClassRush — Technical Reference

> Single source of truth for architecture, workflows, socket events, API routes, data model, and security.
> Grounded against the shipped runtime as of 2026-06-09.
> When code conflicts with this document, trust the code.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Routes](#3-routes)
4. [Teacher Workflows](#4-teacher-workflows)
5. [Student Workflows](#5-student-workflows)
6. [Socket Event Reference](#6-socket-event-reference)
7. [REST API Reference](#7-rest-api-reference)
8. [Data Model](#8-data-model)
9. [Security Model](#9-security-model)
10. [Question Types](#10-question-types)
11. [Settings Reference](#11-settings-reference)
12. [Key Implementation Files](#12-key-implementation-files)
13. [Shipped vs Deferred](#13-shipped-vs-deferred)

---

## 1. Overview

ClassRush is a live and self-paced interactive quiz feature inside helloUniversity. It runs in two distinct delivery modes that share the same game deck (questions + settings).

| Mode | Who triggers | Transport | Route |
|------|-------------|-----------|-------|
| Live hosted session | Teacher hosts in real time | Socket.IO `/game` namespace | `/play` (student), `/teacher/live-games/:gameId/host` (teacher) |
| Self-paced assignment | Teacher assigns; student completes on own schedule | REST API | `/classrush/assignments/:assignmentId` |

The two modes are additive. The same saved game can be hosted live any number of times and assigned as self-paced once per class.

---

## 2. Architecture

### Stack

- **Runtime**: Node.js + Express
- **Realtime**: Socket.IO (`/game` namespace), session middleware shared via `io.engine.use(sessionMiddleware)`
- **Persistence**: MongoDB (game decks, live sessions, assignments, attempts)
- **Session**: `express-session` + `connect-mongo` store, cookie-based

### Key module boundaries

```
app/
  configureSession.js      — builds and exports session middleware; wires to app and returns it for Socket.IO
  socketManager.js         — entire live-session runtime (host + player socket handlers, endQuestion, reconnect)

utils/
  liveGameHelpers.js       — question payload builder, result payload, validation helpers
  liveGameSelfPaced.js     — self-paced normalization, attempt evaluation, rank, teacher/student report payloads

routes/
  liveGamePagesRoutes.js   — teacher pages + public /play + student assignment page
  liveGameBuilderApiRoutes.js     — teacher game CRUD, QR, duplicate, reports
  liveGameAssignmentsApiRoutes.js — teacher self-paced assignment endpoints
  studentClassRushApiRoutes.js    — student self-paced load / save / submit endpoints

public/js/liveGames/
  hostController.js        — teacher host UI (preflight → lobby → question → results → podium)
  playerClient.js          — student live player (join → lobby → answer → result → final)
  selfPacedPlayer.js       — student self-paced player (load → answer → save → submit)
  teacherGameBuilder.js    — question/settings builder UI
  teacherGameReports.js    — live report + self-paced assignment report rendering
  liveGameAssignmentModal.js — teacher assignment modal (class select, dates, policy, profile)
```

### Session flow

1. `configureSession(app, mongoUri)` in `app/configureSession.js` builds the session middleware and returns it.
2. `server.js` captures it, calls `io.engine.use(sessionMiddleware)` before `initSocketManager`, so every Socket.IO connection has `socket.request.session` populated.
3. Socket handlers read identity from `socket.request.session` only — client payloads are never trusted for identity.

---

## 3. Routes

### Teacher pages

| Route | Description |
|-------|-------------|
| `GET /teacher/live-games` | ClassRush dashboard — list of saved games |
| `GET /teacher/live-games/new` | Game builder (create mode) |
| `GET /teacher/live-games/:gameId/edit` | Game builder (edit mode) |
| `GET /teacher/live-games/:gameId/host` | Host preflight + live host control room |
| `GET /teacher/live-games/:gameId/reports` | Reports list (live sessions + self-paced assignments) |
| `GET /teacher/live-games/:gameId/reports/:sessionId` | Live session report detail + CSV export |
| `GET /teacher/live-games/:gameId/assignments/:assignmentId` | Self-paced assignment detail |

### Public player route

| Route | Description |
|-------|-------------|
| `GET /play` | Student join screen — PIN + nickname entry; in-page login modal if session requires auth |

Query string: `?pin=XXXXXX` prefills the PIN field.

### Student self-paced route

| Route | Description |
|-------|-------------|
| `GET /classrush/assignments/:assignmentId` | Authenticated student self-paced player |

Requires active login. Logged-out students are redirected to `/login?returnTo=<url>` and returned after authentication.

---

## 4. Teacher Workflows

### 4.1 Create and build a game

1. Navigate to `/teacher/live-games/new` (or from a class workspace: adds `?launchContext=class-workspace&linkedClassId=<id>` to prefill the linked class).
2. Builder loads with an empty question list.
3. Teacher adds questions (multiple choice, true/false, poll, type-answer).
4. First save creates the game and transitions the page to edit mode (`/teacher/live-games/:gameId/edit`).
5. The `Assign` action on the builder is hidden until the first save completes.

### 4.2 Host a live session

1. Teacher opens `/teacher/live-games/:gameId/host`.
2. **Preflight screen** — shows question count, linked class (if any), and a class selector to confirm or override the session class.
3. Teacher clicks **Create Session** → `host:create` socket emitted → server creates a live session in MongoDB, emits the PIN and QR back via callback.
4. **Lobby screen** — displays PIN, QR code, and player count. Players joining appear as chips. Count animates on each join.
5. Teacher clicks **Start Game** → `host:start` socket emitted → server sends `game:question` to all connected clients.
6. **Question screen** (repeated per question):
   - Host sees: question text, answer options, timer countdown, live answer count bar.
   - Answering completes automatically when timer expires, all players answer, or host clicks **Skip Timer**.
   - Host can **Pause** (freezes timer, locks answers) and **Resume**.
   - Server broadcasts `game:questionResults` + `game:leaderboard` when the question ends.
7. **Results screen** — host sees per-option answer distribution, correct answer, top 10 leaderboard.
8. Host clicks **Next Question** → cycle repeats from step 6.
9. After the final question, host sees the **Podium/Final screen**.
10. **End Game** has a two-step inline confirmation that shows the current answered count before confirming.

### 4.3 Assign as self-paced

1. From the ClassRush dashboard card or builder edit page, click **Assign**.
2. Assignment modal opens (`liveGameAssignmentModal.js`):
   - Select class.
   - Optionally select specific students (or leave as whole class).
   - Set open date and due date.
   - Set due policy: `lock_after_due` or `allow_late_submission`.
   - Set scoring profile: `accuracy`, `timed_accuracy`, or `live_scoring`.
3. Click **Save Assignment** → `PUT /api/live-games/:gameId/assignments`.
4. One assignment per `gameId + classId` is enforced — reopening the modal edits the existing assignment.
5. Deleting the assignment removes it for the entire class.

### 4.4 Review live session reports

1. Navigate to `/teacher/live-games/:gameId/reports`.
2. Report list loads live session history and self-paced assignment data independently (each has its own error state and retry button).
3. Click a live session → `/teacher/live-games/:gameId/reports/:sessionId` — detail page with:
   - Per-question accuracy + option distribution + typed-answer visibility.
   - Non-responder list.
   - Average response time.
   - Score ranking.
   - CSV export button (`GET /api/live-games/:gameId/reports/:sessionId/export.csv`).

### 4.5 Review self-paced assignment

1. Navigate to `/teacher/live-games/:gameId/assignments/:assignmentId`.
2. Detail page shows:
   - Submitted / in-progress / not-started / overdue counts.
   - Per-student row: score, accuracy, time spent, late flag, submitted-at.
   - Leaderboard (when scoring profile supports rank).
   - Per-question accuracy breakdown.

---

## 5. Student Workflows

### 5.1 Join a live session

1. Student navigates to `/play` (or uses a link with `?pin=XXXXXX`).
2. Enters PIN and nickname.
3. If the session requires login and the student is not logged in:
   - Error shows a **Log in** prompt.
   - In-page login modal opens (`authClient.js`).
   - After successful login, join is retried automatically with the same PIN and nickname.
4. `player:join` socket emitted → server validates PIN, session status, and class enrollment (if session is class-linked).
5. On success, student sees the **Waiting** screen until the host starts.

### 5.2 Live session play loop (per question)

1. `game:question` received → **Answer screen** shown.
   - Multiple choice / true-false: tap an answer button to submit (`player:answer`).
   - Type-answer: text input auto-focused; type and tap **Submit Answer**.
   - Poll: tap any option; not scored.
2. After submitting: **Submitted** screen. A grace-period timeout fires a toast if results don't arrive within ~10s after the question deadline.
3. `game:questionResults` received → **Result screen**:
   - Correct: shows points earned.
   - Wrong: shows "Wrong!" + (for type-answer) submitted text and accepted answer.
   - Time's up: shows no-answer state.
   - Poll: shows "Response recorded!".
4. `game:leaderboard` received → shown on the result screen (rank widget).
5. Host advances → `game:question` received for next question. Cycle repeats.
6. `game:finished` received → **Final** screen. `game:myResult` received → rank and total score rendered.

### 5.3 Reconnect during live session

- If a player disconnects and rejoins within the session window, `player:join` with the same PIN and nickname (matching the session's `participantKey`) restores their slot.
- Callback includes `reconnected: true` and a `reconnectState` snapshot (current phase, last question, last result, score).
- Host sees a disconnect chip event; on reconnect sees `lobby:playerDisconnected` reversed.

### 5.4 Open / resume a self-paced assignment

1. Student accesses the assignment from `/activities`, class detail, dashboard summary, or the direct URL.
2. Page loads at `/classrush/assignments/:assignmentId`. Auth required; redirects to login with `returnTo` if needed.
3. **Ready screen** — shows assignment title, due date, scoring profile, and attempt status.
4. Student clicks **Start ClassRush** (or **Resume** if in progress) → `GET /api/student/classrush/assignments/:assignmentId`.
5. **Answer screen** rendered question-by-question.
   - Each answer is auto-saved on selection/entry via `PUT /api/student/classrush/assignments/:assignmentId/progress`.
   - Progress is debounced; saving state is shown in the question meta line.
   - Timed questions count elapsed time per question.
6. After the last question, the **Submit** button becomes active.
7. Student submits → `POST /api/student/classrush/assignments/:assignmentId/submit`.
8. **Final screen** — shows score, accuracy, time, and rank (if scoring profile supports it).
   - If submitted after due date and policy is `allow_late_submission`: warning banner reads "Submitted after the due date — your teacher may apply a late penalty to your score."

---

## 6. Socket Event Reference

Namespace: `/game`

Identity is server-authoritative. `host:create` and `player:join` read from `socket.request.session`, not from client payloads.

### Client → Server (host)

| Event | Payload | Description |
|-------|---------|-------------|
| `host:create` | `{ gameId, userName?, linkedClassId? }` | Creates a live session. Returns `{ pin, qrUrl, sessionId, gameTitle, questionCount, requireLogin, linkedClass, status, playerCount, players }` via callback. |
| `host:start` | _(none)_ | Starts the session; emits first `game:question` to all. |
| `host:nextQuestion` | _(none)_ | Advances to next question after results/leaderboard. |
| `host:pause` | _(none)_ | Pauses current question timer. Broadcasts `game:paused`. |
| `host:resume` | _(none)_ | Resumes paused question. Broadcasts `game:resumed` with remaining deadline. |
| `host:endQuestion` | _(none)_ | Manually ends the current question (same as timer expiry). |
| `host:kick` | `{ socketId }` | Removes a player. Emits `game:kicked` to that socket. |
| `host:end` | _(none)_ | Ends the session. Broadcasts `game:cancelled` + computes final results. |

### Client → Server (player)

| Event | Payload | Description |
|-------|---------|-------------|
| `player:join` | `{ pin, nickname }` | Joins a session. Returns success/error via callback; includes reconnect state if rejoining. |
| `player:answer` | `{ answerId?, text? }` | Submits an answer. `answerId` for choice questions, `text` for type-answer. Returns `{ correct, points, streak }` via callback. |

### Server → Client (all in session room)

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `lobby:playerJoined` | → all | `{ playerCount, players: [{ displayName, isVerified }] }` | A player joined the lobby. |
| `lobby:playerLeft` | → all | `{ playerCount, playerName }` | A player left the lobby. |
| `lobby:playerDisconnected` | → all | `{ playerName }` | A player disconnected mid-session. |
| `game:started` | → all | `{ questionCount }` | Session has started. |
| `game:question` | → all | `{ questionIndex, question: { title, type, options?, timeLimit }, deadline }` | New question begins. `options` omitted for type-answer. |
| `game:paused` | → all | `{ pausedQuestionRemainingMs }` | Question timer paused. |
| `game:resumed` | → all | `{ deadline }` | Question timer resumed with updated deadline. |
| `game:answerCount` | → host only | `{ answerCount, totalPlayers }` | Updated answer count for the live bar. |
| `game:questionResults` | → all | `{ questionType, correctOptionIds?, acceptedAnswers?, optionTally, responseCount, averageMs }` | Question ended; includes per-option counts. |
| `game:leaderboard` | → all | `{ leaderboard: [{ rank, displayName, score, delta }] }` | Current top-10 after a question. |
| `game:myQuestionResult` | → player only | `{ myRank, myScore, scoreDelta }` | Player's personal rank/score after a question. |
| `game:waitForNext` | → players | _(none)_ | ⚠ Handler exists in playerClient.js but this event is not currently emitted by the server. Dead listener. |
| `game:finished` | → all | `{ finalLeaderboard }` | Session ended normally. |
| `game:myResult` | → player only | `{ myRank, myScore }` | Player's final rank and total score. |
| `game:kicked` | → player only | _(none)_ | Player was removed by host. |
| `game:cancelled` | → all | `{ reason }` | Session was ended or expired. |
| `game:hostDisconnected` | → players | _(none)_ | Host socket dropped. |
| `game:hostReconnected` | → players | _(none)_ | Host socket restored. |

---

## 7. REST API Reference

### Teacher — game management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/live-games` | List teacher's saved games |
| `POST` | `/api/live-games` | Create a new game |
| `GET` | `/api/live-games/:gameId` | Get game details + questions |
| `PUT` | `/api/live-games/:gameId` | Update game (title, questions, settings) |
| `DELETE` | `/api/live-games/:gameId` | Delete a game |
| `POST` | `/api/live-games/:gameId/duplicate` | Duplicate a game |
| `GET` | `/api/live-games/:gameId/qr` | Generate QR code image for a live session PIN |

### Teacher — reports

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/live-games/:gameId/reports` | List all completed live sessions for a game |
| `GET` | `/api/live-games/:gameId/reports/:sessionId` | Detailed session report (per-question, per-player) |
| `GET` | `/api/live-games/:gameId/reports/:sessionId/export.csv` | CSV export of session report |

### Teacher — self-paced assignments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/live-games/:gameId/assignment-targets` | Lists classes the teacher can assign to |
| `PUT` | `/api/live-games/:gameId/assignments` | Create or update the assignment for a class |
| `GET` | `/api/live-games/:gameId/assignments` | List all assignments for a game |
| `GET` | `/api/live-games/:gameId/assignments/:assignmentId` | Teacher assignment detail + student progress |
| `DELETE` | `/api/live-games/:gameId/assignments/:assignmentId` | Remove an assignment |

### Student — self-paced

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/student/classrush/assignments/:assignmentId` | Load assignment + resume current attempt |
| `PUT` | `/api/student/classrush/assignments/:assignmentId/progress` | Save answer for current question |
| `POST` | `/api/student/classrush/assignments/:assignmentId/submit` | Submit completed attempt |

---

## 8. Data Model

All collections are in MongoDB.

### `liveGames` — saved game decks

```js
{
  _id: ObjectId,
  ownerId: string,           // teacher userId
  title: string,
  description: string,
  defaultLinkedClassId: string | null,  // optional default class for new sessions
  questions: [
    {
      _id: ObjectId,
      type: 'multiple_choice' | 'true_false' | 'poll' | 'type_answer',
      title: string,
      options: [{ _id, text, isCorrect }],  // omitted for type_answer
      acceptedAnswers: string[],            // type_answer only; first is display answer
      timeLimitSeconds: number,
      orderIndex: number
    }
  ],
  settings: {
    requireLogin: boolean,
    showLeaderboardAfterEach: boolean,
    maxPlayers: number,
    randomizeQuestionOrder: boolean,
    randomizeAnswerOrder: boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### `liveSessions` — live session state (in-progress and completed)

```js
{
  _id: string,               // session room ID (also used as Socket.IO room name)
  gameId: string,
  gameTitle: string,
  hostId: string,
  hostSocketId: string,
  pin: string,               // 6-digit join code
  linkedClassId: string | null,
  linkedClassSnapshot: {
    classId, className, enrolledStudentIds: string[]
  } | null,
  requireLogin: boolean,
  status: 'waiting' | 'active' | 'ended',
  questionOrder: number[],   // randomized indices if enabled
  currentQuestionIndex: number,
  questionCount: number,
  players: [
    {
      userId: string | null,
      studentIDNumber: string | null,
      displayName: string,
      nickname: string,
      participantKey: string,  // used for reconnect matching
      socketId: string,
      isVerified: boolean,
      score: number,
      answers: [{ questionIndex, answerId?, text?, isCorrect, points, responseMs }]
    }
  ],
  disconnectedPlayers: [...],  // players who disconnected but may reconnect
  startedAt: Date,
  endedAt: Date | null,
  maxPlayers: number,
  settings: { /* same shape as liveGames.settings */ }
}
```

### `liveGameAssignments` — self-paced assignment configuration

```js
{
  _id: ObjectId,
  gameId: string,
  classId: string,
  teacherId: string,
  targetStudentIds: string[] | null,  // null = whole class
  openDate: Date | null,
  dueDate: Date | null,
  duePolicy: 'lock_after_due' | 'allow_late_submission',
  scoringProfile: 'accuracy' | 'timed_accuracy' | 'live_scoring',
  createdAt: Date,
  updatedAt: Date
}
```

### `liveGameAttempts` — student self-paced attempt (one per student per assignment)

```js
{
  _id: ObjectId,
  assignmentId: string,
  gameId: string,
  studentIDNumber: string,
  userId: string,
  status: 'in_progress' | 'submitted',
  currentQuestionIndex: number,
  responses: [
    {
      questionIndex: number,
      answerId: string | null,        // multiple_choice / true_false
      text: string | null,            // type_answer
      isCorrect: boolean,
      elapsedTimeMs: number,
      savedAt: Date
    }
  ],
  score: number | null,
  percent: number | null,
  isLateSubmission: boolean,
  startedAt: Date,
  submittedAt: Date | null
}
```

---

## 9. Security Model

### HTTP route guards

All teacher API routes require `role === 'teacher'` (checked via session middleware). All student API routes require an active login with `role === 'student'`. The public `/play` route is unauthenticated; the session is used only when login is required by the live session config.

### Socket identity

Socket.IO engine is wired to the Express session middleware (`io.engine.use(sessionMiddleware)`) so `socket.request.session` is populated on every connection. Both `host:create` and `player:join` read identity exclusively from the session:

```js
// host:create
const userId = socket.request.session?.userId;
const hostUserRole = socket.request.session?.role;
const userName = [session.firstName, session.lastName].filter(Boolean).join(' ') || 'Host';

// player:join
const userId = socket.request.session?.userId || null;
const studentIDNumber = normalizeStudentId(socket.request.session?.studentIDNumber);
```

Client-supplied `userId` and `studentIDNumber` fields are ignored. If `userId` is missing from session on `host:create`, the handler returns `{ error: 'Authentication required.' }` and does nothing.

### `endQuestion` idempotency

Three code paths can end a question: timer deadline, `host:endQuestion`, and all-answered auto-trigger. A synchronous `endedAt` timestamp is set before the first `await` in `endQuestion`. The second caller sees `questionResult.endedAt` already set and returns immediately, preventing double-broadcast of results.

### Class-linked session access

When a live session is linked to a class, students must be logged in and their `studentIDNumber` must appear in the class enrollment snapshot captured at session creation. Non-enrolled students receive an error on join.

---

## 10. Question Types

| Type | Builder ID | Answer input | Scoring |
|------|-----------|--------------|---------|
| Multiple choice | `multiple_choice` | One of 2–4 labeled options | Points for correct + speed bonus (in live_scoring profile) |
| True / False | `true_false` | True or False | Same as multiple_choice |
| Poll | `poll` | One of 2–4 options | No score; response is recorded only |
| Type answer | `type_answer` | Free text input | Correct if submitted text matches any accepted answer (case-insensitive, trimmed); aliases supported |

For type-answer, `acceptedAnswers[0]` is the canonical display answer shown on result screens when a player answers wrong.

---

## 11. Settings Reference

### Game-level settings (stored on `liveGames`)

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `requireLogin` | boolean | false | If true, students must be logged in to join |
| `showLeaderboardAfterEach` | boolean | true | Show leaderboard on host after each question result |
| `maxPlayers` | number | 100 | Hard cap on concurrent players |
| `randomizeQuestionOrder` | boolean | false | Shuffled per session, stable through reconnects |
| `randomizeAnswerOrder` | boolean | false | Shuffled per session, stable through reconnects |

### Assignment-level settings (stored on `liveGameAssignments`)

| Setting | Options | Notes |
|---------|---------|-------|
| `duePolicy` | `lock_after_due` / `allow_late_submission` | Determines if student can still open the assignment after due date |
| `scoringProfile` | `accuracy` | Correctness only; no time component |
| | `timed_accuracy` | Correctness + per-question elapsed time |
| | `live_scoring` | Speed-weighted points, same formula as live sessions |
| `targetStudentIds` | `null` / `string[]` | `null` = whole class; array = selected students only |

---

## 12. Key Implementation Files

| File | Responsibility |
|------|---------------|
| `app/configureSession.js` | Builds session middleware; returns it so `server.js` can wire it to Socket.IO |
| `app/socketManager.js` | All live-session socket logic: host/player handlers, `endQuestion`, reconnect, stale-lobby cleanup |
| `utils/liveGameHelpers.js` | `buildQuestionPayload`, `buildQuestionResultsPayload` (includes `acceptedAnswers`), validation |
| `utils/liveGameSelfPaced.js` | Self-paced attempt normalization, scoring by profile, rank, teacher report payload |
| `routes/liveGamePagesRoutes.js` | Teacher page rendering, `/play`, `/classrush/assignments/:id` with auth guard + returnTo |
| `routes/liveGameBuilderApiRoutes.js` | Teacher game CRUD, QR, duplicate, live reports |
| `routes/liveGameAssignmentsApiRoutes.js` | Teacher assignment upsert/list/detail/delete |
| `routes/studentClassRushApiRoutes.js` | Student load/progress/submit with enrollment + window enforcement |
| `public/js/liveGames/hostController.js` | Preflight, lobby with join animation, question/pause/resume/end controls, inline End Game confirm |
| `public/js/liveGames/playerClient.js` | Join modal, live game loop, result rendering (with accepted-answer display), stuck-submitted timeout, accessibility announcer |
| `public/js/liveGames/selfPacedPlayer.js` | Self-paced player: load/render/save/submit, late-submission banner, accessibility announcer |
| `public/js/liveGames/teacherGameBuilder.js` | Question list, answer editing, type-answer alias editing, settings panel, drag-and-drop reorder |
| `public/js/liveGames/teacherGameReports.js` | Live report + self-paced assignment list rendering, independent error states with retry |
| `public/js/liveGames/liveGameAssignmentModal.js` | Assignment modal: class select, roster targeting, dates, policy, profile |
| `views/pages/play.ejs` | Public player page: join form, banners (`aria-live`), all player screens, login dialog |
| `views/pages/student/classrush-assignment.ejs` | Self-paced player page: banner, announcer, all self-paced screens |
| `views/pages/teacher/live-games/host.ejs` | Host page: preflight, lobby, question/results/leaderboard/podium screens, control bar, inline End Game confirm |

---

## 13. Shipped vs Deferred

### Shipped (as of 2026-06-09)

- Live teacher-hosted sessions (full flow: preflight → lobby → questions → results → podium)
- Socket.IO session auth (identity from server session, not client payload)
- `endQuestion` idempotency guard (timestamp lock before first `await`)
- Self-paced assignments (one per game+class, one attempt per student)
- Scoring profiles: `accuracy`, `timed_accuracy`, `live_scoring`
- Due policies: `lock_after_due`, `allow_late_submission`
- Question types: multiple_choice, true_false, poll, type_answer
- Class-linked sessions with roster enforcement
- Pause / resume controls
- Question and answer order randomization (stable through reconnects)
- Host and player reconnect recovery
- Roster-only join enforcement for class-linked sessions
- In-page login modal at `/play` with auto-retry on success
- Safe `returnTo` redirect for protected ClassRush pages after login
- CSV export for live session reports
- Self-paced student activity integration (activities, class detail, dashboard)
- Teacher self-paced assignment detail page
- UX polish (2026-06-09): End Game confirm, reports retry, stuck-submitted toast, join field restore, player-joined animation, type-answer accepted-answer display, late-submission banner copy, mobile pause banner repositioning, sticky Back-to-Activities link, answer grid max-width, `aria-live` regions, type-answer auto-focus

### Deferred

- Bulk assignment to multiple classes in one action
- Multiple attempts or retakes per student
- Full post-submit answer review for self-paced
- Self-paced CSV export
- Slide blocks / mixed lecture sequences
- Team mode
- Question banks and shared content libraries
- Department / institution adoption dashboards
- Gradebook sync or release workflows
- Institution-wide collaboration and approvals
- AI-assisted question generation or import
- Mastery analytics and competency mapping
- Institution event or tournament layers
