//attendanceApi.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const express = require('express');
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Middleware to flag unregistered
router.use('/attendance', (req, res, next) => {
  if (req.body.attendee_no === "unregistered") {
    req.body.is_unregistered = true;
  }
  next();
});

async function logAttendance(req, res) {
  try {
    const { rfid, attendee_no, event_id, status, timestamp, first_name, last_name, time, date, slot } = req.body;

    // Find attendee by event_id and either attendee_no or rfid
    const { data: attendees } = await supabase
      .from('attendees')
      .select('id')
      .eq('event_id', event_id)
      .or(`attendee_no.eq.${attendee_no},rfid.eq.${rfid}`)
      .limit(1);

    const is_unregistered = !attendees || attendees.length === 0;

    let record = {
      event_id,
      status: status || 'present',
      timestamp: timestamp || new Date().toISOString(),
      rfid,
      attendee_id: is_unregistered ? null : attendees[0].id,
      note: is_unregistered ? `Unregistered RFID: ${rfid}` : null,
      time,
      date,
      slot,
      raw_rfid: rfid,
      raw_first_name: last_name === "unregistered" ? null : first_name,
      raw_last_name: last_name === "unregistered" ? null : last_name,
      is_unregistered
    };

    if (is_unregistered) {
      record = {
        ...record,
        last_name: "unregistered",
        first_name: "",
        attendee_no: "unregistered"
      };
    }

    // Insert attendance record
    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert([record]);
    if (insertError) {
      return res.status(500).json({ status: "error", message: insertError.message });
    }

    // Relay to Google Sheets (optional)
    const sheetPayload = {
      ...req.body,
      id_number: req.body.attendee_no || "unregistered"
    };
    await fetch('https://script.google.com/macros/s/AKfycbz8rsTh7FsEUbpq1FR33VMQ_2auDYpjuq6SJTbOmgzHqHSRThylSkpEe7ZTExBo8099jQ/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheetPayload)
    });

    res.json({ status: "success" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.toString() });
  }
}

router.post('/', logAttendance);

// GET all attendance records, merging registered and raw fields
router.get('/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        attendee:attendee_id (first_name, last_name, attendee_no)
      `)
      .order('timestamp', { ascending: false });
    if (error) return res.status(500).json({ status: "error", message: error.message });

    const mergedData = data.map(record => ({
      ...record,
      first_name: record.attendee?.first_name || record.raw_first_name,
      last_name: record.attendee?.last_name || record.raw_last_name,
      attendee_no: record.attendee?.attendee_no || "unregistered"
    }));

    res.json(mergedData);
  } catch (err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

// Fetch attendees for an event
router.get('/attendees/by-event/:event_id', async (req, res) => {
  const { event_id } = req.params;
  const { data, error } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_id', event_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get latest event
router.get('/latest-event', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error) return res.status(500).json({ status: "error", message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

// Set current event (optional)
router.post('/set-current-event', async (req, res) => {
  const { event_id } = req.body;
  try {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError) throw new Error(eventError.message);

    if (!eventData || !(eventData.event_id || eventData.id)) throw new Error("No current event found");
    const currentEvent = eventData;
    currentEvent.event_id = currentEvent.event_id || currentEvent.id;

    res.json({ status: "success", event: currentEvent });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

module.exports = router;