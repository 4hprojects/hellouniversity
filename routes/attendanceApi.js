const express = require('express');
const { supabase } = require('../supabaseClient');
const {
  requireCsrf,
  requireRateLimit,
  requireSession,
} = require('../middleware/apiSecurity');
const {
  enrichAttendanceRecords,
} = require('../utils/crfvAttendanceRecordEnrichment');
const {
  calculatePunctuality,
  normalizeAttendanceSchedule,
  resolveAttendanceSlot,
} = require('../utils/crfvAttendanceSchedule');
const {
  getEffectiveAttendanceScheduleForEvent,
  upsertAttendanceMetadata,
} = require('../utils/crfvAttendanceStore');
const { relayAttendanceToSheets } = require('../utils/attendanceSheetsRelay');

const router = express.Router();

router.use(requireSession);

function normalizeText(value) {
  return String(value || '').trim();
}

function buildAttendanceMetadataActor(req) {
  return {
    userId: req.session?.userId || null,
    studentIDNumber: req.session?.studentIDNumber || null,
    role: req.session?.role || null,
  };
}

function buildRecordedTime(reqBody = {}) {
  if (reqBody.time) {
    return reqBody.time;
  }

  if (reqBody.timestamp) {
    const date = new Date(reqBody.timestamp);
    if (!Number.isNaN(date.getTime())) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
    }
  }

  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
}

async function fetchLatestEvent() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

router.post(
  '/',
  requireCsrf,
  requireRateLimit('attendance-write'),
  async (req, res) => {
    try {
      const {
        rfid,
        attendee_no: attendeeNo,
        event_id: eventId,
        status,
        timestamp,
        first_name: firstName,
        last_name: lastName,
        date,
      } = req.body || {};

      const normalizedEventId = normalizeText(eventId);
      const normalizedRfid = normalizeText(rfid);
      const normalizedAttendeeNo = normalizeText(attendeeNo);
      const attendanceSchedule =
        await getEffectiveAttendanceScheduleForEvent(normalizedEventId);
      const recordedTime = buildRecordedTime(req.body || {});
      const slot = resolveAttendanceSlot(attendanceSchedule, recordedTime);
      const punctuality = calculatePunctuality(
        attendanceSchedule,
        slot,
        recordedTime,
      );

      const { data: attendees, error: attendeeError } = await supabase
        .from('attendees')
        .select('id')
        .eq('event_id', normalizedEventId)
        .or(`attendee_no.eq.${normalizedAttendeeNo},rfid.eq.${normalizedRfid}`)
        .limit(1);

      if (attendeeError) {
        throw attendeeError;
      }

      const matchedAttendees = Array.isArray(attendees) ? attendees : [];
      const isUnregistered = matchedAttendees.length === 0;

      let record = {
        event_id: normalizedEventId,
        status: status || 'present',
        timestamp: timestamp || new Date().toISOString(),
        rfid: normalizedRfid,
        attendee_id: isUnregistered ? null : matchedAttendees[0].id,
        note: isUnregistered ? `Unregistered RFID: ${normalizedRfid}` : null,
        time: recordedTime,
        date,
        slot,
        raw_rfid: normalizedRfid,
        raw_first_name: lastName === 'unregistered' ? null : firstName,
        raw_last_name: lastName === 'unregistered' ? null : lastName,
        is_unregistered: isUnregistered,
      };

      if (isUnregistered) {
        record = {
          ...record,
          last_name: 'unregistered',
          first_name: '',
          attendee_no: 'unregistered',
        };
      }

      const { data: insertedRecord, error: insertError } = await supabase
        .from('attendance_records')
        .insert([record])
        .select(
          'id, event_id, slot, time, date, raw_rfid, raw_first_name, raw_last_name, is_unregistered, attendee_id',
        )
        .maybeSingle();

      if (insertError || !insertedRecord) {
        return res.status(500).json({
          status: 'error',
          message: insertError?.message || 'Failed to save attendance.',
        });
      }

      await upsertAttendanceMetadata(
        insertedRecord.id,
        {
          punctuality_status: punctuality.punctuality_status,
          late_minutes: punctuality.late_minutes,
          event_id: normalizedEventId,
          slot,
          time: recordedTime,
          schedule_snapshot: normalizeAttendanceSchedule(attendanceSchedule),
        },
        buildAttendanceMetadataActor(req),
      );

      const responseRecord = {
        ...insertedRecord,
        punctuality_status: punctuality.punctuality_status,
        late_minutes: punctuality.late_minutes,
      };

      const sheetPayload = {
        ...req.body,
        slot,
        time: recordedTime,
        punctuality_status: punctuality.punctuality_status,
        late_minutes: punctuality.late_minutes,
        id_number: normalizedAttendeeNo || 'unregistered',
      };

      void relayAttendanceToSheets(sheetPayload);

      return res.json({
        status: 'success',
        record: responseRecord,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ status: 'error', message: error.toString() });
    }
  },
);

router.get('/all', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(
        `
        id,
        event_id,
        status,
        attendee_id,
        note,
        rfid,
        slot,
        time,
        date,
        timestamp,
        raw_first_name,
        raw_last_name,
        raw_rfid,
        is_unregistered,
        attendee_no,
        attendee:attendee_id (first_name, last_name, attendee_no)
      `,
      )
      .order('timestamp', { ascending: false });

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    const mergedData = (Array.isArray(data) ? data : []).map((record) => ({
      ...record,
      first_name: record.attendee?.first_name || record.raw_first_name,
      last_name: record.attendee?.last_name || record.raw_last_name,
      attendee_no: record.attendee?.attendee_no || 'unregistered',
    }));

    return res.json(await enrichAttendanceRecords(mergedData));
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.toString() });
  }
});

router.get('/attendees/by-event/:event_id', async (req, res) => {
  const eventId = normalizeText(req.params.event_id);
  const { data, error } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_id', eventId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(Array.isArray(data) ? data : []);
});

router.get('/latest-event', async (_req, res) => {
  try {
    const latestEvent = await fetchLatestEvent();
    if (!latestEvent) {
      return res
        .status(404)
        .json({ status: 'error', message: 'No current event found.' });
    }

    return res.json({
      ...latestEvent,
      attendance_schedule: await getEffectiveAttendanceScheduleForEvent(
        latestEvent.event_id,
      ),
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.toString() });
  }
});

router.post(
  '/set-current-event',
  requireCsrf,
  requireRateLimit('attendance-write'),
  async (req, res) => {
    const requestedEventId = normalizeText(req.body?.event_id);

    try {
      let query = supabase.from('events').select('*');

      if (requestedEventId) {
        query = query.or(
          `id.eq.${requestedEventId},event_id.eq.${requestedEventId}`,
        );
      }

      const { data: eventData, error: eventError } = await query.maybeSingle();
      if (eventError) {
        throw new Error(eventError.message);
      }

      const currentEvent = eventData;
      if (!currentEvent || !(currentEvent.event_id || currentEvent.id)) {
        throw new Error('No current event found');
      }

      currentEvent.event_id = currentEvent.event_id || currentEvent.id;
      return res.json({ status: 'success', event: currentEvent });
    } catch (error) {
      return res
        .status(500)
        .json({ status: 'error', message: error.toString() });
    }
  },
);

module.exports = router;
