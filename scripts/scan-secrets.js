const fs = require('fs');
const path = require('path');

const root = process.cwd();
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'uploads']);
const textExtensions = new Set([
  '.js', '.json', '.md', '.txt', '.text', '.env', '.html', '.ejs', '.css', '.yml', '.yaml'
]);

const patterns = [
  { name: 'supabase-service-role-jwt', regex: /SUPABASE_SERVICE_ROLE\s*[:=]\s*['"]?eyJ[a-zA-Z0-9._-]+/i },
  { name: 'named-service-role-jwt', regex: /service_role\s*[:=][\s\S]{0,200}?eyJ[a-zA-Z0-9._-]+/i },
  { name: 'mongo-uri-literal', regex: /MONGODB_URI\s*[:=]\s*['"]?mongodb(?:\+srv)?:\/\//i },
  { name: 'private-key-material', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ }
];

function walk(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.env')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }
    files.push(fullPath);
  }
}

function toRelative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function findMatches(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [];
  for (const rule of patterns) {
    if (rule.regex.test(content)) {
      matches.push(rule.name);
    }
  }
  return matches;
}

const files = [];
walk(root, files);

const findings = [];
for (const file of files) {
  const matchedRules = findMatches(file);
  if (matchedRules.length > 0) {
    findings.push({ file: toRelative(file), matchedRules });
  }
}

if (findings.length > 0) {
  console.error('Potential secrets detected:');
  for (const finding of findings) {
    console.error(`- ${finding.file} (${finding.matchedRules.join(', ')})`);
  }
  process.exit(1);
}

console.log('Secret scan passed.');
