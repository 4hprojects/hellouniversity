const {
  categorizePaymentStatus,
  summarizePaymentRows,
  getCanonicalPaymentStatus,
  createStatusOptions
} = require('../../utils/paymentAuditMetrics');

describe('payment audit metrics', () => {
  test('categorizes payment statuses using payment report rules', () => {
    expect(categorizePaymentStatus('Fully Paid')).toBe('paid');
    expect(categorizePaymentStatus('partial paid')).toBe('partial');
    expect(categorizePaymentStatus('Accounts Recievable')).toBe('receivable');
    expect(categorizePaymentStatus('pending')).toBe('receivable');
    expect(categorizePaymentStatus('Scholar')).toBe('receivable');
  });

  test('normalizes payment statuses into canonical labels', () => {
    expect(getCanonicalPaymentStatus('fully_paid')).toBe('Fully Paid');
    expect(getCanonicalPaymentStatus('Accounts Recievable')).toBe('Accounts Receivable');
    expect(getCanonicalPaymentStatus('')).toBe('Accounts Receivable');
    expect(getCanonicalPaymentStatus('Scholar')).toBe('Scholar');
  });

  test('summarizes rows into overall totals and event breakdowns', () => {
    const rows = [
      { event_id: 'E-1', amount: 1000, payment_status: 'Fully Paid' },
      { event_id: 'E-1', amount: '500', payment_status: 'Partially Paid' },
      { event_id: 'E-2', amount: 750, payment_status: 'Accounts Receivable' },
      { event_id: 'E-2', amount: 300, payment_status: '' },
      { event_id: 'E-2', amount: 200, payment_status: 'Scholar' }
    ];
    const eventMap = new Map([
      ['E-1', { event_id: 'E-1', event_name: 'Event One', start_date: '2026-04-10' }],
      ['E-2', { event_id: 'E-2', event_name: 'Event Two', start_date: '2026-04-12' }]
    ]);

    const result = summarizePaymentRows(rows, eventMap);

    expect(result.summary.payment_record_count).toBe(5);
    expect(result.summary.total_recorded_amount).toBe(2750);
    expect(result.summary.total_collected_amount).toBe(1500);
    expect(result.summary.total_receivable_amount).toBe(1250);
    expect(result.summary.paid_count).toBe(1);
    expect(result.summary.partial_count).toBe(1);
    expect(result.summary.receivable_count).toBe(3);

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      event_id: 'E-2',
      event_name: 'Event Two',
      payment_record_count: 3,
      total_receivable_amount: 1250
    });
    expect(result.events[1]).toMatchObject({
      event_id: 'E-1',
      event_name: 'Event One',
      total_collected_amount: 1500
    });
  });

  test('creates canonical status filter options without duplicate variants', () => {
    const options = createStatusOptions([
      { payment_status: 'Accounts Receivable' },
      { payment_status: 'Accounts Recievable' },
      { payment_status: 'Fully Paid' },
      { payment_status: 'Scholar' }
    ]);

    expect(options).toEqual([
      'Fully Paid',
      'Accounts Receivable',
      'Scholar'
    ]);
  });
});
