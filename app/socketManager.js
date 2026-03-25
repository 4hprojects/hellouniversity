const {
  calculateScore,
  buildLeaderboard,
  sanitizeQuestionForPlayer,
  generateGameDocPin,
  generateAndUploadGameQr,
  buildParticipantKey
} = require('../utils/liveGameHelpers');

const RECONNECT_WINDOW_MS = 3 * 60 * 1000;
const HOST_RECONNECT_WINDOW_MS = 5 * 60 * 1000;
const LOBBY_TTL_MS = 2 * 60 * 60 * 1000;
const ACTIVE_SESSION_STATUSES = ['lobby', 'in_progress'];

const activeSessions = new Map();

function logJoinBlocked(details) {
  console.log('[ClassRush] player:join blocked', details);
}

function isSessionActive(session) {
  return Boolean(session && ACTIVE_SESSION_STATUSES.includes(session.status));
}

async function initSocketManager(io, { getLiveGamesCollection, getLiveSessionsCollection, getUsersCollection }) {
  console.log('[ClassRush] socketManager build loaded');
  const gameNs = io.of('/game');

  await hydrateActiveSessions(gameNs, getLiveSessionsCollection);

  gameNs.on('connection', (socket) => {
    socket.on('host:create', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const sessionsCol = getLiveSessionsCollection();
        const gamesCol = getLiveGamesCollection();
        if (!sessionsCol || !gamesCol) return cb({ error: 'Service unavailable.' });

        const { gameId, userId, userName } = data || {};
        if (!gameId || !userId) return cb({ error: 'Missing gameId or userId.' });

        const { ObjectId } = require('mongodb');
        if (!ObjectId.isValid(gameId)) return cb({ error: 'Invalid gameId.' });

        let game = await gamesCol.findOne({ _id: new ObjectId(gameId), ownerUserId: userId });
        if (!game) {
          const usersCol = typeof getUsersCollection === 'function' ? getUsersCollection() : null;
          if (usersCol && ObjectId.isValid(userId)) {
            const hostUser = await usersCol.findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });
            if (hostUser?.role === 'admin') {
              game = await gamesCol.findOne({ _id: new ObjectId(gameId) });
            }
          }
        }
        if (!game) return cb({ error: 'Game not found or access denied.' });
        if (!Array.isArray(game.questions) || game.questions.length === 0) {
          return cb({ error: 'Game has no questions.' });
        }

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
        }

        const pin = game.gamePin;
        const preferredPersisted = await recoverCanonicalSessionByPin(gameNs, sessionsCol, pin, {
          preferredFilter: (session) => session.gameId === game._id.toHexString() && session.hostUserId === userId
        });

        if (preferredPersisted && preferredPersisted.gameId === game._id.toHexString() && preferredPersisted.hostUserId === userId) {
          await attachHostToSession(socket, gameNs, sessionsCol, preferredPersisted);
          return cb({
            success: true,
            sessionId: preferredPersisted._id,
            pin: preferredPersisted.pin,
            gameTitle: preferredPersisted.gameTitle,
            questionCount: preferredPersisted.questionCount,
            requireLogin: preferredPersisted.requireLogin,
            reconnected: true,
            status: preferredPersisted.status,
            playerCount: preferredPersisted.players.length,
            players: preferredPersisted.players.map((player) => ({ name: player.odName, score: player.score })),
            reconnectState: buildHostReconnectState(preferredPersisted)
          });
        }

        const now = new Date();
        const sessionDoc = {
          gameId: game._id.toHexString(),
          pin,
          hostUserId: userId,
          hostUserName: userName || 'Host',
          hostSocketId: socket.id,
          status: 'lobby',
          requireLogin: game.settings?.requireLogin || false,
          maxPlayers: game.settings?.maxPlayers || 50,
          players: [],
          disconnectedPlayers: {},
          questions: game.questions,
          currentQuestionIndex: -1,
          questionStartedAt: null,
          questionDeadline: null,
          results: [],
          rankSnapshots: [],
          hostView: 'lobby',
          gameTitle: game.title,
          questionCount: game.questions.length,
          startedAt: null,
          finishedAt: null,
          hostDisconnectedAt: null,
          hostReconnectDeadline: null,
          cancelledReason: null,
          createdAt: now,
          updatedAt: now
        };

        const insertResult = await sessionsCol.insertOne(sessionDoc);
        const sessionId = insertResult.insertedId.toHexString();
        const session = materializeSession({ ...sessionDoc, _id: sessionId });
        activeSessions.set(sessionId, session);
        await reconcileDuplicateSessionsByPin(gameNs, sessionsCol, pin, sessionId);
        await attachHostToSession(socket, gameNs, sessionsCol, session);

        cb({
          success: true,
          sessionId,
          pin,
          gameTitle: game.title,
          questionCount: game.questions.length,
          requireLogin: session.requireLogin
        });
      } catch (err) {
        console.error('host:create error:', err);
        cb({ error: 'Failed to create session.' });
      }
    });

    socket.on('host:start', async (_data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const session = getHostSession(socket);
        if (!session) return cb({ error: 'No active session.' });
        if (session.status !== 'lobby') return cb({ error: 'Game already started.' });
        if (session.players.length === 0) return cb({ error: 'No players have joined.' });

        session.status = 'in_progress';
        session.startedAt = new Date();
        session.updatedAt = new Date();

        await persistSessionState(getLiveSessionsCollection(), session, {
          status: session.status,
          startedAt: session.startedAt,
          updatedAt: session.updatedAt
        });

        gameNs.to(session._id).emit('game:started', { questionCount: session.questionCount });
        cb({ success: true });
      } catch (err) {
        console.error('host:start error:', err);
        cb({ error: 'Failed to start game.' });
      }
    });

    socket.on('host:nextQuestion', async (_data, callback) => {
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
        session.questionStartedAt = new Date();
        const timeLimitSeconds = session.questions[nextIndex].timeLimitSeconds || 20;
        session.questionDeadline = new Date(session.questionStartedAt.getTime() + timeLimitSeconds * 1000);
        session.results[nextIndex] = session.results[nextIndex] || {
          questionId: session.questions[nextIndex].id,
          correctOptionId: session.questions[nextIndex].options.find((option) => option.isCorrect)?.id || null,
          responses: []
        };
        session.updatedAt = new Date();

        await persistSessionState(getLiveSessionsCollection(), session, {
          currentQuestionIndex: session.currentQuestionIndex,
          hostView: session.hostView,
          questionStartedAt: session.questionStartedAt,
          questionDeadline: session.questionDeadline,
          results: session.results,
          updatedAt: session.updatedAt
        });

        const sanitized = sanitizeQuestionForPlayer(session.questions[nextIndex]);
        gameNs.to(session._id).emit('game:question', {
          questionIndex: nextIndex,
          totalQuestions: session.questions.length,
          question: sanitized,
          deadline: session.questionDeadline.toISOString()
        });

        scheduleQuestionTimer(gameNs, getLiveSessionsCollection(), session);
        cb({ success: true, questionIndex: nextIndex });
      } catch (err) {
        console.error('host:nextQuestion error:', err);
        cb({ error: 'Failed to advance question.' });
      }
    });

    socket.on('host:endQuestion', async (_data, callback) => {
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

        const idx = session.players.findIndex((player) => player.odId === playerId);
        if (idx === -1) return cb({ error: 'Player not found.' });

        const removed = session.players.splice(idx, 1)[0];
        deleteDisconnectedPlayer(session, removed);
        session.updatedAt = new Date();
        await persistSessionState(getLiveSessionsCollection(), session, {
          players: session.players,
          disconnectedPlayers: session.disconnectedPlayers,
          updatedAt: session.updatedAt
        });

        const targetSocket = gameNs.sockets.get(playerId);
        if (targetSocket) {
          targetSocket.emit('game:kicked');
          targetSocket.leave(session._id);
        }

        gameNs.to(session._id).emit('lobby:playerLeft', {
          playerCount: session.players.length,
          players: session.players.map((player) => ({ name: player.odName, score: player.score }))
        });
        cb({ success: true });
      } catch (err) {
        console.error('host:kick error:', err);
        cb({ error: 'Failed to kick player.' });
      }
    });

    socket.on('host:end', async (_data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const session = getHostSession(socket);
        if (!session) return cb({ error: 'No active session.' });

        clearQuestionTimer(session);
        clearHostReconnectTimer(session);
        clearAllPlayerReconnectTimers(session);
        session.status = 'finished';
        session.finishedAt = new Date();
        session.hostView = 'podium';
        session.updatedAt = new Date();

        const leaderboard = buildLeaderboard(session.players);
        await persistSessionState(getLiveSessionsCollection(), session, {
          status: session.status,
          finishedAt: session.finishedAt,
          hostView: session.hostView,
          players: session.players,
          results: session.results,
          rankSnapshots: session.rankSnapshots,
          disconnectedPlayers: session.disconnectedPlayers,
          updatedAt: session.updatedAt
        });

        gameNs.to(session._id).emit('game:finished', {
          leaderboard: leaderboard.slice(0, 50),
          podium: leaderboard.slice(0, 3)
        });
        for (const player of session.players) {
          const entry = leaderboard.find((item) => item.participantKey === player.participantKey);
          gameNs.to(player.odId).emit('game:myResult', {
            myRank: entry ? entry.rank : null,
            myScore: player.score
          });
        }

        activeSessions.delete(session._id);
        cb({ success: true, leaderboard: leaderboard.slice(0, 10) });
      } catch (err) {
        console.error('host:end error:', err);
        cb({ error: 'Failed to end game.' });
      }
    });

    socket.on('player:join', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const sessionsCol = getLiveSessionsCollection();
        if (!sessionsCol) return cb({ error: 'Service unavailable.' });

        const { pin, nickname, userId } = data || {};
        if (!pin || !nickname || typeof nickname !== 'string' || !nickname.trim()) {
          logJoinBlocked({ reason: 'missing_pin_or_nickname', pin: pin || null, socketId: socket.id });
          return cb({ error: 'PIN and nickname are required.' });
        }

        const cleanNickname = nickname.trim().slice(0, 30);
        const participantKey = buildParticipantKey(cleanNickname, userId || null);
        let session = findSessionByPin(pin);
        if (!session) {
          session = await recoverCanonicalSessionByPin(gameNs, sessionsCol, pin);
        }
        if (!session) {
          logJoinBlocked({ reason: 'session_not_found', pin, nickname: cleanNickname, socketId: socket.id });
          return cb({ error: 'Game not found. Check the PIN.' });
        }

        if (!isSessionActive(session)) return cb({ error: 'This game is no longer accepting players.' });
        if (session.requireLogin && !userId) return cb({ error: 'This game requires you to be logged in.' });

        const reconnectEntry = getDisconnectedPlayerEntry(session, participantKey, cleanNickname);
        if (reconnectEntry) {
          const existing = session.players.find((player) => player.participantKey === reconnectEntry.participantKey);
          if (existing) {
            existing.odId = socket.id;
            existing.userId = userId || existing.userId || null;
            deleteDisconnectedPlayerByKey(session, existing.participantKey, existing.odName);
            socket.join(session._id);
            socket.sessionId = session._id;
            socket.playerName = cleanNickname;
            socket.participantKey = existing.participantKey;
            socket.isHost = false;

            session.updatedAt = new Date();
            await persistSessionState(getLiveSessionsCollection(), session, {
              players: session.players,
              disconnectedPlayers: session.disconnectedPlayers,
              updatedAt: session.updatedAt
            });

            return cb({
              success: true,
              sessionId: session._id,
              reconnected: true,
              gameTitle: session.gameTitle,
              status: session.status,
              score: existing.score,
              reconnectState: buildPlayerReconnectState(session, existing)
            });
          }
        }

        const duplicate = session.players.find((player) => player.participantKey === participantKey || normalizePlayerName(player.odName) === normalizePlayerName(cleanNickname));
        if (duplicate) return cb({ error: 'Nickname already taken. Choose another.' });
        if (session.players.length >= (session.maxPlayers || 50)) return cb({ error: 'Game is full.' });

        const player = {
          odId: socket.id,
          odName: cleanNickname,
          userId: userId || null,
          participantKey,
          score: 0,
          streak: 0,
          joinedAt: Date.now()
        };

        session.players.push(player);
        socket.join(session._id);
        socket.sessionId = session._id;
        socket.playerName = cleanNickname;
        socket.participantKey = participantKey;
        socket.isHost = false;

        session.updatedAt = new Date();
        await persistSessionState(getLiveSessionsCollection(), session, {
          players: session.players,
          disconnectedPlayers: session.disconnectedPlayers,
          updatedAt: session.updatedAt
        });

        gameNs.to(session._id).emit('lobby:playerJoined', {
          playerName: cleanNickname,
          playerCount: session.players.length,
          players: session.players.map((playerItem) => ({ name: playerItem.odName, score: playerItem.score }))
        });

        cb({
          success: true,
          sessionId: session._id,
          gameTitle: session.gameTitle,
          status: session.status,
          playerCount: session.players.length,
          reconnectState: buildPlayerReconnectState(session, player)
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

        const chosenId = data?.optionId || data?.answerId;
        if (!chosenId) return cb({ error: 'No answer provided.' });

        const questionResult = session.results[qi];
        if (!questionResult) return cb({ error: 'Question results not initialized.' });

        const player = session.players.find((item) => item.participantKey === socket.participantKey);
        if (!player) return cb({ error: 'Player not found in session.' });

        const alreadyAnswered = questionResult.responses.find((response) => response.participantKey === player.participantKey);
        if (alreadyAnswered) return cb({ error: 'You already answered.' });

        const now = Date.now();
        const deadline = session.questionDeadline ? session.questionDeadline.getTime() : now;
        if (now > deadline + 1000) return cb({ error: 'Time is up.' });

        const question = session.questions[qi];
        const chosenOption = question.options.find((option) => option.id === chosenId);
        const correct = chosenOption ? chosenOption.isCorrect === true : false;
        const timeMs = now - session.questionStartedAt.getTime();

        if (correct) {
          player.streak += 1;
        } else {
          player.streak = 0;
        }
        const { points } = calculateScore(correct, timeMs, question.timeLimitSeconds || 20, player.streak);
        player.score += points;

        questionResult.responses.push({
          participantKey: player.participantKey,
          odId: socket.id,
          odName: player.odName,
          userId: player.userId || null,
          answerId: chosenId,
          timeMs,
          correct,
          pointsAwarded: points,
          totalScoreAfterQuestion: player.score
        });
        session.updatedAt = new Date();

        await persistSessionState(getLiveSessionsCollection(), session, {
          players: session.players,
          results: session.results,
          updatedAt: session.updatedAt
        });

        gameNs.to(session._id).emit('game:answerCount', {
          questionIndex: qi,
          answerCount: questionResult.responses.length,
          totalPlayers: session.players.length
        });
        cb({ success: true, correct, points, totalScore: player.score });

        if (questionResult.responses.length >= session.players.length) {
          clearQuestionTimer(session);
          await endQuestion(gameNs, session, getLiveSessionsCollection());
        }
      } catch (err) {
        console.error('player:answer error:', err);
        cb({ error: 'Failed to submit answer.' });
      }
    });

    socket.on('disconnect', () => {
      void handleSocketDisconnect(gameNs, getLiveSessionsCollection, socket);
    });
  });

  setInterval(() => {
    void expireStaleLobbySessions(gameNs, getLiveSessionsCollection);
  }, 5 * 60 * 1000);

  return gameNs;
}

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

