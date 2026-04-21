//userRegisterApi.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { logAuditTrail } = require('../utils/auditTrail');
const { sendEmail } = require('../utils/emailSender');
const { getPublicBaseUrl } = require('../utils/publicBaseUrl');
const { supabase } = require('../supabaseClient');

router.post('/user-register', async (req, res) => {
  try {
    const {
      firstName, middleName, lastName, gender, designation, organizationType, organization,
      province, municipality, barangay, email, contactNo, accommodation, accommodationOther, event_id,
      certificateName,
      organization_type,   // <-- add this
      organization_name,    // <-- add this
      registration_token
    } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email ) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    }

    // Check for duplicate registration token
    if (registration_token) {
      const { data: existing } = await supabase
        .from('attendees')
        .select('id')
        .eq('registration_token', registration_token)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({ success: false, message: 'Duplicate submission detected.' });
      }
    }

    // Generate confirmation code
    const confirmationCode = uuidv4().split('-')[0].toUpperCase();
    const id = uuidv4();

    let eventDate = null;
    let eventName = null;
    let yymmdd = null;

    if (event_id) {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('event_name, start_date')
        .eq('event_id', event_id)
        .maybeSingle();

      if (eventError || !eventData || !eventData.start_date) {
        // ...log failed attempt...
        return res.status(400).json({ success: false, message: 'Invalid event.' });
      }

      eventDate = eventData.start_date;
      eventName = eventData.event_name;
      yymmdd = eventDate.replace(/-/g, '').slice(2, 8);
    } else {
      // If event_id is not provided, use default values or skip attendee_no logic
      yymmdd = '000000';
      eventName = 'N/A';
      eventDate = 'N/A';
    }

    let attendee_no = null;
    if (event_id) {
      // Get the MAX attendee_no for this event
      const { data: maxData, error: maxError } = await supabase
        .from('attendees')
        .select('attendee_no')
        .eq('event_id', event_id)
        .like('attendee_no', `${yymmdd}%`)
        .order('attendee_no', { ascending: false })
        .limit(1)
        .single();

      let nextSeq = 1;
      if (!maxError && maxData?.attendee_no) {
        const lastSeq = parseInt(maxData.attendee_no.slice(-3), 10);
        nextSeq = lastSeq + 1;
      }
      attendee_no = `${yymmdd}${String(nextSeq).padStart(3, '0')}`;
    } else {
      attendee_no = 'X' + uuidv4().slice(0, 8); // fallback
    }


    const attendeeData = {
      id,
      attendee_no,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      gender,
      designation,
      organization_type,
      organization_name,
      organization: organization_name, // <-- add this line
      province,
      municipality,
      barangay,
      email,
      contact_no: contactNo,
      accommodation,
      accommodation_other: accommodationOther,
      confirmation_code: confirmationCode,
      event_id,
      certificate_name: certificateName,
      att_status: 'Pending' // default status
    };

    const { data, insertError } = await safeInsertAttendee(attendeeData, event_id, yymmdd, supabase);
    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.status(500).json({ success: false, message: 'Database registration failed.', error: insertError });
    }

    // Log the registration action in the audit trail
    await supabase
      .from('audit_trail')
      .insert([{
        user_id: req.user?.id || 'public', // or use session/user info if available
        user_role: req.user?.role || 'guest',
        user_name: req.user?.name || (firstName + ' ' + lastName),
        action: 'REGISTER_ATTENDEE',
        user_agent: req.headers['user-agent'],
        ip_address: req.ip
      }]);

    await logAuditTrail({
      req,
      action: 'REGISTER_ATTEMPT_SUCCESS',
      userIdOverride: 'attendee',
      userRoleOverride: 'attendee',
      userNameOverride: req.body.email // or full name if you prefer
    });

    // Send confirmation email if email is provided
    let emailSent = true;
    if (email) {
      try {
        const baseUrl = getPublicBaseUrl();
        const result = await sendEmail({
          to: email,
          subject: 'CRFV Event Registration Confirmation',
          html: `
<p>Dear ${firstName} ${lastName},</p>

<p>Thank you for registering for <strong>${eventName}</strong>.</p>

<h3>Registration Details:</h3>
<table>
  <tr><td><strong>Event:</strong></td><td>${eventName}</td></tr>
  <tr><td><strong>Date:</strong></td><td>${eventDate}</td></tr>
  <tr><td><strong>Attendee #:</strong></td><td>${attendee_no}</td></tr>
  <tr><td><strong>Confirmation Code:</strong></td><td>${confirmationCode}</td></tr>
  <tr><td><strong>Accommodation:</strong></td><td>${accommodation}${accommodationOther ? ' (' + accommodationOther + ')' : ''}</td></tr>
  <tr><td><strong>Name on Certificate:</strong></td><td>${certificateName}</td></tr>
</table>

<br>

<div style="border:1px solid #e0e6ed;padding:16px 18px;border-radius:8px;background:#f8fafc;margin-bottom:18px;">
  <strong>Please take note of the following reminders to ensure smooth and successful participation:</strong>

  <ul style="margin:12px 0 0 18px;padding:0;">
    <li>Full attendance in all sessions is required to receive a certificate.</li>
    <li>Attendance will be monitored and recorded for each session.</li>
    <li>Participants are expected to comply with all event guidelines and schedules.</li>
    <li><strong>The proximity card must be returned</strong> after the event, along with any other borrowed materials, as applicable. Items should be returned to the designated collection point or by prepaid mail if taken off-site.</li>
  </ul>

  <p>We appreciate your cooperation and look forward to your active participation.</p>

  <div style="margin-top:10px;">
    For full details, please review the 
    <a href="${baseUrl}/crfv/event-agreement" target="_blank" rel="noopener">Event Participation Agreement</a>.
  </div>
</div>

<p>Keep your confirmation code for reference. You may be asked to present it during event check-in.<br>
If you have any questions, please contact the event organiser directly.</p>

<p>
  Sincerely,<br>
  The CRFV Event Registration Team<br>
  Event Host – <a href="https://crfv-cpu.org" target="_blank">crfv-cpu.org</a><br>
  Registration System Host – <a href="${baseUrl}" target="_blank">${baseUrl.replace(/^https?:\/\//, '')}</a>
</p>

<hr>

<p style="font-size:0.95em;color:#888;">
  By registering, you agree to our <a href="${baseUrl}/crfv/privacy-policy" target="_blank">Data Privacy Policy</a>.
</p>

<p style="font-size:0.95em;color:#888;">
  This is an automated message. Please do not reply directly to this email.
</p>

<p style="color:#2a5298;">
  <strong>Note:</strong> Certificates are expected to be issued within 7 business days after the event, once all requirements are fulfilled. While we aim to meet this timeline, delays may occur due to factors beyond the organiser's control.
</p>
 

        `
        });
        if (!result.success) {
          emailSent = false;
          console.error('Email send error:', result.error);
        } else {
          console.log(`[EMAIL] Confirmation sent via ${result.provider} to: ${email}`);
        }
      } catch (emailErr) {
        emailSent = false;
        console.error('Email send error:', emailErr);
      }
    }
 
    res.json({
      success: true,
      confirmationCode,
      message: emailSent
        ? 'Registration successful! Please check your email for your confirmation code.'
        : 'Registration successful! However, we could not send a confirmation email at this time. Please contact the organizer if you need assistance.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

//console.log('SENDGRID_FROM_EMAIL:', process.env.SENDER_EMAIL);

module.exports = router;

//address of location and venue should be compelted by the event organiser

// Generate attendee_no using max+1 with retry (for event registrations)
async function getNextAttendeeNo(event_id, yymmdd, supabase) {
  const { data: maxData } = await supabase
    .from('attendees')
    .select('attendee_no')
    .eq('event_id', event_id)
    .like('attendee_no', `${yymmdd}%`)
    .order('attendee_no', { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (maxData && maxData.length > 0 && maxData[0]?.attendee_no) {
    const lastNo = maxData[0].attendee_no;
    const lastSeq = parseInt(lastNo.slice(-3), 10);
    nextSeq = lastSeq + 1;
  }
  return `${yymmdd}${String(nextSeq).padStart(3, '0')}`;
}

async function safeInsertAttendee(attendeeData, event_id, yymmdd, supabase, maxRetries = 5) {
  let attempt = 0;
  let insertError = null;
  let data = null;
  while (attempt < maxRetries) {
    attendeeData.attendee_no = await getNextAttendeeNo(event_id, yymmdd, supabase);
    console.log(`Attempt ${attempt + 1}: Trying attendee_no ${attendeeData.attendee_no}`);
    const result = await supabase.from('attendees').insert([attendeeData]);
    data = result.data;
    insertError = result.error;
    if (!insertError) break;
    if (insertError.code !== '23505') break; // Only retry on duplicate key error
    attempt++;
  }
  // Fallback: If still duplicate after retries, use a random unique attendee_no
  if (insertError && insertError.code === '23505') {
    attendeeData.attendee_no = `${yymmdd}${Math.floor(1000 + Math.random() * 9000)}`; // 4 random digits
    console.log(`Fallback: Trying attendee_no ${attendeeData.attendee_no}`);
    const result = await supabase.from('attendees').insert([attendeeData]);
    data = result.data;
    insertError = result.error;
  }
  return { data, insertError };
}
