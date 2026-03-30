const { validateEnv } = require('../../app/validateEnv');

const REQUIRED_KEYS = [
  'MONGODB_URI',
  'SESSION_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE',
  'CF_R2_ACCOUNT_ID',
  'CF_R2_ACCESS_KEY_ID',
  'CF_R2_SECRET_ACCESS_KEY',
  'CF_R2_BUCKET_NAME',
  'RESEND_API_KEY',
  'SENDER_EMAIL_NOREPLY',
  'GOOGLE_API_KEY',
  'GOOGLE_SPREADSHEET_ID_ATTENDANCE',
  'GOOGLE_TYPE',
  'GOOGLE_PROJECT_ID',
  'GOOGLE_PRIVATE_KEY_ID',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_AUTH_URI',
  'GOOGLE_TOKEN_URI',
  'GOOGLE_AUTH_PROVIDER_X509_CERT_URL',
  'GOOGLE_CLIENT_X509_CERT_URL',
  'GOOGLE_UNIVERSE_DOMAIN',
  'SECRET_KEY'
];

const PRODUCTION_SECURITY_KEYS = {
  TRUST_PROXY: '1',
  SESSION_COOKIE_SECURE: 'true',
  SESSION_COOKIE_SAMESITE: 'lax',
  ENABLE_CSP: 'true',
  CSP_REPORT_ONLY: 'true'
};

function setAllRequiredEnv() {
  for (const key of REQUIRED_KEYS) {
    process.env[key] = `test_${key.toLowerCase()}`;
  }
  process.env.NODE_ENV = 'test';
  process.env.DISABLE_CAPTCHA = 'false';
  Object.assign(process.env, PRODUCTION_SECURITY_KEYS);
}

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('passes when all required env vars are present', () => {
    setAllRequiredEnv();
    expect(() => validateEnv()).not.toThrow();
  });

  test('throws when critical env var is missing', () => {
    setAllRequiredEnv();
    delete process.env.MONGODB_URI;
    expect(() => validateEnv()).toThrow(/MONGODB_URI/);
  });

  test('throws in production when explicit hardening keys are missing', () => {
    setAllRequiredEnv();
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_CSP;
    expect(() => validateEnv()).toThrow(/ENABLE_CSP/);
  });

  test('throws when sameSite none is used without secure cookie', () => {
    setAllRequiredEnv();
    process.env.SESSION_COOKIE_SAMESITE = 'none';
    process.env.SESSION_COOKIE_SECURE = 'false';
    expect(() => validateEnv()).toThrow(/requires SESSION_COOKIE_SECURE=true/);
  });
});
