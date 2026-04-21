const express = require('express');
const request = require('supertest');

const mockLogAuditTrail = jest.fn();

jest.mock('../../utils/auditTrail', () => ({
  logAuditTrail: (...args) => mockLogAuditTrail(...args),
}));

jest.mock('../../supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        range: jest.fn(async () => ({
          data: [],
          error: null,
          count: 0,
        })),
      })),
    })),
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
    auditTrailApi = require('../../routes/auditTrailApi');
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
