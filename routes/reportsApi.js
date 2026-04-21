const express = require('express');
const { supabase } = require('../supabaseClient');
const { logAuditTrail } = require('../utils/auditTrail');
const { paymentUpdateSummary } = require('../utils/auditTrailUtils');
const {
  requireCsrf,
  requireRateLimit,
  requireRole,
} = require('../middleware/apiSecurity');
const {
  enrichAttendanceRecords,
} = require('../utils/crfvAttendanceRecordEnrichment');
const {
  buildLatestPaymentMap,
  createPaymentRecord,
  fetchPaymentById,
  fetchPaymentRowsByAttendeeNos,
  pickPaymentUpdates,
  updatePaymentById,
} = require('../utils/paymentInfoStore');

const router = express.Router();
const requirePrivilegedRole = requireRole('admin', 'manager');
const privilegedWriteGuards = [
  requireCsrf,
  requireRateLimit('privileged-write'),
];

router.use(requirePrivilegedRole);

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizePaymentStatus(value) {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/recievable/g, 'receivable');

  if (normalized === 'fully_paid') {
    return 'fully paid';
  }

  if (normalized === 'partial') {
    return 'partially paid';
  }

  if (normalized === 'ar') {
    return 'accounts receivable';
  }

  return normalized;
}

function mapPaymentInfo(row = {}, fields = []) {
  return fields.reduce((result, field) => {
    if (Object.prototype.hasOwnProperty.call(row, field)) {
      result[field] = row[field];
    }
    return result;
  }, {});
}

function attachPaymentState(
  attendees = [],
  paymentRows = [],
  paymentInfoFields = ['payment_status', 'created_at'],
) {
  const latestPaymentMap = buildLatestPaymentMap(paymentRows, {
    preferFullPaymentDate: true,
  });
  const paymentsByAttendeeNo = new Map();

  for (const row of paymentRows) {
    const attendeeNo = normalizeText(row?.attendee_no);
    if (!attendeeNo) {
      continue;
    }

    if (!paymentsByAttendeeNo.has(attendeeNo)) {
      paymentsByAttendeeNo.set(attendeeNo, []);
    }

    paymentsByAttendeeNo
      .get(attendeeNo)
      .push(mapPaymentInfo(row, paymentInfoFields));
  }

  return attendees.map((attendee) => {
    const attendeeNo = normalizeText(attendee?.attendee_no);
    const latestPayment = latestPaymentMap.get(attendeeNo);

    return {
      ...attendee,
      payment_info: paymentsByAttendeeNo.get(attendeeNo) || [],
      payment_status: latestPayment?.payment_status || '',
    };
  });
}

async function fetchAttendees(eventId, selectClause = '*') {
  let query = supabase
    .from('attendees')
    .select(selectClause)
    .order('last_name', { ascending: true });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function fetchAttendanceRecords(eventId) {
  let query = supabase
    .from('attendance_records')
    .select(
      'id, date, time, raw_last_name, raw_first_name, raw_rfid, slot, event_id',
    );

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return enrichAttendanceRecords(Array.isArray(data) ? data : []);
}

async function fetchAttendeesWithLatestPayments(
  eventId,
  paymentInfoFields = ['payment_status', 'created_at'],
) {
  const attendees = await fetchAttendees(eventId);
  const attendeeNos = attendees
    .map((attendee) => normalizeText(attendee?.attendee_no))
    .filter(Boolean);

  const paymentRows = await fetchPaymentRowsByAttendeeNos(attendeeNos, [
    'attendee_no',
    'payment_status',
    'created_at',
    'date_full_payment',
    ...paymentInfoFields,
  ]);

  return attachPaymentState(attendees, paymentRows, paymentInfoFields);
}

async function fetchLatestPaymentRowForAttendee(attendeeNo) {
  const paymentRows = await fetchPaymentRowsByAttendeeNos(
    [attendeeNo],
    [
      'payment_id',
      'attendee_no',
      'payment_status',
      'form_of_payment',
      'created_at',
      'date_full_payment',
    ],
  );
  const latestPaymentMap = buildLatestPaymentMap(paymentRows, {
    preferFullPaymentDate: true,
  });
  return latestPaymentMap.get(normalizeText(attendeeNo)) || null;
}

router.get('/accommodation', async (req, res) => {
  try {
    const eventId = normalizeText(req.query.event_id);
    let query = supabase
      .from('attendees')
      .select(
        'first_name, last_name, organization, accommodation, event_id, events(event_name)',
      )
      .order('last_name', { ascending: true });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return res.json(
      (Array.isArray(data) ? data : []).map((row) => ({
        ...row,
        event_name: row.events?.event_name || '',
      })),
    );
  } catch (_error) {
    return res
      .status(500)
      .json({ error: 'Failed to fetch accommodation data' });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    return res.json(
      await fetchAttendanceRecords(normalizeText(req.query.event_id)),
    );
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to fetch attendance data' });
  }
});

router.get('/attendees/latest-payments', async (req, res) => {
  try {
    return res.json(
      await fetchAttendeesWithLatestPayments(
        normalizeText(req.query.event_id),
        ['payment_status'],
      ),
    );
  } catch (error) {
    console.error('Error fetching attendees with latest payments:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch attendees with latest payments.',
    });
  }
});

