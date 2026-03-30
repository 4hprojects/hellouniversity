const {
  calculateScore,
  isAcceptedTextAnswer,
  normalizeGameQuestion,
  normalizeStoredGame,
  prepareHostedQuestions,
  sanitizeQuestionForPlayer
} = require('./liveGameHelpers');
const { normalizeLinkedClassSnapshot, toIdString } = require('./liveGameClassLinking');

const VALID_ASSIGNMENT_MODES = ['whole_class', 'selected_students'];
const VALID_DUE_POLICIES = ['lock_after_due', 'allow_late_submission'];
const VALID_SCORING_PROFILES = ['accuracy', 'timed_accuracy', 'live_scoring'];

function normalizeDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoString(value) {
  const date = normalizeDateValue(value);
  return date ? date.toISOString() : null;
}

function toTimestamp(value) {
  const date = normalizeDateValue(value);
  return date ? date.getTime() : 0;
}

function normalizeStudentIdList(values) {
  const seen = new Set();
  const list = Array.isArray(values)
    ? values
    : (values === undefined || values === null ? [] : [values]);

  return list.reduce((acc, value) => {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized)) return acc;
    seen.add(normalized);
    acc.push(normalized);
    return acc;
  }, []);
}

function normalizeAssignmentInput(body = {}) {
  const assignmentMode = VALID_ASSIGNMENT_MODES.includes(String(body.assignmentMode || '').trim())
    ? String(body.assignmentMode || '').trim()
    : 'whole_class';
  const duePolicy = VALID_DUE_POLICIES.includes(String(body.duePolicy || '').trim())
    ? String(body.duePolicy || '').trim()
    : 'lock_after_due';
  const scoringProfile = VALID_SCORING_PROFILES.includes(String(body.scoringProfile || '').trim())
    ? String(body.scoringProfile || '').trim()
    : 'timed_accuracy';

  return {
    classId: String(body.classId || '').trim(),
    assignmentMode,
    assignedStudents: normalizeStudentIdList(body.assignedStudents),
    startDate: normalizeDateValue(body.startDate),
    dueDate: normalizeDateValue(body.dueDate),
    duePolicy,
    scoringProfile
  };
}

function validateAssignmentInput(input, classDoc) {
  if (!input.classId) {
    return { valid: false, message: 'Choose a class before assigning this ClassRush game.' };
  }

  const rosterIds = normalizeStudentIdList(classDoc?.students);
  const rosterSet = new Set(rosterIds);

  if (input.assignmentMode === 'selected_students') {
    if (!input.assignedStudents.length) {
      return { valid: false, message: 'Choose at least one student for a selected-students assignment.' };
    }

    const invalidStudentId = input.assignedStudents.find((studentId) => !rosterSet.has(studentId));
    if (invalidStudentId) {
      return { valid: false, message: 'Selected students must belong to the chosen class.' };
    }
  }

  if (input.startDate && input.dueDate && input.dueDate.getTime() < input.startDate.getTime()) {
    return { valid: false, message: 'The due date must be later than the open date.' };
  }

  return { valid: true };
}

function getAssignmentTargetStudentIds(assignment, classDoc) {
  if (String(assignment?.assignmentMode || '').trim() === 'selected_students') {
    return normalizeStudentIdList(assignment?.assignedStudents);
  }
  return normalizeStudentIdList(classDoc?.students);
}

function isStudentAllowedForAssignment(assignment, classDoc, studentIDNumber) {
  const normalizedStudentId = String(studentIDNumber || '').trim();
  if (!normalizedStudentId) return false;

  const classRosterSet = new Set(normalizeStudentIdList(classDoc?.students));
  if (!classRosterSet.has(normalizedStudentId)) return false;

  if (String(assignment?.assignmentMode || '').trim() !== 'selected_students') {
    return true;
  }

  return normalizeStudentIdList(assignment?.assignedStudents).includes(normalizedStudentId);
}

function buildTeacherName(session = {}) {
  return [session.firstName, session.lastName].filter(Boolean).join(' ').trim() || 'Teacher';
}

