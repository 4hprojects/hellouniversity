//reportsApi.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { logAuditTrail } = require('../utils/auditTrail');
const { paymentUpdateSummary } = require('../utils/auditTrailUtils');
const { isAdminOrManager } = require('../middleware/routeAuthGuards');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// --- Get accommodation data with event filtering ---
router.get('/accommodation', async (req, res) => {
  try {
    const { event_id } = req.query;
    let query = supabase
      .from('attendees')
      .select('first_name, last_name, organization, accommodation, event_id, events(event_name)')
      .order('last_name', { ascending: true });

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Flatten event_name for each row
    const result = data.map(row => ({
      ...row,
      event_name: row.events?.event_name || ''
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accommodation data' });
  }
});

// --- Get attendance data with event filtering ---
router.get('/attendance', async (req, res) => {
  try {
    const { event_id } = req.query;
    let query = supabase
      .from('attendance_records')
      .select('date, time, raw_last_name, raw_first_name, raw_rfid, slot, event_id');

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance data' });
  }
});

// --- Get single attendee ---
router.get('/attendees/:attendee_no', async (req, res) => {
  try {
    const { attendee_no } = req.params;
    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .eq('attendee_no', attendee_no)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch attendee.' });
  }
});

// --- Update RFID ---
router.put('/attendees/:attendee_no/rfid', isAdminOrManager, async (req, res) => {
  try {
    const { attendee_no } = req.params;
    const { rfid } = req.body;
    const { error } = await supabase
      .from('attendees')
      .update({ rfid })
      .eq('attendee_no', attendee_no);
    if (error) throw error;
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update RFID.' });
  }
});

// --- Update attendee info ---
router.put('/attendees/:attendee_no', isAdminOrManager, async (req, res) => {
  try {
    const { attendee_no } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('attendees')
      .update(updates)
      .eq('attendee_no', attendee_no)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update attendee.' });
  }
});

// --- Get all payments for attendee ---
router.get('/payments/:attendee_no', async (req, res) => {
  try {
    const { attendee_no } = req.params;
    const { data, error } = await supabase
      .from('payment_info')
      .select('*')
      .eq('attendee_no', attendee_no)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch payments.' });
  }
});

// --- Update payment record ---
router.put('/payments/:payment_id', isAdminOrManager, async (req, res) => {
  const { payment_id } = req.params;
  const updates = req.body;

  // Fetch old payment for comparison
  const { data: oldPayment, error: fetchError } = await supabase
    .from('payment_info')
    .select('*')
    .eq('payment_id', payment_id)
    .single();

  if (fetchError || !oldPayment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  // Update payment
  const { data: updated, error } = await supabase
    .from('payment_info')
    .update(updates)
    .eq('payment_id', payment_id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to update payment' });
  }

  // Prepare changes summary
  const changes = {};
  for (const key in updates) {
    if (updates[key] !== oldPayment[key]) {
      changes[key] = [oldPayment[key], updates[key]];
    }
  }

  // Only log if there are changes
  if (Object.keys(changes).length > 0) {
    await logAuditTrail({
      req,
      action: 'Update Payment',
      details: paymentUpdateSummary({
        payment_id,
        attendee_no: oldPayment.attendee_no,
        changes
      })
    });
  }

  res.json({ success: true, updated });
});

// --- Add new payment record ---
router.post('/payments', isAdminOrManager, async (req, res) => {
  try {
    const payment = req.body;
    const { error } = await supabase
      .from('payment_info')
      .insert([payment]);
    if (error) throw error;
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to add payment.' });
  }
});

// --- Update payment info for attendee ---
router.put('/attendees/:attendee_no/payment-info', isAdminOrManager, async (req, res) => {
  try {
    const { attendee_no } = req.params;
    const { payment_status, form_of_payment } = req.body;
    // Update the latest payment_info record for this attendee
    const { data, error } = await supabase
      .from('payment_info')
      .update({ payment_status, form_of_payment })
      .eq('attendee_no', attendee_no)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to update payment info.' });
  }
});

// --- Get attendees with latest payments ---
router.get('/attendees/latest-payments', async (req, res) => {
  try {
    const { data: attendees, error } = await supabase
      .from('attendees')
      .select(`
        attendee_no, last_name, first_name, organization, designation, email, contact_no, rfid, confirmation_code, accommodation, event_id,
        payment_info:payment_info(payment_status)
      `);

    if (error) throw error;

    // Flatten payment_status (show latest if multiple)
    const result = attendees.map(att => ({
      ...att,
      payment_status: Array.isArray(att.payment_info) && att.payment_info.length > 0
        ? att.payment_info[att.payment_info.length - 1].payment_status
        : '',
    }));

    // For each attendee, get the latest payment_info record
    const attendeesWithLatestPayments = await Promise.all(result.map(async att => {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_info')
        .select('payment_status')
        .eq('attendee_no', att.attendee_no)
        .order('date_full_payment', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      if (paymentError) {
        console.error('Error fetching payment info:', paymentError);
        return { ...att, payment_status: null };
      }

      const latestPayment = paymentData[0];
      return { ...att, payment_status: latestPayment ? latestPayment.payment_status : null };
    }));

    res.json(attendeesWithLatestPayments);
  } catch (err) {
    console.error('Error fetching attendees with latest payments:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch attendees with latest payments.' });
  }
});

// --- Filter attendees by payment status ---
router.get('/attendees/filter', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('attendees').select(`
      attendee_no, last_name, first_name, organization, designation, email, contact_no, rfid, confirmation_code, accommodation, event_id,
      payment_info:payment_info(payment_status), att_status
    `);

    if (status) {
      query = query.eq('payment_info.payment_status', status);
    }

    const { data: attendees, error } = await query;

    if (error) throw error;

    // Flatten payment_status (show latest if multiple)
    const result = attendees.map(att => ({
      ...att,
      payment_status: Array.isArray(att.payment_info) && att.payment_info.length > 0
        ? att.payment_info[att.payment_info.length - 1].payment_status
        : '',
    }));

    res.json(result);
  } catch (err) {
    console.error('Error filtering attendees:', err);
    res.status(500).json({ status: 'error', message: 'Failed to filter attendees.' });
  }
});

// --- Get attendance records ---
router.get('/attendance-records', async (req, res) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('date, time, raw_last_name, raw_first_name, raw_rfid, slot, event_id');
  if (error) return res.status(500).json([]);
  res.json(data);
});

router.get('/attendees', async (req, res) => {
  try {
    const { event_id } = req.query;
    let query = supabase
      .from('attendees')
      .select(`
        *,
        payment_info:payment_info(payment_status, created_at)
      `)
      .order('last_name', { ascending: true });

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Attach the latest payment_status to each attendee
    const attendeesWithStatus = data.map(att => {
      let latestStatus = '';
      if (Array.isArray(att.payment_info) && att.payment_info.length > 0) {
        // Sort by created_at descending and get the latest
        att.payment_info.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        latestStatus = att.payment_info[0].payment_status;
      }
      return { ...att, payment_status: latestStatus };
    });

    res.json(attendeesWithStatus);
  } catch (err) {
    console.error('Attendees API error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch attendees.' });
  }
});

module.exports = router;
