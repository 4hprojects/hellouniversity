const fetch = require('node-fetch');

const DEFAULT_MINIMUM_SCORE = 0.5;

function getRecaptchaMinimumScore() {
  const configured = Number(process.env.RECAPTCHA_MIN_SCORE);
  if (Number.isFinite(configured) && configured >= 0 && configured <= 1) {
    return configured;
  }
  return DEFAULT_MINIMUM_SCORE;
}

async function verifyRecaptchaToken({
  token,
  remoteIp,
  expectedAction,
  minimumScore = getRecaptchaMinimumScore(),
  secret = process.env.SECRET_KEY,
  fetchImpl = fetch
}) {
  const cleanToken = String(token || '').trim();
  const cleanSecret = String(secret || '').trim();

  if (!cleanToken) {
    return { success: false, reason: 'missing-token' };
  }

  if (!cleanSecret) {
    return { success: false, reason: 'missing-secret' };
  }

  const body = new URLSearchParams({
    secret: cleanSecret,
    response: cleanToken
  });

  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  const response = await fetchImpl('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const payload = await response.json();

  if (!payload.success) {
    return { success: false, reason: 'verification-failed', payload };
  }

  if (expectedAction && payload.action !== expectedAction) {
    return { success: false, reason: 'action-mismatch', payload };
  }

  if (typeof payload.score === 'number' && payload.score < minimumScore) {
    return { success: false, reason: 'low-score', payload };
  }

  return { success: true, payload };
}

module.exports = {
  getRecaptchaMinimumScore,
  verifyRecaptchaToken
};
