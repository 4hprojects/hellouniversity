const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDashboardPathForRole } = require('../utils/roleDashboard');

function createAuthWebRoutes({
  getUsersCollection,
  getLogsCollection,
  sendEmail,
  bcrypt,
  validator,
  isAuthenticated
}) {
  const router = express.Router();
  const { ensureCsrfToken, verifyCsrf } = require('../utils/csrfToken');

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
  });

  function renderAuthPage(req, res, view, overrides = {}) {
    return res.render(view, {
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      ...overrides
    });
  }

  router.get('/login', (req, res) => {
    if (req.session && req.session.userId) {
      return res.redirect(getDashboardPathForRole(req.session.role));
    }
    return renderAuthPage(req, res, 'pages/auth/login', {
      title: 'Login to HelloUniversity',
      description: 'Sign in to HelloUniversity. HelloUniversity is not a university itself. It is a digital academic platform designed to support school and higher education workflows such as classes, assessments, communication, and learning management.',
      canonicalUrl: 'https://hellouniversity.online/login',
      stylesheets: ['/css/auth.css']
    });
  });

  router.get('/login.html', (req, res) => res.redirect('/login'));

  router.get('/signup.html', (req, res) => res.redirect('/signup'));

  router.get('/reset-password', (req, res) => {
    if (req.session && req.session.userId) {
      return res.redirect(getDashboardPathForRole(req.session.role));
    }

    return renderAuthPage(req, res, 'pages/auth/reset-password', {
      title: 'Reset Password | HelloUniversity',
      description: 'Recover your HelloUniversity account by email, verify your reset code, and set a new password.',
      canonicalUrl: 'https://hellouniversity.online/reset-password',
      stylesheets: ['/css/auth.css']
    });
  });

  router.get('/reset-password.html', (req, res) => res.redirect('/reset-password'));

  router.get('/approval-pending', async (req, res) => {
    if (req.session?.userId && req.session?.role && req.session.role !== 'teacher_pending') {
      return res.redirect(getDashboardPathForRole(req.session.role));
    }

    let verificationDocKey = null;
    let verificationDocUploadedAt = null;

    if (req.session?.userId) {
      try {
        const { ObjectId } = require('mongodb');
        const col = getUsersCollection();
        if (col && ObjectId.isValid(req.session.userId)) {
          const u = await col.findOne(
            { _id: new ObjectId(req.session.userId) },
            { projection: { verificationDocKey: 1, verificationDocUploadedAt: 1 } }
          );
          verificationDocKey = u?.verificationDocKey || null;
          verificationDocUploadedAt = u?.verificationDocUploadedAt || null;
        }
      } catch (e) {
        console.error('approval-pending doc lookup error:', e);
      }
    }

    return renderAuthPage(req, res, 'pages/auth/approval-pending', {
      title: 'Teacher Approval Pending | HelloUniversity',
      description: 'Your teacher access request is pending admin approval.',
      canonicalUrl: 'https://hellouniversity.online/approval-pending',
      stylesheets: ['/css/auth.css'],
      verificationDocKey,
      verificationDocUploadedAt
    });
  });

  const handleLogin = async (req, res) => {
    const { studentIDNumber, password } = req.body;
    const usersCollection = getUsersCollection();
    const logsCollection = getLogsCollection();
    let loginStage = 'init';

    if (!usersCollection) {
      return res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
    }

    try {
      loginStage = 'validate_input';
      if (!studentIDNumber || !password) {
        return res.status(400).json({ success: false, message: 'Student ID, Employee ID, or email, and password are required.' });
      }

      const loginIdentifier = validator.trim(String(studentIDNumber || ''));
      const normalizedEmail = validator.isEmail(loginIdentifier)
        ? (validator.normalizeEmail(loginIdentifier, { gmail_remove_dots: false }) || loginIdentifier.toLowerCase())
        : null;

      if (
        loginIdentifier !== 'crfvadmin' &&
        loginIdentifier !== 'crfvuser' &&
        !normalizedEmail &&
        !/^\d{7,8}$/.test(loginIdentifier)
      ) {
        return res.status(400).json({ success: false, message: 'Enter a 7 or 8 digit Student ID or Employee ID, a valid email address, or a valid admin/user username.' });
      }

      loginStage = 'find_user';
      const user = await usersCollection.findOne(
        normalizedEmail
          ? { emaildb: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
          : { studentIDNumber: loginIdentifier },
        { projection: { firstName: 1, lastName: 1, studentIDNumber: 1, password: 1, role: 1, invalidLoginAttempts: 1, accountLockedUntil: 1, emaildb: 1, emailConfirmed: 1, requestedRole: 1, approvalStatus: 1 } }
      );

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid Student ID, Employee ID, email, or password.' });
      }

      if (typeof user.password !== 'string') {
        console.error('Password in DB is not a string');
        return res.status(500).json({ success: false, message: 'Internal server error.' });
      }

      if (user.emailConfirmed === false) {
        return res.status(403).json({
          success: false,
          message: 'Please confirm your email before logging in.'
        });
      }

      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        const remainingTime = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
        return res.status(403).json({
          success: false,
          message: `Account is locked. Try again in ${remainingTime} minutes.`
        });
      }

      if (!loginIdentifier) {
        return res.status(400).json({ success: false, message: 'Invalid Student ID, Employee ID, email, or password.' });
      }

      loginStage = 'compare_password';
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        let invalidAttempts = (user.invalidLoginAttempts || 0) + 1;
        let updateFields = { invalidLoginAttempts: invalidAttempts };

        if (invalidAttempts >= 3) {
          updateFields.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
          updateFields.invalidLoginAttempts = 0;

          loginStage = 'lock_account';
          await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });

          const emailContent = `
            <p>Dear ${user.firstName},</p>
            <p>You are locked out from logging in for 30 minutes, but you can reset your password immediately if you need.</p>
            <p>Best regards,<br/>HelloUniversity Platform Team</p>
          `;
          loginStage = 'send_lockout_email';
          try {
            const emailResult = await sendEmail({ to: user.emaildb, subject: 'Account Locked', html: emailContent });
            if (!emailResult?.success) {
              console.error('Lockout email was not sent:', emailResult);
            }
          } catch (emailError) {
            console.error('Lockout email failed with exception:', emailError);
          }

          return res.status(403).json({
            success: false,
            message: 'Account is locked due to multiple failed login attempts. Use password reset if needed.'
          });
        }

        loginStage = 'update_failed_attempts';
        await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });
        return res.status(400).json({ success: false, message: 'Invalid Student ID, Employee ID, email, or password.' });
      }

      loginStage = 'reset_lockout_state';
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { invalidLoginAttempts: 0, accountLockedUntil: null } }
      );

      loginStage = 'set_session';
      req.session.userId = user._id.toString();
      req.session.studentIDNumber = user.studentIDNumber;
      req.session.role = user.role;
      req.session.firstName = user.firstName || null;
      req.session.lastName = user.lastName || null;

      loginStage = 'save_session';
      await new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      loginStage = 'update_last_login';
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { lastLoginTime: new Date() } }
      );

      if (logsCollection) {
        loginStage = 'insert_login_log';
        await logsCollection.insertOne({
          studentIDNumber: user.studentIDNumber,
          name: `${user.firstName} ${user.lastName}`,
          timestamp: new Date(),
        });
      }

      return res.json({
        success: true,
        role: user.role,
        redirectPath: getDashboardPathForRole(user.role),
        approvalStatus: user.approvalStatus || null,
        message: 'Login successful!'
      });
    } catch (error) {
      console.error(`Error during login at stage "${loginStage}":`, {
        message: error?.message,
        code: error?.code,
        errno: error?.errno,
        syscall: error?.syscall
      });
      if (error?.code === 'ECONNRESET') {
        return res.status(503).json({
          success: false,
          message: 'Temporary connection issue while logging in. Please try again.'
        });
      }
      return res.status(500).json({ success: false, message: 'Error during login.' });
    }
  };

  router.post('/login', loginLimiter, handleLogin);
  router.post('/auth/login', loginLimiter, handleLogin);

  router.post(['/logout', '/auth/logout', '/api/logout'], (req, res) => {
    if (req.path === '/api/logout' && !verifyCsrf(req)) {
      return res.status(403).json({ success: false, message: 'Invalid CSRF token.' });
    }
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'No user is logged in.' });
    }

    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ success: false, message: 'Logout failed.' });
      }

      res.clearCookie('connect.sid');
      return res.status(200).json({ success: true, message: 'Logout successful' });
    });
  });

  const sendCurrentUserDetails = async (req, res) => {
    const usersCollection = getUsersCollection();
    if (!usersCollection) {
      return res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
    }
    try {
      const studentIDNumber = req.session.studentIDNumber;
      if (!studentIDNumber) {
        return res.status(401).json({ success: false, message: 'Unauthorized access.' });
      }

      const user = await usersCollection.findOne(
        { studentIDNumber },
        { projection: { firstName: 1, lastName: 1, studentIDNumber: 1, role: 1, emaildb: 1 } }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'Invalid Student ID, email, or password.' });
      }

      return res.json({
        success: true,
        user: {
          userId: req.session.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          studentIDNumber: user.studentIDNumber,
          role: user.role,
          emaildb: user.emaildb || null
        }
      });
    } catch (error) {
      console.error('Error fetching user details(server/user-details):', error);
      return res.status(500).json({ success: false, message: 'Error fetching user details.' });
    }
  };

  router.get('/user-details', isAuthenticated, sendCurrentUserDetails);
  router.get('/api/user-details', isAuthenticated, sendCurrentUserDetails);

  router.get('/signup', (req, res) => {
    if (req.session && req.session.userId) {
      return res.redirect(getDashboardPathForRole(req.session.role));
    }

    return renderAuthPage(req, res, 'pages/auth/signup', {
      title: 'Create an Account | HelloUniversity',
      description: 'Create a HelloUniversity account. HelloUniversity is not a university itself. It is a digital academic platform designed to support school and higher education workflows such as classes, assessments, communication, and learning management.',
      canonicalUrl: 'https://hellouniversity.online/signup',
      stylesheets: ['/css/auth.css'],
      extraHead: '<script src="https://www.google.com/recaptcha/api.js" async defer></script>'
    });
  });

  router.get('/session-check', (req, res) => {
    if (req.session && req.session.userId) {
      return res.json({
        authenticated: true,
        role: req.session.role,
        redirectPath: getDashboardPathForRole(req.session.role)
      });
    }
    return res.status(401).json({ authenticated: false });
  });

  router.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.userId) {
      return res.status(200).json({
        success: true,
        authenticated: true,
        redirectPath: getDashboardPathForRole(req.session.role),
        user: {
          userId: req.session.userId,
          studentIDNumber: req.session.studentIDNumber,
          role: req.session.role,
          firstName: req.session.firstName || null,
          lastName: req.session.lastName || null
        }
      });
    }
    return res.status(200).json({ success: true, authenticated: false, user: null, redirectPath: null });
  });

  router.get('/api/csrf-token', isAuthenticated, (req, res) => {
    const token = ensureCsrfToken(req);
    if (!token) {
      return res.status(500).json({ success: false, message: 'Unable to issue CSRF token.' });
    }
    return res.json({ success: true, csrfToken: token });
  });

  return router;
}

module.exports = createAuthWebRoutes;
