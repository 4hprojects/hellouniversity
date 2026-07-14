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
    return expected.$in.some((item) => valueMatches(actual, item));
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
    deleteMany: jest.fn(async (criteria) => {
      const beforeCount = docs.length;
      for (let index = docs.length - 1; index >= 0; index -= 1) {
        if (matches(docs[index], criteria)) {
          docs.splice(index, 1);
        }
      }
      return {
        acknowledged: true,
        deletedCount: beforeCount - docs.length,
      };
    }),
    countDocuments: jest.fn(
      async (criteria) => docs.filter((doc) => matches(doc, criteria)).length,
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
    const { app, usersCollection, logsCollection, bcrypt, sendEmail } =
      buildApp();

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
    expect(insertedUser.crfvFeatureAccess).toEqual(
      expect.arrayContaining([
        'event_create',
        'reports',
        'payment_audits',
        'account_management',
      ]),
    );
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

  test('manager account lists staff accounts only', async () => {
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
    ]);
    const { app } = buildApp({
      sessionData: {
        userId: '507f1f77bcf86cd799439030',
        role: 'manager',
        csrfToken: 'csrf-1',
      },
      usersCollection,
    });

    const response = await request(app).get('/api/admin/users');

    expect(response.status).toBe(200);
    expect(response.body.users).toHaveLength(1);
    expect(response.body.users[0].role).toBe('staff');
  });

  test('account audit trail returns recent account-management changes', async () => {
    const logsCollection = createCollection([
      {
        _id: new ObjectId('507f1f77bcf86cd799439041'),
        studentIDNumber: 'admin-1',
        name: 'Ada Admin',
        timestamp: new Date('2026-07-01T08:00:00Z'),
        action: 'CRFV_ACCOUNT_CREATED',
        targetStudentIDNumber: '8880001',
        targetName: 'Sam Staff',
        targetRole: 'staff',
        details: 'Created CRFV staff account.',
      },
      {
        _id: new ObjectId('507f1f77bcf86cd799439042'),
        studentIDNumber: 'admin-1',
        name: 'Ada Admin',
        timestamp: new Date('2026-07-01T09:00:00Z'),
        action: 'UNRELATED_ACTION',
        targetStudentIDNumber: '8880001',
      },
    ]);
    const { app } = buildApp({ logsCollection });

    const response = await request(app).get(
      '/api/admin/users/audit-trail?targetStudentIDNumber=8880001',
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.logs).toHaveLength(1);
    expect(response.body.logs[0]).toMatchObject({
      action: 'CRFV_ACCOUNT_CREATED',
      targetStudentIDNumber: '8880001',
      targetName: 'Sam Staff',
    });
    expect(response.body.actions).toContain('CRFV_FEATURE_ACCESS_UPDATED');
  });

  test('admin can update CRFV feature access for staff account', async () => {
    const targetId = new ObjectId('507f1f77bcf86cd799439024');
    const usersCollection = createCollection([
      {
        _id: targetId,
        firstName: 'Sam',
        lastName: 'Staff',
        emaildb: 'sam@example.com',
        role: 'staff',
        studentIDNumber: '8880001',
        crfvFeatureAccess: ['attendance'],
      },
    ]);
    const { app, logsCollection } = buildApp({ usersCollection });

    const response = await request(app)
      .put(`/api/admin/users/${targetId.toString()}/crfv-features`)
      .set('x-csrf-token', 'csrf-1')
      .send({ features: ['attendance', 'reports'] });

    expect(response.status).toBe(200);
    expect(response.body.user.crfvFeatureAccess).toEqual([
      'attendance',
      'reports',
    ]);
    expect(usersCollection.docs[0].crfvFeatureAccess).toEqual([
      'attendance',
      'reports',
    ]);
    expect(logsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CRFV_FEATURE_ACCESS_UPDATED' }),
    );
  });

  test('manager can update staff feature access but not manager targets', async () => {
    const staffId = new ObjectId('507f1f77bcf86cd799439025');
    const managerId = new ObjectId('507f1f77bcf86cd799439026');
    const usersCollection = createCollection([
      {
        _id: staffId,
        firstName: 'Sam',
        lastName: 'Staff',
        role: 'staff',
        studentIDNumber: '8880001',
      },
      {
        _id: managerId,
        firstName: 'Mary',
        lastName: 'Manager',
        role: 'manager',
        studentIDNumber: '9990001',
      },
    ]);
    const { app } = buildApp({
      sessionData: {
        userId: '507f1f77bcf86cd799439030',
        role: 'manager',
        studentIDNumber: '9999999',
        firstName: 'Manny',
        lastName: 'Manager',
        csrfToken: 'csrf-1',
      },
      usersCollection,
    });

    const staffResponse = await request(app)
      .put(`/api/admin/users/${staffId.toString()}/crfv-features`)
      .set('x-csrf-token', 'csrf-1')
      .send({ features: ['attendance'] });
    const managerResponse = await request(app)
      .put(`/api/admin/users/${managerId.toString()}/crfv-features`)
      .set('x-csrf-token', 'csrf-1')
      .send({ features: ['attendance'] });

    expect(staffResponse.status).toBe(200);
    expect(managerResponse.status).toBe(403);
  });

  test('rejects invalid CRFV feature keys', async () => {
    const targetId = new ObjectId('507f1f77bcf86cd799439027');
    const usersCollection = createCollection([
      {
        _id: targetId,
        firstName: 'Sam',
        lastName: 'Staff',
        role: 'staff',
        studentIDNumber: '8880001',
      },
    ]);
    const { app } = buildApp({ usersCollection });

    const response = await request(app)
      .put(`/api/admin/users/${targetId.toString()}/crfv-features`)
      .set('x-csrf-token', 'csrf-1')
      .send({ features: ['attendance', 'unknown_feature'] });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('unknown_feature');
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

  test('reset fields and delete actions write account audit logs', async () => {
    const targetId = new ObjectId('507f1f77bcf86cd799439016');
    const usersCollection = createCollection([
      {
        _id: targetId,
        firstName: 'Sam',
        lastName: 'Staff',
        studentIDNumber: '8880001',
        role: 'staff',
      },
    ]);
    const { app, logsCollection } = buildApp({ usersCollection });

    const resetResponse = await request(app)
      .put('/api/admin/users/reset-fields')
      .set('x-csrf-token', 'csrf-1')
      .send({ userIds: [targetId.toString()] });
    const deleteResponse = await request(app)
      .delete('/api/admin/users')
      .set('x-csrf-token', 'csrf-1')
      .send({ userIds: [targetId.toString()] });

    expect(resetResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(logsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CRFV_ACCOUNT_RECOVERY_FIELDS_RESET',
        targetStudentIDNumber: '8880001',
      }),
    );
    expect(logsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CRFV_ACCOUNT_DELETED',
        targetStudentIDNumber: '8880001',
      }),
    );
  });

  test('admin can suspend a CRFV account with password and reason audit log', async () => {
    const adminId = new ObjectId('507f1f77bcf86cd799439011');
    const targetId = new ObjectId('507f1f77bcf86cd799439017');
    const usersCollection = createCollection([
      {
        _id: adminId,
        firstName: 'Ada',
        lastName: 'Admin',
        studentIDNumber: 'admin-1',
        role: 'admin',
        password: 'hashed-admin',
      },
      {
        _id: targetId,
        firstName: 'Sam',
        lastName: 'Staff',
        studentIDNumber: '8880001',
        emaildb: 'sam@example.com',
        role: 'staff',
      },
    ]);
    const { app, logsCollection, bcrypt } = buildApp({ usersCollection });

    const response = await request(app)
      .post(`/api/admin/users/${targetId.toString()}/account-action`)
      .set('x-csrf-token', 'csrf-1')
      .send({
        action: 'suspend',
        reason: 'Security concern',
        adminPassword: 'AdminPass1',
      });

    expect(response.status).toBe(200);
    expect(bcrypt.compare).toHaveBeenCalledWith('AdminPass1', 'hashed-admin');
    expect(
      usersCollection.docs.find((doc) => doc._id === targetId),
    ).toMatchObject({
      accountDisabled: true,
      accountSuspensionReason: 'Security concern',
    });
    expect(logsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CRFV_ACCOUNT_SUSPENDED',
        targetStudentIDNumber: '8880001',
        reason: 'Security concern',
      }),
    );
  });

  test('admin can delete a CRFV account with custom reason audit log', async () => {
    const adminId = new ObjectId('507f1f77bcf86cd799439011');
    const targetId = new ObjectId('507f1f77bcf86cd799439018');
    const usersCollection = createCollection([
      {
        _id: adminId,
        firstName: 'Ada',
        lastName: 'Admin',
        studentIDNumber: 'admin-1',
        role: 'admin',
        password: 'hashed-admin',
      },
      {
        _id: targetId,
        firstName: 'Mina',
        lastName: 'Manager',
        studentIDNumber: '9990001',
        role: 'manager',
      },
    ]);
    const { app, logsCollection } = buildApp({ usersCollection });

    const response = await request(app)
      .post(`/api/admin/users/${targetId.toString()}/account-action`)
      .set('x-csrf-token', 'csrf-1')
      .send({
        action: 'delete',
        reason: 'Other',
        otherReason: 'Created in error',
        adminPassword: 'AdminPass1',
      });

    expect(response.status).toBe(200);
    expect(
      usersCollection.docs.find((doc) => doc._id === targetId),
    ).toBeUndefined();
    expect(logsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CRFV_ACCOUNT_DELETED',
        targetStudentIDNumber: '9990001',
        reason: 'Created in error',
      }),
    );
  });

  test('account action rejects incorrect admin password', async () => {
    const adminId = new ObjectId('507f1f77bcf86cd799439011');
    const targetId = new ObjectId('507f1f77bcf86cd799439019');
    const usersCollection = createCollection([
      {
        _id: adminId,
        firstName: 'Ada',
        lastName: 'Admin',
        studentIDNumber: 'admin-1',
        role: 'admin',
        password: 'hashed-admin',
      },
      {
        _id: targetId,
        firstName: 'Sam',
        lastName: 'Staff',
        studentIDNumber: '8880002',
        role: 'staff',
      },
    ]);
    const { app, logsCollection } = buildApp({
      usersCollection,
      bcrypt: {
        hash: jest.fn(async (value) => `hashed-${value}`),
        compare: jest.fn(async () => false),
      },
    });

    const response = await request(app)
      .post(`/api/admin/users/${targetId.toString()}/account-action`)
      .set('x-csrf-token', 'csrf-1')
      .send({
        action: 'suspend',
        reason: 'Security concern',
        adminPassword: 'wrong',
      });

    expect(response.status).toBe(401);
    expect(logsCollection.insertOne).not.toHaveBeenCalled();
    expect(
      usersCollection.docs.find((doc) => doc._id === targetId),
    ).not.toHaveProperty('accountDisabled');
  });
});
