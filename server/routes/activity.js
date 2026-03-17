module.exports = function(activityAssignmentsCollection) {
  const express = require('express');
  const router = express.Router();
  const nodemailer = require('nodemailer');
  const crypto = require('crypto');

  // Example transporter (configure with your SMTP details)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email provider
    auth: {
      user: process.env.EMAIL_USER, // your email
      pass: process.env.EMAIL_PASS  // your email password or app password
    }
  });

  // Task 1: Define the 3 activity links as constants at the top of the file
  const ACTIVITY_LINKS = [
    { activityNo: 1, url: 'https://placeholder.link1' }, // activity1
    { activityNo: 2, url: 'https://placeholder.link2' }, // activity2
    { activityNo: 3, url: 'https://placeholder.link3' }  // activity3
  ];

  router.post('/random', async (req, res) => {
    try {
      const { email, idNumber, subject, ['g-recaptcha-response']: recaptcha } = req.body;
      if (!email || !idNumber || !subject) {
        return res.status(400).json({ message: 'Missing required fields.' });
      }

      const lowerEmail = String(email).toLowerCase();
      const TEST_EMAIL = 'henson.sagorsor@e.ubaguio.edu';

      // --- reCAPTCHA verification (skip for test account) ---
      if (lowerEmail !== TEST_EMAIL && String(process.env.DISABLE_CAPTCHA).toLowerCase() !== 'true') {
        if (!recaptcha) {
          return res.status(400).json({ message: 'Captcha required.' });
        }
        const fetch = require('node-fetch');
        const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: process.env.RECAPTCHA_SECRET_KEY,
            response: recaptcha,
            remoteip: req.ip,
          }),
        });
        const verify = await resp.json();
        if (!verify.success) {
          return res.status(400).json({ message: 'Captcha verification failed.' });
        }
      }

      // --- Sequential Activity Assignment Logic ---
      let activityNo = 1; // default to 1
      if (lowerEmail !== TEST_EMAIL) {
        // Find the last assignment for this studentIDNumber (and subject, if needed)
        const lastAssignment = await activityAssignmentsCollection.findOne(
          { idNumber, subject },
          { sort: { createdAt: -1 } }
        );
        if (lastAssignment && lastAssignment.activityNo) {
          activityNo = lastAssignment.activityNo % 3 + 1; // cycle 1→2→3→1...
        }
      } else {
        // For test account, always assign activity 1 (or you can randomize if you wish)
        activityNo = 1;
      }
      const activityLinkObj = ACTIVITY_LINKS.find(a => a.activityNo === activityNo);

      // Generate a unique token for the activity link
      const uniqueToken = crypto.randomBytes(24).toString('hex');
      const activityLink = `https://yourdomain.com/activity/${uniqueToken}`;

      // Store assignment in MongoDB: studentIDNumber, activityNo, createdAt
      await activityAssignmentsCollection.insertOne({
        idNumber,
        activityNo,
        createdAt: new Date()
      });

      // Compose the email (Task 4)
      const mailOptions = {
        from: '"HelloUniversity" <no-reply@yourdomain.com>',
        to: email,
        subject: `Your Activity Assignment for ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border:1px solid #eee; border-radius:8px; padding:24px;">
            <h2 style="color:#2d7ff9;">HelloUniversity Activity Assignment</h2>
            <p>Hello${idNumber ? ' ' + idNumber : ''},</p>
            <p>
              You are assigned with activity No ${activityNo}, here is the link for your reference:
            </p>
            <p>
              <a href="${activityLinkObj.url}" style="display:inline-block; background:#2d7ff9; color:#fff; padding:12px 24px; border-radius:4px; text-decoration:none; font-weight:bold;">
                Access Your Activity
              </a>
            </p>
            <p style="font-size:13px; color:#555;">
              Or copy and paste this link into your browser:<br>
              <span style="word-break:break-all;">${activityLinkObj.url}</span>
            </p>
            <hr style="margin:24px 0;">
            <p style="font-size:12px; color:#888;">
              If you did not request this, you can safely ignore this email.<br>
              <br>
              &copy; ${new Date().getFullYear()} HelloUniversity
            </p>
          </div>
        `
      };

      // Send the email
      await transporter.sendMail(mailOptions);

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send email.' });
    }
  });

  return router;
};
