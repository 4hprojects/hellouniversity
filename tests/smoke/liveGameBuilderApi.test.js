const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createLiveGameBuilderApiRoutes = require('../../routes/liveGameBuilderApiRoutes');
const { isAuthenticated, isTeacherOrAdmin } = require('../../middleware/routeAuthGuards');
const { createCollection, toIdString } = require('../helpers/inMemoryMongo');

function buildApp({ sessionData, gameDocs = [], sessionDocs = [], classDocs = [] }) {
  const liveGamesCollection = createCollection(gameDocs);
  const liveSessionsCollection = createCollection(sessionDocs);
  const classesCollection = createCollection(classDocs);

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });

  app.use('/api/live-games', createLiveGameBuilderApiRoutes({
    getLiveGamesCollection: () => liveGamesCollection,
    getLiveSessionsCollection: () => liveSessionsCollection,
    getClassesCollection: () => classesCollection,
    ObjectId,
    isAuthenticated,
    isTeacherOrAdmin
  }));

  return { app, liveGamesCollection, liveSessionsCollection, classesCollection };
}

const validGame = {
  title: 'Test Game',
  description: 'A sample quiz game',
  questions: [
    {
      title: 'What is 1+1?',
      type: 'multiple_choice',
      timeLimitSec: 20,
      options: [
        { text: '2', isCorrect: true },
        { text: '3', isCorrect: false }
      ]
    }
  ],
  settings: { requireLogin: false, showLeaderboard: true, maxPlayers: 50 }
};

const validPollGame = {
  title: 'Pulse Check',
  description: 'Quick poll',
  questions: [
    {
      title: 'How confident do you feel?',
      type: 'poll',
      timeLimitSeconds: 20,
      options: [
        { text: 'Very confident' },
        { text: 'Need a review' },
        { text: 'Still confused' }
      ]
    }
  ],
  settings: { requireLogin: false, showLeaderboardAfterEach: false, maxPlayers: 40, randomizeQuestionOrder: true, randomizeAnswerOrder: true }
};

const validTypeAnswerGame = {
  title: 'Short Answer Drill',
  description: 'Typed responses',
  questions: [
    {
      title: 'Name the process plants use to make food.',
      type: 'type_answer',
      timeLimitSeconds: 30,
      acceptedAnswers: ['Photosynthesis', 'photosynthesis']
    }
  ],
  settings: { requireLogin: true, showLeaderboardAfterEach: true, maxPlayers: 25 }
};

