// Regression guard for the resolved reportsApi router-shadowing SEV1.
//
// History: routes/reportsApi.js once applied a blanket `router.use(requirePrivilegedRole)`
// (admin/manager only). Because it is mounted at the generic `app.use('/api', reportsApi)`
// BEFORE the student/teacher/quiz-builder/live-games routers, Express dispatched it first
// and returned 403 to every non-admin/manager `/api/*` request — breaking most of the
// authenticated product. The fix scopes the guard to reportsApi's own routes instead.
//
// This test mounts reportsApi at `/api` ahead of downstream stub routes (mirroring the real
// mount order) and asserts:
//   1. A non-privileged (student/teacher) session can still reach downstream `/api/*` routes.
//   2. reportsApi's own privileged endpoints still correctly reject a non-privileged session.
// If a blanket `router.use(<role guard>)` is reintroduced, assertion (1) fails.

const express = require('express');
const request = require('supertest');

jest.mock('../../supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const reportsApi = require('../../routes/reportsApi');

function buildApp(session) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session;
    next();
  });

  // Same mount order as app/registerRoutes.js: reportsApi at the generic /api prefix...
  app.use('/api', reportsApi);

  // ...followed by the routers it must NOT shadow. Stubbed so this stays a fast unit test.
  const reached = (req, res) => res.json({ success: true, reached: true });
  app.get('/api/student/classes', reached);
  app.get('/api/teacher/classes', reached);
  app.get('/api/quiz-builder/quizzes', reached);
  app.get('/api/live-games', reached);

  return app;
}

const DOWNSTREAM_ROUTES = [
  '/api/student/classes',
  '/api/teacher/classes',
  '/api/quiz-builder/quizzes',
  '/api/live-games',
];

describe('reportsApi does not shadow downstream /api routes', () => {
  it.each(DOWNSTREAM_ROUTES)(
    'student session reaches %s (not 403 from reportsApi)',
    async (route) => {
      const app = buildApp({ userId: 'stu1', role: 'student' });
      const res = await request(app).get(route);
      expect(res.status).toBe(200);
      expect(res.body.reached).toBe(true);
    },
  );

  it.each(DOWNSTREAM_ROUTES)(
    'teacher session reaches %s (not 403 from reportsApi)',
    async (route) => {
      const app = buildApp({ userId: 't1', role: 'teacher' });
      const res = await request(app).get(route);
      expect(res.status).toBe(200);
      expect(res.body.reached).toBe(true);
    },
  );

  it('still blocks a non-privileged session on reportsApi privileged endpoints', async () => {
    const app = buildApp({ userId: 'stu1', role: 'student' });
    const res = await request(app).get('/api/accommodation');
    expect(res.status).toBe(403);
  });
});
