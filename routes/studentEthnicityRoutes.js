const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

// If you want to store in MongoDB as well, you can pass the db client or collections into this router.
// For now, we’ll show just Google Sheets storing.

router.post('/submit', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      studentID,
      yearLevel,
      section,
      degree,
      nationality,
      ethnicity,
      primaryEthnicity
    } = req.body;

    // Basic validation
    if (!firstName || !lastName || !studentID) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, and studentID are required.'
      });
    }

    // Prepare Google Auth
    const serviceAccount = {
      type: process.env.GOOGLE_TYPE,
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: process.env.GOOGLE_AUTH_URI,
      token_uri: process.env.GOOGLE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN
    };

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Current date/time
    const now = new Date().toLocaleString(); // or store as ISO string

    // Build a row
    // Make sure the order of columns matches how you want them in your sheet
    const row = [
      now,
      firstName,
      lastName,
      studentID,
      yearLevel || '',
      section || '',
      degree || '',
      nationality || '',
      ethnicity || '',      // can be multiple selected checkboxes
      primaryEthnicity || '' 
    ];

    // Append to the Google Sheet
    // Use your .env for the ID => process.env.GOOGLE_SPREADSHEET_ID_SURVEYS
    // Example sheet name: "StudentEthnicity" (you must create a tab with that name).
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID_SURVEYS || '1PPTDh5s0uRZu0p4ov-jea9zEzwfjHMvlrZyblMRtdvw',
      range: 'StudentEthnicity',  // or whatever your tab name is
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [row]
      }
    });

    return res.json({ success: true, message: 'Survey submitted successfully!' });
  } catch (error) {
    console.error('Error in /api/student-ethnicity/submit:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your survey.'
    });
  }
});

module.exports = router;
