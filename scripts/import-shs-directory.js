const fs = require('fs/promises');
const path = require('path');

const fetchImpl = global.fetch || require('node-fetch');

const SOURCE_URL = 'https://raw.githubusercontent.com/nedpals/k12-shs-api/master/db.json';
const DATA_PATH = path.join(__dirname, '..', 'app', 'data', 'institutions.ph.json');
const SHS_TYPE = 'senior_high_school';

const TYPE_ORDER = {
  university: 0,
  college: 1,
  senior_high_school: 2
};

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKeyPart(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bcity of\b/g, ' ')
    .replace(/\bcity\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeKey(name, region) {
  return `${normalizeKeyPart(name)}::${normalizeKeyPart(region)}`;
}

function fingerprintKey(name, region, city) {
  return `${normalizeKeyPart(name)}::${normalizeKeyPart(region)}::${normalizeKeyPart(city)}`;
}

function toSlug(value) {
  return normalizeKeyPart(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

function isPlaceholderImportedId(value) {
  return /^ph-shs-(?:\(blank\)|)$/i.test(String(value || '').trim());
}

function shsIdScore(value) {
  const id = String(value || '').trim();

  if (!id) {
    return 0;
  }

  if (!id.startsWith('ph-shs-')) {
    return 5;
  }

  if (/^ph-shs-\d+$/.test(id)) {
    return 4;
  }

  if (/^ph-shs-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    return 3;
  }

  if (isPlaceholderImportedId(id)) {
    return 1;
  }

  return 2;
}

function dedupeAliases(values) {
  const seen = new Set();
  const aliases = [];

  for (const value of Array.isArray(values) ? values : []) {
    const alias = cleanText(value);
    if (!alias) {
      continue;
    }

    const key = alias.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    aliases.push(alias);
  }

  return aliases;
}

function cleanInstitution(record) {
  const cleaned = {
    id: cleanText(record.id),
    name: cleanText(record.name),
    type: cleanText(record.type),
    country: cleanText(record.country || 'Philippines'),
    region: cleanText(record.region),
    city: cleanText(record.city)
  };

  const province = cleanText(record.province);
  if (province) {
    cleaned.province = province;
  }

  const aliases = dedupeAliases(record.aliases);
  if (aliases.length) {
    cleaned.aliases = aliases;
  }

  return cleaned;
}

function createImportedSchoolRecord(school) {
  const schoolId = cleanText(school.school_id);
  const fallbackId = [
    toSlug(school.school_name),
    toSlug(school.municipality || school.region)
  ]
    .filter(Boolean)
    .join('-')
    .slice(0, 96);

  return cleanInstitution({
    id: /^\d+$/.test(schoolId) ? `ph-shs-${schoolId}` : `ph-shs-${fallbackId || 'unknown'}`,
    name: cleanText(school.school_name),
    type: SHS_TYPE,
    country: 'Philippines',
    region: cleanText(school.region),
    province: cleanText(school.province),
    city: cleanText(school.municipality),
    aliases: []
  });
}

function mergeImportedSchool(target, incoming) {
  if (isPlaceholderImportedId(target.id) && incoming.id && !isPlaceholderImportedId(incoming.id)) {
    target.id = incoming.id;
  }

  target.region = target.region || incoming.region;
  target.province = target.province || incoming.province;
  target.city = target.city || incoming.city;
  target.country = target.country || incoming.country;

  const aliases = dedupeAliases([...(target.aliases || []), ...(incoming.aliases || [])]);
  if (aliases.length) {
    target.aliases = aliases;
  } else {
    delete target.aliases;
  }

  return target;
}

function mergeDuplicateShsRecords(left, right) {
  const winner = shsIdScore(right.id) > shsIdScore(left.id)
    ? cleanInstitution(right)
    : cleanInstitution(left);
  const loser = winner.id === left.id ? right : left;

  if (isPlaceholderImportedId(winner.id) && loser.id && shsIdScore(loser.id) > shsIdScore(winner.id)) {
    winner.id = loser.id;
  }

  winner.country = winner.country || loser.country;
  winner.region = winner.region || loser.region;
  winner.province = winner.province || loser.province;
  winner.city = winner.city || loser.city;

  const aliases = dedupeAliases([...(winner.aliases || []), ...(loser.aliases || [])]);
  if (aliases.length) {
    winner.aliases = aliases;
  } else {
    delete winner.aliases;
  }

  return cleanInstitution(winner);
}

function sortInstitutions(a, b) {
  const typeOrder = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
  if (typeOrder !== 0) {
    return typeOrder;
  }

  const nameOrder = a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  if (nameOrder !== 0) {
    return nameOrder;
  }

  const regionOrder = (a.region || '').localeCompare(b.region || '', 'en', { sensitivity: 'base' });
  if (regionOrder !== 0) {
    return regionOrder;
  }

  return (a.city || '').localeCompare(b.city || '', 'en', { sensitivity: 'base' });
}

function dedupeFinalRecords(records) {
  const passthrough = [];
  const shsByFingerprint = new Map();

  for (const record of records) {
    if (record.type !== SHS_TYPE) {
      passthrough.push(record);
      continue;
    }

    const key = fingerprintKey(record.name, record.region, record.city);
    const existing = shsByFingerprint.get(key);
    if (!existing) {
      shsByFingerprint.set(key, cleanInstitution(record));
      continue;
    }

    shsByFingerprint.set(key, mergeDuplicateShsRecords(existing, record));
  }

  return [...passthrough, ...shsByFingerprint.values()];
}

async function main() {
  const existingJson = await fs.readFile(DATA_PATH, 'utf8');
  const existingRecords = JSON.parse(existingJson).map(cleanInstitution);

  const existingShsByNameRegion = new Map();
  const existingShsByName = new Map();
  const existingShsByFingerprint = new Map();
  const existingById = new Map(existingRecords.map((record) => [record.id, record]));

  for (const record of existingRecords) {
    if (record.type !== SHS_TYPE) {
      continue;
    }

    const byNameRegionKey = mergeKey(record.name, record.region);
    const nameRegionList = existingShsByNameRegion.get(byNameRegionKey) || [];
    nameRegionList.push(record);
    existingShsByNameRegion.set(byNameRegionKey, nameRegionList);

    const byNameKey = normalizeKeyPart(record.name);
    const nameList = existingShsByName.get(byNameKey) || [];
    nameList.push(record);
    existingShsByName.set(byNameKey, nameList);

    const fingerprintList = existingShsByFingerprint.get(fingerprintKey(record.name, record.region, record.city)) || [];
    fingerprintList.push(record);
    existingShsByFingerprint.set(fingerprintKey(record.name, record.region, record.city), fingerprintList);
  }

  const response = await fetchImpl(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download SHS directory: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const schools = Array.isArray(payload.schools) ? payload.schools : [];

  let added = 0;
  let merged = 0;
  let skipped = 0;

  for (const school of schools) {
    const imported = createImportedSchoolRecord(school);
    if (!imported.id || !imported.name || !imported.region) {
      skipped += 1;
      continue;
    }

    const existingByExactId = existingById.get(imported.id);
    if (existingByExactId) {
      mergeImportedSchool(existingByExactId, imported);
      merged += 1;
      continue;
    }

    const fingerprintMatches = existingShsByFingerprint.get(fingerprintKey(imported.name, imported.region, imported.city)) || [];
    const nameRegionMatches = existingShsByNameRegion.get(mergeKey(imported.name, imported.region)) || [];
    const nameMatches = existingShsByName.get(normalizeKeyPart(imported.name)) || [];
    const mergeTarget = fingerprintMatches.length === 1
      ? fingerprintMatches[0]
      : (nameRegionMatches.length === 1
        ? nameRegionMatches[0]
        : (nameMatches.length === 1 ? nameMatches[0] : null));

    if (mergeTarget) {
      const previousId = mergeTarget.id;
      mergeImportedSchool(mergeTarget, imported);
      if (previousId !== mergeTarget.id) {
        existingById.delete(previousId);
        existingById.set(mergeTarget.id, mergeTarget);
      }
      merged += 1;
      continue;
    }

    existingRecords.push(imported);
    existingById.set(imported.id, imported);
    added += 1;
  }

  const finalRecords = dedupeFinalRecords(existingRecords.map(cleanInstitution))
    .sort(sortInstitutions);

  await fs.writeFile(DATA_PATH, `${JSON.stringify(finalRecords, null, 2)}\n`, 'utf8');

  const totals = finalRecords.reduce((summary, item) => {
    summary[item.type] = (summary[item.type] || 0) + 1;
    return summary;
  }, {});

  console.log(`Imported SHS directory from ${SOURCE_URL}`);
  console.log(`Added: ${added}`);
  console.log(`Merged into existing SHS entries: ${merged}`);
  console.log(`Skipped invalid rows: ${skipped}`);
  console.log(`Final totals: ${JSON.stringify(totals)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
