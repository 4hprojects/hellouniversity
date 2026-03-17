//emailSender.js
const { Resend } = require('resend');
const sgMail = require('@sendgrid/mail');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');

const resend = new Resend(process.env.RESEND_API_KEY || '');
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
function monthKey() {
  return nowPH().toISOString().slice(0, 7);
}

// Limits (env override)
const LIMITS = {
  RESEND: parseInt(process.env.RESEND_DAILY_LIMIT || '50', 10),
  ELASTIC: parseInt(process.env.ELASTIC_DAILY_LIMIT || '95', 10),
  MAILERSEND_MONTHLY: parseInt(process.env.MAILERSEND_MONTHLY_LIMIT || '100', 10),
  SENDGRID: parseInt(process.env.SENDGRID_DAILY_LIMIT || '95', 10)
};

// Trial recipient restrictions
const ELASTIC_TEST_RECIPIENT = (process.env.ELASTIC_TEST_RECIPIENT || '').toLowerCase();
const MAILERSEND_ADMIN_EMAIL = (process.env.MAILERSEND_ADMIN_EMAIL || '').toLowerCase();

// Provider order (comma separated: e.g. SENDGRID,RESEND)
function getProviderOrder() {
  const def = ['RESEND', 'SENDGRID', 'ELASTIC', 'MAILERSEND'];
  const raw = (process.env.EMAIL_PROVIDER_ORDER || '').trim();
  if (!raw) return def;
  const list = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const valid = [];
  list.forEach(p => { if (def.includes(p) && !valid.includes(p)) valid.push(p); });
  def.forEach(p => { if (!valid.includes(p)) valid.push(p); });
  return valid;
}

function push(results, entry) {
  results.push(entry);
  return entry;
}

async function ensureQuotaDocs(db, dKey, mKey) {
  const quotaCol = db.collection('emailQuota');
  const msCol = db.collection('mailersendQuota');

  let daily = await quotaCol.findOne({ _id: dKey });
  if (!daily) {
    daily = { _id: dKey, resendCount: 0, elasticCount: 0, mailersendCount: 0, sendgridCount: 0 };
    await quotaCol.insertOne(daily);
  } else {
    const fix = {};
    ['resendCount','elasticCount','mailersendCount','sendgridCount'].forEach(k => {
      if (typeof daily[k] !== 'number') { daily[k] = 0; fix[k] = 0; }
    });
    if (Object.keys(fix).length) {
      await quotaCol.updateOne({ _id: dKey }, { $set: fix });
    }
  }

  let monthly = await msCol.findOne({ _id: mKey });
  if (!monthly) {
    monthly = { _id: mKey, count: 0 };
    await msCol.insertOne(monthly);
  }
  return { quotaCol, msCol, daily, monthly };
}

