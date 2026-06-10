const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createAdminUsersRoutes = require('../../routes/adminUsersRoutes');

function valueMatches(actual, expected) {
  if (expected && typeof expected === 'object' && expected.$regex) {
    const flags = expected.$options || '';
    return new RegExp(expected.$regex, flags).test(String(actual || ''));
  }

  if (expected instanceof ObjectId) {
    return String(actual) === String(expected);
  }

  return actual === expected;
}

function matches(doc, criteria) {
  return Object.entries(criteria || {}).every(([key, expected]) =>
    valueMatches(doc[key], expected),
  );
}

function createCollection(initialDocs = []) {
  const docs = initialDocs.map((doc) => ({ ...doc }));
  return {
    docs,
    findOne: jest.fn(
      async (criteria) => docs.find((doc) => matches(doc, criteria)) || null,
    ),
    insertOne: jest.fn(async (doc) => {
      const insertedId = doc._id || new ObjectId();
      docs.push({ ...doc, _id: insertedId });
      return { acknowledged: true, insertedId };
    }),
    updateOne: jest.fn(async (criteria, update) => {
      const doc = docs.find((item) => matches(item, criteria));
      if (!doc)
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      if (update.$set) Object.assign(doc, update.$set);
      if (update.$unset) {
        Object.keys(update.$unset).forEach((key) => {
          delete doc[key];
        });
      }
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    }),
    updateMany: jest.fn(async () => ({
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
    })),
    countDocuments: jest.fn(async () => docs.length),
  };
}

function buildApp({
  sessionData = {
    userId: '507f1f77bcf86cd799439011',
    role: 'admin',
    studentIDNumber: 'admin-1',
    firstName: 'Ada',
    lastName: 'Admin',
    csrfToken: 'csrf-1',
  },
  usersCollection = createCollection(),
  logsCollection = { insertOne: jest.fn(async () => ({ acknowledged: true })) },
  bcrypt = {
    hash: jest.fn(async (value) => `hashed-${value}`),
    compare: jest.fn(async () => true),
  },
  sendEmail = jest.fn(async () => ({ success: true })),
  generateOTP = jest.fn(() => 'abc123'),
} = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use(
    '/api/admin/users',
    createAdminUsersRoutes({
      usersCollection,
      logsCollection,
      isAuthenticated(req, res, next) {
        if (req.session?.userId) return next();
        return res
          .status(401)
          .json({ success: false, message: 'Unauthorized' });
      },
      isAdmin(req, res, next) {
        if (req.session?.role === 'admin') return next();
        return res.status(403).json({ success: false, message: 'Forbidden' });
      },
      bcrypt,
      sendEmail,
      generateOTP,
    }),
  );

  return {
    app,
    usersCollection,
    logsCollection,
    bcrypt,
    sendEmail,
    generateOTP,
  };
}

