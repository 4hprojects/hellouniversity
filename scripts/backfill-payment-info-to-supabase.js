require('dotenv').config();

const { MongoClient } = require('mongodb');
const { supabase } = require('../supabaseClient');
const {
  PAYMENT_INFO_FIELDS,
  normalizePaymentForBackfill
} = require('../utils/paymentInfoStore');

const DB_NAME = 'myDatabase';
const COLLECTION_NAME = 'payment_info';
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_SAMPLE_LIMIT = 25;

function parseArgs(argv) {
  const options = {
    write: false,
    batchSize: DEFAULT_BATCH_SIZE,
    sampleLimit: DEFAULT_SAMPLE_LIMIT
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.write = true;
      return;
    }

    if (arg.startsWith('--batch-size=')) {
      const parsed = Number.parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.batchSize = parsed;
      }
      return;
    }

    if (arg.startsWith('--sample-limit=')) {
      const parsed = Number.parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.sampleLimit = parsed;
      }
    }
  });

  return options;
}

function normalizeComparableValue(field, value) {
  if (value == null) {
    return null;
  }

  if (field === 'amount') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'object' && typeof value.toISOString === 'function') {
    return value.toISOString();
  }

  return String(value);
}

function diffPaymentRows(mongoRow, supabaseRow) {
  const differences = {};

  PAYMENT_INFO_FIELDS.forEach((field) => {
    const left = normalizeComparableValue(field, mongoRow[field]);
    const right = normalizeComparableValue(field, supabaseRow[field]);
    if (left !== right) {
      differences[field] = {
        mongo: left,
        supabase: right
      };
    }
  });

  return differences;
}

async function fetchSupabaseCount() {
  const { count, error } = await supabase
    .from('payment_info')
    .select('payment_id', { count: 'exact', head: true });

  if (error) {
    throw error;
  }

  return Number(count || 0);
}