function pickPreferredSession(sessions, preferredFilter) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const filtered = typeof preferredFilter === 'function'
    ? sessions.filter((session) => preferredFilter(session))
    : sessions;
  const source = filtered.length > 0 ? filtered : sessions;

  return [...source].sort((left, right) => {
    const playerDelta = (right.players?.length || 0) - (left.players?.length || 0);
    if (playerDelta !== 0) return playerDelta;

    const leftCreatedAt = new Date(left.createdAt || 0).getTime();
    const rightCreatedAt = new Date(right.createdAt || 0).getTime();
    return rightCreatedAt - leftCreatedAt;
  })[0];
}

function normalizePlayerName(value) {
  return String(value || '').trim().toLowerCase();
}

function materializeSession(doc) {
  const sessionId = typeof doc._id?.toHexString === 'function' ? doc._id.toHexString() : String(doc._id || '');
  const disconnectedPlayers = {};

  Object.entries(doc.disconnectedPlayers || {}).forEach(([key, value]) => {
    disconnectedPlayers[key] = {
      ...value,
      disconnectedAt: value?.disconnectedAt ? new Date(value.disconnectedAt) : null,
      reconnectDeadline: value?.reconnectDeadline ? new Date(value.reconnectDeadline) : null
    };
  });

  return {
    ...doc,
    _id: sessionId,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    startedAt: doc.startedAt ? new Date(doc.startedAt) : null,
    finishedAt: doc.finishedAt ? new Date(doc.finishedAt) : null,
    questionStartedAt: doc.questionStartedAt ? new Date(doc.questionStartedAt) : null,
    questionDeadline: doc.questionDeadline ? new Date(doc.questionDeadline) : null,
    hostDisconnectedAt: doc.hostDisconnectedAt ? new Date(doc.hostDisconnectedAt) : null,
    hostReconnectDeadline: doc.hostReconnectDeadline ? new Date(doc.hostReconnectDeadline) : null,
    players: (doc.players || []).map((player) => ({
      ...player,
      participantKey: player.participantKey || buildParticipantKey(player.odName, player.userId || null)
    })),
    results: (doc.results || []).map((result) => ({
      ...result,
      responses: (result.responses || []).map((response) => ({
        ...response,
        participantKey: response.participantKey || buildParticipantKey(response.odName, response.userId || null)
      }))
    })),
    disconnectedPlayers,
    rankSnapshots: Array.isArray(doc.rankSnapshots) ? doc.rankSnapshots : [],
    timers: {}
  };
}

