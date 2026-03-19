const {
  calculateScore,
  buildLeaderboard,
  sanitizeQuestionForPlayer,
  generateGameDocPin,
  generateAndUploadGameQr
} = require('../utils/liveGameHelpers');

const RECONNECT_WINDOW_MS = 3 * 60 * 1000;
const HOST_RECONNECT_WINDOW_MS = 5 * 60 * 1000;
const LOBBY_TTL_MS = 2 * 60 * 60 * 1000;
const ACTIVE_SESSION_STATUSES = ['lobby', 'in_progress'];

function logJoinBlocked(details) {
  console.log('[ClassRush] player:join blocked', details);
}

function isSessionActive(session) {
  return Boolean(session && ACTIVE_SESSION_STATUSES.includes(session.status));
}

/**
 * Active game state kept in memory for low-latency access.
 * Key: sessionId (string), Value: game state object.
 */
const activeSessions = new Map();

function initSocketManager(io, { getLiveGamesCollection, getLiveSessionsCollection, getUsersCollection }) {
  console.log('[ClassRush] socketManager build loaded');
  const gameNs = io.of('/game');

  gameNs.on('connection', (socket) => {
    // ── Host events ──────────────────────────────────────────────

    socket.on('host:create', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const sessionsCol = getLiveSessionsCollection();
        const gamesCol = getLiveGamesCollection();
        if (!sessionsCol || !gamesCol) return cb({ error: 'Service unavailable.' });

        const { gameId, userId, userName } = data || {};
        console.log('[ClassRush] host:create attempt', {
          gameId: gameId || null,
          userId: userId || null,
          userName: userName || null,
          socketId: socket.id
        });
        if (!gameId || !userId) return cb({ error: 'Missing gameId or userId.' });

        const { ObjectId } = require('mongodb');
        if (!ObjectId.isValid(gameId)) return cb({ error: 'Invalid gameId.' });

        let game = await gamesCol.findOne({ _id: new ObjectId(gameId), ownerUserId: userId });
        if (!game) {
          // Admin bypass: admins can host any game
          const usersCol = typeof getUsersCollection === 'function' ? getUsersCollection() : null;
          if (usersCol && ObjectId.isValid(userId)) {
            const hostUser = await usersCol.findOne(
              { _id: new ObjectId(userId) },
              { projection: { role: 1 } }
            );
            if (hostUser?.role === 'admin') {
              game = await gamesCol.findOne({ _id: new ObjectId(gameId) });
            }
          }
        }
        if (!game) return cb({ error: 'Game not found or access denied.' });
        if (!game.questions || game.questions.length === 0) return cb({ error: 'Game has no questions.' });

        if (!game.gamePin) {
          const generatedPin = await generateGameDocPin(gamesCol);
          let generatedQrKey = null;

          try {
            generatedQrKey = await generateAndUploadGameQr(generatedPin);
          } catch (qrErr) {
            console.warn('ClassRush host:create QR backfill failed (non-fatal):', qrErr.message);
          }

          await gamesCol.updateOne(
            { _id: game._id },
            { $set: { gamePin: generatedPin, gameQrKey: generatedQrKey || null, updatedAt: new Date() } }
          );

          game.gamePin = generatedPin;
          game.gameQrKey = generatedQrKey || null;

          console.log('[ClassRush] host:create backfilled missing gamePin', {
            gameId: game._id.toHexString(),
            pin: generatedPin
          });
        }

        const pin = game.gamePin;
        await cancelOrphanedSessionsByPin(sessionsCol, pin);

        const duplicateSessions = getActiveSessionsByPin(pin);
        const reconnectSession = pickPreferredSession(
          duplicateSessions.filter(session => session.gameId === game._id.toHexString() && session.hostUserId === userId)
        );
        if (reconnectSession) {
          await cancelDuplicateSessionsByPin(gameNs, sessionsCol, pin, reconnectSession._id);
          attachHostToSession(socket, gameNs, reconnectSession);

          console.log('[ClassRush] host:create reconnect', {
            sessionId: reconnectSession._id,
            gameId,
            pin: reconnectSession.pin,
            hostUserId: userId,
            playerCount: reconnectSession.players.length
          });

          return cb({
            success: true,
            sessionId: reconnectSession._id,
            pin: reconnectSession.pin,
            gameTitle: reconnectSession.gameTitle,
            questionCount: reconnectSession.questionCount,
            requireLogin: reconnectSession.requireLogin,
            reconnected: true,
            status: reconnectSession.status,
            playerCount: reconnectSession.players.length,
            players: reconnectSession.players.map(p => ({ name: p.odName, score: p.score })),
            reconnectState: buildHostReconnectState(reconnectSession)
          });
        }

        const sessionDoc = {
          gameId: game._id.toHexString(),
          pin,
          hostUserId: userId,
          hostSocketId: socket.id,
          status: 'lobby',
          requireLogin: game.settings?.requireLogin || false,
          maxPlayers: game.settings?.maxPlayers || 50,
          players: [],
          questions: game.questions,
          currentQuestionIndex: -1,
          questionStartedAt: null,
          questionDeadline: null,
          results: [],
          hostView: 'lobby',
          gameTitle: game.title,
          questionCount: game.questions.length,
          startedAt: null,
          finishedAt: null,
          createdAt: new Date()
        };

        let insertResult;
        try {
          insertResult = await sessionsCol.insertOne(sessionDoc);
        } catch (err) {
          if (err?.code === 11000) {
            await cancelOrphanedSessionsByPin(sessionsCol, pin);
            insertResult = await sessionsCol.insertOne(sessionDoc);
          } else {
            throw err;
          }
        }
        const sessionId = insertResult.insertedId.toHexString();

        activeSessions.set(sessionId, {
          ...sessionDoc,
          _id: sessionId,
          timers: {},
          disconnected: new Map()
        });
        await cancelDuplicateSessionsByPin(gameNs, sessionsCol, pin, sessionId);

        attachHostToSession(socket, gameNs, activeSessions.get(sessionId));

        cb({
          success: true,
          sessionId,
          pin,
          gameTitle: game.title,
          questionCount: game.questions.length,
          requireLogin: sessionDoc.requireLogin
        });
        console.log('[ClassRush] host:create success', {
          sessionId,
          gameId: sessionDoc.gameId,
          pin,
          hostUserId: userId
        });
      } catch (err) {
        console.error('host:create error:', err);
        if (err?.code === 11000) {
          return cb({ error: 'An active session already exists for this game PIN. Refresh to reconnect or end the old session first.' });
        }
        cb({ error: 'Failed to create session.' });
      }
    });

    socket.on('host:start', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const session = getHostSession(socket);
        console.log('[ClassRush] host:start attempt', {
          socketId: socket.id,
          sessionId: socket.sessionId || null,
          hasSession: Boolean(session)
        });
        if (!session) return cb({ error: 'No active session.' });
        if (session.status !== 'lobby') {
          console.log('[ClassRush] host:start blocked', {
            reason: 'status_not_lobby',
            sessionId: session._id,
            status: session.status
          });
          return cb({ error: 'Game already started.' });
        }
        if (session.players.length === 0) {
          console.log('[ClassRush] host:start blocked', {
            reason: 'no_players',
            sessionId: session._id,
            pin: session.pin
          });
          return cb({ error: 'No players have joined.' });
        }

        session.status = 'in_progress';
        session.startedAt = new Date();

        await persistSessionUpdate(getLiveSessionsCollection(), session._id, {
          status: 'in_progress',
          startedAt: session.startedAt
        });

        console.log('[ClassRush] host:start', {
          sessionId: session._id,
          gameId: session.gameId,
          pin: session.pin,
          hostUserId: session.hostUserId,
          playerCount: session.players.length,
          startedAt: session.startedAt.toISOString()
        });

        gameNs.to(session._id).emit('game:started', { questionCount: session.questionCount });
        cb({ success: true });
      } catch (err) {
        console.error('host:start error:', err);
        cb({ error: 'Failed to start game.' });
      }
    });

    socket.on('host:nextQuestion', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const session = getHostSession(socket);
        if (!session) return cb({ error: 'No active session.' });
        if (session.status !== 'in_progress') return cb({ error: 'Game not in progress.' });

        const nextIndex = session.currentQuestionIndex + 1;
        if (nextIndex >= session.questions.length) {
          return cb({ error: 'No more questions. End the game.' });
        }

        clearQuestionTimer(session);

        session.currentQuestionIndex = nextIndex;
        session.hostView = 'question';
        const question = session.questions[nextIndex];
        const now = new Date();
        const deadlineMs = (question.timeLimitSeconds || 20) * 1000;
        session.questionStartedAt = now;
        session.questionDeadline = new Date(now.getTime() + deadlineMs);

        session.results[nextIndex] = {
          questionId: question.id,
          correctOptionId: question.options.find(o => o.isCorrect)?.id || null,
          responses: []
        };

        await persistSessionUpdate(getLiveSessionsCollection(), session._id, {
          currentQuestionIndex: nextIndex,
          hostView: session.hostView,
          questionStartedAt: session.questionStartedAt,
          questionDeadline: session.questionDeadline
        });

        const sanitized = sanitizeQuestionForPlayer(question);
        gameNs.to(session._id).emit('game:question', {
          questionIndex: nextIndex,
          totalQuestions: session.questions.length,
          question: sanitized,
          deadline: session.questionDeadline.toISOString()
        });

        session.timers.questionTimeout = setTimeout(() => {
          endQuestion(gameNs, session, getLiveSessionsCollection());
        }, deadlineMs);

        cb({ success: true, questionIndex: nextIndex });
      } catch (err) {
        console.error('host:nextQuestion error:', err);
        cb({ error: 'Failed to advance question.' });
      }
    });

    socket.on('host:endQuestion', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const session = getHostSession(socket);
        if (!session) return cb({ error: 'No active session.' });
        await endQuestion(gameNs, session, getLiveSessionsCollection());
        cb({ success: true });
      } catch (err) {
        console.error('host:endQuestion error:', err);
        cb({ error: 'Failed to end question.' });
      }
    });

    socket.on('host:kick', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const session = getHostSession(socket);
        if (!session) return cb({ error: 'No active session.' });
        const { playerId } = data || {};
        if (!playerId) return cb({ error: 'Missing playerId.' });

        const idx = session.players.findIndex(p => p.odId === playerId);
        if (idx === -1) return cb({ error: 'Player not found.' });

        session.players.splice(idx, 1);
        const targetSocket = gameNs.sockets.get(playerId);
        if (targetSocket) {
          targetSocket.emit('game:kicked');
          targetSocket.leave(session._id);
        }
        gameNs.to(session._id).emit('lobby:playerLeft', {
          playerCount: session.players.length,
          players: session.players.map(p => ({ name: p.odName, score: p.score }))
        });
        cb({ success: true });
      } catch (err) {
        console.error('host:kick error:', err);
        cb({ error: 'Failed to kick player.' });
      }
    });

    socket.on('host:end', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const session = getHostSession(socket);
        if (!session) return cb({ error: 'No active session.' });

        clearQuestionTimer(session);
        session.status = 'finished';
        session.finishedAt = new Date();
        session.hostView = 'podium';

        const leaderboard = buildLeaderboard(session.players);

        await persistSessionUpdate(getLiveSessionsCollection(), session._id, {
          status: 'finished',
          finishedAt: session.finishedAt,
          hostView: session.hostView,
          players: session.players,
          results: session.results
        });

        gameNs.to(session._id).emit('game:finished', {
          leaderboard: leaderboard.slice(0, 50),
          podium: leaderboard.slice(0, 3)
        });

        // Send per-player rank/score to each player individually
        for (const p of session.players) {
          const entry = leaderboard.find(l => l.odId === p.odId);
          gameNs.to(p.odId).emit('game:myResult', {
            myRank: entry ? entry.rank : null,
            myScore: p.score
          });
        }

        activeSessions.delete(session._id);
        cb({ success: true, leaderboard: leaderboard.slice(0, 10) });
      } catch (err) {
        console.error('host:end error:', err);
        cb({ error: 'Failed to end game.' });
      }
    });

    // ── Player events ────────────────────────────────────────────

    socket.on('player:join', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const sessionsCol = getLiveSessionsCollection();
        if (!sessionsCol) return cb({ error: 'Service unavailable.' });

        const { pin, nickname, userId } = data || {};
        console.log('[ClassRush] player:join attempt', {
          pin: pin || null,
          nickname: nickname || null,
          userId: userId || null,
          socketId: socket.id
        });
        if (!pin || !nickname || typeof nickname !== 'string' || !nickname.trim()) {
          logJoinBlocked({
            reason: 'missing_pin_or_nickname',
            pin: pin || null,
            nickname: nickname || null,
            socketId: socket.id
          });
          return cb({ error: 'PIN and nickname are required.' });
        }

        const cleanNickname = nickname.trim().slice(0, 30);

        // Find active session by PIN
        let session = findSessionByPin(pin);
        if (!session) {
          const sessionDocs = await sessionsCol.find({
            pin,
            status: { $in: ['lobby', 'in_progress'] }
          }).toArray();
          const sessionDoc = pickPreferredSession(
            sessionDocs.map((doc) => ({ ...doc, _id: doc._id.toHexString() }))
          );
          if (!sessionDoc) {
            logJoinBlocked({
              reason: 'session_not_found',
              pin,
              nickname: cleanNickname,
              socketId: socket.id
            });
            return cb({ error: 'Game not found. Check the PIN.' });
          }
          // Hydrate into memory if somehow not there
          const sid = sessionDoc._id;
          if (!activeSessions.has(sid)) {
            activeSessions.set(sid, { ...sessionDoc, _id: sid, timers: {}, disconnected: new Map() });
          }
          await cancelDuplicateSessionsByPin(gameNs, sessionsCol, pin, sid);
          session = activeSessions.get(sid);
        }

        if (session.status !== 'lobby' && session.status !== 'in_progress') {
          logJoinBlocked({
            reason: 'session_not_joinable',
            sessionId: session._id,
            pin,
            nickname: cleanNickname,
            status: session.status
          });
          return cb({ error: 'This game is no longer accepting players.' });
        }

        if (session.requireLogin && !userId) {
          logJoinBlocked({
            reason: 'login_required',
            sessionId: session._id,
            pin,
            nickname: cleanNickname
          });
          return cb({ error: 'This game requires you to be logged in.' });
        }

        if (session.players.length >= (session.maxPlayers || 50)) {
          logJoinBlocked({
            reason: 'session_full',
            sessionId: session._id,
            pin,
            nickname: cleanNickname,
            playerCount: session.players.length,
            maxPlayers: session.maxPlayers || 50
          });
          return cb({ error: 'Game is full.' });
        }

        // Check for reconnection FIRST (before duplicate check)
        const disconnectedEntry = session.disconnected?.get(cleanNickname.toLowerCase());
        if (disconnectedEntry) {
          const existing = session.players.find(p => p.odName.toLowerCase() === cleanNickname.toLowerCase());
          if (existing) {
            existing.odId = socket.id;
            session.disconnected.delete(cleanNickname.toLowerCase());
            socket.join(session._id);
            socket.sessionId = session._id;
            socket.playerName = cleanNickname;
            socket.isHost = false;

            return cb({
              success: true,
              sessionId: session._id,
              reconnected: true,
              gameTitle: session.gameTitle,
              status: session.status,
              score: existing.score
            });
          }
        }

        // Check for duplicate nickname
        const dup = session.players.find(
          p => p.odName.toLowerCase() === cleanNickname.toLowerCase()
        );
        if (dup) {
          logJoinBlocked({
            reason: 'duplicate_nickname',
            sessionId: session._id,
            pin,
            nickname: cleanNickname
          });
          return cb({ error: 'Nickname already taken. Choose another.' });
        }

        const player = {
          odId: socket.id,
          odName: cleanNickname,
          userId: userId || null,
          score: 0,
          streak: 0,
          joinedAt: Date.now()
        };

        session.players.push(player);

        socket.join(session._id);
        socket.sessionId = session._id;
        socket.playerName = cleanNickname;
        socket.isHost = false;

        gameNs.to(session._id).emit('lobby:playerJoined', {
          playerName: cleanNickname,
          playerCount: session.players.length,
          players: session.players.map(p => ({ name: p.odName, score: p.score }))
        });

        console.log('[ClassRush] lobby:playerJoined broadcast', {
          sessionId: session._id,
          pin,
          hostSocketId: session.hostSocketId,
          playerSocketId: socket.id,
          playerCount: session.players.length
        });

        cb({
          success: true,
          sessionId: session._id,
          gameTitle: session.gameTitle,
          status: session.status,
          playerCount: session.players.length
        });
        console.log('[ClassRush] player:join success', {
          sessionId: session._id,
          pin,
          nickname: cleanNickname,
          playerCount: session.players.length,
          status: session.status
        });
      } catch (err) {
        console.error('player:join error:', err);
        cb({ error: 'Failed to join game.' });
      }
    });

    socket.on('player:answer', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const session = getPlayerSession(socket);
        if (!session) return cb({ error: 'No active session.' });
        if (session.status !== 'in_progress') return cb({ error: 'Game not in progress.' });

        const qi = session.currentQuestionIndex;
        if (qi < 0 || qi >= session.questions.length) return cb({ error: 'No active question.' });

        const { optionId, answerId } = data || {};
        const chosenId = optionId || answerId;
        if (!chosenId) return cb({ error: 'No answer provided.' });

        const questionResult = session.results[qi];
        if (!questionResult) return cb({ error: 'Question results not initialized.' });

        // Prevent double-answer
        const alreadyAnswered = questionResult.responses.find(r => r.odId === socket.id);
        if (alreadyAnswered) return cb({ error: 'You already answered.' });

        const now = Date.now();
        const deadline = session.questionDeadline ? session.questionDeadline.getTime() : now;
        if (now > deadline + 1000) return cb({ error: 'Time is up.' });

        const question = session.questions[qi];
        const chosenOption = question.options.find(o => o.id === chosenId);
        const correct = chosenOption ? chosenOption.isCorrect === true : false;
        const timeMs = now - session.questionStartedAt.getTime();

        const player = session.players.find(p => p.odId === socket.id);
        if (!player) return cb({ error: 'Player not found in session.' });

        if (correct) {
          player.streak += 1;
        } else {
          player.streak = 0;
        }

        const { points } = calculateScore(
          correct,
          timeMs,
          question.timeLimitSeconds || 20,
          player.streak
        );

        player.score += points;

        questionResult.responses.push({
          odId: socket.id,
          odName: player.odName,
          answerId: chosenId,
          timeMs,
          correct,
          pointsAwarded: points
        });

        // Notify host of answer count
        gameNs.to(session._id).emit('game:answerCount', {
          questionIndex: qi,
          answerCount: questionResult.responses.length,
          totalPlayers: session.players.length
        });

        cb({ success: true, correct, points, totalScore: player.score });

        // Auto-end if all players answered
        if (questionResult.responses.length >= session.players.length) {
          clearQuestionTimer(session);
          await endQuestion(gameNs, session, getLiveSessionsCollection());
        }
      } catch (err) {
        console.error('player:answer error:', err);
        cb({ error: 'Failed to submit answer.' });
      }
    });

    // ── Disconnect handling ──────────────────────────────────────

    socket.on('disconnect', () => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;

      const session = activeSessions.get(sessionId);
      if (!session) return;

      if (socket.isHost) {
        // Host disconnected — give them time to reconnect
        session.hostDisconnectedAt = Date.now();
        gameNs.to(sessionId).emit('game:hostDisconnected');

        session.timers.hostReconnect = setTimeout(async () => {
          if (session.status === 'lobby' || session.status === 'in_progress') {
            session.status = 'cancelled';
            const sessionsCol = getLiveSessionsCollection();
            if (sessionsCol) {
              await persistSessionUpdate(sessionsCol, sessionId, { status: 'cancelled' });
            }
            gameNs.to(sessionId).emit('game:cancelled', { reason: 'Host disconnected.' });
            activeSessions.delete(sessionId);
          }
        }, HOST_RECONNECT_WINDOW_MS);
      } else if (socket.playerName) {
        // Player disconnected — keep in session briefly
        const name = socket.playerName;
        session.disconnected = session.disconnected || new Map();
        session.disconnected.set(name.toLowerCase(), {
          socketId: socket.id,
          disconnectedAt: Date.now()
        });

        setTimeout(() => {
          const entry = session.disconnected?.get(name.toLowerCase());
          if (entry && entry.socketId === socket.id) {
            session.disconnected.delete(name.toLowerCase());
            const playerIndex = session.players.findIndex(
              (player) => player.odName.toLowerCase() === name.toLowerCase() && player.odId === socket.id
            );
            if (playerIndex !== -1) {
              session.players.splice(playerIndex, 1);
              gameNs.to(sessionId).emit('lobby:playerLeft', {
                playerCount: session.players.length,
                players: session.players.map(p => ({ name: p.odName, score: p.score }))
              });
              persistSessionUpdate(getLiveSessionsCollection(), sessionId, {
                players: session.players
              }).catch(() => {});
              console.log('[ClassRush] player removed after reconnect timeout', {
                sessionId,
                pin: session.pin,
                playerName: name,
                playerCount: session.players.length
              });
            }
          }
        }, RECONNECT_WINDOW_MS);

        gameNs.to(sessionId).emit('lobby:playerDisconnected', { playerName: name });
      }
    });
  });

  // Periodic cleanup of stale lobby sessions
  setInterval(async () => {
    const now = Date.now();
    for (const [id, session] of activeSessions) {
      if (session.status === 'lobby' && (now - new Date(session.createdAt).getTime()) > LOBBY_TTL_MS) {
        session.status = 'expired';
        await persistSessionUpdate(getLiveSessionsCollection(), id, {
          status: 'expired',
          finishedAt: new Date()
        });
        gameNs.to(id).emit('game:cancelled', { reason: 'Lobby expired.' });
        activeSessions.delete(id);
      }
    }
  }, 5 * 60 * 1000);

  return gameNs;
}

