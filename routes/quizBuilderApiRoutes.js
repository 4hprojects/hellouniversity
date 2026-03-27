const express = require('express');

const { normalizePersistedQuizStructure, sanitizeText } = require('../utils/quizSections');
const {
  normalizeStatus,
  normalizeQuizType,
  normalizeEditableStatus,
  formatActorName,
  writeLog,
  mapQuizInput,
  toLegacyQuestions,
  validateQuizPayload,
  projectQuizSummary,
  sanitizeSettings
} = require('../utils/quizBuilderHelpers');

function createQuizBuilderApiRoutes({
  getQuizzesCollection,
  getAttemptsCollection,
  getLogsCollection,
  getClassQuizCollection,
  getClassesCollection,
  getUsersCollection,
  ObjectId,
  isAuthenticated,
  isTeacherOrAdmin
}) {
  const router = express.Router();

  function depsOr503(res) {
    const quizzesCollection = getQuizzesCollection();
    const attemptsCollection = getAttemptsCollection();
    const logsCollection = getLogsCollection();
    const classQuizCollection = typeof getClassQuizCollection === 'function' ? getClassQuizCollection() : null;
    const classesCollection = typeof getClassesCollection === 'function' ? getClassesCollection() : null;
    const usersCollection = typeof getUsersCollection === 'function' ? getUsersCollection() : null;

    if (!quizzesCollection || !attemptsCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }

    return {
      quizzesCollection,
      attemptsCollection,
      logsCollection,
      classQuizCollection,
      classesCollection,
      usersCollection
    };
  }

  function normalizeStudentIds(rawValue) {
    const values = Array.isArray(rawValue)
      ? rawValue
      : String(rawValue || '')
        .split(',')
        .map((value) => value.trim());

    return [...new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )];
  }

  function isAdminSession(req) {
    return req.session?.role === 'admin';
  }

  function getLinkedClassFilter(req, classId) {
    const filter = { _id: new ObjectId(classId) };
    if (isAdminSession(req)) {
      return filter;
    }

    const teacherId = new ObjectId(req.session.userId);
    return {
      ...filter,
      $or: [
        { instructorId: teacherId },
        {
          teachingTeam: {
            $elemMatch: {
              userId: teacherId,
              status: 'active'
            }
          }
        }
      ]
    };
  }

  async function loadOwnedQuiz(req, res, quizzesCollection, quizId) {
    if (!ObjectId.isValid(quizId)) {
      res.status(400).json({ success: false, message: 'Invalid quiz id.' });
      return null;
    }

    const filter = { _id: new ObjectId(quizId) };
    if (req.session.role !== 'admin') {
      filter.ownerUserId = new ObjectId(req.session.userId);
    }

    const quiz = await quizzesCollection.findOne(filter);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found.' });
      return null;
    }

    return quiz;
  }

  async function syncQuizClassAssignment({ req, quizDoc, classQuizCollection, classesCollection }) {
    if (!classQuizCollection || !classesCollection) {
      throw new Error('Quiz assignments are unavailable right now.');
    }

    if (!quizDoc.classId) {
      await classQuizCollection.deleteMany({ quizId: quizDoc._id });
      return;
    }

    if (!ObjectId.isValid(quizDoc.classId)) {
      throw new Error('Linked class is invalid.');
    }

    const classDoc = await classesCollection.findOne(getLinkedClassFilter(req, quizDoc.classId));
    if (!classDoc) {
      throw new Error('Linked class not found.');
    }

    const now = new Date();
    await classQuizCollection.deleteMany({
      quizId: quizDoc._id,
      classId: { $ne: classDoc._id }
    });

    const existingAssignment = await classQuizCollection.findOne({ quizId: quizDoc._id, classId: classDoc._id });
    const assignedStudents = Array.isArray(existingAssignment?.assignedStudents)
      ? existingAssignment.assignedStudents.filter((studentId) => classDoc.students.includes(studentId))
      : [];

    await classQuizCollection.updateOne(
      { quizId: quizDoc._id, classId: classDoc._id },
      {
        $set: {
          assignedStudents,
          startDate: quizDoc.settings?.startAt || null,
          dueDate: quizDoc.settings?.endAt || null,
          assignedBy: req.session.userId || null,
          assignedByStudentID: req.session.studentIDNumber || null,
          assignedByRole: req.session.role || null,
          updatedAt: now
        },
        $setOnInsert: {
          assignedAt: now
        }
      },
      { upsert: true }
    );
  }

  router.get('/health', isAuthenticated, isTeacherOrAdmin, (req, res) => {
    return res.json({
      success: true,
      message: 'Quiz builder routes are mounted.',
      actorRole: req.session?.role || null
    });
  });

  router.get('/quizzes', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection } = deps;

    try {
      const query = String(req.query.query || '').trim();
      const status = normalizeStatus(req.query.status || '');
      const hasStatusFilter = Boolean(req.query.status);
      const classId = String(req.query.classId || '').trim();

      const filter = {};
      if (req.session.role !== 'admin') {
        filter.ownerUserId = new ObjectId(req.session.userId);
      }
      if (hasStatusFilter) {
        filter.status = status;
      }
      if (classId) {
        filter.classId = classId;
      }
      if (query) {
        filter.$or = [
          { title: { $regex: query, $options: 'i' } },
          { quizTitle: { $regex: query, $options: 'i' } },
          { subject: { $regex: query, $options: 'i' } },
          { classLabel: { $regex: query, $options: 'i' } }
        ];
      }

      const quizzes = await quizzesCollection.find(filter).sort({ updatedAt: -1, createdAt: -1 }).toArray();
      return res.json({ success: true, quizzes: quizzes.map(projectQuizSummary) });
    } catch (error) {
      console.error('Error loading quiz builder dashboard:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const payload = mapQuizInput(req.body);
      const validationError = validateQuizPayload(payload);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const now = new Date();
      const quizDoc = {
        title: payload.title,
        quizTitle: payload.title,
        description: payload.description,
        subject: payload.subject,
        classId: payload.classId,
        classLabel: payload.classLabel,
        type: payload.type,
        status: payload.status,
        settings: payload.settings,
        sections: payload.sections,
        questions: payload.questions,
        legacyQuestions: toLegacyQuestions(payload.questions),
        questionCount: payload.questionCount,
        totalPoints: payload.totalPoints,
        responseCount: 0,
        ownerUserId: new ObjectId(req.session.userId),
        ownerStudentIDNumber: req.session.studentIDNumber || null,
        ownerName: formatActorName(req),
        createdBy: new ObjectId(req.session.userId),
        isActive: payload.status === 'published',
        createdAt: now,
        updatedAt: now,
        publishedAt: payload.status === 'published' ? now : null,
        closedAt: payload.status === 'closed' ? now : null,
        archivedAt: payload.status === 'archived' ? now : null
      };

      const result = await quizzesCollection.insertOne(quizDoc);
      quizDoc._id = result.insertedId;
      await writeLog(logsCollection, req, 'QUIZ_CREATED', quizDoc, `Created quiz ${quizDoc.title}`);

      return res.status(201).json({
        success: true,
        quizId: result.insertedId,
        message: 'Quiz created successfully.'
      });
    } catch (error) {
      console.error('Error creating quiz builder quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes/:quizId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    try {
      const quiz = await loadOwnedQuiz(req, res, deps.quizzesCollection, req.params.quizId);
      if (!quiz) return;

      return res.json({
        success: true,
        quiz: {
          ...quiz,
          ...normalizePersistedQuizStructure(quiz),
          title: quiz.title || quiz.quizTitle || '',
          status: quiz.status || 'draft'
        }
      });
    } catch (error) {
      console.error('Error loading quiz builder quiz detail:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes/:quizId/assignment-targets', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const {
      quizzesCollection,
      classQuizCollection,
      classesCollection,
      usersCollection
    } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      if (!classQuizCollection || !classesCollection) {
        return res.status(503).json({ success: false, message: 'Quiz assignments are unavailable right now.' });
      }

      if (!quiz.classId || !ObjectId.isValid(quiz.classId)) {
        return res.status(400).json({ success: false, message: 'Link this quiz to a class before assigning students.' });
      }

      const classDoc = await classesCollection.findOne(getLinkedClassFilter(req, quiz.classId));
      if (!classDoc) {
        return res.status(404).json({ success: false, message: 'Linked class not found.' });
      }

      const rosterIds = Array.isArray(classDoc.students)
        ? [...new Set(classDoc.students.map((value) => String(value || '').trim()).filter(Boolean))]
        : [];
      const assignment = await classQuizCollection.findOne({ quizId: quiz._id, classId: classDoc._id });
      const assignedStudents = Array.isArray(assignment?.assignedStudents)
        ? assignment.assignedStudents.filter((studentId) => rosterIds.includes(studentId))
        : [];

      const users = usersCollection && rosterIds.length > 0
        ? await usersCollection
          .find(
            { studentIDNumber: { $in: rosterIds } },
            { projection: { firstName: 1, lastName: 1, studentIDNumber: 1, emaildb: 1 } }
          )
          .toArray()
        : [];
      const userMap = new Map(users.map((user) => [String(user.studentIDNumber || '').trim(), user]));

      const students = rosterIds.map((studentIDNumber) => {
        const user = userMap.get(studentIDNumber);
        return {
          studentIDNumber,
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          emaildb: user?.emaildb || '',
          assigned: assignedStudents.includes(studentIDNumber)
        };
      });

      return res.json({
        success: true,
        assignment: {
          quizId: quiz._id,
          classId: classDoc._id,
          classLabel: quiz.classLabel || classDoc.className || '',
          className: classDoc.className || '',
          assignedStudents,
          assignmentMode: assignedStudents.length > 0 ? 'selected' : 'all',
          students
        }
      });
    } catch (error) {
      console.error('Error loading quiz assignment targets:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/quizzes/:quizId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const existingQuiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!existingQuiz) return;

      const payload = mapQuizInput(req.body);
      const validationError = validateQuizPayload(payload);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const updateFields = {
        title: payload.title,
        quizTitle: payload.title,
        description: payload.description,
        subject: payload.subject,
        classId: payload.classId,
        classLabel: payload.classLabel,
        type: payload.type,
        status: payload.status,
        settings: payload.settings,
        sections: payload.sections,
        questions: payload.questions,
        legacyQuestions: toLegacyQuestions(payload.questions),
        questionCount: payload.questionCount,
        totalPoints: payload.totalPoints,
        isActive: payload.status === 'published',
        updatedAt: new Date(),
        publishedAt: payload.status === 'published' ? (existingQuiz.publishedAt || new Date()) : null,
        closedAt: payload.status === 'closed' ? new Date() : null,
        archivedAt: payload.status === 'archived' ? new Date() : null
      };

      await quizzesCollection.updateOne({ _id: existingQuiz._id }, { $set: updateFields });
      await writeLog(logsCollection, req, 'QUIZ_UPDATED', existingQuiz, `Updated quiz ${payload.title}`);

      return res.json({ success: true, message: 'Quiz updated successfully.' });
    } catch (error) {
      console.error('Error updating quiz builder quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/quizzes/:quizId/assigned-students', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const {
      quizzesCollection,
      logsCollection,
      classQuizCollection,
      classesCollection
    } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      if (!classQuizCollection || !classesCollection) {
        return res.status(503).json({ success: false, message: 'Quiz assignments are unavailable right now.' });
      }

      if (!quiz.classId || !ObjectId.isValid(quiz.classId)) {
        return res.status(400).json({ success: false, message: 'Link this quiz to a class before assigning students.' });
      }

      const classDoc = await classesCollection.findOne(getLinkedClassFilter(req, quiz.classId));
      if (!classDoc) {
        return res.status(404).json({ success: false, message: 'Linked class not found.' });
      }

      const providedStudentIds = normalizeStudentIds(req.body.studentIDs);
      const invalidStudentIds = providedStudentIds.filter((studentId) => !/^[A-Za-z0-9-]{4,32}$/.test(studentId));
      if (invalidStudentIds.length > 0) {
        return res.status(400).json({ success: false, message: 'Provide only valid student IDs.' });
      }

      const rosterIds = Array.isArray(classDoc.students)
        ? [...new Set(classDoc.students.map((value) => String(value || '').trim()).filter(Boolean))]
        : [];
      const unknownStudentIds = providedStudentIds.filter((studentId) => !rosterIds.includes(studentId));
      if (unknownStudentIds.length > 0) {
        return res.status(400).json({ success: false, message: 'One or more student IDs are not enrolled in the linked class.' });
      }

      const now = new Date();
      await classQuizCollection.updateOne(
        { quizId: quiz._id, classId: classDoc._id },
        {
          $set: {
            assignedStudents: providedStudentIds,
            startDate: quiz.settings?.startAt || null,
            dueDate: quiz.settings?.endAt || null,
            assignedBy: req.session.userId || null,
            assignedByStudentID: req.session.studentIDNumber || null,
            assignedByRole: req.session.role || null,
            updatedAt: now
          },
          $setOnInsert: {
            assignedAt: now
          }
        },
        { upsert: true }
      );

      await writeLog(
        logsCollection,
        req,
        'QUIZ_ASSIGNED_STUDENTS_UPDATED',
        quiz,
        providedStudentIds.length > 0
          ? `Assigned ${providedStudentIds.length} student(s) to ${quiz.title || quiz.quizTitle}`
          : `Reset ${quiz.title || quiz.quizTitle} to the whole class`
      );

      return res.json({
        success: true,
        assignedStudents: providedStudentIds,
        assignmentMode: providedStudentIds.length > 0 ? 'selected' : 'all',
        message: providedStudentIds.length > 0
          ? 'Student assignments updated.'
          : 'Quiz is now assigned to the whole class.'
      });
    } catch (error) {
      console.error('Error updating quiz assigned students:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/publish', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection, classQuizCollection, classesCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;
      const normalizedStructure = normalizePersistedQuizStructure(quiz);

      const publishPayload = {
        title: sanitizeText(quiz.title || quiz.quizTitle),
        sections: normalizedStructure.sections,
        questions: normalizedStructure.questions,
        settings: sanitizeSettings(quiz.settings || {})
      };
      const validationError = validateQuizPayload(publishPayload);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const publishedAt = quiz.publishedAt || new Date();
      const updatedQuizDoc = {
        ...quiz,
        classId: String(quiz.classId || '').trim() || null,
        settings: publishPayload.settings,
        publishedAt
      };

      try {
        await syncQuizClassAssignment({
          req,
          quizDoc: updatedQuizDoc,
          classQuizCollection,
          classesCollection
        });
      } catch (assignmentError) {
        return res.status(400).json({ success: false, message: assignmentError.message || 'Unable to publish quiz.' });
      }

      await quizzesCollection.updateOne(
        { _id: quiz._id },
        {
          $set: {
            status: 'published',
            isActive: true,
            publishedAt,
            updatedAt: new Date(),
            archivedAt: null,
            closedAt: null
          }
        }
      );

      await writeLog(logsCollection, req, 'QUIZ_PUBLISHED', quiz, `Published quiz ${quiz.title || quiz.quizTitle}`);
      return res.json({ success: true, message: 'Quiz published successfully.' });
    } catch (error) {
      console.error('Error publishing quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/close', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      await quizzesCollection.updateOne(
        { _id: quiz._id },
        { $set: { status: 'closed', isActive: false, closedAt: new Date(), updatedAt: new Date() } }
      );

      await writeLog(logsCollection, req, 'QUIZ_CLOSED', quiz, `Closed quiz ${quiz.title || quiz.quizTitle}`);
      return res.json({ success: true, message: 'Quiz closed successfully.' });
    } catch (error) {
      console.error('Error closing quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/archive', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      await quizzesCollection.updateOne(
        { _id: quiz._id },
        { $set: { status: 'archived', isActive: false, archivedAt: new Date(), updatedAt: new Date() } }
      );

      await writeLog(logsCollection, req, 'QUIZ_ARCHIVED', quiz, `Archived quiz ${quiz.title || quiz.quizTitle}`);
      return res.json({ success: true, message: 'Quiz archived successfully.' });
    } catch (error) {
      console.error('Error archiving quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/restore', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      await quizzesCollection.updateOne(
        { _id: quiz._id },
        { $set: { status: 'draft', isActive: false, archivedAt: null, updatedAt: new Date() } }
      );

      await writeLog(logsCollection, req, 'QUIZ_RESTORED', quiz, `Restored quiz ${quiz.title || quiz.quizTitle} to draft`);
      return res.json({ success: true, message: 'Quiz restored successfully.' });
    } catch (error) {
      console.error('Error restoring quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/duplicate', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      const now = new Date();
      const { _id, ...quizWithoutId } = quiz;
      const duplicatedQuiz = {
        ...quizWithoutId,
        title: `${quiz.title || quiz.quizTitle || 'Untitled Quiz'} Copy`,
        quizTitle: `${quiz.title || quiz.quizTitle || 'Untitled Quiz'} Copy`,
        status: 'draft',
        isActive: false,
        responseCount: 0,
        publishedAt: null,
        closedAt: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now
      };

      const result = await quizzesCollection.insertOne(duplicatedQuiz);
      duplicatedQuiz._id = result.insertedId;
      await writeLog(logsCollection, req, 'QUIZ_DUPLICATED', duplicatedQuiz, `Duplicated quiz from ${quiz._id}`);

      return res.status(201).json({ success: true, quizId: result.insertedId, message: 'Quiz duplicated successfully.' });
    } catch (error) {
      console.error('Error duplicating quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes/:quizId/responses', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, attemptsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      const attempts = await attemptsCollection
        .find({ quizId: quiz._id })
        .sort({ submittedAt: -1, createdAt: -1 })
        .toArray();

      const rows = attempts.map((attempt) => {
        const finalScore = attempt.finalScore ?? attempt.score ?? 0;
        const possible = quiz.totalPoints || quiz.questionCount || (Array.isArray(quiz.questions) ? quiz.questions.length : 0) || 0;
        return {
          _id: attempt._id,
          studentName: attempt.studentName || 'Student',
          studentIDNumber: attempt.studentIDNumber || '',
          submittedAt: attempt.submittedAt || null,
          durationSeconds: attempt.durationSeconds || null,
          attemptNumber: attempt.attemptNumber || 1,
          score: finalScore,
          scorePossible: possible,
          status: attempt.status || (attempt.isCompleted ? 'submitted' : 'in_progress')
        };
      });

      return res.json({ success: true, responses: rows });
    } catch (error) {
      console.error('Error loading quiz responses:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes/:quizId/analytics', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, attemptsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      const attempts = await attemptsCollection.find({ quizId: quiz._id, isCompleted: true }).toArray();
      const scores = attempts.map((attempt) => Number(attempt.finalScore ?? attempt.score ?? 0));
      const totalResponses = attempts.length;
      const averageScore = totalResponses ? (scores.reduce((sum, value) => sum + value, 0) / totalResponses) : 0;
      const highestScore = totalResponses ? Math.max(...scores) : 0;
      const lowestScore = totalResponses ? Math.min(...scores) : 0;
      const possible = quiz.totalPoints || quiz.questionCount || 0;

      return res.json({
        success: true,
        analytics: {
          totalResponses,
          averageScore,
          highestScore,
          lowestScore,
          completionRate: 0,
          scorePossible: possible
        }
      });
    } catch (error) {
      console.error('Error loading quiz analytics:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}

module.exports = createQuizBuilderApiRoutes;