async function hydrateActiveSessions(gameNs, getLiveSessionsCollection) {
  const sessionsCol = getLiveSessionsCollection();
  if (!sessionsCol) return;

  const docs = await sessionsCol.find({ status: { $in: ACTIVE_SESSION_STATUSES } }).toArray();
  const byPin = new Map();
  docs.forEach((doc) => {
    const pin = String(doc.pin || '');
    if (!byPin.has(pin)) byPin.set(pin, []);
    byPin.get(pin).push(doc);
  });

  for (const [pin, pinDocs] of byPin.entries()) {
    const preferred = pickPreferredSession(pinDocs);
    if (!preferred) continue;

    const preferredId = typeof preferred._id?.toHexString === 'function' ? preferred._id.toHexString() : String(preferred._id || '');
    for (const doc of pinDocs) {
      const docId = typeof doc._id?.toHexString === 'function' ? doc._id.toHexString() : String(doc._id || '');
      if (docId === preferredId) continue;
      await persistSessionUpdate(sessionsCol, docId, {
        status: 'cancelled',
        finishedAt: new Date(),
        cancelledReason: `Duplicate active session for pin ${pin}.`
      });
    }

    const session = materializeSession(preferred);
    activeSessions.set(session._id, session);
    await prepareRecoveredSession(gameNs, sessionsCol, session);
  }
}

