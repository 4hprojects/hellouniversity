const express = require('express');
const {
  ALLOWED_TYPES,
  normalizeInstitutionType,
  searchInstitutions,
  serializeInstitution
} = require('../utils/institutionsDirectory');

function createInstitutionsApiRoutes() {
  const router = express.Router();

  router.get('/search', (req, res) => {
    const type = normalizeInstitutionType(req.query.type);
    const query = String(req.query.q || '').trim();

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'A valid institution type is required.',
        types: ALLOWED_TYPES
      });
    }

    if (query.length < 2) {
      return res.json({ success: true, items: [] });
    }

    const items = searchInstitutions({ query, type }).map(serializeInstitution);
    return res.json({ success: true, items });
  });

  return router;
}

module.exports = createInstitutionsApiRoutes;
