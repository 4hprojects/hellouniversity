const express = require('express');
const request = require('supertest');

const mockFrom = jest.fn();
const mockLogAuditTrail = jest.fn().mockResolvedValue(undefined);
const mockCompare = jest.fn();
const mockGetMongoClient = jest.fn();
const mockUserFindOne = jest.fn();
const mockGetEventSchedule = jest.fn();
const mockDeleteEventSchedule = jest.fn();
const mockCountAttendanceMetadataByEventId = jest.fn();
const mockDeleteAttendanceMetadataByEventId = jest.fn();
const operationLog = [];

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom
  }))
}));

jest.mock('../../utils/auditTrail', () => ({
  logAuditTrail: mockLogAuditTrail
}));

jest.mock('../../utils/mongoClient', () => ({
  getMongoClient: mockGetMongoClient
}));

jest.mock('../../utils/mongoUserLookup', () => ({
  getUserNamesByStudentIDs: jest.fn().mockResolvedValue({})
}));

jest.mock('../../utils/crfvAttendanceSchedule', () => ({
  describeAttendanceSchedule: jest.fn(() => 'unchanged'),
  validateAttendanceSchedule: jest.fn(() => ({ schedule: null, errors: [] }))
}));

jest.mock('../../utils/crfvAttendanceStore', () => ({
  getAttendanceDefaults: jest.fn().mockResolvedValue({
    am_in: { start: '08:00', on_time_until: '09:15' },
    am_out: { start: '11:30' },
    pm_in: { start: '12:30', on_time_until: '13:15' },
    pm_out: { start: '16:00' }
  }),
  getEventSchedule: mockGetEventSchedule,
  getEffectiveAttendanceScheduleForEvent: jest.fn().mockResolvedValue(null),
  getEffectiveAttendanceSchedulesMap: jest.fn().mockResolvedValue(new Map()),
  upsertEventSchedule: jest.fn().mockResolvedValue(undefined),
  deleteEventSchedule: mockDeleteEventSchedule,
  countAttendanceMetadataByEventId: mockCountAttendanceMetadataByEventId,
  deleteAttendanceMetadataByEventId: mockDeleteAttendanceMetadataByEventId
}));

jest.mock('bcrypt', () => ({
  compare: mockCompare
}));

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE = 'test-role-key';

const eventsApi = require('../../routes/eventsApi');

function createAppWithSession(sessionData) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use('/api/events', eventsApi);
  return app;
}

function primeSupabase({
  eventsSelect = [],
  eventsDelete = [],
  attendeesSelect = [],
  attendeesDelete = [],
  attendanceSelect = [],
  attendanceDelete = [],
  paymentSelect = [],
  paymentDelete = []
} = {}) {
  const queues = {
    eventsSelect: [...eventsSelect],
    eventsDelete: [...eventsDelete],
    attendeesSelect: [...attendeesSelect],
    attendeesDelete: [...attendeesDelete],
    attendanceSelect: [...attendanceSelect],
    attendanceDelete: [...attendanceDelete],
    paymentSelect: [...paymentSelect],
    paymentDelete: [...paymentDelete]
  };

  mockFrom.mockImplementation(tableName => {
    if (tableName === 'events') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(async () => queues.eventsSelect.shift() || { data: null, error: null })
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(async () => {
            operationLog.push('events.delete');
            return queues.eventsDelete.shift() || { error: null };
          })
        }))
      };
    }

    if (tableName === 'attendees') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(async () => queues.attendeesSelect.shift() || { data: [], error: null })
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(async () => {
            operationLog.push('attendees.delete');
            return queues.attendeesDelete.shift() || { error: null };
          })
        }))
      };
    }

    if (tableName === 'attendance_records') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(async () => queues.attendanceSelect.shift() || { data: [], error: null })
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(async () => {
            operationLog.push('attendance_records.delete');
            return queues.attendanceDelete.shift() || { error: null };
          })
        }))
      };
    }

    if (tableName === 'payment_info') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(async () => queues.paymentSelect.shift() || { data: [], error: null })
        })),
        delete: jest.fn(() => ({
          in: jest.fn(async () => {
            operationLog.push('payment_info.delete');
            return queues.paymentDelete.shift() || { data: [], error: null };
          })
        }))
      };
    }

    throw new Error(`Unexpected Supabase table: ${tableName}`);
  });
}