async function prepareRecoveredSession(gameNs, sessionsCol, session) {
  const now = Date.now();
  let dirty = false;

  if (session.hostReconnectDeadline && session.hostReconnectDeadline.getTime() <= now) {
    await cancelSession(gameNs, sessionsCol, session, 'Host disconnected.');
    return;
  }

  if (!session.hostReconnectDeadline) {
    session.hostDisconnectedAt = session.hostDisconnectedAt || new Date(now);
    session.hostReconnectDeadline = new Date(now + HOST_RECONNECT_WINDOW_MS);
    dirty = true;
  }

  session.players.forEach((player) => {
    const existing = getDisconnectedPlayerEntry(session, player.participantKey, player.odName);
    if (existing) return;
    session.disconnectedPlayers[player.participantKey] = {
      participantKey: player.participantKey,
      nickname: player.odName,
      userId: player.userId || null,
      socketId: player.odId || null,
      disconnectedAt: new Date(now),
      reconnectDeadline: new Date(now + RECONNECT_WINDOW_MS)
    };
    dirty = true;
  });

  if (session.status === 'lobby' && now - session.createdAt.getTime() > LOBBY_TTL_MS) {
    session.status = 'expired';
    session.finishedAt = new Date();
    session.cancelledReason = 'Lobby expired.';
    activeSessions.delete(session._id);
    await persistSessionState(sessionsCol, session, {
      status: session.status,
      finishedAt: session.finishedAt,
      cancelledReason: session.cancelledReason
    });
    return;
  }

  removeExpiredDisconnectedPlayers(session);

  if (dirty) {
    session.updatedAt = new Date();
    await persistSessionState(sessionsCol, session, {
      hostDisconnectedAt: session.hostDisconnectedAt,
      hostReconnectDeadline: session.hostReconnectDeadline,
      disconnectedPlayers: session.disconnectedPlayers,
      players: session.players,
      updatedAt: session.updatedAt
    });
  }

  scheduleHostReconnectTimer(gameNs, sessionsCol, session);
  scheduleAllPlayerReconnectTimers(gameNs, sessionsCol, session);

  if (session.status === 'in_progress' && session.questionDeadline) {
    if (session.questionDeadline.getTime() <= now) {
      await endQuestion(gameNs, session, sessionsCol);
    } else {
      scheduleQuestionTimer(gameNs, sessionsCol, session);
    }
  }
}

