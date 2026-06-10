function setUserFromSession(req) {
  if (!req.user && req.session && req.session.userId) {
    req.user = {
      userId: req.session.userId,
      studentIDNumber: req.session.studentIDNumber,
      role: req.session.role,
      firstName: req.session.firstName,
      lastName: req.session.lastName,
    };
  }
}

function isApiRequest(req) {
  return String(req.originalUrl || '').startsWith('/api');
}

function isCrfvRequest(req) {
  const originalUrl = String(req.originalUrl || req.url || '');
  return originalUrl === '/crfv' || originalUrl.startsWith('/crfv/');
}

function getLoggedOutRedirectPath(req) {
  return isCrfvRequest(req) ? '/crfv' : '/login';
}

const ACCOUNT_SETTINGS_PATH = '/crfv/account-settings';

// If a user must change their password, block navigation to other CRFV pages
// until they reset it from the account-settings page. Returns true if the
// request was handled (redirected) so callers should not call next().
function enforcePasswordReset(req, res) {
  if (!req.session?.mustChangePassword) return false;
  if (isApiRequest(req)) return false;
  if (!isCrfvRequest(req)) return false;

  const originalUrl = String(req.originalUrl || req.url || '');
  if (originalUrl === ACCOUNT_SETTINGS_PATH || originalUrl.startsWith(`${ACCOUNT_SETTINGS_PATH}?`)) {
    return false;
  }

  res.redirect(ACCOUNT_SETTINGS_PATH);
  return true;
}

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    if (enforcePasswordReset(req, res)) return;
    setUserFromSession(req);
    return next();
  }

  if (isApiRequest(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  return res.redirect(getLoggedOutRedirectPath(req));
}

function isAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    if (enforcePasswordReset(req, res)) return;
    setUserFromSession(req);
    return next();
  }

  if (isApiRequest(req)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return res.status(403).render('pages/errors/403');
}

function isTeacherOrAdmin(req, res, next) {
  if (!req.session || !req.session.role) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (req.session.role === 'teacher' || req.session.role === 'admin') {
    setUserFromSession(req);
    return next();
  }

  return res.status(403).json({ success: false, message: 'Forbidden' });
}

function isTeacherOrAdminOrPending(req, res, next) {
  if (!req.session || !req.session.role) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const role = req.session.role;
  if (role === 'teacher' || role === 'admin' || role === 'teacher_pending') {
    setUserFromSession(req);
    return next();
  }

  if (isApiRequest(req)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return res.status(403).render('pages/errors/403');
}

function isAdminOrManager(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (isApiRequest(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.redirect(getLoggedOutRedirectPath(req));
  }

  if (
    req.session.role === 'admin' ||
    req.session.role === 'manager' ||
    req.session.role === 'staff'
  ) {
    if (enforcePasswordReset(req, res)) return;
    setUserFromSession(req);
    return next();
  }

  if (isApiRequest(req)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return res.status(403).render('pages/errors/403');
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isTeacherOrAdmin,
  isTeacherOrAdminOrPending,
  isAdminOrManager,
};
