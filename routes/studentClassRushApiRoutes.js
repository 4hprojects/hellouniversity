const express = require('express');

const {
  buildStudentAssignmentPayload,
  buildRankMap,
  createAttemptQuestionsSnapshot,
  evaluateAttempt,
  getStudentAssignmentAvailability,
  isStudentAllowedForAssignment,
  toIsoString
} = require('../utils/liveGameSelfPaced');
const { normalizeStoredGame } = require('../utils/liveGameHelpers');
const { toIdString } = require('../utils/liveGameClassLinking');

function createStudentClassRushApiRoutes({
  getLiveGamesCollection,
  getLiveGameAssignmentsCollection,
  getLiveGameAttemptsCollection,
  getClassesCollection,
  ObjectId,
  isAuthenticated
}) {
  const router = express.Router();

  function depsOr503(res) {
    const liveGamesCollection = getLiveGamesCollection?.();
    const liveGameAssignmentsCollection = getLiveGameAssignmentsCollection?.();
    const liveGameAttemptsCollection = getLiveGameAttemptsCollection?.();
    const classesCollection = getClassesCollection?.();

    if (!liveGamesCollection || !liveGameAssignmentsCollection || !liveGameAttemptsCollection || !classesCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }

    return {
      liveGamesCollection,
      liveGameAssignmentsCollection,
      liveGameAttemptsCollection,
      classesCollection
    };
  }

  async function loadAssignmentContext(req, res) {
    const deps = depsOr503(res);
    if (!deps) return null;

    if (!req.session?.studentIDNumber) {
      res.status(403).json({ success: false, message: 'Only enrolled students can open ClassRush assignments.' });
      return null;
    }

    const assignmentId = String(req.params.assignmentId || '').trim();
    if (!ObjectId.isValid(assignmentId)) {
      res.status(400).json({ success: false, message: 'Invalid assignment ID.' });
      return null;
    }

    const assignment = await deps.liveGameAssignmentsCollection.findOne({ _id: new ObjectId(assignmentId) });
    if (!assignment) {
      res.status(404).json({ success: false, message: 'ClassRush assignment not found.' });
      return null;
    }

    if (!ObjectId.isValid(String(assignment.gameId || '').trim())) {
      res.status(404).json({ success: false, message: 'ClassRush game not found.' });
      return null;
    }

    const game = await deps.liveGamesCollection.findOne({ _id: new ObjectId(String(assignment.gameId || '').trim()) });
    if (!game) {
      res.status(404).json({ success: false, message: 'ClassRush game not found.' });
      return null;
    }

    if (!ObjectId.isValid(String(assignment.classId || '').trim())) {
      res.status(404).json({ success: false, message: 'Assigned class not found.' });
      return null;
    }

    const classDoc = await deps.classesCollection.findOne({ _id: new ObjectId(String(assignment.classId || '').trim()) });
    if (!classDoc) {
      res.status(404).json({ success: false, message: 'Assigned class not found.' });
      return null;
    }

    if (!isStudentAllowedForAssignment(assignment, classDoc, req.session.studentIDNumber)) {
      res.status(403).json({ success: false, message: 'You do not have access to this ClassRush assignment.' });
      return null;
    }

    const studentIDNumber = String(req.session.studentIDNumber || '').trim();
    const attempt = await deps.liveGameAttemptsCollection.findOne({
      assignmentId,
      studentIDNumber
    });

    return {
      deps,
      assignmentId,
      assignment,
      game,
      classDoc,
      attempt,
      studentIDNumber
    };
  }

  async function createInitialAttempt(deps, assignment, game, req) {
    const now = new Date();
    const studentName = [req.session?.firstName, req.session?.lastName].filter(Boolean).join(' ').trim() || req.session?.userName || 'Student';
    const questions = createAttemptQuestionsSnapshot(game);
    const attemptDoc = {
      assignmentId: toIdString(assignment._id),
      gameId: String(assignment.gameId || ''),
      classId: String(assignment.classId || ''),
      studentIDNumber: String(req.session?.studentIDNumber || '').trim(),
      studentUserId: String(req.session?.userId || '').trim() || null,
      studentName,
      status: 'in_progress',
      questions,
      responses: [],
      currentQuestionIndex: 0,
      startedAt: now,
      updatedAt: now,
      submittedAt: null,
      score: 0,
      correctCount: 0,
      percent: null,
      elapsedTimeMs: 0,
      rank: null,
      isLateSubmission: false
    };

    const result = await deps.liveGameAttemptsCollection.insertOne(attemptDoc);
    return {
      ...attemptDoc,
      _id: result.insertedId
    };
  }

  function normalizeIncomingResponse(question, body = {}) {
    const questionType = String(question?.type || '').trim();
    const timeLimitMs = Math.max(0, Number(question?.timeLimitSeconds || 0) * 1000);
    const rawTimeMs = Math.max(0, Number.parseInt(body.timeMs, 10) || 0);
    const timeMs = timeLimitMs > 0 ? Math.min(rawTimeMs, timeLimitMs) : rawTimeMs;

    if (questionType === 'type_answer') {
      return {
        answerId: null,
        submittedText: String(body.answerText || '').trim() || null,
        timeMs
      };
    }

    const answerId = String(body.answerId || body.optionId || '').trim();
    return {
      answerId: answerId || null,
      submittedText: null,
      timeMs
    };
  }

  router.get('/api/student/classrush/assignments/:assignmentId', isAuthenticated, async (req, res) => {
    try {
      const loaded = await loadAssignmentContext(req, res);
      if (!loaded) return;
      const { deps, assignment, game } = loaded;

      let attempt = loaded.attempt;
      const availability = getStudentAssignmentAvailability(assignment, attempt);
      if (!attempt && availability.allowed) {
        attempt = await createInitialAttempt(deps, assignment, game, req);
      }

      if (!availability.allowed && !attempt) {
        return res.status(403).json({
          success: false,
          message: availability.message,
          availability: {
            state: availability.state,
            message: availability.message,
            isLateWindow: false
          },
          assignment: {
            assignmentId: toIdString(assignment._id),
            title: game.title || 'ClassRush Assignment',
            className: assignment.className || '',
            classCode: assignment.classCode || '',
            scoringProfile: assignment.scoringProfile || 'accuracy',
            startDate: toIsoString(assignment.startDate),
            dueDate: toIsoString(assignment.dueDate)
          }
        });
      }

      if (!availability.allowed && attempt && String(attempt.status || '') !== 'submitted') {
        return res.status(403).json({
          success: false,
          message: availability.message,
          availability: {
            state: availability.state,
            message: availability.message,
            isLateWindow: false
          },
          assignment: {
            assignmentId: toIdString(assignment._id),
            title: game.title || 'ClassRush Assignment',
            className: assignment.className || '',
            classCode: assignment.classCode || '',
            scoringProfile: assignment.scoringProfile || 'accuracy',
            startDate: toIsoString(assignment.startDate),
            dueDate: toIsoString(assignment.dueDate),
            status: availability.state
          }
        });
      }

      const submittedAttempts = await deps.liveGameAttemptsCollection.find({
        assignmentId: toIdString(assignment._id),
        status: 'submitted'
      }).toArray();
      const rankMap = buildRankMap(submittedAttempts, assignment.scoringProfile);
      const payload = buildStudentAssignmentPayload({
        game,
        assignment,
        attempt,
        rankMap
      });

      return res.json({
        success: true,
        availability: {
          state: availability.state,
          message: availability.message,
          isLateWindow: availability.state === 'late'
        },
        ...payload
      });
    } catch (error) {
      console.error('GET /api/student/classrush/assignments/:assignmentId error:', error);
      return res.status(500).json({ success: false, message: 'Failed to load ClassRush assignment.' });
    }
  });

  router.put('/api/student/classrush/assignments/:assignmentId/progress', isAuthenticated, async (req, res) => {
    try {
      const loaded = await loadAssignmentContext(req, res);
      if (!loaded) return;
      const { deps, assignment, game } = loaded;

      let attempt = loaded.attempt;
      const availability = getStudentAssignmentAvailability(assignment, attempt);
      if (!availability.allowed) {
        return res.status(403).json({ success: false, message: availability.message });
      }

      if (!attempt) {
        attempt = await createInitialAttempt(deps, assignment, game, req);
      }

      if (String(attempt.status || '') === 'submitted') {
        return res.status(409).json({ success: false, message: 'This attempt has already been submitted.' });
      }

      const normalizedGame = normalizeStoredGame(game);
      const questionIndex = Number.isFinite(Number(req.body?.questionIndex)) ? Number(req.body.questionIndex) : null;
      const currentQuestionIndex = Number.isFinite(Number(req.body?.currentQuestionIndex))
        ? Math.max(0, Number(req.body.currentQuestionIndex))
        : (Number(attempt.currentQuestionIndex || 0) || 0);

      const responses = Array.isArray(attempt.responses) ? attempt.responses.slice() : [];
      if (questionIndex !== null) {
        const question = Array.isArray(attempt.questions) ? attempt.questions[questionIndex] : null;
        if (!question) {
          return res.status(400).json({ success: false, message: 'Invalid question index.' });
        }

        const nextResponse = normalizeIncomingResponse(question, req.body || {});
        responses[questionIndex] = {
          questionIndex,
          questionId: String(question.id || '').trim(),
          questionType: String(question.type || '').trim(),
          answerId: nextResponse.answerId,
          submittedText: nextResponse.submittedText,
          timeMs: nextResponse.timeMs,
          answeredAt: new Date()
        };
      }

      await deps.liveGameAttemptsCollection.updateOne(
        { _id: attempt._id },
        {
          $set: {
            responses,
            currentQuestionIndex: Math.min(Math.max(0, currentQuestionIndex), Math.max(0, (normalizedGame.questions || []).length - 1)),
            updatedAt: new Date()
          }
        }
      );

      return res.json({
        success: true,
        message: 'Progress saved.'
      });
    } catch (error) {
      console.error('PUT /api/student/classrush/assignments/:assignmentId/progress error:', error);
      return res.status(500).json({ success: false, message: 'Failed to save ClassRush progress.' });
    }
  });

  router.post('/api/student/classrush/assignments/:assignmentId/submit', isAuthenticated, async (req, res) => {
    try {
      const loaded = await loadAssignmentContext(req, res);
      if (!loaded) return;
      const { deps, assignment, game } = loaded;

      let attempt = loaded.attempt;
      if (!attempt) {
        const availability = getStudentAssignmentAvailability(assignment, null);
        if (!availability.allowed) {
          return res.status(403).json({ success: false, message: availability.message });
        }
        attempt = await createInitialAttempt(deps, assignment, game, req);
      }

      const availability = getStudentAssignmentAvailability(assignment, attempt);
      if (!availability.allowed) {
        return res.status(403).json({ success: false, message: availability.message });
      }

      if (String(attempt.status || '') === 'submitted') {
        return res.status(409).json({ success: false, message: 'This attempt has already been submitted.' });
      }

      const evaluation = evaluateAttempt(assignment, attempt);
      const now = new Date();
      const isLateSubmission = Boolean(
        assignment?.dueDate
        && now.getTime() > new Date(assignment.dueDate).getTime()
      );

      await deps.liveGameAttemptsCollection.updateOne(
        { _id: attempt._id },
        {
          $set: {
            responses: evaluation.responses,
            status: 'submitted',
            submittedAt: now,
            updatedAt: now,
            score: evaluation.score,
            correctCount: evaluation.correctCount,
            percent: evaluation.percent,
            elapsedTimeMs: evaluation.elapsedTimeMs,
            answeredCount: evaluation.answeredCount,
            unansweredCount: evaluation.unansweredCount,
            isLateSubmission
          }
        }
      );

      const updatedAttempt = await deps.liveGameAttemptsCollection.findOne({ _id: attempt._id });
      const submittedAttempts = await deps.liveGameAttemptsCollection.find({
        assignmentId: toIdString(assignment._id),
        status: 'submitted'
      }).toArray();
      const rankMap = buildRankMap(submittedAttempts, assignment.scoringProfile);

      for (const submittedAttempt of submittedAttempts) {
        await deps.liveGameAttemptsCollection.updateOne(
          { _id: submittedAttempt._id },
          {
            $set: {
              rank: rankMap.get(toIdString(submittedAttempt._id)) || null,
              updatedAt: new Date()
            }
          }
        );
      }

      const finalAttempt = await deps.liveGameAttemptsCollection.findOne({ _id: attempt._id });
      const payload = buildStudentAssignmentPayload({
        game,
        assignment,
        attempt: finalAttempt,
        rankMap
      });

      return res.json({
        success: true,
        message: isLateSubmission ? 'ClassRush submitted late.' : 'ClassRush submitted.',
        submittedAt: toIsoString(finalAttempt?.submittedAt),
        availability: {
          state: 'submitted',
          message: ''
        },
        ...payload
      });
    } catch (error) {
      console.error('POST /api/student/classrush/assignments/:assignmentId/submit error:', error);
      return res.status(500).json({ success: false, message: 'Failed to submit ClassRush assignment.' });
    }
  });

  return router;
}

module.exports = createStudentClassRushApiRoutes;