async function recoverCanonicalSessionByPin(gameNs, sessionsCol, pin, options = {}) {
  const docs = await sessionsCol.find({ pin, status: { $in: ACTIVE_SESSION_STATUSES } }).toArray();
  if (!docs.length) return null;

  const preferred = pickPreferredSession(docs, options.preferredFilter);
  if (!preferred) return null;

  const preferredId = typeof preferred._id?.toHexString === 'function' ? preferred._id.toHexString() : String(preferred._id || '');
  await reconcileDuplicateSessionsByPin(gameNs, sessionsCol, pin, preferredId);

  let session = activeSessions.get(preferredId);
  if (!session) {
    session = materializeSession(preferred);
    activeSessions.set(preferredId, session);
    await prepareRecoveredSession(gameNs, sessionsCol, session);
  }

  return session;
}

async function reconcileDuplicateSessionsByPin(gameNs, sessionsCol, pin, keepSessionId) {
  const docs = await sessionsCol.find({ pin, status: { $in: ACTIVE_SESSION_STATUSES } }).toArray();
  for (const doc of docs) {
    const sessionId = typeof doc._id?.toHexString === 'function' ? doc._id.toHexString() : String(doc._id || '');
    if (sessionId === keepSessionId) continue;
    const session = activeSessions.get(sessionId) || materializeSession(doc);
    await cancelSession(gameNs, sessionsCol, session, `Duplicate active session for pin ${pin}.`, false);
  }
}

