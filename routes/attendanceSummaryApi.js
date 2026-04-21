const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { isAdminOrManager } = require('../middleware/routeAuthGuards');
const { enrichAttendanceRecords } = require('../utils/crfvAttendanceRecordEnrichment');
const {
  parseLimit,
  parsePositiveInteger,
  sanitizeSupabaseSearch,
} = require('../utils/requestParsers');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 1000;
const SLOT_NAMES = ['AM IN', 'AM OUT', 'PM IN', 'PM OUT'];
const SORT_FIELD_MAP = new Map([
  ['attendee_no', 'attendee_no'],
  ['first_name', 'first_name'],
  ['last_name', 'last_name'],
  ['email', 'email'],
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function isValidDateString(value) {
  return DATE_PATTERN.test(String(value || ''));
}

function parseSort(query) {
  const requestedField = normalizeText(query.sortField);
  const requestedOrder = normalizeText(query.sortOrder).toLowerCase();
  return {
    sortField: SORT_FIELD_MAP.has(requestedField) ? requestedField : 'last_name',
    sortColumn: SORT_FIELD_MAP.get(requestedField) || 'last_name',
    sortOrder: requestedOrder === 'desc' ? 'desc' : 'asc',
  };
}

function isDateWithinEvent(dateParam, event) {
  const startDate = normalizeText(event?.start_date);
  const endDate = normalizeText(event?.end_date || event?.start_date);

  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return false;
  }

  return dateParam >= startDate && dateParam <= endDate;
}

function buildSearchQuery(search) {
  if (!search) {
    return '';
  }

  return [
    `attendee_no.ilike.%${search}%`,
    `first_name.ilike.%${search}%`,
    `last_name.ilike.%${search}%`,
    `email.ilike.%${search}%`,
  ].join(',');
}

function groupRecordsByAttendee(records = []) {
  const grouped = new Map();

  records.forEach((record) => {
    const attendeeId = record?.attendee_id;
    const slot = normalizeText(record?.slot);
    if (!attendeeId || !SLOT_NAMES.includes(slot)) {
      return;
    }

    const key = String(attendeeId);
    if (!grouped.has(key)) {
      grouped.set(key, new Map());
    }

    const slotMap = grouped.get(key);
    if (!slotMap.has(slot)) {
      slotMap.set(slot, record);
    }
  });

  return grouped;
}

function calculateCounters(recordsByAttendee, totalAttendees) {
  const counters = {
    totalAttendees,
    amIn: 0,
    amOut: 0,
    pmIn: 0,
    pmOut: 0,
    amInOnTime: 0,
    amInLate: 0,
    pmInOnTime: 0,
    pmInLate: 0,
  };

  recordsByAttendee.forEach((slotMap) => {
    const amIn = slotMap.get('AM IN');
    const amOut = slotMap.get('AM OUT');
    const pmIn = slotMap.get('PM IN');
    const pmOut = slotMap.get('PM OUT');

    if (amIn) counters.amIn += 1;
    if (amOut) counters.amOut += 1;
    if (pmIn) counters.pmIn += 1;
    if (pmOut) counters.pmOut += 1;
    if (amIn?.punctuality_status === 'on_time') counters.amInOnTime += 1;
    if (amIn?.punctuality_status === 'late') counters.amInLate += 1;
    if (pmIn?.punctuality_status === 'on_time') counters.pmInOnTime += 1;
    if (pmIn?.punctuality_status === 'late') counters.pmInLate += 1;
  });

  return counters;
}

function buildSummaryRow(attendee, event, dateParam, recordsByAttendee) {
  const slotMap = recordsByAttendee.get(String(attendee.id)) || new Map();
  const amIn = slotMap.get('AM IN');
  const amOut = slotMap.get('AM OUT');
  const pmIn = slotMap.get('PM IN');
  const pmOut = slotMap.get('PM OUT');
  const slotsPresent = [amIn, amOut, pmIn, pmOut].filter(Boolean).length;

  return {
    attendee_id: attendee.id,
    attendee_no: attendee.attendee_no,
    first_name: attendee.first_name,
    last_name: attendee.last_name,
    email: attendee.email,
    event_name: event.event_name || '',
    date: dateParam,
    am_in: amIn?.time || '',
    am_out: amOut?.time || '',
    pm_in: pmIn?.time || '',
    pm_out: pmOut?.time || '',
    am_in_status: amIn?.punctuality_status || '',
    pm_in_status: pmIn?.punctuality_status || '',
    am_in_late_minutes: amIn?.late_minutes || 0,
    pm_in_late_minutes: pmIn?.late_minutes || 0,
    attendance_status: `${slotsPresent} of 4`,
  };
}

async function fetchEvent(eventId) {
  const { data, error } = await supabase
    .from('events')
    .select('event_id, event_name, start_date, end_date')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function fetchTotalAttendeesCount(eventId) {
  const { error, count } = await supabase
    .from('attendees')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) {
    throw error;
  }

  return Number(count || 0);
}

async function fetchAttendanceRecords(eventId, dateParam) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, attendee_id, slot, time, date, event_id')
    .eq('event_id', eventId)
    .eq('date', dateParam);

  if (error) {
    throw error;
  }

  return enrichAttendanceRecords(Array.isArray(data) ? data : []);
}