describe('events delete cascade API smoke', () => {
  const adminSession = {
    userId: '507f1f77bcf86cd799439011',
    role: 'admin',
    studentIDNumber: '2024-0001'
  };

  const creatorSession = {
    userId: 'creator-1',
    role: 'manager',
    studentIDNumber: '2024-0002'
  };

  beforeEach(() => {
    operationLog.length = 0;
    mockFrom.mockReset();
    mockLogAuditTrail.mockClear();
    mockCompare.mockReset();
    mockGetMongoClient.mockReset();
    mockUserFindOne.mockReset();
    mockGetEventSchedule.mockReset();
    mockDeleteEventSchedule.mockReset();
    mockCountAttendanceMetadataByEventId.mockReset();
    mockDeleteAttendanceMetadataByEventId.mockReset();

    mockGetMongoClient.mockResolvedValue({
      db: jest.fn(() => ({
        collection: jest.fn(name => {
          if (name === 'tblUser') {
            return { findOne: mockUserFindOne };
          }
          throw new Error(`Unexpected Mongo collection: ${name}`);
        })
      }))
    });

    mockGetEventSchedule.mockResolvedValue(null);
    mockDeleteEventSchedule.mockImplementation(async () => {
      operationLog.push('event_schedule.delete');
      return 0;
    });
    mockCountAttendanceMetadataByEventId.mockResolvedValue(0);
    mockDeleteAttendanceMetadataByEventId.mockImplementation(async () => {
      operationLog.push('attendance_metadata.delete');
      return 0;
    });
  });

  test('deletes an empty event for its creator after password verification', async () => {
    primeSupabase({
      eventsSelect: [
        { data: { event_id: 'evt-1', created_by: 'creator-1', event_name: 'Forum' }, error: null }
      ],
      attendeesSelect: [{ data: [], error: null }],
      attendanceSelect: [{ data: [], error: null }],
      eventsDelete: [{ error: null }]
    });
    mockUserFindOne.mockResolvedValue({ password: 'hashed-password' });
    mockCompare.mockResolvedValue(true);

    const app = createAppWithSession(creatorSession);
    const response = await request(app)
      .delete('/api/events/evt-1')
      .send({ password: 'Pass123!' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('Event deleted.');
    expect(response.body.dependencyCounts.total).toBe(0);
  });

  test('returns structured 409 when dependent records exist and cascade is not confirmed', async () => {
    primeSupabase({
      eventsSelect: [
        { data: { event_id: 'evt-2', created_by: 'creator-1', event_name: 'Summit' }, error: null }
      ],
      attendeesSelect: [
        { data: [{ id: 'a-1', attendee_no: 'AT-1' }, { id: 'a-2', attendee_no: 'AT-2' }], error: null }
      ],
      attendanceSelect: [
        { data: [{ id: 1 }], error: null }
      ],
      paymentSelect: [{ data: [{ payment_id: 'P-1' }, { payment_id: 'P-2' }, { payment_id: 'P-3' }], error: null }]
    });
    mockUserFindOne.mockResolvedValue({ password: 'hashed-password' });
    mockCompare.mockResolvedValue(true);
    mockGetEventSchedule.mockResolvedValue({ am_in: { start: '08:00', on_time_until: '09:15' } });
    mockCountAttendanceMetadataByEventId.mockResolvedValue(2);

    const app = createAppWithSession(adminSession);
    const response = await request(app)
      .delete('/api/events/evt-2')
      .send({ password: 'Pass123!' });

    expect(response.status).toBe(409);
    expect(response.body.reason).toBe('cascade_required');
    expect(response.body.canCascade).toBe(true);
    expect(response.body.suggestArchive).toBe(true);
    expect(response.body.dependencyCounts).toEqual({
      attendees: 2,
      attendance_records: 1,
      payment_records: 3,
      event_schedule_docs: 1,
      attendance_metadata_docs: 2,
      total: 9
    });
  });

  test('blocks non-admin creator from cascade deleting an event with dependent records', async () => {
    primeSupabase({
      eventsSelect: [
        { data: { event_id: 'evt-3', created_by: 'creator-1', event_name: 'Workshop' }, error: null }
      ],
      attendeesSelect: [
        { data: [{ id: 'a-1', attendee_no: 'AT-1' }], error: null }
      ],
      attendanceSelect: [
        { data: [{ id: 1 }], error: null }
      ],
      paymentSelect: [{ data: [{ payment_id: 'P-1' }, { payment_id: 'P-2' }], error: null }]
    });
    mockUserFindOne.mockResolvedValue({ password: 'hashed-password' });
    mockCompare.mockResolvedValue(true);
    mockGetEventSchedule.mockResolvedValue({ am_in: { start: '08:00', on_time_until: '09:15' } });
    mockCountAttendanceMetadataByEventId.mockResolvedValue(1);

    const app = createAppWithSession(creatorSession);
    const response = await request(app)
      .delete('/api/events/evt-3')
      .send({ password: 'Pass123!', cascade: true });

    expect(response.status).toBe(403);
    expect(response.body.reason).toBe('cascade_admin_only');
    expect(response.body.canCascade).toBe(false);
  });

  test('rejects delete when the password is incorrect', async () => {
    primeSupabase({
      eventsSelect: [
        { data: { event_id: 'evt-4', created_by: 'creator-1', event_name: 'Expo' }, error: null }
      ]
    });
    mockUserFindOne.mockResolvedValue({ password: 'hashed-password' });
    mockCompare.mockResolvedValue(false);

    const app = createAppWithSession(adminSession);
    const response = await request(app)
      .delete('/api/events/evt-4')
      .send({ password: 'wrong-pass', cascade: true });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Incorrect password.');
  });

  test('allows admin cascade delete and removes dependent data before deleting the event', async () => {
    primeSupabase({
      eventsSelect: [
        { data: { event_id: 'evt-5', created_by: 'creator-1', event_name: 'Convention' }, error: null }
      ],
      attendeesSelect: [
        { data: [{ id: 'a-1', attendee_no: 'AT-1' }, { id: 'a-2', attendee_no: 'AT-2' }], error: null }
      ],
      attendanceSelect: [
        { data: [{ id: 1 }, { id: 2 }], error: null }
      ],
      paymentSelect: [{ data: [{ payment_id: 'P-1' }, { payment_id: 'P-2' }, { payment_id: 'P-3' }], error: null }],
      paymentDelete: [{ data: [{ payment_id: 'P-1' }, { payment_id: 'P-2' }, { payment_id: 'P-3' }], error: null }],
      attendanceDelete: [{ error: null }],
      attendeesDelete: [{ error: null }],
      eventsDelete: [{ error: null }]
    });
    mockUserFindOne.mockResolvedValue({ password: 'hashed-password' });
    mockCompare.mockResolvedValue(true);
    mockGetEventSchedule.mockResolvedValue({ am_in: { start: '08:00', on_time_until: '09:15' } });
    mockCountAttendanceMetadataByEventId.mockResolvedValue(4);
    mockDeleteEventSchedule.mockImplementation(async () => {
      operationLog.push('event_schedule.delete');
      return 1;
    });
    mockDeleteAttendanceMetadataByEventId.mockImplementation(async () => {
      operationLog.push('attendance_metadata.delete');
      return 4;
    });

    const app = createAppWithSession(adminSession);
    const response = await request(app)
      .delete('/api/events/evt-5')
      .send({ password: 'Pass123!', cascade: true });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('Event and related data deleted.');
    expect(response.body.dependencyCounts.total).toBe(12);
    expect(operationLog).toEqual([
      'attendance_records.delete',
      'attendees.delete',
      'payment_info.delete',
      'event_schedule.delete',
      'attendance_metadata.delete',
      'events.delete'
    ]);
  });
});