function scheduleQuestionTimer(gameNs, sessionsCol, session) {
  clearQuestionTimer(session);
  if (!session.questionDeadline || session.status !== 'in_progress') return;

  const delay = Math.max(0, session.questionDeadline.getTime() - Date.now());
  session.timers.questionTimeout = setTimeout(() => {
    void endQuestion(gameNs, session, sessionsCol);
  }, delay);
}

function clearQuestionTimer(session) {
  if (session.timers?.questionTimeout) {
    clearTimeout(session.timers.questionTimeout);
    session.timers.questionTimeout = null;
  }
}

function scheduleHostReconnectTimer(gameNs, sessionsCol, session) {
  clearHostReconnectTimer(session);
  if (!session.hostReconnectDeadline || !isSessionActive(session)) return;

  const delay = Math.max(0, session.hostReconnectDeadline.getTime() - Date.now());
  session.timers.hostReconnect = setTimeout(() => {
    void cancelSession(gameNs, sessionsCol, session, 'Host disconnected.');
  }, delay);
}

function clearHostReconnectTimer(session) {
  if (session.timers?.hostReconnect) {
    clearTimeout(session.timers.hostReconnect);
    session.timers.hostReconnect = null;
  }
}

function scheduleAllPlayerReconnectTimers(gameNs, sessionsCol, session) {
  Object.values(session.disconnectedPlayers || {}).forEach((entry) => {
    schedulePlayerReconnectTimer(gameNs, sessionsCol, session, entry);
  });
}

function clearAllPlayerReconnectTimers(session) {
  Object.values(session.timers?.playerReconnect || {}).forEach((timer) => clearTimeout(timer));
  if (session.timers) {
    session.timers.playerReconnect = {};
  }
}

function schedulePlayerReconnectTimer(gameNs, sessionsCol, session, entry) {
  if (!entry?.participantKey || !entry.reconnectDeadline) return;
  if (!session.timers.playerReconnect) session.timers.playerReconnect = {};
  const timerKey = entry.participantKey;
  if (session.timers.playerReconnect[timerKey]) {
    clearTimeout(session.timers.playerReconnect[timerKey]);
  }

  const delay = Math.max(0, new Date(entry.reconnectDeadline).getTime() - Date.now());
  session.timers.playerReconnect[timerKey] = setTimeout(() => {
    void expireDisconnectedPlayer(gameNs, sessionsCol, session, timerKey);
  }, delay);
}

function clearPlayerReconnectTimer(session, participantKey) {
  if (session.timers?.playerReconnect?.[participantKey]) {
    clearTimeout(session.timers.playerReconnect[participantKey]);
    delete session.timers.playerReconnect[participantKey];
  }
}

async function expireDisconnectedPlayer(gameNs, sessionsCol, session, participantKey) {
  const entry = session.disconnectedPlayers?.[participantKey];
  if (!entry) return;

  const playerIndex = session.players.findIndex((player) => player.participantKey === participantKey);
  if (playerIndex !== -1) {
    session.players.splice(playerIndex, 1);
  }
  delete session.disconnectedPlayers[participantKey];
  clearPlayerReconnectTimer(session, participantKey);
  session.updatedAt = new Date();

  await persistSessionState(sessionsCol, session, {
    players: session.players,
    disconnectedPlayers: session.disconnectedPlayers,
    updatedAt: session.updatedAt
  });

  gameNs.to(session._id).emit('lobby:playerLeft', {
    playerCount: session.players.length,
    players: session.players.map((player) => ({ name: player.odName, score: player.score }))
  });
}

async function attachHostToSession(socket, gameNs, sessionsCol, session) {
  clearHostReconnectTimer(session);
  session.hostSocketId = socket.id;
  session.hostDisconnectedAt = null;
  session.hostReconnectDeadline = null;
  session.updatedAt = new Date();

  socket.join(session._id);
  socket.sessionId = session._id;
  socket.isHost = true;

  await persistSessionState(sessionsCol, session, {
    hostSocketId: session.hostSocketId,
    hostDisconnectedAt: null,
    hostReconnectDeadline: null,
    updatedAt: session.updatedAt
  });

  gameNs.to(session._id).emit('game:hostReconnected');
}

