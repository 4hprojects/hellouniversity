// One-off migration: import lesson page content from views/pages/lessons/**/*.ejs
// into the tblLessons MongoDB collection.
//
// Usage:
//   node scripts/import-lessons.js          (dry run - reports extracted lessons)
//   node scripts/import-lessons.js --write  (upserts into tblLessons)

require('dotenv').config();

const { MongoClient } = require('mongodb');
const { importLessonsToCollection } = require('../app/lessonImport');

async function main() {
  const write = process.argv.includes('--write');

  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  const dbName = String(process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'myDatabase').trim();

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required.');
  }

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    const collection = client.db(dbName).collection('tblLessons');
    const result = await importLessonsToCollection(collection, { write });

    console.log(`\nProcessed ${result.importedCount} lesson(s) (mode: ${write ? 'WRITE' : 'DRY RUN'})`);

    if (!write) {
      console.log('\nDry run complete. Re-run with --write to upsert into tblLessons.');
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
