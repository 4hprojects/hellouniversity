const express = require('express');
const request = require('supertest');

const mockLogAuditTrail = jest.fn();
let mockQueryResult = { data: [], error: null, count: 0 };
const mockBuilders = [];
const mockSupabaseFrom = jest.fn(() => {
  const builder = {
    select: jest.fn(() => builder),
    or: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    lte: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn(async () => mockQueryResult),
  };
  mockBuilders.push(builder);
  return builder;
});

jest.mock('../../utils/auditTrail', () => ({
  logAuditTrail: (...args) => mockLogAuditTrail(...args),
}));

jest.mock('../../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockSupabaseFrom(...args),
  },
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

describe('audit trail API smoke', () => {
  let auditTrailApi;

  beforeEach(() => {
    jest.resetModules();
    mockLogAuditTrail.mockReset().mockResolvedValue(undefined);
    mockSupabaseFrom.mockClear();
    mockBuilders.length = 0;
    mockQueryResult = { data: [], error: null, count: 0 };
    auditTrailApi = require('../../routes/auditTrailApi');
  });

  test('blocks logged-out audit reads', async () => {
    const app = createAppWithSession({}, auditTrailApi);
    const response = await request(app).get('/api/audit-trail');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthorized',
    });
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test('blocks ordinary users from audit reads', async () => {
    const app = createAppWithSession(
      { userId: 'u-1', role: 'student' },
      auditTrailApi,
    );
    const response = await request(app).get('/api/audit-trail');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Forbidden',
    });
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test('returns stable audit read payload with server-side sort', async () => {
    mockQueryResult = {
      data: [
        {
          user_name: 'Kayla',
          user_role: 'admin',
          action: 'LOGIN',
          action_time: '2026-04-21T09:00:00Z',
          ip_address: '127.0.0.1',
          details: 'Signed in',
        },
      ],
      error: null,
      count: 12,
    };
    const app = createAppWithSession(
      { userId: 'a-1', role: 'admin' },
      auditTrailApi,
    );
    const response = await request(app).get(
      '/api/audit-trail?page=2&limit=5&sortField=action&sortOrder=asc',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      logs: mockQueryResult.data,
      totalPages: 3,
      count: 12,
    });
    expect(mockSupabaseFrom).toHaveBeenCalledWith('audit_trail');
    expect(mockBuilders[0].order).toHaveBeenCalledWith('action', {
      ascending: true,
    });
    expect(mockBuilders[0].range).toHaveBeenCalledWith(5, 9);
  });

  test('falls back to newest-first sorting for invalid sort params', async () => {
    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager' },
      auditTrailApi,
    );
    const response = await request(app).get(
      '/api/audit-trail?sortField=not_a_column&sortOrder=sideways',
    );

    expect(response.status).toBe(200);
    expect(mockBuilders[0].order).toHaveBeenCalledWith('action_time', {
      ascending: false,
    });
  });

  test('applies search, date filters, and caps page size', async () => {
    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager' },
      auditTrailApi,
    );
    const response = await request(app).get(
      '/api/audit-trail?search=admin%,role&dateFrom=2026-04-01&dateTo=2026-04-21&limit=2500&page=2',
    );

    expect(response.status).toBe(200);
    expect(mockBuilders[0].or).toHaveBeenCalledWith(
      'user_name.ilike.%admin role%,user_role.ilike.%admin role%,action.ilike.%admin role%,details.ilike.%admin role%',
    );
    expect(mockBuilders[0].gte).toHaveBeenCalledWith(
      'action_time',
      '2026-04-01',
    );
    expect(mockBuilders[0].lte).toHaveBeenCalledWith(
      'action_time',
      '2026-04-21',
    );
    expect(mockBuilders[0].range).toHaveBeenCalledWith(1000, 1999);
  });

  test('requires csrf for privileged audit writes', async () => {
    const app = createAppWithSession(
      { userId: 'm-1', role: 'manager', csrfToken: 'expected-token' },
      auditTrailApi,
    );
    const response = await request(app).post('/api/audit-trail').send({
      action: 'EXPORT_PAYMENT_REPORT_XLSX',
      details: 'E-1 | 25 row(s)',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid CSRF token.',
    });
    expect(mockLogAuditTrail).not.toHaveBeenCalled();
  });
});
