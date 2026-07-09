const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createDsaQuickCheckRoutes = require('../../routes/dsaQuickCheckRoutes');
const createTeacherClassDsaQuickChecksApiRoutes = require('../../routes/teacherClassDsaQuickChecksApiRoutes');
const { getDsaLessonBySlug } = require('../../app/dsaContent');
const { buildDsaQuickCheckQuestionBank } = require('../../app/dsaQuickCheckQuestionBank');
const { isAuthenticated, isTeacherOrAdmin } = require('../../middleware/routeAuthGuards');
const { createCollection } = require('../helpers/inMemoryMongo');

const teacherId = new ObjectId('507f1f77bcf86cd799439011');
const otherTeacherId = new ObjectId('507f1f77bcf86cd799439012');
const classId = new ObjectId('507f1f77bcf86cd799439099');

function buildApp({ sessionData = {}, classDocs = [], responseDocs = [], questionDocs = [], assignmentDocs = [], integrityEventDocs = [] } = {}) {
  const app = express();
  const classesCollection = createCollection(classDocs);
  const dsaQuickCheckResponsesCollection = createCollection(responseDocs);
  const dsaQuickCheckQuestionsCollection = createCollection(questionDocs);
  const dsaQuickCheckAssignmentsCollection = createCollection(assignmentDocs);
  const dsaQuickCheckIntegrityEventsCollection = createCollection(integrityEventDocs);

  app.use((req, _res, next) => {
    req.session = { ...sessionData };
    next();
  });
  app.use('/api/dsa', createDsaQuickCheckRoutes({
    getDsaQuickCheckResponsesCollection: () => dsaQuickCheckResponsesCollection,
    getDsaQuickCheckQuestionsCollection: () => dsaQuickCheckQuestionsCollection,
    getDsaQuickCheckAssignmentsCollection: () => dsaQuickCheckAssignmentsCollection,
    getDsaQuickCheckIntegrityEventsCollection: () => dsaQuickCheckIntegrityEventsCollection,
    isAuthenticated
  }));
  app.use('/api/teacher/classes', createTeacherClassDsaQuickChecksApiRoutes({
    getClassesCollection: () => classesCollection,
    getDsaQuickCheckResponsesCollection: () => dsaQuickCheckResponsesCollection,
    getDsaQuickCheckIntegrityEventsCollection: () => dsaQuickCheckIntegrityEventsCollection,
    ObjectId,
    isAuthenticated,
    isTeacherOrAdmin
  }));

  return {
    app,
    collections: {
      classesCollection,
      dsaQuickCheckResponsesCollection,
      dsaQuickCheckQuestionsCollection,
      dsaQuickCheckAssignmentsCollection,
      dsaQuickCheckIntegrityEventsCollection
    }
  };
}

function makeClassDoc(overrides = {}) {
  return {
    _id: classId,
    className: 'DSA 101',
    classCode: 'DSA101',
    instructorId: teacherId,
    dsaCourseEnabled: true,
    students: ['2026-00001'],
    teachingTeam: [],
    ...overrides
  };
}