async function handleSocketDisconnect(gameNs, getLiveSessionsCollection, socket) {
  const sessionId = socket.sessionId;
  if (!sessionId) return;

  const session = activeSessions.get(sessionId);
  if (!session) return;

  const sessionsCol = getLiveSessionsCollection();
  if (!sessionsCol) return;

  if (socket.isHost) {
    session.hostDisconnectedAt = new Date();
    session.hostReconnectDeadline = new Date(Date.now() + HOST_RECONNECT_WINDOW_MS);
    session.updatedAt = new Date();
    await persistSessionState(sessionsCol, session, {
      hostDisconnectedAt: session.hostDisconnectedAt,
      hostReconnectDeadline: session.hostReconnectDeadline,
      updatedAt: session.updatedAt
    });
    gameNs.to(sessionId).emit('game:hostDisconnected');
    scheduleHostReconnectTimer(gameNs, sessionsCol, session);
    return;
  }

  const participantKey = socket.participantKey;
  if (!participantKey) return;
  const player = session.players.find((item) => item.participantKey === participantKey);
  if (!player) return;

  session.disconnectedPlayers[participantKey] = {
    participantKey,
    nickname: player.odName,
    userId: player.userId || null,
    socketId: socket.id,
    disconnectedAt: new Date(),
    reconnectDeadline: new Date(Date.now() + RECONNECT_WINDOW_MS)
  };
  session.updatedAt = new Date();

  await persistSessionState(sessionsCol, session, {
    disconnectedPlayers: session.disconnectedPlayers,
    updatedAt: session.updatedAt
  });
  schedulePlayerReconnectTimer(gameNs, sessionsCol, session, session.disconnectedPlayers[participantKey]);
  gameNs.to(sessionId).emit('lobby:playerDisconnected', { playerName: player.odName });
}

function getDisconnectedPlayerEntry(session, participantKey, nickname) {
  if (session.disconnectedPlayers?.[participantKey]) {
    return session.disconnectedPlayers[participantKey];
  }
  const normalizedNickname = normalizePlayerName(nickname);
  return Object.values(session.disconnectedPlayers || {}).find((entry) =>
    normalizePlayerName(entry.nickname) === normalizedNickname
  ) || null;
}

function deleteDisconnectedPlayer(session, player) {
  if (!player) return;
  deleteDisconnectedPlayerByKey(session, player.participantKey, player.odName);
}

function deleteDisconnectedPlayerByKey(session, participantKey, nickname) {
  if (participantKey && session.disconnectedPlayers?.[participantKey]) {
    delete session.disconnectedPlayers[participantKey];
    clearPlayerReconnectTimer(session, participantKey);
  }
  const normalizedNickname = normalizePlayerName(nickname);
  Object.entries(session.disconnectedPlayers || {}).forEach(([key, entry]) => {
    if (normalizePlayerName(entry.nickname) === normalizedNickname) {
      delete session.disconnectedPlayers[key];
      clearPlayerReconnectTimer(session, key);
    }
  });
}

function removeExpiredDisconnectedPlayers(session) {
  const now = Date.now();
  Object.entries(session.disconnectedPlayers || {}).forEach(([participantKey, entry]) => {
    if (!entry.reconnectDeadline || new Date(entry.reconnectDeadline).getTime() > now) return;
    const playerIndex = session.players.findIndex((player) => player.participantKey === participantKey);
    if (playerIndex !== -1) {
      session.players.splice(playerIndex, 1);
    }
    delete session.disconnectedPlayers[participantKey];
    clearPlayerReconnectTimer(session, participantKey);
  });
}

