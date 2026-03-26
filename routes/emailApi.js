const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const { sendEmail } = require('../utils/emailSender');

const registrationEmailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration requests. Please try again later.' }
});

router.post('/send-email', registrationEmailLimiter, async (req, res) => {
  const { to } = req.body;
  if (!to || !validator.isEmail(String(to))) {
    return res.status(400).json({ success: false, message: 'A valid recipient email address is required.' });
  }
  const subject = 'HelloUniversity - Registration Confirmation';
  const html = `
    <p>Thank you for registering with HelloUniversity!</p>
    <p>Your registration has been received. Please keep this email for your records.</p>
    <p>Best regards,<br/>HelloUniversity Platform Team</p>
  `;
  try {
    const result = await sendEmail({ to, subject, html });
    if (result.success) {
      const { confirmationCode, emailSent } = result;
      res.json({
        success: true,
        confirmationCode,
        message: emailSent
          ? 'Registration successful! Please check your email for your confirmation code.'
          : 'Registration successful! However, we could not send a confirmation email at this time. Please take a screenshot of this page or write down your confirmation code for your reference.'
      });
    } else {
      res.status(500).json({ success: false, message: result.error || 'Failed to send email.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'An error occurred while sending the email.' });
  }
});

module.exports = router;
