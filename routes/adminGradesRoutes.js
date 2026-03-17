const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');

function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

function createAdminGradesRoutes({
  getClient,
  isAuthenticated,
  isAdmin,
  upload
}) {
  const router = express.Router();

  router.get('/api/admin/grades', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const {
        query = '',
        page = 1,
        limit = 10
      } = req.query;

      const parsedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
      const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50);
      const trimmedQuery = String(query || '').trim();
      const client = getClient();
      const database = client.db('myDatabase');
      const gradesCollection = database.collection('tblGrades');
      const usersCollection = database.collection('tblUser');

      let matchingStudentIds = [];
      if (trimmedQuery) {
        const matchingUsers = await usersCollection.find({
          $or: [
            { studentIDNumber: { $regex: trimmedQuery, $options: 'i' } },
            { firstName: { $regex: trimmedQuery, $options: 'i' } },
            { lastName: { $regex: trimmedQuery, $options: 'i' } },
            { emaildb: { $regex: trimmedQuery, $options: 'i' } }
          ]
        }, {
          projection: { studentIDNumber: 1 }
        }).toArray();

        matchingStudentIds = matchingUsers
          .map((user) => user.studentIDNumber)
          .filter(Boolean);
      }

      const gradeCriteria = trimmedQuery ? {
        $or: [
          { studentIDNumber: { $regex: trimmedQuery, $options: 'i' } },
          { CourseID: { $regex: trimmedQuery, $options: 'i' } },
          { CourseDescription: { $regex: trimmedQuery, $options: 'i' } },
          ...(matchingStudentIds.length > 0 ? [{ studentIDNumber: { $in: matchingStudentIds } }] : [])
        ]
      } : {};

      const total = await gradesCollection.countDocuments(gradeCriteria);
      const gradeRows = await gradesCollection.find(gradeCriteria)
        .sort({ studentIDNumber: 1, CourseID: 1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .toArray();

      if (gradeRows.length === 0) {
        return res.json({
          success: true,
          rows: [],
          pagination: {
            total: 0,
            page: parsedPage,
            pages: 0,
            limit: parsedLimit
          }
        });
      }

      const userMap = new Map();
      const uniqueStudentIds = [...new Set(gradeRows.map((row) => row.studentIDNumber).filter(Boolean))];
      const users = await usersCollection.find({
        studentIDNumber: { $in: uniqueStudentIds }
      }, {
        projection: { studentIDNumber: 1, firstName: 1, lastName: 1 }
      }).toArray();

      users.forEach((user) => {
        userMap.set(user.studentIDNumber, user);
      });

      const rows = gradeRows.map((grade) => {
        const user = userMap.get(grade.studentIDNumber) || {};
        return {
          studentIDNumber: grade.studentIDNumber || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          courseID: grade.CourseID || '',
          courseDescription: grade.CourseDescription || '',
          midtermGrade: grade.MG ?? grade.midtermGrade ?? '',
          finalGrade: grade.FG ?? grade.finalGrade ?? '',
          transmutedMidtermGrade: grade.TMG ?? '',
          transmutedFinalGrade: grade.MFG ?? '',
          totalFinalGrade: grade.TFG ?? '',
          createdAt: grade.createdAt || null
        };
      });

      return res.json({
        success: true,
        rows,
        pagination: {
          total,
          page: parsedPage,
          pages: Math.ceil(total / parsedLimit),
          limit: parsedLimit
        }
      });
    } catch (error) {
      console.error('Error fetching admin grades:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch grade records.' });
    }
  });

  router.post('/upload-grades', isAuthenticated, isAdmin, upload.single('gradesFile'), async (req, res) => {
    try {
      const gradesFile = req.file;
      if (!gradesFile) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const gradesData = await parseCSVFile(gradesFile.path);
      if (!Array.isArray(gradesData)) {
        fs.unlink(gradesFile.path, () => {});
        return res.status(500).json({ success: false, message: 'Parsing error: gradesData is not an array' });
      }

      const client = getClient();
      const gradesCollection = client.db('myDatabase').collection('tblGrades');

      for (const grade of gradesData) {
        const { studentIDNumber, CourseID, midtermGrade, finalGrade, ...otherFields } = grade;
        await gradesCollection.updateOne(
          { studentIDNumber, CourseID },
          { $set: { midtermGrade, finalGrade, ...otherFields } },
          { upsert: true }
        );
      }

      fs.unlink(gradesFile.path, () => {});
      return res.json({ success: true, message: 'Grades uploaded and stored successfully.' });
    } catch (error) {
      console.error('Error uploading grades:', error);
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(500).json({ success: false, message: 'An internal server error occurred while uploading grades.' });
    }
  });

  return router;
}

module.exports = createAdminGradesRoutes;
