const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid'); // Make sure uuid is installed
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Check for duplicate RFID
router.get('/check-rfid', async (req, res) => {
  const { rfid } = req.query;
  if (!rfid) return res.json({ exists: false });
  const { data, error } = await supabase.from('attendees').select('id').eq('rfid', rfid).maybeSingle();
  res.json({ exists: !!data });
});

// Get latest registered for event
router.get('/latest', async (req, res) => {
  const { event_id } = req.query;
  const { data, error } = await supabase
    .from('attendees')
    .select('first_name,last_name,organization')
    .eq('event_id', event_id)
    .order('created_at', { ascending: false })
    .limit(5);
  res.json(data || []);
});

// Register attendee (Supabase + Google Sheets)
router.post('/', async (req, res) => {
  try {
    const attendee = { ...req.body, id: uuidv4() }; // Generate a unique id
    const { data, error } = await supabase.from('attendees').insert([attendee]).select().maybeSingle();
    if (error) return res.status(400).json({ status: "error", message: error.message });

    // Relay to Google Sheets as before...
    if (process.env.GOOGLE_APPSCRIPT_URL) {
      await fetch(process.env.GOOGLE_APPSCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...req.body, register: "1" })
      });
    }

    res.json({ status: "success", attendee: data });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

// Get all attendees
router.get('/all', async (req, res) => {
  const { data, error } = await supabase
    .from('attendees')
    .select('*, event:event_id(event_name)');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;