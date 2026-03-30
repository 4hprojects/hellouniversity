const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createLiveGameAssignmentsApiRoutes = require('../../routes/liveGameAssignmentsApiRoutes');
const { isAuthenticated, isTeacherOrAdmin } = require('../../middleware/routeAuthGuards');
const { createCollection, toIdString } = require('../helpers/inMemoryMongo');

function buildApp({
  sessionData,
  gameDocs = [],
  assignmentDocs = [],
  attemptDocs = [],
  classDocs = [],
  userDocs = []
}) {
  const liveGamesCollection = createCollection(gameDocs);
  const liveGameAssignmentsCollection = createCollection(assignmentDocs);
  const liveGameAttemptsCollection = createCollection(attemptDocs);
  const classesCollection = createCollection(classDocs);
  const usersCollection = createCollection(userDocs);

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });

  app.use('/api/live-games', createLiveGameAssignmentsApiRoutes({
    getLiveGamesCollection: () => liveGamesCollection,
    getLiveGameAssignmentsCollection: () => liveGameAssignmentsCollection,
    getLiveGameAttemptsCollection: () => liveGameAttemptsCollection,
    getClassesCollection: () => classesCollection,
    getUsersCollection: () => usersCollection,
    ObjectId,
    isAuthenticated,
    isTeacherOrAdmin
  }));

  return {
    app,
    liveGamesCollection,
    liveGameAssignmentsCollection,
    liveGameAttemptsCollection
  };
}

