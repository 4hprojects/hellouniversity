const express = require('express');
const { getDsaLessonBySlug, getDsaLessons } = require('../app/dsaContent');

const MAX_ATTEMPTS = 3;
const ATTEMPT_COOLDOWN_SECONDS = 5 * 60;

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function scorePercent(response) {
  const totalQuestions = Number(response.totalQuestions || 0);
  if (typeof response.scorePercent === 'number') return response.scorePercent;
  return totalQuestions ? Math.round((Number(response.score || 0) / totalQuestions) * 100) : 0;
}

function toAttemptSummary(response) {
  return {
    attemptId: response.attemptId || '',
    attemptNumber: Number(response.attemptNumber || response.attemptCount || 1),
    score: Number(response.score || 0),
    totalQuestions: Number(response.totalQuestions || 0),
    scorePercent: scorePercent(response),
    submittedAt: response.submittedAt || null,
    updatedAt: response.updatedAt || null,
    submittedAfterTimeLimit: response.submittedAfterTimeLimit === true,
    completionSeconds: Number(response.completionSeconds || 0),
    integritySummary: response.integritySummary || {},
    riskFlags: Array.isArray(response.riskFlags) ? response.riskFlags : []
  };
}

function groupResponsesByStudent(responses) {
  const groups = new Map();
  responses.forEach((response) => {
    const studentIDNumber = String(response.studentIDNumber || '').trim();
    if (!studentIDNumber) return;
    if (!groups.has(studentIDNumber)) groups.set(studentIDNumber, []);
    groups.get(studentIDNumber).push(response);
  });
  return groups;
}

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function getSelectedPattern(response) {
  return (Array.isArray(response.answers) ? response.answers : [])
    .map((answer) => `${answer.questionId}:${answer.selectedOptionId || ''}`)
    .join('|');
}

function getWrongPattern(response) {
  return (Array.isArray(response.answers) ? response.answers : [])
    .filter((answer) => answer.isCorrect === false)
    .map((answer) => `${answer.questionId}:${answer.selectedOptionId || ''}`)
    .join('|');
}

function buildSimilarityFlags(responses) {
  const answerPatternMap = new Map();
  const wrongPatternMap = new Map();
  responses.forEach((response) => {
    const answerPattern = getSelectedPattern(response);
    if (answerPattern) {
      if (!answerPatternMap.has(answerPattern)) answerPatternMap.set(answerPattern, new Set());
      answerPatternMap.get(answerPattern).add(String(response.studentIDNumber || ''));
    }
    const wrongPattern = getWrongPattern(response);
    if (wrongPattern) {
      if (!wrongPatternMap.has(wrongPattern)) wrongPatternMap.set(wrongPattern, new Set());
      wrongPatternMap.get(wrongPattern).add(String(response.studentIDNumber || ''));
    }
  });
  const flagsByStudent = new Map();
  function addFlag(studentIDNumber, flag) {
    if (!flagsByStudent.has(studentIDNumber)) flagsByStudent.set(studentIDNumber, []);
    flagsByStudent.get(studentIDNumber).push(flag);
  }
  answerPatternMap.forEach((studentIds) => {
    if (studentIds.size < 2) return;
    studentIds.forEach((studentIDNumber) => addFlag(studentIDNumber, {
      type: 'same_answer_pattern',
      severity: 'medium',
      message: `${studentIds.size} enrolled students share the same answer pattern.`
    }));
  });
  wrongPatternMap.forEach((studentIds) => {
    if (studentIds.size < 2) return;
    studentIds.forEach((studentIDNumber) => addFlag(studentIDNumber, {
      type: 'same_wrong_pattern',
      severity: 'medium',
      message: `${studentIds.size} enrolled students share the same wrong-answer pattern.`
    }));
  });
  return flagsByStudent;
}

