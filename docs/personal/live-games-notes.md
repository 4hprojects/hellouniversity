# Live Games Feature (Kahoot Clone)

Added March 18, 2026

## What It Does

A Kahoot-style live quiz game system. Teachers create game decks, host live sessions with a PIN code, and students join from their phones/laptops to answer questions in real time. Scoring is based on speed and streaks.

## March 19, 2026 Stability Update

- Fixed CSP boot issues on both host and player pages by using nonce-backed init scripts.
- `host:create` now backfills missing `gamePin` values for older game documents instead of refusing to host them.
- Active-session recovery now keeps one canonical live session per PIN and cancels duplicates so host and player no longer split across different `sessionId`s.
- Stale live-session rows are cancelled or expired in Mongo so reused PINs do not get stuck behind orphaned sessions.
- Player reconnect handling now restores PIN/nickname from browser storage and reclaims the same slot after refresh, tab close, or many crash flows.
- Player reconnect grace period is 3 minutes; host reconnect grace period is 5 minutes.
- Players who do not return inside the reconnect window are removed from `session.players`, preventing ghost nicknames from blocking the lobby.
- Host reconnect now restores the current in-progress or results state instead of always reopening on the lobby view.
- Players now see current rank and total score after each question.
- Hosts now see the top 10 players after each round on the results screen.
- Final host screen now includes post-game actions to host the same game again or return to the games dashboard.

## New Dependencies

- `socket.io@4` — Real-time WebSocket communication for the game engine

## New DB Collections

- `tblLiveGames` — Game decks (questions, settings, owner). Index on `ownerUserId`.
- `tblLiveSessions` — Active game sessions (PIN, players, scores, state). Unique sparse index on `pin`.

## New Files

### Backend
- `utils/liveGameHelpers.js` — Pure helpers: PIN generation, scoring, leaderboard, validation
- `app/socketManager.js` — Socket.IO `/game` namespace with host & player events, timers, reconnect, lobby TTL cleanup
- `routes/liveGameBuilderApiRoutes.js` — REST CRUD API for game decks (`/api/live-games`)
- `routes/liveGamePagesRoutes.js` — EJS page routes for teacher + public player page

### Frontend JS (IIFE pattern)
- `public/js/liveGames/teacherGameDashboard.js` — Dashboard: fetch CRUD, search, pagination
- `public/js/liveGames/teacherGameBuilder.js` — Builder: question CRUD, drag-drop reorder, save/load
- `public/js/liveGames/hostController.js` — Host Socket.IO client: reconnect restore, timer, round top-10 results, final-screen actions
- `public/js/liveGames/playerClient.js` — Player Socket.IO client: PIN join, reconnect persistence, answer selection, per-question rank display

### Views (EJS)
- `views/pages/teacher/live-games/dashboard.ejs` — Game listing page
- `views/pages/teacher/live-games/builder.ejs` — Question editor with sidebar + options
- `views/pages/teacher/live-games/host.ejs` — Full-screen host panel (lobby/question/results/leaderboard/podium + final actions)
- `views/pages/play.ejs` — Standalone mobile-first player page (join/waiting/answer/result/final/kicked with CSP-safe boot)

### CSS
- `public/css/live_games.css` — Builder + dashboard styles
- `public/css/live_game_host.css` — Full-screen host panel styles
- `public/css/live_game_player.css` — Mobile-first player UI styles

### Tests
- `tests/smoke/liveGameBuilderApi.test.js` — 20 tests (API auth guards, CRUD, helper unit tests)
- `tests/smoke/socketManager.test.js` — Live-session recovery smoke test for stale PIN/session cleanup

## Modified Files

- `server.js` — Attached Socket.IO to HTTP server, wired `initSocketManager`
- `app/database.js` — Added `tblLiveGames` + `tblLiveSessions` collections & indexes
- `app/registerRoutes.js` — Mounted `/api/live-games` API and live game page routes
- `views/partials/nav.ejs` — Added "Live Games" nav link for teacher role
- `tests/helpers/inMemoryMongo.js` — Added `skip()`, `limit()`, `deleteOne()` to in-memory cursor

## Key Routes

| Route | Auth | Purpose |
|---|---|---|
| `/teacher/live-games` | Teacher | Dashboard — list/search/paginate games |
| `/teacher/live-games/new` | Teacher | Create new game |
| `/teacher/live-games/:id/edit` | Teacher | Edit existing game |
| `/teacher/live-games/:id/host` | Teacher | Full-screen host panel |
| `/play` | Public | Player join page (no login required) |
| `/play?pin=123456` | Public | Direct join with pre-filled PIN |
| `/api/live-games` | Teacher | GET list, POST create |
| `/api/live-games/:id` | Teacher | GET, PUT, DELETE single game |
| `/api/live-games/:id/duplicate` | Teacher | POST clone a game |

## Socket.IO Events (`/game` namespace)

**Host emits:** `host:create`, `host:start`, `host:nextQuestion`, `host:endQuestion`, `host:kick`, `host:end`
**Player emits:** `player:join`, `player:answer`
**Server broadcasts:** `lobby:playerJoined`, `lobby:playerLeft`, `game:question`, `game:answerCount`, `game:questionResults`, `game:leaderboard`, `game:finished`, `game:kicked`, `game:cancelled`
**Server per-player emits:** `game:myQuestionResult`, `game:myResult`
