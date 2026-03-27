const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createQuizBuilderApiRoutes = require('../../routes/quizBuilderApiRoutes');
const { isAuthenticated, isTeacherOrAdmin } = require('../../middleware/routeAuthGuards');
const { createCollection, toIdString } = require('../helpers/inMemoryMongo');

function buildBuilderApiApp({
  sessionData,
  quizDocs = [],
  attemptDocs = [],
  classQuizDocs = [],
  classDocs = [],
  logDocs = [],
  userDocs = []
}) {
  const quizzesCollection = createCollection(quizDocs);
  const attemptsCollection = createCollection(attemptDocs);
  const classQuizCollection = createCollection(classQuizDocs);
  const classesCollection = createCollection(classDocs);
  const logsCollection = createCollection(logDocs);
  const usersCollection = createCollection(userDocs);

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use('/api/quiz-builder', createQuizBuilderApiRoutes({
    getQuizzesCollection: () => quizzesCollection,
    getAttemptsCollection: () => attemptsCollection,
    getLogsCollection: () => logsCollection,
    getClassQuizCollection: () => classQuizCollection,
    getClassesCollection: () => classesCollection,
    getUsersCollection: () => usersCollection,
    ObjectId,
    isAuthenticated,
    isTeacherOrAdmin
  }));

  return {
    app,
    quizzesCollection,
    attemptsCollection,
    classQuizCollection,
    classesCollection,
    logsCollection,
    usersCollection
  };
}

