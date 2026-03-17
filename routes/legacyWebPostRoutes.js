const express = require('express');
const validator = require('validator');
const { addEntryToSheet } = require('./sheetsService');

function normalizeField(value, maxLength) {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength)
    : '';
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function wantsJsonResponse(req) {
  const accept = req.get('accept') || '';

  return req.xhr
    || req.get('x-requested-with') === 'XMLHttpRequest'
    || accept.includes('application/json')
    || req.is('application/json');
}

function respondToContactRequest(req, res, statusCode, payload) {
  if (wantsJsonResponse(req)) {
    return res.status(statusCode).json(payload);
  }

  const params = new URLSearchParams({
    contactStatus: payload.success ? 'sent' : 'error',
    message: payload.message
  });

  return res.redirect(303, `/contact?${params.toString()}`);
}

async function sendContactEmail(payload) {
  const { sendEmail } = require('../utils/emailSender');
  return sendEmail(payload);
}

function createLegacyWebPostRoutes() {
  const router = express.Router();

  // Legacy IT quiz registration endpoint
  router.post('/submit', async (req, res) => {
    try {
      const response = await addEntryToSheet(req.body);
      return res.json({ message: response });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
  });

  router.post('/api/contact', async (req, res) => {
    const name = normalizeField(req.body?.name, 100);
    const email = normalizeField(req.body?.email, 160).toLowerCase();
    const category = normalizeField(req.body?.category, 80) || 'General support';
    const subject = normalizeField(req.body?.subject, 120);
    const message = normalizeField(req.body?.message, 5000);
    const website = normalizeField(req.body?.website, 255);

    if (website) {
      return respondToContactRequest(req, res, 200, {
        success: true,
        message: 'Your message has been received. Thank you!'
      });
    }

    if (!name || !email || !subject || !message) {
      return respondToContactRequest(req, res, 400, {
        success: false,
        message: 'Name, email, subject, and message are required.'
      });
    }

    if (!validator.isEmail(email)) {
      return respondToContactRequest(req, res, 400, {
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    if (message.length < 20) {
      return respondToContactRequest(req, res, 400, {
        success: false,
        message: 'Please provide a little more detail so the team can help.'
      });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCategory = escapeHtml(category);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin-bottom: 12px; color: #059669;">New HelloUniversity Contact Message</h2>
        <p>A contact message was submitted from the public contact page.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tbody>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #d1d5db; font-weight: 700;">Name</td>
              <td style="padding: 8px 10px; border: 1px solid #d1d5db;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #d1d5db; font-weight: 700;">Email</td>
              <td style="padding: 8px 10px; border: 1px solid #d1d5db;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #d1d5db; font-weight: 700;">Category</td>
              <td style="padding: 8px 10px; border: 1px solid #d1d5db;">${safeCategory}</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #d1d5db; font-weight: 700;">Subject</td>
              <td style="padding: 8px 10px; border: 1px solid #d1d5db;">${safeSubject}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin: 0 0 8px; font-weight: 700;">Message</p>
        <div style="padding: 14px; border: 1px solid #d1d5db; border-radius: 10px; background: #f8fafc;">
          ${safeMessage}
        </div>
      </div>
    `;

    try {
      const result = await sendContactEmail({
        to: '4hprojects@proton.me',
        subject: `[HelloUniversity Contact] ${subject}`,
        html: emailHtml
      });

      if (!result.success) {
        throw new Error(result.error || 'Unable to send contact message.');
      }

      return respondToContactRequest(req, res, 200, {
        success: true,
        message: 'Your message has been sent. Thank you for contacting HelloUniversity.'
      });
    } catch (error) {
      console.error('Contact form delivery failed:', error);
      return respondToContactRequest(req, res, 502, {
        success: false,
        message: 'We could not send your message right now. Please try again or email 4hprojects@proton.me directly.'
      });
    }
  });

  return router;
}

module.exports = createLegacyWebPostRoutes;
