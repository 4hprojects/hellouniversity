const path = require('path');
const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const { findUserByEmail, normalizeEmail } = require('../../utils/emailLookup');
const createAuthWebRoutes = require('../../routes/authWebRoutes');
const createPasswordResetRoutes = require('../../routes/passwordResetRoutes');
const { createCollection } = require('../helpers/inMemoryMongo');

function trackFindOneQueries(collection) {
  const calls = [];
  const original = collection.findOne.bind(collection);
  collection.findOne = async (query = {}, options = {}) => {
    calls.push(query);
    return original(query, options);
  };
  return calls;
}

describe('emailLookup.findUserByEmail', () => {
  test('normalized lowercase store is found via the indexed exact match (no regex)', async () => {
    const users = createCollection([
      { _id: new ObjectId(), emaildb: 'student@example.com', role: 'student' },
    ]);
    const queries = trackFindOneQueries(users);

    const user = await findUserByEmail(users, 'Student@Example.COM ');

    expect(user).toBeTruthy();
    expect(user.emaildb).toBe('student@example.com');
    expect(queries).toHaveLength(1);
    expect(queries[0]).toEqual({ emaildb: 'student@example.com' });
  });

  test('legacy mixed-case store is still found via the regex fallback', async () => {
    const users = createCollection([
      { _id: new ObjectId(), emaildb: 'Legacy@Example.com', role: 'student' },
    ]);
    const queries = trackFindOneQueries(users);

    const user = await findUserByEmail(users, 'legacy@example.com');

    expect(user).toBeTruthy();
    expect(user.emaildb).toBe('Legacy@Example.com');
    expect(queries).toHaveLength(2);
    expect(queries[1].emaildb).toHaveProperty('$regex');
  });

  test('invalid email returns null without querying', async () => {
    const users = createCollection([]);
    const queries = trackFindOneQueries(users);

    expect(await findUserByEmail(users, 'not-an-email')).toBeNull();
    expect(queries).toHaveLength(0);
  });

  test('extra filter is applied to both lookup paths', async () => {
    const users = createCollection([
      {
        _id: new ObjectId(),
        emaildb: 'student@example.com',
        resetCodeVerified: false,
      },
    ]);

    const blocked = await findUserByEmail(users, 'Student@Example.com', {
      filter: { resetCodeVerified: true },
    });
    expect(blocked).toBeNull();
  });

  test('normalizeEmail lowercases and rejects invalid input', () => {
    expect(normalizeEmail(' Student@Example.COM ')).toBe('student@example.com');
    expect(normalizeEmail('nope')).toBeNull();
  });
});

describe('login accepts mixed-case email input', () => {
  function buildAuthApp({ users = [] } = {}) {
    const app = express();
    app.locals.projectRoot = process.cwd();
    app.set('view engine', 'ejs');
    app.set('views', path.join(process.cwd(), 'views'));
    app.use(express.json());
    app.use((req, res, next) => {
      req.session = {
        save(callback) {
          if (typeof callback === 'function') callback(null);
        },
        destroy(callback) {
          if (typeof callback === 'function') callback(null);
        },
      };
      res.locals.currentPath = req.path || '/';
      next();
    });

    const usersCollection = createCollection(users);

    app.use(
      createAuthWebRoutes({
        getUsersCollection: () => usersCollection,
        getLogsCollection: () => createCollection([]),
        sendEmail: async () => ({ success: true }),
        bcrypt: {
          compare: async (plain, hashed) =>
            plain === 'Pass123!' && hashed === 'hashed-password',
        },
        validator: require('validator'),
        isAuthenticated(req, res, next) {
          return next();
        },
      }),
    );

    return app;
  }

  const lowercaseUser = {
    _id: new ObjectId(),
    studentIDNumber: '2024001',
    password: 'hashed-password',
    role: 'student',
    firstName: 'Kayla',
    lastName: 'Ryhs',
    emaildb: 'student@example.com',
    emailConfirmed: true,
  };

  const legacyMixedCaseUser = {
    _id: new ObjectId(),
    studentIDNumber: '2024002',
    password: 'hashed-password',
    role: 'student',
    firstName: 'Lee',
    lastName: 'Old',
    emaildb: 'Legacy@Example.com',
    emailConfirmed: true,
  };

  test('POST /auth/login succeeds with mixed-case input against lowercase store', async () => {
    const app = buildAuthApp({ users: [lowercaseUser] });

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'Student@Example.COM', password: 'Pass123!' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('POST /auth/login still succeeds against a legacy mixed-case store', async () => {
    const app = buildAuthApp({ users: [legacyMixedCaseUser] });

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'legacy@example.com', password: 'Pass123!' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('password reset accepts mixed-case email input', () => {
  function buildResetApp({ users = [] } = {}) {
    const app = express();
    app.use(express.json());

    const usersCollection = createCollection(users);
    const sentEmails = [];

    app.use(
      createPasswordResetRoutes({
        getUsersCollection: () => usersCollection,
        sendEmail: async (payload) => {
          sentEmails.push(payload);
          return { success: true };
        },
        hashPassword: async (value) => `hashed:${value}`,
        generateOTP: () => '123456',
      }),
    );

    return { app, usersCollection, sentEmails };
  }

  test('POST /send-password-reset matches mixed-case input and emails stored address', async () => {
    const user = {
      _id: new ObjectId(),
      firstName: 'Kayla',
      emaildb: 'student@example.com',
    };
    const { app, usersCollection, sentEmails } = buildResetApp({
      users: [user],
    });

    const response = await request(app)
      .post('/send-password-reset')
      .send({ email: 'Student@Example.COM' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('student@example.com');

    const updated = await usersCollection.findOne({ _id: user._id });
    expect(updated.resetCode).toBeTruthy();
    expect(updated.resetExpires).toBeInstanceOf(Date);
  });

  test('POST /reset-password matches mixed-case input with verified filter', async () => {
    const user = {
      _id: new ObjectId(),
      firstName: 'Kayla',
      emaildb: 'student@example.com',
      resetCodeVerified: true,
      resetCode: 'stored-hash',
    };
    const { app, usersCollection } = buildResetApp({ users: [user] });

    const response = await request(app)
      .post('/reset-password')
      .send({ email: 'Student@Example.COM', newPassword: 'NewPass123!' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updated = await usersCollection.findOne({ _id: user._id });
    expect(updated.password).toBe('hashed:NewPass123!');
    expect(updated.resetCodeVerified).toBe(false);
  });

  test('POST /reset-password rejects when reset code is not verified', async () => {
    const user = {
      _id: new ObjectId(),
      emaildb: 'student@example.com',
      resetCodeVerified: false,
    };
    const { app } = buildResetApp({ users: [user] });

    const response = await request(app)
      .post('/reset-password')
      .send({ email: 'student@example.com', newPassword: 'NewPass123!' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
