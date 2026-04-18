const { supabase } = require('../supabaseClient');

const PAYMENT_INFO_FIELDS = [
  'payment_id',
  'attendee_no',
  'payment_status',
  'amount',
  'form_of_payment',
  'date_full_payment',
  'date_partial_payment',
  'account',
  'or_number',
  'quickbooks_no',
  'shipping_tracking_no',
  'notes',
  'created_at'
];

const EDITABLE_PAYMENT_FIELDS = [
  'payment_status',
  'amount',
  'form_of_payment',
  'date_full_payment',
  'date_partial_payment',
  'account',
  'or_number',
  'quickbooks_no',
  'shipping_tracking_no',
  'notes'
];

function normalizePaymentValue(field, value) {
  if (field === 'amount') {
    return value ?? null;
  }

  return value || '';
}

function normalizeStoredPaymentRecord(record = {}) {
  return PAYMENT_INFO_FIELDS.reduce((normalized, field) => {
    normalized[field] = normalizePaymentValue(field, record[field]);
    return normalized;
  }, {});
}

function normalizePaymentForBackfill(record = {}) {
  const normalized = PAYMENT_INFO_FIELDS.reduce((result, field) => {
    if (field === 'amount') {
      result[field] = record[field] ?? null;
      return result;
    }

    if (record[field] == null) {
      result[field] = null;
      return result;
    }

    if (record[field] instanceof Date) {
      result[field] = record[field].toISOString();
      return result;
    }

    if (typeof record[field] === 'object' && typeof record[field].toISOString === 'function') {
      result[field] = record[field].toISOString();
      return result;
    }

    result[field] = record[field];
    return result;
  }, {});

  if (!normalized.created_at && record.created_at) {
    normalized.created_at = record.created_at;
  }

  return normalized;
}

function pickPaymentUpdates(body = {}) {
  return EDITABLE_PAYMENT_FIELDS.reduce((updates, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }
    return updates;
  }, {});
}

function unwrapRelation(value) {
  if (Array.isArray(value)) {
    return value[0] || {};
  }

  return value && typeof value === 'object' ? value : {};
}

function normalizePaymentReportRow(row = {}) {
  const attendee = unwrapRelation(row.attendee);

  return {
    payment_id: row?.payment_id || '',
    attendee_no: row?.attendee_no || attendee?.attendee_no || '',
    first_name: attendee?.first_name || '',
    last_name: attendee?.last_name || '',
    organization: attendee?.organization || '',
    payment_status: row?.payment_status || '',
    amount: row?.amount ?? '',
    form_of_payment: row?.form_of_payment || '',
    date_full_payment: row?.date_full_payment || '',
    date_partial_payment: row?.date_partial_payment || '',
    account: row?.account || '',
    or_number: row?.or_number || '',
    quickbooks_no: row?.quickbooks_no || '',
    shipping_tracking_no: row?.shipping_tracking_no || '',
    notes: row?.notes || '',
    created_at: row?.created_at || ''
  };
}

async function fetchPaymentRowsByEventId(eventId) {
  const scopedEventId = String(eventId || '').trim();
  if (!scopedEventId) {
    return [];
  }

  const { data: attendeeRows, error: attendeeError } = await supabase
    .from('attendees')
    .select('attendee_no, first_name, last_name, organization')
    .eq('event_id', scopedEventId);

  if (attendeeError) {
    throw attendeeError;
  }

  const attendees = Array.isArray(attendeeRows) ? attendeeRows : [];
  if (attendees.length === 0) {
    return [];
  }

  const attendeeNos = attendees
    .map((row) => String(row?.attendee_no || '').trim())
    .filter(Boolean);

  if (attendeeNos.length === 0) {
    return [];
  }

  const attendeeMap = new Map(
    attendees.map((row) => [String(row.attendee_no || '').trim(), row])
  );

  const { data: paymentRows, error: paymentError } = await supabase
    .from('payment_info')
    .select(PAYMENT_INFO_FIELDS.join(', '))
    .in('attendee_no', attendeeNos)
    .order('created_at', { ascending: false });

  if (paymentError) {
    throw paymentError;
  }

  return (Array.isArray(paymentRows) ? paymentRows : []).map((row) => normalizePaymentReportRow({
    ...row,
    attendee: attendeeMap.get(String(row?.attendee_no || '').trim()) || {}
  }));
}

async function fetchPaymentById(paymentId) {
  const { data, error } = await supabase
    .from('payment_info')
    .select(PAYMENT_INFO_FIELDS.join(', '))
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function updatePaymentById(paymentId, updates) {
  const { data, error } = await supabase
    .from('payment_info')
    .update(updates)
    .eq('payment_id', paymentId)
    .select(PAYMENT_INFO_FIELDS.join(', '))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function deletePaymentById(paymentId) {
  const { error } = await supabase
    .from('payment_info')
    .delete()
    .eq('payment_id', paymentId);

  if (error) {
    throw error;
  }
}

async function countPaymentRowsByAttendeeNos(attendeeNos = []) {
  const scopedAttendeeNos = Array.from(new Set(
    (Array.isArray(attendeeNos) ? attendeeNos : [])
      .map((attendeeNo) => String(attendeeNo || '').trim())
      .filter(Boolean)
  ));

  if (scopedAttendeeNos.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from('payment_info')
    .select('payment_id')
    .in('attendee_no', scopedAttendeeNos);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.length : 0;
}

async function deletePaymentRowsByAttendeeNos(attendeeNos = []) {
  const scopedAttendeeNos = Array.from(new Set(
    (Array.isArray(attendeeNos) ? attendeeNos : [])
      .map((attendeeNo) => String(attendeeNo || '').trim())
      .filter(Boolean)
  ));

  if (scopedAttendeeNos.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('payment_info')
    .delete()
    .in('attendee_no', scopedAttendeeNos);

  if (error) {
    throw error;
  }

  return scopedAttendeeNos.length;
}

module.exports = {
  PAYMENT_INFO_FIELDS,
  EDITABLE_PAYMENT_FIELDS,
  normalizeStoredPaymentRecord,
  normalizePaymentForBackfill,
  normalizePaymentReportRow,
  pickPaymentUpdates,
  fetchPaymentRowsByEventId,
  fetchPaymentById,
  updatePaymentById,
  deletePaymentById,
  countPaymentRowsByAttendeeNos,
  deletePaymentRowsByAttendeeNos
};
