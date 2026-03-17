/**
 * googleSheetsUtils.js
 *
 * This module provides utility functions to:
 * 1) Fetch student details from a MasterList sheet.
 * 2) Fetch specific class record data from either MST24-MidCS (midterm)
 *    or MST24-FinCS (final).
 */

const { google } = require('googleapis');

/**
 * Creates an authenticated Google Sheets client using the API key.
 * Make sure you’ve set your environment variable:
 *   GOOGLE_API_KEY = '...some key...'
 */
function getSheetsClient() {
  return google.sheets({
    version: 'v4',
    auth: process.env.GOOGLE_API_KEY,  // Using API key authentication
  });
}

/**
 * Fetch student details (e.g., Name, ClassSection) from the MasterList sheet.
 * 
 * @param {string} studentID
 * @returns {Promise<{ fullName: string, classSection: string, studentID: string }>}
 */
async function fetchStudentDetailsFromMasterList(studentID) {
  try {
    const sheets = getSheetsClient();

    // Check for "MasterList" in your spreadsheet
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID_ATTENDANCE;
    const sheetList = await sheets.spreadsheets.get({ spreadsheetId });
    const availableSheets = sheetList.data.sheets.map(s => s.properties.title);

    if (!availableSheets.includes('MasterList')) {
      throw new Error('MasterList sheet is missing in the spreadsheet.');
    }

    // Fetch the entire MasterList
    const range = 'MasterList!A:Z'; // Adjust as needed
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('MasterList sheet is empty.');
    }

    // Identify columns
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Example columns: "Student ID", "Name", "ClassSection"
    // Modify these as needed if your sheet differs
    const studentIDIdx = headers.indexOf('Student ID');
    const nameIdx = headers.indexOf('Name');
    const classSectionIdx = headers.indexOf('ClassSection');

    if (studentIDIdx === -1 || nameIdx === -1 || classSectionIdx === -1) {
      throw new Error('Missing required columns in MasterList (Student ID, Name, ClassSection).');
    }

    // Find the row matching the requested studentID
    const studentRow = dataRows.find(row => row[studentIDIdx] === studentID);
    if (!studentRow) {
      throw new Error(`No records found in MasterList for studentID: ${studentID}`);
    }

    const fullName = studentRow[nameIdx] || 'Unknown';
    const classSection = studentRow[classSectionIdx] || 'Unknown';

    return { 
      fullName, 
      classSection, 
      studentID 
    };
  } catch (error) {
    console.error('Error in fetchStudentDetailsFromMasterList:', error.message);
    throw error;
  }
}

/**
 * Generic function to fetch a single row from a given sheet (MST24-MidCS or MST24-FinCS)
 * based on the studentID. Then returns the data in the shape expected by the front-end.
 *
 * @param {string} studentID  - The student's ID number.
 * @param {string} sheetName  - Either "MST24-MidCS" or "MST24-FinCS".
 * @returns {Promise<Object>} - An object matching the front-end expectation.
 */
async function fetchClassRecordFromSheet(studentID, sheetName) {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID_ATTENDANCE;

    // Ensure the requested sheet actually exists
    const sheetList = await sheets.spreadsheets.get({ spreadsheetId });
    const availableSheets = sheetList.data.sheets.map(s => s.properties.title);
    if (!availableSheets.includes(sheetName)) {
      throw new Error(`Sheet "${sheetName}" does not exist in the spreadsheet.`);
    }

    // Grab all data from the requested sheet
    const range = `${sheetName}!A:Z`; // Adjust columns range if needed
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error(`Sheet "${sheetName}" is empty.`);
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Make sure there is a column for ID Number
    const idNumberIndex = headers.indexOf('ID Number');
    if (idNumberIndex === -1) {
      throw new Error(`Missing "ID Number" column in "${sheetName}".`);
    }

    // Find the row for this student
    const studentRow = dataRows.find(row => row[idNumberIndex] === studentID);
    if (!studentRow) {
      throw new Error(`No records found in sheet ${sheetName} for studentID: ${studentID}`);
    }

    // We will return different shapes based on the sheetName:
    if (sheetName === 'MST24-MidCS') {
      // Extract midterm-related fields from columns
      // Adjust column references to match your actual sheet’s column headers
      const record = {
        // Overall
        totalScore:           getCellValue(studentRow, headers, 'TLec')   || '--',
        totalScoreWithBonus:  getCellValue(studentRow, headers, 'bonus') || '--',
        percentage:           getCellValue(studentRow, headers, 'TCS')   || '--',
        // Lessons 1-12
        lessonScores: {},
        // Bonus
        bonusScores: {
          preclassSurvey: getCellValue(studentRow, headers, 'PreclassSurvey') || '--',
          activity1:      getCellValue(studentRow, headers, 'Kt1')           || '--',
          activity2:      getCellValue(studentRow, headers, 'Kt2')           || '--',
        },
        // Midterm exam
        midtermScores: {
          exam:          getCellValue(studentRow, headers, 'MidExam')   || '--',
          examWithBonus: getCellValue(studentRow, headers, 'MidExamw')  || '--',
          total:         getCellValue(studentRow, headers, 'FTotal')    || '--',
        },
      };

      // Populate lessonScores for 1-12
      for (let i = 1; i <= 12; i++) {
        const lessonKey = i.toString(); // e.g. '1', '2', ...
        record.lessonScores[`lesson${i}`] = getCellValue(studentRow, headers, lessonKey) || '--';
      }

      return record; // Return the midterm shape

    } else if (sheetName === 'MST24-FinCS') {
      // Extract final-related fields from columns
      // Adjust to match your final sheet’s columns
      const lesson13Scores = {};
      for (let i = 1; i <= 9; i++) {
        const colHeader = `13.${i}`; // e.g. '13.1', '13.2', ...
        lesson13Scores[colHeader] = getCellValue(studentRow, headers, colHeader) || '--';
      }

      const record = {
        lesson13Scores,
        kt1:   getCellValue(studentRow, headers, 'Kt1')   || '--',
        bonus: getCellValue(studentRow, headers, 'Bonus') || '--',
        finalExam: {
          raw:       getCellValue(studentRow, headers, 'FinExm')       || '--',
          withBonus: getCellValue(studentRow, headers, 'FinExamw')      || '--',
          total:     getCellValue(studentRow, headers, 'FinalTotal')      || '--',
        },
      };

      return record; // Return the final shape
    } else {
      // If there's some other sheet, handle accordingly or throw:
      throw new Error(`Sheet name "${sheetName}" not recognized by fetchClassRecordFromSheet().`);
    }

  } catch (error) {
    console.error('Error in fetchClassRecordFromSheet:', error.message);
    throw error;
  }
}

/**
 * Helper function: safely get a cell's value by header name.
 * Returns null if the header is not found in the sheet.
 *
 * @param {Array<string>} rowData    - The row array from your Google Sheets data
 * @param {Array<string>} headers    - The header array
 * @param {string} columnHeaderName  - The column to look up
 * @returns {string|null}            - The cell value or null if not found
 */
function getCellValue(rowData, headers, columnHeaderName) {
  const index = headers.indexOf(columnHeaderName);
  if (index === -1) {
    return null;
  }
  return rowData[index] || null;
}

// Export the utility functions
module.exports = {
  fetchStudentDetailsFromMasterList,
  fetchClassRecordFromSheet,
};
