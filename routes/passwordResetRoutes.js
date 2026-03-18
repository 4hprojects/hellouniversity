const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');

function createPasswordResetRoutes({
  getUsersCollection,
  sendEmail,
  hashPassword,
  generateOTP
}) {
  const router = express.Router();

  const resetRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many password reset requests. Please try again in 15 minutes.' }
  });

  const resetVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many verification attempts. Please try again in 15 minutes.' }
  });

  function usersOr503(res) {
    const usersCollection = getUsersCollection();
    if (!usersCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }
    return usersCollection;
  }

  router.post('/send-password-reset', resetRequestLimiter, async (req, res) => {
    const usersCollection = usersOr503(res);
    if (!usersCollection) return;

    const { email } = req.body;

    try {
      const user = await usersCollection.findOne({ emaildb: email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'If that email address is in our database, we will send you an email to reset your password.'
        });
      }

      const resetCode = generateOTP();
      const resetCodeHash = await bcrypt.hash(resetCode, 10);
      const resetExpires = new Date(Date.now() + 3600000);
      await usersCollection.updateOne(
        { emaildb: email },
        {
          $set: {
            resetCode: resetCodeHash,
            resetExpires,
            invalidResetAttempts: 0,
            resetCodeLockUntil: null
          }
        }
      );

      const isLocked = (user.accountLockedUntil && user.accountLockedUntil > new Date());
      let emailContent = '';
      if (isLocked) {
        emailContent = `
          <p>Dear ${user.firstName},</p>
          <p>We see you’re locked out for multiple login attempts.
             You may still reset your password right now.</p>
          <p>Reset code: ${resetCode}</p>
          <p>Best regards,<br/>HelloUniversity Student Portal Team</p>
        `;
      } else {
        emailContent = `
          <p>Dear ${user.firstName},</p>
          <p>You requested a password reset. Here is your reset code:</p>
          <p><b>${resetCode}</b></p>
          <p>Best regards,<br/>HelloUniversity Student Portal Team</p>
        `;
      }

      await sendEmail({ to: email, subject: 'Your Password Reset Code', html: emailContent });
      return res.json({
        success: true,
        message: 'If that email address is in our database, we will send you an email to reset your password.'
      });
    } catch (error) {
      console.error('Error processing your request:', error);
      return res.status(500).json({ success: false, message: 'Error processing your request' });
    }
  });

  router.post('/verify-reset-code', resetVerifyLimiter, async (req, res) => {
    const usersCollection = usersOr503(res);
    if (!usersCollection) return;

    const { email, resetCode } = req.body;

    try {
      const user = await usersCollection.findOne({ emaildb: email });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid credentials.' });
      }

      const codeExpired = user.resetExpires <= new Date();
      const codeMatch = user.resetCode && !codeExpired
        ? await bcrypt.compare(resetCode, user.resetCode)
        : false;

      if (!codeMatch || codeExpired) {
        let invalidAttempts = (user.invalidResetAttempts || 0) + 1;
        let attemptsLeft = 3 - invalidAttempts;
        let updateFields = { invalidResetAttempts: invalidAttempts };

        if (invalidAttempts >= 3) {
          updateFields.resetCodeLockUntil = new Date(Date.now() + 60 * 1000);
          updateFields.invalidResetAttempts = 0;
          updateFields.resetCode = null;
          updateFields.resetExpires = null;

          await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });
          return res.status(429).json({
            success: false,
            message: 'Too many invalid attempts. Please request a new reset code after 60 seconds.',
            attemptsLeft: 0
          });
        }

        await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset code.',
          attemptsLeft
        });
      }

      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { resetCodeVerified: true, invalidResetAttempts: 0, resetCodeLockUntil: null } }
      );

      return res.json({ success: true, message: 'Reset code verified.' });
    } catch (error) {
      console.error('Error verifying reset code:', error);
      return res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }
  });

  router.post('/reset-password', async (req, res) => {
    const usersCollection = usersOr503(res);
    if (!usersCollection) return;

    const { email, newPassword } = req.body;

    try {
      const user = await usersCollection.findOne({
        emaildb: email,
        resetCodeVerified: true,
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request or account is disabled.',
        });
      }

      const hashedNewPassword = await hashPassword(newPassword);
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedNewPassword,
            resetCode: null,
            resetExpires: null,
            resetCodeVerified: false,
            accountLockedUntil: null,
            invalidLoginAttempts: 0
          },
        }
      );

      return res.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(500).json({
        success: false,
        message: 'Error resetting password.',
      });
    }
  });

  return router;
}

module.exports = createPasswordResetRoutes;

