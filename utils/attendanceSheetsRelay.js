const fetch = require('node-fetch');

const DEFAULT_TIMEOUT_MS = 2500;
const GOOGLE_SHEETS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbz8rsTh7FsEUbpq1FR33VMQ_2auDYpjuq6SJTbOmgzHqHSRThylSkpEe7ZTExBo8099jQ/exec';

function createTimeoutPromise(timeoutMs) {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Sheets relay timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    timeoutId.unref?.();
  });
}

async function relayAttendanceToSheets(
  payload,
  { timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  try {
    await Promise.race([
      fetch(GOOGLE_SHEETS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      }),
      createTimeoutPromise(timeoutMs),
    ]);
  } catch (error) {
    console.warn('Attendance Sheets relay failed:', error.message || error);
  }
}

module.exports = {
  relayAttendanceToSheets,
  GOOGLE_SHEETS_ENDPOINT,
  DEFAULT_TIMEOUT_MS,
};