describe('teacher quiz builder api smoke', () => {
  const teacherId = new ObjectId('507f1f77bcf86cd799439011');
  const otherTeacherId = new ObjectId('507f1f77bcf86cd799439012');
  const classId = new ObjectId('507f1f77bcf86cd799439013');

  const sessionData = {
    userId: teacherId.toHexString(),
    role: 'teacher',
    studentIDNumber: '2024-00123',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('rejects saving a quiz without questions', async () => {
    const { app } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Empty Quiz',
        questions: [],
        settings: {}
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Add at least one question before saving.');
  });

  test('preserves correctAnswers for short answer and paragraph questions on create', async () => {
    const { app, quizzesCollection } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Programming Reflection',
        status: 'published',
        questions: [
          {
            id: 'q-1',
            type: 'short_answer',
            title: 'Who created Python?',
            correctAnswers: ['Guido van Rossum'],
            points: 2
          },
          {
            id: 'q-2',
            type: 'paragraph',
            title: 'What is being tested?',
            correctAnswers: ['Quiz runtime'],
            points: 3
          }
        ],
        settings: {}
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const savedQuiz = quizzesCollection._rows[0];
    expect(savedQuiz.status).toBe('draft');
    expect(savedQuiz.sections).toHaveLength(1);
    expect(savedQuiz.questions[0].correctAnswers).toEqual(['Guido van Rossum']);
    expect(savedQuiz.questions[1].correctAnswers).toEqual(['Quiz runtime']);
  });

  test('allows short answer and paragraph questions to save without accepted answers', async () => {
    const { app, quizzesCollection } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Manual Review Quiz',
        questions: [
          {
            id: 'q-1',
            type: 'short_answer',
            title: 'Explain your solution',
            correctAnswers: [''],
            points: 2
          },
          {
            id: 'q-2',
            type: 'paragraph',
            title: 'Write a reflection',
            correctAnswers: [],
            points: 3
          }
        ],
        settings: {}
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const savedQuiz = quizzesCollection._rows[0];
    expect(savedQuiz.questions[0].correctAnswers).toEqual([]);
    expect(savedQuiz.questions[1].correctAnswers).toEqual([]);
  });

  test('persists short answer response validation on create and reload', async () => {
    const { app, quizzesCollection } = buildBuilderApiApp({ sessionData });

    const createResponse = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Validated Short Answer Quiz',
        questions: [
          {
            id: 'q-1',
            type: 'short_answer',
            title: 'Enter your student email',
            correctAnswers: ['student@example.edu'],
            responseValidation: {
              category: 'text',
              operator: 'email',
              customErrorText: 'Use your school email.'
            },
            points: 2
          }
        ],
        settings: {}
      });

    expect(createResponse.status).toBe(201);
    expect(quizzesCollection._rows[0].questions[0].responseValidation).toEqual({
      category: 'text',
      operator: 'email',
      value: '',
      secondaryValue: '',
      customErrorText: 'Use your school email.'
    });

    const detailResponse = await request(app).get(`/api/quiz-builder/quizzes/${createResponse.body.quizId}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.quiz.questions[0].responseValidation).toEqual({
      category: 'text',
      operator: 'email',
      value: '',
      secondaryValue: '',
      customErrorText: 'Use your school email.'
    });
  });

  test('creates quiz sections and preserves per-question section ownership', async () => {
    const { app, quizzesCollection } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Sectioned Quiz',
        sections: [
          { id: 'section-a', title: 'Warm Up', description: 'Basics first', order: 0 },
          { id: 'section-b', title: 'Deep Dive', description: 'More difficult prompts', order: 1 }
        ],
        questions: [
          {
            id: 'q-1',
            sectionId: 'section-a',
            order: 0,
            type: 'multiple_choice',
            title: 'What is HTML?',
            options: ['Markup', 'Database'],
            correctAnswers: ['Markup'],
            points: 1
          },
          {
            id: 'q-2',
            sectionId: 'section-b',
            order: 0,
            type: 'short_answer',
            title: 'What does CSS stand for?',
            correctAnswers: ['Cascading Style Sheets'],
            points: 2
          }
        ],
        settings: {}
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(quizzesCollection._rows[0].sections.map((section) => section.id)).toEqual(['section-a', 'section-b']);
    expect(quizzesCollection._rows[0].questions.map((question) => question.sectionId)).toEqual(['section-a', 'section-b']);
  });

  test('persists multiple-choice answer routes on create and reload', async () => {
    const { app, quizzesCollection } = buildBuilderApiApp({ sessionData });

    const createResponse = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Routed Quiz',
        sections: [
          { id: 'section-a', title: 'Start', order: 0 },
          { id: 'section-b', title: 'Follow Up', order: 1 }
        ],
        questions: [
          {
            id: 'q-1',
            sectionId: 'section-a',
            type: 'multiple_choice',
            title: 'Choose a path',
            options: ['Go on', 'Branch'],
            correctAnswers: ['Go on'],
            goToSectionBasedOnAnswer: true,
            answerRoutes: [{ optionIndex: 1, sectionId: 'section-b' }]
          }
        ],
        settings: {}
      });

    expect(createResponse.status).toBe(201);
    expect(quizzesCollection._rows[0].questions[0].goToSectionBasedOnAnswer).toBe(true);
    expect(quizzesCollection._rows[0].questions[0].answerRoutes).toEqual([
      { optionIndex: 1, sectionId: 'section-b' }
    ]);

    const detailResponse = await request(app).get(`/api/quiz-builder/quizzes/${createResponse.body.quizId}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.quiz.questions[0].answerRoutes).toEqual([
      { optionIndex: 1, sectionId: 'section-b' }
    ]);
  });

  test('rejects multiple-choice answer routes that point to invalid sections', async () => {
    const { app } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Broken Routed Quiz',
        sections: [
          { id: 'section-a', title: 'Start', order: 0 },
          { id: 'section-b', title: 'Follow Up', order: 1 }
        ],
        questions: [
          {
            id: 'q-1',
            sectionId: 'section-a',
            type: 'multiple_choice',
            title: 'Choose a path',
            options: ['Go on', 'Branch'],
            correctAnswers: ['Go on'],
            goToSectionBasedOnAnswer: true,
            answerRoutes: [{ optionIndex: 1, sectionId: 'section-z' }]
          }
        ],
        settings: {}
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Question 1 has an invalid section route.');
  });

  test('rejects invalid objective question payloads', async () => {
    const { app } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Broken Objective Quiz',
        questions: [
          {
            id: 'q-1',
            type: 'multiple_choice',
            title: 'Pick one',
            options: ['Only option'],
            correctAnswers: ['Only option']
          }
        ],
        settings: {}
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Question 1 needs at least 2 options.');
  });

  test('accepts checkbox questions with one correct answer when the option set is valid', async () => {
    const { app, quizzesCollection } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Single Answer Checkbox Quiz',
        questions: [
          {
            id: 'q-1',
            type: 'checkbox',
            title: 'Select the testing tool used in this suite',
            options: ['Jest'],
            correctAnswers: ['Jest']
          }
        ],
        settings: {}
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(quizzesCollection._rows[0].questions[0].correctAnswers).toEqual(['Jest']);
  });

  test('rejects checkbox questions without a correct answer', async () => {
    const { app } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Broken Checkbox Quiz',
        questions: [
          {
            id: 'q-1',
            type: 'checkbox',
            title: 'Select all testing tools',
            options: ['Jest'],
            correctAnswers: []
          }
        ],
        settings: {}
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Question 1 needs at least 1 correct answer.');
  });

  test('rejects invalid short answer response validation during save', async () => {
    const { app } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Broken Validation Quiz',
        questions: [
          {
            id: 'q-1',
            type: 'short_answer',
            title: 'Enter an ID',
            correctAnswers: ['AB1234'],
            responseValidation: {
              category: 'number',
              operator: 'between',
              value: '10',
              secondaryValue: '2'
            }
          }
        ],
        settings: {}
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Question 1: The first range value cannot be greater than the second.');
  });

  test('rejects invalid custom regex validation when publishing', async () => {
    const quizId = new ObjectId('507f1f77bcf86cd799439016');
    const { app } = buildBuilderApiApp({
      sessionData,
      quizDocs: [
        {
          _id: quizId,
          title: 'Regex Validation Quiz',
          quizTitle: 'Regex Validation Quiz',
          ownerUserId: teacherId,
          status: 'draft',
          settings: {},
          questions: [
            {
              id: 'q-1',
              type: 'short_answer',
              title: 'Enter a code',
              correctAnswers: ['AB12'],
              responseValidation: {
                category: 'regex',
                operator: 'matches',
                value: '['
              },
              points: 1
            }
          ],
          questionCount: 1,
          totalPoints: 1
        }
      ]
    });

    const response = await request(app).post(`/api/quiz-builder/quizzes/${quizId.toHexString()}/publish`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Question 1: Enter a valid regular expression pattern.');
  });

  test('rejects questions that reference an invalid section', async () => {
    const { app } = buildBuilderApiApp({ sessionData });

    const response = await request(app)
      .post('/api/quiz-builder/quizzes')
      .send({
        title: 'Broken Sections',
        sections: [{ id: 'section-a', title: 'Only Section' }],
        questions: [
          {
            id: 'q-1',
            sectionId: 'missing-section',
            type: 'multiple_choice',
            title: 'Pick one',
            options: ['A', 'B'],
            correctAnswers: ['A']
          }
        ],
        settings: {}
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Question 1 belongs to an invalid section.');
  });

  test('normalizes a legacy flat quiz into a default section on load', async () => {
    const quizId = new ObjectId('507f1f77bcf86cd7994390aa');
    const { app } = buildBuilderApiApp({
      sessionData,
      quizDocs: [
        {
          _id: quizId,
          title: 'Legacy Quiz',
          quizTitle: 'Legacy Quiz',
          ownerUserId: teacherId,
          status: 'draft',
          settings: {},
          questions: [
            {
              id: 'q-1',
              type: 'multiple_choice',
              title: 'Legacy question',
              options: ['A', 'B'],
              correctAnswers: ['A'],
              points: 1
            }
          ]
        }
      ]
    });

    const response = await request(app).get(`/api/quiz-builder/quizzes/${quizId.toHexString()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.quiz.sections).toHaveLength(1);
    expect(response.body.quiz.sections[0].title).toBe('Section 1');
    expect(response.body.quiz.questions[0].sectionId).toBe(response.body.quiz.sections[0].id);
  });

  test('publishing a class-linked quiz upserts the class assignment and maps dates', async () => {
    const quizId = new ObjectId('507f1f77bcf86cd799439014');
    const startAt = new Date('2026-03-20T08:00:00.000Z');
    const endAt = new Date('2026-03-22T08:00:00.000Z');

    const { app, quizzesCollection, classQuizCollection } = buildBuilderApiApp({
      sessionData,
      quizDocs: [
        {
          _id: quizId,
          title: 'Functions Quiz',
          quizTitle: 'Functions Quiz',
          ownerUserId: teacherId,
          classId: classId.toHexString(),
          classLabel: 'IT 223 - BSIT 2A',
          status: 'draft',
          isActive: false,
          settings: {
            requireLogin: true,
            oneResponsePerStudent: true,
            startAt,
            endAt
          },
          questions: [
            {
              id: 'q-1',
              type: 'multiple_choice',
              title: 'A function returns a?',
              options: ['Value', 'Loop'],
              correctAnswers: ['Value'],
              points: 1
            }
          ],
          questionCount: 1,
          totalPoints: 1
        }
      ],
      classDocs: [
        {
          _id: classId,
          className: 'BSIT 2A',
          instructorId: teacherId,
          createdBy: teacherId,
          students: ['2024-00123'],
          teachingTeam: []
        }
      ]
    });

    const response = await request(app).post(`/api/quiz-builder/quizzes/${quizId.toHexString()}/publish`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updatedQuiz = quizzesCollection._rows[0];
    expect(updatedQuiz.status).toBe('published');
    expect(updatedQuiz.isActive).toBe(true);

    expect(classQuizCollection._rows).toHaveLength(1);
    expect(toIdString(classQuizCollection._rows[0].quizId)).toBe(quizId.toHexString());
    expect(toIdString(classQuizCollection._rows[0].classId)).toBe(classId.toHexString());
    expect(classQuizCollection._rows[0].assignedStudents).toEqual([]);
    expect(new Date(classQuizCollection._rows[0].startDate).toISOString()).toBe(startAt.toISOString());
    expect(new Date(classQuizCollection._rows[0].dueDate).toISOString()).toBe(endAt.toISOString());
  });

  test('loads linked class roster and current student-specific assignments for a quiz', async () => {
    const quizId = new ObjectId('507f1f77bcf86cd799439018');
    const { app } = buildBuilderApiApp({
      sessionData,
      quizDocs: [
        {
          _id: quizId,
          title: 'Roster Quiz',
          quizTitle: 'Roster Quiz',
          ownerUserId: teacherId,
          classId: classId.toHexString(),
          classLabel: 'IT 223 - BSIT 2A',
          status: 'draft',
          settings: {},
          questions: [
            {
              id: 'q-1',
              type: 'multiple_choice',
              title: 'Pick one',
              options: ['A', 'B'],
              correctAnswers: ['A']
            }
          ]
        }
      ],
      classDocs: [
        {
          _id: classId,
          className: 'BSIT 2A',
          instructorId: teacherId,
          students: ['2024-00123', '2024-00456'],
          teachingTeam: []
        }
      ],
      classQuizDocs: [
        {
          _id: new ObjectId('507f1f77bcf86cd799439019'),
          quizId,
          classId,
          assignedStudents: ['2024-00456']
        }
      ],
      userDocs: [
        { _id: new ObjectId('507f1f77bcf86cd799439111'), studentIDNumber: '2024-00123', firstName: 'Kayla', lastName: 'Ryhs', emaildb: 'kayla@example.edu' },
        { _id: new ObjectId('507f1f77bcf86cd799439112'), studentIDNumber: '2024-00456', firstName: 'Marco', lastName: 'Santos', emaildb: 'marco@example.edu' }
      ]
    });

    const response = await request(app).get(`/api/quiz-builder/quizzes/${quizId.toHexString()}/assignment-targets`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.assignment.assignmentMode).toBe('selected');
    expect(response.body.assignment.assignedStudents).toEqual(['2024-00456']);
    expect(response.body.assignment.students).toHaveLength(2);
    expect(response.body.assignment.students.find((student) => student.studentIDNumber === '2024-00456').assigned).toBe(true);
  });

  test('updates a quiz to target only selected students from the linked class', async () => {
    const quizId = new ObjectId('507f1f77bcf86cd799439020');
    const { app, classQuizCollection } = buildBuilderApiApp({
      sessionData,
      quizDocs: [
        {
          _id: quizId,
          title: 'Assignment Quiz',
          quizTitle: 'Assignment Quiz',
          ownerUserId: teacherId,
          classId: classId.toHexString(),
          classLabel: 'IT 223 - BSIT 2A',
          status: 'draft',
          settings: {},
          questions: [
            {
              id: 'q-1',
              type: 'multiple_choice',
              title: 'Pick one',
              options: ['A', 'B'],
              correctAnswers: ['A']
            }
          ]
        }
      ],
      classDocs: [
        {
          _id: classId,
          className: 'BSIT 2A',
          instructorId: teacherId,
          students: ['2024-00123', '2024-00456'],
          teachingTeam: []
        }
      ]
    });

    const response = await request(app)
      .put(`/api/quiz-builder/quizzes/${quizId.toHexString()}/assigned-students`)
      .send({ studentIDs: ['2024-00456'] });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.assignmentMode).toBe('selected');
    expect(classQuizCollection._rows).toHaveLength(1);
    expect(classQuizCollection._rows[0].assignedStudents).toEqual(['2024-00456']);
  });

  test('publishing preserves pre-selected assigned students for a class-linked quiz', async () => {
    const quizId = new ObjectId('507f1f77bcf86cd799439021');
    const { app, classQuizCollection } = buildBuilderApiApp({
      sessionData,
      quizDocs: [
        {
          _id: quizId,
          title: 'Selective Quiz',
          quizTitle: 'Selective Quiz',
          ownerUserId: teacherId,
          classId: classId.toHexString(),
          classLabel: 'IT 223 - BSIT 2A',
          status: 'draft',
          isActive: false,
          settings: {},
          questions: [
            {
              id: 'q-1',
              type: 'multiple_choice',
              title: 'Pick one',
              options: ['A', 'B'],
              correctAnswers: ['A']
            }
          ]
        }
      ],
      classDocs: [
        {
          _id: classId,
          className: 'BSIT 2A',
          instructorId: teacherId,
          students: ['2024-00123', '2024-00456'],
          teachingTeam: []
        }
      ],
      classQuizDocs: [
        {
          _id: new ObjectId('507f1f77bcf86cd799439022'),
          quizId,
          classId,
          assignedStudents: ['2024-00456']
        }
      ]
    });

    const response = await request(app).post(`/api/quiz-builder/quizzes/${quizId.toHexString()}/publish`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(classQuizCollection._rows[0].assignedStudents).toEqual(['2024-00456']);
  });

  test('publishing a quiz without a linked class succeeds and clears stale assignments', async () => {
    const quizId = new ObjectId('507f1f77bcf86cd799439016');

    const { app, quizzesCollection, classQuizCollection } = buildBuilderApiApp({
      sessionData,
      quizDocs: [
        {
          _id: quizId,
          title: 'Standalone Quiz',
          quizTitle: 'Standalone Quiz',
          ownerUserId: teacherId,
          classId: null,
          classLabel: null,
          status: 'draft',
          isActive: false,
          settings: {
            requireLogin: true,
            oneResponsePerStudent: true
          },
          questions: [
            {
              id: 'q-1',
              type: 'multiple_choice',
              title: 'A function returns a?',
              options: ['Value', 'Loop'],
              correctAnswers: ['Value'],
              points: 1
            }
          ],
          questionCount: 1,
          totalPoints: 1
        }
      ],
      classQuizDocs: [
        {
          _id: new ObjectId('507f1f77bcf86cd799439017'),
          quizId,
          classId,
          assignedStudents: ['2024-00123']
        }
      ]
    });

    const response = await request(app).post(`/api/quiz-builder/quizzes/${quizId.toHexString()}/publish`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updatedQuiz = quizzesCollection._rows[0];
    expect(updatedQuiz.status).toBe('published');
    expect(updatedQuiz.isActive).toBe(true);
    expect(classQuizCollection._rows).toHaveLength(0);
  });

  test('non-owner teacher cannot publish another teacher’s quiz', async () => {
    const quizId = new ObjectId('507f1f77bcf86cd799439015');
    const { app } = buildBuilderApiApp({
      sessionData,
      quizDocs: [
        {
          _id: quizId,
          title: 'Other Teacher Quiz',
          quizTitle: 'Other Teacher Quiz',
          ownerUserId: otherTeacherId,
          status: 'draft',
          settings: {},
          questions: [
            {
              id: 'q-1',
              type: 'multiple_choice',
              title: 'Question',
              options: ['A', 'B'],
              correctAnswers: ['A']
            }
          ]
        }
      ]
    });

    const response = await request(app).post(`/api/quiz-builder/quizzes/${quizId.toHexString()}/publish`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Quiz not found.');
  });
});
