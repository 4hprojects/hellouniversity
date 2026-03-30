const express = require('express');
const { ObjectId } = require('mongodb');
const { serializeClassMaterials } = require('../utils/classMaterialStorage');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function getAttendanceCategory(row) {
  const statusText = `${row.attStatus || ''} ${row.attRemarks || ''}`.trim().toLowerCase();

  if (!statusText) {
    return 'unknown';
  }

  if (/late/.test(statusText)) {
    return 'late';
  }

  if (/(absent|missing|excused|cut)/.test(statusText)) {
    return 'absent';
  }

  if (/(present|on[\s-]?time|complete|attended)/.test(statusText)) {
    return 'present';
  }

  return 'unknown';
}

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function toIsoString(value) {
  const timestamp = toTimestamp(value);
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function toIdString(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toHexString === 'function') {
    return value.toHexString();
  }

  return String(value);
}

function buildQuizRespondPath(quizId) {
  return `/quizzes/${encodeURIComponent(String(quizId || ''))}/respond`;
}

function buildClassRushRespondPath(assignmentId) {
  return `/classrush/assignments/${encodeURIComponent(String(assignmentId || ''))}`;
}

function normalizeStudentClassStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['draft', 'active', 'archived'].includes(normalized)) {
    return normalized;
  }
  return 'active';
}

function getClassScheduleText(classRow) {
  return String(classRow?.schedule || classRow?.scheduleDays || '').trim();
}

function getClassTimeText(classRow) {
  return String(classRow?.time || classRow?.scheduleTime || '').trim();
}

function getClassSortLabel(classRow) {
  return `${classRow?.classCode || 'Class'} ${classRow?.className || 'Class name unavailable'}`.trim();
}

function compareStudentClassRows(left, right) {
  const leftStatus = normalizeStudentClassStatus(left?.status);
  const rightStatus = normalizeStudentClassStatus(right?.status);
  const leftRank = leftStatus === 'active' ? 0 : leftStatus === 'draft' ? 1 : 2;
  const rightRank = rightStatus === 'active' ? 0 : rightStatus === 'draft' ? 1 : 2;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return getClassSortLabel(left).localeCompare(getClassSortLabel(right));
}

function serializeStudentClassSummary(classRow, classActivities = []) {
  const submittedCount = classActivities.filter((activity) => (
    activity.category === 'submitted' || activity.category === 'late'
  )).length;
  const overdueCount = classActivities.filter((activity) => activity.category === 'overdue').length;
  const nextDueActivity = classActivities
    .filter((activity) => (
      activity.category !== 'submitted'
      && activity.category !== 'late'
      && toTimestamp(activity.dueDate) > Date.now()
    ))
    .sort((left, right) => toTimestamp(left.dueDate) - toTimestamp(right.dueDate))[0] || null;

  return {
    classId: toIdString(classRow?._id),
    classCode: classRow?.classCode || 'Class',
    className: classRow?.className || 'Class name unavailable',
    status: normalizeStudentClassStatus(classRow?.status),
    instructorName: classRow?.instructorName || 'Instructor unavailable',
    schedule: getClassScheduleText(classRow),
    time: getClassTimeText(classRow),
    courseCode: String(classRow?.courseCode || '').trim(),
    section: String(classRow?.section || '').trim(),
    academicTerm: String(classRow?.academicTerm || '').trim(),
    room: String(classRow?.room || '').trim(),
    description: String(classRow?.description || '').trim(),
    activityCount: classActivities.length,
    submittedCount,
    overdueCount,
    nextDueAt: nextDueActivity?.dueDate || null
  };
}

async function serializeVisibleStudentMaterials(classRow) {
  const modulesById = new Map(
    (Array.isArray(classRow?.modules) ? classRow.modules : [])
      .map((moduleItem) => [String(moduleItem?.moduleId || ''), String(moduleItem?.title || '').trim()])
  );
  const materials = Array.isArray(classRow?.materials)
    ? classRow.materials
        .filter((item) => !item?.hidden)
        .map((item) => ({
          ...item,
          moduleTitle: item?.moduleId ? (modulesById.get(String(item.moduleId)) || '') : ''
        }))
        .sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0))
    : [];

  return serializeClassMaterials(materials);
}