// ── Helpers ──────────────────────────────────────────────────────

function getHostSession(socket) {
  if (!socket.sessionId || !socket.isHost) return null;
  return activeSessions.get(socket.sessionId) || null;
}

function getPlayerSession(socket) {
  if (!socket.sessionId) return null;
  return activeSessions.get(socket.sessionId) || null;
}

function findSessionByPin(pin) {
  return pickPreferredSession(getActiveSessionsByPin(pin));
}

function getActiveSessionsByPin(pin) {
  const matches = [];
  for (const session of activeSessions.values()) {
    if (session.pin === pin && isSessionActive(session)) {
      matches.push(session);
    }
  }
  return matches;
}

function pickPreferredSession(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  return [...sessions].sort((left, right) => {
    const playerDelta = (right.players?.length || 0) - (left.players?.length || 0);
    if (playerDelta !== 0) return playerDelta;

    const leftCreatedAt = new Date(left.createdAt || 0).getTime();
    const rightCreatedAt = new Date(right.createdAt || 0).getTime();
    return rightCreatedAt - leftCreatedAt;
  })[0];
}

function attachHostToSession(socket, gameNs, session) {
  if (!session) return;

  if (session.timers?.hostReconnect) {
    clearTimeout(session.timers.hostReconnect);
    session.timers.hostReconnect = null;
  }

  delete session.hostDisconnectedAt;
  session.hostSocketId = socket.id;
  socket.join(session._id);
  socket.sessionId = session._id;
  socket.isHost = true;
  gameNs.to(session._id).emit('game:hostReconnected');
}