describe('DSA Quick Check APIs', () => {
  const bankQuestions = buildDsaQuickCheckQuestionBank();
  const stackQuestions = bankQuestions.filter((question) => question.lessonSlug === 'stacks');

  test('content loader exposes questions and strips formative sections from public HTML', () => {
    const lesson = getDsaLessonBySlug('stacks');

    expect(lesson.quickCheck.questions.length).toBeGreaterThan(0);
    expect(lesson.quickCheck.answerKey.length).toBeGreaterThan(0);
    expect(lesson.quickCheck.questions[0].type).toBe('multiple_choice');
    expect(lesson.quickCheck.questions[0].options).toHaveLength(4);
    expect(lesson.quickCheck.questions[0].options.some((option) => option.isCorrect)).toBe(true);
    expect(lesson.contentHtml).not.toContain('<h2>Quick Check</h2>');
    expect(lesson.contentHtml).not.toContain('<h2>Answer Key</h2>');
  });

  test('seeded question bank provides 20 multiple-choice questions per lesson', () => {
    expect(bankQuestions).toHaveLength(600);
    expect(stackQuestions).toHaveLength(20);
    expect(stackQuestions.every((question) => question.options.length === 4)).toBe(true);
    expect(stackQuestions.every((question) => question.options.filter((option) => option.isCorrect).length === 1)).toBe(true);
    const grouped = new Map();
    bankQuestions.forEach((question) => {
      if (!grouped.has(question.lessonSlug)) grouped.set(question.lessonSlug, []);
      grouped.get(question.lessonSlug).push(question);
    });
    const genericQuestionPattern = /Which habit best supports|Which course section includes|How should VisualDSA support|What should a learner do|strong answer|main focus of the .* lesson|student trace first/i;
    grouped.forEach((questions, lessonSlug) => {
      expect(questions).toHaveLength(20);
      expect(questions.every((question) => question.source === 'dsa_curated_v1')).toBe(true);
      expect(questions.every((question, index) => question.questionId === `${lessonSlug}-q${String(index + 1).padStart(3, '0')}`)).toBe(true);
      expect(questions.every((question) => question.options.length === 4)).toBe(true);
      expect(questions.every((question) => question.options.filter((option) => option.isCorrect).length === 1)).toBe(true);
      expect(questions.some((question) => genericQuestionPattern.test(question.questionText))).toBe(false);
    });
  });

  test('student starts a locked attempt, submits scored answers, and reloads history without questions', async () => {
    const { app, collections } = buildApp({
      questionDocs: stackQuestions,
      sessionData: {
        userId: 'student-user-1',
        role: 'student',
        studentIDNumber: '2026-00001',
        firstName: 'Ada',
        lastName: 'Lovelace'
      }
    });

    const initial = await request(app).get('/api/dsa/lessons/stacks/quick-check');
    expect(initial.status).toBe(200);
    expect(initial.body.questions).toHaveLength(0);
    expect(initial.body.response).toBeNull();
    expect(initial.body.activeAttempt).toBeNull();
    expect(initial.body.summary.attemptCount).toBe(0);
    expect(initial.body.attemptPolicy.maxAttempts).toBe(3);
    expect(initial.body.attemptPolicy.remainingAttempts).toBe(3);
    expect(initial.body.attemptPolicy.canStart).toBe(true);
    expect(collections.dsaQuickCheckAssignmentsCollection._rows).toHaveLength(0);

    const started = await request(app).post('/api/dsa/lessons/stacks/quick-check/start').send({});
    expect(started.status).toBe(200);
    expect(started.body.mode).toBe('started');
    expect(started.body.questions).toHaveLength(5);
    expect(started.body.questions[0].type).toBe('multiple_choice');
    expect(started.body.questions[0].options).toHaveLength(4);
    expect(started.body.questions[0].options[0]).not.toHaveProperty('isCorrect');
    expect(started.body.assignment.timeLimitSeconds).toBe(300);
    expect(started.body.assignment.startedAt).toBeTruthy();
    expect(started.body.assignment.expiresAt).toBeTruthy();
    expect(started.body.assignment.serverTime).toBeTruthy();
    expect(started.body.attemptPolicy.maxAttempts).toBe(3);
    expect(started.body.attemptPolicy.cooldownSeconds).toBe(300);
    expect(started.body.integrity.watermarkText).toContain('Ada Lovelace');
    expect(started.body.integrity.watermarkText).toContain('2026-00001');
    expect(started.body.integrity).not.toHaveProperty('notice');
    expect(collections.dsaQuickCheckAssignmentsCollection._rows).toHaveLength(1);
    expect(collections.dsaQuickCheckAssignmentsCollection._rows[0].questionOrder).toEqual(
      started.body.questions.map((question) => question.questionId)
    );
    expect(collections.dsaQuickCheckAssignmentsCollection._rows[0].optionOrderByQuestionId[started.body.questions[0].questionId]).toEqual(
      started.body.questions[0].options.map((option) => option.optionId)
    );

    const refreshed = await request(app).get('/api/dsa/lessons/stacks/quick-check');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.questions).toHaveLength(0);
    expect(refreshed.body.activeAttempt.attemptNumber).toBe(1);

    const continued = await request(app).post('/api/dsa/lessons/stacks/quick-check/start').send({});
    expect(continued.status).toBe(200);
    expect(continued.body.mode).toBe('continue');
    expect(continued.body.questions.map((question) => question.questionId)).toEqual(
      started.body.questions.map((question) => question.questionId)
    );
    expect(continued.body.questions[0].options.map((option) => option.optionId)).toEqual(
      started.body.questions[0].options.map((option) => option.optionId)
    );

    const selectedAnswers = started.body.questions.map((question) => {
      const bankQuestion = stackQuestions.find((item) => item.questionId === question.questionId);
      const correctOption = bankQuestion.options.find((option) => option.isCorrect);
      return {
        questionId: question.id,
        selectedOptionId: correctOption.optionId
      };
    });
    const saved = await request(app)
      .put('/api/dsa/lessons/stacks/quick-check')
      .send({ answers: selectedAnswers });

    expect(saved.status).toBe(200);
    expect(saved.body.response.attemptCount).toBe(1);
    expect(saved.body.response.score).toBe(5);
    expect(saved.body.response.totalQuestions).toBe(5);
    expect(saved.body.response.scorePercent).toBe(100);
    expect(saved.body.response).not.toHaveProperty('answers');
    expect(saved.body.summary.attemptCount).toBe(1);
    expect(saved.body.history).toHaveLength(1);
    expect(saved.body.history[0]).not.toHaveProperty('answers');
    expect(saved.body.attemptPolicy.canStart).toBe(false);
    expect(saved.body.attemptPolicy.startBlockedReason).toBe('cooldown_active');
    expect(collections.dsaQuickCheckResponsesCollection._rows).toHaveLength(1);
    expect(collections.dsaQuickCheckResponsesCollection._rows[0].submittedAfterTimeLimit).toBe(false);
    expect(collections.dsaQuickCheckResponsesCollection._rows[0].timeLimitSeconds).toBe(300);
    expect(collections.dsaQuickCheckResponsesCollection._rows[0].score).toBe(5);
    expect(collections.dsaQuickCheckAssignmentsCollection._rows[0].status).toBe('submitted');
    expect(collections.dsaQuickCheckAssignmentsCollection._rows[0].submittedAfterTimeLimit).toBe(false);

    const reloaded = await request(app).get('/api/dsa/lessons/stacks/quick-check');
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.questions).toHaveLength(0);
    expect(reloaded.body.activeAttempt).toBeNull();
    expect(reloaded.body.summary.attemptCount).toBe(1);
    expect(reloaded.body.response.scorePercent).toBe(100);

    const secondStarted = await request(app).post('/api/dsa/lessons/stacks/quick-check/start').send({});
    expect(secondStarted.status).toBe(409);
    expect(secondStarted.body.attemptPolicy.startBlockedReason).toBe('cooldown_active');
  });

  test('student can submit after the soft time limit and response is flagged', async () => {
    const expiredStartedAt = new Date('2026-07-01T00:00:00.000Z');
    const expiredExpiresAt = new Date('2026-07-01T00:05:00.000Z');
    const assignedQuestions = stackQuestions.slice(0, 5);
    const { app, collections } = buildApp({
      questionDocs: stackQuestions,
      assignmentDocs: [{
        lessonSlug: 'stacks',
        lessonTitle: 'Stacks',
        studentUserId: 'student-user-1',
        studentIDNumber: '2026-00001',
        studentName: 'Ada Lovelace',
        questionIds: assignedQuestions.map((question) => question.questionId),
        status: 'assigned',
        assignedAt: expiredStartedAt,
        startedAt: expiredStartedAt,
        expiresAt: expiredExpiresAt,
        timeLimitSeconds: 300,
        submittedAt: null,
        source: 'dsa_quick_check'
      }],
      sessionData: {
        userId: 'student-user-1',
        role: 'student',
        studentIDNumber: '2026-00001',
        firstName: 'Ada',
        lastName: 'Lovelace'
      }
    });

    const response = await request(app)
      .put('/api/dsa/lessons/stacks/quick-check')
      .send({
        answers: assignedQuestions.map((question) => ({
          questionId: question.questionId,
          selectedOptionId: question.options[0].optionId
        }))
      });

    expect(response.status).toBe(200);
    expect(response.body.response.submittedAfterTimeLimit).toBe(true);
    expect(collections.dsaQuickCheckResponsesCollection._rows[0].submittedAfterTimeLimit).toBe(true);
    expect(collections.dsaQuickCheckAssignmentsCollection._rows[0].submittedAfterTimeLimit).toBe(true);
  });

  test('student status reports unavailable bank without creating questions when fewer than 5 are active', async () => {
    const { app } = buildApp({
      questionDocs: stackQuestions.slice(0, 4),
      sessionData: {
        userId: 'student-user-1',
        role: 'student',
        studentIDNumber: '2026-00001'
      }
    });

    const response = await request(app).get('/api/dsa/lessons/stacks/quick-check');
    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(0);
    expect(response.body.questionBank.activeQuestionCount).toBe(4);
    expect(response.body.questionBank.requiredQuestionCount).toBe(5);
    expect(response.body.attemptPolicy.canStart).toBe(false);
    expect(response.body.attemptPolicy.startBlockedReason).toBe('question_bank_unavailable');

    const start = await request(app).post('/api/dsa/lessons/stacks/quick-check/start').send({});
    expect(start.status).toBe(409);
    expect(start.body.activeQuestionCount).toBe(4);
    expect(start.body.requiredQuestionCount).toBe(5);
    expect(start.body.attemptPolicy.startBlockedReason).toBe('question_bank_unavailable');
  });

  test('student cannot start a fourth submitted attempt', async () => {
    const responseDocs = [1, 2, 3].map((attemptNumber) => ({
      attemptId: `attempt-${attemptNumber}`,
      lessonSlug: 'stacks',
      lessonTitle: 'Stacks',
      studentIDNumber: '2026-00001',
      studentName: 'Ada Lovelace',
      answers: [],
      source: 'dsa_quick_check',
      score: attemptNumber,
      totalQuestions: 5,
      scorePercent: attemptNumber * 20,
      submittedAt: new Date(`2026-07-0${attemptNumber}T00:00:00.000Z`),
      updatedAt: new Date(`2026-07-0${attemptNumber}T00:00:00.000Z`),
      attemptNumber
    }));
    const { app } = buildApp({
      questionDocs: stackQuestions,
      responseDocs,
      sessionData: {
        userId: 'student-user-1',
        role: 'student',
        studentIDNumber: '2026-00001',
        firstName: 'Ada',
        lastName: 'Lovelace'
      }
    });

    const status = await request(app).get('/api/dsa/lessons/stacks/quick-check');
    expect(status.status).toBe(200);
    expect(status.body.attemptPolicy.remainingAttempts).toBe(0);
    expect(status.body.attemptPolicy.startBlockedReason).toBe('max_attempts_reached');

    const start = await request(app).post('/api/dsa/lessons/stacks/quick-check/start').send({});
    expect(start.status).toBe(409);
    expect(start.body.attemptPolicy.startBlockedReason).toBe('max_attempts_reached');
  });

  test('student can start another attempt after cooldown has expired', async () => {
    const { app } = buildApp({
      questionDocs: stackQuestions,
      responseDocs: [{
        attemptId: 'attempt-1',
        lessonSlug: 'stacks',
        lessonTitle: 'Stacks',
        studentIDNumber: '2026-00001',
        studentName: 'Ada Lovelace',
        answers: [],
        source: 'dsa_quick_check',
        score: 3,
        totalQuestions: 5,
        scorePercent: 60,
        submittedAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        attemptNumber: 1
      }],
      sessionData: {
        userId: 'student-user-1',
        role: 'student',
        studentIDNumber: '2026-00001',
        firstName: 'Ada',
        lastName: 'Lovelace'
      }
    });

    const status = await request(app).get('/api/dsa/lessons/stacks/quick-check');
    expect(status.status).toBe(200);
    expect(status.body.attemptPolicy.canStart).toBe(true);
    expect(status.body.attemptPolicy.remainingAttempts).toBe(2);

    const start = await request(app).post('/api/dsa/lessons/stacks/quick-check/start').send({});
    expect(start.status).toBe(200);
    expect(start.body.assignment.attemptNumber).toBe(2);
  });

  test('student integrity events are logged and converted into submission risk flags', async () => {
    const { app, collections } = buildApp({
      questionDocs: stackQuestions,
      sessionData: {
        userId: 'student-user-1',
        role: 'student',
        studentIDNumber: '2026-00001',
        firstName: 'Ada',
        lastName: 'Lovelace'
      }
    });

    const started = await request(app).post('/api/dsa/lessons/stacks/quick-check/start').send({});
    expect(started.status).toBe(200);

    const logged = await request(app)
      .post('/api/dsa/lessons/stacks/quick-check/integrity-events')
      .send({
        events: [
          { eventType: 'copy_blocked', eventLabel: 'copy', clientTime: new Date().toISOString() },
          { eventType: 'context_menu_blocked', eventLabel: 'context', clientTime: new Date().toISOString() },
          { eventType: 'drag_start_blocked', eventLabel: 'drag', clientTime: new Date().toISOString() },
          { eventType: 'visibility_hidden', eventLabel: 'hidden', clientTime: new Date().toISOString() },
          { eventType: 'window_blur', eventLabel: 'blur', clientTime: new Date().toISOString() },
          { eventType: 'visibility_hidden', eventLabel: 'hidden again', clientTime: new Date().toISOString() }
        ]
      });
    expect(logged.status).toBe(200);
    expect(logged.body.storedCount).toBe(6);
    expect(collections.dsaQuickCheckIntegrityEventsCollection._rows).toHaveLength(6);

    const answers = started.body.questions.map((question) => ({
      questionId: question.questionId,
      selectedOptionId: question.options[0].optionId
    }));
    const saved = await request(app).put('/api/dsa/lessons/stacks/quick-check').send({ answers });
    expect(saved.status).toBe(200);
    const stored = collections.dsaQuickCheckResponsesCollection._rows[0];
    expect(stored.integritySummary.totalEvents).toBe(6);
    expect(stored.riskFlags.map((flag) => flag.type)).toEqual(expect.arrayContaining([
      'very_fast_completion',
      'frequent_window_inactive',
      'high_copy_activity'
    ]));
  });

  test('non-student roles cannot submit student responses', async () => {
    const { app } = buildApp({
      questionDocs: stackQuestions,
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: 'T-1' }
    });

    const response = await request(app)
      .put('/api/dsa/lessons/stacks/quick-check')
      .send({ answers: [{ questionId: 'q1', selectedOptionId: 'option1' }] });

    expect(response.status).toBe(403);
  });

  test('teacher cannot view reports until the class is DSA enabled', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher' },
      classDocs: [makeClassDoc({ dsaCourseEnabled: false })]
    });

    const response = await request(app).get(`/api/teacher/classes/${classId.toHexString()}/dsa/quick-checks`);
    expect(response.status).toBe(403);
  });

  test('teacher report counts and detail include only enrolled students', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher' },
      classDocs: [makeClassDoc({ students: ['2026-00001', '2026-00002', '2026-00004'] })],
      responseDocs: [
        {
          attemptId: 'attempt-1',
          lessonSlug: 'stacks',
          lessonTitle: 'Stacks',
          studentIDNumber: '2026-00001',
          studentName: 'Ada Lovelace',
          answers: [{
            questionId: 'q1',
            questionText: 'What is LIFO?',
            selectedOptionId: 'option1',
            selectedOptionText: 'Last in, first out.',
            answerText: 'Last in, first out.',
            isCorrect: true
          }],
          source: 'dsa_quick_check',
          score: 1,
          totalQuestions: 5,
          scorePercent: 20,
          submittedAfterTimeLimit: true,
          submittedAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-02T00:00:00.000Z'),
          attemptNumber: 1,
          attemptCount: 1
        },
        {
          attemptId: 'attempt-2',
          lessonSlug: 'stacks',
          lessonTitle: 'Stacks',
          studentIDNumber: '2026-00001',
          studentName: 'Ada Lovelace',
          answers: [{
            questionId: 'q2',
            questionText: 'Where does push add an item?',
            selectedOptionId: 'option1',
            selectedOptionText: 'Top of the stack.',
            answerText: 'Top of the stack.',
            isCorrect: true
          }],
          source: 'dsa_quick_check',
          score: 5,
          totalQuestions: 5,
          scorePercent: 100,
          submittedAfterTimeLimit: false,
          completionSeconds: 24,
          integritySummary: {
            copyBlockedCount: 1,
            contextMenuBlockedCount: 1,
            selectStartBlockedCount: 1,
            dragStartBlockedCount: 0,
            visibilityHiddenCount: 2,
            windowBlurCount: 1,
            inactiveSeconds: 12,
            totalEvents: 5
          },
          riskFlags: [{
            type: 'very_fast_completion',
            severity: 'medium',
            message: 'Submitted all answers in 24 seconds.'
          }],
          submittedAt: new Date('2026-07-03T00:00:00.000Z'),
          updatedAt: new Date('2026-07-03T00:00:00.000Z'),
          attemptNumber: 2,
          attemptCount: 2
        },
        {
          attemptId: 'attempt-3',
          lessonSlug: 'stacks',
          lessonTitle: 'Stacks',
          studentIDNumber: '2026-00002',
          studentName: 'Alan Turing',
          answers: [{
            questionId: 'q2',
            questionText: 'Where does push add an item?',
            selectedOptionId: 'option1',
            selectedOptionText: 'Top of the stack.',
            answerText: 'Top of the stack.',
            isCorrect: true
          }],
          source: 'dsa_quick_check',
          score: 5,
          totalQuestions: 5,
          scorePercent: 100,
          submittedAfterTimeLimit: false,
          completionSeconds: 44,
          submittedAt: new Date('2026-07-03T00:05:00.000Z'),
          updatedAt: new Date('2026-07-03T00:05:00.000Z'),
          attemptNumber: 1,
          attemptCount: 1
        },
        {
          attemptId: 'outside-attempt-1',
          lessonSlug: 'stacks',
          lessonTitle: 'Stacks',
          studentIDNumber: '2026-99999',
          studentName: 'Outside Student',
          answers: [{
            questionId: 'q1',
            questionText: 'What is LIFO?',
            selectedOptionId: 'option2',
            selectedOptionText: 'Hidden.',
            answerText: 'Hidden.',
            isCorrect: false
          }],
          source: 'dsa_quick_check',
          submittedAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-02T00:00:00.000Z'),
          attemptCount: 1
        }
      ]
    });

    const summary = await request(app).get(`/api/teacher/classes/${classId.toHexString()}/dsa/quick-checks`);
    expect(summary.status).toBe(200);
    const stacksSummary = summary.body.lessons.find((lesson) => lesson.slug === 'stacks');
    expect(stacksSummary.submittedCount).toBe(2);
    expect(stacksSummary.missingCount).toBe(1);
    expect(stacksSummary.signalCounts.studentsWithRiskFlags).toBe(1);
    expect(stacksSummary.signalCounts.veryFastSubmissions).toBe(1);

    const detail = await request(app).get(`/api/teacher/classes/${classId.toHexString()}/dsa/quick-checks/stacks`);
    expect(detail.status).toBe(200);
    expect(detail.body.responses).toHaveLength(2);
    const adaResponse = detail.body.responses.find((row) => row.studentIDNumber === '2026-00001');
    expect(adaResponse.attemptCount).toBe(2);
    expect(adaResponse.latestScore.scorePercent).toBe(100);
    expect(adaResponse.bestScore.scorePercent).toBe(100);
    expect(adaResponse.attempts).toHaveLength(2);
    expect(adaResponse.answers[0].selectedOptionText).toBe('Top of the stack.');
    expect(adaResponse.answers[0].isCorrect).toBe(true);
    expect(adaResponse.submittedAfterTimeLimit).toBe(false);
    expect(adaResponse.completionSeconds).toBe(24);
    expect(adaResponse.integritySummary.totalEvents).toBe(5);
    expect(adaResponse.riskFlags[0].type).toBe('very_fast_completion');
    expect(adaResponse.similarityFlags.map((flag) => flag.type)).toContain('same_answer_pattern');
  });

  test('responses submitted before class enrollment become visible after enrollment', async () => {
    const responseDoc = {
      lessonSlug: 'stacks',
      lessonTitle: 'Stacks',
      studentIDNumber: '2026-00003',
      studentName: 'Grace Hopper',
      answers: [{
        questionId: 'q1',
        questionText: 'What is LIFO?',
        selectedOptionId: 'option1',
        selectedOptionText: 'The newest item leaves first.',
        answerText: 'The newest item leaves first.',
        isCorrect: true
      }],
      source: 'dsa_quick_check',
      submittedAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-02T00:00:00.000Z'),
      attemptCount: 1
    };
    const before = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher' },
      classDocs: [makeClassDoc({ students: [] })],
      responseDocs: [responseDoc]
    });
    const after = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher' },
      classDocs: [makeClassDoc({ students: ['2026-00003'] })],
      responseDocs: [responseDoc]
    });

    const hidden = await request(before.app).get(`/api/teacher/classes/${classId.toHexString()}/dsa/quick-checks/stacks`);
    expect(hidden.status).toBe(200);
    expect(hidden.body.responses).toHaveLength(0);

    const visible = await request(after.app).get(`/api/teacher/classes/${classId.toHexString()}/dsa/quick-checks/stacks`);
    expect(visible.status).toBe(200);
    expect(visible.body.responses).toHaveLength(1);
    expect(visible.body.responses[0].studentIDNumber).toBe('2026-00003');
  });

  test('teacher cannot view another teacher class reports', async () => {
    const { app } = buildApp({
      sessionData: { userId: otherTeacherId.toHexString(), role: 'teacher' },
      classDocs: [makeClassDoc()]
    });

    const response = await request(app).get(`/api/teacher/classes/${classId.toHexString()}/dsa/quick-checks`);
    expect(response.status).toBe(404);
  });
});