router.get('/attendees/filter', async (req, res) => {
  try {
    const eventId = normalizeText(req.query.event_id);
    const requestedStatus = normalizePaymentStatus(req.query.status);
    const attendees = await fetchAttendeesWithLatestPayments(eventId, [
      'payment_status',
    ]);

    if (!requestedStatus) {
      return res.json(attendees);
    }

    return res.json(
      attendees.filter((attendee) => {
        return (
          normalizePaymentStatus(attendee?.payment_status) === requestedStatus
        );
      }),
    );
  } catch (error) {
    console.error('Error filtering attendees:', error);
    return res
      .status(500)
      .json({ status: 'error', message: 'Failed to filter attendees.' });
  }
});

router.get('/attendance-records', async (_req, res) => {
  try {
    return res.json(await fetchAttendanceRecords(''));
  } catch (_error) {
    return res.status(500).json([]);
  }
});

router.get('/attendees', async (req, res) => {
  try {
    return res.json(
      await fetchAttendeesWithLatestPayments(normalizeText(req.query.event_id)),
    );
  } catch (error) {
    console.error('Attendees API error:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Failed to fetch attendees.' });
  }
});

router.get('/attendees/:attendee_no', async (req, res) => {
  try {
    const attendeeNo = normalizeText(req.params.attendee_no);
    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .eq('attendee_no', attendeeNo)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Attendee not found.' });
    }

    return res.json(data);
  } catch (_error) {
    return res
      .status(500)
      .json({ status: 'error', message: 'Failed to fetch attendee.' });
  }
});

router.put(
  '/attendees/:attendee_no/rfid',
  ...privilegedWriteGuards,
  async (req, res) => {
    try {
      const attendeeNo = normalizeText(req.params.attendee_no);
      const rfid = normalizeText(req.body?.rfid);
      const { error } = await supabase
        .from('attendees')
        .update({ rfid })
        .eq('attendee_no', attendeeNo);

      if (error) {
        throw error;
      }

      return res.json({ status: 'success' });
    } catch (_error) {
      return res
        .status(500)
        .json({ status: 'error', message: 'Failed to update RFID.' });
    }
  },
);

router.put(
  '/attendees/:attendee_no',
  ...privilegedWriteGuards,
  async (req, res) => {
    try {
      const attendeeNo = normalizeText(req.params.attendee_no);
      const updates = req.body || {};

      const { data, error } = await supabase
        .from('attendees')
        .update(updates)
        .eq('attendee_no', attendeeNo)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      return res.json(data);
    } catch (_error) {
      return res
        .status(500)
        .json({ status: 'error', message: 'Failed to update attendee.' });
    }
  },
);

router.get('/payments/:attendee_no', async (req, res) => {
  try {
    const attendeeNo = normalizeText(req.params.attendee_no);
    const { data, error } = await supabase
      .from('payment_info')
      .select('*')
      .eq('attendee_no', attendeeNo)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return res.json(Array.isArray(data) ? data : []);
  } catch (_error) {
    return res
      .status(500)
      .json({ status: 'error', message: 'Failed to fetch payments.' });
  }
});

router.put(
  '/payments/:payment_id',
  ...privilegedWriteGuards,
  async (req, res) => {
    try {
      const paymentId = normalizeText(req.params.payment_id);
      const oldPayment = await fetchPaymentById(paymentId);

      if (!oldPayment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const updates = pickPaymentUpdates(req.body || {});
      const changes = {};

      Object.entries(updates).forEach(([key, value]) => {
        const previousValue = oldPayment[key] ?? null;
        const nextValue = value ?? null;
        if (previousValue !== nextValue) {
          changes[key] = [previousValue, nextValue];
        }
      });

      if (Object.keys(changes).length === 0) {
        return res.json({
          success: true,
          updated: oldPayment,
          unchanged: true,
        });
      }

      const updated = await updatePaymentById(paymentId, updates);

      await logAuditTrail({
        req,
        action: 'Update Payment',
        details: paymentUpdateSummary({
          payment_id: paymentId,
          attendee_no: oldPayment.attendee_no,
          changes,
        }),
      });

      return res.json({ success: true, updated });
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to update payment' });
    }
  },
);

router.post('/payments', ...privilegedWriteGuards, async (req, res) => {
  try {
    const payment = await createPaymentRecord(req.body || {});
    return res.json({ status: 'success', payment });
  } catch (_error) {
    return res
      .status(500)
      .json({ status: 'error', message: 'Failed to add payment.' });
  }
});

router.put(
  '/attendees/:attendee_no/payment-info',
  ...privilegedWriteGuards,
  async (req, res) => {
    try {
      const attendeeNo = normalizeText(req.params.attendee_no);
      const latestPayment = await fetchLatestPaymentRowForAttendee(attendeeNo);

      if (!latestPayment?.payment_id) {
        return res
          .status(404)
          .json({ status: 'error', message: 'Payment info not found.' });
      }

      await updatePaymentById(latestPayment.payment_id, {
        payment_status: req.body?.payment_status,
        form_of_payment: req.body?.form_of_payment,
      });

      return res.json({ status: 'success' });
    } catch (_error) {
      return res
        .status(500)
        .json({ status: 'error', message: 'Failed to update payment info.' });
    }
  },
);

module.exports = router;
