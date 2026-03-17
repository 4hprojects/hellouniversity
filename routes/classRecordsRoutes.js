const express = require('express');
const router = express.Router();
const { fetchClassSectionFromMasterList, fetchClassRecordFromSheet } = require('../utils/googleSheetsUtils');

// GET /api/getClassRecordFromSheet
router.get('/getClassRecordFromSheet', async (req, res) => {
  try {
    const { studentID, sheetName } = req.query;

    if (!studentID || !sheetName) {
      return res.status(400).json({ success: false, message: 'Missing studentID or sheetName parameter.' });
    }

    const record = await fetchClassRecordFromSheet(studentID, sheetName);
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error(`Error in /api/getClassRecordFromSheet: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/getClassRecordFromMasterList
router.get('/getClassRecordFromMasterList', async (req, res) => {
  const { studentID } = req.query;
  if (!studentID) {
    return res.status(400).json({ success: false, message: 'Student ID is required.' });
  }

  try {
    const classSection = await fetchClassSectionFromMasterList(studentID);
    res.json({ success: true, data: { ClassSection: classSection } });
  } catch (error) {
    console.error('Error fetching ClassSection:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
  }
});

module.exports = router;