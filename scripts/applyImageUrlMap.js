// One-off codemod: rewrite /images/... references to their Cloudflare R2 URLs
// using the mapping produced by scripts/migrateImagesToR2.js.
//
// Usage:
//   node scripts/applyImageUrlMap.js          (dry run - reports matches per file)
//   node scripts/applyImageUrlMap.js --write  (rewrites files in place)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAP_PATH = path.join(__dirname, 'image-url-map.json');

const TARGET_DIRS = [path.join(ROOT, 'views')];
const TARGET_FILES = [
  path.join(ROOT, 'app', 'blogCatalog.js'),
  path.join(ROOT, 'app', 'lessonMeta.js'),
  path.join(ROOT, 'app', 'eventsCatalog.js')
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.name.endsWith('.ejs')) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  const write = process.argv.includes('--write');
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const entries = Object.entries(map);

  const files = [...TARGET_DIRS.flatMap((d) => walk(d)), ...TARGET_FILES.filter((f) => fs.existsSync(f))];

  let totalReplacements = 0;
  let filesChanged = 0;

  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileReplacements = 0;

    for (const [originalPath, r2Url] of entries) {
      const occurrences = content.split(originalPath).length - 1;
      if (occurrences > 0) {
        content = content.split(originalPath).join(r2Url);
        fileReplacements += occurrences;
      }
    }

    if (fileReplacements > 0) {
      filesChanged++;
      totalReplacements += fileReplacements;
      const relPath = path.relative(ROOT, filePath);
      console.log(`${write ? 'WRITE' : 'PLAN'}: ${relPath} (${fileReplacements} replacement(s))`);

      if (write) {
        fs.writeFileSync(filePath, content);
      }
    }
  }

  console.log(`\n${filesChanged} file(s), ${totalReplacements} total replacement(s)`);

  if (!write) {
    console.log('\nDry run complete. Re-run with --write to apply changes.');
  }
}

main();
