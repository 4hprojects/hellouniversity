const express = require('express');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatAttendanceDateFilter(value) {
  if (!value) return '';

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value).trim();

  const [, year, month, day] = match;
  const monthIndex = Number.parseInt(month, 10) - 1;
  const monthName = MONTHS[monthIndex];

  if (!monthName) {
    return String(value).trim();
  }

  return `${monthName}-${day}-${year}`;
}

function parseAttendanceDateTime(attDate, attTime) {
  const dateText = String(attDate || '').trim();
  const timeText = String(attTime || '').trim();

  const match = dateText.match(/^([A-Za-z]{3})-(\d{2})-(\d{4})$/);
  if (!match) {
    return 0;
  }

  const [, monthName, day, year] = match;
  const monthIndex = MONTHS.findIndex((month) => month.toLowerCase() === monthName.toLowerCase());
  if (monthIndex < 0) {
    return 0;
  }

  const isoDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day}`;
  const candidate = timeText ? `${isoDate}T${timeText}` : `${isoDate}T00:00:00`;
  const timestamp = Date.parse(candidate);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function createAdminAttendanceRoutes({
  getClient,
  isAuthenticated,
  isAdmin
}) {
  const router = express.Router();

  router.get('/api/admin/attendance/courses', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const client = getClient();
      const database = client.db('myDatabase');
      const attendanceCollection = database.collection('tblAttendance');

      const courses = await attendanceCollection.aggregate([
        {
          $match: {
            courseID: { $exists: true, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$courseID',
            courseDescription: { $first: '$courseDescription' }
          }
        },
        {
          $project: {
            _id: 0,
            courseID: '$_id',
            courseDescription: { $ifNull: ['$courseDescription', ''] }
          }
        },
        {
          $sort: { courseID: 1 }
        }
      ]).toArray();

      return res.json({ success: true, courses });
    } catch (error) {
      console.error('Error fetching admin attendance courses:', error);
      return res.status(500).json({ success: false, message: 'Failed to load attendance courses.' });
    }
  });

  router.get('/api/admin/attendance', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const {
        query = '',
        courseID = '',
        date = '',
        term = '',
        status = '',
        limit = 100
      } = req.query;

      const trimmedQuery = String(query || '').trim();
      const trimmedCourseId = String(courseID || '').trim();
      const trimmedDate = formatAttendanceDateFilter(String(date || '').trim());
      const trimmedTerm = String(term || '').trim();
      const trimmedStatus = String(status || '').trim();
      const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 200);

      const client = getClient();
      const database = client.db('myDatabase');
      const attendanceCollection = database.collection('tblAttendance');
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

      const criteria = {};
      const andClauses = [];

      if (trimmedQuery) {
        andClauses.push({
          $or: [
            { studentIDNumber: { $regex: trimmedQuery, $options: 'i' } },
            { courseID: { $regex: trimmedQuery, $options: 'i' } },
            { courseDescription: { $regex: trimmedQuery, $options: 'i' } },
            { attStatus: { $regex: trimmedQuery, $options: 'i' } },
            { attRemarks: { $regex: trimmedQuery, $options: 'i' } },
            { term: { $regex: trimmedQuery, $options: 'i' } },
            ...(matchingStudentIds.length > 0 ? [{ studentIDNumber: { $in: matchingStudentIds } }] : [])
          ]
        });
      }

      if (trimmedCourseId) {
        andClauses.push({ courseID: { $regex: trimmedCourseId, $options: 'i' } });
      }

      if (trimmedDate) {
        andClauses.push({ attDate: trimmedDate });
      }

      if (trimmedTerm) {
        andClauses.push({ term: trimmedTerm });
      }

      if (trimmedStatus) {
        andClauses.push({ attStatus: trimmedStatus });
      }

      if (andClauses.length === 1) {
        Object.assign(criteria, andClauses[0]);
      } else if (andClauses.length > 1) {
        criteria.$and = andClauses;
      }

      const attendanceRows = await attendanceCollection.find(criteria).toArray();
      const total = attendanceRows.length;

      const uniqueStudentIds = [...new Set(attendanceRows.map((row) => row.studentIDNumber).filter(Boolean))];
      const users = uniqueStudentIds.length > 0
        ? await usersCollection.find({
            studentIDNumber: { $in: uniqueStudentIds }
          }, {
            projection: { studentIDNumber: 1, firstName: 1, lastName: 1 }
          }).toArray()
        : [];

      const userMap = new Map();
      users.forEach((user) => {
        userMap.set(user.studentIDNumber, user);
      });

      const rows = attendanceRows
        .map((row) => {
          const user = userMap.get(row.studentIDNumber) || {};
          return {
            studentIDNumber: row.studentIDNumber || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            courseID: row.courseID || '',
            courseDescription: row.courseDescription || '',
            attDate: row.attDate || '',
            attTime: row.attTime || '',
            attRemarks: row.attRemarks || '',
            attStatus: row.attStatus || '',
            term: row.term || '',
            _sortTimestamp: parseAttendanceDateTime(row.attDate, row.attTime)
          };
        })
        .sort((a, b) => {
          if (b._sortTimestamp !== a._sortTimestamp) {
            return b._sortTimestamp - a._sortTimestamp;
          }
          return String(a.studentIDNumber || '').localeCompare(String(b.studentIDNumber || ''));
        })
        .slice(0, parsedLimit)
        .map(({ _sortTimestamp, ...row }) => row);

      return res.json({
        success: true,
        rows,
        pagination: {
          total,
          limit: parsedLimit
        }
      });
    } catch (error) {
      console.error('Error fetching admin attendance:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch attendance records.' });
    }
  });

  return router;
}

module.exports = createAdminAttendanceRoutes;
