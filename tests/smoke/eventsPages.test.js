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

describe('events pages smoke', () => {
  test('/events renders the simplified archive catalog', async () => {
    const app = buildApp();
    const response = await request(app).get('/events');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Browse published event pages and results from past campus activities.');
    expect(response.text).toContain('Quick paths into the main event sets');
    expect(response.text).toContain('Search and filter the available event pages');
    expect(response.text).toContain('Baguio Smart City Challenge at BSU');
    expect(response.text).not.toContain('Events Menu');
    expect(response.text).not.toContain('What changed on the landing page');
    expect(response.text).not.toContain('Need another part of the site?');
  });

  test('noindex event detail page renders breadcrumb and streamlined actions', async () => {
    const app = buildApp();
    const response = await request(app).get('/events/2025bytefunrun');

    expect(response.status).toBe(200);
    expect(response.text).toContain('aria-label="Breadcrumb"');
    expect(response.text).toContain('href="/events">Events</a>');
    expect(response.text).toContain('<meta name="robots" content="noindex, follow">');
    expect(response.text).toContain('Registration is archived');
    expect(response.text).toContain('Open details');
    expect(response.text).toContain('Open results');
    expect(response.text).not.toContain('Back to Event Archive');
  });

  test('indexable event detail page keeps breadcrumb and index robots tag', async () => {
    const app = buildApp();
    const response = await request(app).get('/events/itquizbee2025results');

    expect(response.status).toBe(200);
    expect(response.text).toContain('aria-label="Breadcrumb"');
    expect(response.text).toContain('<meta name="robots" content="index, follow">');
    expect(response.text).toContain('Quick Facts');
    expect(response.text).toContain('Related Event Pages');
    expect(response.text).not.toContain('Back to Event Archive');
  });
});
