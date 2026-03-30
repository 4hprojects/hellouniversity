const path = require('path');
const express = require('express');
const request = require('supertest');

const createTeacherPagesRoutes = require('../../routes/teacherPagesRoutes');
const { isAuthenticated, isTeacherOrAdminOrPending } = require('../../middleware/routeAuthGuards');

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
    isTeacherOrAdminOrPending
  }));
  return app;
}

describe('teacher dashboard page smoke', () => {
  const teacherSession = {
    userId: '507f1f77bcf86cd799439011',
    role: 'teacher',
    studentIDNumber: '2024-00123',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('teacher dashboard renders only supported sections', async () => {
    const app = buildTeacherPagesApp(teacherSession);

    const response = await request(app).get('/teacher/dashboard');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Teacher Dashboard | HelloUniversity');
    expect(response.text).toContain('Teacher Menu');
    expect(response.text).toContain('Your Classes');
    expect(response.text).toContain('Recent Quizzes');
    expect(response.text).not.toContain('Manual grading queue scaffold');
    expect(response.text).not.toContain('Lesson Workspace');
  });

  test('teacher lessons route redirects to the dashboard', async () => {
    const app = buildTeacherPagesApp(teacherSession);

    const response = await request(app).get('/teacher/lessons/new');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/teacher/dashboard');
  });
});
