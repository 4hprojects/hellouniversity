require('dotenv').config();

const { MongoClient } = require('mongodb');

const { importLegacyBlogsToCollection } = require('../app/blogImport');

async function run() {
  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  const dbName = String(process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'myDatabase').trim();
  const replaceExisting = process.argv.includes('--replace');

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to import legacy blogs.');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const collection = client.db(dbName).collection('tblBlogs');
    const result = await importLegacyBlogsToCollection(collection, { replaceExisting });
    console.log(`Legacy blog import completed. Processed ${result.importedCount} entries.`);
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error('Legacy blog import failed:', error);
  process.exit(1);
});
