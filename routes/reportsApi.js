const express = require('express');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { supabase } = require('../supabaseClient');
const { logAuditTrail } = require('../utils/auditTrail');
const { paymentUpdateSummary } = require('../utils/auditTrailUtils');
const { getMongoClient } = require('../utils/mongoClient');
const {
  requireCsrf,
  requireCrfvFeature,
  requireRateLimit,
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
const requireReportsFeature = requireCrfvFeature('reports');
const requirePaymentReportsFeature = requireCrfvFeature('payment_reports');
const privilegedWriteGuards = [
  requireReportsFeature,
  requireCsrf,
  requireRateLimit('privileged-write'),
];
const paymentWriteGuards = [
  requirePaymentReportsFeature,
  requireCsrf,
  requireRateLimit('privileged-write'),
];
const ATTENDEE_DELETE_REASONS = new Set([
  'Duplicate registration',
  'Incorrect registration',
  'Requested cancellation',
  'Wrong event',
  'Test entry',
  'Other',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function escapeAuditDetail(value) {
  return normalizeText(value).replace(/\s+/g, ' ') || 'N/A';
}

function normalizeAttendeeDeleteReason(value) {
  const reason = normalizeText(value);
  return ATTENDEE_DELETE_REASONS.has(reason) ? reason : '';
}

async function getCurrentUserPasswordRecord(req) {
  const client = await getMongoClient();
  const db = client.db('myDatabase');
  let mongoUserId = req.session?.userId;

  try {
    mongoUserId = new ObjectId(req.session?.userId);
  } catch (_error) {
    // Keep the raw value when the session user id is not a Mongo ObjectId.
  }

  return db
    .collection('tblUser')
    .findOne({ _id: mongoUserId }, { projection: { password: 1 } });
}

async function verifyCurrentUserPassword(req, password) {
  if (!password) {
    return { valid: false, status: 400, message: 'Password is required.' };
  }

  const user = await getCurrentUserPasswordRecord(req);
  if (!user || typeof user.password !== 'string') {
    return {
      valid: false,
      status: 403,
      message: 'User not found or password not set.',
    };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { valid: false, status: 401, message: 'Incorrect password.' };
  }

  return { valid: true };
}

async function deleteRowsByEquality(tableName, fieldName, value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 0;
  }

  const { count, error } = await supabase
    .from(tableName)
    .delete({ count: 'exact' })
    .eq(fieldName, normalized);

  if (error) {
    throw error;
  }

  return Number(count || 0);
}

function attendeeDeleteAuditSummary(attendee, counts) {
  const attendeeName = [
    attendee?.first_name,
    attendee?.middle_name,
    attendee?.last_name,
  ]
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(' ');

  return [
    `Deleted attendee ${escapeAuditDetail(attendee?.attendee_no)}`,
    `name: ${escapeAuditDetail(attendeeName)}`,
    `event_id: ${escapeAuditDetail(attendee?.event_id)}`,
    `reason: ${escapeAuditDetail(counts.reason)}`,
    `payment_info_deleted: ${counts.paymentInfo}`,
    `attendance_records_deleted: ${counts.attendanceRecords}`,
    `attendees_deleted: ${counts.attendees}`,
  ].join('; ');
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

router.get('/accommodation', requireReportsFeature, async (req, res) => {
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

router.get('/attendance', requireReportsFeature, async (req, res) => {
  try {
    return res.json(
      await fetchAttendanceRecords(normalizeText(req.query.event_id)),
    );
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to fetch attendance data' });
  }
});

router.get(
  '/attendees/latest-payments',
  requireReportsFeature,
  async (req, res) => {
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
  },
);

router.get('/attendees/filter', requireReportsFeature, async (req, res) => {
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

router.get('/attendance-records', requireReportsFeature, async (_req, res) => {
  try {
    return res.json(await fetchAttendanceRecords(''));
  } catch (_error) {
    return res.status(500).json([]);
  }
});

router.get('/attendees', requireReportsFeature, async (req, res) => {
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

router.get(
  '/attendees/:attendee_no',
  requireReportsFeature,
  async (req, res) => {
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
  },
);

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

router.delete(
  '/attendees/:attendee_no',
  ...privilegedWriteGuards,
  async (req, res) => {
    try {
      const attendeeNo = normalizeText(req.params.attendee_no);
      const password = String(req.body?.password || '');
      const reason = normalizeAttendeeDeleteReason(req.body?.reason);

      if (!reason) {
        return res.status(400).json({
          status: 'error',
          message: 'Select a valid deletion reason.',
        });
      }

      const passwordCheck = await verifyCurrentUserPassword(req, password);
      if (!passwordCheck.valid) {
        return res.status(passwordCheck.status).json({
          status: 'error',
          message: passwordCheck.message,
        });
      }

      const { data: attendee, error: attendeeError } = await supabase
        .from('attendees')
        .select('*')
        .eq('attendee_no', attendeeNo)
        .maybeSingle();

      if (attendeeError) {
        throw attendeeError;
      }

      if (!attendee) {
        return res
          .status(404)
          .json({ status: 'error', message: 'Attendee not found.' });
      }

      const paymentInfoDeleted = await deleteRowsByEquality(
        'payment_info',
        'attendee_no',
        attendeeNo,
      );

      let attendanceRecordsDeleted = 0;
      attendanceRecordsDeleted += await deleteRowsByEquality(
        'attendance_records',
        'attendee_id',
        attendee.id,
      );
      attendanceRecordsDeleted += await deleteRowsByEquality(
        'attendance_records',
        'attendee_no',
        attendeeNo,
      );
      attendanceRecordsDeleted += await deleteRowsByEquality(
        'attendance_records',
        'rfid',
        attendee.rfid,
      );
      attendanceRecordsDeleted += await deleteRowsByEquality(
        'attendance_records',
        'raw_rfid',
        attendee.rfid,
      );

      const { count: attendeesDeleted, error: deleteError } = await supabase
        .from('attendees')
        .delete({ count: 'exact' })
        .eq('attendee_no', attendeeNo);

      if (deleteError) {
        throw deleteError;
      }

      const counts = {
        reason,
        paymentInfo: paymentInfoDeleted,
        attendanceRecords: attendanceRecordsDeleted,
        attendees: Number(attendeesDeleted || 0),
      };

      await logAuditTrail({
        req,
        action: 'Delete Attendee',
        details: attendeeDeleteAuditSummary(attendee, counts),
      });

      return res.json({
        status: 'success',
        deleted: {
          paymentInfo: counts.paymentInfo,
          attendanceRecords: counts.attendanceRecords,
          attendees: counts.attendees,
        },
      });
    } catch (error) {
      console.error('Failed to delete attendee:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Failed to delete attendee.' });
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

router.get(
  '/payments/:attendee_no',
  requirePaymentReportsFeature,
  async (req, res) => {
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
  },
);

router.put('/payments/:payment_id', ...paymentWriteGuards, async (req, res) => {
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
});

router.post('/payments', ...paymentWriteGuards, async (req, res) => {
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
  ...paymentWriteGuards,
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
