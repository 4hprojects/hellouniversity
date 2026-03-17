const path = require('path');
const express = require('express');
const request = require('supertest');
const createCrfvPagesRoutes = require('../../routes/crfvPagesRoutes');
const {
  isAuthenticated,
  isAdminOrManager
} = require('../../middleware/routeAuthGuards');

function buildCrfvPagesApp(sessionData = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use(createCrfvPagesRoutes({
    projectRoot: process.cwd(),
    isAuthenticated,
    isAdminOrManager
  }));
  return app;
}

describe('CRFV route access smoke', () => {
  const originalEnv = process.env;
  let auditTrailApi;
  let attendanceSummaryApi;
  let paymentsReportsApi;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE: 'test-role-key',
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test'
    };
    jest.resetModules();
    auditTrailApi = require('../../routes/auditTrailApi');
    attendanceSummaryApi = require('../../routes/attendanceSummaryApi');
    paymentsReportsApi = require('../../routes/paymentsReportsApi');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('public CRFV pages render when logged out', async () => {
    const app = buildCrfvPagesApp({});

    const indexRes = await request(app).get('/crfv/index');
    const attendanceRes = await request(app).get('/crfv/attendance');
    const userRegisterRes = await request(app).get('/crfv/user-register');

    expect(indexRes.status).toBe(200);
    expect(attendanceRes.status).toBe(200);
    expect(userRegisterRes.status).toBe(200);
  });

  test('canonical CRFV index routes are extensionless', async () => {
    const app = buildCrfvPagesApp({});

    const crfvRootRes = await request(app).get('/crfv');
    const crfvIndexRes = await request(app).get('/crfv/index');
    const legacyHtmlRes = await request(app).get('/crfv/index.html');

    expect(crfvRootRes.status).toBe(200);
    expect(crfvRootRes.text).toContain('CRFV Event Management System');
    expect(crfvIndexRes.status).toBe(200);
    expect(crfvIndexRes.text).toContain('CRFV Event Management System');
    expect(legacyHtmlRes.status).toBe(404);
  });

  test('new public CRFV informational pages render expected content when logged out', async () => {
    const app = buildCrfvPagesApp({});
    const cases = [
      {
        path: '/crfv/about',
        marker: 'About CRFV Event Management System'
      },
      {
        path: '/crfv/roles',
        marker: 'User Roles & Permissions'
      },
      {
        path: '/crfv/privacy-policy',
        marker: 'Privacy Policy'
      },
      {
        path: '/crfv/event-agreement',
        marker: 'Event Participation Agreement'
      }
    ];

    for (const testCase of cases) {
      const res = await request(app).get(testCase.path);
      expect(res.status).toBe(200);
      expect(res.text).toContain(testCase.marker);
    }
  });

  test('protected CRFV pages are blocked when logged out', async () => {
    const app = buildCrfvPagesApp({});

    const pages = [
      '/crfv/event-create',
      '/crfv/admin-register',
      '/crfv/reports',
      '/crfv/attendanceSummary',
      '/crfv/audittrail',
      '/crfv/payment-reports',
      '/crfv/account-settings'
    ];

    for (const page of pages) {
      const res = await request(app).get(page);
      expect(res.status).toBe(401);
    }
  });

  test('account settings renders when authenticated', async () => {
    const app = buildCrfvPagesApp({
      userId: 'U-1001',
      role: 'user',
      studentIDNumber: 'S-1001'
    });

    const res = await request(app).get('/crfv/account-settings');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Account Settings');
  });

  test('protected CRFV admin pages render expected content when authenticated as admin', async () => {
    const app = buildCrfvPagesApp({
      userId: 'A-1001',
      role: 'admin',
      studentIDNumber: 'A-1001'
    });

    const cases = [
      { path: '/crfv/admin-register', marker: 'Single User Registration' },
      { path: '/crfv/event-create', marker: 'Create Event' },
      { path: '/crfv/reports', marker: 'Reports Overview' }
    ];

    for (const testCase of cases) {
      const res = await request(app).get(testCase.path);
      expect(res.status).toBe(200);
      expect(res.text).toContain(testCase.marker);
    }
  });

  test('protected CRFV APIs are blocked when logged out', async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.session = {};
      next();
    });
    app.use('/api', auditTrailApi);
    app.use('/api/attendance-summary', attendanceSummaryApi);
    app.use('/api/payments-report', paymentsReportsApi);

    const auditRes = await request(app).get('/api/audit-trail');
    const allEventsRes = await request(app).get('/api/attendance-summary/all-events');
    const summaryRes = await request(app).get('/api/attendance-summary?event_id=E1&date=2026-03-01');
    const paymentsRes = await request(app).get('/api/payments-report?event_id=E1');

    expect(auditRes.status).toBe(401);
    expect(allEventsRes.status).toBe(401);
    expect(summaryRes.status).toBe(401);
    expect(paymentsRes.status).toBe(401);
  });
});
