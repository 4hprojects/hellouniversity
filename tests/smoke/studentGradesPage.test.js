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

describe('student grades page smoke', () => {
  test('grades page renders for an authenticated student', async () => {
    const app = buildStudentPagesApp({
      userId: 'S-1001',
      role: 'student',
      studentIDNumber: '2024-00123',
      firstName: 'Kayla',
      lastName: 'Ryhs'
    });

    const response = await request(app).get('/grades');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Grades | HelloUniversity');
    expect(response.text).toContain('Grade Details');
    expect(response.text).toContain('studentGradeCourseSelect');
    expect(response.text).toContain('Join ClassRush');
    expect(response.text).toContain('/js/studentGrades.js');
  });
});
