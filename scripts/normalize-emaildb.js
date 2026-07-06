/**
 * normalize-emaildb.js
 * --------------------------------------------------------------------------
 * P2-8 follow-up (see docs/EXECUTION-TRACKER.md).
 *
 * All current write paths store `emaildb` normalized to lowercase, and login /
 * password-reset now do an indexed exact match on the normalized value (with a
 * slow regex fallback for legacy records). This script lowercases any legacy
 * `emaildb` values that still contain uppercase characters so the fallback
 * never fires and every email lookup stays on the index.
 *
 * Accounts that would COLLIDE after lowercasing (two users whose emails differ
 * only by case) are reported and skipped — resolving those is a manual
 * decision, never an automatic merge.
 *
 * SAFETY: dry-run by default. Nothing is written unless you pass --apply.
 *
 * Usage:
 *   # Preview what would change (no writes):
 *   node scripts/normalize-emaildb.js
 *
 *   # Apply the normalization:
 *   node scripts/normalize-emaildb.js --apply
 *
 * Requires: MONGODB_URI (+ optional MONGODB_DB_NAME) in the environment / .env.
 * --------------------------------------------------------------------------
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const apply = process.argv.includes('--apply');
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`\n=== normalize-emaildb (${mode}) ===`);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const dbName = (process.env.MONGODB_DB_NAME || 'myDatabase').trim();
    const db = client.db(dbName);
    const users = db.collection('tblUser');

    const mixedCase = await users
      .find(
        { emaildb: { $type: 'string', $regex: '[A-Z]' } },
        { projection: { emaildb: 1, studentIDNumber: 1, role: 1 } },
      )
      .toArray();

    if (mixedCase.length === 0) {
      console.log('\nAll emaildb values are already lowercase. Nothing to do.');
      return;
    }

    console.log(`\nFound ${mixedCase.length} account(s) with uppercase emaildb:`);

    let applied = 0;
    let collisions = 0;

    for (const user of mixedCase) {
      const lowered = user.emaildb.toLowerCase();
      const label = `${user.studentIDNumber || '(no id)'} <${user.emaildb}> [${user.role || '?'}]`;

      const existing = await users.findOne(
        { _id: { $ne: user._id }, emaildb: lowered },
        { projection: { studentIDNumber: 1, emaildb: 1 } },
      );
      if (existing) {
        collisions += 1;
        console.log(
          `  - ${label}  ✗ SKIPPED: lowercasing collides with ` +
            `${existing.studentIDNumber || '(no id)'} <${existing.emaildb}> — resolve manually`,
        );
        continue;
      }

      if (!apply) {
        console.log(`  - ${label}  → would become <${lowered}>`);
        continue;
      }

      await users.updateOne(
        { _id: user._id },
        { $set: { emaildb: lowered, updatedAt: new Date() } },
      );
      applied += 1;
      console.log(`  - ${label}  ✓ normalized to <${lowered}>`);
    }

    console.log('\n=== Summary ===');
    if (collisions > 0) {
      console.log(`Collisions skipped: ${collisions} (must be resolved manually).`);
    }
    if (apply) {
      console.log(`Normalized: ${applied} account(s).`);
    } else {
      console.log(
        `Dry-run only. Re-run with --apply to normalize ${mixedCase.length - collisions} account(s).`,
      );
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('normalize-emaildb failed:', err);
  process.exit(1);
});