function getAttemptSortTimestamp(attempt) {
  return toTimestamp(
    attempt?.submittedAt
    || attempt?.partialSaveAt
    || attempt?.updatedAt
    || attempt?.createdAt
  );
}

function getStudentActivityStatus({ startDate, dueDate, duePolicy, attempts }) {
  const now = Date.now();
  const startTimestamp = toTimestamp(startDate);
  const dueTimestamp = toTimestamp(dueDate);
  const normalizedDuePolicy = String(duePolicy || 'lock_after_due').trim();
  const normalizedAttempts = Array.isArray(attempts)
    ? attempts
      .slice()
      .sort((left, right) => getAttemptSortTimestamp(right) - getAttemptSortTimestamp(left))
    : [];

  const completedAttempts = normalizedAttempts.filter((attempt) => (
    Boolean(attempt?.isCompleted)
    || String(attempt?.status || '').trim() === 'submitted'
    || toTimestamp(attempt?.submittedAt) > 0
    || typeof attempt?.finalScore === 'number'
    || typeof attempt?.score === 'number'
  ));

  const latestCompletedAttempt = completedAttempts[0] || null;
  const latestAttempt = normalizedAttempts[0] || null;

  if (startTimestamp && startTimestamp > now) {
    return {
      status: 'Not Open Yet',
      category: 'scheduled',
      attemptCount: normalizedAttempts.length,
      completedAttemptCount: completedAttempts.length,
      finalScore: null,
      latestAttemptAt: null
    };
  }

  if (latestCompletedAttempt) {
    const submittedTimestamp = getAttemptSortTimestamp(latestCompletedAttempt);
    const isLate = dueTimestamp > 0 && submittedTimestamp > dueTimestamp;
    return {
      status: isLate ? 'Late Submitted' : 'Submitted',
      category: isLate ? 'late' : 'submitted',
      attemptCount: normalizedAttempts.length,
      completedAttemptCount: completedAttempts.length,
      finalScore: Number.isFinite(Number(latestCompletedAttempt.finalScore))
        ? Number(latestCompletedAttempt.finalScore)
        : Number.isFinite(Number(latestCompletedAttempt.score))
          ? Number(latestCompletedAttempt.score)
          : null,
      latestAttemptAt: submittedTimestamp ? new Date(submittedTimestamp).toISOString() : null
    };
  }

  if (latestAttempt) {
    const latestAttemptTimestamp = getAttemptSortTimestamp(latestAttempt);
    const isLateProgress = dueTimestamp && dueTimestamp < now && normalizedDuePolicy === 'allow_late_submission';
    return {
      status: isLateProgress ? 'Late In Progress' : 'In Progress',
      category: 'progress',
      attemptCount: normalizedAttempts.length,
      completedAttemptCount: completedAttempts.length,
      finalScore: null,
      latestAttemptAt: latestAttemptTimestamp ? new Date(latestAttemptTimestamp).toISOString() : null
    };
  }

  if (dueTimestamp && dueTimestamp < now) {
    return {
      status: normalizedDuePolicy === 'allow_late_submission' ? 'Late Available' : 'Overdue',
      category: 'overdue',
      attemptCount: 0,
      completedAttemptCount: 0,
      finalScore: null,
      latestAttemptAt: null
    };
  }

  return {
    status: 'Not Started',
    category: 'available',
    attemptCount: 0,
    completedAttemptCount: 0,
    finalScore: null,
    latestAttemptAt: null
  };
}

async function loadJoinedStudentClasses(database, studentIDNumber) {
  const classesCollection = database.collection('tblClasses');
  const classRows = await classesCollection.find({
    students: { $in: [studentIDNumber] }
  }).toArray();

  return classRows
    .slice()
    .sort(compareStudentClassRows);
}

