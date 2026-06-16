const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const path = require('path');

function parseBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function configureHelmet(app) {
  const enableCsp = process.env.ENABLE_CSP
    ? parseBoolean(process.env.ENABLE_CSP)
    : process.env.NODE_ENV === 'production';

  if (!enableCsp) {
    app.use(helmet({ contentSecurityPolicy: false }));
    return;
  }

  const cspReportOnly = process.env.CSP_REPORT_ONLY
    ? parseBoolean(process.env.CSP_REPORT_ONLY)
    : true;

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      reportOnly: cspReportOnly,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.nonce}'`,
          'https://www.google.com',
          'https://www.gstatic.com',
          'https://cse.google.com',
          'https://www.googletagmanager.com',
          'https://pagead2.googlesyndication.com',
          'https://unpkg.com',
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net',
          'https://cdn.sheetjs.com'
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        fontSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://www.google.com',
          'https://www.gstatic.com',
          'https://cse.google.com',
          'https://www.google-analytics.com',
          'https://*.google-analytics.com',
          'https://*.supabase.co'
        ],
        frameSrc: ["'self'", 'https://www.google.com', 'https://cse.google.com']
      }
    }
  }));
}

function configureCoreMiddleware(app, rootDir) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.get('/favicon.ico', (req, res) => {
    res.type('image/webp');
    res.sendFile(path.join(rootDir, 'public', 'images', 'hellouniversity-new-icon.webp'));
  });
  // Defense-in-depth: /crfv/textfiles historically mixed public reference assets
  // with internal artifacts (a user dump, DB schema, Apps Script source, SQL, ID
  // lists). Those were removed/relocated; this guard ensures only the known public
  // assets in that directory can ever be served, even if a file is re-added.
  const CRFV_TEXTFILES_ALLOWLIST = new Set([
    '/crfv/textfiles/philippine_provinces_cities_municipalities_and_barangays_2019v2.json',
    '/crfv/textfiles/attendee_list_template.xlsx',
  ]);
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/crfv/textfiles/') &&
      !CRFV_TEXTFILES_ALLOWLIST.has(req.path)
    ) {
      return res.status(404).end();
    }
    return next();
  });
  app.use(express.static(path.join(rootDir, 'public')));
  app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
  });
  configureHelmet(app);
  app.disable('x-powered-by');
}

module.exports = { configureCoreMiddleware };
