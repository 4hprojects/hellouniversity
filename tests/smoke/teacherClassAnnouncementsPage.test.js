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

describe('teacher class announcements page smoke', () => {
  const sessionData = {
    userId: '507f1f77bcf86cd799439011',
    role: 'teacher',
    studentIDNumber: '2024-00123',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('announcements page renders for an authenticated teacher', async () => {
    const app = buildTeacherPagesApp(sessionData);

    const response = await request(app).get('/teacher/classes/507f1f77bcf86cd799439099/announcements');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Announcement Stream');
    expect(response.text).toContain('teacherAnnouncementComposerForm');
    expect(response.text).toContain('teacherAnnouncementsList');
  });

  test('announcements page redirects unauthenticated users to login', async () => {
    const app = buildTeacherPagesApp({});

    const response = await request(app).get('/teacher/classes/507f1f77bcf86cd799439099/announcements');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });
});