async function buildStudentClassActivityData({
  database,
  studentIDNumber,
  userId,
  classRows
}) {
  if (!Array.isArray(classRows) || !classRows.length) {
    return {
      rows: [],
      classes: []
    };
  }

  const classQuizCollection = database.collection('tblClassQuizzes');
  const quizzesCollection = database.collection('tblQuizzes');
  const attemptsCollection = database.collection('tblAttempts');
  const liveGameAssignmentsCollection = database.collection('tblLiveGameAssignments');
  const liveGameAttemptsCollection = database.collection('tblLiveGameAttempts');
  const liveGamesCollection = database.collection('tblLiveGames');

  const classIds = classRows.map((row) => row._id);
  const assignments = await classQuizCollection.find({
    classId: { $in: classIds }
  }).toArray();

  const visibleAssignments = assignments.filter((assignment) => {
    if (Array.isArray(assignment.assignedStudents) && assignment.assignedStudents.length > 0) {
      return assignment.assignedStudents.includes(studentIDNumber);
    }
    return true;
  });

  const quizIds = [...new Set(
    visibleAssignments
      .map((assignment) => assignment.quizId)
      .filter(Boolean)
      .map((value) => value.toString())
  )]
    .filter((value) => ObjectId.isValid(value))
    .map((value) => new ObjectId(value));

  const quizzes = quizIds.length
    ? await quizzesCollection.find({ _id: { $in: quizIds } }).toArray()
    : [];

  const attemptFilters = [];
  if (userId && ObjectId.isValid(userId)) {
    attemptFilters.push({ studentId: new ObjectId(userId) });
  }
  if (userId) {
    attemptFilters.push({ studentId: userId });
  }
  attemptFilters.push({ studentIDNumber });

  const attempts = quizIds.length && attemptFilters.length
    ? await attemptsCollection.find({
      quizId: { $in: quizIds },
      $or: attemptFilters
    }).toArray()
    : [];

  const liveAssignments = await liveGameAssignmentsCollection.find({
    classId: { $in: classIds.map((row) => toIdString(row)) }
  }).toArray();

  const visibleLiveAssignments = liveAssignments.filter((assignment) => {
    if (Array.isArray(assignment.assignedStudents) && assignment.assignedStudents.length > 0) {
      return assignment.assignedStudents.includes(studentIDNumber);
    }
    return true;
  });

  const gameIds = [...new Set(
    visibleLiveAssignments
      .map((assignment) => String(assignment.gameId || '').trim())
      .filter(Boolean)
  )]
    .filter((value) => ObjectId.isValid(value))
    .map((value) => new ObjectId(value));

  const liveGames = gameIds.length
    ? await liveGamesCollection.find({ _id: { $in: gameIds } }).toArray()
    : [];

  const liveAssignmentIds = visibleLiveAssignments
    .map((assignment) => toIdString(assignment._id))
    .filter(Boolean);
  const liveAttempts = liveAssignmentIds.length
    ? await liveGameAttemptsCollection.find({
      assignmentId: { $in: liveAssignmentIds },
      $or: [
        { studentIDNumber },
        ...(userId ? [{ studentUserId: userId }] : [])
      ]
    }).toArray()
    : [];

  const classMap = new Map(
    classRows.map((row) => [
      toIdString(row._id),
      row
    ])
  );

  const quizMap = new Map(
    quizzes.map((quiz) => [
      toIdString(quiz._id),
      quiz
    ])
  );

  const liveGameMap = new Map(
    liveGames.map((game) => [
      toIdString(game._id),
      game
    ])
  );

  const attemptsByQuizId = new Map();
  attempts.forEach((attempt) => {
    const quizKey = attempt.quizId ? attempt.quizId.toString() : '';
    if (!quizKey) {
      return;
    }

    if (!attemptsByQuizId.has(quizKey)) {
      attemptsByQuizId.set(quizKey, []);
    }
    attemptsByQuizId.get(quizKey).push(attempt);
  });

  const liveAttemptsByAssignmentId = new Map();
  liveAttempts.forEach((attempt) => {
    const assignmentKey = String(attempt.assignmentId || '').trim();
    if (!assignmentKey) {
      return;
    }
    if (!liveAttemptsByAssignmentId.has(assignmentKey)) {
      liveAttemptsByAssignmentId.set(assignmentKey, []);
    }
    liveAttemptsByAssignmentId.get(assignmentKey).push(attempt);
  });

  const quizRows = visibleAssignments
    .map((assignment) => {
      const classKey = assignment.classId ? assignment.classId.toString() : '';
      const quizKey = assignment.quizId ? assignment.quizId.toString() : '';
      const classRow = classMap.get(classKey);
      const quizRow = quizMap.get(quizKey);
      const startDate = assignment.startDate || null;
      const dueDate = assignment.dueDate || quizRow?.dueDate || null;
      const status = getStudentActivityStatus({
        startDate,
        dueDate,
        duePolicy: 'lock_after_due',
        attempts: attemptsByQuizId.get(quizKey) || []
      });

      return {
        activityId: assignment._id ? assignment._id.toString() : `${classKey}-${quizKey}`,
        activityType: 'quiz',
        activityTitle: quizRow?.title || quizRow?.quizTitle || 'Untitled Quiz',
        activityDescription: quizRow?.description || '',
        classId: classKey,
        classCode: classRow?.classCode || 'Class',
        className: classRow?.className || 'Class name unavailable',
        schedule: getClassScheduleText(classRow),
        time: getClassTimeText(classRow),
        quizId: quizKey,
        quizTitle: quizRow?.title || quizRow?.quizTitle || 'Untitled Quiz',
        quizDescription: quizRow?.description || '',
        startDate: toIsoString(startDate),
        dueDate: toIsoString(dueDate),
        questionCount: Array.isArray(quizRow?.questions) ? quizRow.questions.length : 0,
        maxAttempts: Number.isFinite(Number(quizRow?.maxAttempts)) ? Number(quizRow.maxAttempts) : null,
        actionUrl: quizKey ? buildQuizRespondPath(quizKey) : '',
        status: status.status,
        category: status.category,
        attemptCount: status.attemptCount,
        completedAttemptCount: status.completedAttemptCount,
        finalScore: status.finalScore,
        latestAttemptAt: status.latestAttemptAt,
        _dueTimestamp: toTimestamp(dueDate)
      };
    });

  const classRushRows = visibleLiveAssignments.map((assignment) => {
    const assignmentId = toIdString(assignment._id);
    const classKey = String(assignment.classId || '').trim();
    const classRow = classMap.get(classKey);
    const gameRow = liveGameMap.get(String(assignment.gameId || '').trim()) || null;
    const startDate = assignment.startDate || null;
    const dueDate = assignment.dueDate || null;
    const status = getStudentActivityStatus({
      startDate,
      dueDate,
      duePolicy: assignment.duePolicy,
      attempts: liveAttemptsByAssignmentId.get(assignmentId) || []
    });

    return {
      activityId: assignmentId,
      activityType: 'classrush',
      activityTitle: assignment.gameTitle || gameRow?.title || 'Untitled ClassRush',
      activityDescription: assignment.gameDescription || gameRow?.description || 'Self-paced ClassRush assignment',
      classId: classKey,
      classCode: classRow?.classCode || assignment.classCode || 'Class',
      className: classRow?.className || assignment.className || 'Class name unavailable',
      schedule: getClassScheduleText(classRow),
      time: getClassTimeText(classRow),
      quizId: '',
      quizTitle: assignment.gameTitle || gameRow?.title || 'Untitled ClassRush',
      quizDescription: assignment.gameDescription || gameRow?.description || 'Self-paced ClassRush assignment',
      startDate: toIsoString(startDate),
      dueDate: toIsoString(dueDate),
      questionCount: Number(assignment.questionCount || (Array.isArray(gameRow?.questions) ? gameRow.questions.length : 0)),
      maxAttempts: 1,
      actionUrl: assignmentId ? buildClassRushRespondPath(assignmentId) : '',
      status: status.status,
      category: status.category,
      attemptCount: status.attemptCount,
      completedAttemptCount: status.completedAttemptCount,
      finalScore: status.finalScore,
      latestAttemptAt: status.latestAttemptAt,
      scoringProfile: String(assignment.scoringProfile || 'accuracy'),
      _dueTimestamp: toTimestamp(dueDate)
    };
  });

  const rows = [...quizRows, ...classRushRows]
    .sort((left, right) => {
      const classLabelLeft = `${left.classCode} ${left.className}`.trim();
      const classLabelRight = `${right.classCode} ${right.className}`.trim();
      const classCompare = classLabelLeft.localeCompare(classLabelRight);
      if (classCompare !== 0) {
        return classCompare;
      }

      const dueLeft = left._dueTimestamp || Number.MAX_SAFE_INTEGER;
      const dueRight = right._dueTimestamp || Number.MAX_SAFE_INTEGER;
      if (dueLeft !== dueRight) {
        return dueLeft - dueRight;
      }

      return String(left.activityTitle || '').localeCompare(String(right.activityTitle || ''));
    })
    .map(({ _dueTimestamp, ...row }) => row);

  const classes = classRows
    .map((row) => {
      const classId = toIdString(row._id);
      const classActivities = rows.filter((activity) => activity.classId === classId);
      return serializeStudentClassSummary(row, classActivities);
    })
    .sort(compareStudentClassRows);

  return {
    rows,
    classes
  };
}

