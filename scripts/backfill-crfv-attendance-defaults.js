require('dotenv').config();

const { MongoClient } = require('mongodb');
const {
  DEFAULT_ATTENDANCE_SCHEDULE,
  describeAttendanceSchedule,
  normalizeAttendanceSchedule
} = require('../utils/crfvAttendanceSchedule');

const DB_NAME = 'myDatabase';
const SETTINGS_COLLECTION = 'crfv_settings';
const DEFAULTS_KEY = 'attendance-defaults';

function schedulesMatch(left, right) {
  return JSON.stringify(normalizeAttendanceSchedule(left)) === JSON.stringify(normalizeAttendanceSchedule(right));
}

async function backfillAttendanceDefaults() {
  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to backfill CRFV attendance defaults.');
  }

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(SETTINGS_COLLECTION);
    const existingDoc = await collection.findOne({ key: DEFAULTS_KEY });
    const previousSchedule = normalizeAttendanceSchedule(existingDoc?.attendance_schedule);
    const nextSchedule = normalizeAttendanceSchedule(DEFAULT_ATTENDANCE_SCHEDULE);

    if (existingDoc?.attendance_schedule && schedulesMatch(previousSchedule, nextSchedule)) {
      console.log('CRFV attendance defaults are already using the refreshed schedule.');
      console.log(`Current: ${describeAttendanceSchedule(previousSchedule)}`);
      return;
    }

    await collection.updateOne(
      { key: DEFAULTS_KEY },
      {
        $set: {
          key: DEFAULTS_KEY,
          attendance_schedule: nextSchedule,
          updatedAt: new Date(),
          updatedBy: {
            userId: 'script:backfill-crfv-attendance-defaults',
            studentIDNumber: 'system',
            role: 'system'
          }
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('CRFV attendance defaults updated successfully.');
    console.log(`Previous: ${describeAttendanceSchedule(previousSchedule)}`);
    console.log(`Updated:  ${describeAttendanceSchedule(nextSchedule)}`);
    console.log('Event-specific attendance schedules were not modified.');
  } finally {
    await client.close();
  }
}

backfillAttendanceDefaults()
  .catch(error => {
    console.error('Failed to backfill CRFV attendance defaults:', error.message);
    process.exitCode = 1;
  });
