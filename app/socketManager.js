const {
  generateGamePin,
  calculateScore,
  buildLeaderboard,
  sanitizeQuestionForPlayer
} = require('../utils/liveGameHelpers');

const RECONNECT_WINDOW_MS = 30000;
const HOST_RECONNECT_WINDOW_MS = 60000;
const LOBBY_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Active game state kept in memory for low-latency access.
 * Key: sessionId (string), Value: game state object.
 */
const activeSessions = new Map();

function initSocketManager(io, { getLiveGamesCollection, getLiveSessionsCollection }) {
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
        if (!gameId || !userId) return cb({ error: 'Missing gameId or userId.' });

        const { ObjectId } = require('mongodb');
        if (!ObjectId.isValid(gameId)) return cb({ error: 'Invalid gameId.' });

        const game = await gamesCol.findOne({ _id: new ObjectId(gameId), ownerUserId: userId });
        if (!game) return cb({ error: 'Game not found or access denied.' });
        if (!game.questions || game.questions.length === 0) return cb({ error: 'Game has no questions.' });

        const pin = await generateGamePin(sessionsCol);

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
          gameTitle: game.title,
          questionCount: game.questions.length,
          startedAt: null,
          finishedAt: null,
          createdAt: new Date()
        };

        const insertResult = await sessionsCol.insertOne(sessionDoc);
        const sessionId = insertResult.insertedId.toHexString();

        activeSessions.set(sessionId, {
          ...sessionDoc,
          _id: sessionId,
          timers: {},
          disconnected: new Map()
        });

        socket.join(sessionId);
        socket.sessionId = sessionId;
        socket.isHost = true;

        cb({
          success: true,
          sessionId,
          pin,
          gameTitle: game.title,
          questionCount: game.questions.length,
          requireLogin: sessionDoc.requireLogin
        });
      } catch (err) {
        console.error('host:create error:', err);
        cb({ error: 'Failed to create session.' });
      }
    });

    socket.on('host:start', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const session = getHostSession(socket);
        if (!session) return cb({ error: 'No active session.' });
        if (session.status !== 'lobby') return cb({ error: 'Game already started.' });
        if (session.players.length === 0) return cb({ error: 'No players have joined.' });

        session.status = 'in_progress';
        session.startedAt = new Date();

        await persistSessionUpdate(getLiveSessionsCollection(), session._id, {
          status: 'in_progress',
          startedAt: session.startedAt
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
        gameNs.to(session._id).emit('lobby:playerLeft', { playerCount: session.players.length });
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

        const leaderboard = buildLeaderboard(session.players);

        await persistSessionUpdate(getLiveSessionsCollection(), session._id, {
          status: 'finished',
          finishedAt: session.finishedAt,
          players: session.players,
          results: session.results
        });

        gameNs.to(session._id).emit('game:finished', {
          leaderboard: leaderboard.slice(0, 50),
          podium: leaderboard.slice(0, 3)
        });

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
        if (!pin || !nickname || typeof nickname !== 'string' || !nickname.trim()) {
          return cb({ error: 'PIN and nickname are required.' });
        }

        const cleanNickname = nickname.trim().slice(0, 30);

        // Find active session by PIN
        let session = findSessionByPin(pin);
        if (!session) {
          const sessionDoc = await sessionsCol.findOne({
            pin,
            status: { $in: ['lobby', 'in_progress'] }
          });
          if (!sessionDoc) return cb({ error: 'Game not found. Check the PIN.' });
          // Hydrate into memory if somehow not there
          const sid = sessionDoc._id.toHexString();
          if (!activeSessions.has(sid)) {
            activeSessions.set(sid, { ...sessionDoc, _id: sid, timers: {}, disconnected: new Map() });
          }
          session = activeSessions.get(sid);
        }

        if (session.status !== 'lobby' && session.status !== 'in_progress') {
          return cb({ error: 'This game is no longer accepting players.' });
        }

        if (session.requireLogin && !userId) {
          return cb({ error: 'This game requires you to be logged in.' });
        }

        if (session.players.length >= (session.maxPlayers || 50)) {
          return cb({ error: 'Game is full.' });
        }

        // Check for duplicate nickname
        const dup = session.players.find(
          p => p.odName.toLowerCase() === cleanNickname.toLowerCase()
        );
        if (dup) return cb({ error: 'Nickname already taken. Choose another.' });

        // Check for reconnection
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

        cb({
          success: true,
          sessionId: session._id,
          gameTitle: session.gameTitle,
          status: session.status,
          playerCount: session.players.length
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

        const { answerId } = data || {};
        if (!answerId) return cb({ error: 'No answer provided.' });

        const questionResult = session.results[qi];
        if (!questionResult) return cb({ error: 'Question results not initialized.' });

        // Prevent double-answer
        const alreadyAnswered = questionResult.responses.find(r => r.odId === socket.id);
        if (alreadyAnswered) return cb({ error: 'You already answered.' });

        const now = Date.now();
        const deadline = session.questionDeadline ? session.questionDeadline.getTime() : now;
        if (now > deadline + 1000) return cb({ error: 'Time is up.' });

        const question = session.questions[qi];
        const chosenOption = question.options.find(o => o.id === answerId);
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
          answerId,
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
          }
        }, RECONNECT_WINDOW_MS);

        gameNs.to(sessionId).emit('lobby:playerDisconnected', { playerName: name });
      }
    });
  });

  // Periodic cleanup of stale lobby sessions
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of activeSessions) {
      if (session.status === 'lobby' && (now - new Date(session.createdAt).getTime()) > LOBBY_TTL_MS) {
        session.status = 'expired';
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
  for (const session of activeSessions.values()) {
    if (session.pin === pin && (session.status === 'lobby' || session.status === 'in_progress')) {
      return session;
    }
  }
  return null;
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

  if (sessionsCol) {
    await persistSessionUpdate(sessionsCol, session._id, {
      players: session.players,
      [`results.${qi}`]: questionResult
    });
  }
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

module.exports = { initSocketManager };
