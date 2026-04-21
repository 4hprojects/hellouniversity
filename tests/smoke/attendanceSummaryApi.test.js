const express = require('express');
const request = require('supertest');

let mockEventResult;
let mockEventsResult;
let mockTotalAttendeesResult;
let mockRecordsResult;
let mockAttendeePageResult;
const mockBuilders = [];
const mockEnrichAttendanceRecords = jest.fn((records) => Promise.resolve(records));

function createBuilder(table) {
  const builder = {
    table,
    selectArgs: null,
    eqCalls: [],
    orCalls: [],
    orderCalls: [],
    rangeCalls: [],
    select: jest.fn((...args) => {
      builder.selectArgs = args;
      return builder;
    }),
    eq: jest.fn((...args) => {
      builder.eqCalls.push(args);
      return builder;
    }),
    or: jest.fn((...args) => {
      builder.orCalls.push(args);
      return builder;
    }),
    order: jest.fn((...args) => {
      builder.orderCalls.push(args);
      return builder;
    }),
    range: jest.fn((...args) => {
      builder.rangeCalls.push(args);
      return Promise.resolve(resolveBuilderResult(builder));
    }),
    maybeSingle: jest.fn(() => Promise.resolve(resolveEventSingleResult())),
    then: (resolve, reject) =>
      Promise.resolve(resolveBuilderResult(builder)).then(resolve, reject),
  };
  mockBuilders.push(builder);
  return builder;
}

const mockSupabaseFrom = jest.fn((table) => createBuilder(table));

jest.mock('../../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockSupabaseFrom(...args),
  },
}));

jest.mock('../../utils/crfvAttendanceRecordEnrichment', () => ({
  enrichAttendanceRecords: (...args) => mockEnrichAttendanceRecords(...args),
}));

function resolveEventSingleResult() {
  return mockEventResult;
}

function isHeadCountQuery(builder) {
  return Boolean(builder.selectArgs?.[1]?.head);
}

function resolveBuilderResult(builder) {
  if (builder.table === 'events') {
    return mockEventsResult;
  }
  if (builder.table === 'attendees' && isHeadCountQuery(builder)) {
    return mockTotalAttendeesResult;
  }
  if (builder.table === 'attendees') {
    return mockAttendeePageResult;
  }
  if (builder.table === 'attendance_records') {
    return mockRecordsResult;
  }
  return { data: [], error: null, count: 0 };
}

function createAppWithSession(sessionData, router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use('/api/attendance-summary', router);
  return app;
}

function findBuilder(table, predicate = () => true) {
  return mockBuilders.find(
    (builder) => builder.table === table && predicate(builder),
  );
}

