const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createStudentClassRushApiRoutes = require('../../routes/studentClassRushApiRoutes');
const { isAuthenticated } = require('../../middleware/routeAuthGuards');
const { createCollection } = require('../helpers/inMemoryMongo');

function buildApp({
  sessionData,
  gameDocs = [],
  assignmentDocs = [],
  attemptDocs = [],
  classDocs = []
}) {
  const liveGamesCollection = createCollection(gameDocs);
  const liveGameAssignmentsCollection = createCollection(assignmentDocs);
  const liveGameAttemptsCollection = createCollection(attemptDocs);
  const classesCollection = createCollection(classDocs);

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });

  app.use(createStudentClassRushApiRoutes({
    getLiveGamesCollection: () => liveGamesCollection,
    getLiveGameAssignmentsCollection: () => liveGameAssignmentsCollection,
    getLiveGameAttemptsCollection: () => liveGameAttemptsCollection,
    getClassesCollection: () => classesCollection,
    ObjectId,
    isAuthenticated
  }));

  return {
    app,
    liveGameAttemptsCollection
  };
}

describe('student self-paced ClassRush API smoke', () => {
  const gameId = new ObjectId();
  const assignmentId = new ObjectId();
  const classId = new ObjectId();
  const studentIDNumber = '2024-00123';

  const studentSession = {
    userId: '507f1f77bcf86cd799439011',
    role: 'student',
    studentIDNumber,
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  const gameDoc = {
    _id: gameId,
    title: 'Self-Paced Drill',
    description: 'Practice ClassRush',
    ownerUserId: 'teacher-1',
    questions: [
      {
        id: 'q1',
        title: 'Capital of France',
        type: 'multiple_choice',
        options: [
          { id: 'a', text: 'Paris', isCorrect: true },
          { id: 'b', text: 'Rome', isCorrect: false }
        ],
        timeLimitSeconds: 20
      }
    ],
    settings: {
      randomizeQuestionOrder: false,
      randomizeAnswerOrder: false
    }
  };

  const classDoc = {
    _id: classId,
    classCode: 'C000900',
    className: 'World History',
    status: 'active',
    students: [studentIDNumber, '2024-00456']
  };

  test('GET /api/student/classrush/assignments/:assignmentId creates and returns a resumable attempt', async () => {
    const { app, liveGameAttemptsCollection } = buildApp({
      sessionData: studentSession,
      gameDocs: [gameDoc],
      assignmentDocs: [{
        _id: assignmentId,
        gameId: gameId.toHexString(),
        classId: classId.toHexString(),
        classCode: classDoc.classCode,
        className: classDoc.className,
        assignmentMode: 'whole_class',
        assignedStudents: [],
        duePolicy: 'lock_after_due',
        scoringProfile: 'accuracy'
      }],
      classDocs: [classDoc]
    });

    const response = await request(app).get(`/api/student/classrush/assignments/${assignmentId.toHexString()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.questions).toHaveLength(1);
    expect(response.body.questions[0].options[0].isCorrect).toBeUndefined();

    const attempt = await liveGameAttemptsCollection.findOne({
      assignmentId: assignmentId.toHexString(),
      studentIDNumber
    });
    expect(attempt).toBeTruthy();
    expect(attempt.status).toBe('in_progress');
  });

  test('progress save and submit compute self-paced accuracy results', async () => {
    const attemptDoc = {
      _id: new ObjectId(),
      assignmentId: assignmentId.toHexString(),
      gameId: gameId.toHexString(),
      classId: classId.toHexString(),
      studentIDNumber,
      studentUserId: studentSession.userId,
      studentName: 'Kayla Ryhs',
      status: 'in_progress',
      questions: gameDoc.questions,
      responses: [],
      currentQuestionIndex: 0,
      startedAt: new Date('2026-03-30T08:00:00.000Z'),
      updatedAt: new Date('2026-03-30T08:00:00.000Z')
    };

    const { app, liveGameAttemptsCollection } = buildApp({
      sessionData: studentSession,
      gameDocs: [gameDoc],
      assignmentDocs: [{
        _id: assignmentId,
        gameId: gameId.toHexString(),
        classId: classId.toHexString(),
        classCode: classDoc.classCode,
        className: classDoc.className,
        assignmentMode: 'whole_class',
        assignedStudents: [],
        duePolicy: 'lock_after_due',
        scoringProfile: 'accuracy'
      }],
      attemptDocs: [attemptDoc],
      classDocs: [classDoc]
    });

    const progressResponse = await request(app)
      .put(`/api/student/classrush/assignments/${assignmentId.toHexString()}/progress`)
      .send({
        questionIndex: 0,
        answerId: 'a',
        timeMs: 1500,
        currentQuestionIndex: 0
      });

    expect(progressResponse.status).toBe(200);
    expect(progressResponse.body.success).toBe(true);

    const submitResponse = await request(app)
      .post(`/api/student/classrush/assignments/${assignmentId.toHexString()}/submit`);

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.success).toBe(true);
    expect(submitResponse.body.attempt.status).toBe('submitted');
    expect(submitResponse.body.attempt.score).toBe(1);
    expect(submitResponse.body.attempt.percent).toBe(100);
    expect(submitResponse.body.attempt.showRank).toBe(false);

    const storedAttempt = await liveGameAttemptsCollection.findOne({ _id: attemptDoc._id });
    expect(storedAttempt.status).toBe('submitted');
    expect(storedAttempt.correctCount).toBe(1);
  });

  test('allow-late assignments stay open after the due date and mark late submissions', async () => {
    const attemptDoc = {
      _id: new ObjectId(),
      assignmentId: assignmentId.toHexString(),
      gameId: gameId.toHexString(),
      classId: classId.toHexString(),
      studentIDNumber,
      studentUserId: studentSession.userId,
      studentName: 'Kayla Ryhs',
      status: 'in_progress',
      questions: gameDoc.questions,
      responses: [{ questionIndex: 0, answerId: 'a', timeMs: 1500 }],
      currentQuestionIndex: 0,
      startedAt: new Date('2026-03-20T08:00:00.000Z'),
      updatedAt: new Date('2026-03-20T08:00:00.000Z')
    };

    const { app } = buildApp({
      sessionData: studentSession,
      gameDocs: [gameDoc],
      assignmentDocs: [{
        _id: assignmentId,
        gameId: gameId.toHexString(),
        classId: classId.toHexString(),
        classCode: classDoc.classCode,
        className: classDoc.className,
        assignmentMode: 'whole_class',
        assignedStudents: [],
        dueDate: new Date('2026-03-21T08:00:00.000Z'),
        duePolicy: 'allow_late_submission',
        scoringProfile: 'accuracy'
      }],
      attemptDocs: [attemptDoc],
      classDocs: [classDoc]
    });

    const loadResponse = await request(app).get(`/api/student/classrush/assignments/${assignmentId.toHexString()}`);
    expect(loadResponse.status).toBe(200);
    expect(loadResponse.body.availability.isLateWindow).toBe(true);

    const submitResponse = await request(app).post(`/api/student/classrush/assignments/${assignmentId.toHexString()}/submit`);
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.attempt.isLateSubmission).toBe(true);
  });

  test('selected-student assignments block students outside the target list', async () => {
    const { app } = buildApp({
      sessionData: studentSession,
      gameDocs: [gameDoc],
      assignmentDocs: [{
        _id: assignmentId,
        gameId: gameId.toHexString(),
        classId: classId.toHexString(),
        classCode: classDoc.classCode,
        className: classDoc.className,
        assignmentMode: 'selected_students',
        assignedStudents: ['2024-00999'],
        duePolicy: 'lock_after_due',
        scoringProfile: 'accuracy'
      }],
      classDocs: [classDoc]
    });

    const response = await request(app).get(`/api/student/classrush/assignments/${assignmentId.toHexString()}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('do not have access');
  });
});
