function sanitizeReturnTo(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//') || /[\r\n]/.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, 'https://hellouniversity.local');
    if (parsed.origin !== 'https://hellouniversity.local') {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_error) {
    return null;
  }
}

function buildLoginRedirectPath(returnTo) {
  const sanitized = sanitizeReturnTo(returnTo);
  return sanitized
    ? `/login?returnTo=${encodeURIComponent(sanitized)}`
    : '/login';
}

module.exports = {
  sanitizeReturnTo,
  buildLoginRedirectPath
};
