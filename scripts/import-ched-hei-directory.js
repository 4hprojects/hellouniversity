const fs = require('fs/promises');
const path = require('path');

const fetchImpl = global.fetch || require('node-fetch');

const SOURCE_URL = 'https://pdfcoffee.com/complete-list-of-ched-accredited-schools-pdf-free.html';
const DATA_PATH = path.join(__dirname, '..', 'app', 'data', 'institutions.ph.json');

const TYPE_ORDER = {
  university: 0,
  college: 1,
  senior_high_school: 2
};

const REGION_LABELS = new Map([
  ['NCR - National Capital Region', 'NCR'],
  ['CAR - Cordillera Administrative Region', 'CAR'],
  ['ARMM - Autonomous Region in Muslim Mindanao', 'ARMM'],
  ['I - Ilocos Region', 'Region I'],
  ['II - Cagayan Valley', 'Region II'],
  ['III - Central Luzon', 'Region III'],
  ['IVA - CALABARZON', 'Region IV-A'],
  ['IVB - MIMAROPA', 'Region IV-B'],
  ['V - Bicol Region', 'Region V'],
  ['VI - Western Visayas', 'Region VI'],
  ['VII - Central Visayas', 'Region VII'],
  ['VIII - Eastern Visayas', 'Region VIII'],
  ['IX - Zamboanga Peninsula', 'Region IX'],
  ['X - Northern Mindanao', 'Region X'],
  ['XI - Davao Region', 'Region XI'],
  ['XII - SOCCSKSARGEN', 'Region XII'],
  ['XIII - Caraga', 'Region XIII']
]);

const REGION_PREFIXES = [...REGION_LABELS.keys()];

const ROLE_MARKERS = [
  'College Administrator :',
  'Campus Administrator :',
  'Administrator (Designate) :',
  'Administrator II :',
  'Administrator/DQMR :',
  'Director, Extramural Studies Center :',
  'Vocational School Superintendent II :',
  'Executive Officer :',
  'Chairman and CEO :',
  'Head Administrator :',
  'Head AdminiStrator :',
  'Head, TEC :',
  'Chairman/President :',
  'College Dean :',
  'Officer-In-Charge :',
  'Officer in Charge :',
  'Officer In-Charge :',
  'President / CEO :',
  'President/CEO :',
  'School Director :',
  'School Head :',
  'BOD-President :',
  'Campus Dean :',
  'Administrator :',
  'Chancellor :',
  'President :',
  'Director :',
  'Chairman :',
  'Dean :',
  'OIC :',
  'Region :'
];

