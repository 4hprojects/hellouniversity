const express = require('express');
const { formatInTimeZone } = require('date-fns-tz');

function mapCourseRow(row = {}) {
  return {
    courseID: row.courseID || row.CourseID || '',
    courseDescription: row.courseDescription || row.CourseDescription || ''
  };
}

function createStudentAcademicRoutes({ client, isAuthenticated }) {
  const router = express.Router();

  function redirectLegacyClassRecords(req, res) {
    if (!req.session || !req.session.userId) {
      return res.redirect('/login');
    }

    return res.redirect('/grades');
  }

  router.get('/classrecords.html', redirectLegacyClassRecords);
  router.get('/classrecords', redirectLegacyClassRecords);

  router.get('/get-grades/:studentIDNumber', isAuthenticated, async (req, res) => {
    const studentIDNumber = req.params.studentIDNumber;

    try {
      const grades = await client.db('myDatabase').collection('tblGrades')
        .find({ studentIDNumber })
        .toArray();

      if (grades.length === 0) {
        return res.status(404).json({ success: false, message: 'No grades found for this student ID.' });
      }

      const gradeDataArray = grades.map((grade) => {
        let createdAt = null;
        if (grade.createdAt) {
          try {
            createdAt = formatInTimeZone(grade.createdAt, 'Asia/Manila', 'yyyy-MM-dd HH:mm:ssXXX');
          } catch {
            createdAt = new Date(grade.createdAt).toISOString();
          }
        }

        return {
          midtermAttendance: grade.MA || 'N/A',
          finalsAttendance: grade.FA || 'N/A',
          midtermClassStanding: grade.MCS || 'N/A',
          finalsClassStanding: grade.FCS || 'N/A',
          midtermExam: grade.ME || 'N/A',
          finalExam: grade.FE || 'N/A',
          midtermGrade: grade.MG || 'N/A',
          finalGrade: grade.FG || 'N/A',
          transmutedMidtermGrade: grade.TMG || 'N/A',
          transmutedFinalGrade: grade.MFG || 'N/A',
          totalFinalGrade: grade.TFG || 'N/A',
          courseID: grade.CourseID || 'N/A',
          courseDescription: grade.CourseDescription || 'N/A',
          createdAt
        };
      });

      return res.json({ success: true, gradeDataArray });
    } catch (error) {
      console.error('Error fetching grades:', error);
      return res.status(500).json({ success: false, message: 'An error occurred while fetching grades.' });
    }
  });

  router.get('/get-courses/:studentIDNumber', isAuthenticated, async (req, res) => {
    const studentIDNumber = req.params.studentIDNumber;

    try {
      const coursesFromGrades = await client.db('myDatabase').collection('tblGrades')
        .find({ studentIDNumber })
        .project({ CourseID: 1, CourseDescription: 1, courseID: 1, courseDescription: 1 })
        .toArray();

      const coursesFromAttendance = await client.db('myDatabase').collection('tblAttendance')
        .find({ studentIDNumber })
        .project({ courseID: 1, courseDescription: 1, CourseID: 1, CourseDescription: 1 })
        .toArray();

      const courseMap = new Map();
      const uniqueCourses = [];

      [...coursesFromGrades, ...coursesFromAttendance]
        .map((course) => mapCourseRow(course))
        .forEach((course) => {
          if (!course.courseID || courseMap.has(course.courseID)) {
            return;
          }

          courseMap.set(course.courseID, true);
          uniqueCourses.push(course);
        });

      if (uniqueCourses.length === 0) {
        return res.status(404).json({ success: false, message: 'No courses found for this student ID.' });
      }

      return res.json({
        success: true,
        courseDataArray: uniqueCourses
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ success: false, message: 'An error occurred while fetching courses.' });
    }
  });

  return router;
}

module.exports = createStudentAcademicRoutes;
