const validator = require('validator');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEmail(value) {
  const candidate = validator.trim(String(value || ''));
  if (!validator.isEmail(candidate)) {
    return null;
  }

  return (
    validator.normalizeEmail(candidate, {
      gmail_remove_dots: false,
    }) || candidate.toLowerCase()
  );
}

function buildEmailRegexQuery(email) {
  return {
    emaildb: {
      $regex: `^${escapeRegex(email)}$`,
      $options: 'i',
    },
  };
}

/**
 * Look up a user by login email.
 *
 * Fast path: every write path stores `emaildb` normalized to lowercase, so an
 * exact match on the normalized value uses the `emaildb` index. Records
 * written before normalization existed may still hold mixed case, so on a
 * miss we fall back to the (unindexed) case-insensitive regex. Once
 * `scripts/normalize-emaildb.js --apply` has run against the database, the
 * fallback never fires.
 *
 * @param {import('mongodb').Collection} usersCollection
 * @param {string} rawEmail - untrusted input; normalized/validated here
 * @param {{ projection?: object, filter?: object }} [options] - `filter` is
 *   merged into both queries (e.g. `{ resetCodeVerified: true }`)
 * @returns {Promise<object|null>} the user document, or null if the email is
 *   invalid or no user matches
 */
async function findUserByEmail(usersCollection, rawEmail, options = {}) {
  const { projection, filter } = options;
  const normalized = normalizeEmail(rawEmail);
  if (!normalized) {
    return null;
  }

  const findOptions = projection ? { projection } : {};
  const extra = filter || {};

  const exact = await usersCollection.findOne(
    { ...extra, emaildb: normalized },
    findOptions,
  );
  if (exact) {
    return exact;
  }

  return usersCollection.findOne(
    { ...extra, ...buildEmailRegexQuery(normalized) },
    findOptions,
  );
}

module.exports = {
  escapeRegex,
  normalizeEmail,
  buildEmailRegexQuery,
  findUserByEmail,
};
