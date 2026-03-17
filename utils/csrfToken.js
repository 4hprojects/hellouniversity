const crypto = require('crypto');

const CSRF_SESSION_KEY = 'csrfToken';

function ensureCsrfToken(req) {
  if (!req.session) return null;
  if (!req.session[CSRF_SESSION_KEY]) {
    req.session[CSRF_SESSION_KEY] = crypto.randomBytes(32).toString('hex');
  }
  return req.session[CSRF_SESSION_KEY];
}

function getIncomingCsrfToken(req) {
  return (
    req.get('x-csrf-token') ||
    req.body?.csrfToken ||
    req.query?.csrfToken ||
    ''
  );
}

function tokensMatch(a, b) {
  if (!a || !b) return false;
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyCsrf(req) {
  const expected = req.session?.[CSRF_SESSION_KEY];
  const provided = getIncomingCsrfToken(req);
  return tokensMatch(expected, provided);
}

module.exports = {
  ensureCsrfToken,
  verifyCsrf
};
