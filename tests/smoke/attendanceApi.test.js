const express = require('express');
const request = require('supertest');

const mockFrom = jest.fn();
const mockGetEffectiveAttendanceScheduleForEvent = jest.fn();
const mockUpsertAttendanceMetadata = jest.fn();
const mockRelayAttendanceToSheets = jest.fn();
const mockCalculatePunctuality = jest.fn();
const mockNormalizeAttendanceSchedule = jest.fn();
const mockResolveAttendanceSlot = jest.fn();

jest.mock('../../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}));

jest.mock('../../utils/crfvAttendanceStore', () => ({
  getEffectiveAttendanceScheduleForEvent: (...args) =>
    mockGetEffectiveAttendanceScheduleForEvent(...args),
  upsertAttendanceMetadata: (...args) => mockUpsertAttendanceMetadata(...args),
}));

jest.mock('../../utils/crfvAttendanceSchedule', () => ({
  calculatePunctuality: (...args) => mockCalculatePunctuality(...args),
  normalizeAttendanceSchedule: (...args) =>
    mockNormalizeAttendanceSchedule(...args),
  resolveAttendanceSlot: (...args) => mockResolveAttendanceSlot(...args),
}));

jest.mock('../../utils/attendanceSheetsRelay', () => ({
  relayAttendanceToSheets: (...args) => mockRelayAttendanceToSheets(...args),
}));

jest.mock('../../utils/crfvAttendanceRecordEnrichment', () => ({
  enrichAttendanceRecords: jest.fn(async (rows) => rows),
}));

function createAppWithSession(sessionData, router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use('/api/attendance', router);
  return app;
}

function primeSupabaseForAttendanceWrite() {
  mockFrom.mockImplementation((tableName) => {
    if (tableName === 'attendees') {
      const query = {
        eq: jest.fn(() => query),
        or: jest.fn(() => query),
        limit: jest.fn(async () => ({
          data: [{ id: 'attendee-row-1' }],
          error: null,
        })),
      };

      return {
        select: jest.fn(() => query),
      };
    }

    if (tableName === 'attendance_records') {
      return {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            maybeSingle: jest.fn(async () => ({
              data: {
                id: 'record-1',
                event_id: 'EVT-1',
                slot: 'AM IN',
                time: '08:05:00.000',
                date: '2026-04-20',
                raw_rfid: 'RF-1',
                raw_first_name: 'Ada',
                raw_last_name: 'Lovelace',
                is_unregistered: false,
                attendee_id: 'attendee-row-1',
              },
              error: null,
            })),
          })),
        })),
      };
    }

    throw new Error(`Unexpected Supabase table: ${tableName}`);
  });
}

describe('attendance API smoke', () => {
  let attendanceApi;

  beforeEach(() => {
    jest.resetModules();
    mockFrom.mockReset();
    mockGetEffectiveAttendanceScheduleForEvent.mockResolvedValue({
      am_in: { start: '08:00', on_time_until: '09:15' },
      am_out: { start: '11:30' },
      pm_in: { start: '12:30', on_time_until: '13:15' },
      pm_out: { start: '16:00' },
    });
    mockUpsertAttendanceMetadata.mockResolvedValue(undefined);
    mockRelayAttendanceToSheets.mockResolvedValue(undefined);
    mockCalculatePunctuality.mockReturnValue({
      punctuality_status: 'on_time',
      late_minutes: 0,
    });
    mockNormalizeAttendanceSchedule.mockImplementation((schedule) => schedule);
    mockResolveAttendanceSlot.mockReturnValue('AM IN');
    attendanceApi = require('../../routes/attendanceApi');
  });

  test('blocks unauthenticated attendance reads', async () => {
    const app = createAppWithSession({}, attendanceApi);
    const response = await request(app).get('/api/attendance/latest-event');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthorized',
    });
  });

  test('blocks unauthenticated attendance writes', async () => {
    const app = createAppWithSession({}, attendanceApi);
    const response = await request(app)
      .post('/api/attendance')
      .send({ attendee_no: 'A-1', event_id: 'EVT-1' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthorized',
    });
  });

  test('requires csrf for attendance writes', async () => {
    const app = createAppWithSession(
      { userId: 'u-1', role: 'user', csrfToken: 'expected-token' },
      attendanceApi,
    );
    const response = await request(app)
      .post('/api/attendance')
      .send({ attendee_no: 'A-1', event_id: 'EVT-1' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid CSRF token.',
    });
  });

  test('returns success without waiting for the sheets relay to finish', async () => {
    primeSupabaseForAttendanceWrite();
    mockRelayAttendanceToSheets.mockImplementation(() => new Promise(() => {}));

    const app = createAppWithSession(
      { userId: 'u-1', role: 'user', csrfToken: 'csrf-1' },
      attendanceApi,
    );
    const response = await request(app)
      .post('/api/attendance')
      .set('x-csrf-token', 'csrf-1')
      .send({
        attendee_no: 'A-1',
        event_id: 'EVT-1',
        rfid: 'RF-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        date: '2026-04-20',
        time: '08:05:00.000',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      record: {
        id: 'record-1',
        event_id: 'EVT-1',
        slot: 'AM IN',
        time: '08:05:00.000',
        date: '2026-04-20',
        raw_rfid: 'RF-1',
        raw_first_name: 'Ada',
        raw_last_name: 'Lovelace',
        is_unregistered: false,
        attendee_id: 'attendee-row-1',
        punctuality_status: 'on_time',
        late_minutes: 0,
      },
    });
    expect(mockUpsertAttendanceMetadata).toHaveBeenCalledTimes(1);
    expect(mockRelayAttendanceToSheets).toHaveBeenCalledTimes(1);
  });
});
