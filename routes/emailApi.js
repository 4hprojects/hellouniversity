const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/emailSender');

router.post('/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
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
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;