describe('live game builder API smoke', () => {
  const teacherId = new ObjectId().toHexString();
  const activeClassId = new ObjectId();
  const activeTeachingTeamClassId = new ObjectId();
  const archivedClassId = new ObjectId();
  const otherTeacherId = new ObjectId();

  const teacherSession = {
    userId: teacherId,
    role: 'teacher',
    name: 'Test Teacher',
    firstName: 'Test',
    lastName: 'Teacher'
  };

  const activeClassDoc = {
    _id: activeClassId,
    className: 'Advanced Math',
    classCode: 'C000101',
    courseCode: 'MATH101',
    status: 'active',
    instructorId: new ObjectId(teacherId),
    teachingTeam: [],
    students: ['2024-00123', '2024-00999']
  };

  const activeTeachingTeamClassDoc = {
    _id: activeTeachingTeamClassId,
    className: 'Physics Lab',
    classCode: 'C000202',
    courseCode: 'PHYS201',
    status: 'active',
    instructorId: otherTeacherId,
    teachingTeam: [{ userId: new ObjectId(teacherId), role: 'co_teacher', status: 'active' }],
    students: ['2024-00456']
  };

  const archivedClassDoc = {
    _id: archivedClassId,
    className: 'Old History',
    classCode: 'C000303',
    courseCode: 'HIST102',
    status: 'archived',
    instructorId: new ObjectId(teacherId),
    teachingTeam: [],
    students: ['2024-00777']
  };

  // ---- Auth guards ----

  it('GET /api/live-games returns 401 when not logged in', async () => {
    const { app } = buildApp({ sessionData: {} });
    const res = await request(app).get('/api/live-games');
    expect(res.status).toBe(401);
  });

  it('POST /api/live-games returns 401 for student role', async () => {
    const { app } = buildApp({ sessionData: { userId: 'u1', role: 'student' } });
    const res = await request(app).post('/api/live-games').send(validGame);
    expect(res.status).toBe(403);
  });

  // ---- CREATE ----

  it('POST /api/live-games creates a game', async () => {
    const { app } = buildApp({ sessionData: teacherSession });
    const res = await request(app)
      .post('/api/live-games')
      .send(validGame);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.game).toBeDefined();
    expect(res.body.game.title).toBe('Test Game');
  });

  it('POST /api/live-games stores poll questions and randomization settings', async () => {
    const { app, liveGamesCollection } = buildApp({ sessionData: teacherSession });

    const res = await request(app)
      .post('/api/live-games')
      .send(validPollGame);

    expect(res.status).toBe(201);
    const stored = await liveGamesCollection.findOne({ title: 'Pulse Check' });
    expect(stored.settings.randomizeQuestionOrder).toBe(true);
    expect(stored.settings.randomizeAnswerOrder).toBe(true);
    expect(stored.questions[0].type).toBe('poll');
    expect(stored.questions[0].points).toBe(0);
    expect(stored.questions[0].options.every((option) => option.isCorrect === false)).toBe(true);
  });

  it('POST /api/live-games stores type_answer questions with accepted answers', async () => {
    const { app, liveGamesCollection } = buildApp({ sessionData: teacherSession });

    const res = await request(app)
      .post('/api/live-games')
      .send(validTypeAnswerGame);

    expect(res.status).toBe(201);
    const stored = await liveGamesCollection.findOne({ title: 'Short Answer Drill' });
    expect(stored.questions[0].type).toBe('type_answer');
    expect(stored.questions[0].acceptedAnswers).toEqual(['Photosynthesis']);
    expect(stored.questions[0].options).toEqual([]);
  });

  it('POST /api/live-games canonicalizes legacy aliases and stores linked class snapshots', async () => {
    const { app, liveGamesCollection } = buildApp({
      sessionData: teacherSession,
      classDocs: [activeClassDoc, activeTeachingTeamClassDoc, archivedClassDoc]
    });

    const res = await request(app)
      .post('/api/live-games')
      .send({
        ...validGame,
        linkedClassId: activeClassId.toHexString()
      });

    expect(res.status).toBe(201);
    const stored = await liveGamesCollection.findOne({ title: 'Test Game' });
    expect(stored.linkedClass).toEqual({
      classId: activeClassId.toHexString(),
      classCode: 'C000101',
      className: 'Advanced Math'
    });
    expect(stored.questions[0].timeLimitSeconds).toBe(20);
    expect(stored.settings.showLeaderboardAfterEach).toBe(true);
  });

  it('POST /api/live-games accepts active teaching-team classes for linkage', async () => {
    const { app } = buildApp({
      sessionData: teacherSession,
      classDocs: [activeClassDoc, activeTeachingTeamClassDoc]
    });

    const res = await request(app)
      .post('/api/live-games')
      .send({
        ...validGame,
        linkedClassId: activeTeachingTeamClassId.toHexString()
      });

    expect(res.status).toBe(201);
    expect(res.body.game.linkedClass.classId).toBe(activeTeachingTeamClassId.toHexString());
  });

  it('POST /api/live-games rejects inaccessible linked classes', async () => {
    const inaccessibleClassId = new ObjectId();
    const { app } = buildApp({
      sessionData: teacherSession,
      classDocs: [{
        _id: inaccessibleClassId,
        className: 'Other Teacher Class',
        classCode: 'C000404',
        courseCode: 'SCI404',
        status: 'active',
        instructorId: otherTeacherId,
        teachingTeam: [],
        students: []
      }]
    });

    const res = await request(app)
      .post('/api/live-games')
      .send({
        ...validGame,
        linkedClassId: inaccessibleClassId.toHexString()
      });

    expect(res.status).toBe(403);
  });

  it('POST /api/live-games rejects archived linked classes', async () => {
    const { app } = buildApp({
      sessionData: teacherSession,
      classDocs: [archivedClassDoc]
    });

    const res = await request(app)
      .post('/api/live-games')
      .send({
        ...validGame,
        linkedClassId: archivedClassId.toHexString()
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Only active classes');
  });

  it('POST /api/live-games rejects invalid linked class ids', async () => {
    const { app } = buildApp({ sessionData: teacherSession });
    const res = await request(app)
      .post('/api/live-games')
      .send({
        ...validGame,
        linkedClassId: 'bad-class-id'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid class selection');
  });

  it('POST /api/live-games rejects empty title', async () => {
    const { app } = buildApp({ sessionData: teacherSession });
    const res = await request(app)
      .post('/api/live-games')
      .send({ ...validGame, title: '' });

    expect(res.status).toBe(400);
  });

  it('POST /api/live-games rejects game with no questions', async () => {
    const { app } = buildApp({ sessionData: teacherSession });
    const res = await request(app)
      .post('/api/live-games')
      .send({ ...validGame, questions: [] });

    expect(res.status).toBe(400);
  });

  it('POST /api/live-games rejects poll questions with fewer than 2 options', async () => {
    const { app } = buildApp({ sessionData: teacherSession });
    const res = await request(app)
      .post('/api/live-games')
      .send({
        ...validPollGame,
        questions: [{ ...validPollGame.questions[0], options: [{ text: 'Only one option' }] }]
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('At least 2 options required');
  });

  it('POST /api/live-games rejects type_answer questions with no accepted answers', async () => {
    const { app } = buildApp({ sessionData: teacherSession });
    const res = await request(app)
      .post('/api/live-games')
      .send({
        ...validTypeAnswerGame,
        questions: [{ ...validTypeAnswerGame.questions[0], acceptedAnswers: [] }]
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('accepted answer');
  });

  // ---- LIST ----

  it('GET /api/live-games returns owned games', async () => {
    const gameDoc = {
      _id: new ObjectId(),
      title: 'My Game',
      ownerUserId: teacherId,
      questions: [{ title: 'Q1', type: 'multiple_choice', options: [] }],
      createdAt: new Date()
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc] });

    const res = await request(app).get('/api/live-games');
    expect(res.status).toBe(200);
    expect(res.body.games.length).toBe(1);
    expect(res.body.games[0].title).toBe('My Game');
  });

  it('GET /api/live-games does not return other users games', async () => {
    const otherDoc = {
      _id: new ObjectId(),
      title: 'Other Game',
      ownerUserId: 'other-user-id',
      questions: [{ title: 'Q1', type: 'multiple_choice', options: [] }],
      createdAt: new Date()
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [otherDoc] });

    const res = await request(app).get('/api/live-games');
    expect(res.status).toBe(200);
    expect(res.body.games.length).toBe(0);
  });

  // ---- GET SINGLE ----

  it('GET /api/live-games/:id returns 400 for invalid id', async () => {
    const { app } = buildApp({ sessionData: teacherSession });
    const res = await request(app).get('/api/live-games/bad-id');
    expect(res.status).toBe(400);
  });

  it('GET /api/live-games/:id returns 404 for non-existent game', async () => {
    const { app } = buildApp({ sessionData: teacherSession });
    const fakeId = new ObjectId().toHexString();
    const res = await request(app).get(`/api/live-games/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/live-games/:id returns the game for the owner', async () => {
    const gameId = new ObjectId();
    const gameDoc = {
      _id: gameId,
      title: 'Owned Game',
      ownerUserId: teacherId,
      linkedClass: {
        classId: activeClassId.toHexString(),
        classCode: 'C000101',
        className: 'Advanced Math'
      },
      settings: { requireLogin: false, showLeaderboard: true, maxPlayers: 60, randomizeQuestionOrder: true, randomizeAnswerOrder: true },
      questions: [{ title: 'Q1', type: 'multiple_choice', timeLimitSec: 20, options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }]
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc] });

    const res = await request(app).get(`/api/live-games/${gameId.toHexString()}`);
    expect(res.status).toBe(200);
    expect(res.body.game.title).toBe('Owned Game');
    expect(res.body.game.linkedClass.classId).toBe(activeClassId.toHexString());
    expect(res.body.game.settings.showLeaderboardAfterEach).toBe(true);
    expect(res.body.game.settings.randomizeQuestionOrder).toBe(true);
    expect(res.body.game.settings.randomizeAnswerOrder).toBe(true);
    expect(res.body.game.questions[0].timeLimitSeconds).toBe(20);
  });

  // ---- UPDATE ----

  it('PUT /api/live-games/:id updates a game', async () => {
    const gameId = new ObjectId();
    const gameDoc = {
      _id: gameId,
      title: 'Old Title',
      ownerUserId: teacherId,
      questions: [{ title: 'Q1', type: 'multiple_choice', timeLimitSec: 20, options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }],
      settings: {}
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc] });

    const res = await request(app)
      .put(`/api/live-games/${gameId.toHexString()}`)
      .send({ ...validGame, title: 'New Title' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /api/live-games/:id updates linked class snapshots', async () => {
    const gameId = new ObjectId();
    const gameDoc = {
      _id: gameId,
      title: 'Linked Game',
      ownerUserId: teacherId,
      questions: [{ title: 'Q1', type: 'multiple_choice', timeLimitSeconds: 20, options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }],
      settings: {}
    };
    const { app, liveGamesCollection } = buildApp({
      sessionData: teacherSession,
      gameDocs: [gameDoc],
      classDocs: [activeClassDoc]
    });

    const res = await request(app)
      .put(`/api/live-games/${gameId.toHexString()}`)
      .send({
        ...validGame,
        linkedClassId: activeClassId.toHexString()
      });

    expect(res.status).toBe(200);
    const stored = await liveGamesCollection.findOne({ _id: gameId });
    expect(stored.linkedClass.classId).toBe(activeClassId.toHexString());
  });

  // ---- DELETE ----

  it('DELETE /api/live-games/:id deletes owned game', async () => {
    const gameId = new ObjectId();
    const gameDoc = {
      _id: gameId,
      title: 'To Delete',
      ownerUserId: teacherId,
      questions: []
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc] });

    const res = await request(app).delete(`/api/live-games/${gameId.toHexString()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ---- DUPLICATE ----

  it('POST /api/live-games/:id/duplicate copies a game', async () => {
    const gameId = new ObjectId();
    const gameDoc = {
      _id: gameId,
      title: 'Original',
      ownerUserId: teacherId,
      questions: [{ title: 'Q1', type: 'multiple_choice', timeLimitSec: 20, options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }],
      settings: {},
      description: 'desc'
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc] });

    const res = await request(app).post(`/api/live-games/${gameId.toHexString()}/duplicate`);
    expect(res.status).toBe(201);
    expect(res.body.game.title).toBe('Original (Copy)');
  });

  it('GET /api/live-games/:id/reports lists completed sessions', async () => {
    const gameId = new ObjectId();
    const sessionId = new ObjectId();
    const gameDoc = {
      _id: gameId,
      title: 'Reportable Game',
      ownerUserId: teacherId,
      questions: [{ id: 'q1', title: 'Q1', type: 'multiple_choice', options: [{ id: 'a', text: 'A', isCorrect: true }, { id: 'b', text: 'B', isCorrect: false }] }]
    };
    const sessionDoc = {
      _id: sessionId,
      gameId: gameId.toHexString(),
      gameTitle: 'Reportable Game',
      pin: '1234567',
      status: 'finished',
      questions: gameDoc.questions,
      players: [{ odName: 'Alice', participantKey: 'guest:alice', score: 1000, joinedAt: Date.now() }],
      results: [{ questionId: 'q1', responses: [{ participantKey: 'guest:alice', odName: 'Alice', answerId: 'a', correct: true, timeMs: 1500, pointsAwarded: 1000, totalScoreAfterQuestion: 1000 }] }],
      rankSnapshots: [{ questionIndex: 0, leaderboard: [{ participantKey: 'guest:alice', odName: 'Alice', score: 1000, rank: 1 }] }],
      startedAt: new Date('2026-03-24T10:00:00Z'),
      finishedAt: new Date('2026-03-24T10:05:00Z'),
      createdAt: new Date('2026-03-24T10:00:00Z')
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc], sessionDocs: [sessionDoc] });

    const res = await request(app).get(`/api/live-games/${gameId.toHexString()}/reports`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].sessionId).toBe(sessionId.toHexString());
  });

  it('GET /api/live-games/:id/reports/:sessionId returns detailed report', async () => {
    const gameId = new ObjectId();
    const sessionId = new ObjectId();
    const gameDoc = {
      _id: gameId,
      title: 'Detailed Game',
      ownerUserId: teacherId,
      questions: [{ id: 'q1', title: 'Q1', type: 'multiple_choice', options: [{ id: 'a', text: 'A', isCorrect: true }, { id: 'b', text: 'B', isCorrect: false }] }]
    };
    const sessionDoc = {
      _id: sessionId,
      gameId: gameId.toHexString(),
      gameTitle: 'Detailed Game',
      pin: '7654321',
      status: 'finished',
      questions: gameDoc.questions,
      players: [
        { odName: 'Alice', participantKey: 'guest:alice', score: 1000, joinedAt: Date.now() },
        { odName: 'Bob', participantKey: 'guest:bob', score: 0, joinedAt: Date.now() + 1000 }
      ],
      results: [{ questionId: 'q1', responses: [{ participantKey: 'guest:alice', odName: 'Alice', answerId: 'a', correct: true, timeMs: 1500, pointsAwarded: 1000, totalScoreAfterQuestion: 1000 }] }],
      rankSnapshots: [{ questionIndex: 0, leaderboard: [{ participantKey: 'guest:alice', odName: 'Alice', score: 1000, rank: 1 }] }],
      startedAt: new Date('2026-03-24T10:00:00Z'),
      finishedAt: new Date('2026-03-24T10:05:00Z'),
      createdAt: new Date('2026-03-24T10:00:00Z')
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc], sessionDocs: [sessionDoc] });

    const res = await request(app).get(`/api/live-games/${gameId.toHexString()}/reports/${sessionId.toHexString()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report.summary.pin).toBe('7654321');
    expect(res.body.report.summary.averageResponseTimeMs).toBe(1500);
    expect(res.body.report.questionAnalytics[0].nonResponderCount).toBe(1);
    expect(res.body.report.questionAnalytics[0].nonResponders).toEqual(['Bob']);
    expect(res.body.report.playerReports).toHaveLength(2);
    expect(res.body.report.playerReports.find((player) => player.playerName === 'Bob').unansweredCount).toBe(1);
  });

  it('GET /api/live-games/:id/reports/:sessionId/export.csv exports a flat CSV report', async () => {
    const gameId = new ObjectId();
    const sessionId = new ObjectId();
    const gameDoc = {
      _id: gameId,
      title: 'CSV Game',
      ownerUserId: teacherId,
      questions: [
        {
          id: 'q1',
          title: 'Capital of France',
          type: 'type_answer',
          acceptedAnswers: ['Paris'],
          options: []
        }
      ]
    };
    const sessionDoc = {
      _id: sessionId,
      gameId: gameId.toHexString(),
      gameTitle: 'CSV Game',
      pin: '8888888',
      status: 'finished',
      linkedClass: { classId: activeClassId.toHexString(), className: 'Advanced Math' },
      questions: gameDoc.questions,
      players: [{ odName: 'Alice', participantKey: 'guest:alice', score: 1000, joinedAt: Date.now() }],
      results: [{ questionId: 'q1', responses: [{ participantKey: 'guest:alice', odName: 'Alice', submittedText: 'Paris', correct: true, timeMs: 1200, pointsAwarded: 1000, totalScoreAfterQuestion: 1000 }] }],
      rankSnapshots: [{ questionIndex: 0, leaderboard: [{ participantKey: 'guest:alice', odName: 'Alice', score: 1000, rank: 1 }] }],
      startedAt: new Date('2026-03-24T10:00:00Z'),
      finishedAt: new Date('2026-03-24T10:05:00Z'),
      createdAt: new Date('2026-03-24T10:00:00Z')
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc], sessionDocs: [sessionDoc] });

    const res = await request(app).get(`/api/live-games/${gameId.toHexString()}/reports/${sessionId.toHexString()}/export.csv`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('sessionId,gameId,gameTitle,pin');
    expect(res.text).toContain('CSV Game');
    expect(res.text).toContain('type_answer');
    expect(res.text).toContain('Paris');
  });

  it('GET /api/live-games/:id/reports blocks non-owner access', async () => {
    const gameId = new ObjectId();
    const sessionId = new ObjectId();
    const gameDoc = {
      _id: gameId,
      title: 'Private Game',
      ownerUserId: 'other-owner',
      questions: []
    };
    const sessionDoc = {
      _id: sessionId,
      gameId: gameId.toHexString(),
      status: 'finished',
      questions: [],
      players: [],
      results: [],
      createdAt: new Date()
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc], sessionDocs: [sessionDoc] });

    const res = await request(app).get(`/api/live-games/${gameId.toHexString()}/reports`);
    expect(res.status).toBe(404);
  });
});

describe('liveGameHelpers unit tests', () => {
  const {
    generateGamePin,
    calculateScore,
    buildLeaderboard,
    sanitizeQuestionForPlayer,
    validateGamePayload,
    prepareHostedQuestions,
    buildCompletedSessionReport,
    buildCompletedSessionCsv
  } = require('../../utils/liveGameHelpers');

  it('generateGamePin returns a 6-digit string', async () => {
    const fakeCollection = { findOne: async () => null };
    const pin = await generateGamePin(fakeCollection);
    expect(pin).toMatch(/^\d{6}$/);
  });

  it('calculateScore returns higher score for faster answers', () => {
    const fast = calculateScore(true, 2000, 20, 1);
    const slow = calculateScore(true, 15000, 20, 1);
    expect(fast.points).toBeGreaterThan(slow.points);
  });

  it('calculateScore returns 0 for incorrect answers', () => {
    expect(calculateScore(false, 2000, 20, 1).points).toBe(0);
  });

  it('buildLeaderboard sorts by score descending', () => {
    const players = [
      { odName: 'Alice', score: 500, joinedAt: new Date() },
      { odName: 'Bob', score: 1000, joinedAt: new Date() },
      { odName: 'Carol', score: 800, joinedAt: new Date() }
    ];
    const lb = buildLeaderboard(players);
    expect(lb[0].displayName).toBe('Bob');
    expect(lb[1].displayName).toBe('Carol');
    expect(lb[2].displayName).toBe('Alice');
  });

  it('sanitizeQuestionForPlayer strips isCorrect from options', () => {
    const q = {
      title: 'Test?',
      options: [
        { id: 'a', text: 'Yes', isCorrect: true },
        { id: 'b', text: 'No', isCorrect: false }
      ],
      type: 'multiple_choice'
    };
    const clean = sanitizeQuestionForPlayer(q);
    expect(clean.options[0].isCorrect).toBeUndefined();
    expect(clean.options[1].isCorrect).toBeUndefined();
    expect(clean.options[0].text).toBe('Yes');
  });

  it('sanitizeQuestionForPlayer keeps type_answer questions text-only', () => {
    const clean = sanitizeQuestionForPlayer({
      title: 'Name the process',
      type: 'type_answer',
      acceptedAnswers: ['Photosynthesis']
    });
    expect(clean.type).toBe('type_answer');
    expect(clean.options).toEqual([]);
    expect(clean.acceptedAnswerCount).toBe(1);
  });

  it('validateGamePayload returns invalid for missing title', () => {
    const result = validateGamePayload({ title: '', questions: [{ title: 'Q', type: 'multiple_choice', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }] });
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('validateGamePayload returns valid for correct payload', () => {
    const result = validateGamePayload(validGame);
    expect(result.valid).toBe(true);
  });

  it('validateGamePayload accepts poll and type_answer questions', () => {
    expect(validateGamePayload(validPollGame).valid).toBe(true);
    expect(validateGamePayload(validTypeAnswerGame).valid).toBe(true);
  });

  it('prepareHostedQuestions randomizes questions and options when enabled', () => {
    const randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    const prepared = prepareHostedQuestions([
      {
        id: 'q1',
        title: 'First',
        type: 'multiple_choice',
        options: [{ id: 'a', text: 'A', isCorrect: true }, { id: 'b', text: 'B', isCorrect: false }]
      },
      {
        id: 'q2',
        title: 'Second',
        type: 'poll',
        options: [{ id: 'c', text: 'C' }, { id: 'd', text: 'D' }]
      }
    ], {
      randomizeQuestionOrder: true,
      randomizeAnswerOrder: true
    });

    expect(prepared[0].id).toBe('q2');
    expect(prepared[1].id).toBe('q1');
    expect(prepared[1].options.map((option) => option.id)).toEqual(['b', 'a']);

    randomSpy.mockRestore();
  });

  it('buildCompletedSessionReport handles poll and type_answer analytics', () => {
    const report = buildCompletedSessionReport({
      _id: new ObjectId(),
      gameId: 'game-1',
      gameTitle: 'Mixed Report',
      pin: '5555555',
      status: 'finished',
      questions: [
        { id: 'q1', title: 'Confidence', type: 'poll', options: [{ id: 'a', text: 'High' }, { id: 'b', text: 'Low' }] },
        { id: 'q2', title: 'Capital', type: 'type_answer', acceptedAnswers: ['Paris'], options: [] }
      ],
      players: [
        { odName: 'Alice', participantKey: 'guest:alice', score: 1000, joinedAt: Date.now() },
        { odName: 'Bob', participantKey: 'guest:bob', score: 0, joinedAt: Date.now() + 1000 }
      ],
      results: [
        { questionId: 'q1', responses: [{ participantKey: 'guest:alice', odName: 'Alice', answerId: 'a', correct: null, timeMs: 900, pointsAwarded: 0, totalScoreAfterQuestion: 0 }] },
        { questionId: 'q2', responses: [{ participantKey: 'guest:alice', odName: 'Alice', submittedText: 'Paris', correct: true, timeMs: 1200, pointsAwarded: 1000, totalScoreAfterQuestion: 1000 }] }
      ],
      rankSnapshots: [{ questionIndex: 1, leaderboard: [{ participantKey: 'guest:alice', odName: 'Alice', score: 1000, rank: 1 }] }]
    });

    expect(report.questionAnalytics[0].questionType).toBe('poll');
    expect(report.questionAnalytics[0].correctRate).toBeNull();
    expect(report.questionAnalytics[0].optionDistribution.a).toBe(1);
    expect(report.questionAnalytics[1].acceptedAnswers).toEqual(['Paris']);
    expect(report.questionAnalytics[1].submittedAnswers[0].submittedText).toBe('Paris');
  });

  it('buildCompletedSessionCsv exports flat rows with typed submissions', () => {
    const csv = buildCompletedSessionCsv({
      _id: new ObjectId(),
      gameId: 'game-1',
      gameTitle: 'CSV Export',
      pin: '1231231',
      status: 'finished',
      questions: [{ id: 'q1', title: 'Capital', type: 'type_answer', acceptedAnswers: ['Paris'], options: [] }],
      players: [{ odName: 'Alice', participantKey: 'guest:alice', score: 1000, joinedAt: Date.now() }],
      results: [{ questionId: 'q1', responses: [{ participantKey: 'guest:alice', odName: 'Alice', submittedText: 'Paris', correct: true, timeMs: 1000, pointsAwarded: 1000, totalScoreAfterQuestion: 1000 }] }]
    });

    expect(csv).toContain('questionType');
    expect(csv).toContain('type_answer');
    expect(csv).toContain('Paris');
  });
});
