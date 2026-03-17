const fetch = require('node-fetch');

const LEGACY_SHEETS_ENDPOINT =
  process.env.LEGACY_SHEETS_ENDPOINT ||
  process.env.GOOGLE_SHEETS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbz8rsTh7FsEUbpq1FR33VMQ_2auDYpjuq6SJTbOmgzHqHSRThylSkpEe7ZTExBo8099jQ/exec';

async function addEntryToSheet(payload = {}) {
  const response = await fetch(LEGACY_SHEETS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let body = '';
  try {
    body = await response.text();
  } catch (_err) {
    body = '';
  }

  if (!response.ok) {
    throw new Error(`Sheets relay failed: ${response.status} ${response.statusText}`);
  }

  return body || 'Submitted successfully';
}

module.exports = { addEntryToSheet };
