const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');

function createClassesRoutes(
  {
    getClassesCollection,
    getCountersCollection,
    getClassQuizCollection,
    ObjectId,
    upload
  },
  {
    isAuthenticated,
    isTeacherOrAdmin
  }
) {
  const router = express.Router();

  function getDeps(res) {
    const classesCollection = getClassesCollection();
    const countersCollection = getCountersCollection();
    const classQuizCollection = getClassQuizCollection();
    if (!classesCollection || !countersCollection || !classQuizCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }
    return { classesCollection, countersCollection, classQuizCollection };
  }

  function normalizeClassCode(value) {
    return String(value || '').trim().toUpperCase();
  }

  function normalizeClassStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['draft', 'active', 'archived'].includes(normalized)) {
      return normalized;
    }
    return 'active';
  }

  function extractCounterNextVal(result) {
    if (result && typeof result.nextVal !== 'undefined') {
      return Number(result.nextVal);
    }
    if (result && result.value && typeof result.value.nextVal !== 'undefined') {
      return Number(result.value.nextVal);
    }
    return 1;
  }

  function serializeStudentClass(classDoc) {
    return {
      id: classDoc?._id ? classDoc._id.toString() : '',
      classCode: classDoc?.classCode || '',
      className: classDoc?.className || 'Class name unavailable',
      instructorName: classDoc?.instructorName || 'Instructor unavailable',
      schedule: classDoc?.schedule || '',
      time: classDoc?.time || '',
      status: normalizeClassStatus(classDoc?.status),
      studentCount: Array.isArray(classDoc?.students) ? classDoc.students.length : 0
    };
  }

  router.get('/classes', isAuthenticated, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;
    const { classesCollection } = deps;

    try {
      if (req.query.studentEnrolled === 'true' && req.session.role === 'student') {
        const studentIDNumber = req.session.studentIDNumber;
        const classes = await classesCollection.find({
          students: { $in: [studentIDNumber] }
        }).toArray();
        return res.json({ success: true, classes });
      }

      if (req.session.role === 'teacher') {
        const teacherClasses = await classesCollection
          .find({ instructorId: new ObjectId(req.session.userId) })
          .toArray();
        return res.json({ success: true, classes: teacherClasses });
      }
      if (req.session.role === 'admin') {
        const allClasses = await classesCollection.find({}).toArray();
        return res.json({ success: true, classes: allClasses });
      }
      return res.status(403).json({ success: false, message: 'Forbidden' });
    } catch (error) {
      console.error('Error fetching classes:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Kept for compatibility; removes one student from class.
  router.put('/classes/:classId/enroll', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;
    const { classesCollection } = deps;

    try {
      const classId = req.params.classId;
      const studentIDNumber = req.body.studentIDNumber;
      if (!studentIDNumber) {
        return res.status(400).json({ success: false, message: 'studentIDNumber is required.' });
      }

      const result = await classesCollection.updateOne(
        { _id: new ObjectId(classId) },
        { $pull: { students: studentIDNumber } }
      );
      if (result.modifiedCount === 0) {
        return res.status(404).json({ success: false, message: 'Class not found or student not in class.' });
      }
      return res.json({ success: true, message: 'Student removed from class.' });
    } catch (err) {
      console.error('Error enrolling students:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/classes/generate-code', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;
    const { classesCollection, countersCollection } = deps;

    try {
      const MAX_TRIES = 1000;
      let tries = 0;
      while (true) {
        tries++;
        if (tries > MAX_TRIES) {
          return res.status(500).json({
            success: false,
            message: 'Could not generate a unique code after many attempts.'
          });
        }

        const result = await countersCollection.findOneAndUpdate(
          { _id: 'classCode' },
          { $inc: { nextVal: 1 } },
          { returnDocument: 'after', upsert: true }
        );

        const nextVal = extractCounterNextVal(result);
        const padded = Number(nextVal).toString(16).toUpperCase().padStart(6, '0');
        const candidateCode = `C${padded}`;
        const existing = await classesCollection.findOne({ classCode: candidateCode });
        if (!existing) {
          return res.json({ success: true, classCode: candidateCode });
        }
      }
    } catch (err) {
      console.error('Error generating class code:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  router.post('/classes', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;
    const { classesCollection } = deps;

    try {
      const {
        classCode,
        className,
        schedule,
        time,
        instructorIDNumber,
        instructorName,
        students
      } = req.body;

      if (!classCode || !className) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
      }

      const createdBy = new ObjectId(req.session.userId);
      const newClass = {
        classCode,
        className,
        instructorIDNumber,
        instructorName,
        instructorId: createdBy,
        createdBy,
        schedule: schedule || '',
        time: time || '',
        students: Array.isArray(students) ? [...new Set(students)] : [],
        createdAt: new Date()
      };

      const result = await classesCollection.insertOne(newClass);
      if (!result.acknowledged) {
        return res.status(500).json({ success: false, message: 'Failed to create class.' });
      }
      return res.json({ success: true, classId: result.insertedId });
    } catch (err) {
      console.error('Error creating class:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post(
    '/classes/upload-temp-students',
    isAuthenticated,
    isTeacherOrAdmin,
    upload.single('studentFile'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        const filePath = req.file.path;
        const studentIDs = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            if (row.studentIDNumber) {
              studentIDs.push(row.studentIDNumber.trim());
            }
          })
          .on('end', () => {
            fs.unlink(filePath, () => {});
            return res.json({ success: true, studentIDs });
          })
          .on('error', (err) => {
            fs.unlink(filePath, () => {});
            console.error('Error parsing CSV:', err);
            return res.status(500).json({ success: false, message: 'Error parsing CSV file.' });
          });
      } catch (err) {
        console.error('Error uploading student file:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
      }
    }
  );

  router.get('/class-quiz/:classId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;
    const { classQuizCollection } = deps;

    try {
      const classId = req.params.classId;
      const pivotDocs = await classQuizCollection.find({ classId: new ObjectId(classId) }).toArray();
      const quizIds = pivotDocs.map((doc) => doc.quizId.toString());
      return res.json({ success: true, quizIds });
    } catch (error) {
      console.error('Error getting pivot docs:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  router.post('/class-quiz', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;
    const { classQuizCollection } = deps;

    try {
      const { classId, quizIds, action } = req.body;
      if (!classId || !Array.isArray(quizIds)) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
      }

      if (action === 'assign') {
        const bulkOps = quizIds.map((qid) => ({
          updateOne: {
            filter: { classId: new ObjectId(classId), quizId: new ObjectId(qid) },
            update: {
              $setOnInsert: {
                assignedAt: new Date(),
                assignedBy: new ObjectId(req.session.userId)
              }
            },
            upsert: true
          }
        }));
        await classQuizCollection.bulkWrite(bulkOps);
        return res.json({ success: true, message: 'Assigned quizzes to class.' });
      }

      if (action === 'remove') {
        const bulkOps = quizIds.map((qid) => ({
          deleteOne: {
            filter: { classId: new ObjectId(classId), quizId: new ObjectId(qid) }
          }
        }));
        await classQuizCollection.bulkWrite(bulkOps);
        return res.json({ success: true, message: 'Removed quizzes from class.' });
      }

      return res.status(400).json({ success: false, message: 'Invalid action.' });
    } catch (error) {
      console.error('Error updating class-quiz pivot:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  router.put('/classes/:classId/students', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;
    const { classesCollection } = deps;

    try {
      const classId = req.params.classId;
      const { studentIDs, action } = req.body;
      if (!Array.isArray(studentIDs)) {
        return res.status(400).json({ success: false, message: 'studentIDs must be an array.' });
      }

      if (action === 'add') {
        await classesCollection.updateOne(
          { _id: new ObjectId(classId) },
          { $addToSet: { students: { $each: studentIDs } } }
        );
        return res.json({ success: true, message: 'Students added to class.' });
      }

      if (action === 'remove') {
        await classesCollection.updateOne(
          { _id: new ObjectId(classId) },
          { $pull: { students: { $in: studentIDs } } }
        );
        return res.json({ success: true, message: 'Students removed from class.' });
      }

      return res.status(400).json({ success: false, message: 'Invalid action.' });
    } catch (error) {
      console.error('Error updating students for class:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  router.post('/classes/join', isAuthenticated, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;
    const { classesCollection } = deps;

    try {
      if (req.session.role !== 'student') {
        return res.status(403).json({ success: false, message: 'Forbidden. Only students can join classes.' });
      }

      const normalizedClassCode = normalizeClassCode(req.body?.classCode);
      if (!normalizedClassCode) {
        return res.status(400).json({ success: false, message: 'No classCode provided.' });
      }

      const cls = await classesCollection.findOne({ classCode: normalizedClassCode });
      if (!cls) {
        return res.status(404).json({ success: false, message: 'Class not found or invalid code.' });
      }

      if (normalizeClassStatus(cls.status) === 'archived') {
        return res.status(409).json({
          success: false,
          message: 'This class is archived and cannot accept new students.'
        });
      }

      const studentIDNumber = req.session.studentIDNumber;
      if (!studentIDNumber) {
        return res.status(400).json({ success: false, message: 'Student ID not found in session.' });
      }

      const alreadyJoined = Array.isArray(cls.students) && cls.students.includes(studentIDNumber);

      if (alreadyJoined) {
        return res.json({
          success: true,
          alreadyJoined: true,
          classItem: serializeStudentClass(cls),
          message: `You are already enrolled in ${cls.className || normalizedClassCode}.`
        });
      }

      await classesCollection.updateOne(
        { _id: cls._id },
        { $addToSet: { students: studentIDNumber } }
      );

      return res.json({
        success: true,
        alreadyJoined: false,
        classItem: serializeStudentClass({
          ...cls,
          students: [...new Set([...(Array.isArray(cls.students) ? cls.students : []), studentIDNumber])]
        }),
        message: `Joined class ${normalizedClassCode} successfully!`
      });
    } catch (err) {
      console.error('Error joining class:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}

module.exports = createClassesRoutes;
