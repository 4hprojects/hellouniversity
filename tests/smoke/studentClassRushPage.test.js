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

describe('student ClassRush assignment page smoke', () => {
  const sessionData = {
    userId: '507f1f77bcf86cd799439011',
    role: 'student',
    studentIDNumber: '2024-00123',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('self-paced ClassRush page renders for authenticated students', async () => {
    const app = buildStudentPagesApp(sessionData);
    const response = await request(app).get('/classrush/assignments/507f1f77bcf86cd799439055');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Self-Paced ClassRush');
    expect(response.text).toContain('classrushAssignmentPage');
    expect(response.text).toContain('player-root');
    expect(response.text).toContain('player-join-card');
    expect(response.text).toContain('screenReady');
    expect(response.text).toContain('screenAnswer');
    expect(response.text).toContain('Start ClassRush');
    expect(response.text).toContain('self-paced-float-link');
    expect(response.text).toContain('data-assignment-id="507f1f77bcf86cd799439055"');
    expect(response.text).toContain('selfPacedPlayer.js');
    expect(response.text).not.toContain('student-shell');
    expect(response.text).not.toContain('self-paced-topbar');
    expect(response.text).not.toContain('self-paced-meta-grid');
  });

  test('self-paced ClassRush page redirects unauthenticated users', async () => {
    const app = buildStudentPagesApp({});
    const response = await request(app).get('/classrush/assignments/507f1f77bcf86cd799439055');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?returnTo=%2Fclassrush%2Fassignments%2F507f1f77bcf86cd799439055');
  });
});
