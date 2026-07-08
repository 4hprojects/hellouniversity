const express = require('express');
const request = require('supertest');

const createStudentWebRoutes = require('../../routes/studentWebRoutes');
const { isAuthenticated } = require('../../middleware/routeAuthGuards');

const mockFrom = jest.fn();
const mockBcryptCompare = jest.fn();
const mockGetMongoClient = jest.fn();
const paymentInfoInCalls = [];

jest.mock('../../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}));

jest.mock('bcrypt', () => ({
  compare: (...args) => mockBcryptCompare(...args),
}));

jest.mock('../../utils/auditTrail', () => ({
  logAuditTrail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/mongoClient', () => ({
  getMongoClient: (...args) => mockGetMongoClient(...args),
}));

function createAppWithSession(sessionData, router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use('/api', router);
  return app;
}

function primeSupabase({ attendeesByEvent = {}, paymentRows = [] } = {}) {
  paymentInfoInCalls.length = 0;

  mockFrom.mockImplementation((tableName) => {
    if (tableName === 'attendees') {
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            eq: jest.fn(async (_field, eventId) => ({
              data: attendeesByEvent[eventId] || [],
              error: null,
            })),
          })),
        })),
      };
    }

    if (tableName === 'payment_info') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(async (_field, attendeeNos) => {
            paymentInfoInCalls.push([...attendeeNos]);
            return {
              data: paymentRows.filter((row) =>
                attendeeNos.includes(row.attendee_no),
              ),
              error: null,
            };
          }),
        })),
      };
    }

    throw new Error(`Unexpected Supabase table: ${tableName}`);
  });
}

function primePasswordRecord(passwordHash = 'hashed-password') {
  mockGetMongoClient.mockResolvedValue({
    db: jest.fn(() => ({
      collection: jest.fn(() => ({
        findOne: jest.fn(async () => ({ password: passwordHash })),
      })),
    })),
  });
}

function primeDeleteSupabase({ attendee } = {}) {
  const deleteCalls = [];
  const targetAttendee = attendee || {
    id: 'ATT-ID-1',
    attendee_no: 'A-DEL-1',
    first_name: 'Delete',
    last_name: 'Target',
    event_id: 'EVT-DEL',
    rfid: 'RFID-DEL',
  };

  mockFrom.mockImplementation((tableName) => {
    if (tableName === 'attendees') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(async () => ({
              data: targetAttendee,
              error: null,
            })),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(async (field, value) => {
            deleteCalls.push({ tableName, field, value });
            return { count: 1, error: null };
          }),
        })),
      };
    }

    if (tableName === 'payment_info' || tableName === 'attendance_records') {
      return {
        delete: jest.fn(() => ({
          eq: jest.fn(async (field, value) => {
            deleteCalls.push({ tableName, field, value });
            return { count: 1, error: null };
          }),
        })),
      };
    }

    throw new Error(`Unexpected Supabase table: ${tableName}`);
  });

  return { deleteCalls, attendee: targetAttendee };
}

