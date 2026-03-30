const path = require('path');
const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createAuthWebRoutes = require('../../routes/authWebRoutes');
const { createCollection } = require('../helpers/inMemoryMongo');

function buildAuthApp({ sessionData = {}, users = [] } = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = {
      ...sessionData,
      save(callback) {
        if (typeof callback === 'function') callback(null);
      },
      destroy(callback) {
        if (typeof callback === 'function') callback(null);
      }
    };
    res.locals.currentPath = req.path || '/';
    next();
  });

  const usersCollection = createCollection(users);
  const logsCollection = createCollection([]);

  app.use(createAuthWebRoutes({
    getUsersCollection: () => usersCollection,
    getLogsCollection: () => logsCollection,
    sendEmail: async () => ({ success: true }),
    bcrypt: {
      compare: async (plain, hashed) => plain === 'Pass123!' && hashed === 'hashed-password'
    },
    validator: {
      trim(value) {
        return String(value || '').trim();
      },
      isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
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

describe('auth web routes returnTo handling', () => {
  const studentUser = {
    _id: new ObjectId('507f1f77bcf86cd799439011'),
    studentIDNumber: '2024001',
    password: 'hashed-password',
    role: 'student',
    firstName: 'Kayla',
    lastName: 'Ryhs',
    emaildb: 'student@example.com',
    emailConfirmed: true
  };

  test('GET /login redirects authenticated users to sanitized returnTo', async () => {
    const app = buildAuthApp({
      sessionData: {
        userId: '507f1f77bcf86cd799439011',
        role: 'student'
      }
    });

    const response = await request(app).get('/login?returnTo=%2Fclassrush%2Fassignments%2F507f1f77bcf86cd799439055');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/classrush/assignments/507f1f77bcf86cd799439055');
  });

  test('POST /auth/login returns sanitized returnTo as redirectPath', async () => {
    const app = buildAuthApp({ users: [studentUser] });

    const response = await request(app)
      .post('/auth/login')
      .send({
        studentIDNumber: '2024001',
        password: 'Pass123!',
        returnTo: '/classrush/assignments/507f1f77bcf86cd799439055'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.redirectPath).toBe('/classrush/assignments/507f1f77bcf86cd799439055');
  });

  test('POST /auth/login ignores invalid external returnTo values', async () => {
    const app = buildAuthApp({ users: [studentUser] });

    const response = await request(app)
      .post('/auth/login')
      .send({
        studentIDNumber: '2024001',
        password: 'Pass123!',
        returnTo: 'https://evil.example/phish'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.redirectPath).toBe('/dashboard');
  });
});