function buildAssignmentDoc({ input, game, classDoc, teacherSession }) {
  const normalizedGame = normalizeStoredGame(game);
  const linkedClass = normalizeLinkedClassSnapshot(classDoc);
  const now = new Date();

  return {
    gameId: toIdString(normalizedGame._id),
    gameTitle: normalizedGame.title,
    gameDescription: normalizedGame.description || '',
    questionCount: Array.isArray(normalizedGame.questions) ? normalizedGame.questions.length : Number(normalizedGame.questionCount || 0),
    classId: linkedClass?.classId || input.classId,
    classCode: linkedClass?.classCode || '',
    className: linkedClass?.className || '',
    assignedStudents: input.assignmentMode === 'selected_students' ? input.assignedStudents.slice() : [],
    assignmentMode: input.assignmentMode,
    startDate: input.startDate,
    dueDate: input.dueDate,
    duePolicy: input.duePolicy,
    scoringProfile: input.scoringProfile,
    teacherUserId: String(teacherSession.userId || '').trim(),
    teacherName: buildTeacherName(teacherSession),
    createdAt: now,
    updatedAt: now
  };
}

function serializeAssignmentSummary(assignment) {
  return {
    assignmentId: toIdString(assignment?._id),
    gameId: String(assignment?.gameId || '').trim(),
    gameTitle: String(assignment?.gameTitle || '').trim(),
    classId: String(assignment?.classId || '').trim(),
    classCode: String(assignment?.classCode || '').trim(),
    className: String(assignment?.className || '').trim(),
    assignmentMode: String(assignment?.assignmentMode || 'whole_class'),
    assignedStudents: normalizeStudentIdList(assignment?.assignedStudents),
    startDate: toIsoString(assignment?.startDate),
    dueDate: toIsoString(assignment?.dueDate),
    duePolicy: String(assignment?.duePolicy || 'lock_after_due'),
    scoringProfile: String(assignment?.scoringProfile || 'accuracy'),
    questionCount: Number(assignment?.questionCount || 0),
    teacherName: String(assignment?.teacherName || '').trim(),
    createdAt: toIsoString(assignment?.createdAt),
    updatedAt: toIsoString(assignment?.updatedAt)
  };
}

function buildStudentName(userRow, fallbackId) {
  const fullName = [userRow?.firstName, userRow?.lastName].filter(Boolean).join(' ').trim();
  return fullName || String(fallbackId || '').trim() || 'Student';
}

function buildUserLookup(users = []) {
  return new Map(
    (Array.isArray(users) ? users : []).map((userRow) => [String(userRow?.studentIDNumber || '').trim(), userRow])
  );
}

function serializeAssignmentTargetClass(classDoc) {
  return {
    _id: toIdString(classDoc?._id),
    classCode: String(classDoc?.classCode || '').trim(),
    className: String(classDoc?.className || '').trim(),
    courseCode: String(classDoc?.courseCode || '').trim(),
    studentCount: normalizeStudentIdList(classDoc?.students).length
  };
}

function serializeAssignmentRoster(classDoc, users = []) {
  const userLookup = buildUserLookup(users);
  return normalizeStudentIdList(classDoc?.students).map((studentIDNumber) => {
    const userRow = userLookup.get(studentIDNumber) || null;
    return {
      studentIDNumber,
      name: buildStudentName(userRow, studentIDNumber)
    };
  });
}

function createAttemptQuestionsSnapshot(game) {
  const normalizedGame = normalizeStoredGame(game);
  return prepareHostedQuestions(normalizedGame.questions, normalizedGame.settings).map((question, index) => ({
    ...normalizeGameQuestion(question, index, normalizedGame.settings),
    order: index
  }));
}

function normalizeAttemptResponseEntry(response = {}) {
  return {
    questionIndex: Number(response.questionIndex || 0),
    questionId: String(response.questionId || '').trim(),
    questionType: String(response.questionType || '').trim(),
    answerId: response.answerId || response.optionId || null,
    submittedText: String(response.submittedText ?? response.answerText ?? '').trim() || null,
    timeMs: Math.max(0, Number.parseInt(response.timeMs, 10) || 0),
    answeredAt: response.answeredAt ? new Date(response.answeredAt) : null,
    correct: response.correct === true ? true : response.correct === false ? false : null,
    pointsAwarded: Number.isFinite(Number(response.pointsAwarded)) ? Number(response.pointsAwarded) : 0
  };
}

