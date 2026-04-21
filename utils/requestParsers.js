function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLimit(
  value,
  { fallback = 25, max = 1000, allowAll = false, allValue = 1000000 } = {},
) {
  if (allowAll && value === 'all') {
    return allValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function sanitizeSupabaseSearch(value) {
  return normalizeText(value).replace(/[%_,]/g, ' ').replace(/\s+/g, ' ');
}

module.exports = {
  normalizeText,
  parsePositiveInteger,
  parseLimit,
  sanitizeSupabaseSearch,
};
