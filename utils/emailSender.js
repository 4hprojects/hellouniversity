//emailSender.js
const { Resend } = require('resend');
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI;
let mongoClient;
let mongoReady = false;

async function getDb() {
  if (!mongoUri) throw new Error('MONGODB_URI not set');
  if (!mongoClient) mongoClient = new MongoClient(mongoUri);
  if (!mongoReady) {
    await mongoClient.connect();
    mongoReady = true;
  }
  return mongoClient.db('myDatabase');
}

// Timezone: PH (Asia/Manila)
function nowPH() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
}
function dayKey() {
  return nowPH().toISOString().slice(0, 10);
}

const DAILY_LIMIT = parseInt(process.env.RESEND_DAILY_LIMIT || '100', 10);

async function ensureQuotaDoc(db, dKey) {
  const quotaCol = db.collection('emailQuota');
  let daily = await quotaCol.findOne({ _id: dKey });
  if (!daily) {
    daily = { _id: dKey, resendCount: 0 };
    await quotaCol.insertOne(daily);
  } else if (typeof daily.resendCount !== 'number') {
    daily.resendCount = 0;
    await quotaCol.updateOne({ _id: dKey }, { $set: { resendCount: 0 } });
  }
  return { quotaCol, daily };
}

async function sendEmail({ to, subject, html }) {
  console.log('[EMAIL] sendEmail called for:', to);

  if (!process.env.RESEND_API_KEY) {
    console.error('[EMAIL] RESEND_API_KEY is not set');
    return { success: false, error: 'Email provider not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const db = await getDb();
  const dKey = dayKey();
  const { quotaCol, daily } = await ensureQuotaDoc(db, dKey);
  console.log('[EMAIL] Quota snapshot:', { resendCount: daily.resendCount, limit: DAILY_LIMIT });

  if (daily.resendCount >= DAILY_LIMIT) {
    console.error('[EMAIL] Daily Resend limit reached');
    return { success: false, error: `Daily limit of ${DAILY_LIMIT} emails reached` };
  }

  try {
    const resp = await resend.emails.send({
      from: process.env.SENDER_EMAIL_NOREPLY,
      to,
      subject,
      html
    });

    if (resp?.error) {
      const msg = resp.error.message || resp.error.name || 'Resend error';
      console.error(`[EMAIL] ❌ Resend error | to: ${to} | subject: "${subject}" | error: ${msg}`);
      return { success: false, error: msg };
    }

    await quotaCol.updateOne({ _id: dKey }, { $inc: { resendCount: 1 } });
    console.log(`[EMAIL] ✅ Sent via Resend | to: ${to} | subject: "${subject}"`);
    return { success: true, provider: 'RESEND' };
  } catch (e) {
    console.error(`[EMAIL] ❌ Resend exception | to: ${to} | subject: "${subject}" | error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

module.exports = { sendEmail };
