// Guards the P0-1/P0-2 fix: /crfv/textfiles historically served internal artifacts
// (a user dump with PII + bcrypt hashes, DB schema, Apps Script source, SQL, ID
// lists) as anonymously-downloadable static files. Those were deleted/relocated and
// app/setupCoreMiddleware.js now allowlists only the genuine public assets in that
// directory. This test asserts the sensitive paths are not downloadable while the
// legitimate assets still are.

const path = require('path');
const express = require('express');
const request = require('supertest');
const { configureCoreMiddleware } = require('../../app/setupCoreMiddleware');

function buildApp() {
  const app = express();
  // projectRoot = repo root so express.static points at the real public/ dir.
  configureCoreMiddleware(app, path.join(__dirname, '..', '..'));
  return app;
}

const BLOCKED_PATHS = [
  '/crfv/textfiles/mongodbusers.txt',
  '/crfv/textfiles/databaseschema.txt',
  '/crfv/textfiles/appscript.txt',
  '/crfv/textfiles/SQLQueries.txt',
  '/crfv/textfiles/locationlist.txt',
  '/crfv/textfiles/textvalidfiles.txt',
  // even an arbitrary re-added file must be blocked by the allowlist guard
  '/crfv/textfiles/anything-else.txt',
];

const ALLOWED_PATHS = [
  '/crfv/textfiles/philippine_provinces_cities_municipalities_and_barangays_2019v2.json',
  '/crfv/textfiles/attendee_list_template.xlsx',
];

describe('CRFV textfiles static guard', () => {
  it.each(BLOCKED_PATHS)('blocks %s with 404', async (p) => {
    const res = await request(buildApp()).get(p);
    expect(res.status).toBe(404);
  });

  it.each(ALLOWED_PATHS)('still serves %s', async (p) => {
    const res = await request(buildApp()).get(p);
    expect(res.status).toBe(200);
  });
});