async function fetchSupabaseRowsByPaymentIds(paymentIds) {
  if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('payment_info')
    .select(PAYMENT_INFO_FIELDS.join(', '))
    .in('payment_id', paymentIds);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function fetchExistingAttendeeNos(attendeeNos) {
  if (!Array.isArray(attendeeNos) || attendeeNos.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from('attendees')
    .select('attendee_no')
    .in('attendee_no', attendeeNos);

  if (error) {
    throw error;
  }

  return new Set(
    (Array.isArray(data) ? data : [])
      .map((row) => String(row?.attendee_no || '').trim())
      .filter(Boolean)
  );
}

function printReport(summary, sampleLimit) {
  console.log(`Mode: ${summary.write ? 'WRITE' : 'DRY RUN'}`);
  console.log(`Mongo row count: ${summary.mongoRowCount}`);
  console.log(`Supabase row count: ${summary.supabaseRowCount}`);
  console.log(`Processed batches: ${summary.batches}`);
  console.log(`Duplicate Mongo payment_ids: ${summary.duplicatePaymentIds.length}`);
  console.log(`Missing payment_ids in Supabase: ${summary.missingPaymentIds.length}`);
  console.log(`Rows with field differences: ${summary.diffRows.length}`);
  console.log(`Rows with missing attendee linkage: ${summary.orphanedRows.length}`);
  if (summary.write) {
    console.log(`Rows upserted into Supabase: ${summary.upsertedRows}`);
    console.log(`Rows skipped due to missing attendee linkage: ${summary.skippedRows}`);
  }

  if (summary.duplicatePaymentIds.length > 0) {
    console.log('\nDuplicate Mongo payment_ids:');
    summary.duplicatePaymentIds.slice(0, sampleLimit).forEach((paymentId) => {
      console.log(`- ${paymentId}`);
    });
  }

  if (summary.missingPaymentIds.length > 0) {
    console.log('\nMissing payment_ids in Supabase:');
    summary.missingPaymentIds.slice(0, sampleLimit).forEach((paymentId) => {
      console.log(`- ${paymentId}`);
    });
  }

  if (summary.diffRows.length > 0) {
    console.log('\nField-level diffs:');
    summary.diffRows.slice(0, sampleLimit).forEach((row) => {
      console.log(`- ${row.payment_id}`);
      Object.entries(row.differences).forEach(([field, values]) => {
        console.log(`  ${field}: mongo=${JSON.stringify(values.mongo)} supabase=${JSON.stringify(values.supabase)}`);
      });
    });
  }

  if (summary.orphanedRows.length > 0) {
    console.log('\nRows skipped due to missing attendee linkage:');
    summary.orphanedRows.slice(0, sampleLimit).forEach((row) => {
      console.log(`- payment_id=${row.payment_id} attendee_no=${row.attendee_no}`);
    });
  }
}

async function backfillPaymentInfo() {
  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to backfill CRFV payment_info.');
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE are required to backfill CRFV payment_info.');
  }

  const options = parseArgs(process.argv.slice(2));
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
  const summary = {
    write: options.write,
    mongoRowCount: 0,
    supabaseRowCount: 0,
    batches: 0,
    upsertedRows: 0,
    skippedRows: 0,
    duplicatePaymentIds: [],
    missingPaymentIds: [],
    diffRows: [],
    orphanedRows: []
  };

  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
    summary.mongoRowCount = await collection.countDocuments({});
    summary.supabaseRowCount = await fetchSupabaseCount();

    const cursor = collection.find({}, { projection: { _id: 0 } }).sort({ payment_id: 1 });
    const seenPaymentIds = new Set();
    let batch = [];

    const flushBatch = async () => {
      if (batch.length === 0) {
        return;
      }

      summary.batches += 1;

      const normalizedRows = batch.map((row) => normalizePaymentForBackfill(row));
      const paymentIds = normalizedRows
        .map((row) => String(row.payment_id || '').trim())
        .filter(Boolean);
      const attendeeNos = Array.from(new Set(
        normalizedRows
          .map((row) => String(row.attendee_no || '').trim())
          .filter(Boolean)
      ));

      const [existingAttendeeNos, supabaseRows] = await Promise.all([
        fetchExistingAttendeeNos(attendeeNos),
        fetchSupabaseRowsByPaymentIds(paymentIds)
      ]);

      const supabaseMap = new Map(
        supabaseRows.map((row) => [String(row.payment_id || '').trim(), row])
      );
      const validRows = [];

      normalizedRows.forEach((row) => {
        const paymentId = String(row.payment_id || '').trim();
        const attendeeNo = String(row.attendee_no || '').trim();

        if (!paymentId) {
          return;
        }

        if (seenPaymentIds.has(paymentId)) {
          summary.duplicatePaymentIds.push(paymentId);
          return;
        }

        seenPaymentIds.add(paymentId);

        if (!existingAttendeeNos.has(attendeeNo)) {
          summary.orphanedRows.push({ payment_id: paymentId, attendee_no: attendeeNo });
          summary.skippedRows += 1;
          return;
        }

        const existingSupabaseRow = supabaseMap.get(paymentId);
        if (!existingSupabaseRow) {
          summary.missingPaymentIds.push(paymentId);
        } else {
          const differences = diffPaymentRows(row, existingSupabaseRow);
          if (Object.keys(differences).length > 0) {
            summary.diffRows.push({ payment_id: paymentId, differences });
          }
        }

        validRows.push(row);
      });

      if (options.write && validRows.length > 0) {
        const { error } = await supabase
          .from('payment_info')
          .upsert(validRows, { onConflict: 'payment_id' });

        if (error) {
          throw error;
        }

        summary.upsertedRows += validRows.length;
      }

      batch = [];
    };

    while (await cursor.hasNext()) {
      batch.push(await cursor.next());
      if (batch.length >= options.batchSize) {
        await flushBatch();
      }
    }

    await flushBatch();
    printReport(summary, options.sampleLimit);
  } finally {
    await client.close();
  }
}

backfillPaymentInfo().catch((error) => {
  console.error('Failed to backfill CRFV payment_info:', error.message);
  process.exitCode = 1;
});