describe('admin users API smoke', () => {
  test('rejects CRFV account creation without CSRF', async () => {
    const { app, usersCollection } = buildApp();

    const response = await request(app).post('/api/admin/users').send({
      firstName: 'Mary',
      lastName: 'Manager',
      email: 'mary@example.com',
      studentIDNumber: 'mary.manager',
      role: 'manager',
      password: 'Password1',
      confirmPassword: 'Password1',
    });

    expect(response.status).toBe(403);
    expect(usersCollection.insertOne).not.toHaveBeenCalled();
  });

  test('rejects non-admin sessions for CRFV account creation', async () => {
    const { app } = buildApp({
      sessionData: {
        userId: '507f1f77bcf86cd799439012',
        role: 'manager',
        csrfToken: 'csrf-1',
      },
    });

    const response = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send({
        firstName: 'Mary',
        lastName: 'Manager',
        email: 'mary@example.com',
        studentIDNumber: 'mary.manager',
        role: 'manager',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

    expect(response.status).toBe(403);
  });

  test('creates a manager account with a hashed password and audit log', async () => {
    const { app, usersCollection, logsCollection, bcrypt } = buildApp();

    const response = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send({
        firstName: 'Mary',
        lastName: 'Manager',
        email: 'MARY@example.com',
        studentIDNumber: 'mary.manager',
        role: 'manager',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      user: {
        firstName: 'Mary',
        lastName: 'Manager',
        emaildb: 'mary@example.com',
        role: 'manager',
      },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('Password1', 10);
    expect(usersCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        password: 'hashed-Password1',
        emailConfirmed: true,
        accountDisabled: false,
        role: 'manager',
      }),
    );
    expect(logsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CRFV_ACCOUNT_CREATED' }),
    );
  });

  test('rejects account creation for roles outside manager and admin', async () => {
    const { app, usersCollection } = buildApp();

    const response = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send({
        firstName: 'Sam',
        lastName: 'Student',
        email: 'sam@example.com',
        studentIDNumber: 'sam.student',
        role: 'student',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

    expect(response.status).toBe(400);
    expect(usersCollection.insertOne).not.toHaveBeenCalled();
  });

  test('rejects duplicate account email during creation', async () => {
    const existingUser = {
      _id: new ObjectId('507f1f77bcf86cd799439013'),
      emaildb: 'mary@example.com',
      studentIDNumber: 'other-id',
    };
    const { app } = buildApp({
      usersCollection: createCollection([existingUser]),
    });

    const response = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send({
        firstName: 'Mary',
        lastName: 'Manager',
        email: 'mary@example.com',
        studentIDNumber: 'mary.manager',
        role: 'manager',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Email is already in use.');
  });

  test('temporary password reset updates hash and clears lockout fields', async () => {
    const targetId = new ObjectId('507f1f77bcf86cd799439014');
    const usersCollection = createCollection([
      {
        _id: targetId,
        firstName: 'Alan',
        lastName: 'Admin',
        studentIDNumber: 'alan.admin',
        role: 'admin',
        accountLockedUntil: new Date(),
        invalidLoginAttempts: 2,
      },
    ]);
    const { app, bcrypt } = buildApp({ usersCollection });

    const response = await request(app)
      .put(`/api/admin/users/${targetId.toString()}/password`)
      .set('x-csrf-token', 'csrf-1')
      .send({ newPassword: 'Password2', confirmPassword: 'Password2' });

    expect(response.status).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith('Password2', 10);
    expect(usersCollection.updateOne).toHaveBeenCalledWith(
      { _id: targetId },
      {
        $set: expect.objectContaining({
          password: 'hashed-Password2',
          accountLockedUntil: null,
          invalidLoginAttempts: 0,
          resetCode: null,
          resetCodeVerified: false,
        }),
      },
    );
  });

  test('email reset code path stores reset fields and sends email', async () => {
    const targetId = new ObjectId('507f1f77bcf86cd799439015');
    const usersCollection = createCollection([
      {
        _id: targetId,
        firstName: 'Mina',
        lastName: 'Manager',
        emaildb: 'mina@example.com',
        studentIDNumber: 'mina.manager',
        role: 'manager',
      },
    ]);
    const { app, bcrypt, sendEmail, generateOTP } = buildApp({
      usersCollection,
    });

    const response = await request(app)
      .post(`/api/admin/users/${targetId.toString()}/send-password-reset`)
      .set('x-csrf-token', 'csrf-1')
      .send({});

    expect(response.status).toBe(200);
    expect(generateOTP).toHaveBeenCalledTimes(1);
    expect(bcrypt.hash).toHaveBeenCalledWith('abc123', 10);
    expect(usersCollection.updateOne).toHaveBeenCalledWith(
      { _id: targetId },
      {
        $set: expect.objectContaining({
          resetCode: 'hashed-abc123',
          invalidResetAttempts: 0,
          resetCodeLockUntil: null,
          resetCodeVerified: false,
        }),
      },
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'mina@example.com',
        subject: 'Your CRFV Account Password Reset Code',
      }),
    );
  });
});
