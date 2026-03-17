const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { logAuditTrail } = require('../utils/auditTrail');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
 
const APPSCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz8rsTh7FsEUbpq1FR33VMQ_2auDYpjuq6SJTbOmgzHqHSRThylSkpEe7ZTExBo8099jQ/exec';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

router.post('/process-bulkregister', async (req, res) => {
  try {
    const selectedEventId = req.body.event_id; // event_id from admin dropdown
    if (!selectedEventId) {
      return res.status(400).json({ status: 'error', message: 'No event selected.' });
    }

    // 1. Fetch all rows from BulkRegister tab
    const sheetRes = await fetch(`${APPSCRIPT_URL}?bulkregister=1`);
    const rows = await sheetRes.json();

    // 2. Fetch all events once before the loop
    const eventsRes = await fetch(`${BASE_URL}/api/events/all`);
    const events = await eventsRes.json();
    console.log('Bulk events:', events); // <--- Add this

    // 3. Fetch all RFIDs for this event in advance
    const { data: existingAttendees } = await supabase
      .from('attendees')
      .select('rfid')
      .eq('event_id', selectedEventId);
    const existingRfids = new Set((existingAttendees || []).map(a => a.rfid));

    let registered = 0, duplicate = 0, error = 0, skipped = 0;
    let processedRows = [];
    let auditSummary = [];

    // Assign _rowIndex to each row if not present
    rows.forEach((row, idx) => {
      if (row._rowIndex === undefined) row._rowIndex = idx + 2; // +2 if header is row 1
    });

    for (const row of rows) {
      // Only process rows with blank status
      if (row.status && String(row.status).trim() !== '') {
        skipped++;
        continue;
      }

      // Only process rows with blank event_id or matching selected event_id
      if (row.event_id && String(row.event_id).trim() !== '' && String(row.event_id) !== String(selectedEventId)) {
        skipped++;
        continue;
      }

      // Apply selected event_id if blank
      row.event_id = selectedEventId;

      // === Validation ===
      let statusMsg = '';
      const requiredFields = ['first_name', 'last_name', 'organization', 'rfid'];
      const missingFields = requiredFields.filter(f => !row[f] || String(row[f]).trim() === '');
      const emailValid = row['email'] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['email']);

      if (missingFields.length > 0) {
        error++;
        statusMsg = 'Error: Missing ' + missingFields.join(', ');
        auditSummary.push(`Row ${row._rowIndex}: ${statusMsg}`);
      } else if (!emailValid) {
        error++;
        statusMsg = 'Error: Invalid email format';
        auditSummary.push(`Row ${row._rowIndex}: ${statusMsg}`);
      } else if (existingRfids.has(row.rfid)) {
        duplicate++;
        statusMsg = 'Duplicate';
        auditSummary.push(`Row ${row._rowIndex}: Duplicate RFID (${row.rfid})`);
      } else {
        // Try to register
        try {
          const payload = {
            id: uuidv4(),
            first_name: row['first_name'] || '',
            middle_name: row['middle_name'] || '',
            last_name: row['last_name'] || '',
            organization: row['organization'] || '',
            email: row['email'] || '',
            contact_no: row['phone_no'] || '',
            rfid: row['rfid'] || '',
            event_id: row['event_id']
          };
          const { error: regErr } = await supabase
            .from('attendees')
            .insert([payload]);
          if (regErr) {
            error++;
            statusMsg = 'Error: ' + regErr.message;
            auditSummary.push(`Row ${row._rowIndex}: ${statusMsg}`);
          } else {
            registered++;
            existingRfids.add(row.rfid); // Prevent further duplicates in this batch
            statusMsg = 'Registered';
            auditSummary.push(`Row ${row._rowIndex}: Registered (${row.rfid})`);
          }
        } catch (err) {
          error++;
          statusMsg = 'Error: ' + err.message;
          auditSummary.push(`Row ${row._rowIndex}: ${statusMsg}`);
        }
      }

      // Update Status in Google Sheet
      await fetch(APPSCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateBulkRegisterStatus: "1",
          rowIndex: row._rowIndex,
          status: statusMsg
        })
      });

      processedRows.push({ ...row, status: statusMsg });
    }

    // Log a single audit trail entry for the bulk operation
    await logAuditTrail({
      req,
      action: 'ADMIN_BULK_REGISTER_ATTENDEE',
      details: `Event: ${selectedEventId} | Registered: ${registered}, Duplicate: ${duplicate}, Error: ${error}, Skipped: ${skipped}\n` +
        auditSummary.join('\n')
    });

    res.json({
      registered,
      duplicate,
      error,
      skipped,
      processedRows
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.post('/process-bulkregister-upload', async (req, res) => {
  try {
    const { event_id, rows } = req.body;
    if (!event_id || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Missing event_id or rows.' });
    }

    // 3. Fetch all RFIDs for this event in advance
    const { data: existingAttendees } = await supabase
      .from('attendees')
      .select('rfid')
      .eq('event_id', event_id);
    const existingRfids = new Set((existingAttendees || []).map(a => a.rfid));

    let registered = 0, duplicate = 0, error = 0, skipped = 0;
    let processedRows = [];
    let auditSummary = [];

    // Assign _rowIndex to each row if not present
    rows.forEach((row, idx) => {
      if (row._rowIndex === undefined) row._rowIndex = idx + 2; // +2 if header is row 1
    });

    for (const row of rows) {
      // Only process rows with blank status
      if (row.status && String(row.status).trim() !== '') {
        skipped++;
        continue;
      }

      // Only process rows with blank event_id or matching selected event_id
      if (row.event_id && String(row.event_id).trim() !== '' && String(row.event_id) !== String(event_id)) {
        skipped++;
        continue;
      }

      // Apply selected event_id if blank
      row.event_id = event_id;

      // === Validation ===
      let statusMsg = '';
      const requiredFields = ['first_name', 'last_name', 'organization', 'rfid'];
      const missingFields = requiredFields.filter(f => !row[f] || String(row[f]).trim() === '');
      const emailValid = row['email'] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['email']);

      if (missingFields.length > 0) {
        error++;
        statusMsg = 'Error: Missing ' + missingFields.join(', ');
        auditSummary.push(`Row ${row._rowIndex}: ${statusMsg}`);
      } else if (!emailValid) {
        error++;
        statusMsg = 'Error: Invalid email format';
        auditSummary.push(`Row ${row._rowIndex}: ${statusMsg}`);
      } else if (existingRfids.has(row.rfid)) {
        duplicate++;
        statusMsg = 'Duplicate';
        auditSummary.push(`Row ${row._rowIndex}: Duplicate RFID (${row.rfid})`);
      } else {
        // Try to register
        try {
          const payload = {
            id: uuidv4(),
            first_name: row['first_name'] || '',
            middle_name: row['middle_name'] || '',
            last_name: row['last_name'] || '',
            organization: row['organization'] || '',
            email: row['email'] || '',
            contact_no: row['phone_no'] || '',
            rfid: row['rfid'] || '',
            event_id: row['event_id']
          };
          const { error: regErr } = await supabase
            .from('attendees')
            .insert([payload]);
          if (regErr) {
            error++;
            statusMsg = 'Error: ' + regErr.message;
            auditSummary.push(`Row ${row._rowIndex}: ${statusMsg}`);
          } else {
            registered++;
            existingRfids.add(row.rfid); // Prevent further duplicates in this batch
            statusMsg = 'Registered';
            auditSummary.push(`Row ${row._rowIndex}: Registered (${row.rfid})`);
          }
        } catch (err) {
          error++;
          statusMsg = 'Error: ' + err.message;
          auditSummary.push(`Row ${row._rowIndex}: ${statusMsg}`);
        }
      }

      processedRows.push({ ...row, status: statusMsg });
    }

    // Log a single audit trail entry for the bulk operation
    await logAuditTrail({
      req,
      action: 'ADMIN_BULK_REGISTER_ATTENDEE',
      details: `Event: ${event_id} | Registered: ${registered}, Duplicate: ${duplicate}, Error: ${error}, Skipped: ${skipped}\n` +
        auditSummary.join('\n')
    });

    res.json({
      registered,
      duplicate,
      error,
      skipped,
      processedRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin-register', async (req, res) => {
  try {
    const { rfid, ...rest } = req.body;
    if (!rfid || !rfid.trim()) {
      await logAuditTrail({
        req,
        action: 'ADMIN_REGISTER_ATTENDEE_FAILED',
        details: 'Missing RFID'
      });
      return res.status(400).json({ success: false, message: 'RFID is required.' });
    }

    // Check for duplicate RFID
    const { data: existing } = await supabase
      .from('attendees')
      .select('id')
      .eq('rfid', rfid)
      .maybeSingle();
    if (existing) {
      await logAuditTrail({
        req,
        action: 'ADMIN_REGISTER_ATTENDEE_FAILED',
        details: 'Duplicate RFID'
      });
      return res.status(409).json({ success: false, message: 'RFID already registered.' });
    }

    // Proceed with registration
    const payload = {
      id: uuidv4(),
      rfid,
      ...rest
    };
    const { error: regErr } = await supabase
      .from('attendees')
      .insert([payload]);
    if (regErr) {
      await logAuditTrail({
        req,
        action: 'ADMIN_REGISTER_ATTENDEE_FAILED',
        details: regErr.message
      });
      return res.status(500).json({ success: false, message: 'Server error.' });
    }

    await logAuditTrail({
      req,
      action: 'ADMIN_REGISTER_ATTENDEE',
      details: 'Registration successful'
    });

    res.json({ success: true, message: 'Registration successful.' });
  } catch (err) {
    await logAuditTrail({
      req,
      action: 'ADMIN_REGISTER_ATTENDEE_FAILED',
      details: err.message
    });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;