function createStudentWebRoutes({
  client,
  isAuthenticated,
  getUsersCollection,
  getLogsCollection
}) {
  const router = express.Router();

  router.get('/api/student/attendance', isAuthenticated, async (req, res) => {
    const studentIDNumber = req.session?.studentIDNumber;

    if (!studentIDNumber) {
      return res.status(400).json({ success: false, message: 'Student ID is missing from the current session.' });
    }

    try {
      const attendanceCollection = client.db('myDatabase').collection('tblAttendance');
      const attendanceRows = await attendanceCollection.find({ studentIDNumber }).toArray();

      const rows = attendanceRows
        .map((row) => ({
          studentIDNumber: row.studentIDNumber || '',
          courseID: row.courseID || '',
          courseDescription: row.courseDescription || '',
          attDate: row.attDate || '',
          attTime: row.attTime || '',
          attRemarks: row.attRemarks || '',
          attStatus: row.attStatus || '',
          term: row.term || '',
          category: getAttendanceCategory(row),
          _sortTimestamp: parseAttendanceDateTime(row.attDate, row.attTime)
        }))
        .sort((left, right) => right._sortTimestamp - left._sortTimestamp)
        .map(({ _sortTimestamp, ...row }) => row);

      const courseMap = new Map();
      rows.forEach((row) => {
        const key = row.courseID || row.courseDescription;
        if (!key || courseMap.has(key)) {
          return;
        }
        courseMap.set(key, {
          courseID: row.courseID || '',
          courseDescription: row.courseDescription || ''
        });
      });

      const summary = {
        total: rows.length,
        present: rows.filter((row) => row.category === 'present').length,
        late: rows.filter((row) => row.category === 'late').length,
        absent: rows.filter((row) => row.category === 'absent').length,
        courseCount: courseMap.size,
        latestRecord: rows[0]
          ? {
              attDate: rows[0].attDate,
              attTime: rows[0].attTime,
              courseID: rows[0].courseID || '',
              courseDescription: rows[0].courseDescription || ''
            }
          : null
      };

      return res.json({
        success: true,
        studentIDNumber,
        courses: [...courseMap.values()],
        rows,
        summary
      });
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      return res.status(500).json({ success: false, message: 'Unable to load attendance records right now.' });
    }
  });

  router.get('/api/student/activities', isAuthenticated, async (req, res) => {
    const studentIDNumber = req.session?.studentIDNumber;
    const userId = req.session?.userId;

    if (!studentIDNumber) {
      return res.status(400).json({ success: false, message: 'Student ID is missing from the current session.' });
    }

    try {
      const database = client.db('myDatabase');
      const classRows = await loadJoinedStudentClasses(database, studentIDNumber);

      if (!classRows.length) {
        return res.json({
          success: true,
          studentIDNumber,
          classes: [],
          rows: [],
          summary: {
            totalActivities: 0,
            classCount: 0,
            submittedCount: 0,
            overdueCount: 0
          }
        });
      }

      const {
        rows,
        classes
      } = await buildStudentClassActivityData({
        database,
        studentIDNumber,
        userId,
        classRows
      });

      const summary = {
        totalActivities: rows.length,
        classCount: classes.filter((row) => row.activityCount > 0).length,
        submittedCount: rows.filter((row) => row.category === 'submitted' || row.category === 'late').length,
        overdueCount: rows.filter((row) => row.category === 'overdue').length
      };

      return res.json({
        success: true,
        studentIDNumber,
        classes,
        rows,
        summary
      });
    } catch (error) {
      console.error('Error fetching student activities:', error);
      return res.status(500).json({ success: false, message: 'Unable to load activities right now.' });
    }
  });

  router.get('/api/student/classes', isAuthenticated, async (req, res) => {
    const studentIDNumber = req.session?.studentIDNumber;
    const userId = req.session?.userId;

    if (!studentIDNumber) {
      return res.status(400).json({ success: false, message: 'Student ID is missing from the current session.' });
    }

    try {
      const database = client.db('myDatabase');
      const classRows = await loadJoinedStudentClasses(database, studentIDNumber);
      const {
        rows,
        classes
      } = await buildStudentClassActivityData({
        database,
        studentIDNumber,
        userId,
        classRows
      });

      const summary = {
        joinedClassCount: classes.length,
        activeClassCount: classes.filter((classItem) => classItem.status === 'active').length,
        classesWithActivitiesCount: classes.filter((classItem) => Number(classItem.activityCount || 0) > 0).length,
        overdueActivityCount: rows.filter((row) => row.category === 'overdue').length
      };

      return res.json({
        success: true,
        studentIDNumber,
        summary,
        classes
      });
    } catch (error) {
      console.error('Error fetching student classes:', error);
      return res.status(500).json({ success: false, message: 'Unable to load classes right now.' });
    }
  });

  router.get('/api/student/classes/:classId', isAuthenticated, async (req, res) => {
    const studentIDNumber = req.session?.studentIDNumber;
    const userId = req.session?.userId;
    const classId = String(req.params.classId || '').trim();

    if (!studentIDNumber) {
      return res.status(400).json({ success: false, message: 'Student ID is missing from the current session.' });
    }

    if (!classId) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    try {
      const database = client.db('myDatabase');
      const joinedClassRows = await loadJoinedStudentClasses(database, studentIDNumber);
      const targetClassRow = joinedClassRows.find((row) => toIdString(row._id) === classId);

      if (!targetClassRow) {
        return res.status(404).json({ success: false, message: 'Class not found.' });
      }

      const {
        rows,
        classes
      } = await buildStudentClassActivityData({
        database,
        studentIDNumber,
        userId,
        classRows: [targetClassRow]
      });

      const classItem = classes[0] || serializeStudentClassSummary(targetClassRow, []);
      const nextDue = rows
        .filter((row) => (
          row.category !== 'submitted'
          && row.category !== 'late'
          && toTimestamp(row.dueDate) > Date.now()
        ))
        .sort((left, right) => toTimestamp(left.dueDate) - toTimestamp(right.dueDate))[0] || null;

      const summary = {
        activityCount: rows.length,
        submittedCount: rows.filter((row) => row.category === 'submitted' || row.category === 'late').length,
        overdueCount: rows.filter((row) => row.category === 'overdue').length,
        nextDue: nextDue
          ? {
              quizTitle: nextDue.quizTitle,
              activityTitle: nextDue.activityTitle,
              dueDate: nextDue.dueDate,
              actionUrl: nextDue.actionUrl,
              status: nextDue.status
            }
          : null
      };
      const materials = await serializeVisibleStudentMaterials(targetClassRow);

      return res.json({
        success: true,
        studentIDNumber,
        classItem,
        summary,
        activities: rows,
        materials
      });
    } catch (error) {
      console.error('Error fetching student class detail:', error);
      return res.status(500).json({ success: false, message: 'Unable to load this class right now.' });
    }
  });

  router.post('/api/log-user', isAuthenticated, async (req, res) => {
    const { studentIDNumber } = req.session;
    const usersCollection = getUsersCollection();
    const logsCollection = getLogsCollection();

    try {
      if (!studentIDNumber) {
        return res.status(400).json({ success: false, message: 'Student ID is required to log user activity.' });
      }

      if (!usersCollection || !logsCollection) {
        return res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      }

      const user = await usersCollection.findOne(
        { studentIDNumber },
        { projection: { firstName: 1, lastName: 1 } }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const log = {
        studentIDNumber,
        name: `${user.firstName} ${user.lastName}`,
        timestamp: new Date(),
      };

      const result = await logsCollection.insertOne(log);
      if (result.acknowledged) {
        return res.json({ success: true, message: 'User activity logged successfully.' });
      }

      return res.status(500).json({ success: false, message: 'Failed to log user activity.' });
    } catch (error) {
      console.error('Error logging user activity:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}

module.exports = createStudentWebRoutes;
