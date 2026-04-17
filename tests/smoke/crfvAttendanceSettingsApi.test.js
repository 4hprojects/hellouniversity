const express = require('express');
const request = require('supertest');

jest.mock('../../utils/auditTrail', () => ({
  logAuditTrail: jest.fn().mockResolvedValue(undefined)
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

describe('CRFV attendance defaults API smoke', () => {
  let crfvSettingsApi;
  let attendanceStore;

  beforeEach(() => {
    jest.resetModules();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE = 'test-role-key';
    crfvSettingsApi = require('../../routes/crfvSettingsApi');
    attendanceStore = require('../../utils/crfvAttendanceStore');
    attendanceStore.__resetTestState();
  });

  test('blocks unauthenticated access', async () => {
    const app = createAppWithSession({}, crfvSettingsApi);
    const response = await request(app).get('/api/crfv/settings/attendance-defaults');
    expect(response.status).toBe(401);
  });

  test('blocks student from updating defaults', async () => {
    const app = createAppWithSession({ userId: 's-1', role: 'student' }, crfvSettingsApi);
    const response = await request(app)
      .put('/api/crfv/settings/attendance-defaults')
      .send({ attendance_schedule: {} });

    expect(response.status).toBe(403);
  });

  test('returns seeded defaults for manager', async () => {
    const app = createAppWithSession({ userId: 'm-1', role: 'manager' }, crfvSettingsApi);
    const response = await request(app).get('/api/crfv/settings/attendance-defaults');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.attendance_schedule.am_in.start).toBe('08:00');
    expect(response.body.attendance_schedule.am_in.on_time_until).toBe('09:15');
    expect(response.body.attendance_schedule.am_out.start).toBe('11:30');
    expect(response.body.attendance_schedule.pm_in.start).toBe('12:30');
    expect(response.body.attendance_schedule.pm_in.on_time_until).toBe('13:15');
    expect(response.body.attendance_schedule.pm_out.start).toBe('16:00');
  });

  test('rejects invalid schedules', async () => {
    const app = createAppWithSession({ userId: 'a-1', role: 'admin' }, crfvSettingsApi);
    const response = await request(app)
      .put('/api/crfv/settings/attendance-defaults')
      .send({
        attendance_schedule: {
          am_in: { start: '11:00', on_time_until: '09:00' },
          am_out: { start: '12:00' },
          pm_in: { start: '13:00', on_time_until: '13:00' },
          pm_out: { start: '17:00' }
        }
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('persists updated defaults for admin', async () => {
    const app = createAppWithSession({ userId: 'a-1', role: 'admin' }, crfvSettingsApi);
    const nextSchedule = {
      am_in: { start: '07:30', on_time_until: '08:45' },
      am_out: { start: '12:15' },
      pm_in: { start: '13:15', on_time_until: '13:30' },
      pm_out: { start: '17:30' }
    };

    const updateResponse = await request(app)
      .put('/api/crfv/settings/attendance-defaults')
      .send({ attendance_schedule: nextSchedule });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.attendance_schedule.am_in.start).toBe('07:30');

    const readResponse = await request(app).get('/api/crfv/settings/attendance-defaults');
    expect(readResponse.status).toBe(200);
    expect(readResponse.body.attendance_schedule.am_out.start).toBe('12:15');
    expect(readResponse.body.attendance_schedule.pm_in.on_time_until).toBe('13:30');
  });
});