describe('reports API smoke', () => {
  let reportsApi;

  beforeEach(() => {
    jest.resetModules();
    mockFrom.mockReset();
    mockBcryptCompare.mockReset();
    mockGetMongoClient.mockReset();
    paymentInfoInCalls.length = 0;
    reportsApi = require('../../routes/reportsApi');
  });

  test('blocks unauthenticated report access', async () => {
    const app = createAppWithSession({}, reportsApi);
    const response = await request(app).get('/api/attendees?event_id=EVT-1');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthorized',
    });
  });

  test('blocks student report access', async () => {
    const app = createAppWithSession(
      { userId: 's-1', role: 'student' },
      reportsApi,
    );
    const response = await request(app).get('/api/attendees?event_id=EVT-1');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Forbidden',
    });
  });

  test('returns event-scoped attendees with latest payment status from one batch lookup', async () => {
    primeSupabase({
      attendeesByEvent: {
        'EVT-1': [
          {
            attendee_no: 'A-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            organization: 'Math Club',
            event_id: 'EVT-1',
          },
          {
            attendee_no: 'A-2',
            first_name: 'Grace',
            last_name: 'Hopper',
            organization: 'Code Org',
            event_id: 'EVT-1',
          },
        ],
      },
      paymentRows: [
        {
          attendee_no: 'A-1',
          payment_status: 'Accounts Receivable',
          created_at: '2026-04-01T09:00:00Z',
          date_full_payment: null,
        },
        {
          attendee_no: 'A-1',
          payment_status: 'Fully Paid',
          created_at: '2026-04-02T09:00:00Z',
          date_full_payment: '2026-04-02',
        },
        {
          attendee_no: 'A-2',
          payment_status: 'Partially Paid',
          created_at: '2026-04-01T12:00:00Z',
          date_full_payment: null,
        },
      ],
    });

    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager' },
      reportsApi,
    );
    const response = await request(app).get('/api/attendees?event_id=EVT-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        attendee_no: 'A-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        organization: 'Math Club',
        event_id: 'EVT-1',
        payment_info: [
          {
            payment_status: 'Accounts Receivable',
            created_at: '2026-04-01T09:00:00Z',
          },
          { payment_status: 'Fully Paid', created_at: '2026-04-02T09:00:00Z' },
        ],
        payment_status: 'Fully Paid',
      },
      {
        attendee_no: 'A-2',
        first_name: 'Grace',
        last_name: 'Hopper',
        organization: 'Code Org',
        event_id: 'EVT-1',
        payment_info: [
          {
            payment_status: 'Partially Paid',
            created_at: '2026-04-01T12:00:00Z',
          },
        ],
        payment_status: 'Partially Paid',
      },
    ]);
    expect(paymentInfoInCalls).toEqual([['A-1', 'A-2']]);
  });

  test('filters attendees by latest payment status without falling through to the attendee detail route', async () => {
    primeSupabase({
      attendeesByEvent: {
        'EVT-2': [
          {
            attendee_no: 'A-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            organization: 'Math Club',
            event_id: 'EVT-2',
          },
          {
            attendee_no: 'A-2',
            first_name: 'Grace',
            last_name: 'Hopper',
            organization: 'Code Org',
            event_id: 'EVT-2',
          },
        ],
      },
      paymentRows: [
        {
          attendee_no: 'A-1',
          payment_status: 'Fully Paid',
          created_at: '2026-04-03T09:00:00Z',
          date_full_payment: '2026-04-03',
        },
        {
          attendee_no: 'A-2',
          payment_status: 'Accounts Receivable',
          created_at: '2026-04-03T10:00:00Z',
          date_full_payment: null,
        },
      ],
    });

    const app = createAppWithSession(
      { userId: 'a-1', role: 'admin' },
      reportsApi,
    );
    const response = await request(app).get(
      '/api/attendees/filter?event_id=EVT-2&status=Fully%20Paid',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      attendee_no: 'A-1',
      payment_status: 'Fully Paid',
    });
  });

  test('rejects payment mutations without a matching csrf token', async () => {
    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager', csrfToken: 'expected-token' },
      reportsApi,
    );
    const response = await request(app)
      .put('/api/payments/P-1')
      .send({ payment_status: 'Fully Paid' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid CSRF token.',
    });
  });

  test('rejects attendee delete without a matching csrf token', async () => {
    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager', csrfToken: 'expected-token' },
      reportsApi,
    );
    const response = await request(app)
      .delete('/api/attendees/A-DEL-1')
      .send({ password: 'AdminPass1' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid CSRF token.',
    });
  });

  test('rejects attendee delete without password', async () => {
    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager', csrfToken: 'expected-token' },
      reportsApi,
    );
    const response = await request(app)
      .delete('/api/attendees/A-DEL-1')
      .set('X-CSRF-Token', 'expected-token')
      .send({ reason: 'Duplicate registration' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Password is required.',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('rejects attendee delete without deletion reason', async () => {
    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager', csrfToken: 'expected-token' },
      reportsApi,
    );
    const response = await request(app)
      .delete('/api/attendees/A-DEL-1')
      .set('X-CSRF-Token', 'expected-token')
      .send({ password: 'AdminPass1' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Select a valid deletion reason.',
    });
    expect(mockGetMongoClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('rejects attendee delete with incorrect password', async () => {
    primePasswordRecord('hashed-admin');
    mockBcryptCompare.mockResolvedValue(false);

    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager', csrfToken: 'expected-token' },
      reportsApi,
    );
    const response = await request(app)
      .delete('/api/attendees/A-DEL-1')
      .set('X-CSRF-Token', 'expected-token')
      .send({
        password: 'WrongPass1',
        reason: 'Incorrect registration',
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Incorrect password.',
    });
    expect(mockBcryptCompare).toHaveBeenCalledWith(
      'WrongPass1',
      'hashed-admin',
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('deletes linked rows, attendee row, and logs attendee delete audit', async () => {
    const { logAuditTrail } = require('../../utils/auditTrail');
    primePasswordRecord('hashed-admin');
    mockBcryptCompare.mockResolvedValue(true);
    const { deleteCalls } = primeDeleteSupabase();

    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager', csrfToken: 'expected-token' },
      reportsApi,
    );
    const response = await request(app)
      .delete('/api/attendees/A-DEL-1')
      .set('X-CSRF-Token', 'expected-token')
      .send({
        password: 'AdminPass1',
        reason: 'Duplicate registration',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      deleted: {
        paymentInfo: 1,
        attendanceRecords: 4,
        attendees: 1,
      },
    });
    expect(deleteCalls).toEqual([
      { tableName: 'payment_info', field: 'attendee_no', value: 'A-DEL-1' },
      {
        tableName: 'attendance_records',
        field: 'attendee_id',
        value: 'ATT-ID-1',
      },
      {
        tableName: 'attendance_records',
        field: 'attendee_no',
        value: 'A-DEL-1',
      },
      { tableName: 'attendance_records', field: 'rfid', value: 'RFID-DEL' },
      { tableName: 'attendance_records', field: 'raw_rfid', value: 'RFID-DEL' },
      { tableName: 'attendees', field: 'attendee_no', value: 'A-DEL-1' },
    ]);
    expect(logAuditTrail).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'Delete Attendee',
        details: expect.stringContaining('reason: Duplicate registration'),
      }),
    );
  });

  test('returns 404 when deleting a missing attendee', async () => {
    primePasswordRecord('hashed-admin');
    mockBcryptCompare.mockResolvedValue(true);
    mockFrom.mockImplementation((tableName) => {
      if (tableName === 'attendees') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected Supabase table: ${tableName}`);
    });

    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager', csrfToken: 'expected-token' },
      reportsApi,
    );
    const response = await request(app)
      .delete('/api/attendees/MISSING-1')
      .set('X-CSRF-Token', 'expected-token')
      .send({
        password: 'AdminPass1',
        reason: 'Requested cancellation',
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Attendee not found.',
    });
  });
});

describe('reports API route mounting does not shadow other /api routers', () => {
  let reportsApi;

  function emptyCursor() {
    return { project: () => emptyCursor(), toArray: async () => [] };
  }

  function buildEmptyMongoClient() {
    return {
      db() {
        return {
          collection() {
            return { find: () => emptyCursor() };
          },
        };
      },
    };
  }

  function buildAppInProductionMountOrder(sessionData) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.session = sessionData;
      next();
    });
    // Mirrors app/registerRoutes.js: app.use('/api', reportsApi) is registered
    // before app.use(createStudentWebRoutes(...)).
    app.use('/api', reportsApi);
    app.use(
      createStudentWebRoutes({
        projectRoot: process.cwd(),
        client: buildEmptyMongoClient(),
        isAuthenticated,
        getUsersCollection: () => null,
        getLogsCollection: () => null,
      }),
    );
    return app;
  }

  beforeEach(() => {
    jest.resetModules();
    mockFrom.mockReset();
    paymentInfoInCalls.length = 0;
    reportsApi = require('../../routes/reportsApi');
  });

  test('lets a non-privileged student session reach /api/student/classes instead of being blocked by the reports guard', async () => {
    const app = buildAppInProductionMountOrder({
      userId: 's-1',
      role: 'student',
      studentIDNumber: '2024-00123',
    });

    const response = await request(app).get('/api/student/classes');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('still blocks non-privileged sessions from the reports router’s own routes', async () => {
    const app = buildAppInProductionMountOrder({
      userId: 's-1',
      role: 'student',
    });

    const response = await request(app).get('/api/attendees?event_id=EVT-1');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Forbidden',
    });
  });
});