function createTeacherClassDsaQuickChecksApiRoutes({
  getClassesCollection,
  getDsaQuickCheckResponsesCollection,
  getDsaQuickCheckIntegrityEventsCollection,
  ObjectId,
  isAuthenticated,
  isTeacherOrAdmin
}) {
  const router = express.Router();

  function depsOr503(res) {
    const classesCollection = getClassesCollection();
    const dsaQuickCheckResponsesCollection = getDsaQuickCheckResponsesCollection();
    const dsaQuickCheckIntegrityEventsCollection = getDsaQuickCheckIntegrityEventsCollection
      ? getDsaQuickCheckIntegrityEventsCollection()
      : null;
    if (!classesCollection || !dsaQuickCheckResponsesCollection || !dsaQuickCheckIntegrityEventsCollection) {
      res.status(503).json({ success: false, message: 'DSA Quick Check reports are unavailable right now.' });
      return null;
    }
    return { classesCollection, dsaQuickCheckResponsesCollection, dsaQuickCheckIntegrityEventsCollection };
  }

  function getTeacherClassFilter(req, classId) {
    const filter = { _id: new ObjectId(classId) };
    if (req.session?.role === 'admin') {
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

  async function loadDsaClass(req, res, classesCollection) {
    if (!ObjectId.isValid(req.params.classId)) {
      res.status(400).json({ success: false, message: 'Invalid class id.' });
      return null;
    }

    const classDoc = await classesCollection.findOne(getTeacherClassFilter(req, req.params.classId));
    if (!classDoc) {
      res.status(404).json({ success: false, message: 'Class not found.' });
      return null;
    }
    if (classDoc.dsaCourseEnabled !== true) {
      res.status(403).json({ success: false, message: 'Enable DSA Quick Checks for this class before viewing reports.' });
      return null;
    }

    return classDoc;
  }

  router.get('/:classId/dsa/quick-checks', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const classDoc = await loadDsaClass(req, res, deps.classesCollection);
    if (!classDoc) return;

    const enrolledStudentIds = Array.isArray(classDoc.students)
      ? classDoc.students.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const responses = enrolledStudentIds.length
      ? await deps.dsaQuickCheckResponsesCollection.find({
          source: 'dsa_quick_check',
          studentIDNumber: { $in: enrolledStudentIds }
        }).toArray()
      : [];

    const responseStudentIdsByLesson = new Map();
    const signalCountsByLesson = new Map();
    responses.forEach((response) => {
      const lessonSlug = String(response.lessonSlug || '');
      if (!responseStudentIdsByLesson.has(lessonSlug)) responseStudentIdsByLesson.set(lessonSlug, new Set());
      responseStudentIdsByLesson.get(lessonSlug).add(String(response.studentIDNumber || ''));
      if (!signalCountsByLesson.has(lessonSlug)) {
        signalCountsByLesson.set(lessonSlug, {
          studentsWithRiskFlags: new Set(),
          veryFastSubmissions: 0,
          afterTimeLimitSubmissions: 0,
          studentsAtMaxAttempts: new Set()
        });
      }
      const counts = signalCountsByLesson.get(lessonSlug);
      const riskFlags = Array.isArray(response.riskFlags) ? response.riskFlags : [];
      if (riskFlags.length) counts.studentsWithRiskFlags.add(String(response.studentIDNumber || ''));
      if (riskFlags.some((flag) => flag.type === 'very_fast_completion')) counts.veryFastSubmissions += 1;
      if (response.submittedAfterTimeLimit === true) counts.afterTimeLimitSubmissions += 1;
    });

    const groupedByLessonStudent = new Map();
    responses.forEach((response) => {
      const key = `${response.lessonSlug}:${response.studentIDNumber}`;
      groupedByLessonStudent.set(key, (groupedByLessonStudent.get(key) || 0) + 1);
    });
    groupedByLessonStudent.forEach((attemptCount, key) => {
      if (attemptCount < MAX_ATTEMPTS) return;
      const [lessonSlug, studentIDNumber] = key.split(':');
      if (!signalCountsByLesson.has(lessonSlug)) return;
      signalCountsByLesson.get(lessonSlug).studentsAtMaxAttempts.add(studentIDNumber);
    });

    return res.json({
      success: true,
      classItem: {
        _id: toIdString(classDoc._id),
        className: classDoc.className || 'Class',
        classCode: classDoc.classCode || '',
        dsaCourseEnabled: classDoc.dsaCourseEnabled === true,
        studentCount: enrolledStudentIds.length
      },
      lessons: getDsaLessons().map((lesson) => {
        const signalCounts = signalCountsByLesson.get(lesson.slug);
        return {
          slug: lesson.slug,
          title: lesson.title,
          number: lesson.number,
          section: lesson.section,
          href: lesson.href,
          submittedCount: responseStudentIdsByLesson.get(lesson.slug)?.size || 0,
          missingCount: Math.max(0, enrolledStudentIds.length - (responseStudentIdsByLesson.get(lesson.slug)?.size || 0)),
          signalCounts: {
            studentsWithRiskFlags: signalCounts?.studentsWithRiskFlags.size || 0,
            veryFastSubmissions: signalCounts?.veryFastSubmissions || 0,
            afterTimeLimitSubmissions: signalCounts?.afterTimeLimitSubmissions || 0,
            studentsAtMaxAttempts: signalCounts?.studentsAtMaxAttempts.size || 0
          }
        };
      })
    });
  });

  router.get('/:classId/dsa/quick-checks/:lessonSlug', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const classDoc = await loadDsaClass(req, res, deps.classesCollection);
    if (!classDoc) return;

    const lesson = getDsaLessonBySlug(req.params.lessonSlug);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'DSA lesson not found.' });
    }

    const enrolledStudentIds = Array.isArray(classDoc.students)
      ? classDoc.students.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const responses = enrolledStudentIds.length
      ? await deps.dsaQuickCheckResponsesCollection.find({
          source: 'dsa_quick_check',
          lessonSlug: lesson.slug,
          studentIDNumber: { $in: enrolledStudentIds }
        }).sort({ updatedAt: -1 }).toArray()
      : [];

    const groupedResponses = groupResponsesByStudent(responses);
    const similarityFlagsByStudent = buildSimilarityFlags(responses);
    const responseRows = Array.from(groupedResponses.entries()).map(([studentIDNumber, studentResponses]) => {
      const sortedAttempts = [...studentResponses].sort((left, right) => {
        const leftTime = new Date(left.submittedAt || left.updatedAt || 0).getTime();
        const rightTime = new Date(right.submittedAt || right.updatedAt || 0).getTime();
        return rightTime - leftTime;
      });
      const latest = sortedAttempts[0] || {};
      const best = sortedAttempts.reduce((currentBest, attempt) => {
        if (!currentBest) return attempt;
        if (scorePercent(attempt) > scorePercent(currentBest)) return attempt;
        if (scorePercent(attempt) === scorePercent(currentBest) && Number(attempt.score || 0) > Number(currentBest.score || 0)) return attempt;
        return currentBest;
      }, null);
      const latestSubmittedAt = latest.submittedAt ? new Date(latest.submittedAt) : null;
      const cooldownUntil = latestSubmittedAt ? addSeconds(latestSubmittedAt, ATTEMPT_COOLDOWN_SECONDS) : null;
      const isCoolingDown = Boolean(cooldownUntil && cooldownUntil.getTime() > Date.now());
      const riskFlags = Array.isArray(latest.riskFlags) ? latest.riskFlags : [];
      const similarityFlags = similarityFlagsByStudent.get(studentIDNumber) || [];
      return {
        studentIDNumber,
        studentName: latest.studentName || studentIDNumber || 'Student',
        answers: Array.isArray(latest.answers) ? latest.answers : [],
        submittedAt: latest.submittedAt || null,
        updatedAt: latest.updatedAt || null,
        startedAt: latest.startedAt || null,
        expiresAt: latest.expiresAt || null,
        timeLimitSeconds: Number(latest.timeLimitSeconds || 0),
        submittedAfterTimeLimit: latest.submittedAfterTimeLimit === true,
        attemptCount: sortedAttempts.length,
        maxAttempts: MAX_ATTEMPTS,
        remainingAttempts: Math.max(0, MAX_ATTEMPTS - sortedAttempts.length),
        cooldownUntil: isCoolingDown ? cooldownUntil : null,
        completionSeconds: Number(latest.completionSeconds || 0),
        integritySummary: latest.integritySummary || {},
        riskFlags,
        similarityFlags,
        reviewFlags: [...riskFlags, ...similarityFlags],
        latestScore: toAttemptSummary(latest),
        bestScore: best ? toAttemptSummary(best) : null,
        attempts: sortedAttempts.map(toAttemptSummary)
      };
    });

    return res.json({
      success: true,
      lesson: {
        slug: lesson.slug,
        title: lesson.title,
        number: lesson.number,
        section: lesson.section,
        questions: lesson.quickCheck.questions
      },
      classItem: {
        _id: toIdString(classDoc._id),
        className: classDoc.className || 'Class',
        classCode: classDoc.classCode || '',
        studentCount: enrolledStudentIds.length
      },
      responses: responseRows,
      missingStudentCount: Math.max(0, enrolledStudentIds.length - responseRows.length)
    });
  });

  return router;
}

module.exports = createTeacherClassDsaQuickChecksApiRoutes;