function evaluateQuestionResponse(question, response, scoringProfile, streak) {
  const normalizedQuestion = normalizeGameQuestion(question);
  const normalizedResponse = normalizeAttemptResponseEntry(response);
  const hasAnswer = Boolean(normalizedResponse.answerId || normalizedResponse.submittedText);

  if (!hasAnswer) {
    return {
      response: {
        ...normalizedResponse,
        questionId: normalizedQuestion.id,
        questionType: normalizedQuestion.type,
        answerId: null,
        submittedText: null,
        correct: null,
        pointsAwarded: 0
      },
      streak
    };
  }

  let correct = null;
  if (normalizedQuestion.type === 'type_answer') {
    correct = isAcceptedTextAnswer(normalizedQuestion, normalizedResponse.submittedText);
  } else if (normalizedQuestion.type === 'poll') {
    correct = null;
  } else {
    const correctOption = normalizedQuestion.options.find((option) => option.isCorrect);
    correct = Boolean(correctOption && correctOption.id === normalizedResponse.answerId);
  }

  let pointsAwarded = 0;
  let nextStreak = streak;

  if (normalizedQuestion.type !== 'poll') {
    if (scoringProfile === 'live_scoring') {
      const scoring = calculateScore(correct === true, normalizedResponse.timeMs, normalizedQuestion.timeLimitSeconds, streak);
      pointsAwarded = Number(scoring.points || 0);
    } else {
      pointsAwarded = correct === true ? 1 : 0;
    }

    if (correct === true) {
      nextStreak += 1;
    } else {
      nextStreak = 0;
    }
  }

  return {
    response: {
      ...normalizedResponse,
      questionId: normalizedQuestion.id,
      questionType: normalizedQuestion.type,
      correct,
      pointsAwarded
    },
    streak: nextStreak
  };
}

function evaluateAttempt(assignment, attempt) {
  const scoringProfile = String(assignment?.scoringProfile || 'accuracy');
  const questions = Array.isArray(attempt?.questions) ? attempt.questions.map((question, index) => normalizeGameQuestion(question, index)) : [];
  const responseMap = new Map(
    (Array.isArray(attempt?.responses) ? attempt.responses : []).map((response) => [Number(response.questionIndex || 0), normalizeAttemptResponseEntry(response)])
  );

  let score = 0;
  let correctCount = 0;
  let answeredCount = 0;
  let elapsedTimeMs = 0;
  let streak = 0;

  const evaluatedResponses = questions.map((question, index) => {
    const { response, streak: nextStreak } = evaluateQuestionResponse(question, {
      questionIndex: index,
      ...(responseMap.get(index) || {})
    }, scoringProfile, streak);

    if (response.answerId || response.submittedText) {
      answeredCount += 1;
      elapsedTimeMs += Number(response.timeMs || 0);
      if (response.correct === true) {
        correctCount += 1;
      }
      if (question.type !== 'poll') {
        score += Number(response.pointsAwarded || 0);
      }
    }

    streak = nextStreak;
    return response;
  });

  const scorableQuestionCount = questions.filter((question) => question.type !== 'poll').length;
  const percent = scorableQuestionCount > 0
    ? Number(((correctCount / scorableQuestionCount) * 100).toFixed(2))
    : null;

  return {
    responses: evaluatedResponses,
    score,
    correctCount,
    percent,
    elapsedTimeMs,
    answeredCount,
    questionCount: questions.length,
    unansweredCount: Math.max(0, questions.length - answeredCount)
  };
}

function compareSubmittedAttempts(left, right, scoringProfile) {
  const profile = String(scoringProfile || 'accuracy');
  if (profile === 'live_scoring') {
    if (Number(right.score || 0) !== Number(left.score || 0)) {
      return Number(right.score || 0) - Number(left.score || 0);
    }
    return Number(left.elapsedTimeMs || 0) - Number(right.elapsedTimeMs || 0);
  }

  if (Number(right.correctCount || 0) !== Number(left.correctCount || 0)) {
    return Number(right.correctCount || 0) - Number(left.correctCount || 0);
  }

  return Number(left.elapsedTimeMs || 0) - Number(right.elapsedTimeMs || 0);
}

function buildRankMap(attempts, scoringProfile) {
  const submittedAttempts = (Array.isArray(attempts) ? attempts : [])
    .filter((attempt) => String(attempt?.status || '').trim() === 'submitted')
    .slice()
    .sort((left, right) => compareSubmittedAttempts(left, right, scoringProfile));

  const rankMap = new Map();
  submittedAttempts.forEach((attempt, index) => {
    rankMap.set(toIdString(attempt._id), index + 1);
  });
  return rankMap;
}