async function cancelOrphanedSessionsByPin(sessionsCol, pin) {
  if (!sessionsCol || !pin) return;

  const staleSessions = await sessionsCol
    .find({ pin, status: { $in: ACTIVE_SESSION_STATUSES } })
    .toArray();

  if (!staleSessions.length) return;

  const now = new Date();
  for (const sessionDoc of staleSessions) {
    const sessionId = sessionDoc?._id?.toHexString ? sessionDoc._id.toHexString() : String(sessionDoc._id || '');
    if (!sessionId || activeSessions.has(sessionId)) continue;

    await persistSessionUpdate(sessionsCol, sessionId, {
      status: 'cancelled',
      finishedAt: now,
      cancelledReason: 'Recovered stale session before host:create.'
    });
  }
}

async function cancelDuplicateSessionsByPin(gameNs, sessionsCol, pin, keepSessionId) {
  const keepId = String(keepSessionId || '');
  if (!pin || !keepId) return;

  for (const [sessionId, session] of activeSessions) {
    if (sessionId === keepId) continue;
    if (session.pin !== pin || !isSessionActive(session)) continue;

    session.status = 'cancelled';
    clearQuestionTimer(session);
    if (session.timers?.hostReconnect) {
      clearTimeout(session.timers.hostReconnect);
      session.timers.hostReconnect = null;
    }

    await persistSessionUpdate(sessionsCol, sessionId, {
      status: 'cancelled',
      finishedAt: new Date(),
      cancelledReason: `Duplicate active session for pin ${pin}.`
    });

    gameNs.to(sessionId).emit('game:cancelled', { reason: 'A newer session replaced this lobby.' });
    activeSessions.delete(sessionId);

    console.log('[ClassRush] duplicate session cancelled', {
      pin,
      removedSessionId: sessionId,
      keptSessionId: keepId
    });
  }
}

