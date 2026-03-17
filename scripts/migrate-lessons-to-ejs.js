const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'public', 'lessons');
const targetRoot = path.join(projectRoot, 'views', 'pages', 'lessons');
const tracks = process.argv.slice(2).length ? process.argv.slice(2) : ['mst24', 'it114', 'node'];

function extractMainInner(html) {
  const match = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!match) return null;
  return match[1].trim();
}

function extractArticleBlock(html) {
  const match = html.match(/<article\b[^>]*class=["'][^"']*container[^"']*["'][^>]*>([\s\S]*?)<\/article>/i);
  if (!match) return null;
  return match[1].trim();
}

function migrateTrack(track) {
  const sourceDir = path.join(sourceRoot, track);
  const targetDir = path.join(targetRoot, track);

  if (!fs.existsSync(sourceDir)) {
    return { track, migrated: 0, skipped: 0, errors: [`missing source directory: ${sourceDir}`] };
  }

  fs.mkdirSync(targetDir, { recursive: true });
  const htmlFiles = fs.readdirSync(sourceDir).filter((name) => name.toLowerCase().endsWith('.html'));

  let migrated = 0;
  let skipped = 0;
  const errors = [];

  for (const fileName of htmlFiles) {
    const sourcePath = path.join(sourceDir, fileName);
    const targetPath = path.join(targetDir, fileName.replace(/\.html$/i, '.ejs'));

    try {
      const html = fs.readFileSync(sourcePath, 'utf8');
      const mainInner = extractMainInner(html) || extractArticleBlock(html);
      if (!mainInner) {
        skipped += 1;
        errors.push(`no <main> block: ${sourcePath}`);
        continue;
      }

      const output = `<section class="container mx-auto px-4 py-8">\n${mainInner}\n</section>\n`;
      fs.writeFileSync(targetPath, output, 'utf8');
      migrated += 1;
    } catch (err) {
      skipped += 1;
      errors.push(`failed ${sourcePath}: ${err.message}`);
    }
  }

  return { track, migrated, skipped, errors };
}

const results = tracks.map(migrateTrack);
for (const result of results) {
  console.log(`[${result.track}] migrated=${result.migrated} skipped=${result.skipped}`);
  if (result.errors.length) {
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
  }
}
