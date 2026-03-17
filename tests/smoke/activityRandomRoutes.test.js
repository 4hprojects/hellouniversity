const express = require('express');
const request = require('supertest');
const createActivityRandomRoutes = require('../../routes/activityRandomRoutes');

function createApp({ sessionData = {}, activityAssignmentsCollection, sendEmail }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use('/api', createActivityRandomRoutes({ activityAssignmentsCollection, sendEmail }));
  return app;
}

describe('activityRandomRoutes smoke', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ACTIVITY_RANDOM_REQUIRE_STAFF;
    delete process.env.DISABLE_CAPTCHA;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('blocks unauthenticated requests when staff mode enabled', async () => {
    process.env.ACTIVITY_RANDOM_REQUIRE_STAFF = 'true';
    const app = createApp({
      sessionData: {},
      activityAssignmentsCollection: { insertOne: jest.fn() },
      sendEmail: jest.fn().mockResolvedValue({})
    });

    const response = await request(app).post('/api/activity/random').send({});
    expect(response.status).toBe(401);
  });

  test('requires captcha for non-test emails when captcha is enabled', async () => {
    process.env.DISABLE_CAPTCHA = 'false';
    process.env.SECRET_KEY = 'secret';
    const app = createApp({
      sessionData: {},
      activityAssignmentsCollection: { insertOne: jest.fn() },
      sendEmail: jest.fn().mockResolvedValue({})
    });

    const response = await request(app).post('/api/activity/random').send({
      email: '1234567@s.ubaguio.edu',
      idNumber: '1234567',
      subject: 'PROGIT1'
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Captcha required/i);
  });

  test('succeeds and persists assignment when captcha is disabled', async () => {
    process.env.DISABLE_CAPTCHA = 'true';
    const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const sendEmail = jest.fn().mockResolvedValue({ provider: 'mock' });
    const app = createApp({
      sessionData: {},
      activityAssignmentsCollection: { insertOne },
      sendEmail
    });

    const response = await request(app).post('/api/activity/random').send({
      email: '1234567@s.ubaguio.edu',
      idNumber: '1234567',
      subject: 'PROGIT1'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(insertOne).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
