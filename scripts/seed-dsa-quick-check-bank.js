require('dotenv').config();

const { MongoClient } = require('mongodb');
const { buildDsaQuickCheckQuestionBank } = require('../app/dsaQuickCheckQuestionBank');

async function seedDsaQuickCheckBank({ collection }) {
  const now = new Date();
  const questions = buildDsaQuickCheckQuestionBank();
  const results = {
    total: questions.length,
    upserted: 0,
    modified: 0
  };

  for (const question of questions) {
    const response = await collection.updateOne(
      { lessonSlug: question.lessonSlug, questionId: question.questionId },
      {
        $set: {
          ...question,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
    if (response.upsertedCount) results.upserted += response.upsertedCount;
    if (response.modifiedCount) results.modified += response.modifiedCount;
  }

  return results;
}

async function main() {
  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  const dbName = String(process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'myDatabase').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to seed DSA Quick Check questions.');
  }

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const database = client.db(dbName);
    const collection = database.collection('tblDsaQuickCheckQuestions');
    await collection.createIndex({ lessonSlug: 1, questionId: 1 }, { unique: true });
    await collection.createIndex({ lessonSlug: 1, status: 1 });
    const result = await seedDsaQuickCheckBank({ collection });
    console.log(`Seeded DSA Quick Check bank: ${result.total} total, ${result.upserted} inserted, ${result.modified} updated.`);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  seedDsaQuickCheckBank
};