function clearQuestionTimer(session) {
  if (session.timers?.questionTimeout) {
    clearTimeout(session.timers.questionTimeout);
    session.timers.questionTimeout = null;
  }
}

async function endQuestion(gameNs, session, sessionsCol) {
  clearQuestionTimer(session);

  const qi = session.currentQuestionIndex;
  if (qi < 0 || qi >= session.questions.length) return;

  const question = session.questions[qi];
  const questionResult = session.results[qi];
  if (!questionResult) return;

  const correctOptionId = question.options.find(o => o.isCorrect)?.id || null;

  // Build option distribution
  const distribution = {};
  question.options.forEach(o => { distribution[o.id] = 0; });
  questionResult.responses.forEach(r => {
    if (distribution[r.answerId] !== undefined) distribution[r.answerId]++;
  });

  const correctCount = questionResult.responses.filter(r => r.correct).length;
  const answerCount = questionResult.responses.length;

  const leaderboard = buildLeaderboard(session.players);
  session.hostView = 'results';

  gameNs.to(session._id).emit('game:questionResults', {
    questionIndex: qi,
    correctOptionId,
    distribution,
    correctCount,
    answerCount,
    totalPlayers: session.players.length,
    options: question.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect }))
  });

  gameNs.to(session._id).emit('game:leaderboard', {
    questionIndex: qi,
    leaderboard: leaderboard.slice(0, 10),
    isLast: qi >= session.questions.length - 1
  });

  for (const player of session.players) {
    const entry = leaderboard.find((leaderboardEntry) => leaderboardEntry.odId === player.odId);
    gameNs.to(player.odId).emit('game:myQuestionResult', {
      questionIndex: qi,
      myRank: entry ? entry.rank : null,
      myScore: player.score
    });
  }

  if (sessionsCol) {
    await persistSessionUpdate(sessionsCol, session._id, {
      hostView: session.hostView,
      players: session.players,
      [`results.${qi}`]: questionResult
    });
  }
}

