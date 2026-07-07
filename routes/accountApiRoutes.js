const express = require('express');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { requireCsrf } = require('../middleware/apiSecurity');
const { getPublicBaseUrl } = require('../utils/publicBaseUrl');

function createAccountApiRoutes({
  getUsersCollection,
  isAuthenticated,
  bcrypt,
  validator,
  sendEmail,
}) {
  const router = express.Router();

  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;

  function usersOr503(res) {
    const usersCollection = getUsersCollection();
    if (!usersCollection) {
      res.status(503).json({
        success: false,
        message: 'Service unavailable. Please try again.',
      });
      return null;
    }
    return usersCollection;
  }

  function toProfilePayload(user) {
    return {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      studentIDNumber: user.studentIDNumber || '',
      role: user.role || '',
      email: user.emaildb || '',
      emailVerified: Boolean(user.emailConfirmed),
      pendingEmail: user.pendingEmailChange?.email || '',
      pendingEmailExpiresAt: user.pendingEmailChange?.expires
        ? new Date(user.pendingEmailChange.expires).toISOString()
        : null,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      lastLoginAt: user.lastLoginTime
        ? new Date(user.lastLoginTime).toISOString()
        : null,
      lastPasswordChangeAt: user.lastPasswordChangeAt
        ? new Date(user.lastPasswordChangeAt).toISOString()
        : null,
    };
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async function findSessionUser(usersCollection, req) {
    if (req.session?.userId) {
      try {
        return await usersCollection.findOne(
          { _id: new ObjectId(req.session.userId) },
          {
            projection: {
              firstName: 1,
              lastName: 1,
              studentIDNumber: 1,
              role: 1,
              emaildb: 1,
              emailConfirmed: 1,
              pendingEmailChange: 1,
              createdAt: 1,
              lastLoginTime: 1,
              lastPasswordChangeAt: 1,
              password: 1,
            },
          },
        );
      } catch (_err) {
        return null;
      }
    }

    if (req.session?.studentIDNumber) {
      return usersCollection.findOne(
        { studentIDNumber: req.session.studentIDNumber },
        {
          projection: {
            firstName: 1,
            lastName: 1,
            studentIDNumber: 1,
            role: 1,
            emaildb: 1,
            emailConfirmed: 1,
            pendingEmailChange: 1,
            createdAt: 1,
            lastLoginTime: 1,
            lastPasswordChangeAt: 1,
            password: 1,
          },
        },
      );
    }

    return null;
  }

  router.get('/account/profile', isAuthenticated, async (req, res) => {
    const usersCollection = usersOr503(res);
    if (!usersCollection) return;

    try {
      const user = await findSessionUser(usersCollection, req);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: 'User not found.' });
      }

      return res.json({ success: true, user: toProfilePayload(user) });
    } catch (error) {
      console.error('Error loading account profile:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Failed to load profile.' });
    }
  });

  router.put('/account/profile', isAuthenticated, async (req, res) => {
    const usersCollection = usersOr503(res);
    if (!usersCollection) return;
    const csrfResult = requireCsrf(req, res, () => true);
    if (csrfResult !== true) return;

    try {
      const user = await findSessionUser(usersCollection, req);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: 'User not found.' });
      }

      const nextFirstName = validator.trim(
        String(req.body?.firstName || user.firstName || ''),
      );
      const nextLastName = validator.trim(
        String(req.body?.lastName || user.lastName || ''),
      );

      if (!nextFirstName || !nextLastName) {
        return res.status(400).json({
          success: false,
          message: 'First and last name are required.',
        });
      }
      if (nextFirstName.length > 60 || nextLastName.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'Name fields exceed maximum length.',
        });
      }
      const updateFields = {
        firstName: nextFirstName,
        lastName: nextLastName,
        updatedAt: new Date(),
      };

      await usersCollection.updateOne(
        { _id: user._id },
        { $set: updateFields },
      );

      if (req.session) {
        req.session.firstName = nextFirstName;
        req.session.lastName = nextLastName;
      }

      const updatedUser = await usersCollection.findOne(
        { _id: user._id },
        {
          projection: {
            firstName: 1,
            lastName: 1,
            studentIDNumber: 1,
            role: 1,
            emaildb: 1,
            emailConfirmed: 1,
            pendingEmailChange: 1,
            createdAt: 1,
            lastLoginTime: 1,
            lastPasswordChangeAt: 1,
          },
        },
      );

      return res.json({
        success: true,
        message: 'Profile updated.',
        user: toProfilePayload(updatedUser || updateFields),
      });
    } catch (error) {
      console.error('Error updating account profile:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Failed to update profile.' });
    }
  });

  router.post(
    '/account/email-change/request',
    isAuthenticated,
    async (req, res) => {
      const usersCollection = usersOr503(res);
      if (!usersCollection) return;
      const csrfResult = requireCsrf(req, res, () => true);
      if (csrfResult !== true) return;

      try {
        if (typeof sendEmail !== 'function') {
          return res.status(503).json({
            success: false,
            message: 'Email service is unavailable. Please try again later.',
          });
        }

        const user = await findSessionUser(usersCollection, req);
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: 'User not found.' });
        }

        const rawEmail = validator.trim(String(req.body?.email || ''));
        const nextEmail = rawEmail
          ? validator.normalizeEmail(rawEmail, { gmail_remove_dots: false }) ||
            rawEmail.toLowerCase()
          : '';

        if (!nextEmail || !validator.isEmail(nextEmail)) {
          return res
            .status(400)
            .json({ success: false, message: 'Enter a valid email address.' });
        }
        if (nextEmail.length > 120) {
          return res
            .status(400)
            .json({ success: false, message: 'Email exceeds maximum length.' });
        }
        if (
          String(user.emaildb || '').toLowerCase() === nextEmail.toLowerCase()
        ) {
          return res.status(400).json({
            success: false,
            message: 'Enter a different email address.',
          });
        }

        const existingByEmail = await usersCollection.findOne({
          emaildb: { $regex: `^${escapeRegex(nextEmail)}$`, $options: 'i' },
          _id: { $ne: user._id },
        });
        if (existingByEmail) {
          return res
            .status(409)
            .json({ success: false, message: 'Email is already in use.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              pendingEmailChange: {
                email: nextEmail,
                token,
                expires,
                requestedAt: new Date(),
              },
              updatedAt: new Date(),
            },
          },
        );

        const verificationLink = `${getPublicBaseUrl()}/api/account/email-change/confirm/${token}`;
        await sendEmail({
          to: nextEmail,
          subject: 'Confirm your HelloUniversity email change',
          html: `
          <p>Hi ${user.firstName || 'there'},</p>
          <p>You requested to change your HelloUniversity account email address.</p>
          <p>Confirm this new email by clicking the button below:</p>
          <p>
            <a href="${verificationLink}" style="background:#4f46e5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Confirm Email Change</a>
          </p>
          <p>This link expires in 24 hours. Your current account email will stay unchanged until this new email is verified.</p>
          <p>If you did not request this change, you can ignore this email.</p>
        `,
        });

        return res.json({
          success: true,
          message:
            'Verification email sent. Your email will update after you verify the new address.',
          pendingEmail: nextEmail,
          expiresAt: expires,
        });
      } catch (error) {
        console.error('Error requesting account email change:', error);
        return res
          .status(500)
          .json({ success: false, message: 'Failed to request email change.' });
      }
    },
  );

  router.post(
    '/account/email-change/cancel',
    isAuthenticated,
    async (req, res) => {
      const usersCollection = usersOr503(res);
      if (!usersCollection) return;
      const csrfResult = requireCsrf(req, res, () => true);
      if (csrfResult !== true) return;

      try {
        const user = await findSessionUser(usersCollection, req);
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: 'User not found.' });
        }

        await usersCollection.updateOne(
          { _id: user._id },
          {
            $unset: { pendingEmailChange: '' },
            $set: { updatedAt: new Date() },
          },
        );

        return res.json({
          success: true,
          message: 'Pending email change cancelled.',
        });
      } catch (error) {
        console.error('Error cancelling account email change:', error);
        return res
          .status(500)
          .json({ success: false, message: 'Failed to cancel email change.' });
      }
    },
  );

  router.get('/account/email-change/confirm/:token', async (req, res) => {
    const usersCollection = usersOr503(res);
    if (!usersCollection) return;

    try {
      const token = String(req.params.token || '').trim();
      const user = await usersCollection.findOne({
        'pendingEmailChange.token': token,
      });

      if (!user?.pendingEmailChange) {
        return res.render('pages/auth/confirmation-status', {
          title: 'Invalid Email Change Link | HelloUniversity',
          description:
            'This HelloUniversity email change link is invalid or expired.',
          canonicalUrl: 'https://hellouniversity.online/confirm-email-change',
          stylesheets: ['/css/auth.css'],
          heading: 'Invalid or expired link',
          message:
            'This email change link is invalid or has already been used.',
          primaryLinkHref: '/crfv/account-settings',
          primaryLinkText: 'Back to Account Settings',
          secondaryLinkHref: '/login',
          secondaryLinkText: 'Back to Login',
          showEmailForm: false,
        });
      }

      if (new Date(user.pendingEmailChange.expires) < new Date()) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $unset: { pendingEmailChange: '' } },
        );
        return res.render('pages/auth/confirmation-status', {
          title: 'Email Change Link Expired | HelloUniversity',
          description: 'This HelloUniversity email change link has expired.',
          canonicalUrl: 'https://hellouniversity.online/confirm-email-change',
          stylesheets: ['/css/auth.css'],
          heading: 'Link expired',
          message:
            'Your email change link expired. Request a new email change from account settings.',
          primaryLinkHref: '/crfv/account-settings',
          primaryLinkText: 'Back to Account Settings',
          secondaryLinkHref: '/login',
          secondaryLinkText: 'Back to Login',
          showEmailForm: false,
        });
      }

      const nextEmail = user.pendingEmailChange.email;
      const existingByEmail = await usersCollection.findOne({
        emaildb: { $regex: `^${escapeRegex(nextEmail)}$`, $options: 'i' },
        _id: { $ne: user._id },
      });
      if (existingByEmail) {
        return res.render('pages/auth/confirmation-status', {
          title: 'Email Already In Use | HelloUniversity',
          description: 'This HelloUniversity email address is already in use.',
          canonicalUrl: 'https://hellouniversity.online/confirm-email-change',
          stylesheets: ['/css/auth.css'],
          heading: 'Email already in use',
          message:
            'This email address is already linked to another account. Your email was not changed.',
          primaryLinkHref: '/crfv/account-settings',
          primaryLinkText: 'Back to Account Settings',
          secondaryLinkHref: '/login',
          secondaryLinkText: 'Back to Login',
          showEmailForm: false,
        });
      }

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            emaildb: nextEmail,
            emailConfirmed: true,
            updatedAt: new Date(),
          },
          $unset: {
            pendingEmailChange: '',
            emailConfirmationToken: '',
            emailConfirmationExpires: '',
          },
        },
      );

      return res.render('pages/auth/confirmation-status', {
        title: 'Email Change Confirmed | HelloUniversity',
        description: 'Your HelloUniversity account email has been updated.',
        canonicalUrl: 'https://hellouniversity.online/confirm-email-change',
        stylesheets: ['/css/auth.css'],
        heading: 'Email updated',
        message: 'Your account email has been verified and updated.',
        primaryLinkHref: '/crfv/account-settings',
        primaryLinkText: 'Back to Account Settings',
        secondaryLinkHref: '/crfv',
        secondaryLinkText: 'Go to CRFV',
        showEmailForm: false,
      });
    } catch (error) {
      console.error('Error confirming account email change:', error);
      return res.status(500).render('pages/auth/confirmation-status', {
        title: 'Email Change Error | HelloUniversity',
        description: 'HelloUniversity could not confirm this email change.',
        canonicalUrl: 'https://hellouniversity.online/confirm-email-change',
        stylesheets: ['/css/auth.css'],
        heading: 'Unable to update email',
        message:
          'We could not confirm this email change. Please try again later.',
        primaryLinkHref: '/crfv/account-settings',
        primaryLinkText: 'Back to Account Settings',
        secondaryLinkHref: '/login',
        secondaryLinkText: 'Back to Login',
        showEmailForm: false,
      });
    }
  });

  router.post('/account/change-password', isAuthenticated, async (req, res) => {
    const usersCollection = usersOr503(res);
    if (!usersCollection) return;
    const csrfResult = requireCsrf(req, res, () => true);
    if (csrfResult !== true) return;

    try {
      const user = await findSessionUser(usersCollection, req);
      if (!user || typeof user.password !== 'string') {
        return res
          .status(404)
          .json({ success: false, message: 'User not found.' });
      }

      const currentPassword = String(req.body?.currentPassword || '');
      const newPassword = String(req.body?.newPassword || '');

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current and new password are required.',
        });
      }
      if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet complexity requirements.',
        });
      }

      const currentPasswordMatch = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!currentPasswordMatch) {
        return res
          .status(400)
          .json({ success: false, message: 'Current password is incorrect.' });
      }

      const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
      if (sameAsCurrent) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password.',
        });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedNewPassword,
            lastPasswordChangeAt: new Date(),
            updatedAt: new Date(),
            mustChangePassword: false,
          },
        },
      );

      if (req.session) {
        req.session.mustChangePassword = false;
        await new Promise((resolve, reject) => {
          req.session.save((err) => (err ? reject(err) : resolve()));
        });
      }

      return res.json({ success: true, message: 'Password updated.' });
    } catch (error) {
      console.error('Error changing account password:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Failed to change password.' });
    }
  });

  return router;
}

module.exports = createAccountApiRoutes;
