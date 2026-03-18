function setUserFromSession(req) {
  if (!req.user && req.session && req.session.userId) {
    req.user = {
      userId: req.session.userId,
      studentIDNumber: req.session.studentIDNumber,
      role: req.session.role,
      firstName: req.session.firstName,
      lastName: req.session.lastName
    };
  }
}

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    setUserFromSession(req);
    return next();
  }

  if (req.originalUrl.startsWith('/api')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  return res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    setUserFromSession(req);
    return next();
  }

  if (req.originalUrl.startsWith('/api')) {
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

  if (req.originalUrl.startsWith('/api')) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return res.status(403).render('pages/errors/403');
}

function isAdminOrManager(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.redirect('/login');
  }

  if (req.session.role === 'admin' || req.session.role === 'manager') {
    setUserFromSession(req);
    return next();
  }

  if (req.originalUrl.startsWith('/api')) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return res.status(403).render('pages/errors/403');
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isTeacherOrAdmin,
  isTeacherOrAdminOrPending,
  isAdminOrManager
};
