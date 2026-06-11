// One-off migration: convert public/images/* to WebP, upload to Cloudflare R2,
// and record the old path -> new R2 URL mapping in Supabase (image_assets table).
//
// Usage:
//   node scripts/migrateImagesToR2.js          (dry run - no uploads, no DB writes)
//   node scripts/migrateImagesToR2.js --write  (performs the migration)
//
// Output: scripts/image-url-map.json (original path -> R2 public URL)

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { supabase } = require('../supabaseClient');
const { uploadToR2, getPublicUrl } = require('../utils/r2Client');

const IMAGES_ROOT = path.join(__dirname, '..', 'public', 'images');
const OUTPUT_MAP_PATH = path.join(__dirname, 'image-url-map.json');
const R2_PREFIX = 'static/images';

// Gitignored leftovers that aren't referenced anywhere - skip these.
const EXCLUDED_DIRS = new Set([path.join(IMAGES_ROOT, 'images'), path.join(IMAGES_ROOT, 'Populate HTML Table from Sheets_files')]);
const EXCLUDED_FILES = new Set([path.join(IMAGES_ROOT, 'Screenshot 2025-01-31 143738.png')]);

const EXT_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (EXCLUDED_DIRS.has(fullPath) || EXCLUDED_FILES.has(fullPath)) continue;
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function processFile(filePath, write) {
  const relPath = path.relative(IMAGES_ROOT, filePath).split(path.sep).join('/');
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = EXT_MIME[ext];

  if (!mimeType) {
    console.log(`SKIP (unsupported extension): ${relPath}`);
    return null;
  }

  const originalPath = `/images/${relPath}`;
  const originalBuffer = fs.readFileSync(filePath);

  let webpBuffer;
  let originalFormat;
  if (ext === '.webp') {
    webpBuffer = originalBuffer;
    originalFormat = 'webp';
  } else {
    webpBuffer = await sharp(originalBuffer).webp({ quality: 85 }).toBuffer();
    originalFormat = ext.slice(1);
  }

  const relWithoutExt = relPath.slice(0, relPath.length - ext.length);
  const r2Key = `${R2_PREFIX}/${relWithoutExt}.webp`;
  const r2Url = getPublicUrl(r2Key);

  console.log(
    `${write ? 'UPLOAD' : 'PLAN'}: ${originalPath} -> ${r2Key} (${originalBuffer.length}B -> ${webpBuffer.length}B)`
  );

  if (write) {
    await uploadToR2(r2Key, webpBuffer, 'image/webp');

    const { error } = await supabase.from('image_assets').upsert(
      {
        original_path: originalPath,
        r2_key: r2Key,
        r2_url: r2Url,
        content_type: 'image/webp',
        original_format: originalFormat,
        original_bytes: originalBuffer.length,
        webp_bytes: webpBuffer.length
      },
      { onConflict: 'original_path' }
    );

    if (error) {
      throw new Error(`Supabase upsert failed for ${originalPath}: ${error.message}`);
    }
  }

  return { originalPath, r2Key, r2Url };
}

async function main() {
  const write = process.argv.includes('--write');
  const files = walk(IMAGES_ROOT);

  console.log(`Found ${files.length} files under public/images/ (mode: ${write ? 'WRITE' : 'DRY RUN'})\n`);

  const map = {};
  let processed = 0;
  let skipped = 0;
  let collisions = [];

  for (const filePath of files) {
    const result = await processFile(filePath, write);
    if (!result) {
      skipped++;
      continue;
    }

    if (map[result.r2Key] && map[result.r2Key] !== result.originalPath) {
      collisions.push({ r2Key: result.r2Key, paths: [map[result.r2Key], result.originalPath] });
    }

    map[result.originalPath] = result.r2Url;
    processed++;
  }

  fs.writeFileSync(OUTPUT_MAP_PATH, JSON.stringify(map, null, 2));

  console.log(`\nProcessed: ${processed}, Skipped: ${skipped}`);
  console.log(`Map written to ${OUTPUT_MAP_PATH}`);

  if (collisions.length) {
    console.log('\nCOLLISIONS DETECTED (review manually):');
    for (const c of collisions) {
      console.log(`  ${c.r2Key}: ${c.paths.join(' <-> ')}`);
    }
  }

  if (!write) {
    console.log('\nDry run complete. Re-run with --write to upload to R2 and record mappings in Supabase.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
