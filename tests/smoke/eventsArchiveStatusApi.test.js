const express = require('express');
const request = require('supertest');

const mockFrom = jest.fn();
const mockLogAuditTrail = jest.fn().mockResolvedValue(undefined);
const mockCompare = jest.fn();
const mockFindOne = jest.fn();
const mockGetMongoClient = jest.fn();

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
  getEventSchedule: jest.fn().mockResolvedValue(null),
  getEffectiveAttendanceScheduleForEvent: jest.fn().mockResolvedValue(null),
  getEffectiveAttendanceSchedulesMap: jest.fn().mockResolvedValue(new Map()),
  upsertEventSchedule: jest.fn().mockResolvedValue(undefined),
  deleteEventSchedule: jest.fn().mockResolvedValue(0),
  countAttendanceMetadataByEventId: jest.fn().mockResolvedValue(0),
  deleteAttendanceMetadataByEventId: jest.fn().mockResolvedValue(0)
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

function primeEventsTable({ selectQueue = [], updateQueue = [] } = {}) {
  const pendingSelects = [...selectQueue];
  const pendingUpdates = [...updateQueue];

  mockFrom.mockImplementation(tableName => {
    if (tableName !== 'events') {
      throw new Error(`Unexpected Supabase table: ${tableName}`);
    }

    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => pendingSelects.shift() || { data: null, error: null })
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            maybeSingle: jest.fn(async () => pendingUpdates.shift() || { data: null, error: null })
          }))
        }))
      }))
    };
  });
}

describe('events archive status API smoke', () => {
  const managerSession = {
    userId: '507f1f77bcf86cd799439011',
    role: 'manager',
    studentIDNumber: '2024-0001'
  };

  beforeEach(() => {
    mockFrom.mockReset();
    mockLogAuditTrail.mockClear();
    mockCompare.mockReset();
    mockFindOne.mockReset();
    mockGetMongoClient.mockReset();
    mockGetMongoClient.mockResolvedValue({
      db: jest.fn(() => ({
        collection: jest.fn(() => ({
          findOne: mockFindOne
        }))
      }))
    });
  });

  test('requires a password before archiving an event', async () => {
    primeEventsTable({
      selectQueue: [
        { data: { event_id: 'evt-1', event_name: 'Annual Forum', status: 'active' }, error: null }
      ]
    });

    const app = createAppWithSession(managerSession);
    const response = await request(app)
      .patch('/api/events/evt-1/status')
      .send({ status: 'archived' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Password is required.');
    expect(mockCompare).not.toHaveBeenCalled();
  });

  test('rejects archiving when the password is incorrect', async () => {
    primeEventsTable({
      selectQueue: [
        { data: { event_id: 'evt-2', event_name: 'Leadership Summit', status: 'active' }, error: null }
      ]
    });
    mockFindOne.mockResolvedValue({ password: 'hashed-password' });
    mockCompare.mockResolvedValue(false);

    const app = createAppWithSession(managerSession);
    const response = await request(app)
      .patch('/api/events/evt-2/status')
      .send({ status: 'archived', password: 'wrong-pass' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Incorrect password.');
    expect(mockCompare).toHaveBeenCalledWith('wrong-pass', 'hashed-password');
  });

  test('archives the event after the password is verified', async () => {
    primeEventsTable({
      selectQueue: [
        { data: { event_id: 'evt-3', event_name: 'Community Outreach', status: 'active' }, error: null }
      ],
      updateQueue: [
        { data: { event_id: 'evt-3', event_name: 'Community Outreach', status: 'archived' }, error: null }
      ]
    });
    mockFindOne.mockResolvedValue({ password: 'hashed-password' });
    mockCompare.mockResolvedValue(true);

    const app = createAppWithSession(managerSession);
    const response = await request(app)
      .patch('/api/events/evt-3/status')
      .send({ status: 'archived', password: 'Pass123!' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.event.status).toBe('archived');
    expect(mockCompare).toHaveBeenCalledWith('Pass123!', 'hashed-password');
  });
});