function buildQuestionAnalytics(questions, attempts) {
  return questions.map((question, index) => {
    const responses = attempts
      .map((attempt) => {
        const response = Array.isArray(attempt.responses)
          ? attempt.responses.find((item) => Number(item.questionIndex || 0) === index)
          : null;
        return response && (response.answerId || response.submittedText) ? {
          ...response,
          playerName: attempt.studentName || 'Student',
          playerId: attempt.studentIDNumber || ''
        } : null;
      })
      .filter(Boolean);

    const answerCount = responses.length;
    const averageResponseTimeMs = answerCount
      ? Math.round(responses.reduce((sum, response) => sum + Number(response.timeMs || 0), 0) / answerCount)
      : null;
    const correctCount = responses.filter((response) => response.correct === true).length;
    const respondentIds = new Set(attempts.filter((attempt) => {
      const response = Array.isArray(attempt.responses)
        ? attempt.responses.find((item) => Number(item.questionIndex || 0) === index)
        : null;
      return Boolean(response && (response.answerId || response.submittedText));
    }).map((attempt) => String(attempt.studentIDNumber || '').trim()));
    const nonResponders = attempts
      .filter((attempt) => !respondentIds.has(String(attempt.studentIDNumber || '').trim()))
      .map((attempt) => attempt.studentName || attempt.studentIDNumber || 'Student');

    const optionDistribution = {};
    question.options.forEach((option) => {
      optionDistribution[option.id] = 0;
    });
    responses.forEach((response) => {
      if (response.answerId && optionDistribution[response.answerId] !== undefined) {
        optionDistribution[response.answerId] += 1;
      }
    });

    const submittedAnswersMap = new Map();
    responses.forEach((response) => {
      const key = String(response.submittedText || '').trim().toLowerCase();
      if (!key) return;
      if (!submittedAnswersMap.has(key)) {
        submittedAnswersMap.set(key, {
          normalizedText: key,
          submittedText: String(response.submittedText || '').trim(),
          count: 0,
          correctCount: 0
        });
      }
      const entry = submittedAnswersMap.get(key);
      entry.count += 1;
      if (response.correct === true) {
        entry.correctCount += 1;
      }
    });

    return {
      questionIndex: index,
      questionId: question.id,
      questionType: question.type,
      title: question.title,
      answerCount,
      correctCount: question.type === 'poll' ? null : correctCount,
      correctRate: question.type === 'poll'
        ? null
        : (answerCount > 0 ? Number((correctCount / answerCount).toFixed(4)) : 0),
      averageResponseTimeMs,
      nonResponderCount: nonResponders.length,
      nonResponders,
      acceptedAnswers: question.type === 'type_answer' ? question.acceptedAnswers.slice() : [],
      submittedAnswers: question.type === 'type_answer'
        ? [...submittedAnswersMap.values()].sort((left, right) => {
            if (right.count !== left.count) return right.count - left.count;
            return left.submittedText.localeCompare(right.submittedText);
          })
        : [],
      optionDistribution,
      options: Array.isArray(question.options)
        ? question.options.map((option) => ({ id: option.id, text: option.text, isCorrect: option.isCorrect === true }))
        : []
    };
  });
}

