function hasValue(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() !== '';
}

function isBooleanString(value) {
  return value === 'true' || value === 'false';
}

function validateEnv() {
  const required = [
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
  ];

  const missing = required.filter((key) => !hasValue(key));

  const isDev = process.env.NODE_ENV === 'development';
  const captchaDisabled = process.env.DISABLE_CAPTCHA === 'true';
  if (!isDev && !captchaDisabled && !hasValue('SECRET_KEY')) {
    missing.push('SECRET_KEY');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const productionHardeningKeys = [
    'TRUST_PROXY',
    'SESSION_COOKIE_SECURE',
    'SESSION_COOKIE_SAMESITE',
    'ENABLE_CSP',
    'CSP_REPORT_ONLY'
  ];

  if (isProduction) {
    for (const key of productionHardeningKeys) {
      if (!hasValue(key)) {
        missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    const lines = [
      'Startup aborted due to missing required environment variables:',
      ...missing.map((key) => `- ${key}`),
      '',
      'Populate these in your .env before starting the server.',
    ];
    throw new Error(lines.join('\n'));
  }

  const invalid = [];
  const sameSite = String(process.env.SESSION_COOKIE_SAMESITE || '').toLowerCase();
  const validSameSite = new Set(['lax', 'strict', 'none']);

  if (hasValue('SESSION_COOKIE_SECURE') && !isBooleanString(String(process.env.SESSION_COOKIE_SECURE).toLowerCase())) {
    invalid.push('SESSION_COOKIE_SECURE must be "true" or "false".');
  }

  if (hasValue('ENABLE_CSP') && !isBooleanString(String(process.env.ENABLE_CSP).toLowerCase())) {
    invalid.push('ENABLE_CSP must be "true" or "false".');
  }

  if (hasValue('CSP_REPORT_ONLY') && !isBooleanString(String(process.env.CSP_REPORT_ONLY).toLowerCase())) {
    invalid.push('CSP_REPORT_ONLY must be "true" or "false".');
  }

  if (hasValue('SESSION_COOKIE_SAMESITE') && !validSameSite.has(sameSite)) {
    invalid.push('SESSION_COOKIE_SAMESITE must be one of: lax, strict, none.');
  }

  if (sameSite === 'none' && String(process.env.SESSION_COOKIE_SECURE).toLowerCase() !== 'true') {
    invalid.push('SESSION_COOKIE_SAMESITE=none requires SESSION_COOKIE_SECURE=true.');
  }

  if (invalid.length > 0) {
    const lines = [
      'Startup aborted due to invalid security environment configuration:',
      ...invalid.map((item) => `- ${item}`)
    ];
    throw new Error(lines.join('\n'));
  }
}

module.exports = { validateEnv };
