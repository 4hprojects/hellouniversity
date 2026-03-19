const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createLiveGameBuilderApiRoutes = require('../../routes/liveGameBuilderApiRoutes');
const { isAuthenticated, isTeacherOrAdmin } = require('../../middleware/routeAuthGuards');
const { createCollection, toIdString } = require('../helpers/inMemoryMongo');

function buildApp({ sessionData, gameDocs = [] }) {
  const liveGamesCollection = createCollection(gameDocs);
  const liveSessionsCollection = createCollection([]);

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
    ObjectId,
    isAuthenticated,
    isTeacherOrAdmin
  }));

  return { app, liveGamesCollection };
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

describe('live game builder API smoke', () => {
  const teacherId = new ObjectId().toHexString();

  const teacherSession = {
    userId: teacherId,
    role: 'teacher',
    name: 'Test Teacher'
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
      questions: [{ title: 'Q1', type: 'multiple_choice', options: [] }]
    };
    const { app } = buildApp({ sessionData: teacherSession, gameDocs: [gameDoc] });

    const res = await request(app).get(`/api/live-games/${gameId.toHexString()}`);
    expect(res.status).toBe(200);
    expect(res.body.game.title).toBe('Owned Game');
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
});

describe('liveGameHelpers unit tests', () => {
  const {
    generateGamePin,
    calculateScore,
    buildLeaderboard,
    sanitizeQuestionForPlayer,
    validateGamePayload
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
    expect(lb[0].odName).toBe('Bob');
    expect(lb[1].odName).toBe('Carol');
    expect(lb[2].odName).toBe('Alice');
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

  it('validateGamePayload returns invalid for missing title', () => {
    const result = validateGamePayload({ title: '', questions: [{ title: 'Q', type: 'multiple_choice', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }] });
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('validateGamePayload returns valid for correct payload', () => {
    const result = validateGamePayload(validGame);
    expect(result.valid).toBe(true);
  });
});