describe('attendance summary API smoke', () => {
  let attendanceSummaryApi;

  beforeEach(() => {
    jest.resetModules();
    mockBuilders.length = 0;
    mockSupabaseFrom.mockClear();
    mockEnrichAttendanceRecords.mockClear();
    mockEventResult = {
      data: {
        event_id: 'E1',
        event_name: 'CRFV Test Event',
        start_date: '2026-04-20',
        end_date: '2026-04-22',
      },
      error: null,
    };
    mockEventsResult = {
      data: [
        {
          event_id: 'E1',
          event_name: 'CRFV Test Event',
          start_date: '2026-04-20',
          end_date: '2026-04-22',
        },
      ],
      error: null,
    };
    mockTotalAttendeesResult = { data: null, error: null, count: 2 };
    mockRecordsResult = {
      data: [
        {
          id: 10,
          attendee_id: 1,
          slot: 'AM IN',
          time: '08:00:00.000',
          date: '2026-04-21',
          event_id: 'E1',
          punctuality_status: 'on_time',
          late_minutes: 0,
        },
        {
          id: 11,
          attendee_id: 1,
          slot: 'PM IN',
          time: '13:15:00.000',
          date: '2026-04-21',
          event_id: 'E1',
          punctuality_status: 'late',
          late_minutes: 15,
        },
      ],
      error: null,
    };
    mockAttendeePageResult = {
      data: [
        {
          id: 1,
          attendee_no: 'A001',
          first_name: 'Kayla',
          last_name: 'Ryhs',
          email: 'kayla@example.com',
          event_id: 'E1',
        },
      ],
      error: null,
      count: 1,
    };
    attendanceSummaryApi = require('../../routes/attendanceSummaryApi');
  });

  test('blocks logged-out attendance summary reads', async () => {
    const app = createAppWithSession({}, attendanceSummaryApi);
    const response = await request(app).get(
      '/api/attendance-summary?event_id=E1&date=2026-04-21',
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthorized',
    });
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test('blocks ordinary users from attendance summary reads', async () => {
    const app = createAppWithSession(
      { userId: 'U1', role: 'user' },
      attendanceSummaryApi,
    );
    const response = await request(app).get(
      '/api/attendance-summary?event_id=E1&date=2026-04-21',
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Forbidden',
    });
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test('validates required event and date params', async () => {
    const app = createAppWithSession(
      { userId: 'A1', role: 'admin' },
      attendanceSummaryApi,
    );

    const missingResponse = await request(app).get('/api/attendance-summary');
    const invalidDateResponse = await request(app).get(
      '/api/attendance-summary?event_id=E1&date=04-21-2026',
    );

    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body).toEqual({ error: 'Missing event_id or date' });
    expect(invalidDateResponse.status).toBe(400);
    expect(invalidDateResponse.body).toEqual({ error: 'Invalid date format' });
  });

  test('rejects dates outside the selected event range', async () => {
    const app = createAppWithSession(
      { userId: 'A1', role: 'admin' },
      attendanceSummaryApi,
    );
    const response = await request(app).get(
      '/api/attendance-summary?event_id=E1&date=2026-04-30',
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'Selected date is outside the event date range.',
    );
  });

  test('returns events with date bounds ordered newest first', async () => {
    const app = createAppWithSession(
      { userId: 'A1', role: 'admin' },
      attendanceSummaryApi,
    );
    const response = await request(app).get('/api/attendance-summary/all-events');

    expect(response.status).toBe(200);
    expect(response.body.events).toEqual(mockEventsResult.data);
    const eventsBuilder = findBuilder('events');
    expect(eventsBuilder.select).toHaveBeenCalledWith(
      'event_id, event_name, start_date, end_date',
    );
    expect(eventsBuilder.order).toHaveBeenCalledWith('start_date', {
      ascending: false,
    });
  });

  test('applies search, sort, page, and limit safely', async () => {
    const app = createAppWithSession(
      { userId: 'M1', role: 'manager' },
      attendanceSummaryApi,
    );
    const response = await request(app).get(
      '/api/attendance-summary?event_id=E1&date=2026-04-21&search=Kayla%,Ryhs&sortField=attendee_no&sortOrder=desc&page=2&limit=2500',
    );

    expect(response.status).toBe(200);
    const pageBuilder = findBuilder(
      'attendees',
      (builder) => !isHeadCountQuery(builder),
    );
    expect(pageBuilder.or).toHaveBeenCalledWith(
      'attendee_no.ilike.%Kayla Ryhs%,first_name.ilike.%Kayla Ryhs%,last_name.ilike.%Kayla Ryhs%,email.ilike.%Kayla Ryhs%',
    );
    expect(pageBuilder.order).toHaveBeenCalledWith('attendee_no', {
      ascending: false,
    });
    expect(pageBuilder.range).toHaveBeenCalledWith(1000, 1999);
  });

  test('preserves row fields and returns counters metadata', async () => {
    const app = createAppWithSession(
      { userId: 'A1', role: 'admin' },
      attendanceSummaryApi,
    );
    const response = await request(app).get(
      '/api/attendance-summary?event_id=E1&date=2026-04-21',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      count: 1,
      totalPages: 1,
      page: 1,
      limit: 50,
      allAttendeesCount: 2,
      event: mockEventResult.data,
      counters: {
        totalAttendees: 2,
        amIn: 1,
        amOut: 0,
        pmIn: 1,
        pmOut: 0,
        amInOnTime: 1,
        amInLate: 0,
        pmInOnTime: 0,
        pmInLate: 1,
      },
    });
    expect(response.body.summary).toEqual([
      {
        attendee_id: 1,
        attendee_no: 'A001',
        first_name: 'Kayla',
        last_name: 'Ryhs',
        email: 'kayla@example.com',
        event_name: 'CRFV Test Event',
        date: '2026-04-21',
        am_in: '08:00:00.000',
        am_out: '',
        pm_in: '13:15:00.000',
        pm_out: '',
        am_in_status: 'on_time',
        pm_in_status: 'late',
        am_in_late_minutes: 0,
        pm_in_late_minutes: 15,
        attendance_status: '2 of 4',
      },
    ]);
    expect(mockEnrichAttendanceRecords).toHaveBeenCalledWith(
      mockRecordsResult.data,
    );
  });
});