function buildAssignmentReport({ game, assignment, classDoc, users = [], attempts = [] }) {
  const normalizedGame = normalizeStoredGame(game);
  const questions = Array.isArray(normalizedGame.questions)
    ? normalizedGame.questions.map((question, index) => normalizeGameQuestion(question, index, normalizedGame.settings))
    : [];
  const targetStudentIds = getAssignmentTargetStudentIds(assignment, classDoc);
  const userLookup = buildUserLookup(users);
  const relevantAttempts = (Array.isArray(attempts) ? attempts : []).map((attempt) => ({
    ...attempt,
    studentIDNumber: String(attempt?.studentIDNumber || '').trim(),
    studentName: String(attempt?.studentName || '').trim() || buildStudentName(userLookup.get(String(attempt?.studentIDNumber || '').trim()), attempt?.studentIDNumber)
  }));
  const rankMap = buildRankMap(relevantAttempts, assignment?.scoringProfile);
  const attemptsByStudentId = new Map(relevantAttempts.map((attempt) => [attempt.studentIDNumber, attempt]));
  const now = Date.now();
  const dueTimestamp = toTimestamp(assignment?.dueDate);

  const targetStudents = targetStudentIds.map((studentIDNumber) => ({
    studentIDNumber,
    name: buildStudentName(userLookup.get(studentIDNumber), studentIDNumber)
  }));

  let submittedCount = 0;
  let inProgressCount = 0;
  let overdueCount = 0;

  targetStudents.forEach((student) => {
    const attempt = attemptsByStudentId.get(student.studentIDNumber);
    if (!attempt) {
      if (dueTimestamp && dueTimestamp < now) {
        overdueCount += 1;
      }
      return;
    }

    if (String(attempt.status || '') === 'submitted') {
      submittedCount += 1;
      return;
    }

    if (String(attempt.status || '') === 'in_progress') {
      inProgressCount += 1;
      if (dueTimestamp && dueTimestamp < now) {
        overdueCount += 1;
      }
      return;
    }

    if (dueTimestamp && dueTimestamp < now) {
      overdueCount += 1;
    }
  });

  const notStartedCount = Math.max(0, targetStudents.length - submittedCount - inProgressCount);
  const submittedAttempts = relevantAttempts
    .filter((attempt) => String(attempt.status || '') === 'submitted')
    .slice()
    .sort((left, right) => compareSubmittedAttempts(left, right, assignment?.scoringProfile))
    .map((attempt) => ({
      studentIDNumber: attempt.studentIDNumber,
      studentName: attempt.studentName,
      score: Number(attempt.score || 0),
      correctCount: Number(attempt.correctCount || 0),
      percent: Number.isFinite(Number(attempt.percent)) ? Number(attempt.percent) : null,
      elapsedTimeMs: Number(attempt.elapsedTimeMs || 0),
      submittedAt: toIsoString(attempt.submittedAt),
      rank: rankMap.get(toIdString(attempt._id)) || null,
      isLate: attempt.isLateSubmission === true
    }));

  const playerRows = targetStudents.map((student) => {
    const attempt = attemptsByStudentId.get(student.studentIDNumber) || null;
    return {
      studentIDNumber: student.studentIDNumber,
      studentName: student.name,
      status: attempt ? String(attempt.status || 'in_progress') : 'not_started',
      startedAt: toIsoString(attempt?.startedAt),
      submittedAt: toIsoString(attempt?.submittedAt),
      score: Number.isFinite(Number(attempt?.score)) ? Number(attempt.score) : null,
      correctCount: Number.isFinite(Number(attempt?.correctCount)) ? Number(attempt.correctCount) : 0,
      percent: Number.isFinite(Number(attempt?.percent)) ? Number(attempt.percent) : null,
      elapsedTimeMs: Number.isFinite(Number(attempt?.elapsedTimeMs)) ? Number(attempt.elapsedTimeMs) : null,
      rank: attempt ? (rankMap.get(toIdString(attempt._id)) || null) : null,
      isLate: attempt?.isLateSubmission === true,
      unansweredCount: Number.isFinite(Number(attempt?.unansweredCount)) ? Number(attempt.unansweredCount) : questions.length
    };
  });

  return {
    summary: {
      assignmentId: toIdString(assignment?._id),
      gameId: String(assignment?.gameId || ''),
      gameTitle: normalizedGame.title,
      classId: String(assignment?.classId || ''),
      classCode: String(assignment?.classCode || ''),
      className: String(assignment?.className || ''),
      assignmentMode: String(assignment?.assignmentMode || 'whole_class'),
      startDate: toIsoString(assignment?.startDate),
      dueDate: toIsoString(assignment?.dueDate),
      duePolicy: String(assignment?.duePolicy || 'lock_after_due'),
      scoringProfile: String(assignment?.scoringProfile || 'accuracy'),
      targetStudentCount: targetStudents.length,
      submittedCount,
      inProgressCount,
      notStartedCount,
      overdueCount,
      questionCount: questions.length,
      showLeaderboard: String(assignment?.scoringProfile || 'accuracy') !== 'accuracy'
    },
    leaderboard: String(assignment?.scoringProfile || 'accuracy') === 'accuracy' ? [] : submittedAttempts,
    questionAnalytics: buildQuestionAnalytics(questions, submittedAttempts.map((entry) => {
      const attempt = attemptsByStudentId.get(entry.studentIDNumber);
      return {
        ...attempt,
        studentName: entry.studentName
      };
    })),
    studentResults: playerRows
  };
}

