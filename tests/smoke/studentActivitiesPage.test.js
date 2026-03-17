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

describe('student activities page smoke', () => {
  test('legacy activities html route redirects to the extensionless page', async () => {
    const app = buildStudentPagesApp({
      userId: 'S-1001',
      role: 'student',
      studentIDNumber: '2024-00123',
      firstName: 'Kayla',
      lastName: 'Ryhs'
    });

    const response = await request(app).get('/activities.html');

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe('/activities');
  });

  test('activities page renders student shell and active activities navigation when authenticated', async () => {
    const app = buildStudentPagesApp({
      userId: 'S-1001',
      role: 'student',
      studentIDNumber: '2024-00123',
      firstName: 'Kayla',
      lastName: 'Ryhs'
    });

    const response = await request(app).get('/activities');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Student Activities');
    expect(response.text).toContain('Your Activity Board');
    expect(response.text).toContain('Activity Tools');
    expect(response.text).toContain('href="/activities"');
    expect(response.text).toContain('app-nav-link app-nav-link-active');
  });

  test('activities page redirects to login when unauthenticated', async () => {
    const app = buildStudentPagesApp({});

    const response = await request(app).get('/activities');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });
});
