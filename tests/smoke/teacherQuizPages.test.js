const path = require('path');
const express = require('express');
const request = require('supertest');

const createTeacherPagesRoutes = require('../../routes/teacherPagesRoutes');
const { isAuthenticated, isTeacherOrAdmin } = require('../../middleware/routeAuthGuards');

function buildTeacherPagesApp(sessionData = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use(createTeacherPagesRoutes({
    isAuthenticated,
    isTeacherOrAdmin
  }));
  return app;
}

describe('teacher quiz pages smoke', () => {
  const sessionData = {
    userId: '507f1f77bcf86cd799439011',
    role: 'teacher',
    studentIDNumber: '2024-00123',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('teacher quiz dashboard renders for an authenticated teacher', async () => {
    const app = buildTeacherPagesApp(sessionData);

    const response = await request(app).get('/teacher/quizzes');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Quiz Dashboard');
    expect(response.text).toContain('teacherQuizSearchInput');
    expect(response.text).toContain('Create New Quiz');
  });

  test('teacher quiz builder renders for an authenticated teacher', async () => {
    const app = buildTeacherPagesApp(sessionData);

    const response = await request(app).get('/teacher/quizzes/new');

    expect(response.status).toBe(200);
    expect(response.text).toContain('HelloUniversity Quiz Builder');
    expect(response.text).toContain('teacherQuizSaveDraftButton');
    expect(response.text).toContain('teacherQuizPublishButton');
    expect(response.text).toContain('teacherQuizQuestionsTab');
    expect(response.text).toContain('teacherQuizSettingsTab');
    expect(response.text).toContain('teacherQuizQuestionNav');
    expect(response.text).toContain('teacherQuizFloatingAddRail');
    expect(response.text).toContain('teacherQuizPreviewLink');
    expect(response.text).toContain('data-builder-add-section');
  });

  test('teacher quiz edit builder renders with preview link for an authenticated teacher', async () => {
    const app = buildTeacherPagesApp(sessionData);

    const response = await request(app).get('/teacher/quizzes/507f1f77bcf86cd799439099/edit');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Refine your quiz');
    expect(response.text).toContain('teacherQuizQuestionsPanel');
    expect(response.text).toContain('teacherQuizSettingsPanel');
    expect(response.text).toContain('/teacher/quizzes/507f1f77bcf86cd799439099/preview');
  });

  test('teacher quiz pages redirect unauthenticated users to login', async () => {
    const app = buildTeacherPagesApp({});

    const listResponse = await request(app).get('/teacher/quizzes');
    const builderResponse = await request(app).get('/teacher/quizzes/new');

    expect(listResponse.status).toBe(302);
    expect(listResponse.headers.location).toBe('/login');
    expect(builderResponse.status).toBe(302);
    expect(builderResponse.headers.location).toBe('/login');
  });

  test('teacher quiz preview page renders for an authenticated teacher', async () => {
    const app = buildTeacherPagesApp(sessionData);

    const response = await request(app).get('/teacher/quizzes/507f1f77bcf86cd799439099/preview');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Quiz Preview');
    expect(response.text).toContain('teacherQuizPreviewQuestions');
  });
});