async function sendEmail({ to, subject, html }) {
  console.log('[EMAIL] sendEmail called for:', to);
  const db = await getDb();
  const dKey = dayKey();
  const mKey = monthKey();
  const { quotaCol, msCol, daily, monthly } = await ensureQuotaDocs(db, dKey, mKey);
  const lowerTo = (to || '').toLowerCase();
  console.log('Quota snapshot:', daily, 'Monthly MailerSend:', monthly.count);

  const results = [];

  async function tryResend() {
    if (!process.env.RESEND_API_KEY) return push(results, { provider:'RESEND', skipped:'missing API key' });
    if (daily.resendCount >= LIMITS.RESEND) return push(results, { provider:'RESEND', skipped:`limit ${LIMITS.RESEND} reached` });
    try {
      const resp = await resend.emails.send({
        from: process.env.SENDER_EMAIL_NOREPLY,
        to,
        subject,
        html
      });
      if (resp?.error) throw new Error(resp.error.error || 'Resend error');
      await quotaCol.updateOne({ _id: dKey }, { $inc: { resendCount: 1 } });
      return { success:true, provider:'RESEND' };
    } catch (e) {
      return push(results, { provider:'RESEND', error:e.message });
    }
  }

  async function tryElastic() {
    if (!process.env.ELASTIC_API_KEY) return push(results, { provider:'ELASTIC', skipped:'missing API key' });
    if (daily.elasticCount >= LIMITS.ELASTIC) return push(results, { provider:'ELASTIC', skipped:`limit ${LIMITS.ELASTIC} reached` });
    if (ELASTIC_TEST_RECIPIENT && lowerTo !== ELASTIC_TEST_RECIPIENT) {
      return push(results, { provider:'ELASTIC', skipped:'trial restriction (recipient not test)' });
    }
    try {
      const res = await axios.post(
        'https://api.elasticemail.com/v2/email/send',
        null,
        {
          params: {
            apikey: process.env.ELASTIC_API_KEY,
            from: process.env.SENDER_EMAIL_NOREPLY,
            to,
            subject,
            bodyHtml: html,
            isTransactional: true
          },
          timeout: 15000
        }
      );
      if (res?.data?.success === false) throw new Error(res.data.error || 'Elastic failed');
      await quotaCol.updateOne({ _id: dKey }, { $inc: { elasticCount: 1 } });
      return { success:true, provider:'ELASTIC' };
    } catch (e) {
      return push(results, { provider:'ELASTIC', error:e.message });
    }
  }

  async function tryMailerSend() {
    if (!process.env.MAILERSEND_API_KEY) return push(results, { provider:'MAILERSEND', skipped:'missing API key' });
    if (monthly.count >= LIMITS.MAILERSEND_MONTHLY) {
      return push(results, { provider:'MAILERSEND', skipped:`monthly limit ${LIMITS.MAILERSEND_MONTHLY} reached` });
    }
    if (MAILERSEND_ADMIN_EMAIL && lowerTo !== MAILERSEND_ADMIN_EMAIL) {
      return push(results, { provider:'MAILERSEND', skipped:'trial restriction (recipient not admin)' });
    }
    try {
      const ms = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
      const sentFrom = new Sender(process.env.SENDER_EMAIL_NOREPLY, 'HelloUniversity');
      const recipients = [new Recipient(to, '')];
      const params = new EmailParams().setFrom(sentFrom).setTo(recipients).setSubject(subject).setHtml(html);
      const resp = await ms.email.send(params);
      if (resp?.statusCode && resp.statusCode >= 400) throw new Error(`MailerSend status ${resp.statusCode}`);
      await msCol.updateOne({ _id: mKey }, { $inc: { count: 1 } });
      await quotaCol.updateOne({ _id: dKey }, { $inc: { mailersendCount: 1 } });
      return { success:true, provider:'MAILERSEND' };
    } catch (e) {
      const msg = e?.body?.message || e.message;
      return push(results, { provider:'MAILERSEND', error: msg });
    }
  }

  async function trySendGrid() {
    if (!process.env.SENDGRID_API_KEY) return push(results, { provider:'SENDGRID', skipped:'missing API key' });
    if (daily.sendgridCount >= LIMITS.SENDGRID) return push(results, { provider:'SENDGRID', skipped:`limit ${LIMITS.SENDGRID} reached` });
    try {
      await sgMail.send({ to, from: process.env.SENDER_EMAIL, subject, html });
      await quotaCol.updateOne({ _id: dKey }, { $inc: { sendgridCount: 1 } });
      return { success:true, provider:'SENDGRID' };
    } catch (e) {
      let msg = e.message;
      if (e?.response?.body?.errors) {
        msg = e.response.body.errors.map(er => er.message).join('; ');
      }
      if (/Maximum credits exceeded/i.test(msg)) {
        msg = 'SendGrid credits exhausted';
      }
      return push(results, { provider:'SENDGRID', error: msg });
    }
  }

  const order = getProviderOrder();
  for (const p of order) {
    let out;
    if (p === 'RESEND') out = await tryResend();
    else if (p === 'ELASTIC') out = await tryElastic();
    else if (p === 'MAILERSEND') out = await tryMailerSend();
    else if (p === 'SENDGRID') out = await trySendGrid();
    if (out && out.success) return out;
  }

  const allSkipped = results.length && results.every(r => r.skipped && !r.error);
  console.error('All providers exhausted', results);
  return {
    success:false,
    error: allSkipped ? 'All providers skipped (limits/trials)' : 'All providers failed',
    attempts: results
  };
}

module.exports = { sendEmail };
