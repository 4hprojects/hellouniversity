function normalizePaymentStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/recievable/g, 'receivable');
}

function titleizeStatus(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCanonicalPaymentStatus(value) {
  const status = normalizePaymentStatus(value);

  if (status === 'paid' || status === 'fully paid') {
    return 'Fully Paid';
  }

  if (
    status === 'partially paid' ||
    status === 'partial paid' ||
    status === 'partial'
  ) {
    return 'Partially Paid';
  }

  if (
    status === '' ||
    status === 'accounts receivable' ||
    status === 'ar' ||
    status === 'unpaid' ||
    status === 'pending'
  ) {
    return 'Accounts Receivable';
  }

  return titleizeStatus(status);
}

function categorizePaymentStatus(value) {
  const canonicalStatus = getCanonicalPaymentStatus(value);

  if (canonicalStatus === 'Fully Paid') {
    return 'paid';
  }

  if (canonicalStatus === 'Partially Paid') {
    return 'partial';
  }

  return 'receivable';
}

function parseAmount(value) {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
}

function createEmptySummary(overrides = {}) {
  return {
    event_id: '',
    event_name: '',
    start_date: '',
    payment_record_count: 0,
    total_recorded_amount: 0,
    total_collected_amount: 0,
    total_receivable_amount: 0,
    paid_count: 0,
    partial_count: 0,
    receivable_count: 0,
    ...overrides
  };
}

function applyPaymentRow(summary, row) {
  const amount = parseAmount(row?.amount);
  const category = categorizePaymentStatus(row?.payment_status);

  summary.payment_record_count += 1;
  summary.total_recorded_amount += amount;

  if (category === 'paid') {
    summary.paid_count += 1;
    summary.total_collected_amount += amount;
    return;
  }

  if (category === 'partial') {
    summary.partial_count += 1;
    summary.total_collected_amount += amount;
    return;
  }

  summary.receivable_count += 1;
  summary.total_receivable_amount += amount;
}

function sortEventSummaries(events) {
  return [...events].sort((left, right) => {
    const leftDate = String(left.start_date || '');
    const rightDate = String(right.start_date || '');
    if (leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate);
    }

    return String(left.event_name || left.event_id || '').localeCompare(
      String(right.event_name || right.event_id || '')
    );
  });
}

function summarizePaymentRows(rows, eventDetailsMap = new Map()) {
  const overall = createEmptySummary();
  const grouped = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    applyPaymentRow(overall, row);

    const eventId = String(row?.event_id || '').trim() || 'UNASSIGNED';
    if (!grouped.has(eventId)) {
      const details = eventDetailsMap.get(eventId) || {};
      grouped.set(eventId, createEmptySummary({
        event_id: eventId === 'UNASSIGNED' ? '' : eventId,
        event_name: details.event_name || row?.event_name || (eventId === 'UNASSIGNED' ? 'Unknown Event' : eventId),
        start_date: details.start_date || row?.start_date || ''
      }));
    }

    applyPaymentRow(grouped.get(eventId), row);
  });

  const events = sortEventSummaries(Array.from(grouped.values()));
  return { summary: overall, events };
}

function compareStatusOptions(left, right) {
  const order = new Map([
    ['Fully Paid', 1],
    ['Partially Paid', 2],
    ['Accounts Receivable', 3]
  ]);

  const leftRank = order.get(left) || 99;
  const rightRank = order.get(right) || 99;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return String(left).localeCompare(String(right));
}

function createStatusOptions(rows) {
  return Array.from(
    new Set(
      (Array.isArray(rows) ? rows : [])
        .map((row) => getCanonicalPaymentStatus(row?.payment_status))
        .filter(Boolean)
    )
  ).sort(compareStatusOptions);
}

module.exports = {
  normalizePaymentStatus,
  getCanonicalPaymentStatus,
  categorizePaymentStatus,
  parseAmount,
  createEmptySummary,
  summarizePaymentRows,
  createStatusOptions
};
