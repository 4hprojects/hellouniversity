const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createAdminUsersRoutes = require('../../routes/adminUsersRoutes');

function valueMatches(actual, expected) {
  if (expected && typeof expected === 'object' && expected.$regex) {
    const flags = expected.$options || '';
    return new RegExp(expected.$regex, flags).test(String(actual || ''));
  }

  if (expected && typeof expected === 'object' && Array.isArray(expected.$in)) {
    return expected.$in.includes(actual);
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

function createCountersCollection(initialCounters = {}) {
  const counters = { ...initialCounters };
  return {
    counters,
    findOneAndUpdate: jest.fn(async (filter, update) => {
      const id = filter._id;
      const inc = update.$inc?.nextVal || 0;
      counters[id] = (counters[id] || 0) + inc;
      return { value: { _id: id, nextVal: counters[id] } };
    }),
  };
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
    countDocuments: jest.fn(async (criteria) =>
      docs.filter((doc) => matches(doc, criteria)).length,
    ),
    find: jest.fn((criteria) => {
      const matched = docs.filter((doc) => matches(doc, criteria));
      const cursor = {
        sort: jest.fn(() => cursor),
        skip: jest.fn(() => cursor),
        limit: jest.fn(() => cursor),
        project: jest.fn(() => cursor),
        toArray: jest.fn(async () => matched),
      };
      return cursor;
    }),
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
  countersCollection = createCountersCollection(),
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
      countersCollection,
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
    countersCollection,
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
      role: 'manager',
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
        role: 'manager',
      });

    expect(response.status).toBe(403);
  });

  test('creates a manager account with a generated ID, hashed temp password, and audit log', async () => {
    const { app, usersCollection, logsCollection, bcrypt, sendEmail } = buildApp();

    const response = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send({
        firstName: 'Mary',
        lastName: 'Manager',
        email: 'MARY@example.com',
        role: 'manager',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toMatchObject({
      firstName: 'Mary',
      lastName: 'Manager',
      emaildb: 'mary@example.com',
      role: 'manager',
    });
    expect(response.body.user.studentIDNumber).toMatch(/^999\d{4}$/);

    const insertedUser = usersCollection.docs.find(
      (doc) => doc.emaildb === 'mary@example.com',
    );
    expect(insertedUser).toMatchObject({
      emailConfirmed: true,
      accountDisabled: false,
      role: 'manager',
      mustChangePassword: true,
    });
    expect(insertedUser.password).toMatch(/^hashed-/);

    const tempPassword = bcrypt.hash.mock.calls[0][0];
    expect(tempPassword).toHaveLength(10);
    expect(tempPassword).toMatch(/^[A-Za-z0-9]{10}$/);
    expect(tempPassword).toMatch(/[a-z]/);
    expect(tempPassword).toMatch(/[A-Z]/);
    expect(tempPassword).toMatch(/\d/);

    expect(logsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CRFV_ACCOUNT_CREATED' }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'mary@example.com' }),
    );
  });

  test('generates sequential IDs per role prefix', async () => {
    const usersCollection = createCollection();
    const countersCollection = createCountersCollection();
    const { app } = buildApp({ usersCollection, countersCollection });

    const createPayload = (role, email) => ({
      firstName: 'Test',
      lastName: 'User',
      email,
      role,
    });

    const staffOne = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send(createPayload('staff', 'staff1@example.com'));
    const staffTwo = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send(createPayload('staff', 'staff2@example.com'));
    const managerOne = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send(createPayload('manager', 'manager1@example.com'));

    expect(staffOne.body.user.studentIDNumber).toBe('8880001');
    expect(staffTwo.body.user.studentIDNumber).toBe('8880002');
    expect(managerOne.body.user.studentIDNumber).toBe('9990001');
  });

  test('rejects account creation for roles outside staff and manager', async () => {
    const { app, usersCollection } = buildApp();

    const studentResponse = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send({
        firstName: 'Sam',
        lastName: 'Student',
        email: 'sam@example.com',
        role: 'student',
      });

    expect(studentResponse.status).toBe(400);
    expect(usersCollection.insertOne).not.toHaveBeenCalled();

    const adminResponse = await request(app)
      .post('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send({
        firstName: 'Alan',
        lastName: 'Admin',
        email: 'alan@example.com',
        role: 'admin',
      });

    expect(adminResponse.status).toBe(400);
    expect(usersCollection.insertOne).not.toHaveBeenCalled();
  });

  test('GET / with roles filter excludes admin accounts', async () => {
    const usersCollection = createCollection([
      {
        _id: new ObjectId('507f1f77bcf86cd799439021'),
        firstName: 'Sam',
        lastName: 'Staff',
        emaildb: 'sam@example.com',
        role: 'staff',
        studentIDNumber: '8880001',
      },
      {
        _id: new ObjectId('507f1f77bcf86cd799439022'),
        firstName: 'Mary',
        lastName: 'Manager',
        emaildb: 'mary@example.com',
        role: 'manager',
        studentIDNumber: '9990001',
      },
      {
        _id: new ObjectId('507f1f77bcf86cd799439023'),
        firstName: 'Alan',
        lastName: 'Admin',
        emaildb: 'alan@example.com',
        role: 'admin',
        studentIDNumber: '7770001',
      },
    ]);
    const { app } = buildApp({ usersCollection });

    const response = await request(app)
      .get('/api/admin/users')
      .query({ roles: 'staff,manager' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.users).toHaveLength(2);
    expect(response.body.users.map((user) => user.role).sort()).toEqual([
      'manager',
      'staff',
    ]);
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
        role: 'manager',
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
