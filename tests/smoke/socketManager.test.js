const { ObjectId } = require('mongodb');

const { createCollection } = require('../helpers/inMemoryMongo');
const { _private } = require('../../app/socketManager');

function createGameNs() {
  return {
    to() {
      return { emit() {} };
    }
  };
}

describe('socketManager recovery smoke', () => {
  afterEach(() => {
    _private.resetForTests();
  });

  it('hydrates an active lobby session from Mongo', async () => {
    const sessionId = new ObjectId();
    const sessionsCollection = createCollection([
      {
        _id: sessionId,
        gameId: 'game-1',
        pin: '1234567',
        hostUserId: 'teacher-1',
        status: 'lobby',
        players: [],
        disconnectedPlayers: {},
        questions: [],
        results: [],
        rankSnapshots: [],
        createdAt: new Date()
      }
    ]);

    await _private.hydrateActiveSessions(createGameNs(), () => sessionsCollection);
    const recovered = await _private.recoverCanonicalSessionByPin(createGameNs(), sessionsCollection, '1234567');
    expect(recovered).toBeTruthy();
    expect(recovered.status).toBe('lobby');
    expect(recovered._id).toBe(sessionId.toHexString());
  });

  it('keeps in-progress question active when deadline is still in the future', async () => {
    const sessionId = new ObjectId();
    const sessionsCollection = createCollection([
      {
        _id: sessionId,
        gameId: 'game-2',
        pin: '7654321',
        hostUserId: 'teacher-1',
        status: 'in_progress',
        hostView: 'question',
        currentQuestionIndex: 0,
        questionStartedAt: new Date(),
        questionDeadline: new Date(Date.now() + 60_000),
        players: [{ odName: 'Alice', participantKey: 'guest:alice', score: 0, joinedAt: Date.now() }],
        disconnectedPlayers: {},
        questions: [{ id: 'q1', title: 'Q1', type: 'multiple_choice', options: [{ id: 'a', text: 'A', isCorrect: true }, { id: 'b', text: 'B', isCorrect: false }] }],
        results: [{ questionId: 'q1', responses: [] }],
        rankSnapshots: [],
        createdAt: new Date()
      }
    ]);

    await _private.hydrateActiveSessions(createGameNs(), () => sessionsCollection);
    const recovered = await _private.recoverCanonicalSessionByPin(createGameNs(), sessionsCollection, '7654321');
    expect(recovered.status).toBe('in_progress');
    expect(recovered.hostView).toBe('question');
    expect(recovered.joinLocked).toBe(true);
    expect(recovered.questionDeadline.getTime()).toBeGreaterThan(Date.now());
  });

  it('ends an expired in-progress question during hydration', async () => {
    const sessionId = new ObjectId();
    const sessionsCollection = createCollection([
      {
        _id: sessionId,
        gameId: 'game-3',
        gameTitle: 'Expired Question',
        pin: '1111111',
        hostUserId: 'teacher-1',
        status: 'in_progress',
        hostView: 'question',
        currentQuestionIndex: 0,
        questionStartedAt: new Date(Date.now() - 40_000),
        questionDeadline: new Date(Date.now() - 5_000),
        players: [{ odName: 'Alice', participantKey: 'guest:alice', score: 1000, joinedAt: Date.now() }],
        disconnectedPlayers: {},
        questions: [{ id: 'q1', title: 'Q1', type: 'multiple_choice', options: [{ id: 'a', text: 'A', isCorrect: true }, { id: 'b', text: 'B', isCorrect: false }] }],
        results: [{ questionId: 'q1', responses: [{ participantKey: 'guest:alice', odName: 'Alice', answerId: 'a', correct: true, timeMs: 1000, pointsAwarded: 1000, totalScoreAfterQuestion: 1000 }] }],
        rankSnapshots: [],
        createdAt: new Date()
      }
    ]);

    await _private.hydrateActiveSessions(createGameNs(), () => sessionsCollection);
    const recovered = await _private.recoverCanonicalSessionByPin(createGameNs(), sessionsCollection, '1111111');
    expect(recovered.hostView).toBe('results');
    expect(recovered.rankSnapshots).toHaveLength(1);
  });

  it('cancels session when host reconnect deadline has expired', async () => {
    const sessionId = new ObjectId();
    const sessionsCollection = createCollection([
      {
        _id: sessionId,
        gameId: 'game-4',
        pin: '2222222',
        hostUserId: 'teacher-1',
        status: 'lobby',
        hostDisconnectedAt: new Date(Date.now() - 10 * 60 * 1000),
        hostReconnectDeadline: new Date(Date.now() - 1_000),
        players: [],
        disconnectedPlayers: {},
        questions: [],
        results: [],
        rankSnapshots: [],
        createdAt: new Date()
      }
    ]);

    await _private.hydrateActiveSessions(createGameNs(), () => sessionsCollection);
    const updated = await sessionsCollection.findOne({ _id: sessionId });
    expect(updated.status).toBe('cancelled');
  });

  it('builds player reconnect state for an active question', () => {
    const session = {
      status: 'in_progress',
      hostView: 'question',
      currentQuestionIndex: 0,
      questionDeadline: new Date(Date.now() + 30_000),
      questions: [{ id: 'q1', title: 'Q1', type: 'multiple_choice', options: [{ id: 'a', text: 'A', isCorrect: true }] }],
      results: [{ questionId: 'q1', responses: [] }],
      players: [{ odName: 'Alice', participantKey: 'guest:alice', score: 0, joinedAt: Date.now() }]
    };

    const reconnectState = _private.buildPlayerReconnectState(session, session.players[0]);
    expect(reconnectState.phase).toBe('answer');
    expect(reconnectState.question.question.title).toBe('Q1');
  });

  it('keeps legacy participant fields readable after hydration', async () => {
    const sessionId = new ObjectId();
    const sessionsCollection = createCollection([
      {
        _id: sessionId,
        gameId: 'game-5',
        pin: '3333333',
        hostUserId: 'teacher-1',
        status: 'lobby',
        players: [{ odId: 'socket-1', odName: 'Alice', participantKey: 'guest:alice', score: 0, joinedAt: Date.now() }],
        disconnectedPlayers: {},
        questions: [],
        results: [],
        rankSnapshots: [],
        createdAt: new Date()
      }
    ]);

    await _private.hydrateActiveSessions(createGameNs(), () => sessionsCollection);
    const recovered = await _private.recoverCanonicalSessionByPin(createGameNs(), sessionsCollection, '3333333');
    expect(recovered.players[0].displayName).toBe('Alice');
    expect(recovered.players[0].socketId).toBe('socket-1');
  });

  it('builds paused reconnect state for players on a frozen question', () => {
    const session = {
      status: 'in_progress',
      hostView: 'question',
      paused: true,
      pausedQuestionRemainingMs: 12000,
      currentQuestionIndex: 0,
      questionDeadline: null,
      questions: [{ id: 'q1', title: 'Q1', type: 'multiple_choice', options: [{ id: 'a', text: 'A', isCorrect: true }] }],
      results: [{ questionId: 'q1', responses: [] }],
      players: [{ displayName: 'Alice', participantKey: 'guest:alice', score: 0, joinedAt: Date.now() }]
    };

    const reconnectState = _private.buildPlayerReconnectState(session, session.players[0]);
    expect(reconnectState.phase).toBe('answer');
    expect(reconnectState.question.paused).toBe(true);
    expect(reconnectState.question.pausedQuestionRemainingMs).toBe(12000);
  });

  it('preserves randomized session question order through recovery', async () => {
    const sessionId = new ObjectId();
    const sessionsCollection = createCollection([
      {
        _id: sessionId,
        gameId: 'game-6',
        pin: '4444444',
        hostUserId: 'teacher-1',
        status: 'lobby',
        players: [],
        disconnectedPlayers: {},
        questions: [
          { id: 'q2', title: 'Second', type: 'poll', options: [{ id: 'b', text: 'B' }, { id: 'a', text: 'A' }] },
          { id: 'q1', title: 'First', type: 'multiple_choice', options: [{ id: 'c', text: 'C', isCorrect: true }, { id: 'd', text: 'D', isCorrect: false }] }
        ],
        results: [],
        rankSnapshots: [],
        createdAt: new Date()
      }
    ]);

    await _private.hydrateActiveSessions(createGameNs(), () => sessionsCollection);
    const recovered = await _private.recoverCanonicalSessionByPin(createGameNs(), sessionsCollection, '4444444');
    expect(recovered.questions.map((question) => question.id)).toEqual(['q2', 'q1']);
    expect(recovered.questions[0].options.map((option) => option.id)).toEqual(['b', 'a']);
  });

  it('builds poll result reconnect state without marking the player wrong', () => {
    const session = {
      status: 'in_progress',
      hostView: 'results',
      currentQuestionIndex: 0,
      questions: [{ id: 'q1', title: 'Poll', type: 'poll', options: [{ id: 'a', text: 'Yes' }, { id: 'b', text: 'No' }] }],
      results: [{ questionId: 'q1', responses: [{ participantKey: 'guest:alice', answerId: 'a', correct: null, timeMs: 900, pointsAwarded: 0, totalScoreAfterQuestion: 0 }] }],
      players: [{ displayName: 'Alice', participantKey: 'guest:alice', score: 0, joinedAt: Date.now() }]
    };

    const reconnectState = _private.buildPlayerReconnectState(session, session.players[0]);
    expect(reconnectState.phase).toBe('result');
    expect(reconnectState.result.questionType).toBe('poll');
    expect(reconnectState.result.answered).toBe(true);
    expect(reconnectState.result.correct).toBeNull();
  });
});
