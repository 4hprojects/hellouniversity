const express = require('express');
const request = require('supertest');

jest.setTimeout(15000);

function createAppWithSession({ sessionData = {}, mountPath, router }) {
  const app = express();
  app.use(express.json());
  app.locals.projectRoot = process.cwd();
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use(mountPath, router);
  return app;
}

describe('mutation route guards smoke', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE: 'test-role-key'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('blocks student from creating event', async () => {
    const eventsApi = require('../../routes/eventsApi');
    const app = createAppWithSession({
      sessionData: { userId: 'u1', role: 'student' },
      mountPath: '/api/events',
      router: eventsApi
    });

    const response = await request(app).post('/api/events').send({});
    expect(response.status).toBe(403);
  });

  test('blocks student from updating payment data', async () => {
    const reportsApi = require('../../routes/reportsApi');
    const app = createAppWithSession({
      sessionData: { userId: 'u1', role: 'student' },
      mountPath: '/api',
      router: reportsApi
    });

    const response = await request(app).put('/api/payments/p1').send({ amount: 100 });
    expect(response.status).toBe(403);
  });

  test('blocks unauthenticated payment mutation', async () => {
    const reportsApi = require('../../routes/reportsApi');
    const app = createAppWithSession({
      sessionData: {},
      mountPath: '/api',
      router: reportsApi
    });

    const response = await request(app).put('/api/payments/p1').send({ amount: 100 });
    expect(response.status).toBe(401);
  });
});