async function endQuestion(gameNs, session, sessionsCol) {
  clearQuestionTimer(session);

  const qi = session.currentQuestionIndex;
  if (qi < 0 || qi >= session.questions.length) return;
  const question = session.questions[qi];
  const questionResult = session.results[qi];
  if (!questionResult) return;

  const correctOptionId = question.options.find((option) => option.isCorrect)?.id || null;
  const distribution = {};
  question.options.forEach((option) => {
    distribution[option.id] = 0;
  });
  questionResult.responses.forEach((response) => {
    if (distribution[response.answerId] !== undefined) {
      distribution[response.answerId] += 1;
    }
  });

  const correctCount = questionResult.responses.filter((response) => response.correct).length;
  const answerCount = questionResult.responses.length;
  const leaderboard = buildLeaderboard(session.players);
  session.hostView = 'results';
  session.rankSnapshots[qi] = {
    questionIndex: qi,
    leaderboard: leaderboard.slice(0, 50).map((player) => ({
      participantKey: player.participantKey,
      odName: player.odName,
      score: player.score,
      rank: player.rank
    }))
  };
  session.updatedAt = new Date();

  gameNs.to(session._id).emit('game:questionResults', {
    questionIndex: qi,
    correctOptionId,
    distribution,
    correctCount,
    answerCount,
    totalPlayers: session.players.length,
    options: question.options.map((option) => ({ id: option.id, text: option.text, isCorrect: option.isCorrect }))
  });
  gameNs.to(session._id).emit('game:leaderboard', {
    questionIndex: qi,
    leaderboard: leaderboard.slice(0, 10),
    isLast: qi >= session.questions.length - 1
  });

  for (const player of session.players) {
    const entry = leaderboard.find((leaderboardEntry) => leaderboardEntry.participantKey === player.participantKey);
    gameNs.to(player.odId).emit('game:myQuestionResult', {
      questionIndex: qi,
      myRank: entry ? entry.rank : null,
      myScore: player.score
    });
  }

  await persistSessionState(sessionsCol, session, {
    hostView: session.hostView,
    players: session.players,
    results: session.results,
    rankSnapshots: session.rankSnapshots,
    updatedAt: session.updatedAt
  });
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
    correctOptionId: question.options.find((option) => option.isCorrect)?.id || null,
    distribution: buildDistribution(question, questionResult),
    correctCount: questionResult.responses.filter((response) => response.correct).length,
    answerCount: questionResult.responses.length,
    totalPlayers: session.players.length,
    options: question.options.map((option) => ({ id: option.id, text: option.text, isCorrect: option.isCorrect }))
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

function buildPlayerReconnectState(session, player) {
  if (!session || !player) return null;

  const state = {
    phase: session.status === 'lobby' ? 'waiting' : 'waiting',
    status: session.status,
    hostDisconnected: Boolean(session.hostReconnectDeadline)
  };

  if (session.status !== 'in_progress' || session.currentQuestionIndex < 0) {
    return state;
  }

  const question = session.questions?.[session.currentQuestionIndex];
  const questionResult = session.results?.[session.currentQuestionIndex];
  if (!question || !questionResult) {
    return state;
  }

  const response = questionResult.responses.find((item) => item.participantKey === player.participantKey);
  const leaderboard = buildLeaderboard(session.players || []);
  const entry = leaderboard.find((item) => item.participantKey === player.participantKey);

  if (session.hostView === 'question' && session.questionDeadline && session.questionDeadline.getTime() > Date.now()) {
    return {
      phase: response ? 'submitted' : 'answer',
      status: session.status,
      hostDisconnected: Boolean(session.hostReconnectDeadline),
      question: {
        questionIndex: session.currentQuestionIndex,
        totalQuestions: session.questions.length,
        question: sanitizeQuestionForPlayer(question),
        deadline: session.questionDeadline.toISOString()
      }
    };
  }

  return {
    phase: 'result',
    status: session.status,
    hostDisconnected: Boolean(session.hostReconnectDeadline),
    result: {
      correct: response ? response.correct === true : null,
      points: response ? Number(response.pointsAwarded || 0) : 0,
      totalScore: player.score,
      myRank: entry ? entry.rank : null,
      myScore: player.score
    }
  };
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

async function expireStaleLobbySessions(gameNs, getLiveSessionsCollection) {
  const sessionsCol = getLiveSessionsCollection();
  if (!sessionsCol) return;

  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (session.status === 'lobby' && now - session.createdAt.getTime() > LOBBY_TTL_MS) {
      session.status = 'expired';
      session.finishedAt = new Date();
      session.cancelledReason = 'Lobby expired.';
      await persistSessionState(sessionsCol, session, {
        status: session.status,
        finishedAt: session.finishedAt,
        cancelledReason: session.cancelledReason
      });
      gameNs.to(id).emit('game:cancelled', { reason: 'Lobby expired.' });
      activeSessions.delete(id);
    }
  }
}

async function cancelSession(gameNs, sessionsCol, session, reason, broadcast = true) {
  clearQuestionTimer(session);
  clearHostReconnectTimer(session);
  clearAllPlayerReconnectTimers(session);
  session.status = 'cancelled';
  session.finishedAt = new Date();
  session.cancelledReason = reason;
  session.updatedAt = new Date();

  await persistSessionState(sessionsCol, session, {
    status: session.status,
    finishedAt: session.finishedAt,
    cancelledReason: session.cancelledReason,
    updatedAt: session.updatedAt
  });

  if (broadcast) {
    gameNs.to(session._id).emit('game:cancelled', { reason });
  }
  activeSessions.delete(session._id);
}

async function persistSessionState(sessionsCol, session, updates) {
  if (!sessionsCol || !session?._id) return;
  await persistSessionUpdate(sessionsCol, session._id, updates);
}

async function persistSessionUpdate(sessionsCol, sessionId, updates) {
  if (!sessionsCol) return;
  try {
    const { ObjectId } = require('mongodb');
    await sessionsCol.updateOne({ _id: new ObjectId(sessionId) }, { $set: updates });
  } catch (err) {
    console.error('Failed to persist session update:', err);
  }
}

function resetForTests() {
  for (const session of activeSessions.values()) {
    clearQuestionTimer(session);
    clearHostReconnectTimer(session);
    clearAllPlayerReconnectTimers(session);
  }
  activeSessions.clear();
}

module.exports = {
  initSocketManager,
  _private: {
    cancelSession,
    buildPlayerReconnectState,
    hydrateActiveSessions,
    recoverCanonicalSessionByPin,
    resetForTests
  }
};
