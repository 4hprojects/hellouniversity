/**
 * reset-exposed-accounts.js
 * --------------------------------------------------------------------------
 * Incident remediation for P0-1 (see docs/EXECUTION-TRACKER.md).
 *
 * `public/crfv/textfiles/mongodbusers.txt` was anonymously downloadable and
 * exposed real user records including bcrypt password hashes. Those hashes must
 * be treated as compromised. This script rotates the password of each affected
 * account to a fresh random temp password, forces `mustChangePassword`, clears
 * lockout/reset state, and writes an audit-log entry. It can optionally email
 * each user their temp password.
 *
 * SAFETY: dry-run by default. Nothing is written unless you pass --apply.
 *
 * Usage (PowerShell):
 *   # Preview what would change (no writes):
 *   node scripts/reset-exposed-accounts.js
 *
 *   # Apply the reset (rotate passwords + force change):
 *   node scripts/reset-exposed-accounts.js --apply
 *
 *   # Apply AND email each user their temp password (needs RESEND config):
 *   node scripts/reset-exposed-accounts.js --apply --email
 *
 *   # Override the target list (comma-separated studentIDNumbers):
 *   node scripts/reset-exposed-accounts.js --apply --ids 2507152,2507153
 *
 * Requires: MONGODB_URI (+ optional MONGODB_DB_NAME) in the environment / .env.
 * --------------------------------------------------------------------------
 */

require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

// Accounts exposed by the deleted dump (public/crfv/textfiles/mongodbusers.txt).
// Override at runtime with --ids or target everyone with --all.
const EXPOSED_STUDENT_IDS = ['2507152', '2507153', '2507154', '2507155'];

const SALT_ROUNDS = 12;
const TEMP_PASSWORD_LENGTH = 10;

// Mirrors routes/adminUsersRoutes.js so reset state matches the app's own flow.
function buildAccountResetFields() {
  return {
    accountDisabled: false,
    accountLockedUntil: null,
    resetCode: null,
    resetCodeLockUntil: null,
    resetExpires: null,
    resetCodeVerified: false,
    invalidLoginAttempts: 0,
    invalidResetAttempts: 0,
  };
}

function generateTempPassword() {
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const all = lowers + uppers + digits;
  const pick = (charset) => charset[crypto.randomInt(charset.length)];
  const required = [pick(lowers), pick(uppers), pick(digits)];
  const remaining = Array.from(
    { length: TEMP_PASSWORD_LENGTH - required.length },
    () => pick(all),
  );
  const chars = [...required, ...remaining];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const email = argv.includes('--email');
  const all = argv.includes('--all');
  const idsArg = argv.find((a) => a.startsWith('--ids='));
  let ids = EXPOSED_STUDENT_IDS;
  const idxFlag = argv.indexOf('--ids');
  if (idsArg) {
    ids = idsArg.slice('--ids='.length).split(',').map((s) => s.trim()).filter(Boolean);
  } else if (idxFlag !== -1 && argv[idxFlag + 1]) {
    ids = argv[idxFlag + 1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return { apply, email, all, ids };
}

function tempPasswordEmail({ firstName }, tempPassword) {
  return {
    subject: 'Important: your HelloUniversity password was reset',
    html: `
      <p>Hi ${firstName || 'there'},</p>
      <p>As a security precaution we reset the password on your HelloUniversity
      account. Please sign in with the temporary password below and you will be
      asked to set a new one immediately.</p>
      <p style="font-size:18px"><strong>Temporary password:</strong>
      <code>${tempPassword}</code></p>
      <p>If you did not expect this, please contact support.</p>
    `,
  };
}

async function main() {
  const { apply, email, all, ids } = parseArgs(process.argv.slice(2));
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`\n=== reset-exposed-accounts (${mode}) ===`);
  console.log(all ? 'Target: ALL users' : `Target studentIDNumbers: ${ids.join(', ')}`);
  if (email && !apply) {
    console.log('(--email ignored in dry-run; emails only send with --apply)');
  }

  const client = new MongoClient(mongoUri);
  let sendEmail = null;
  if (email && apply) {
    ({ sendEmail } = require('../utils/emailSender'));
  }

  try {
    await client.connect();
    const dbName = (process.env.MONGODB_DB_NAME || 'myDatabase').trim();
    const db = client.db(dbName);
    const users = db.collection('tblUser');
    const logs = db.collection('tblLogs');

    const query = all ? {} : { studentIDNumber: { $in: ids } };
    const matched = await users
      .find(query, {
        projection: {
          emaildb: 1,
          studentIDNumber: 1,
          firstName: 1,
          lastName: 1,
          role: 1,
        },
      })
      .toArray();

    if (matched.length === 0) {
      console.log('\nNo matching accounts found. Nothing to do.');
      return;
    }

    console.log(`\nMatched ${matched.length} account(s):`);
    let applied = 0;
    let emailed = 0;

    for (const user of matched) {
      const label = `${user.studentIDNumber || '(no id)'} <${user.emaildb || 'no-email'}> [${user.role || '?'}]`;

      if (!apply) {
        console.log(`  - ${label}  → would rotate password + force change`);
        continue;
      }

      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
      const now = new Date();

      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            mustChangePassword: true,
            updatedAt: now,
            ...buildAccountResetFields(),
          },
        },
      );
      applied += 1;

      await logs.insertOne({
        studentIDNumber: 'system',
        name: 'Security remediation',
        timestamp: now,
        action: 'SECURITY_FORCED_RESET',
        targetStudentIDNumber: user.studentIDNumber || null,
        targetName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        details: 'Password rotated + mustChangePassword set (P0-1 exposed dump remediation).',
      });

      let emailNote = '';
      if (sendEmail && user.emaildb) {
        const { subject, html } = tempPasswordEmail(user, tempPassword);
        const result = await sendEmail({ to: user.emaildb, subject, html });
        if (result?.success) {
          emailed += 1;
          emailNote = ' (temp password emailed)';
        } else {
          emailNote = ` (EMAIL FAILED: ${result?.error || 'unknown'} — temp password: ${tempPassword})`;
        }
      } else {
        // No email sent: print the temp password so an admin can deliver it.
        emailNote = ` (temp password: ${tempPassword})`;
      }

      console.log(`  - ${label}  ✓ reset${emailNote}`);
    }

    console.log('\n=== Summary ===');
    if (apply) {
      console.log(`Reset: ${applied} account(s); emailed: ${emailed}.`);
      console.log('Affected users must set a new password on next login.');
    } else {
      console.log(`Dry-run only. Re-run with --apply to perform ${matched.length} reset(s).`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('reset-exposed-accounts failed:', err);
  process.exit(1);
});
