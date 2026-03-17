const express = require('express');
const request = require('supertest');
const {
  isAuthenticated,
  isAdmin,
  isTeacherOrAdmin,
  isAdminOrManager
} = require('../../middleware/routeAuthGuards');

function createApp(sessionData = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });

  app.get('/auth-only', isAuthenticated, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get('/admin-only', isAdmin, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get('/teacher-or-admin', isTeacherOrAdmin, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get('/admin-or-manager', isAdminOrManager, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

describe('routeAuthGuards smoke', () => {
  test('blocks unauthenticated access', async () => {
    const app = createApp({});
    const response = await request(app).get('/auth-only');
    expect(response.status).toBe(401);
  });

  test('allows authenticated user access', async () => {
    const app = createApp({ userId: 'u1', role: 'student' });
    const response = await request(app).get('/auth-only');
    expect(response.status).toBe(200);
  });

  test('blocks student from admin-only route', async () => {
    const app = createApp({ userId: 'u1', role: 'student' });
    const response = await request(app).get('/admin-only');
    expect(response.status).toBe(403);
  });

  test('allows teacher on teacher-or-admin route', async () => {
    const app = createApp({ userId: 'u1', role: 'teacher' });
    const response = await request(app).get('/teacher-or-admin');
    expect(response.status).toBe(200);
  });

  test('blocks student from admin-or-manager route', async () => {
    const app = createApp({ userId: 'u1', role: 'student' });
    const response = await request(app).get('/admin-or-manager');
    expect(response.status).toBe(403);
  });

  test('allows manager on admin-or-manager route', async () => {
    const app = createApp({ userId: 'u1', role: 'manager' });
    const response = await request(app).get('/admin-or-manager');
    expect(response.status).toBe(200);
  });
});
