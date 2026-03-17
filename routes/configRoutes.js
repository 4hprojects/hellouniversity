const express = require('express');

function createConfigRoutes() {
  const router = express.Router();

  router.get('/api/config', (req, res) => {
    return res.json({
      apiKey: process.env.GOOGLE_API_KEY,
      spreadsheetIdAtt: process.env.GOOGLE_SPREADSHEET_ID_ATTENDANCE,
      spreadsheetIdCSMST2025: process.env.GOOGLE_SPREADSHEET_ID_ATTENDANCE,
    });
  });

  router.get('/api/config/recaptcha', (_req, res) => {
    const disabled = String(process.env.DISABLE_CAPTCHA).toLowerCase() === 'true';
    const siteKey = (process.env.RECAPTCHA_SITE_KEY || '').trim();
    const hasSecret = Boolean((process.env.SECRET_KEY || '').trim());
    const enabled = !disabled && Boolean(siteKey) && hasSecret;

    return res.json({
      enabled,
      siteKey: enabled ? siteKey : null
    });
  });

  return router;
}

module.exports = createConfigRoutes;
