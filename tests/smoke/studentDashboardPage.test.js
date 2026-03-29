const path = require('path');
const fs = require('fs');
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

describe('student dashboard page smoke', () => {
  test('dashboard renders join-class and joined-classes sections for authenticated students', async () => {
    const app = buildStudentPagesApp({
      userId: 'S-1001',
      role: 'student',
      studentIDNumber: '2024-00123',
      firstName: 'Kayla',
      lastName: 'Ryhs'
    });

    const response = await request(app).get('/dashboard');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Student Dashboard');
    expect(response.text).toContain('Notifications');
    expect(response.text).toContain('Join a Class');
    expect(response.text).toContain('Joined Classes');
    expect(response.text).toContain('Quick Access');
    expect(response.text).toContain('Study Picks');
    expect(response.text).toContain('studentJoinClassForm');
    expect(response.text).toContain('studentAttentionList');
    expect(response.text).toContain('data-study-picks-root');
    expect(response.text).toContain('/js/studentDashboard.js');
    expect(response.text).toContain('/js/studyPicksPanel.js');
    expect(fs.readFileSync(path.join(process.cwd(), 'public', 'js', 'studentDashboard.js'), 'utf8')).toContain('/classes/');
  });
});