function getStudentAssignmentAvailability(assignment, attempt) {
  const now = Date.now();
  const startTimestamp = toTimestamp(assignment?.startDate);
  const dueTimestamp = toTimestamp(assignment?.dueDate);
  const duePolicy = String(assignment?.duePolicy || 'lock_after_due');

  if (startTimestamp && startTimestamp > now) {
    return {
      state: 'scheduled',
      allowed: false,
      message: 'This ClassRush assignment is not open yet.'
    };
  }

  if (String(attempt?.status || '') === 'submitted') {
    return {
      state: 'submitted',
      allowed: true,
      message: ''
    };
  }

  if (dueTimestamp && dueTimestamp < now && duePolicy === 'lock_after_due') {
    return {
      state: 'locked',
      allowed: false,
      message: 'This ClassRush assignment is closed because its due date has passed.'
    };
  }

  if (dueTimestamp && dueTimestamp < now && duePolicy === 'allow_late_submission') {
    return {
      state: 'late',
      allowed: true,
      message: 'This ClassRush assignment is past due, but late submission is still allowed.'
    };
  }

  return {
    state: 'open',
    allowed: true,
    message: ''
  };
}

function buildStudentAssignmentPayload({ game, assignment, attempt, rankMap }) {
  const normalizedGame = normalizeStoredGame(game);
  const evaluatedAttempt = evaluateAttempt(assignment, attempt);
  const scoringProfile = String(assignment?.scoringProfile || 'accuracy');
  const attemptId = attempt?._id ? toIdString(attempt._id) : '';
  const rank = scoringProfile === 'accuracy' ? null : (rankMap.get(attemptId) || null);

  return {
    assignment: {
      assignmentId: toIdString(assignment?._id),
      gameId: toIdString(normalizedGame?._id),
      title: normalizedGame.title,
      description: normalizedGame.description || '',
      classId: String(assignment?.classId || ''),
      classCode: String(assignment?.classCode || ''),
      className: String(assignment?.className || ''),
      startDate: toIsoString(assignment?.startDate),
      dueDate: toIsoString(assignment?.dueDate),
      duePolicy: String(assignment?.duePolicy || 'lock_after_due'),
      scoringProfile,
      questionCount: evaluatedAttempt.questionCount,
      linkedClass: normalizeLinkedClassSnapshot({ _id: assignment?.classId, classCode: assignment?.classCode, className: assignment?.className })
    },
    attempt: {
      attemptId,
      status: String(attempt?.status || 'in_progress'),
      currentQuestionIndex: Number.isFinite(Number(attempt?.currentQuestionIndex)) ? Number(attempt.currentQuestionIndex) : 0,
      startedAt: toIsoString(attempt?.startedAt),
      updatedAt: toIsoString(attempt?.updatedAt),
      submittedAt: toIsoString(attempt?.submittedAt),
      score: evaluatedAttempt.score,
      correctCount: evaluatedAttempt.correctCount,
      percent: evaluatedAttempt.percent,
      elapsedTimeMs: evaluatedAttempt.elapsedTimeMs,
      answeredCount: evaluatedAttempt.answeredCount,
      unansweredCount: evaluatedAttempt.unansweredCount,
      rank,
      showRank: scoringProfile !== 'accuracy',
      isLateSubmission: attempt?.isLateSubmission === true,
      responses: evaluatedAttempt.responses.map((response) => ({
        questionIndex: response.questionIndex,
        answerId: response.answerId || null,
        submittedText: response.submittedText || null,
        timeMs: Number(response.timeMs || 0)
      }))
    },
    questions: (Array.isArray(attempt?.questions) ? attempt.questions : []).map((question) => sanitizeQuestionForPlayer(question))
  };
}

module.exports = {
  VALID_ASSIGNMENT_MODES,
  VALID_DUE_POLICIES,
  VALID_SCORING_PROFILES,
  buildAssignmentDoc,
  buildAssignmentReport,
  buildRankMap,
  buildStudentAssignmentPayload,
  createAttemptQuestionsSnapshot,
  evaluateAttempt,
  getAssignmentTargetStudentIds,
  getStudentAssignmentAvailability,
  isStudentAllowedForAssignment,
  normalizeAssignmentInput,
  normalizeStudentIdList,
  serializeAssignmentRoster,
  serializeAssignmentSummary,
  serializeAssignmentTargetClass,
  toIsoString,
  toTimestamp,
  validateAssignmentInput
};
