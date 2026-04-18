const express = require('express');
const request = require('supertest');

const mockFrom = jest.fn();
const mockLogAuditTrail = jest.fn().mockResolvedValue(undefined);
const updateCalls = [];
const deleteCalls = [];

jest.mock('../../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args)
  }
}));

jest.mock('../../utils/auditTrail', () => ({
  logAuditTrail: mockLogAuditTrail
}));

function createAppWithSession(sessionData, router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use('/api/payments-report', router);
  return app;
}

function primeSupabase({
  attendeeSelect = [],
  paymentSelectByAttendeeNos = [],
  paymentSelectById = [],
  paymentUpdate = [],
  paymentDelete = []
} = {}) {
  const queues = {
    attendeeSelect: [...attendeeSelect],
    paymentSelectByAttendeeNos: [...paymentSelectByAttendeeNos],
    paymentSelectById: [...paymentSelectById],
    paymentUpdate: [...paymentUpdate],
    paymentDelete: [...paymentDelete]
  };

  mockFrom.mockImplementation((tableName) => {
    if (tableName === 'attendees') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(async () => queues.attendeeSelect.shift() || { data: [], error: null })
        }))
      };
    }

    if (tableName === 'payment_info') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            order: jest.fn(async () => queues.paymentSelectByAttendeeNos.shift() || { data: [], error: null })
          })),
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(async () => queues.paymentSelectById.shift() || { data: null, error: null })
          }))
        })),
        update: jest.fn((updates) => {
          updateCalls.push(updates);
          return {
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: jest.fn(async () => queues.paymentUpdate.shift() || { data: null, error: null })
              }))
            }))
          };
        }),
        delete: jest.fn(() => ({
          eq: jest.fn(async (_field, value) => {
            deleteCalls.push(value);
            return queues.paymentDelete.shift() || { error: null };
          })
        }))
      };
    }

    throw new Error(`Unexpected Supabase table: ${tableName}`);
  });
}

describe('payments report API smoke', () => {
  let paymentsReportsApi;

  beforeEach(() => {
    jest.resetModules();
    mockFrom.mockReset();
    mockLogAuditTrail.mockClear();
    updateCalls.length = 0;
    deleteCalls.length = 0;
    paymentsReportsApi = require('../../routes/paymentsReportsApi');
  });

  test('blocks student access', async () => {
    const app = createAppWithSession({ userId: 's-1', role: 'student' }, paymentsReportsApi);
    const response = await request(app).get('/api/payments-report?event_id=E-1');
    expect(response.status).toBe(403);
  });

  test('returns event-scoped payment rows with attendee details', async () => {
    primeSupabase({
      attendeeSelect: [
        {
          data: [
            { attendee_no: 'A-1', first_name: 'Kay', last_name: 'Tan', organization: 'CCS' },
            { attendee_no: 'A-2', first_name: 'Lia', last_name: 'Go', organization: 'CBA' }
          ],
          error: null
        }
      ],
      paymentSelectByAttendeeNos: [
        {
          data: [
            {
              payment_id: 'P-2',
              attendee_no: 'A-2',
              payment_status: 'Partially Paid',
              amount: 500,
              notes: 'Follow up',
              created_at: '2026-04-18T09:00:00Z'
            },
            {
              payment_id: 'P-1',
              attendee_no: 'A-1',
              payment_status: 'Fully Paid',
              amount: 1000,
              created_at: '2026-04-18T10:00:00Z'
            }
          ],
          error: null
        }
      ]
    });

    const app = createAppWithSession({ userId: 'm-1', role: 'manager' }, paymentsReportsApi);
    const response = await request(app).get('/api/payments-report?event_id=EVT-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        payment_id: 'P-2',
        attendee_no: 'A-2',
        first_name: 'Lia',
        last_name: 'Go',
        organization: 'CBA',
        payment_status: 'Partially Paid',
        amount: 500,
        form_of_payment: '',
        date_full_payment: '',
        date_partial_payment: '',
        account: '',
        or_number: '',
        quickbooks_no: '',
        shipping_tracking_no: '',
        notes: 'Follow up',
        created_at: '2026-04-18T09:00:00Z'
      },
      {
        payment_id: 'P-1',
        attendee_no: 'A-1',
        first_name: 'Kay',
        last_name: 'Tan',
        organization: 'CCS',
        payment_status: 'Fully Paid',
        amount: 1000,
        form_of_payment: '',
        date_full_payment: '',
        date_partial_payment: '',
        account: '',
        or_number: '',
        quickbooks_no: '',
        shipping_tracking_no: '',
        notes: '',
        created_at: '2026-04-18T10:00:00Z'
      }
    ]);
  });

  test('updates allowed fields and writes an audit entry', async () => {
    primeSupabase({
      paymentSelectById: [
        {
          data: {
            payment_id: 'P-10',
            attendee_no: 'A-10',
            payment_status: 'Pending',
            amount: 400,
            notes: 'Old note'
          },
          error: null
        }
      ],
      paymentUpdate: [
        {
          data: {
            payment_id: 'P-10',
            attendee_no: 'A-10',
            payment_status: 'Fully Paid',
            amount: 400,
            notes: 'Updated note'
          },
          error: null
        }
      ]
    });

    const app = createAppWithSession({ userId: 'm-1', role: 'manager' }, paymentsReportsApi);
    const response = await request(app)
      .put('/api/payments-report/P-10')
      .send({
        payment_status: 'Fully Paid',
        notes: 'Updated note',
        ignored_field: 'should not be saved'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(updateCalls).toEqual([
      {
        payment_status: 'Fully Paid',
        notes: 'Updated note'
      }
    ]);
    expect(mockLogAuditTrail).toHaveBeenCalledTimes(1);
  });

  test('preserves the unchanged response when nothing changed', async () => {
    primeSupabase({
      paymentSelectById: [
        {
          data: {
            payment_id: 'P-11',
            attendee_no: 'A-11',
            payment_status: 'Pending',
            amount: 250,
            notes: null
          },
          error: null
        }
      ]
    });

    const app = createAppWithSession({ userId: 'm-1', role: 'manager' }, paymentsReportsApi);
    const response = await request(app)
      .put('/api/payments-report/P-11')
      .send({
        payment_status: 'Pending',
        notes: null
      });

    expect(response.status).toBe(200);
    expect(response.body.unchanged).toBe(true);
    expect(updateCalls).toEqual([]);
    expect(mockLogAuditTrail).not.toHaveBeenCalled();
  });

  test('deletes a payment row and writes an audit entry', async () => {
    primeSupabase({
      paymentSelectById: [
        {
          data: {
            payment_id: 'P-12',
            attendee_no: 'A-12',
            payment_status: 'Pending'
          },
          error: null
        }
      ],
      paymentDelete: [{ error: null }]
    });

    const app = createAppWithSession({ userId: 'a-1', role: 'admin' }, paymentsReportsApi);
    const response = await request(app).delete('/api/payments-report/P-12');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(deleteCalls).toEqual(['P-12']);
    expect(mockLogAuditTrail).toHaveBeenCalledTimes(1);
  });
});
