const express = require('express');
const { ObjectId } = require('mongodb');
const { verifyCsrf } = require('../utils/csrfToken');
const { deleteFromR2, getSignedViewUrl } = require('../utils/r2Client');

const ALLOWED_ROLES = new Set(['student', 'teacher', 'manager', 'admin']);

function createAdminUsersRoutes({
  usersCollection,
  logsCollection,
  isAuthenticated,
  isAdmin,
  bcrypt
}) {
  const router = express.Router();

  router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const ALLOWED_SORT_FIELDS = new Set(['lastName', 'firstName', 'emaildb', 'role', 'createdAt', 'studentIDNumber', 'lastLogin']);
      const MAX_LIMIT = 100;

      const query = typeof req.query.query === 'string' ? req.query.query : '';
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 25));
      const sortField = ALLOWED_SORT_FIELDS.has(req.query.sortField) ? req.query.sortField : 'lastName';
      const sortOrder = req.query.sortOrder === '-1' || req.query.sortOrder === -1 ? -1 : 1;
      const minimal = req.query.minimal === 'true';

      const searchCriteria = {};
      if (query) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchCriteria.$or = [
          { firstName: { $regex: escapedQuery, $options: 'i' } },
          { lastName: { $regex: escapedQuery, $options: 'i' } },
          { emaildb: { $regex: escapedQuery, $options: 'i' } },
          { studentIDNumber: { $regex: escapedQuery, $options: 'i' } },
          { role: { $regex: escapedQuery, $options: 'i' } }
        ];
      }

      const projection = minimal ? {
        studentIDNumber: 1,
        firstName: 1,
        lastName: 1,
        accountDisabled: 1,
        accountLockedUntil: 1,
        resetCode: 1,
        resetCodeLockUntil: 1,
        resetExpires: 1,
        resetCodeVerified: 1
      } : {
        studentIDNumber: 1,
        lastName: 1,
        firstName: 1,
        emaildb: 1,
        role: 1,
        lastLogin: 1,
        createdAt: 1,
        verificationDocKey: 1,
        verificationDocUploadedAt: 1,
        accountDisabled: 1,
        accountLockedUntil: 1,
        invalidLoginAttempts: 1
      };

      const [users, total] = await Promise.all([
        usersCollection.find(searchCriteria)
          .sort({ [sortField]: parseInt(sortOrder, 10) })
          .skip((page - 1) * limit)
          .limit(parseInt(limit, 10))
          .project(projection)
          .toArray(),
        usersCollection.countDocuments(searchCriteria)
      ]);

      res.json({
        success: true,
        users,
        pagination: minimal ? undefined : {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit, 10)
        }
      });
    } catch (error) {
      console.error('Admin user search error:', error);
      res.status(500).json({ success: false, message: 'Error fetching users' });
    }
  });

  // GET /pending-teachers/count — lightweight count for notification badges
  // Must appear before /pending-teachers and /:userId to avoid route shadowing
  router.get('/pending-teachers/count', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const count = await usersCollection.countDocuments({ role: 'teacher_pending' });
      return res.json({ success: true, count });
    } catch (err) {
      console.error('Pending teachers count error:', err);
      return res.status(500).json({ success: false, message: 'Failed to get count.' });
    }
  });

  // GET /pending-teachers — list all teacher_pending accounts for the verification panel
  // Must appear before /:userId routes to avoid being caught as a userId param
  router.get('/pending-teachers', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await usersCollection.find({ role: 'teacher_pending' })
        .sort({ verificationDocUploadedAt: -1, createdAt: -1 })
        .project({
          studentIDNumber: 1,
          firstName: 1,
          lastName: 1,
          emaildb: 1,
          role: 1,
          createdAt: 1,
          verificationDocKey: 1,
          verificationDocUploadedAt: 1
        })
        .toArray();

      return res.json({ success: true, users });
    } catch (err) {
      console.error('Pending teachers fetch error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load pending teachers.' });
    }
  });

  // GET /:userId/verification-doc — generate a short-lived presigned URL for admin to view the submitted doc
  router.get('/:userId/verification-doc', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID.' });
      }

      const user = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { verificationDocKey: 1, verificationDocMimeType: 1 } }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      if (!user.verificationDocKey) {
        return res.status(404).json({ success: false, message: 'No verification document on file for this user.' });
      }

      const url = await getSignedViewUrl(user.verificationDocKey, 900); // 15 min
      const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();

      return res.json({ success: true, url, expiresAt, mimeType: user.verificationDocMimeType || null });
    } catch (err) {
      console.error('Admin verification-doc URL error:', err);
      return res.status(500).json({ success: false, message: 'Failed to generate document URL.' });
    }
  });

  router.put('/:userId/role', isAuthenticated, isAdmin, async (req, res) => {
    if (!verifyCsrf(req)) {
      return res.status(403).json({ success: false, message: 'Invalid CSRF token.' });
    }
    try {
      const { userId } = req.params;
      const { role, adminPassword } = req.body;
      const normalizedRole = String(role || '').trim().toLowerCase();
      const trimmedPassword = String(adminPassword || '');

      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID.' });
      }

      if (!ALLOWED_ROLES.has(normalizedRole)) {
        return res.status(400).json({ success: false, message: 'Invalid target role.' });
      }

      if (!trimmedPassword) {
        return res.status(400).json({ success: false, message: 'Admin password is required.' });
      }

      const actingAdminId = req.session?.userId;
      if (!actingAdminId || !ObjectId.isValid(actingAdminId)) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      if (actingAdminId === userId) {
        return res.status(400).json({ success: false, message: 'You cannot change your own role from this panel.' });
      }

      const actingAdmin = await usersCollection.findOne(
        { _id: new ObjectId(actingAdminId) },
        { projection: { studentIDNumber: 1, firstName: 1, lastName: 1, password: 1, role: 1 } }
      );

      if (!actingAdmin || actingAdmin.role !== 'admin' || typeof actingAdmin.password !== 'string') {
        return res.status(403).json({ success: false, message: 'Admin verification failed.' });
      }

      const passwordMatch = await bcrypt.compare(trimmedPassword, actingAdmin.password);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect admin password.' });
      }

      const targetUser = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { studentIDNumber: 1, firstName: 1, lastName: 1, role: 1, emaildb: 1, verificationDocKey: 1 } }
      );

      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Target user not found.' });
      }

      if (targetUser.role === normalizedRole) {
        return res.status(400).json({ success: false, message: 'User already has that role.' });
      }

      const result = await usersCollection.updateOne(
        { _id: targetUser._id },
        { $set: { role: normalizedRole } }
      );

      if (!result.acknowledged || result.matchedCount !== 1) {
        return res.status(500).json({ success: false, message: 'Failed to update user role.' });
      }

      // If the user was teacher_pending, clean up their verification document from R2
      if (targetUser.role === 'teacher_pending' && targetUser.verificationDocKey) {
        try {
          await deleteFromR2(targetUser.verificationDocKey);
          await usersCollection.updateOne(
            { _id: targetUser._id },
            { $unset: { verificationDocKey: '', verificationDocMimeType: '', verificationDocUploadedAt: '' } }
          );
        } catch (r2Err) {
          console.error('R2 doc cleanup on role change error:', r2Err);
          // Non-fatal: role was already updated
        }
      }

      if (logsCollection) {
        await logsCollection.insertOne({
          studentIDNumber: actingAdmin.studentIDNumber || req.session.studentIDNumber || 'admin',
          name: `${actingAdmin.firstName || ''} ${actingAdmin.lastName || ''}`.trim() || 'Administrator',
          timestamp: new Date(),
          action: 'USER_ROLE_UPDATED',
          targetStudentIDNumber: targetUser.studentIDNumber || null,
          targetName: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || null,
          previousRole: targetUser.role || null,
          newRole: normalizedRole,
          details: `Role changed from ${targetUser.role || 'unknown'} to ${normalizedRole}`
        });
      }

      return res.json({
        success: true,
        message: 'User role updated successfully.',
        user: {
          _id: targetUser._id,
          studentIDNumber: targetUser.studentIDNumber || '',
          firstName: targetUser.firstName || '',
          lastName: targetUser.lastName || '',
          emaildb: targetUser.emaildb || '',
          role: normalizedRole
        }
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  router.put('/reset-fields', isAuthenticated, isAdmin, async (req, res) => {
    if (!verifyCsrf(req)) {
      return res.status(403).json({ success: false, message: 'Invalid CSRF token.' });
    }
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No user IDs provided.' });
      }

      if (!userIds.every((id) => ObjectId.isValid(id))) {
        return res.status(400).json({ success: false, message: 'Invalid user ID in list.' });
      }

      const objectIds = userIds.map((id) => new ObjectId(id));
      const updateDoc = {
        $set: {
          accountDisabled: false,
          accountLockedUntil: null,
          resetCode: null,
          resetCodeLockUntil: null,
          resetExpires: null,
          resetCodeVerified: false,
          invalidLoginAttempts: 0,
          invalidResetAttempts: 0
        }
      };

      const result = await usersCollection.updateMany(
        { _id: { $in: objectIds } },
        updateDoc
      );

      if (!result.acknowledged) {
        return res.status(500).json({ success: false, message: 'Failed to reset fields.' });
      }

      return res.json({ success: true, message: 'Fields reset successfully.' });
    } catch (error) {
      console.error('Error resetting fields for users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  router.delete('/', isAuthenticated, isAdmin, async (req, res) => {
    if (!verifyCsrf(req)) {
      return res.status(403).json({ success: false, message: 'Invalid CSRF token.' });
    }
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No user IDs provided.' });
      }

      if (!userIds.every((id) => ObjectId.isValid(id))) {
        return res.status(400).json({ success: false, message: 'Invalid user ID in list.' });
      }

      const objectIds = userIds.map((id) => new ObjectId(id));
      const result = await usersCollection.deleteMany({ _id: { $in: objectIds } });

      if (!result.acknowledged) {
        return res.status(500).json({ success: false, message: 'Failed to delete users.' });
      }

      return res.json({ success: true, message: 'User(s) deleted successfully.' });
    } catch (error) {
      console.error('Error deleting users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createAdminUsersRoutes;
