const institutions = require('../app/data/institutions.ph.json');

const ALLOWED_TYPES = ['senior_high_school', 'college', 'university'];

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function buildLocationText(item) {
  return [
    item.city,
    item.region,
    item.province
  ]
    .filter(Boolean)
    .join(' ');
}

function hasTokenMatch(searchText, tokens) {
  return tokens.every((token) => searchText.includes(token));
}

function scoreInstitution(item, normalizedQuery, tokens) {
  let score = 0;

  if (item._searchName === normalizedQuery) {
    score += 1200;
  } else if (item._searchName.startsWith(normalizedQuery)) {
    score += 1000;
  } else if (item._searchName.includes(` ${normalizedQuery}`)) {
    score += 850;
  } else if (item._searchName.includes(normalizedQuery)) {
    score += 700;
  }

  if (item._searchLocation === normalizedQuery) {
    score += 450;
  } else if (item._searchLocation.startsWith(normalizedQuery)) {
    score += 350;
  } else if (item._searchLocation.includes(normalizedQuery)) {
    score += 250;
  }

  for (const token of tokens) {
    if (item._searchName.split(' ').some((part) => part.startsWith(token))) {
      score += 60;
    } else if (item._searchName.includes(token)) {
      score += 40;
    } else if (item._searchLocation.includes(token)) {
      score += 15;
    }
  }

  return score;
}

const institutionsByType = new Map(ALLOWED_TYPES.map((type) => [type, []]));
const institutionsById = new Map();

for (const item of institutions) {
  if (!item || !ALLOWED_TYPES.includes(item.type)) {
    continue;
  }

  const prepared = {
    ...item,
    _searchName: normalizeSearchValue(item.name),
    _searchLocation: normalizeSearchValue(buildLocationText(item)),
    _searchText: normalizeSearchValue(buildSearchText(item))
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

function searchInstitutions({ query, type, limit = 10 }) {
  const normalizedType = normalizeInstitutionType(type);
  const trimmedQuery = normalizeSearchValue(query);
  const tokens = trimmedQuery.split(/\s+/).filter(Boolean);

  if (!normalizedType || trimmedQuery.length < 2) {
    return [];
  }

  return (institutionsByType.get(normalizedType) || [])
    .filter((item) => item._searchText.includes(trimmedQuery) || hasTokenMatch(item._searchText, tokens))
    .map((item) => ({
      item,
      score: scoreInstitution(item, trimmedQuery, tokens)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.item.name.localeCompare(right.item.name);
    })
    .map((entry) => entry.item)
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
