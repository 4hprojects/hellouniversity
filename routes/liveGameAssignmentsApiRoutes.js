const express = require('express');

const {
  buildAccessibleClassFilter,
  resolveLinkedClassSelection,
  toIdString
} = require('../utils/liveGameClassLinking');
const {
  buildAssignmentDoc,
  buildAssignmentReport,
  buildRankMap,
  evaluateAttempt,
  normalizeAssignmentInput,
  serializeAssignmentRoster,
  serializeAssignmentSummary,
  serializeAssignmentTargetClass,
  toIsoString,
  validateAssignmentInput
} = require('../utils/liveGameSelfPaced');

function createLiveGameAssignmentsApiRoutes({
  getLiveGamesCollection,
  getLiveGameAssignmentsCollection,
  getLiveGameAttemptsCollection,
  getClassesCollection,
  getUsersCollection,
  ObjectId,
  isAuthenticated,
  isTeacherOrAdmin
}) {
  const router = express.Router();

  function depsOr503(res) {
    const liveGamesCollection = getLiveGamesCollection?.();
    const liveGameAssignmentsCollection = getLiveGameAssignmentsCollection?.();
    const liveGameAttemptsCollection = getLiveGameAttemptsCollection?.();
    const classesCollection = getClassesCollection?.();
    const usersCollection = getUsersCollection?.();

    if (!liveGamesCollection || !liveGameAssignmentsCollection || !liveGameAttemptsCollection || !classesCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }

    return {
      liveGamesCollection,
      liveGameAssignmentsCollection,
      liveGameAttemptsCollection,
      classesCollection,
      usersCollection
    };
  }

  function ownerFilter(req) {
    return req.session?.role === 'admin'
      ? {}
      : { ownerUserId: req.session?.userId };
  }

  async function loadOwnedGame(req, res, gameId) {
    const deps = depsOr503(res);
    if (!deps) return null;

    if (!ObjectId.isValid(gameId)) {
      res.status(400).json({ success: false, message: 'Invalid game ID.' });
      return null;
    }

    const game = await deps.liveGamesCollection.findOne({
      _id: new ObjectId(gameId),
      ...ownerFilter(req)
    });
    if (!game) {
      res.status(404).json({ success: false, message: 'Game not found.' });
      return null;
    }

    return { deps, game };
  }

  async function loadUsersByStudentIds(usersCollection, studentIds) {
    const normalizedStudentIds = Array.isArray(studentIds)
      ? [...new Set(studentIds.map((value) => String(value || '').trim()).filter(Boolean))]
      : [];

    if (!usersCollection || !normalizedStudentIds.length) {
      return [];
    }

    return usersCollection.find({
      studentIDNumber: { $in: normalizedStudentIds }
    }, {
      projection: {
        firstName: 1,
        lastName: 1,
        studentIDNumber: 1
      }
    }).toArray();
  }

  async function recalculateSubmittedAttempts(assignmentsCollection, attemptsCollection, assignmentDoc, assignmentId) {
    const attempts = await attemptsCollection.find({ assignmentId }).toArray();
    const recalculated = [];

    for (const attempt of attempts) {
      const evaluation = evaluateAttempt(assignmentDoc, attempt);
      const isSubmitted = String(attempt.status || '').trim() === 'submitted';
      const isLateSubmission = Boolean(
        attempt.submittedAt
        && assignmentDoc.dueDate
        && new Date(attempt.submittedAt).getTime() > new Date(assignmentDoc.dueDate).getTime()
      );

      const nextAttempt = {
        ...attempt,
        ...evaluation,
        status: isSubmitted ? 'submitted' : 'in_progress',
        isLateSubmission
      };
      recalculated.push(nextAttempt);

      await attemptsCollection.updateOne(
        { _id: attempt._id },
        {
          $set: {
            responses: evaluation.responses,
            score: evaluation.score,
            correctCount: evaluation.correctCount,
            percent: evaluation.percent,
            elapsedTimeMs: evaluation.elapsedTimeMs,
            answeredCount: evaluation.answeredCount,
            unansweredCount: evaluation.unansweredCount,
            isLateSubmission,
            updatedAt: new Date()
          }
        }
      );
    }

    const rankMap = buildRankMap(recalculated, assignmentDoc.scoringProfile);
    for (const attempt of recalculated) {
      await attemptsCollection.updateOne(
        { _id: attempt._id },
        {
          $set: {
            rank: rankMap.get(toIdString(attempt._id)) || null
          }
        }
      );
    }

    return recalculated;
  }

  router.get('/:gameId/assignment-targets', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const loaded = await loadOwnedGame(req, res, req.params.gameId);
      if (!loaded) return;
      const { deps, game } = loaded;

      const accessFilter = buildAccessibleClassFilter({
        ObjectId,
        userId: req.session?.userId,
        role: req.session?.role
      });
      const activeFilter = {
        $or: [{ status: 'active' }, { status: { $exists: false } }]
      };
      const classesFilter = req.session?.role === 'admin'
        ? activeFilter
        : { $and: [accessFilter, activeFilter] };

      const classes = await deps.classesCollection.find(classesFilter).toArray();
      const classItems = classes
        .map((classDoc) => serializeAssignmentTargetClass(classDoc))
        .sort((left, right) => `${left.classCode} ${left.className}`.localeCompare(`${right.classCode} ${right.className}`));

      const selectedClassId = String(req.query.classId || '').trim();
      if (!selectedClassId) {
        return res.json({
          success: true,
          game: {
            _id: toIdString(game._id),
            title: game.title || 'Untitled ClassRush',
            linkedClass: game.linkedClass || null
          },
          classes: classItems,
          selectedClass: null,
          roster: [],
          assignment: null
        });
      }

      const { classDoc, linkedClass } = await resolveLinkedClassSelection({
        classesCollection: deps.classesCollection,
        ObjectId,
        linkedClassId: selectedClassId,
        userId: req.session?.userId,
        role: req.session?.role
      });
      const users = await loadUsersByStudentIds(deps.usersCollection, classDoc?.students);
      const assignment = await deps.liveGameAssignmentsCollection.findOne({
        gameId: toIdString(game._id),
        classId: linkedClass.classId
      });

      return res.json({
        success: true,
        game: {
          _id: toIdString(game._id),
          title: game.title || 'Untitled ClassRush',
          linkedClass: game.linkedClass || null
        },
        classes: classItems,
        selectedClass: serializeAssignmentTargetClass(classDoc),
        roster: serializeAssignmentRoster(classDoc, users),
        assignment: assignment ? serializeAssignmentSummary(assignment) : null
      });
    } catch (error) {
      console.error('GET /api/live-games/:gameId/assignment-targets error:', error);
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to load assignment targets.' });
    }
  });

  router.put('/:gameId/assignments', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const loaded = await loadOwnedGame(req, res, req.params.gameId);
      if (!loaded) return;
      const { deps, game } = loaded;

      const input = normalizeAssignmentInput(req.body);
      const { classDoc } = await resolveLinkedClassSelection({
        classesCollection: deps.classesCollection,
        ObjectId,
        linkedClassId: input.classId,
        userId: req.session?.userId,
        role: req.session?.role
      });
      const validation = validateAssignmentInput(input, classDoc);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const existingAssignment = await deps.liveGameAssignmentsCollection.findOne({
        gameId: toIdString(game._id),
        classId: toIdString(classDoc._id)
      });

      const assignmentDoc = buildAssignmentDoc({
        input,
        game,
        classDoc,
        teacherSession: req.session
      });

      if (existingAssignment) {
        await deps.liveGameAssignmentsCollection.updateOne(
          { _id: existingAssignment._id },
          {
            $set: {
              ...assignmentDoc,
              createdAt: existingAssignment.createdAt || new Date(),
              updatedAt: new Date()
            }
          }
        );
      } else {
        const result = await deps.liveGameAssignmentsCollection.insertOne(assignmentDoc);
        assignmentDoc._id = result.insertedId;
      }

      const finalAssignment = existingAssignment
        ? await deps.liveGameAssignmentsCollection.findOne({ _id: existingAssignment._id })
        : await deps.liveGameAssignmentsCollection.findOne({ _id: assignmentDoc._id });

      await recalculateSubmittedAttempts(
        deps.liveGameAssignmentsCollection,
        deps.liveGameAttemptsCollection,
        finalAssignment,
        toIdString(finalAssignment._id)
      );

      return res.json({
        success: true,
        message: 'Self-paced ClassRush assignment saved.',
        assignment: serializeAssignmentSummary(finalAssignment)
      });
    } catch (error) {
      console.error('PUT /api/live-games/:gameId/assignments error:', error);
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to save assignment.' });
    }
  });

  router.get('/:gameId/assignments', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const loaded = await loadOwnedGame(req, res, req.params.gameId);
      if (!loaded) return;
      const { deps, game } = loaded;

      const assignments = await deps.liveGameAssignmentsCollection.find({
        gameId: toIdString(game._id)
      }).toArray();

      const classIds = assignments
        .map((assignment) => String(assignment?.classId || '').trim())
        .filter((value) => ObjectId.isValid(value))
        .map((value) => new ObjectId(value));

      const classes = classIds.length
        ? await deps.classesCollection.find({ _id: { $in: classIds } }).toArray()
        : [];
      const classMap = new Map(classes.map((classDoc) => [toIdString(classDoc._id), classDoc]));

      const items = [];
      for (const assignment of assignments) {
        const attempts = await deps.liveGameAttemptsCollection.find({
          assignmentId: toIdString(assignment._id)
        }).toArray();
        const report = buildAssignmentReport({
          game,
          assignment,
          classDoc: classMap.get(String(assignment.classId || '').trim()) || {
            _id: assignment.classId,
            classCode: assignment.classCode,
            className: assignment.className,
            students: []
          },
          attempts
        });
        items.push({
          ...serializeAssignmentSummary(assignment),
          submittedCount: report.summary.submittedCount,
          inProgressCount: report.summary.inProgressCount,
          notStartedCount: report.summary.notStartedCount,
          overdueCount: report.summary.overdueCount,
          showLeaderboard: report.summary.showLeaderboard
        });
      }

      return res.json({
        success: true,
        game: {
          _id: toIdString(game._id),
          title: game.title || 'Untitled ClassRush'
        },
        assignments: items.sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || ''))
      });
    } catch (error) {
      console.error('GET /api/live-games/:gameId/assignments error:', error);
      return res.status(500).json({ success: false, message: 'Failed to load self-paced assignments.' });
    }
  });

  router.get('/:gameId/assignments/:assignmentId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const loaded = await loadOwnedGame(req, res, req.params.gameId);
      if (!loaded) return;
      const { deps, game } = loaded;

      if (!ObjectId.isValid(req.params.assignmentId)) {
        return res.status(400).json({ success: false, message: 'Invalid assignment ID.' });
      }

      const assignment = await deps.liveGameAssignmentsCollection.findOne({
        _id: new ObjectId(req.params.assignmentId),
        gameId: toIdString(game._id)
      });
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found.' });
      }

      const classDoc = ObjectId.isValid(String(assignment.classId || '').trim())
        ? await deps.classesCollection.findOne({ _id: new ObjectId(String(assignment.classId || '').trim()) })
        : null;
      const targetStudentIds = classDoc?.students || assignment.assignedStudents || [];
      const users = await loadUsersByStudentIds(deps.usersCollection, targetStudentIds);
      const attempts = await deps.liveGameAttemptsCollection.find({
        assignmentId: toIdString(assignment._id)
      }).toArray();

      const report = buildAssignmentReport({
        game,
        assignment,
        classDoc: classDoc || {
          _id: assignment.classId,
          classCode: assignment.classCode,
          className: assignment.className,
          students: assignment.assignedStudents || []
        },
        users,
        attempts
      });

      return res.json({
        success: true,
        game: {
          _id: toIdString(game._id),
          title: game.title || 'Untitled ClassRush'
        },
        assignment: serializeAssignmentSummary(assignment),
        report
      });
    } catch (error) {
      console.error('GET /api/live-games/:gameId/assignments/:assignmentId error:', error);
      return res.status(500).json({ success: false, message: 'Failed to load assignment detail.' });
    }
  });

  router.delete('/:gameId/assignments/:assignmentId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const loaded = await loadOwnedGame(req, res, req.params.gameId);
      if (!loaded) return;
      const { deps, game } = loaded;

      if (!ObjectId.isValid(req.params.assignmentId)) {
        return res.status(400).json({ success: false, message: 'Invalid assignment ID.' });
      }

      const assignmentId = new ObjectId(req.params.assignmentId);
      const assignment = await deps.liveGameAssignmentsCollection.findOne({
        _id: assignmentId,
        gameId: toIdString(game._id)
      });
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found.' });
      }

      await deps.liveGameAssignmentsCollection.deleteOne({ _id: assignmentId });
      await deps.liveGameAttemptsCollection.deleteMany({ assignmentId: toIdString(assignmentId) });

      return res.json({
        success: true,
        message: 'Self-paced ClassRush assignment removed.'
      });
    } catch (error) {
      console.error('DELETE /api/live-games/:gameId/assignments/:assignmentId error:', error);
      return res.status(500).json({ success: false, message: 'Failed to remove assignment.' });
    }
  });

  return router;
}

module.exports = createLiveGameAssignmentsApiRoutes;
