const path = require('path');
const express = require('express');
const request = require('supertest');

const createStudentPagesRoutes = require('../../routes/studentPagesRoutes');
const { isAuthenticated } = require('../../middleware/routeAuthGuards');

function buildStudentPagesApp(sessionData = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use(createStudentPagesRoutes({
    projectRoot: process.cwd(),
    isAuthenticated
  }));
  return app;
}

describe('student quiz responder page smoke', () => {
  const sessionData = {
    userId: 'S-1001',
    role: 'student',
    studentIDNumber: '2024-00123',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('quiz responder page renders the runtime shell for authenticated users', async () => {
    const app = buildStudentPagesApp(sessionData);

    const response = await request(app).get('/quizzes/507f1f77bcf86cd799439099/respond');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Assigned Quiz');
    expect(response.text).toContain('id="quizForm"');
    expect(response.text).toContain('window.__QUIZ_ID__ = "507f1f77bcf86cd799439099"');
    expect(response.text).toContain('/js/quizzes/player.js');
  });

  test('quiz responder page redirects unauthenticated users to login', async () => {
    const app = buildStudentPagesApp({});

    const response = await request(app).get('/quizzes/507f1f77bcf86cd799439099/respond');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });
});
