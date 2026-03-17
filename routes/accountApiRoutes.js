const express = require('express');
const { ObjectId } = require('mongodb');
const { verifyCsrf } = require('../utils/csrfToken');

function createAccountApiRoutes({
  getUsersCollection,
  isAuthenticated,
  bcrypt,
  validator
}) {
  const router = express.Router();

  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;

  function usersOr503(res) {
    const usersCollection = getUsersCollection();
    if (!usersCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
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
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      lastLoginAt: user.lastLoginTime ? new Date(user.lastLoginTime).toISOString() : null,
      lastPasswordChangeAt: user.lastPasswordChangeAt ? new Date(user.lastPasswordChangeAt).toISOString() : null
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
              createdAt: 1,
              lastLoginTime: 1,
              lastPasswordChangeAt: 1,
              password: 1
            }
          }
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
            createdAt: 1,
            lastLoginTime: 1,
            lastPasswordChangeAt: 1,
            password: 1
          }
        }
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
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      return res.json({ success: true, user: toProfilePayload(user) });
    } catch (error) {
      console.error('Error loading account profile:', error);
      return res.status(500).json({ success: false, message: 'Failed to load profile.' });
    }
  });

  router.put('/account/profile', isAuthenticated, async (req, res) => {
    const usersCollection = usersOr503(res);
    if (!usersCollection) return;
    if (!verifyCsrf(req)) {
      return res.status(403).json({ success: false, message: 'Invalid CSRF token.' });
    }

    try {
      const user = await findSessionUser(usersCollection, req);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const nextFirstName = validator.trim(String(req.body?.firstName || user.firstName || ''));
      const nextLastName = validator.trim(String(req.body?.lastName || user.lastName || ''));
      const rawEmail = validator.trim(String(req.body?.email || ''));
      const nextEmail = rawEmail ? validator.normalizeEmail(rawEmail, { gmail_remove_dots: false }) || rawEmail.toLowerCase() : '';

      if (!nextFirstName || !nextLastName) {
        return res.status(400).json({ success: false, message: 'First and last name are required.' });
      }
      if (nextFirstName.length > 60 || nextLastName.length > 60) {
        return res.status(400).json({ success: false, message: 'Name fields exceed maximum length.' });
      }
      if (nextEmail && !validator.isEmail(nextEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
      }
      if (nextEmail.length > 120) {
        return res.status(400).json({ success: false, message: 'Email exceeds maximum length.' });
      }

      if (nextEmail) {
        const existingByEmail = await usersCollection.findOne({
          emaildb: { $regex: `^${escapeRegex(nextEmail)}$`, $options: 'i' },
          _id: { $ne: user._id }
        });
        if (existingByEmail) {
          return res.status(409).json({ success: false, message: 'Email is already in use.' });
        }
      }

      const updateFields = {
        firstName: nextFirstName,
        lastName: nextLastName,
        emaildb: nextEmail || null,
        updatedAt: new Date()
      };

      await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });

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
            createdAt: 1,
            lastLoginTime: 1,
            lastPasswordChangeAt: 1
          }
        }
      );

      return res.json({ success: true, message: 'Profile updated.', user: toProfilePayload(updatedUser || updateFields) });
    } catch (error) {
      console.error('Error updating account profile:', error);
      return res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
  });

  router.post('/account/change-password', isAuthenticated, async (req, res) => {
    const usersCollection = usersOr503(res);
    if (!usersCollection) return;
    if (!verifyCsrf(req)) {
      return res.status(403).json({ success: false, message: 'Invalid CSRF token.' });
    }

    try {
      const user = await findSessionUser(usersCollection, req);
      if (!user || typeof user.password !== 'string') {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const currentPassword = String(req.body?.currentPassword || '');
      const newPassword = String(req.body?.newPassword || '');

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new password are required.' });
      }
      if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({ success: false, message: 'Password does not meet complexity requirements.' });
      }

      const currentPasswordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!currentPasswordMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }

      const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
      if (sameAsCurrent) {
        return res.status(400).json({ success: false, message: 'New password must be different from current password.' });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedNewPassword,
            lastPasswordChangeAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return res.json({ success: true, message: 'Password updated.' });
    } catch (error) {
      console.error('Error changing account password:', error);
      return res.status(500).json({ success: false, message: 'Failed to change password.' });
    }
  });

  return router;
}

module.exports = createAccountApiRoutes;
