const path = require('path');
const express = require('express');
const request = require('supertest');

const createWebPagesRoutes = require('../../routes/webPagesRoutes');
const createAuthWebRoutes = require('../../routes/authWebRoutes');
const { createCollection } = require('../helpers/inMemoryMongo');

function buildApp(sessionData = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });

  const blogCollection = createCollection([]);
  app.use(createWebPagesRoutes({
    projectRoot: process.cwd(),
    getBlogCollection: () => blogCollection
  }));
  app.use(createAuthWebRoutes({
    getUsersCollection: () => null,
    getLogsCollection: () => null,
    sendEmail: async () => ({ success: true }),
    bcrypt: { compare: async () => false },
    validator: {
      trim(value) {
        return String(value || '').trim();
      },
      isEmail() {
        return false;
      },
      normalizeEmail(value) {
        return String(value || '').trim().toLowerCase();
      }
    },
    isAuthenticated(req, res, next) {
      if (req.session?.userId) {
        return next();
      }
      return res.redirect('/login');
    }
  }));

  return app;
}

describe('public branding pages smoke', () => {
  test('about page presents HelloUniversity as a digital academic platform', async () => {
    const app = buildApp();
    const response = await request(app).get('/about');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<title>About HelloUniversity</title>');
    expect(response.text).toContain('Digital academic platform for school and higher education workflows.');
    expect(response.text).toContain('HelloUniversity is not a university itself.');
    expect(response.text).toContain('The current product direction centers on five connected pillars.');
    expect(response.text).toContain('Academic Management');
    expect(response.text).toContain('Monitoring and Intelligent Support');
    expect(response.text).toContain('Academic Teams');
    expect(response.text).toContain('Support school and higher education operations');
  });

  test('login and signup pages frame HelloUniversity as a platform workspace', async () => {
    const app = buildApp();

    const loginResponse = await request(app).get('/login');
    const signupResponse = await request(app).get('/signup');

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.text).toContain('Access the HelloUniversity platform with your ID or email.');
    expect(loginResponse.text).toContain('digital academic platform designed to support school and higher education workflows');
    expect(signupResponse.status).toBe(200);
    expect(signupResponse.text).toContain('Set up your HelloUniversity platform account in one pass.');
    expect(signupResponse.text).toContain('digital academic platform designed to support school and higher education workflows');
  });

  test('help page publishes HelloUniversity-specific FAQ content and schema', async () => {
    const app = buildApp();
    const response = await request(app).get('/help');

    expect(response.status).toBe(200);
    expect(response.text).toContain('HelloUniversity FAQ');
    expect(response.text).toContain('What is HelloUniversity used for?');
    expect(response.text).toContain('Does HelloUniversity support senior high school, college, and university workflows?');
    expect(response.text).toContain('"@type":"FAQPage"');
  });
});
