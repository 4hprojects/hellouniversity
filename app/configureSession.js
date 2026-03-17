const session = require('express-session');
const MongoStore = require('connect-mongo');

function parseBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function resolveTrustProxy() {
  const raw = (process.env.TRUST_PROXY || '').trim();
  if (!raw) {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }

  if (raw === 'true' || raw === 'false') {
    return parseBoolean(raw);
  }

  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  return raw;
}

function resolveSameSite(secureCookie) {
  const raw = (process.env.SESSION_COOKIE_SAMESITE || '').trim().toLowerCase();
  const valid = new Set(['lax', 'strict', 'none']);
  const sameSite = valid.has(raw) ? raw : 'lax';

  if (sameSite === 'none' && !secureCookie) {
    return 'lax';
  }

  return sameSite;
}

function matchesProtectedOrAuthPath(pathname) {
  const value = String(pathname || '');
  return [
    /^\/login(?:\/|$)/,
    /^\/signup(?:\/|$)/,
    /^\/reset-password(?:\/|$)/,
    /^\/approval-pending(?:\/|$)/,
    /^\/dashboard(?:\/|$)/,
    /^\/attendance(?:\/|$)/,
    /^\/activities(?:\/|$)/,
    /^\/admin_dashboard(?:\/|$)/,
    /^\/teacher(?:\/|$)/,
    /^\/account(?:\/|$)/,
    /^\/classes(?:\/|$)/,
    /^\/class-quiz(?:\/|$)/,
    /^\/quizzes(?:\/|$)/,
    /^\/session-check(?:\/|$)/,
    /^\/api\/check-auth(?:\/|$)/,
    /^\/user-details(?:\/|$)/,
    /^\/api\/user-details(?:\/|$)/,
    /^\/logout(?:\/|$)/,
    /^\/auth\/logout(?:\/|$)/,
    /^\/api\/logout(?:\/|$)/
  ].some((pattern) => pattern.test(value));
}

function applyNoStoreHeaders(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

function configureSession(app, mongoUri) {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureCookie = process.env.SESSION_COOKIE_SECURE
    ? parseBoolean(process.env.SESSION_COOKIE_SECURE)
    : isProduction;
  const cookieDomain = (process.env.SESSION_COOKIE_DOMAIN || '').trim() || undefined;

  const maxAgeFromEnv = Number(process.env.SESSION_MAX_AGE_MS);
  const maxAge = Number.isFinite(maxAgeFromEnv) && maxAgeFromEnv > 0
    ? maxAgeFromEnv
    : 2 * 60 * 60 * 1000;

  app.set('trust proxy', resolveTrustProxy());

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri }),
    cookie: {
      secure: secureCookie,
      httpOnly: true,
      domain: cookieDomain,
      sameSite: resolveSameSite(secureCookie),
      maxAge
    }
  }));

  app.use((req, _res, next) => {
    if (req.session && req.session.userId) {
      req.user = {
        userId: req.session.userId,
        role: req.session.role
      };
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.session?.userId || matchesProtectedOrAuthPath(req.path)) {
      applyNoStoreHeaders(res);
    }
    next();
  });
}

module.exports = { configureSession };
