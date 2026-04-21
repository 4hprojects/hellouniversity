const rateLimit = require('express-rate-limit');
const { verifyCsrf } = require('../utils/csrfToken');

function attachUserFromSession(req) {
  if (!req.user && req.session?.userId) {
    req.user = {
      userId: req.session.userId,
      studentIDNumber: req.session.studentIDNumber,
      role: req.session.role,
      firstName: req.session.firstName,
      lastName: req.session.lastName,
    };
  }
}

function jsonFailure(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function requireSession(req, res, next) {
  if (!req.session?.userId) {
    return jsonFailure(res, 401, 'Unauthorized');
  }

  attachUserFromSession(req);
  return next();
}

function requireRole(...allowedRoles) {
  const allowed = new Set(
    allowedRoles
      .map((role) =>
        String(role || '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );

  return function requireRoleMiddleware(req, res, next) {
    if (!req.session?.userId) {
      return jsonFailure(res, 401, 'Unauthorized');
    }

    const role = String(req.session.role || '')
      .trim()
      .toLowerCase();
    if (!allowed.has(role)) {
      return jsonFailure(res, 403, 'Forbidden');
    }

    attachUserFromSession(req);
    return next();
  };
}

function requireCsrf(req, res, next) {
  if (!verifyCsrf(req)) {
    return jsonFailure(res, 403, 'Invalid CSRF token.');
  }

  return next();
}

const RATE_LIMIT_PROFILES = {
  'auth-login': {
    windowMs: 15 * 60 * 1000,
    max: 15,
    skipSuccessfulRequests: true,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  'password-reset-request': {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message:
      'Too many password reset requests. Please try again in 15 minutes.',
  },
  'password-reset-verify': {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many verification attempts. Please try again in 15 minutes.',
  },
  'privileged-write': {
    windowMs: 5 * 60 * 1000,
    max: 120,
    message: 'Too many write requests. Please slow down and try again shortly.',
  },
  'audit-write': {
    windowMs: 5 * 60 * 1000,
    max: 30,
    message: 'Too many audit write requests. Please try again shortly.',
  },
  'attendance-write': {
    windowMs: 60 * 1000,
    max: 600,
    message: 'Too many attendance write requests. Please try again shortly.',
  },
};

const limiterCache = new Map();

function requireRateLimit(profileName) {
  const key = String(profileName || '').trim();
  const profile = RATE_LIMIT_PROFILES[key];

  if (!profile) {
    throw new Error(`Unknown rate-limit profile: ${key}`);
  }

  if (!limiterCache.has(key)) {
    limiterCache.set(
      key,
      rateLimit({
        windowMs: profile.windowMs,
        max: profile.max,
        skipSuccessfulRequests: Boolean(profile.skipSuccessfulRequests),
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          message: profile.message,
        },
      }),
    );
  }

  return limiterCache.get(key);
}

module.exports = {
  requireSession,
  requireRole,
  requireCsrf,
  requireRateLimit,
};
