const express = require('express');
const { supabase } = require('../supabaseClient');
const { requireRole } = require('../middleware/apiSecurity');
const {
  summarizePaymentRows,
  normalizePaymentStatus,
  getCanonicalPaymentStatus,
  createStatusOptions,
} = require('../utils/paymentAuditMetrics');

const router = express.Router();

const PAYMENT_INFO_SELECT = `
  payment_id,
  attendee_no,
  payment_status,
  amount,
  form_of_payment,
  date_full_payment,
  date_partial_payment,
  account,
  or_number,
  quickbooks_no,
  shipping_tracking_no,
  notes,
  created_at,
  attendee:attendees!fk_attendee(
    attendee_no,
    first_name,
    last_name,
    organization,
    event_id,
    events(event_id, event_name, start_date)
  )
`;

function parsePage(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLimit(value, fallback = 25) {
  if (value === 'all') {
    return 1000000;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function unwrapRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || {};
  }

  return value && typeof value === 'object' ? value : {};
}

function normalizePaymentRow(row) {
  const attendee = unwrapRelation(row?.attendee);
  const event = unwrapRelation(attendee?.events);

  return {
    payment_id: row?.payment_id || '',
    attendee_no: row?.attendee_no || attendee?.attendee_no || '',
    first_name: attendee?.first_name || '',
    last_name: attendee?.last_name || '',
    organization: attendee?.organization || '',
    payment_status: row?.payment_status || '',
    payment_status_label: getCanonicalPaymentStatus(row?.payment_status),
    amount: row?.amount ?? '',
    form_of_payment: row?.form_of_payment || '',
    date_full_payment: row?.date_full_payment || '',
    date_partial_payment: row?.date_partial_payment || '',
    account: row?.account || '',
    or_number: row?.or_number || '',
    quickbooks_no: row?.quickbooks_no || '',
    shipping_tracking_no: row?.shipping_tracking_no || '',
    notes: row?.notes || '',
    created_at: row?.created_at || '',
    event_id: attendee?.event_id || event?.event_id || '',
    event_name: event?.event_name || '',
    start_date: event?.start_date || '',
  };
}

async function fetchPaymentRows() {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('payment_info')
      .select(PAYMENT_INFO_SELECT)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const batch = Array.isArray(data) ? data.map(normalizePaymentRow) : [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

function filterRowsByEvent(rows, eventId) {
  const selectedEventId = String(eventId || '').trim();
  if (!selectedEventId) {
    return Array.isArray(rows) ? rows : [];
  }

  return (Array.isArray(rows) ? rows : []).filter(
    (row) => String(row?.event_id || '').trim() === selectedEventId,
  );
}

function createSearchHaystack(row) {
  return [
    row.event_id,
    row.event_name,
    row.start_date,
    row.attendee_no,
    row.first_name,
    row.last_name,
    `${row.last_name || ''}, ${row.first_name || ''}`.trim(),
    row.organization,
    row.payment_status,
    row.payment_status_label,
    row.form_of_payment,
    row.date_full_payment,
    row.amount,
    row.date_partial_payment,
    row.or_number,
    row.account,
    row.quickbooks_no,
    row.shipping_tracking_no,
    row.notes,
    row.created_at,
  ]
    .map((value) => String(value || '').toLowerCase())
    .join(' ');
}

function sortPaymentRecords(rows) {
  return [...rows].sort((left, right) => {
    const rightCreatedAt = String(right.created_at || '');
    const leftCreatedAt = String(left.created_at || '');
    if (rightCreatedAt !== leftCreatedAt) {
      return rightCreatedAt.localeCompare(leftCreatedAt);
    }

    const rightEvent = String(right.start_date || '');
    const leftEvent = String(left.start_date || '');
    if (rightEvent !== leftEvent) {
      return rightEvent.localeCompare(leftEvent);
    }

    return String(left.attendee_no || '').localeCompare(
      String(right.attendee_no || ''),
    );
  });
}

router.get('/summary', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const eventId = String(req.query.event_id || '').trim();
    const rows = filterRowsByEvent(await fetchPaymentRows(), eventId);
    const result = summarizePaymentRows(rows);

    return res.json({
      success: true,
      summary: result.summary,
    });
  } catch (error) {
    console.error('Error in GET /api/payment-audits/summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load payment audit summary.',
    });
  }
});

router.get('/records', requireRole('admin', 'manager'), async (req, res) => {
  const page = parsePage(req.query.page, 1);
  const limit = parseLimit(req.query.limit, 25);
  const search = String(req.query.search || '').trim();
  const eventId = String(req.query.event_id || '').trim();
  const paymentStatus = String(req.query.payment_status || '').trim();

  try {
    const scopedRows = filterRowsByEvent(await fetchPaymentRows(), eventId);
    const statusOptions = createStatusOptions(scopedRows);

    let filteredRows = [...scopedRows];

    if (paymentStatus) {
      const normalizedStatus = normalizePaymentStatus(paymentStatus);
      filteredRows = filteredRows.filter(
        (row) =>
          normalizePaymentStatus(
            row.payment_status_label || row.payment_status,
          ) === normalizedStatus,
      );
    }

    if (search) {
      const searchNeedle = search.toLowerCase();
      filteredRows = filteredRows.filter((row) =>
        createSearchHaystack(row).includes(searchNeedle),
      );
    }

    const sortedRows = sortPaymentRecords(filteredRows);
    const totalCount = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const start = (page - 1) * limit;
    const pagedRows = sortedRows.slice(start, start + limit);

    return res.json({
      success: true,
      records: pagedRows,
      status_options: statusOptions,
      count: totalCount,
      totalPages,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error in GET /api/payment-audits/records:', error);
    return res.status(500).json({
      success: false,
      records: [],
      status_options: [],
      count: 0,
      totalPages: 1,
      page,
      limit,
    });
  }
});

module.exports = router;
