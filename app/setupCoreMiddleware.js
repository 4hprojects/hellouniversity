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
  app.use(express.static(path.join(rootDir, 'public')));
  app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
  });
  configureHelmet(app);
  app.disable('x-powered-by');
}

module.exports = { configureCoreMiddleware };
