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
    isTeacherOrAdminOrPending: isTeacherOrAdmin
  }));
  return app;
}

describe('teacher classes pages smoke', () => {
  const sessionData = {
    userId: '507f1f77bcf86cd799439011',
    role: 'teacher',
    studentIDNumber: '2024-00123',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('class management dashboard renders for an authenticated teacher', async () => {
    const app = buildTeacherPagesApp(sessionData);

    const response = await request(app).get('/teacher/classes');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Class Management');
    expect(response.text).toContain('Class Navigator');
    expect(response.text).toContain('classMgmtHandledList');
    expect(response.text).toContain('classMgmtArchivedList');
    expect(response.text).toContain('classMgmtSearchInput');
    expect(response.text).toContain('Create Class');
  });

  test('class overview page renders for an authenticated teacher', async () => {
    const app = buildTeacherPagesApp(sessionData);

    const response = await request(app).get('/teacher/classes/507f1f77bcf86cd799439099');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Class Workspace');
    expect(response.text).toContain('teacherClassOverviewTitle');
    expect(response.text).toContain('teacherClassOverviewStudentPreview');
    expect(response.text).toContain('teacherClassOverviewTeamPreview');
    expect(response.text).toContain('teacherClassInsightsStatusCards');
    expect(response.text).toContain('teacherClassInsightsEngagement');
    expect(response.text).toContain('teacherClassInsightsRecentActivity');
    expect(response.text).toContain('Create ClassRush');
  });

  test('class settings page renders for an authenticated teacher', async () => {
    const app = buildTeacherPagesApp(sessionData);

    const response = await request(app).get('/teacher/classes/507f1f77bcf86cd799439099/settings');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Class Settings');
    expect(response.text).toContain('teacherClassSettingsForm');
    expect(response.text).toContain('teacherClassSettingsLifecycleForm');
  });

  test('teacher class pages redirect unauthenticated users to login', async () => {
    const app = buildTeacherPagesApp({});

    const listResponse = await request(app).get('/teacher/classes');
    const detailResponse = await request(app).get('/teacher/classes/507f1f77bcf86cd799439099');

    expect(listResponse.status).toBe(302);
    expect(listResponse.headers.location).toBe('/login');
    expect(detailResponse.status).toBe(302);
    expect(detailResponse.headers.location).toBe('/login');
  });
});
