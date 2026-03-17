const express = require('express');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const randomizeActivity = require('../utils/activityRandomizer');

module.exports = function activityRandomRoutes({ activityAssignmentsCollection, sendEmail }) {
  const router = express.Router();

  // Test email exclusions
  const TEST_EMAILS = new Set(['henson.sagorsor@e.ubaguio.edu']);
  const SUBJECTS = new Set(['PROGIT1', 'DSALGO1']);

  const activityRandomLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again in a minute.' }
  });

  function requireStaffIfConfigured(req, res, next) {
    const requireStaff = String(process.env.ACTIVITY_RANDOM_REQUIRE_STAFF).toLowerCase() === 'true';
    if (!requireStaff) return next();

    const role = req.session?.role;
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (role === 'teacher' || role === 'admin' || role === 'manager') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  router.post('/activity/random', activityRandomLimiter, requireStaffIfConfigured, async (req, res) => {
    try {
      if (!activityAssignmentsCollection) {
        return res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      }

      const { email, idNumber, subject, ['g-recaptcha-response']: recaptcha } = req.body;
      const lowerEmail = String(email).toLowerCase();
      const isTest = TEST_EMAILS.has(lowerEmail);

      // Basic validation (server-side; do not trust client)
      const m = /^(\d+)@s\.ubaguio\.edu$/i.exec(email || '');
      if (!isTest) {
        if (!m) return res.status(400).json({ success: false, message: 'Invalid email.' });
        if (m[1] !== idNumber) return res.status(400).json({ success: false, message: 'ID does not match email.' });
      }
      if (!subject || !SUBJECTS.has(subject)) {
        return res.status(400).json({ success: false, message: 'Subject is invalid.' });
      }

      const captchaDisabled = String(process.env.DISABLE_CAPTCHA).toLowerCase() === 'true';
      if (!isTest && !captchaDisabled) {
        if (!recaptcha) {
          return res.status(400).json({ success: false, message: 'Captcha required.' });
        }

        const secret = (process.env.SECRET_KEY || '').trim();
        if (!secret) {
          return res.status(500).json({ success: false, message: 'Captcha is not configured.' });
        }

        const verifyResp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret,
            response: recaptcha,
            remoteip: req.ip,
          }),
        });
        const verify = await verifyResp.json();
        if (!verify.success) {
          return res.status(400).json({ success: false, message: 'Captcha verification failed.' });
        }
      }

      // Pick random activity link via util
      const activityLink = randomizeActivity(subject);

      // Persist
      await activityAssignmentsCollection.insertOne({
        email: lowerEmail,
        idNumber: String(idNumber || ''),
        subject,
        activityLink,
        createdAt: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        isTest,
      });

      // Send plain text email
      const mailSubject = `Your randomized activity for ${subject}`;
      const text =
`Hello ${idNumber || 'Student'},

Here is your randomized activity for ${subject}:
${activityLink}

Good luck!
HelloUniversity`;

      await sendEmail({ to: email, subject: mailSubject, text });

      return res.json({ success: true, message: 'Activity assigned and emailed.' });
    } catch (err) {
      console.error('POST /api/activity/random error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
};