function buildHostReconnectState(session) {
  if (!session) return null;

  const reconnectState = {
    hostView: session.hostView || (session.status === 'lobby' ? 'lobby' : 'results'),
    currentQuestionIndex: session.currentQuestionIndex ?? -1,
    questionCount: session.questionCount || session.questions?.length || 0,
    playerCount: session.players?.length || 0
  };

  if (session.status !== 'in_progress' || session.currentQuestionIndex < 0) {
    return reconnectState;
  }

  const question = session.questions?.[session.currentQuestionIndex];
  const questionResult = session.results?.[session.currentQuestionIndex];
  if (!question || !questionResult) {
    return reconnectState;
  }

  const leaderboard = buildLeaderboard(session.players || []);
  reconnectState.question = {
    questionIndex: session.currentQuestionIndex,
    totalQuestions: session.questions.length,
    question: sanitizeQuestionForPlayer(question),
    deadline: session.questionDeadline ? new Date(session.questionDeadline).toISOString() : null
  };
  reconnectState.results = {
    questionIndex: session.currentQuestionIndex,
    correctOptionId: question.options.find(o => o.isCorrect)?.id || null,
    distribution: buildDistribution(question, questionResult),
    correctCount: questionResult.responses.filter(r => r.correct).length,
    answerCount: questionResult.responses.length,
    totalPlayers: session.players.length,
    options: question.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect }))
  };
  reconnectState.leaderboard = {
    questionIndex: session.currentQuestionIndex,
    leaderboard: leaderboard.slice(0, 10),
    isLast: session.currentQuestionIndex >= session.questions.length - 1
  };
  reconnectState.answerCount = {
    questionIndex: session.currentQuestionIndex,
    answerCount: questionResult.responses.length,
    totalPlayers: session.players.length
  };

  return reconnectState;
}

function buildDistribution(question, questionResult) {
  const distribution = {};
  (question.options || []).forEach((option) => {
    distribution[option.id] = 0;
  });
  (questionResult.responses || []).forEach((response) => {
    if (distribution[response.answerId] !== undefined) {
      distribution[response.answerId] += 1;
    }
  });
  return distribution;
}

async function persistSessionUpdate(sessionsCol, sessionId, updates) {
  if (!sessionsCol) return;
  try {
    const { ObjectId } = require('mongodb');
    await sessionsCol.updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: updates }
    );
  } catch (err) {
    console.error('Failed to persist session update:', err);
  }
}

module.exports = {
  initSocketManager,
  _private: {
    cancelOrphanedSessionsByPin
  }
};
