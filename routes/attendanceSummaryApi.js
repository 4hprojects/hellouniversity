const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');
const { isAdminOrManager } = require('../middleware/routeAuthGuards');
const { enrichAttendanceRecords } = require('../utils/crfvAttendanceRecordEnrichment');

// GET /api/attendance-summary?event_id=...&date=...
router.get('/', isAdminOrManager, async (req, res) => {
  const event_id = req.query.event_id;
  const dateParam = req.query.date; // YYYY-MM-DD

  if (!event_id || !dateParam) {
    return res.status(400).json({ error: 'Missing event_id or date' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
 
  try {
    // Fetch event name
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('event_name')
      .eq('event_id', event_id)
      .single();
    if (eventError) throw eventError;
    const event_name = eventData ? eventData.event_name : '';

    // Fetch all attendees for the event
    const { data: attendees, error: attError } = await supabase
      .from('attendees')
      .select('id, attendee_no, first_name, last_name, email, event_id')
      .eq('event_id', event_id);

    console.log('Number of attendees for event', event_id, ':', attendees.length);

    if (attError) throw attError;

    // Fetch all attendance records for the event and date
    const { data: records, error: recError } = await supabase
      .from('attendance_records')
      .select('id, attendee_id, slot, time, date, event_id')
      .eq('event_id', event_id)
      .eq('date', dateParam);
    if (recError) throw recError;
    const enrichedRecords = await enrichAttendanceRecords(records);

    // Aggregate slot times and attendance status for each attendee
    const summary = attendees.map(a => {
      const logs = enrichedRecords.filter(r => r.attendee_id === a.id);
      const slots = ['AM IN', 'AM OUT', 'PM IN', 'PM OUT'];
      let slotTimes = {};
      let slotsPresent = 0;
      slots.forEach(slot => {
        // Only count each slot once, even if multiple records
        const slotLog = logs.find(l => l.slot === slot);
        slotTimes[slot] = slotLog ? slotLog.time : '';
        if (slotLog) slotsPresent++;
      });
      return {
        attendee_id: a.id,
        attendee_no: a.attendee_no,
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.email,
        event_name,
        date: dateParam,
        am_in: slotTimes['AM IN'],
        am_out: slotTimes['AM OUT'],
        pm_in: slotTimes['PM IN'],
        pm_out: slotTimes['PM OUT'],
        am_in_status: logs.find(l => l.slot === 'AM IN')?.punctuality_status || '',
        pm_in_status: logs.find(l => l.slot === 'PM IN')?.punctuality_status || '',
        am_in_late_minutes: logs.find(l => l.slot === 'AM IN')?.late_minutes || 0,
        pm_in_late_minutes: logs.find(l => l.slot === 'PM IN')?.late_minutes || 0,
        attendance_status: `${slotsPresent} of 4`
      };
    });

    res.json({ summary, allAttendeesCount: attendees.length });
  } catch (err) {
    console.error('Error fetching attendance summary:', err);
    res.status(500).json({ error: 'Failed to fetch attendance summary.' });
  }
});

// GET /api/attendance-summary/all-events
router.get('/all-events', isAdminOrManager, async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('event_id, event_name');
    if (error) throw error;
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
