const express = require('express');
const ExcelJS = require('exceljs');
const { utcToZonedTime } = require('date-fns-tz');
const { buildStudentQuizView, scoreQuizAttempt } = require('../utils/quizRuntime');

function createQuizManagementRoutes(
  {
    getQuizzesCollection,
    getAttemptsCollection,
    getClassQuizCollection,
    getClassesCollection,
    ObjectId
  },
  {
    isAuthenticated,
    isAdmin
  }
) {
  const router = express.Router();

  function depsOr503(res) {
    const quizzesCollection = getQuizzesCollection();
    const attemptsCollection = getAttemptsCollection();
    const classQuizCollection = getClassQuizCollection();
    const classesCollection = getClassesCollection();

    if (!quizzesCollection || !attemptsCollection || !classQuizCollection || !classesCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }
    return { quizzesCollection, attemptsCollection, classQuizCollection, classesCollection };
  }

  function isValidObjectId(id) {
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
  }

  function parseDateValue(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getStudentName(req) {
    const fullName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim();
    return fullName || req.session?.studentIDNumber || 'Student';
  }

  function getAllowedAttemptCount(quiz) {
    if (quiz?.settings?.oneResponsePerStudent !== false) {
      return 1;
    }

    const explicitMaxAttempts = Number(quiz?.maxAttempts ?? quiz?.settings?.attemptsAllowed ?? 1);
    if (Number.isFinite(explicitMaxAttempts) && explicitMaxAttempts > 0) {
      return explicitMaxAttempts;
    }

    return 1;
  }

  function isQuizAvailableToStudents(quiz) {
    return String(quiz?.status || '').toLowerCase() === 'published' || quiz?.isActive === true;
  }

  async function getStudentAssignmentAccess({ req, quizId, classQuizCollection, classesCollection }) {
    const pivotDoc = await classQuizCollection.findOne({ quizId: new ObjectId(quizId) });
    if (!pivotDoc) {
      return { allowed: false, statusCode: 403, message: 'You are not assigned this quiz.' };
    }

    const studentIDNumber = req.session.studentIDNumber;
    let isAssignedToStudent = false;
    if (Array.isArray(pivotDoc.assignedStudents) && pivotDoc.assignedStudents.length > 0) {
      isAssignedToStudent = pivotDoc.assignedStudents.includes(studentIDNumber);
    } else {
      const classDoc = await classesCollection.findOne({
        _id: pivotDoc.classId,
        students: studentIDNumber
      });
      isAssignedToStudent = Boolean(classDoc);
    }

    if (!isAssignedToStudent) {
      return { allowed: false, statusCode: 403, message: 'You are not assigned this quiz.' };
    }

    if (pivotDoc.startDate && new Date(pivotDoc.startDate) > new Date()) {
      return { allowed: false, statusCode: 403, message: 'Quiz not yet available.' };
    }

    return { allowed: true, assignment: pivotDoc };
  }

  router.post('/quiz-responses', isAuthenticated, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;
    const { attemptsCollection } = deps;

    try {
      const { quizId, responses, score, totalQuestions } = req.body;
      const studentId = req.session.userId;

      if (!quizId || !responses || !Array.isArray(responses)) {
        return res.status(400).json({ success: false, message: 'Invalid data format.' });
      }

      const responseDoc = {
        quizId: new ObjectId(quizId),
        studentId: new ObjectId(studentId),
        responses,
        score,
        totalQuestions,
        submittedAt: new Date(),
      };

      const result = await attemptsCollection.insertOne(responseDoc);
      if (!result.acknowledged) {
        return res.status(500).json({ success: false, message: 'Failed to save responses.' });
      }
      return res.json({ success: true, message: 'Responses saved successfully.' });
    } catch (error) {
      console.error('Error saving quiz responses:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes', isAuthenticated, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;
    const { quizzesCollection } = deps;

    try {
      const { role, userId } = req.session;
      let filter = {};
      if (role === 'teacher') {
        filter = { createdBy: new ObjectId(userId) };
      }

      const quizzes = await quizzesCollection.find(filter).toArray();
      return res.json({ success: true, quizzes });
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  router.post('/quizzes', isAuthenticated, isAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;
    const { quizzesCollection } = deps;

    try {
      const {
        quizTitle,
        description,
        questions,
        dueDate,
        latePenaltyPercent,
        maxAttempts,
        duration
      } = req.body;

      if (!quizTitle || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ success: false, message: 'Invalid quiz data.' });
      }

      const newQuiz = {
        quizTitle,
        description: description || '',
        questions,
        dueDate: dueDate ? new Date(dueDate) : null,
        latePenaltyPercent: (latePenaltyPercent != null) ? latePenaltyPercent : 40,
        maxAttempts: maxAttempts || 1,
        duration: duration || 0,
        isActive: true,
        createdBy: req.session.userId,
        createdAt: new Date()
      };

      const result = await quizzesCollection.insertOne(newQuiz);
      if (!result.acknowledged) {
        return res.status(500).json({ success: false, message: 'Failed to create quiz.' });
      }
      return res.status(201).json({ success: true, quizId: result.insertedId, message: 'Quiz created successfully.' });
    } catch (error) {
      console.error('Error creating quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/start', isAuthenticated, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;
    const { quizzesCollection, attemptsCollection, classQuizCollection, classesCollection } = deps;

    try {
      const quizId = req.params.quizId;
      if (!ObjectId.isValid(quizId)) {
        return res.status(400).json({ success: false, message: 'Invalid quizId.' });
      }

      let assignmentAccess = null;
      if (req.session.role === 'student') {
        assignmentAccess = await getStudentAssignmentAccess({
          req,
          quizId,
          classQuizCollection,
          classesCollection
        });
        if (!assignmentAccess.allowed) {
          return res.status(assignmentAccess.statusCode).json({ success: false, message: assignmentAccess.message });
        }
      }

      const quiz = await quizzesCollection.findOne({ _id: new ObjectId(quizId) });
      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
      }

      if (req.session.role === 'student' && !isQuizAvailableToStudents(quiz)) {
        return res.status(403).json({ success: false, message: 'Quiz is not available.' });
      }

      const studentId = new ObjectId(req.session.userId);
      const attempts = await attemptsCollection.find({ quizId: quiz._id, studentId }).toArray();
      const inProgressAttempt = attempts.find((attempt) => !(attempt.isCompleted || attempt.status === 'submitted'));
      if (inProgressAttempt) {
        return res.json({
          success: true,
          attemptId: inProgressAttempt._id.toString(),
          status: inProgressAttempt.status || 'in_progress'
        });
      }

      const submittedAttempts = attempts.filter((attempt) => attempt.isCompleted || attempt.status === 'submitted');
      const allowedAttemptCount = getAllowedAttemptCount(quiz);
      if (submittedAttempts.length >= allowedAttemptCount) {
        return res.status(403).json({ success: false, message: 'No attempts remaining.' });
      }

      const now = new Date();
      const attemptDoc = {
        quizId: quiz._id,
        studentId,
        studentIDNumber: req.session.studentIDNumber || null,
        studentName: getStudentName(req),
        classId: assignmentAccess?.assignment?.classId || null,
        answers: [],
        status: 'in_progress',
        isCompleted: false,
        attemptNumber: submittedAttempts.length + 1,
        startedAt: now,
        createdAt: now,
        partialSaveAt: now
      };

      const result = await attemptsCollection.insertOne(attemptDoc);
      return res.json({
        success: true,
        attemptId: result.insertedId.toString(),
        status: attemptDoc.status
      });
    } catch (error) {
      console.error('Error starting quiz attempt:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/quizzes/:quizId/attempts/:attemptId', isAuthenticated, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;
    const { attemptsCollection } = deps;

    try {
      const userId = req.session.userId;
      const studentIDNumber = req.session.studentIDNumber;
      const attemptId = req.params.attemptId;
      const quizId = req.params.quizId;
      const { answers } = req.body;

      if (!isValidObjectId(quizId) || !isValidObjectId(attemptId)) {
        return res.status(400).json({ success: false, message: 'Invalid IDs.' });
      }

      const attempt = await attemptsCollection.findOne({ _id: new ObjectId(attemptId) });
      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt not found.' });
      }
      if (attempt.quizId?.toString() !== quizId) {
        return res.status(400).json({ success: false, message: 'Attempt does not belong to this quiz.' });
      }
      if (attempt.studentId.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
      }
      if (attempt.isCompleted) {
        return res.status(400).json({ success: false, message: 'Attempt is already submitted.' });
      }

      await attemptsCollection.updateOne(
        { _id: attempt._id },
        {
          $set: {
            answers: Array.isArray(answers) ? answers : [],
            partialSaveAt: new Date(),
            studentIDNumber
          }
        }
      );

      return res.json({ success: true, message: 'Attempt updated (partial save).' });
    } catch (error) {
      console.error('Error updating attempt:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/attempts/:attemptId/submit', isAuthenticated, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;
    const { quizzesCollection, attemptsCollection, classQuizCollection, classesCollection } = deps;

    try {
      const { quizId, attemptId } = req.params;
      const { answers } = req.body;
      const userId = req.session.userId;

      if (!isValidObjectId(quizId) || !isValidObjectId(attemptId)) {
        return res.status(400).json({ success: false, message: 'Invalid IDs.' });
      }

      const attempt = await attemptsCollection.findOne({ _id: new ObjectId(attemptId) });
      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt not found.' });
      }
      if (attempt.quizId?.toString() !== quizId) {
        return res.status(400).json({ success: false, message: 'Attempt does not belong to this quiz.' });
      }
      if (attempt.studentId.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
      }
      if (attempt.isCompleted) {
        return res.status(400).json({ success: false, message: 'Attempt is already submitted.' });
      }

      const quiz = await quizzesCollection.findOne({ _id: new ObjectId(quizId) });
      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
      }
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated.' });
      }

      let assignmentAccess = null;
      if (req.session.role === 'student') {
        assignmentAccess = await getStudentAssignmentAccess({
          req,
          quizId,
          classQuizCollection,
          classesCollection
        });
        if (!assignmentAccess.allowed) {
          return res.status(assignmentAccess.statusCode).json({ success: false, message: assignmentAccess.message });
        }
        if (!isQuizAvailableToStudents(quiz)) {
          return res.status(403).json({ success: false, message: 'Quiz is not available.' });
        }
      }

      const submittedAnswers = Array.isArray(answers) ? answers : attempt.answers;
      const { normalizedAnswers, rawScore, totalQuizPoints } = scoreQuizAttempt(quiz, submittedAnswers);
      let finalScore = rawScore;
      const submittedAt = new Date();
      const dueDate = parseDateValue(
        assignmentAccess?.assignment?.dueDate
        || quiz.settings?.endAt
        || quiz.dueDate
      );
      if (dueDate && submittedAt > dueDate) {
        const penaltyPercent = Number(quiz.latePenaltyPercent || 40);
        const penalty = (penaltyPercent / 100) * totalQuizPoints;
        finalScore = rawScore - penalty;
      }

      finalScore = Math.max(0, finalScore);
      const durationSeconds = attempt.startedAt
        ? Math.max(0, Math.round((submittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000))
        : null;

      await attemptsCollection.updateOne(
        { _id: attempt._id },
        {
          $set: {
            answers: normalizedAnswers,
            isCompleted: true,
            status: 'submitted',
            submittedAt,
            score: rawScore,
            finalScore,
            studentIDNumber: req.session.studentIDNumber,
            studentName: getStudentName(req),
            durationSeconds
          }
        }
      );

      const allAttempts = await attemptsCollection
        .find({ quizId: quiz._id, studentId: new ObjectId(userId), isCompleted: true })
        .toArray();

      const completedAttempts = allAttempts.map((row) => (
        row._id?.toString() === attempt._id.toString()
          ? { ...row, finalScore }
          : row
      ));
      const allFinalScores = completedAttempts.map((row) => Number(row.finalScore || 0));
      const averageScore = allFinalScores.length
        ? allFinalScores.reduce((sum, value) => sum + value, 0) / allFinalScores.length
        : finalScore;
      const attemptCount = completedAttempts.length;

      let multipleAttemptsAdjustedScore = finalScore;
      if (quiz.maxAttempts > 1 && attemptCount > 1) {
        multipleAttemptsAdjustedScore = Math.max(0, averageScore - (attemptCount - 1));
      }

      await attemptsCollection.updateOne(
        { _id: attempt._id },
        { $set: { finalScore: multipleAttemptsAdjustedScore } }
      );

      return res.json({
        success: true,
        rawScore,
        finalScore: multipleAttemptsAdjustedScore,
        totalQuizPoints,
        message: 'Quiz submitted successfully.'
      });
    } catch (error) {
      console.error('Error submitting final quiz attempt:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes/:quizId/export', isAuthenticated, isAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;
    const { quizzesCollection, attemptsCollection } = deps;

    try {
      const quizId = req.params.quizId;
      const quiz = await quizzesCollection.findOne({ _id: new ObjectId(quizId) });
      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
      }

      const attempts = await attemptsCollection.find({ quizId: quiz._id }).toArray();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Quiz Attempts');
      worksheet.columns = [
        { header: 'Student ID (ObjectId)', key: 'studentId', width: 24 },
        { header: 'StudentIDNumber', key: 'studentIDNumber', width: 12 },
        { header: 'Attempt #', key: 'attemptNumber', width: 10 },
        { header: 'Is Completed?', key: 'isCompleted', width: 15 },
        { header: 'Raw Score', key: 'score', width: 10 },
        { header: 'Final Score', key: 'finalScore', width: 12 },
        { header: 'Submitted At', key: 'submittedAt', width: 20 }
      ];

      attempts.forEach((attempt) => {
        worksheet.addRow({
          studentId: attempt.studentId ? attempt.studentId.toString() : '',
          studentIDNumber: attempt.studentIDNumber || '',
          attemptNumber: attempt.attemptNumber,
          isCompleted: attempt.isCompleted,
          score: attempt.score,
          finalScore: attempt.finalScore,
          submittedAt: attempt.submittedAt
            ? utcToZonedTime(attempt.submittedAt, 'Asia/Manila').toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
            : ''
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=\"quiz_${quizId}_attempts.xlsx\"`);
      await workbook.xlsx.write(res);
      return res.end();
    } catch (error) {
      console.error('Error exporting quiz attempts:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/quizzes/:quizId/active', isAuthenticated, isAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;
    const { quizzesCollection } = deps;

    try {
      const { quizId } = req.params;
      const { isActive } = req.body;
      const result = await quizzesCollection.updateOne(
        { _id: new ObjectId(quizId) },
        { $set: { isActive: !!isActive } }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ success: false, message: 'Quiz not found or no change.' });
      }
      return res.json({ success: true, message: `Quiz set to isActive=${isActive}` });
    } catch (error) {
      console.error('Error toggling quiz active state:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes/:quizId', isAuthenticated, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;
    const { quizzesCollection, classQuizCollection, classesCollection } = deps;

    try {
      const quizId = req.params.quizId;
      if (!ObjectId.isValid(quizId)) {
        return res.status(400).json({ success: false, message: 'Invalid quizId.' });
      }

      const quiz = await quizzesCollection.findOne({ _id: new ObjectId(quizId) });
      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
      }

      if (req.session.role === 'admin' || req.session.role === 'teacher') {
        return res.json({ success: true, quiz });
      }

      if (req.session.role === 'student') {
        const assignmentAccess = await getStudentAssignmentAccess({
          req,
          quizId,
          classQuizCollection,
          classesCollection
        });
        if (!assignmentAccess.allowed) {
          return res.status(assignmentAccess.statusCode).json({ success: false, message: assignmentAccess.message });
        }
        if (!isQuizAvailableToStudents(quiz)) {
          return res.status(403).json({ success: false, message: 'Quiz is not available.' });
        }

        return res.json({
          success: true,
          quiz: buildStudentQuizView(quiz, assignmentAccess.assignment)
        });
      }

      return res.status(403).json({ success: false, message: 'Forbidden.' });
    } catch (error) {
      console.error('Error fetching quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}

module.exports = createQuizManagementRoutes;