function cleanText(value) {
  return String(value || '')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ãœ/g, 'Ü')
    .replace(/â€™/g, '\'')
    .replace(/â€œ/g, '"')
    .replace(/â€\u009d|â€/g, '"')
    .replace(/â€“|â€”/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlToLines(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map(cleanText)
    .filter(Boolean);
}

function normalizeKeyPart(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSlug(value) {
  return normalizeKeyPart(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
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

function findRegionPrefix(line) {
  return REGION_PREFIXES.find((label) => line.startsWith(label)) || null;
}

function isSkippableLine(line) {
  return !line
    || /^Directory of Higher Education Institutions/i.test(line)
    || /^\d{1,3}$/.test(line)
    || /^\d{5}[a-z]?$/i.test(line)
    || /^[:;\-.,/\\\s]+$/.test(line)
    || /^(Region|Address|Telephone|Fax|E-mail|Year Established|Website)\s*:?.*$/i.test(line)
    || /^(Region|Address|Telephone|Fax|E-mail|Year Established|Website)(\s+(Region|Address|Telephone|Fax|E-mail|Year Established|Website))*$/i.test(line)
    || /^NA$/i.test(line)
    || /^n\/a$/i.test(line)
    || /^none$/i.test(line)
    || /^www\./i.test(line)
    || /^https?:\/\//i.test(line)
    || /\[email protected\]/i.test(line)
    || /@/.test(line)
    || /^\(?\d{2,4}\)?[-\d\s;/,]+$/.test(line)
    || /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(line)
    || /^\d{4}(?:-\d{4})?$/.test(line);
}

function cleanInstitutionName(headerLine) {
  let value = cleanText(headerLine);

  if (!value) {
    return '';
  }

  for (const marker of ROLE_MARKERS) {
    const index = value.indexOf(marker);
    if (index !== -1) {
      value = value.slice(0, index).trim();
      break;
    }
  }

  value = value
    .replace(/^\d{5}[a-z]?\s+/i, '')
    .replace(/\bformerly\b[\s\S]*$/i, '')
    .replace(/\bAutonomous\b[\s\S]*$/i, '')
    .replace(/\bDeregulated\b[\s\S]*$/i, '')
    .replace(/\s+(?:president(?: and chief academic officer)?|chairman(?: of the board)?(?:\/\s*president)?(?: and ceo)?|head(?:,?\s*tec)?|administrator(?:-designate|\s*\(designate\)|\s*ii)?|executive director iii|executive officer|chancellor|director(?:, extramural studies center)?|college administrator|campus administrator|campus dean|school director|school head|dean|oic|officer(?:-| )in(?:-| )charge|vocational school superintendent ii|administrator\/dqmr)\s*:\s*[\s\S]*$/i, '')
    .replace(/\s+0:0\s*$/i, '')
    .replace(/\bPrivate Non-Sectarian\b/gi, '')
    .replace(/\bPrivate Sectarian\b/gi, '')
    .replace(/\bPrivate\b/gi, '')
    .replace(/\bLocal College\b/gi, '')
    .replace(/\bLocal University\b/gi, '')
    .replace(/\bCollege College\b/gi, 'College')
    .replace(/\bUniversity University\b/gi, 'University')
    .replace(/\bCampus Campus\b/gi, 'Campus')
    .replace(/\bSatellite Campus College\b/gi, 'Satellite Campus')
    .replace(/\bExtension Campus Campus\b/gi, 'Extension Campus')
    .replace(/\s{2,}/g, ' ')
    .replace(/[;:,.\-–\s]+$/g, '')
    .trim();

  if (/^[ivx]+\s*:/i.test(value)) {
    return '';
  }

  return /[a-z]/i.test(value) ? value : '';
}

function inferType(name) {
  return /university/i.test(name) ? 'university' : 'college';
}

function extractAddressFragment(rawLine, regionPrefix) {
  let value = cleanText(rawLine).slice(regionPrefix.length).trim();

  value = value
    .replace(/https?:\/\/\S+.*$/i, '')
    .replace(/www\.\S+.*$/i, '')
    .replace(/\[email protected\].*$/i, '')
    .replace(/\([^)]*\).*/g, (match, offset) => (offset === 0 ? '' : match))
    .trim();

  value = value
    .replace(/\(\d{2,4}[\s\S]*$/i, '')
    .replace(/\b\d{2,4}-\d{3,4}[\s\S]*$/i, '')
    .replace(/\b09\d{7,}[\s\S]*$/i, '')
    .replace(/\bNA\b[\s\S]*$/i, '')
    .replace(/\bNone\b[\s\S]*$/i, '')
    .replace(/\bType YEAR ESTABLISHED\b[\s\S]*$/i, '')
    .replace(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b[\s\S]*$/i, '')
    .replace(/\b(?:19|20)\d{2}\b[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/,\s*$/, '')
    .trim();

  return value;
}

function cleanLocationToken(value) {
  return cleanText(value)
    .replace(/\b\d{4}\b/g, '')
    .replace(/[;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDistrictToken(value) {
  return /(?:First|Second|Third|Fourth|Fifth|Sixth)\s+District/i.test(value);
}

function inferLocation(rawLine, regionPrefix) {
  const address = extractAddressFragment(rawLine, regionPrefix);
  const tokens = address
    .split(',')
    .map(cleanLocationToken)
    .filter(Boolean)
    .filter((token) => !isDistrictToken(token));

  let city = '';
  let province = '';

  if (tokens.length >= 2) {
    city = tokens[tokens.length - 2];
    province = tokens[tokens.length - 1];
  } else if (tokens.length === 1) {
    city = tokens[0];
  }

  if (/^NCR\b/i.test(REGION_LABELS.get(regionPrefix) || '')) {
    province = '';
  }

  if (province && province.toLowerCase() === city.toLowerCase()) {
    province = '';
  }

  return {
    city,
    province
  };
}

function createImportedHeiRecord(record) {
  const region = REGION_LABELS.get(record.regionPrefix) || record.regionPrefix;
  const location = inferLocation(record.regionLine, record.regionPrefix);
  const type = inferType(record.name);

  return cleanInstitution({
    id: [
      'ph',
      type,
      toSlug(record.name).slice(0, 72),
      toSlug(location.city || region).slice(0, 24)
    ].filter(Boolean).join('-'),
    name: record.name,
    type,
    country: 'Philippines',
    region,
    city: location.city,
    province: location.province
  });
}

function mergeKey(record) {
  return [
    normalizeKeyPart(record.name),
    normalizeKeyPart(record.type),
    normalizeKeyPart(record.region)
  ].join('::');
}

function mergeInstitution(existing, incoming) {
  const merged = cleanInstitution(existing);

  merged.region = merged.region || incoming.region;
  merged.city = merged.city || incoming.city;
  merged.country = merged.country || incoming.country;

  if (!merged.province && incoming.province) {
    merged.province = incoming.province;
  }

  const aliases = dedupeAliases([...(merged.aliases || []), ...(incoming.aliases || [])]);
  if (aliases.length) {
    merged.aliases = aliases;
  } else {
    delete merged.aliases;
  }

  return merged;
}

function parseTranscriptRecords(html) {
  const transcriptMatch = html.match(/<p class="d-block text-justify">([\s\S]*?)<\/p>/i);
  if (!transcriptMatch) {
    throw new Error('Unable to locate CHED directory transcript.');
  }

  const lines = decodeHtmlToLines(transcriptMatch[1]);
  const records = [];
  let currentHeader = '';

  for (const line of lines) {
    const regionPrefix = findRegionPrefix(line);

    if (regionPrefix) {
      const name = cleanInstitutionName(currentHeader);
      if (name) {
        records.push({
          name,
          regionPrefix,
          regionLine: line
        });
      }

      currentHeader = '';
      continue;
    }

    if (isSkippableLine(line)) {
      continue;
    }

    currentHeader = line;
  }

  return records;
}

async function main() {
  const existingJson = await fs.readFile(DATA_PATH, 'utf8');
  const existingRecords = JSON.parse(existingJson).map(cleanInstitution);
  const baseRecords = existingRecords.filter((record) => (
    record.type === 'senior_high_school' || !/^ph-(college|university)-/i.test(record.id)
  ));

  const response = await fetchImpl(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download CHED directory seed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const parsedRecords = parseTranscriptRecords(html)
    .map(createImportedHeiRecord)
    .filter((record) => record.name && record.region && record.type);

  const mergedByKey = new Map(baseRecords.map((record) => [mergeKey(record), record]));

  for (const record of parsedRecords) {
    const key = mergeKey(record);
    const existing = mergedByKey.get(key);

    if (existing) {
      mergedByKey.set(key, mergeInstitution(existing, record));
      continue;
    }

    mergedByKey.set(key, record);
  }

  const mergedRecords = [...mergedByKey.values()].sort(sortInstitutions);
  await fs.writeFile(DATA_PATH, `${JSON.stringify(mergedRecords, null, 2)}\n`, 'utf8');

  const summary = mergedRecords.reduce((accumulator, record) => {
    accumulator[record.type] = (accumulator[record.type] || 0) + 1;
    return accumulator;
  }, {});

  console.log('Imported CHED higher-education seed from:', SOURCE_URL);
  console.log('Counts by type:', summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
