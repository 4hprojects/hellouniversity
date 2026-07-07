const express = require('express');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { deleteFromR2, getSignedViewUrl } = require('../utils/r2Client');
const { requireCsrf } = require('../middleware/apiSecurity');
const {
  getDefaultCrfvFeaturesForRole,
  getEffectiveCrfvFeatures,
  hasCrfvFeature,
  validateCrfvFeatures,
} = require('../utils/crfvFeatureAccess');

const ALLOWED_ROLES = new Set(['student', 'teacher', 'manager', 'admin', 'staff']);
const CRFV_ACCOUNT_ROLES = new Set(['staff', 'manager']);
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
const ROLE_ID_PREFIXES = { staff: '888', manager: '999' };
const TEMP_PASSWORD_LENGTH = 10;

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getDisplayName(user) {
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
}

function buildAccountResetFields() {
  return {
    accountDisabled: false,
    accountLockedUntil: null,
    resetCode: null,
    resetCodeLockUntil: null,
    resetExpires: null,
    resetCodeVerified: false,
    invalidLoginAttempts: 0,
    invalidResetAttempts: 0,
  };
}

function isAdminSession(req) {
  return req.session?.role === 'admin';
}

function isManagerSession(req) {
  return req.session?.role === 'manager';
}

function requireCrfvAccountManagement(req, res, next) {
  if (hasCrfvFeature(req.session || {}, 'account_management')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden' });
}

function generateTempPassword() {
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const all = lowers + uppers + digits;

  const pick = (charset) => charset[crypto.randomInt(charset.length)];

  const required = [pick(lowers), pick(uppers), pick(digits)];
  const remaining = Array.from({ length: TEMP_PASSWORD_LENGTH - required.length }, () =>
    pick(all),
  );

  const chars = [...required, ...remaining];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

async function generateUserId(countersCollection, usersCollection, role) {
  const prefix = ROLE_ID_PREFIXES[role];
  if (!prefix) {
    throw new Error(`No User ID prefix configured for role "${role}"`);
  }

  const MAX_TRIES = 1000;
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const result = await countersCollection.findOneAndUpdate(
      { _id: `userId_${role}` },
      { $inc: { nextVal: 1 } },
      { returnDocument: 'after', upsert: true },
    );

    const nextVal = Number(result?.value?.nextVal ?? result?.nextVal ?? 1);
    const candidateId = `${prefix}${String(nextVal).padStart(4, '0')}`;

    const existing = await usersCollection.findOne({
      studentIDNumber: candidateId,
    });
    if (!existing) {
      return candidateId;
    }
  }

  throw new Error('Could not generate a unique User ID.');
}

function createAdminUsersRoutes({
  usersCollection,
  logsCollection,
  countersCollection,
  isAuthenticated,
  isAdmin,
  bcrypt,
  sendEmail,
  generateOTP,
}) {
  const router = express.Router();

  router.get('/', isAuthenticated, requireCrfvAccountManagement, async (req, res) => {
    try {
      const ALLOWED_SORT_FIELDS = new Set([
        'lastName',
        'firstName',
        'emaildb',
        'role',
        'createdAt',
        'studentIDNumber',
        'lastLogin',
      ]);
      const MAX_LIMIT = 100;

      const query = typeof req.query.query === 'string' ? req.query.query : '';
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, parseInt(req.query.limit, 10) || 25),
      );
      const sortField = ALLOWED_SORT_FIELDS.has(req.query.sortField)
        ? req.query.sortField
        : 'lastName';
      const sortOrder =
        req.query.sortOrder === '-1' || req.query.sortOrder === -1 ? -1 : 1;
      const minimal = req.query.minimal === 'true';

      const searchCriteria = {};
      if (query) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchCriteria.$or = [
          { firstName: { $regex: escapedQuery, $options: 'i' } },
          { lastName: { $regex: escapedQuery, $options: 'i' } },
          { emaildb: { $regex: escapedQuery, $options: 'i' } },
          { studentIDNumber: { $regex: escapedQuery, $options: 'i' } },
          { role: { $regex: escapedQuery, $options: 'i' } },
        ];
      }

      if (isManagerSession(req)) {
        searchCriteria.role = 'staff';
      } else if (typeof req.query.roles === 'string' && req.query.roles.trim()) {
        const requestedRoles = req.query.roles
          .split(',')
          .map((role) => role.trim().toLowerCase())
          .filter((role) => ALLOWED_ROLES.has(role));
        if (requestedRoles.length) {
          searchCriteria.role = { $in: requestedRoles };
        }
      }

      const projection = minimal
        ? {
            studentIDNumber: 1,
            firstName: 1,
            lastName: 1,
            accountDisabled: 1,
            accountLockedUntil: 1,
            resetCode: 1,
            resetCodeLockUntil: 1,
            resetExpires: 1,
            resetCodeVerified: 1,
          }
        : {
            studentIDNumber: 1,
            lastName: 1,
            firstName: 1,
            emaildb: 1,
            role: 1,
            crfvFeatureAccess: 1,
            lastLogin: 1,
            createdAt: 1,
            verificationDocKey: 1,
            verificationDocUploadedAt: 1,
            accountDisabled: 1,
            accountLockedUntil: 1,
            invalidLoginAttempts: 1,
          };

      const [users, total] = await Promise.all([
        usersCollection
          .find(searchCriteria)
          .sort({ [sortField]: parseInt(sortOrder, 10) })
          .skip((page - 1) * limit)
          .limit(parseInt(limit, 10))
          .project(projection)
          .toArray(),
        usersCollection.countDocuments(searchCriteria),
      ]);
      const usersWithFeatureAccess = users.map((user) => ({
        ...user,
        crfvFeatureAccess: getEffectiveCrfvFeatures(user),
      }));

      res.json({
        success: true,
        users: usersWithFeatureAccess,
        pagination: minimal
          ? undefined
          : {
              total,
              page: parseInt(page, 10),
              pages: Math.ceil(total / limit),
              limit: parseInt(limit, 10),
            },
      });
    } catch (error) {
      console.error('Admin user search error:', error);
      res.status(500).json({ success: false, message: 'Error fetching users' });
    }
  });

  // GET /pending-teachers/count — lightweight count for notification badges.
  // Must appear before GET /pending-teachers and other GET /:userId routes.
  router.post('/', isAuthenticated, isAdmin, async (req, res) => {
    const csrfResult = requireCsrf(req, res, () => true);
    if (csrfResult !== true) return;

    try {
      const firstName = String(req.body?.firstName || '').trim();
      const lastName = String(req.body?.lastName || '').trim();
      const email = normalizeEmail(req.body?.email);
      const role = String(req.body?.role || '')
        .trim()
        .toLowerCase();

      if (!firstName || !lastName || !email || !role) {
        return res.status(400).json({
          success: false,
          message: 'All account fields are required.',
        });
      }

      if (firstName.length > 60 || lastName.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'Name fields exceed maximum length.',
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
        return res
          .status(400)
          .json({ success: false, message: 'Enter a valid email address.' });
      }

      if (!CRFV_ACCOUNT_ROLES.has(role)) {
        return res.status(400).json({
          success: false,
          message: 'CRFV account role must be staff or manager.',
        });
      }

      if (!countersCollection) {
        return res
          .status(503)
          .json({ success: false, message: 'Service unavailable. Please try again.' });
      }

      const existingEmail = await usersCollection.findOne({
        emaildb: { $regex: `^${escapeRegex(email)}$`, $options: 'i' },
      });

      if (existingEmail) {
        return res
          .status(409)
          .json({ success: false, message: 'Email is already in use.' });
      }

      const studentIDNumber = await generateUserId(
        countersCollection,
        usersCollection,
        role,
      );
      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const now = new Date();
      const newUser = {
        firstName,
        lastName,
        emaildb: email,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
        role,
        requestedRole: role,
        approvalStatus: 'approved',
        accountType: role,
        crfvFeatureAccess: getDefaultCrfvFeaturesForRole(role),
        studentIDNumber,
        emailConfirmed: true,
        createdByAdmin: true,
        createdByAdminId: req.session?.userId || null,
        mustChangePassword: true,
        ...buildAccountResetFields(),
      };

      const insertResult = await usersCollection.insertOne(newUser);
      if (!insertResult.acknowledged) {
        return res
          .status(500)
          .json({ success: false, message: 'Failed to create account.' });
      }

      if (logsCollection) {
        await logsCollection.insertOne({
          studentIDNumber: req.session?.studentIDNumber || 'admin',
          name:
            `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() ||
            'Administrator',
          timestamp: now,
          action: 'CRFV_ACCOUNT_CREATED',
          targetStudentIDNumber: studentIDNumber,
          targetName: `${firstName} ${lastName}`.trim(),
          newRole: role,
          details: `Created CRFV ${role} account.`,
        });
      }

      let emailSent = false;
      try {
        const emailResult = await sendEmail({
          to: email,
          subject: 'Your CRFV Account Has Been Created',
          html: `
            <p>Dear ${firstName || 'CRFV user'},</p>
            <p>A CRFV ${role} account has been created for you.</p>
            <p>Your User ID is: <b>${studentIDNumber}</b></p>
            <p>Your temporary password is: <b>${tempPassword}</b></p>
            <p>Please log in and you will be required to set a new password before continuing.</p>
            <p>Best regards,<br/>HelloUniversity Platform Team</p>
          `,
        });
        emailSent = Boolean(emailResult?.success);
        if (!emailSent) {
          console.error('CRFV account creation email was not sent:', emailResult);
        }
      } catch (emailError) {
        console.error('CRFV account creation email failed with exception:', emailError);
      }

      return res.status(201).json({
        success: true,
        message: emailSent
          ? `CRFV account created successfully. User ID: ${studentIDNumber}. Temporary password emailed to ${email}.`
          : `CRFV account created successfully. User ID: ${studentIDNumber}. Could not send email; share this temporary password manually: ${tempPassword}`,
        user: {
          _id: insertResult.insertedId,
          studentIDNumber,
          firstName,
          lastName,
          emaildb: email,
          role,
          crfvFeatureAccess: getDefaultCrfvFeaturesForRole(role),
          createdAt: now,
        },
        ...(emailSent ? {} : { tempPassword }),
      });
    } catch (error) {
      console.error('Error creating CRFV account:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
    }
  });

  router.put(
    '/:userId/password',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      const csrfResult = requireCsrf(req, res, () => true);
      if (csrfResult !== true) return;

      try {
        const { userId } = req.params;
        const newPassword = String(req.body?.newPassword || '');
        const confirmPassword = String(req.body?.confirmPassword || '');

        if (!ObjectId.isValid(userId)) {
          return res
            .status(400)
            .json({ success: false, message: 'Invalid user ID.' });
        }

        const actingAdminId = req.session?.userId;
        if (actingAdminId === userId) {
          return res.status(400).json({
            success: false,
            message: 'You cannot reset your own password from this panel.',
          });
        }

        if (!newPassword || !confirmPassword) {
          return res.status(400).json({
            success: false,
            message: 'New password and confirmation are required.',
          });
        }

        if (newPassword !== confirmPassword) {
          return res
            .status(400)
            .json({ success: false, message: 'Passwords do not match.' });
        }

        if (!PASSWORD_REGEX.test(newPassword)) {
          return res.status(400).json({
            success: false,
            message: 'Password does not meet complexity requirements.',
          });
        }

        const targetUser = await usersCollection.findOne(
          { _id: new ObjectId(userId) },
          {
            projection: {
              studentIDNumber: 1,
              firstName: 1,
              lastName: 1,
              role: 1,
            },
          },
        );

        if (!targetUser) {
          return res
            .status(404)
            .json({ success: false, message: 'Target user not found.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const now = new Date();
        const result = await usersCollection.updateOne(
          { _id: targetUser._id },
          {
            $set: {
              password: hashedPassword,
              lastPasswordChangeAt: now,
              updatedAt: now,
              ...buildAccountResetFields(),
            },
          },
        );

        if (!result.acknowledged || result.matchedCount !== 1) {
          return res
            .status(500)
            .json({ success: false, message: 'Failed to reset password.' });
        }

        if (logsCollection) {
          await logsCollection.insertOne({
            studentIDNumber: req.session?.studentIDNumber || 'admin',
            name:
              `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() ||
              'Administrator',
            timestamp: now,
            action: 'CRFV_ACCOUNT_PASSWORD_RESET',
            targetStudentIDNumber: targetUser.studentIDNumber || null,
            targetName: getDisplayName(targetUser) || null,
            targetRole: targetUser.role || null,
            details: 'Temporary password set by admin.',
          });
        }

        return res.json({
          success: true,
          message: 'Temporary password set successfully.',
        });
      } catch (error) {
        console.error('Error setting temporary password:', error);
        return res
          .status(500)
          .json({ success: false, message: 'Internal server error' });
      }
    },
  );

  router.post(
    '/:userId/send-password-reset',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      const csrfResult = requireCsrf(req, res, () => true);
      if (csrfResult !== true) return;

      if (
        typeof sendEmail !== 'function' ||
        typeof generateOTP !== 'function'
      ) {
        return res.status(503).json({
          success: false,
          message: 'Password reset email service is unavailable.',
        });
      }

      try {
        const { userId } = req.params;
        if (!ObjectId.isValid(userId)) {
          return res
            .status(400)
            .json({ success: false, message: 'Invalid user ID.' });
        }

        const targetUser = await usersCollection.findOne(
          { _id: new ObjectId(userId) },
          {
            projection: {
              emaildb: 1,
              firstName: 1,
              lastName: 1,
              studentIDNumber: 1,
              role: 1,
            },
          },
        );

        if (!targetUser) {
          return res
            .status(404)
            .json({ success: false, message: 'Target user not found.' });
        }

        const email = normalizeEmail(targetUser.emaildb);
        if (!email) {
          return res.status(400).json({
            success: false,
            message: 'Target account does not have an email address.',
          });
        }

        const resetCode = generateOTP();
        const resetCodeHash = await bcrypt.hash(resetCode, 10);
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
        const now = new Date();

        await usersCollection.updateOne(
          { _id: targetUser._id },
          {
            $set: {
              resetCode: resetCodeHash,
              resetExpires,
              invalidResetAttempts: 0,
              resetCodeLockUntil: null,
              resetCodeVerified: false,
              updatedAt: now,
            },
          },
        );

        await sendEmail({
          to: email,
          subject: 'Your CRFV Account Password Reset Code',
          html: `
            <p>Dear ${targetUser.firstName || 'CRFV user'},</p>
            <p>An administrator started a password reset for your CRFV account.</p>
            <p>Your reset code is: <b>${resetCode}</b></p>
            <p>This code expires in 1 hour.</p>
            <p>Best regards,<br/>HelloUniversity Platform Team</p>
          `,
        });

        if (logsCollection) {
          await logsCollection.insertOne({
            studentIDNumber: req.session?.studentIDNumber || 'admin',
            name:
              `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() ||
              'Administrator',
            timestamp: now,
            action: 'CRFV_ACCOUNT_RESET_CODE_SENT',
            targetStudentIDNumber: targetUser.studentIDNumber || null,
            targetName: getDisplayName(targetUser) || null,
            targetRole: targetUser.role || null,
            details: 'Password reset code sent by admin.',
          });
        }

        return res.json({
          success: true,
          message: 'Password reset code sent to the account email.',
        });
      } catch (error) {
        console.error('Error sending admin password reset code:', error);
        return res
          .status(500)
          .json({ success: false, message: 'Internal server error' });
      }
    },
  );

  router.get(
    '/pending-teachers/count',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const count = await usersCollection.countDocuments({
          role: 'teacher_pending',
        });
        return res.json({ success: true, count });
      } catch (err) {
        console.error('Pending teachers count error:', err);
        return res
          .status(500)
          .json({ success: false, message: 'Failed to get count.' });
      }
    },
  );

  // GET /pending-teachers — list all teacher_pending accounts for the verification panel
  // Must appear before /:userId routes to avoid being caught as a userId param
  router.get(
    '/pending-teachers',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const users = await usersCollection
          .find({ role: 'teacher_pending' })
          .sort({ verificationDocUploadedAt: -1, createdAt: -1 })
          .project({
            studentIDNumber: 1,
            firstName: 1,
            lastName: 1,
            emaildb: 1,
            role: 1,
            createdAt: 1,
            verificationDocKey: 1,
            verificationDocUploadedAt: 1,
          })
          .toArray();

        return res.json({ success: true, users });
      } catch (err) {
        console.error('Pending teachers fetch error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to load pending teachers.',
        });
      }
    },
  );

  // GET /:userId/verification-doc — generate a short-lived presigned URL for admin to view the submitted doc
  router.get(
    '/:userId/verification-doc',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const { userId } = req.params;
        if (!ObjectId.isValid(userId)) {
          return res
            .status(400)
            .json({ success: false, message: 'Invalid user ID.' });
        }

        const user = await usersCollection.findOne(
          { _id: new ObjectId(userId) },
          { projection: { verificationDocKey: 1, verificationDocMimeType: 1 } },
        );

        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: 'User not found.' });
        }

        if (!user.verificationDocKey) {
          return res.status(404).json({
            success: false,
            message: 'No verification document on file for this user.',
          });
        }

        const url = await getSignedViewUrl(user.verificationDocKey, 900); // 15 min
        const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();

        return res.json({
          success: true,
          url,
          expiresAt,
          mimeType: user.verificationDocMimeType || null,
        });
      } catch (err) {
        console.error('Admin verification-doc URL error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate document URL.',
        });
      }
    },
  );

  router.put(
    '/:userId/crfv-features',
    isAuthenticated,
    requireCrfvAccountManagement,
    async (req, res) => {
      const csrfResult = requireCsrf(req, res, () => true);
      if (csrfResult !== true) return;

      try {
        const { userId } = req.params;
        if (!ObjectId.isValid(userId)) {
          return res
            .status(400)
            .json({ success: false, message: 'Invalid user ID.' });
        }

        const actingUserId = req.session?.userId;
        if (actingUserId === userId) {
          return res.status(400).json({
            success: false,
            message: 'You cannot edit your own CRFV feature access.',
          });
        }

        const validation = validateCrfvFeatures(req.body?.features);
        if (!validation.valid) {
          return res
            .status(400)
            .json({ success: false, message: validation.message });
        }

        const targetUser = await usersCollection.findOne(
          { _id: new ObjectId(userId) },
          {
            projection: {
              studentIDNumber: 1,
              firstName: 1,
              lastName: 1,
              role: 1,
              emaildb: 1,
              crfvFeatureAccess: 1,
            },
          },
        );

        if (!targetUser) {
          return res
            .status(404)
            .json({ success: false, message: 'Target user not found.' });
        }

        const targetRole = String(targetUser.role || '').toLowerCase();
        if (targetRole === 'admin') {
          return res.status(400).json({
            success: false,
            message: 'Admin feature access is implicit and cannot be edited.',
          });
        }

        if (isManagerSession(req) && targetRole !== 'staff') {
          return res.status(403).json({
            success: false,
            message: 'Managers can update staff feature access only.',
          });
        }

        if (!CRFV_ACCOUNT_ROLES.has(targetRole)) {
          return res.status(400).json({
            success: false,
            message: 'CRFV feature access can be assigned to manager or staff accounts only.',
          });
        }

        const now = new Date();
        const result = await usersCollection.updateOne(
          { _id: targetUser._id },
          {
            $set: {
              crfvFeatureAccess: validation.features,
              updatedAt: now,
            },
          },
        );

        if (!result.acknowledged || result.matchedCount !== 1) {
          return res.status(500).json({
            success: false,
            message: 'Failed to update CRFV feature access.',
          });
        }

        if (logsCollection) {
          await logsCollection.insertOne({
            studentIDNumber: req.session?.studentIDNumber || 'admin',
            name:
              `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() ||
              'Administrator',
            timestamp: now,
            action: 'CRFV_FEATURE_ACCESS_UPDATED',
            targetStudentIDNumber: targetUser.studentIDNumber || null,
            targetName: getDisplayName(targetUser) || null,
            targetRole: targetRole || null,
            previousFeatures: getEffectiveCrfvFeatures(targetUser),
            newFeatures: validation.features,
            details: `Updated CRFV feature access for ${targetRole} account.`,
          });
        }

        return res.json({
          success: true,
          message: 'CRFV feature access updated.',
          user: {
            _id: targetUser._id,
            studentIDNumber: targetUser.studentIDNumber || '',
            firstName: targetUser.firstName || '',
            lastName: targetUser.lastName || '',
            emaildb: targetUser.emaildb || '',
            role: targetRole,
            crfvFeatureAccess: validation.features,
          },
        });
      } catch (error) {
        console.error('Error updating CRFV feature access:', error);
        return res
          .status(500)
          .json({ success: false, message: 'Internal server error' });
      }
    },
  );

  router.put('/:userId/role', isAuthenticated, isAdmin, async (req, res) => {
    const csrfResult = requireCsrf(req, res, () => true);
    if (csrfResult !== true) return;
    try {
      const { userId } = req.params;
      const { role, adminPassword } = req.body;
      const normalizedRole = String(role || '')
        .trim()
        .toLowerCase();
      const trimmedPassword = String(adminPassword || '');

      if (!ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid user ID.' });
      }

      if (!ALLOWED_ROLES.has(normalizedRole)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid target role.' });
      }

      if (!trimmedPassword) {
        return res
          .status(400)
          .json({ success: false, message: 'Admin password is required.' });
      }

      const actingAdminId = req.session?.userId;
      if (!actingAdminId || !ObjectId.isValid(actingAdminId)) {
        return res
          .status(401)
          .json({ success: false, message: 'Unauthorized.' });
      }

      if (actingAdminId === userId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own role from this panel.',
        });
      }

      const actingAdmin = await usersCollection.findOne(
        { _id: new ObjectId(actingAdminId) },
        {
          projection: {
            studentIDNumber: 1,
            firstName: 1,
            lastName: 1,
            password: 1,
            role: 1,
          },
        },
      );

      if (
        !actingAdmin ||
        actingAdmin.role !== 'admin' ||
        typeof actingAdmin.password !== 'string'
      ) {
        return res
          .status(403)
          .json({ success: false, message: 'Admin verification failed.' });
      }

      const passwordMatch = await bcrypt.compare(
        trimmedPassword,
        actingAdmin.password,
      );
      if (!passwordMatch) {
        return res
          .status(401)
          .json({ success: false, message: 'Incorrect admin password.' });
      }

      const targetUser = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        {
          projection: {
            studentIDNumber: 1,
            firstName: 1,
            lastName: 1,
            role: 1,
            emaildb: 1,
            verificationDocKey: 1,
          },
        },
      );

      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, message: 'Target user not found.' });
      }

      if (targetUser.role === normalizedRole) {
        return res
          .status(400)
          .json({ success: false, message: 'User already has that role.' });
      }

      const result = await usersCollection.updateOne(
        { _id: targetUser._id },
        {
          $set: {
            role: normalizedRole,
            crfvFeatureAccess: getDefaultCrfvFeaturesForRole(normalizedRole),
            updatedAt: new Date(),
          },
        },
      );

      if (!result.acknowledged || result.matchedCount !== 1) {
        return res
          .status(500)
          .json({ success: false, message: 'Failed to update user role.' });
      }

      // If the user was teacher_pending, clean up their verification document from R2
      if (
        targetUser.role === 'teacher_pending' &&
        targetUser.verificationDocKey
      ) {
        try {
          await deleteFromR2(targetUser.verificationDocKey);
          await usersCollection.updateOne(
            { _id: targetUser._id },
            {
              $unset: {
                verificationDocKey: '',
                verificationDocMimeType: '',
                verificationDocUploadedAt: '',
                verificationDocUrl: '',
              },
            },
          );
        } catch (r2Err) {
          console.error('R2 doc cleanup on role change error:', r2Err);
          // Non-fatal: role was already updated
        }
      }

      if (logsCollection) {
        await logsCollection.insertOne({
          studentIDNumber:
            actingAdmin.studentIDNumber ||
            req.session.studentIDNumber ||
            'admin',
          name:
            `${actingAdmin.firstName || ''} ${actingAdmin.lastName || ''}`.trim() ||
            'Administrator',
          timestamp: new Date(),
          action: 'USER_ROLE_UPDATED',
          targetStudentIDNumber: targetUser.studentIDNumber || null,
          targetName:
            `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() ||
            null,
          previousRole: targetUser.role || null,
          newRole: normalizedRole,
          details: `Role changed from ${targetUser.role || 'unknown'} to ${normalizedRole}`,
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
          role: normalizedRole,
          crfvFeatureAccess: getDefaultCrfvFeaturesForRole(normalizedRole),
        },
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
    }
  });

  router.put('/reset-fields', isAuthenticated, isAdmin, async (req, res) => {
    const csrfResult = requireCsrf(req, res, () => true);
    if (csrfResult !== true) return;
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: 'No user IDs provided.' });
      }

      if (!userIds.every((id) => ObjectId.isValid(id))) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid user ID in list.' });
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
          invalidResetAttempts: 0,
        },
      };

      const result = await usersCollection.updateMany(
        { _id: { $in: objectIds } },
        updateDoc,
      );

      if (!result.acknowledged) {
        return res
          .status(500)
          .json({ success: false, message: 'Failed to reset fields.' });
      }

      return res.json({ success: true, message: 'Fields reset successfully.' });
    } catch (error) {
      console.error('Error resetting fields for users:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
    }
  });

  router.delete('/', isAuthenticated, isAdmin, async (req, res) => {
    const csrfResult = requireCsrf(req, res, () => true);
    if (csrfResult !== true) return;
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: 'No user IDs provided.' });
      }

      if (!userIds.every((id) => ObjectId.isValid(id))) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid user ID in list.' });
      }

      const objectIds = userIds.map((id) => new ObjectId(id));
      const result = await usersCollection.deleteMany({
        _id: { $in: objectIds },
      });

      if (!result.acknowledged) {
        return res
          .status(500)
          .json({ success: false, message: 'Failed to delete users.' });
      }

      return res.json({
        success: true,
        message: 'User(s) deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting users:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createAdminUsersRoutes;