describe('live game self-paced assignments API smoke', () => {
  const teacherId = new ObjectId().toHexString();
  const gameId = new ObjectId();
  const classId = new ObjectId();
  const studentOne = '2024-00123';
  const studentTwo = '2024-00456';

  const teacherSession = {
    userId: teacherId,
    role: 'teacher',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  const gameDoc = {
    _id: gameId,
    title: 'Self-Paced ClassRush',
    description: 'Game for self-paced testing',
    ownerUserId: teacherId,
    linkedClass: {
      classId: classId.toHexString(),
      classCode: 'C000777',
      className: 'Advanced Algebra'
    },
    questions: [
      {
        id: 'q1',
        title: '2 + 2 = ?',
        type: 'multiple_choice',
        options: [
          { id: 'a', text: '4', isCorrect: true },
          { id: 'b', text: '5', isCorrect: false }
        ],
        timeLimitSeconds: 20
      }
    ],
    settings: { randomizeQuestionOrder: false, randomizeAnswerOrder: false },
    questionCount: 1
  };

  const classDoc = {
    _id: classId,
    classCode: 'C000777',
    className: 'Advanced Algebra',
    courseCode: 'MATH301',
    status: 'active',
    instructorId: new ObjectId(teacherId),
    teachingTeam: [],
    students: [studentOne, studentTwo]
  };

  const userDocs = [
    { _id: new ObjectId(), studentIDNumber: studentOne, firstName: 'Alice', lastName: 'Santos' },
    { _id: new ObjectId(), studentIDNumber: studentTwo, firstName: 'Brian', lastName: 'Lopez' }
  ];

  test('GET /api/live-games/:gameId/assignment-targets returns accessible classes and roster', async () => {
    const { app } = buildApp({
      sessionData: teacherSession,
      gameDocs: [gameDoc],
      classDocs: [classDoc],
      userDocs
    });

    const response = await request(app).get(`/api/live-games/${gameId.toHexString()}/assignment-targets?classId=${classId.toHexString()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.classes).toHaveLength(1);
    expect(response.body.selectedClass.classCode).toBe('C000777');
    expect(response.body.roster).toHaveLength(2);
    expect(response.body.roster[0].studentIDNumber).toBe(studentOne);
  });

  test('PUT /api/live-games/:gameId/assignments upserts selected-student assignments', async () => {
    const { app, liveGameAssignmentsCollection } = buildApp({
      sessionData: teacherSession,
      gameDocs: [gameDoc],
      classDocs: [classDoc],
      userDocs
    });

    const response = await request(app)
      .put(`/api/live-games/${gameId.toHexString()}/assignments`)
      .send({
        classId: classId.toHexString(),
        assignmentMode: 'selected_students',
        assignedStudents: [studentOne],
        startDate: '2026-03-30T08:00:00.000Z',
        dueDate: '2026-04-02T08:00:00.000Z',
        duePolicy: 'allow_late_submission',
        scoringProfile: 'timed_accuracy'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.assignment.assignmentMode).toBe('selected_students');

    const stored = await liveGameAssignmentsCollection.findOne({
      gameId: gameId.toHexString(),
      classId: classId.toHexString()
    });
    expect(stored.assignedStudents).toEqual([studentOne]);
    expect(stored.scoringProfile).toBe('timed_accuracy');
  });

  test('PUT /api/live-games/:gameId/assignments defaults omitted scoringProfile to timed_accuracy', async () => {
    const { app, liveGameAssignmentsCollection } = buildApp({
      sessionData: teacherSession,
      gameDocs: [gameDoc],
      classDocs: [classDoc],
      userDocs
    });

    const response = await request(app)
      .put(`/api/live-games/${gameId.toHexString()}/assignments`)
      .send({
        classId: classId.toHexString(),
        assignmentMode: 'whole_class',
        duePolicy: 'lock_after_due'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.assignment.scoringProfile).toBe('timed_accuracy');

    const stored = await liveGameAssignmentsCollection.findOne({
      gameId: gameId.toHexString(),
      classId: classId.toHexString()
    });
    expect(stored.scoringProfile).toBe('timed_accuracy');
  });

  test('PUT /api/live-games/:gameId/assignments rejects students outside the selected class', async () => {
    const { app } = buildApp({
      sessionData: teacherSession,
      gameDocs: [gameDoc],
      classDocs: [classDoc],
      userDocs
    });

    const response = await request(app)
      .put(`/api/live-games/${gameId.toHexString()}/assignments`)
      .send({
        classId: classId.toHexString(),
        assignmentMode: 'selected_students',
        assignedStudents: ['2024-99999']
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Selected students must belong');
  });

  test('GET /api/live-games/:gameId/assignments returns self-paced assignment summaries', async () => {
    const assignmentId = new ObjectId();
    const { app } = buildApp({
      sessionData: teacherSession,
      gameDocs: [gameDoc],
      assignmentDocs: [{
        _id: assignmentId,
        gameId: gameId.toHexString(),
        gameTitle: gameDoc.title,
        classId: classId.toHexString(),
        classCode: classDoc.classCode,
        className: classDoc.className,
        assignmentMode: 'whole_class',
        assignedStudents: [],
        startDate: new Date('2026-03-30T08:00:00.000Z'),
        dueDate: new Date('2026-04-02T08:00:00.000Z'),
        duePolicy: 'lock_after_due',
        scoringProfile: 'accuracy',
        updatedAt: new Date('2026-03-30T09:00:00.000Z')
      }],
      attemptDocs: [{
        _id: new ObjectId(),
        assignmentId: assignmentId.toHexString(),
        studentIDNumber: studentOne,
        studentName: 'Alice Santos',
        status: 'submitted',
        questions: gameDoc.questions,
        responses: [{ questionIndex: 0, answerId: 'a', correct: true, timeMs: 1500 }],
        score: 1,
        correctCount: 1,
        percent: 100,
        elapsedTimeMs: 1500,
        submittedAt: new Date('2026-03-30T09:30:00.000Z')
      }],
      classDocs: [classDoc],
      userDocs
    });

    const response = await request(app).get(`/api/live-games/${gameId.toHexString()}/assignments`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.assignments).toHaveLength(1);
    expect(response.body.assignments[0].submittedCount).toBe(1);
  });

  test('GET /api/live-games/:gameId/assignments/:assignmentId returns assignment analytics', async () => {
    const assignmentId = new ObjectId();
    const { app } = buildApp({
      sessionData: teacherSession,
      gameDocs: [gameDoc],
      assignmentDocs: [{
        _id: assignmentId,
        gameId: gameId.toHexString(),
        gameTitle: gameDoc.title,
        classId: classId.toHexString(),
        classCode: classDoc.classCode,
        className: classDoc.className,
        assignmentMode: 'whole_class',
        assignedStudents: [],
        startDate: new Date('2026-03-30T08:00:00.000Z'),
        dueDate: new Date('2026-04-02T08:00:00.000Z'),
        duePolicy: 'lock_after_due',
        scoringProfile: 'accuracy',
        updatedAt: new Date('2026-03-30T09:00:00.000Z')
      }],
      attemptDocs: [{
        _id: new ObjectId(),
        assignmentId: assignmentId.toHexString(),
        studentIDNumber: studentOne,
        studentName: 'Alice Santos',
        status: 'submitted',
        questions: gameDoc.questions,
        responses: [{ questionIndex: 0, answerId: 'a', correct: true, timeMs: 1500 }],
        score: 1,
        correctCount: 1,
        percent: 100,
        elapsedTimeMs: 1500,
        submittedAt: new Date('2026-03-30T09:30:00.000Z')
      }],
      classDocs: [classDoc],
      userDocs
    });

    const response = await request(app).get(`/api/live-games/${gameId.toHexString()}/assignments/${assignmentId.toHexString()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.report.summary.submittedCount).toBe(1);
    expect(response.body.report.studentResults).toHaveLength(2);
    expect(response.body.report.questionAnalytics[0].answerCount).toBe(1);
  });

  test('DELETE /api/live-games/:gameId/assignments/:assignmentId removes assignments and attempts', async () => {
    const assignmentId = new ObjectId();
    const { app, liveGameAssignmentsCollection, liveGameAttemptsCollection } = buildApp({
      sessionData: teacherSession,
      gameDocs: [gameDoc],
      assignmentDocs: [{
        _id: assignmentId,
        gameId: gameId.toHexString(),
        classId: classId.toHexString(),
        classCode: classDoc.classCode,
        className: classDoc.className
      }],
      attemptDocs: [{
        _id: new ObjectId(),
        assignmentId: assignmentId.toHexString(),
        studentIDNumber: studentOne,
        questions: gameDoc.questions,
        responses: []
      }],
      classDocs: [classDoc],
      userDocs
    });

    const response = await request(app).delete(`/api/live-games/${gameId.toHexString()}/assignments/${assignmentId.toHexString()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(await liveGameAssignmentsCollection.findOne({ _id: assignmentId })).toBeNull();
    expect(await liveGameAttemptsCollection.countDocuments({ assignmentId: toIdString(assignmentId) })).toBe(0);
  });
});
