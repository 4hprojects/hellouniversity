const express = require('express');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createSearchRoutes({ client }) {
  const router = express.Router();

  // Legacy student + grade lookup kept as an explicit API path.
  router.get('/api/search-records', async (req, res) => {
    try {
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({ success: false, message: 'Search query is required.' });
      }

      let userCriteria = {};
      let gradeCriteria = {};

      if (query === '*') {
        userCriteria = {};
        gradeCriteria = {};
      } else {
        const safeQuery = escapeRegex(query);

        userCriteria = {
          $or: [
            { studentIDNumber: { $regex: safeQuery, $options: 'i' } },
            { emaildb: { $regex: safeQuery, $options: 'i' } },
            { firstName: { $regex: safeQuery, $options: 'i' } },
            { lastName: { $regex: safeQuery, $options: 'i' } }
          ]
        };

        gradeCriteria = {
          $or: [
            { studentIDNumber: { $regex: safeQuery, $options: 'i' } },
            { CourseID: { $regex: safeQuery, $options: 'i' } },
            { CourseDescription: { $regex: safeQuery, $options: 'i' } }
          ]
        };
      }

      const users = await client.db('myDatabase').collection('tblUser').find(userCriteria).toArray();
      const grades = await client.db('myDatabase').collection('tblGrades').find(gradeCriteria).toArray();

      const results = users.map((user) => {
        const userGrades = grades.filter((g) => g.studentIDNumber === user.studentIDNumber);
        return userGrades.length > 0 ? userGrades.map((grade) => ({
          studentIDNumber: user.studentIDNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          CourseID: grade.CourseID || 'N/A',
          CourseDescription: grade.CourseDescription || 'N/A',
          MG: grade.MG || 'N/A',
          FG: grade.FG || 'N/A'
        })) : [{
          studentIDNumber: user.studentIDNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          CourseID: 'N/A',
          CourseDescription: 'N/A',
          MG: 'N/A',
          FG: 'N/A'
        }];
      }).flat();

      if (results.length === 0) {
        return res.json({ success: false, message: 'No matching records found.' });
      }

      return res.json({ success: true, results });
    } catch (error) {
      console.error('Error performing search:', error);
      return res.status(500).json({ success: false, message: 'An error occurred while searching.' });
    }
  });

  return router;
}

module.exports = createSearchRoutes;
