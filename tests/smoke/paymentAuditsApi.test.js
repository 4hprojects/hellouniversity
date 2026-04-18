const express = require('express');
const request = require('supertest');

let mockPaymentRows = [];

jest.mock('../../supabaseClient', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table !== 'payment_info') {
        throw new Error(`Unexpected Supabase table: ${table}`);
      }

      return {
        select() {
          return this;
        },
        order() {
          return this;
        },
        range(from, to) {
          return Promise.resolve({
            data: mockPaymentRows.slice(from, to + 1),
            error: null
          });
        }
      };
    })
  }
}));

function createAppWithSession(sessionData, router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });
  app.use('/api/payment-audits', router);
  return app;
}

describe('payment audits API smoke', () => {
  let paymentAuditsApi;

  beforeEach(() => {
    jest.resetModules();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE = 'test-role-key';

    mockPaymentRows = [];

    paymentAuditsApi = require('../../routes/paymentAuditsApi');
  });

  test('blocks student access', async () => {
    const app = createAppWithSession({ userId: 's-1', role: 'student' }, paymentAuditsApi);
    const response = await request(app).get('/api/payment-audits/summary');
    expect(response.status).toBe(403);
  });

  test('returns all-event summary by default', async () => {
    mockPaymentRows = [
      {
        payment_id: 'P-1',
        attendee_no: 'A-1',
        payment_status: 'Fully Paid',
        amount: 1000,
        created_at: '2026-04-17T10:00:00Z',
        attendee: {
          attendee_no: 'A-1',
          event_id: 'E-1',
          events: { event_id: 'E-1', event_name: 'One', start_date: '2026-04-01' }
        }
      },
      {
        payment_id: 'P-2',
        attendee_no: 'A-2',
        payment_status: 'Partially Paid',
        amount: 500,
        created_at: '2026-04-17T09:00:00Z',
        attendee: {
          attendee_no: 'A-2',
          event_id: 'E-1',
          events: { event_id: 'E-1', event_name: 'One', start_date: '2026-04-01' }
        }
      },
      {
        payment_id: 'P-3',
        attendee_no: 'A-3',
        payment_status: 'Accounts Receivable',
        amount: 700,
        created_at: '2026-04-17T08:00:00Z',
        attendee: {
          attendee_no: 'A-3',
          event_id: 'E-2',
          events: { event_id: 'E-2', event_name: 'Two', start_date: '2026-04-08' }
        }
      }
    ];

    const app = createAppWithSession({ userId: 'm-1', role: 'manager' }, paymentAuditsApi);
    const response = await request(app).get('/api/payment-audits/summary');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary).toMatchObject({
      payment_record_count: 3,
      total_recorded_amount: 2200,
      total_collected_amount: 1500,
      total_receivable_amount: 700,
      paid_count: 1,
      partial_count: 1,
      receivable_count: 1
    });
  });

  test('narrows summary when event_id is provided', async () => {
    mockPaymentRows = [
      {
        payment_id: 'P-1',
        attendee_no: 'A-1',
        payment_status: 'Fully Paid',
        amount: 400,
        attendee: {
          attendee_no: 'A-1',
          event_id: 'E-1',
          events: { event_id: 'E-1', event_name: 'One', start_date: '2026-04-01' }
        }
      },
      {
        payment_id: 'P-2',
        attendee_no: 'A-2',
        payment_status: 'Accounts Receivable',
        amount: 900,
        attendee: {
          attendee_no: 'A-2',
          event_id: 'E-2',
          events: { event_id: 'E-2', event_name: 'Two', start_date: '2026-04-05' }
        }
      }
    ];

    const app = createAppWithSession({ userId: 'a-1', role: 'admin' }, paymentAuditsApi);
    const response = await request(app).get('/api/payment-audits/summary?event_id=E-1');

    expect(response.status).toBe(200);
    expect(response.body.summary.total_recorded_amount).toBe(400);
    expect(response.body.summary.payment_record_count).toBe(1);
  });

  test('returns Supabase-backed payment audit records with filters and pagination', async () => {
    mockPaymentRows = [
      {
        payment_id: 'P-1',
        attendee_no: 'A-1',
        payment_status: 'Fully Paid',
        amount: 12500,
        form_of_payment: 'Cash',
        date_full_payment: '2026-04-14',
        or_number: '2020',
        notes: 'Cleared at registration.',
        created_at: '2026-04-17T10:00:00Z',
        attendee: {
          attendee_no: 'A-1',
          first_name: 'Ada',
          last_name: 'Lovelace',
          organization: 'Math Club',
          event_id: 'E-1',
          events: { event_id: 'E-1', event_name: 'One', start_date: '2026-04-01' }
        }
      },
      {
        payment_id: 'P-2',
        attendee_no: 'A-2',
        payment_status: 'Accounts Recievable',
        amount: 9500,
        form_of_payment: 'Bank',
        account: 'Main',
        quickbooks_no: 'QB-77',
        notes: 'Pending collection.',
        created_at: '2026-04-16T10:00:00Z',
        attendee: {
          attendee_no: 'A-2',
          first_name: 'Grace',
          last_name: 'Hopper',
          organization: 'Code Org',
          event_id: 'E-1',
          events: { event_id: 'E-1', event_name: 'One', start_date: '2026-04-01' }
        }
      }
    ];

    const app = createAppWithSession({ userId: 'm-1', role: 'manager' }, paymentAuditsApi);
    const response = await request(app)
      .get('/api/payment-audits/records?page=1&limit=1&search=Cleared&payment_status=Fully Paid&event_id=E-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.records).toHaveLength(1);
    expect(response.body.records[0]).toMatchObject({
      event_id: 'E-1',
      event_name: 'One',
      attendee_no: 'A-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      payment_status: 'Fully Paid',
      payment_status_label: 'Fully Paid',
      form_of_payment: 'Cash',
      amount: 12500,
      or_number: '2020',
      notes: 'Cleared at registration.'
    });
    expect(response.body.status_options).toEqual(['Fully Paid', 'Accounts Receivable']);
    expect(response.body.count).toBe(1);
    expect(response.body.totalPages).toBe(1);
  });

  test('returns all matching rows when limit=all is requested', async () => {
    mockPaymentRows = [
      {
        payment_id: 'P-1',
        attendee_no: 'A-1',
        payment_status: 'Fully Paid',
        amount: 1000,
        notes: 'First matching row.',
        attendee: {
          attendee_no: 'A-1',
          first_name: 'Ada',
          last_name: 'Lovelace',
          organization: 'Math Club',
          event_id: 'E-1',
          events: { event_id: 'E-1', event_name: 'One', start_date: '2026-04-01' }
        }
      },
      {
        payment_id: 'P-2',
        attendee_no: 'A-2',
        payment_status: 'Partially Paid',
        amount: 750,
        notes: 'Second matching row.',
        attendee: {
          attendee_no: 'A-2',
          first_name: 'Grace',
          last_name: 'Hopper',
          organization: 'Code Org',
          event_id: 'E-1',
          events: { event_id: 'E-1', event_name: 'One', start_date: '2026-04-01' }
        }
      }
    ];

    const app = createAppWithSession({ userId: 'm-1', role: 'manager' }, paymentAuditsApi);
    const response = await request(app)
      .get('/api/payment-audits/records?page=1&limit=all&event_id=E-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.records).toHaveLength(2);
    expect(response.body.count).toBe(2);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.limit).toBe(1000000);
  });
});
