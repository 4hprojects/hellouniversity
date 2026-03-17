const express = require('express');

module.exports = function assignmentsRoutes(
  { classQuizCollection, quizzesCollection, classesCollection, ObjectId },
  { isAuthenticated, isTeacherOrAdmin }
) {
  const router = express.Router();

  // POST /api/quizzes/assign
  router.post('/quizzes/assign', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const { quizId, classId, assignedStudents, startDate, dueDate } = req.body;
      if (!quizId || !classId) {
        return res.status(400).json({ success: false, message: 'quizId and classId are required.' });
      }

      const quizObjId = new ObjectId(quizId);
      const classObjId = new ObjectId(classId);

      const assignedByUserId = req.session.userId;
      const assignedByStudentID = req.session.studentIDNumber;
      const assignedByRole = req.session.role;

      const classDoc = await classesCollection.findOne({ _id: classObjId });
      if (!classDoc) {
        return res.status(404).json({ success: false, message: 'Class not found.' });
      }

      let validAssignedStudents = null;
      if (Array.isArray(assignedStudents) && assignedStudents.length > 0) {
        validAssignedStudents = assignedStudents.filter(sid => classDoc.students.includes(sid));
        if (validAssignedStudents.length === 0) {
          return res.status(400).json({ success: false, message: 'None of the specified students are in this class.' });
        }
      }

      const newAssignment = {
        quizId: quizObjId,
        classId: classObjId,
        assignedStudents: validAssignedStudents || [],
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedAt: new Date(),
        assignedBy: assignedByUserId,
        assignedByStudentID,
        assignedByRole
      };

      const result = await classQuizCollection.insertOne(newAssignment);
      if (result.acknowledged) {
        return res.status(201).json({ success: true, message: 'Quiz assigned successfully.', assignmentId: result.insertedId });
      }
      return res.status(500).json({ success: false, message: 'Failed to assign quiz.' });
    } catch (error) {
      console.error('Error assigning quiz:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  // GET /api/assignments/class/:classId
  router.get('/assignments/class/:classId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const { classId } = req.params;
      const classObjId = new ObjectId(classId);

      const assignments = await classQuizCollection.find({ classId: classObjId }).toArray();
      const quizIds = assignments.map(a => a.quizId);
      const uniqueQuizIds = [...new Set(quizIds.map(id => id.toString()))].map(str => new ObjectId(str));

      const quizzes = await quizzesCollection.find({ _id: { $in: uniqueQuizIds } }).toArray();
      const quizMap = new Map();
      quizzes.forEach(q => quizMap.set(q._id.toString(), q));

      const enrichedAssignments = assignments.map(asn => {
        const quizData = quizMap.get(asn.quizId.toString());
        return {
          assignmentId: asn._id,
          quizId: asn.quizId,
          classId: asn.classId,
          assignedStudents: asn.assignedStudents,
          startDate: asn.startDate,
          dueDate: asn.dueDate,
          assignedAt: asn.assignedAt,
          assignedBy: asn.assignedBy,
          assignedByStudentID: asn.assignedByStudentID,
          assignedByRole: asn.assignedByRole,
          quizTitle: quizData ? quizData.quizTitle : null,
          quizDescription: quizData ? quizData.description : null
        };
      });

      return res.json({ success: true, assignments: enrichedAssignments });
    } catch (error) {
      console.error('Error fetching class assignments:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  // GET /api/assignments/student
  router.get('/assignments/student', isAuthenticated, async (req, res) => {
    try {
      if (req.session.role !== 'student') {
        return res.status(403).json({ success: false, message: 'Forbidden. Only students can use this endpoint.' });
      }

      const studentIDNumber = req.session.studentIDNumber;
      const allAssignments = await classQuizCollection.find({}).toArray();
      const studentAssignments = [];

      for (let asn of allAssignments) {
        let isAssignedToStudent = false;

        if (Array.isArray(asn.assignedStudents) && asn.assignedStudents.length > 0) {
          if (asn.assignedStudents.includes(studentIDNumber)) isAssignedToStudent = true;
        } else {
          const classDoc = await classesCollection.findOne({ _id: asn.classId, students: studentIDNumber });
          if (classDoc) isAssignedToStudent = true;
        }

        if (isAssignedToStudent) {
          if (asn.startDate && asn.startDate > new Date()) continue;
          studentAssignments.push(asn);
        }
      }

      const quizIds = studentAssignments.map(a => a.quizId);
      const uniqueQuizIds = [...new Set(quizIds.map(id => id.toString()))].map(str => new ObjectId(str));
      const quizzes = await quizzesCollection.find({ _id: { $in: uniqueQuizIds } }).toArray();
      const quizMap = new Map();
      quizzes.forEach(q => quizMap.set(q._id.toString(), q));

      const enrichedAssignments = studentAssignments.map(asn => {
        const quizData = quizMap.get(asn.quizId.toString());
        return {
          assignmentId: asn._id,
          quizId: asn.quizId,
          startDate: asn.startDate,
          dueDate: asn.dueDate,
          quizTitle: quizData ? quizData.quizTitle : null,
          quizDescription: quizData ? quizData.description : null
        };
      });

      return res.json({ success: true, assignments: enrichedAssignments });
    } catch (error) {
      console.error('Error fetching student assignments:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  // DELETE /api/assignments/:assignmentId
  router.delete('/assignments/:assignmentId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      if (!ObjectId.isValid(assignmentId)) {
        return res.status(400).json({ success: false, message: 'Invalid assignmentId.' });
      }
      const assignmentObjId = new ObjectId(assignmentId);

      const deleteResult = await classQuizCollection.deleteOne({ _id: assignmentObjId });
      if (deleteResult.deletedCount === 1) {
        return res.json({ success: true, message: 'Assignment removed successfully.' });
      }
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    } catch (error) {
      console.error('Error removing assignment:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  // PUT /api/assignments/:assignmentId
  router.put('/assignments/:assignmentId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { startDate, dueDate, assignedStudents } = req.body;

      if (!ObjectId.isValid(assignmentId)) {
        return res.status(400).json({ success: false, message: 'Invalid assignmentId.' });
      }
      const assignmentObjId = new ObjectId(assignmentId);

      const updateFields = {};
      if (startDate !== undefined) updateFields.startDate = startDate ? new Date(startDate) : null;
      if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : null;
      if (Array.isArray(assignedStudents)) updateFields.assignedStudents = assignedStudents;

      const updateResult = await classQuizCollection.updateOne({ _id: assignmentObjId }, { $set: updateFields });
      if (updateResult.modifiedCount === 1) {
        return res.json({ success: true, message: 'Assignment updated successfully.' });
      } else if (updateResult.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Assignment not found.' });
      }
      return res.json({ success: true, message: 'No changes made to the assignment.' });
    } catch (error) {
      console.error('Error updating assignment:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}