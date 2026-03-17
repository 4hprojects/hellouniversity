const express = require('express');
const request = require('supertest');
const createConfigRoutes = require('../../routes/configRoutes');

function buildApp() {
  const app = express();
  app.use(createConfigRoutes());
  return app;
}

describe('config routes smoke', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns recaptcha enabled with site key when configured', async () => {
    process.env.DISABLE_CAPTCHA = 'false';
    process.env.SECRET_KEY = 'secret-key';
    process.env.RECAPTCHA_SITE_KEY = 'site-key';

    const app = buildApp();
    const response = await request(app).get('/api/config/recaptcha');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: true, siteKey: 'site-key' });
  });

  test('returns recaptcha disabled when flag is true', async () => {
    process.env.DISABLE_CAPTCHA = 'true';
    process.env.SECRET_KEY = 'secret-key';
    process.env.RECAPTCHA_SITE_KEY = 'site-key';

    const app = buildApp();
    const response = await request(app).get('/api/config/recaptcha');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: false, siteKey: null });
  });
});