async function fetchAttendeePage({
  eventId,
  search,
  sortColumn,
  sortOrder,
  page,
  limit,
}) {
  let query = supabase
    .from('attendees')
    .select('id, attendee_no, first_name, last_name, email, event_id', {
      count: 'exact',
    })
    .eq('event_id', eventId);

  const searchQuery = buildSearchQuery(search);
  if (searchQuery) {
    query = query.or(searchQuery);
  }

  const start = (page - 1) * limit;
  const { data, error, count } = await query
    .order(sortColumn, { ascending: sortOrder === 'asc' })
    .range(start, start + limit - 1);

  if (error) {
    throw error;
  }

  return {
    attendees: Array.isArray(data) ? data : [],
    count: Number(count || 0),
  };
}

// GET /api/attendance-summary?event_id=...&date=...
router.get('/', isAdminOrManager, async (req, res) => {
  const eventId = normalizeText(req.query.event_id);
  const dateParam = normalizeText(req.query.date);
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parseLimit(req.query.limit, {
    fallback: DEFAULT_LIMIT,
    max: MAX_LIMIT,
  });
  const search = sanitizeSupabaseSearch(req.query.search);
  const { sortField, sortColumn, sortOrder } = parseSort(req.query);

  if (!eventId || !dateParam) {
    return res.status(400).json({ error: 'Missing event_id or date' });
  }
  if (!isValidDateString(dateParam)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  try {
    const event = await fetchEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (!isDateWithinEvent(dateParam, event)) {
      return res.status(400).json({
        error: 'Selected date is outside the event date range.',
        event,
      });
    }

    const [totalAttendees, enrichedRecords, pageResult] = await Promise.all([
      fetchTotalAttendeesCount(eventId),
      fetchAttendanceRecords(eventId, dateParam),
      fetchAttendeePage({
        eventId,
        search,
        sortColumn,
        sortOrder,
        page,
        limit,
      }),
    ]);

    const recordsByAttendee = groupRecordsByAttendee(enrichedRecords);
    const summary = pageResult.attendees.map((attendee) =>
      buildSummaryRow(attendee, event, dateParam, recordsByAttendee),
    );
    const totalPages = Math.max(1, Math.ceil(pageResult.count / limit));

    return res.json({
      summary,
      allAttendeesCount: totalAttendees,
      count: pageResult.count,
      totalPages,
      page,
      limit,
      sortField,
      sortOrder,
      counters: calculateCounters(recordsByAttendee, totalAttendees),
      event,
    });
  } catch (err) {
    console.error('Error fetching attendance summary:', err);
    return res
      .status(500)
      .json({ error: 'Failed to fetch attendance summary.' });
  }
});

// GET /api/attendance-summary/all-events
router.get('/all-events', isAdminOrManager, async (_req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('event_id, event_name, start_date, end_date')
      .order('start_date', { ascending: false });
    if (error) throw error;
    return res.json({ events: Array.isArray(events) ? events : [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
