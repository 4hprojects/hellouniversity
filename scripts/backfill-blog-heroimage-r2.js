// One-off migration: rewrite tblBlogs.heroImage values that point at the old
// /images/... static paths to their Cloudflare R2 URLs, using the mapping
// produced by scripts/migrateImagesToR2.js.
//
// Usage:
//   node scripts/backfill-blog-heroimage-r2.js          (dry run)
//   node scripts/backfill-blog-heroimage-r2.js --write  (applies updates)

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DB_NAME = 'myDatabase';
const COLLECTION_NAME = 'tblBlogs';
const MAP_PATH = path.join(__dirname, 'image-url-map.json');

async function main() {
  const write = process.argv.includes('--write');
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required.');
  }

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);

    const docs = await collection
      .find({ heroImage: { $in: Object.keys(map) } })
      .project({ _id: 1, title: 1, heroImage: 1 })
      .toArray();

    console.log(`Found ${docs.length} document(s) with a heroImage matching the migration map (mode: ${write ? 'WRITE' : 'DRY RUN'})\n`);

    for (const doc of docs) {
      const newUrl = map[doc.heroImage];
      console.log(`${write ? 'UPDATE' : 'PLAN'}: ${doc._id} "${doc.title || ''}" ${doc.heroImage} -> ${newUrl}`);

      if (write) {
        await collection.updateOne({ _id: doc._id }, { $set: { heroImage: newUrl } });
      }
    }

    if (!write) {
      console.log('\nDry run complete. Re-run with --write to apply updates.');
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
