const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createQuizManagementRoutes = require('../../routes/quizManagementRoutes');
const { isAuthenticated, isAdmin } = require('../../middleware/routeAuthGuards');
const { createCollection, toIdString } = require('../helpers/inMemoryMongo');

function buildQuizRuntimeApp({
  sessionData,
  quizDocs = [],
  attemptDocs = [],
  classQuizDocs = [],
  classDocs = []
}) {
  const quizzesCollection = createCollection(quizDocs);
  const attemptsCollection = createCollection(attemptDocs);
  const classQuizCollection = createCollection(classQuizDocs);
  const classesCollection = createCollection(classDocs);

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use('/api', createQuizManagementRoutes(
    {
      getQuizzesCollection: () => quizzesCollection,
      getAttemptsCollection: () => attemptsCollection,
      getClassQuizCollection: () => classQuizCollection,
      getClassesCollection: () => classesCollection,
      ObjectId
    },
    { isAuthenticated, isAdmin }
  ));

  return {
    app,
    quizzesCollection,
    attemptsCollection,
    classQuizCollection,
    classesCollection
  };
}

describe('quiz runtime api smoke', () => {
  const studentId = new ObjectId('507f1f77bcf86cd799439011');
  const otherStudentId = new ObjectId('507f1f77bcf86cd799439012');
  const classId = new ObjectId('507f1f77bcf86cd799439013');
  const quizId = new ObjectId('507f1f77bcf86cd799439014');

  const builderQuizDoc = {
    _id: quizId,
    title: 'Builder Quiz',
    quizTitle: 'Builder Quiz',
    description: 'Covers all supported question types.',
    classId: classId.toHexString(),
    classLabel: 'IT 223 - BSIT 2A',
    status: 'published',
    isActive: true,
    settings: {
      requireLogin: true,
      oneResponsePerStudent: true,
      randomizeQuestionOrder: true
    },
    sections: [
      { id: 'section-a', title: 'Warm Up', description: 'Start here', order: 0 },
      { id: 'section-b', title: 'Deep Dive', description: 'Finish strong', order: 1 }
    ],
    questions: [
      {
        id: 'q-1',
        sectionId: 'section-a',
        order: 0,
        type: 'multiple_choice',
        title: 'What does a function return?',
        options: ['Loop', 'Value'],
        correctAnswers: ['Value'],
        points: 2
      },
      {
        id: 'q-2',
        sectionId: 'section-a',
        order: 1,
        type: 'checkbox',
        title: 'Select testing tools.',
        options: ['Jest', 'MongoDB', 'Supertest'],
        correctAnswers: ['Jest', 'Supertest'],
        points: 2
      },
      {
        id: 'q-3',
        sectionId: 'section-b',
        order: 0,
        type: 'true_false',
        title: 'Unit tests can verify behavior.',
        options: ['True', 'False'],
        correctAnswers: ['True'],
        points: 1
      },
      {
        id: 'q-4',
        sectionId: 'section-b',
        order: 1,
        type: 'short_answer',
        title: 'Who created Python?',
        correctAnswers: ['Guido van Rossum'],
        points: 3
      },
      {
        id: 'q-5',
        sectionId: 'section-b',
        order: 2,
        type: 'paragraph',
        title: 'What is this feature hardening?',
        correctAnswers: ['Quiz runtime'],
        points: 4
      }
    ],
    totalPoints: 12,
    questionCount: 5
  };

  const assignedClassDoc = {
    _id: classId,
    className: 'BSIT 2A',
    students: ['2024-00123']
  };

  const assignmentDoc = {
    _id: new ObjectId('507f1f77bcf86cd799439015'),
    quizId,
    classId,
    assignedStudents: [],
    startDate: null,
    dueDate: null
  };

  const studentSession = {
    userId: studentId.toHexString(),
    role: 'student',
    studentIDNumber: '2024-00123',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('returns a normalized student-safe quiz view for builder-created quizzes', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { app } = buildQuizRuntimeApp({
      sessionData: studentSession,
      quizDocs: [builderQuizDoc],
      classQuizDocs: [assignmentDoc],
      classDocs: [assignedClassDoc]
    });

    const response = await request(app).get(`/api/quizzes/${quizId.toHexString()}`);
    randomSpy.mockRestore();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.quiz.title).toBe('Builder Quiz');
    expect(response.body.quiz.questions).toHaveLength(5);
    expect(response.body.quiz.sections).toHaveLength(2);
    expect(response.body.quiz.sections[0].title).toBe('Warm Up');
    expect(response.body.quiz.sections[0].questions.map((question) => question.id)).toEqual(['q-2', 'q-1']);
    expect(response.body.quiz.sections[1].questions.map((question) => question.id)).toEqual(['q-4', 'q-5', 'q-3']);
    expect(response.body.quiz.questions[0].id).toBe('q-2');
    expect(response.body.quiz.questions[0].allowMultiple).toBe(true);
    expect(response.body.quiz.questions[2].type).toBe('short_answer');
    expect(response.body.quiz.questions[0].correctAnswers).toBeUndefined();
  });

  test('creates an in-progress attempt when an assigned student starts a quiz', async () => {
    const { app, attemptsCollection } = buildQuizRuntimeApp({
      sessionData: studentSession,
      quizDocs: [builderQuizDoc],
      classQuizDocs: [assignmentDoc],
      classDocs: [assignedClassDoc]
    });

    const response = await request(app).post(`/api/quizzes/${quizId.toHexString()}/start`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.attemptId).toBeTruthy();
    expect(attemptsCollection._rows).toHaveLength(1);
    expect(attemptsCollection._rows[0].status).toBe('in_progress');
    expect(toIdString(attemptsCollection._rows[0].quizId)).toBe(quizId.toHexString());
  });

  test('scores a builder-created quiz across all supported question types', async () => {
    const { app, attemptsCollection } = buildQuizRuntimeApp({
      sessionData: studentSession,
      quizDocs: [builderQuizDoc],
      classQuizDocs: [assignmentDoc],
      classDocs: [assignedClassDoc]
    });

    const startResponse = await request(app).post(`/api/quizzes/${quizId.toHexString()}/start`);
    const attemptId = startResponse.body.attemptId;

    const submitResponse = await request(app)
      .post(`/api/quizzes/${quizId.toHexString()}/attempts/${attemptId}/submit`)
      .send({
        answers: [
          { questionId: 'q-1', choiceIndex: 1 },
          { questionId: 'q-2', choiceIndexes: [0, 2] },
          { questionId: 'q-3', choiceIndex: 0 },
          { questionId: 'q-4', text: 'Guido van Rossum' },
          { questionId: 'q-5', text: 'Quiz runtime' }
        ]
      });

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.success).toBe(true);
    expect(submitResponse.body.rawScore).toBe(12);
    expect(submitResponse.body.finalScore).toBe(12);
    expect(submitResponse.body.totalQuizPoints).toBe(12);

    expect(attemptsCollection._rows).toHaveLength(1);
    expect(attemptsCollection._rows[0].isCompleted).toBe(true);
    expect(attemptsCollection._rows[0].status).toBe('submitted');
    expect(attemptsCollection._rows[0].answers).toHaveLength(5);
    expect(attemptsCollection._rows[0].answers[1].choiceIndexes).toEqual([0, 2]);
  });

  test('rejects quiz access for students who are not assigned', async () => {
    const { app } = buildQuizRuntimeApp({
      sessionData: {
        userId: otherStudentId.toHexString(),
        role: 'student',
        studentIDNumber: '2024-00999'
      },
      quizDocs: [builderQuizDoc],
      classQuizDocs: [assignmentDoc],
      classDocs: [assignedClassDoc]
    });

    const response = await request(app).post(`/api/quizzes/${quizId.toHexString()}/start`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('You are not assigned this quiz.');
  });
});
