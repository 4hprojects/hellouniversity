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

describe('student classes pages smoke', () => {
  const sessionData = {
    userId: 'S-1001',
    role: 'student',
    studentIDNumber: '2024-00123',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('classes index renders with active classes navigation for authenticated students', async () => {
    const app = buildStudentPagesApp(sessionData);

    const response = await request(app).get('/classes');

    expect(response.status).toBe(200);
    expect(response.text).toContain('My Classes');
    expect(response.text).toContain('Open First');
    expect(response.text).toContain('Where You Should Start');
    expect(response.text).toContain('studentClassesFeaturedTitle');
    expect(response.text).toContain('studentClassesJoinForm');
    expect(response.text).toContain('studentClassesAttentionList');
    expect(response.text).toContain('studentClassesGrid');
    expect(response.text).toContain('href="/classes"');
    expect(response.text).toContain('app-nav-link app-nav-link-active');
  });

  test('class detail page renders for an authenticated student', async () => {
    const app = buildStudentPagesApp(sessionData);

    const response = await request(app).get('/classes/class-123');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Class Workspace');
    expect(response.text).toContain('studentClassTabStream');
    expect(response.text).toContain('studentClassTabClasswork');
    expect(response.text).toContain('studentClassTabResources');
    expect(response.text).toContain('studentClassAnnouncementsList');
    expect(response.text).toContain('studentClassActivitiesList');
    expect(response.text).toContain('studentClassMaterialsList');
    expect(response.text).toContain('studentClassFacts');
  });

  test('classes routes redirect unauthenticated users to login', async () => {
    const app = buildStudentPagesApp({});

    const indexResponse = await request(app).get('/classes');
    const detailResponse = await request(app).get('/classes/class-123');

    expect(indexResponse.status).toBe(302);
    expect(indexResponse.headers.location).toBe('/login');
    expect(detailResponse.status).toBe(302);
    expect(detailResponse.headers.location).toBe('/login');
  });
});
