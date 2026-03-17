const express = require('express');
const { ObjectId } = require('mongodb');

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
      const {
        query = '',
        page = 1,
        limit = 50,
        sortField = 'lastName',
        sortOrder = 1,
        minimal = false
      } = req.query;

      const searchCriteria = {};
      if (query) {
        searchCriteria.$or = [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { emaildb: { $regex: query, $options: 'i' } },
          { studentIDNumber: { $regex: query, $options: 'i' } },
          { role: { $regex: query, $options: 'i' } }
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
        createdAt: 1
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

  router.put('/:userId/role', isAuthenticated, isAdmin, async (req, res) => {
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
        { projection: { studentIDNumber: 1, firstName: 1, lastName: 1, role: 1, emaildb: 1 } }
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
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No user IDs provided.' });
      }

      const objectIds = userIds.map((id) => new ObjectId(id));
      const updateDoc = {
        $set: {
          password: null,
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
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No user IDs provided.' });
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
