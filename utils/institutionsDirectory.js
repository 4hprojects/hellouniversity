const institutions = require('../app/data/institutions.ph.json');

const ALLOWED_TYPES = ['senior_high_school', 'college', 'university'];

function buildSearchText(item) {
  return [
    item.name,
    item.city,
    item.region,
    item.province,
    ...(Array.isArray(item.aliases) ? item.aliases : [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const institutionsByType = new Map(ALLOWED_TYPES.map((type) => [type, []]));
const institutionsById = new Map();

for (const item of institutions) {
  if (!item || !ALLOWED_TYPES.includes(item.type)) {
    continue;
  }

  const prepared = {
    ...item,
    _searchText: buildSearchText(item)
  };

  institutionsById.set(prepared.id, prepared);
  institutionsByType.get(prepared.type).push(prepared);
}

function normalizeInstitutionType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ALLOWED_TYPES.includes(normalized) ? normalized : null;
}

function findInstitutionById(id) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) {
    return null;
  }

  return institutionsById.get(normalizedId) || null;
}

function searchInstitutions({ query, type, limit = 8 }) {
  const normalizedType = normalizeInstitutionType(type);
  const trimmedQuery = String(query || '').trim().toLowerCase();
  const tokens = trimmedQuery.split(/\s+/).filter(Boolean);

  if (!normalizedType || trimmedQuery.length < 2) {
    return [];
  }

  return (institutionsByType.get(normalizedType) || [])
    .filter((item) => item._searchText.includes(trimmedQuery) || tokens.every((token) => item._searchText.includes(token)))
    .sort((left, right) => {
      const leftExact = left._searchText.includes(trimmedQuery) ? 1 : 0;
      const rightExact = right._searchText.includes(trimmedQuery) ? 1 : 0;
      return rightExact - leftExact;
    })
    .slice(0, limit);
}

function serializeInstitution(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    country: item.country,
    region: item.region,
    city: item.city,
    province: item.province || ''
  };
}

module.exports = {
  ALLOWED_TYPES,
  normalizeInstitutionType,
  findInstitutionById,
  searchInstitutions,
  serializeInstitution
};
