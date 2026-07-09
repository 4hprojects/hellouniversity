const express = require('express');
const crypto = require('crypto');
const { getDsaLessonBySlug, getDsaLessons } = require('../app/dsaContent');

const QUICK_CHECK_QUESTION_COUNT = 5;
const QUICK_CHECK_TIME_LIMIT_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 3;
const ATTEMPT_COOLDOWN_SECONDS = 5 * 60;
const VERY_FAST_COMPLETION_SECONDS = 30;
const INTEGRITY_EVENT_FLAG_THRESHOLD = 3;
const ALLOWED_INTEGRITY_EVENT_TYPES = new Set([
  'copy_blocked',
  'cut_blocked',
  'context_menu_blocked',
  'select_start_blocked',
  'drag_start_blocked',
  'visibility_hidden',
  'visibility_visible',
  'window_blur',
  'window_focus',
  'late_submission'
]);
const COPY_CUT_EVENT_TYPES = new Set([
  'copy_blocked',
  'cut_blocked'
]);

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function getStudentName(req) {
  return `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim()
    || req.session?.studentIDNumber
    || 'Student';
}

function toStudentQuestion(question, optionOrder = null) {
  const rawOptions = Array.isArray(question.options) ? question.options : [];
  const optionsById = new Map(rawOptions.map((option) => [option.optionId || option.id, option]));
  const orderedOptions = Array.isArray(optionOrder) && optionOrder.length
    ? optionOrder.map((optionId) => optionsById.get(optionId)).filter(Boolean)
    : rawOptions;
  return {
    id: question.questionId || question.id,
    questionId: question.questionId || question.id,
    order: question.order,
    text: question.questionText || question.text,
    questionText: question.questionText || question.text,
    type: question.type || 'multiple_choice',
    options: orderedOptions
      .map((option, index) => ({
          id: option.optionId || option.id,
          optionId: option.optionId || option.id,
          label: optionLabelForIndex(index),
          text: option.text
        }))
  };
}

function toStudentResponse(response) {
  if (!response) return null;
  return {
    attemptId: response.attemptId || '',
    attemptNumber: Number(response.attemptNumber || response.attemptCount || 1),
    score: Number(response.score || 0),
    totalQuestions: Number(response.totalQuestions || QUICK_CHECK_QUESTION_COUNT),
    scorePercent: Number(response.scorePercent || 0),
    submittedAt: response.submittedAt || null,
    updatedAt: response.updatedAt || null,
    completionSeconds: Number(response.completionSeconds || 0),
    attemptCount: Number(response.attemptCount || response.attemptNumber || 1),
    submittedAfterTimeLimit: response.submittedAfterTimeLimit === true
  };
}

function toStudentAttemptHistory(response) {
  const totalQuestions = Number(response.totalQuestions || QUICK_CHECK_QUESTION_COUNT);
  return {
    attemptId: response.attemptId || '',
    attemptNumber: Number(response.attemptNumber || response.attemptCount || 1),
    score: Number(response.score || 0),
    totalQuestions,
    scorePercent: Number(response.scorePercent || (totalQuestions ? Math.round((Number(response.score || 0) / totalQuestions) * 100) : 0)),
    submittedAt: response.submittedAt || null,
    updatedAt: response.updatedAt || null,
    completionSeconds: Number(response.completionSeconds || 0),
    submittedAfterTimeLimit: response.submittedAfterTimeLimit === true
  };
}

function buildStudentSummary(responses) {
  const attempts = Array.isArray(responses) ? responses.map(toStudentAttemptHistory) : [];
  const latest = attempts[0] || null;
  const best = attempts.reduce((currentBest, attempt) => {
    if (!currentBest) return attempt;
    if (attempt.scorePercent > currentBest.scorePercent) return attempt;
    if (attempt.scorePercent === currentBest.scorePercent && attempt.score > currentBest.score) return attempt;
    return currentBest;
  }, null);
  return {
    attemptCount: attempts.length,
    latest,
    best
  };
}

function buildIntegrityMeta(req, assignment = null) {
  const studentIDNumber = String(req.session?.studentIDNumber || '').trim();
  const studentName = getStudentName(req);
  const attemptNumber = Number(assignment?.attemptNumber || 0);
  return {
    watermarkText: [
      studentName,
      studentIDNumber,
      attemptNumber ? `Attempt ${attemptNumber}` : ''
    ].filter(Boolean).join(' · ')
  };
}

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function shuffleArray(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function optionLabelForIndex(index) {
  return String.fromCharCode(65 + index);
}

function isAfterTimeLimit(now, assignment) {
  if (!assignment?.expiresAt) return false;
  return now.getTime() > new Date(assignment.expiresAt).getTime();
}

function createDsaQuickCheckRoutes({
  getDsaQuickCheckResponsesCollection,
  getDsaQuickCheckQuestionsCollection,
  getDsaQuickCheckAssignmentsCollection,
  getDsaQuickCheckIntegrityEventsCollection,
  isAuthenticated
}) {
  const router = express.Router();

  function depsOr503(res) {
    const dsaQuickCheckResponsesCollection = getDsaQuickCheckResponsesCollection();
    const dsaQuickCheckQuestionsCollection = getDsaQuickCheckQuestionsCollection();
    const dsaQuickCheckAssignmentsCollection = getDsaQuickCheckAssignmentsCollection();
    const dsaQuickCheckIntegrityEventsCollection = getDsaQuickCheckIntegrityEventsCollection
      ? getDsaQuickCheckIntegrityEventsCollection()
      : null;
    if (!dsaQuickCheckResponsesCollection || !dsaQuickCheckQuestionsCollection || !dsaQuickCheckAssignmentsCollection || !dsaQuickCheckIntegrityEventsCollection) {
      res.status(503).json({ success: false, message: 'DSA Quick Checks are unavailable right now.' });
      return null;
    }
    return {
      dsaQuickCheckResponsesCollection,
      dsaQuickCheckQuestionsCollection,
      dsaQuickCheckAssignmentsCollection,
      dsaQuickCheckIntegrityEventsCollection
    };
  }

  function randomQuestionSample(questions, count) {
    const remaining = [...questions];
    const selected = [];
    while (selected.length < count && remaining.length) {
      const index = crypto.randomInt(remaining.length);
      selected.push(remaining.splice(index, 1)[0]);
    }
    return selected;
  }

  function orderQuestionsByAssignment(questions, questionIds) {
    const byId = new Map(questions.map((question) => [question.questionId, question]));
    return questionIds.map((questionId) => byId.get(questionId)).filter(Boolean);
  }

  function toStudentQuestionsForAssignment(questions, assignment) {
    const questionOrder = Array.isArray(assignment.questionOrder) && assignment.questionOrder.length
      ? assignment.questionOrder
      : assignment.questionIds || [];
    const orderedQuestions = orderQuestionsByAssignment(questions, questionOrder);
    const optionOrderByQuestionId = assignment.optionOrderByQuestionId || {};
    return orderedQuestions.map((question) => toStudentQuestion(question, optionOrderByQuestionId[question.questionId]));
  }

  async function loadActiveQuestions(collection, lessonSlug) {
    return collection.find({ lessonSlug, status: 'active' }).sort({ questionId: 1 }).toArray();
  }

  async function loadStudentResponses(collection, lessonSlug, studentIDNumber) {
    return collection.find({
      lessonSlug,
      studentIDNumber,
      source: 'dsa_quick_check'
    }).sort({ submittedAt: -1, updatedAt: -1 }).toArray();
  }

  function buildAttemptPolicy({ responses, activeQuestions, activeAssignment, now = new Date() }) {
    const submittedAttempts = Array.isArray(responses) ? responses.length : 0;
    const latestResponse = Array.isArray(responses) ? responses[0] : null;
    const latestSubmittedAt = latestResponse?.submittedAt ? new Date(latestResponse.submittedAt) : null;
    const cooldownUntil = latestSubmittedAt ? addSeconds(latestSubmittedAt, ATTEMPT_COOLDOWN_SECONDS) : null;
    const isCoolingDown = Boolean(cooldownUntil && cooldownUntil.getTime() > now.getTime());
    const hasActiveAttempt = Boolean(activeAssignment);
    let startBlockedReason = null;

    if (!hasActiveAttempt && activeQuestions.length < QUICK_CHECK_QUESTION_COUNT) {
      startBlockedReason = 'question_bank_unavailable';
    } else if (!hasActiveAttempt && submittedAttempts >= MAX_ATTEMPTS) {
      startBlockedReason = 'max_attempts_reached';
    } else if (!hasActiveAttempt && isCoolingDown) {
      startBlockedReason = 'cooldown_active';
    }

    return {
      maxAttempts: MAX_ATTEMPTS,
      cooldownSeconds: ATTEMPT_COOLDOWN_SECONDS,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - submittedAttempts),
      submittedAttempts,
      cooldownUntil: isCoolingDown ? cooldownUntil : null,
      canStart: !startBlockedReason,
      startBlockedReason
    };
  }

  async function loadAttemptEvents(collection, attemptId) {
    if (!attemptId) return [];
    return collection.find({ attemptId, source: 'dsa_quick_check' }).sort({ createdAt: 1 }).toArray();
  }

  function summarizeIntegrityEvents(events) {
    const summary = {
      copyBlockedCount: 0,
      contextMenuBlockedCount: 0,
      selectStartBlockedCount: 0,
      dragStartBlockedCount: 0,
      visibilityHiddenCount: 0,
      windowBlurCount: 0,
      inactiveSeconds: 0,
      totalEvents: Array.isArray(events) ? events.length : 0
    };
    let inactiveStartedAt = null;
    (Array.isArray(events) ? events : []).forEach((event) => {
      if (COPY_CUT_EVENT_TYPES.has(event.eventType)) summary.copyBlockedCount += 1;
      if (event.eventType === 'context_menu_blocked') summary.contextMenuBlockedCount += 1;
      if (event.eventType === 'select_start_blocked') summary.selectStartBlockedCount += 1;
      if (event.eventType === 'drag_start_blocked') summary.dragStartBlockedCount += 1;
      if (event.eventType === 'visibility_hidden') {
        summary.visibilityHiddenCount += 1;
        inactiveStartedAt = new Date(event.createdAt || event.clientTime || Date.now());
      }
      if (event.eventType === 'window_blur') {
        summary.windowBlurCount += 1;
        inactiveStartedAt = inactiveStartedAt || new Date(event.createdAt || event.clientTime || Date.now());
      }
      if ((event.eventType === 'visibility_visible' || event.eventType === 'window_focus') && inactiveStartedAt) {
        const endedAt = new Date(event.createdAt || event.clientTime || Date.now());
        const elapsedSeconds = Math.max(0, Math.round((endedAt.getTime() - inactiveStartedAt.getTime()) / 1000));
        summary.inactiveSeconds += elapsedSeconds;
        inactiveStartedAt = null;
      }
    });
    return summary;
  }

  function buildRiskFlags({ completionSeconds, submittedAfterTimeLimit, integritySummary }) {
    const flags = [];
    if (completionSeconds >= 0 && completionSeconds < VERY_FAST_COMPLETION_SECONDS) {
      flags.push({
        type: 'very_fast_completion',
        severity: 'medium',
        message: `Submitted all answers in ${completionSeconds} seconds.`
      });
    }
    if (submittedAfterTimeLimit) {
      flags.push({
        type: 'after_time_limit',
        severity: 'low',
        message: 'Submitted after the soft time limit.'
      });
    }
    const inactiveEvents = Number(integritySummary.visibilityHiddenCount || 0) + Number(integritySummary.windowBlurCount || 0);
    if (inactiveEvents >= INTEGRITY_EVENT_FLAG_THRESHOLD) {
      flags.push({
        type: 'frequent_window_inactive',
        severity: 'medium',
        message: `${inactiveEvents} inactive-window events during the attempt.`
      });
    }
    const copyEvents = Number(integritySummary.copyBlockedCount || 0)
      + Number(integritySummary.contextMenuBlockedCount || 0)
      + Number(integritySummary.selectStartBlockedCount || 0)
      + Number(integritySummary.dragStartBlockedCount || 0);
    if (copyEvents >= INTEGRITY_EVENT_FLAG_THRESHOLD) {
      flags.push({
        type: 'high_copy_activity',
        severity: 'medium',
        message: `${copyEvents} blocked copy/select/context actions during the attempt.`
      });
    }
    return flags;
  }

  async function loadActiveAssignment(collection, lessonSlug, studentIDNumber) {
    return collection.findOne({
      lessonSlug,
      studentIDNumber,
      status: 'assigned',
      source: 'dsa_quick_check'
    });
  }

  function toStudentActiveAttempt(assignment) {
    if (!assignment) return null;
    return {
      attemptId: assignment.attemptId || '',
      attemptNumber: Number(assignment.attemptNumber || 1),
      status: assignment.status || 'assigned',
      startedAt: assignment.startedAt || assignment.assignedAt || null,
      expiresAt: assignment.expiresAt || null,
      timeLimitSeconds: Number(assignment.timeLimitSeconds || QUICK_CHECK_TIME_LIMIT_SECONDS),
      maxAttempts: Number(assignment.maxAttempts || MAX_ATTEMPTS),
      cooldownSeconds: Number(assignment.cooldownSeconds || ATTEMPT_COOLDOWN_SECONDS),
      assignedAt: assignment.assignedAt || null,
      serverTime: new Date()
    };
  }

  async function loadOrCreateActiveAssignment({ deps, lesson, studentIDNumber, req, activeQuestions }) {
    const existing = await loadActiveAssignment(deps.dsaQuickCheckAssignmentsCollection, lesson.slug, studentIDNumber);
    if (existing) {
      const patch = {};
      if (!existing.attemptId) patch.attemptId = crypto.randomUUID();
      if (!existing.attemptNumber) {
        const responses = await loadStudentResponses(deps.dsaQuickCheckResponsesCollection, lesson.slug, studentIDNumber);
        patch.attemptNumber = responses.length + 1;
      }
      if (!existing.startedAt || !existing.expiresAt || !existing.timeLimitSeconds) {
        const startedAt = existing.startedAt ? new Date(existing.startedAt) : new Date();
        const timeLimitSeconds = Number(existing.timeLimitSeconds || QUICK_CHECK_TIME_LIMIT_SECONDS);
        patch.startedAt = startedAt;
        patch.expiresAt = existing.expiresAt ? new Date(existing.expiresAt) : addSeconds(startedAt, timeLimitSeconds);
        patch.timeLimitSeconds = timeLimitSeconds;
      }
      const existingQuestionIds = Array.isArray(existing.questionIds) ? existing.questionIds : [];
      if (!Array.isArray(existing.questionOrder) || !existing.questionOrder.length) {
        patch.questionOrder = existingQuestionIds;
      }
      if (!existing.optionOrderByQuestionId || typeof existing.optionOrderByQuestionId !== 'object') {
        const activeById = new Map(activeQuestions.map((question) => [question.questionId, question]));
        patch.optionOrderByQuestionId = {};
        existingQuestionIds.forEach((questionId) => {
          const question = activeById.get(questionId);
          patch.optionOrderByQuestionId[questionId] = Array.isArray(question?.options)
            ? question.options.map((option) => option.optionId || option.id).filter(Boolean)
            : [];
        });
      }
      if (!existing.maxAttempts) patch.maxAttempts = MAX_ATTEMPTS;
      if (!existing.cooldownSeconds) patch.cooldownSeconds = ATTEMPT_COOLDOWN_SECONDS;
      if (Object.keys(patch).length) {
        await deps.dsaQuickCheckAssignmentsCollection.updateOne(
          { _id: existing._id },
          { $set: patch }
        );
        return { ...existing, ...patch };
      }
      return existing;
    }

    const responses = await loadStudentResponses(deps.dsaQuickCheckResponsesCollection, lesson.slug, studentIDNumber);
    const selectedQuestions = shuffleArray(randomQuestionSample(activeQuestions, QUICK_CHECK_QUESTION_COUNT));
    const questionOrder = selectedQuestions.map((question) => question.questionId);
    const optionOrderByQuestionId = {};
    selectedQuestions.forEach((question) => {
      optionOrderByQuestionId[question.questionId] = shuffleArray(Array.isArray(question.options)
        ? question.options.map((option) => option.optionId || option.id).filter(Boolean)
        : []);
    });
    const now = new Date();
    const expiresAt = addSeconds(now, QUICK_CHECK_TIME_LIMIT_SECONDS);
    const assignment = {
      attemptId: crypto.randomUUID(),
      lessonSlug: lesson.slug,
      lessonTitle: lesson.title,
      studentUserId: toIdString(req.session.userId),
      studentIDNumber,
      studentName: getStudentName(req),
      attemptNumber: responses.length + 1,
      questionIds: questionOrder,
      questionOrder,
      optionOrderByQuestionId,
      status: 'assigned',
      startedAt: now,
      expiresAt,
      timeLimitSeconds: QUICK_CHECK_TIME_LIMIT_SECONDS,
      maxAttempts: MAX_ATTEMPTS,
      cooldownSeconds: ATTEMPT_COOLDOWN_SECONDS,
      assignedAt: now,
      submittedAt: null,
      source: 'dsa_quick_check'
    };
    await deps.dsaQuickCheckAssignmentsCollection.updateOne(
      { attemptId: assignment.attemptId, source: 'dsa_quick_check' },
      { $set: assignment },
      { upsert: true }
    );
    return assignment;
  }

  router.get('/lessons/:lessonSlug/quick-check', isAuthenticated, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    if (req.session?.role !== 'student') {
      return res.status(403).json({ success: false, message: 'DSA Quick Checks are available to student accounts.' });
    }

    const lesson = getDsaLessonBySlug(req.params.lessonSlug);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'DSA lesson not found.' });
    }

    const studentIDNumber = String(req.session?.studentIDNumber || '').trim();
    if (!studentIDNumber) {
      return res.status(400).json({ success: false, message: 'Your student account is missing a student ID number.' });
    }

    const activeQuestions = await loadActiveQuestions(deps.dsaQuickCheckQuestionsCollection, lesson.slug);
    const responses = await loadStudentResponses(deps.dsaQuickCheckResponsesCollection, lesson.slug, studentIDNumber);
    const activeAssignment = await loadActiveAssignment(deps.dsaQuickCheckAssignmentsCollection, lesson.slug, studentIDNumber);
    const attemptPolicy = buildAttemptPolicy({ responses, activeQuestions, activeAssignment });

    return res.json({
      success: true,
      lesson: {
        slug: lesson.slug,
        title: lesson.title,
        href: lesson.href
      },
      activeAttempt: toStudentActiveAttempt(activeAssignment),
      assignment: null,
      questions: [],
      response: toStudentResponse(responses[0]),
      summary: buildStudentSummary(responses),
      history: responses.map(toStudentAttemptHistory),
      attemptPolicy,
      integrity: buildIntegrityMeta(req, activeAssignment),
      questionBank: {
        requiredQuestionCount: QUICK_CHECK_QUESTION_COUNT,
        activeQuestionCount: activeQuestions.length
      }
    });
  });

  router.post('/lessons/:lessonSlug/quick-check/start', isAuthenticated, express.json(), async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    if (req.session?.role !== 'student') {
      return res.status(403).json({ success: false, message: 'DSA Quick Checks are available to student accounts.' });
    }

    const lesson = getDsaLessonBySlug(req.params.lessonSlug);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'DSA lesson not found.' });
    }

    const studentIDNumber = String(req.session?.studentIDNumber || '').trim();
    if (!studentIDNumber) {
      return res.status(400).json({ success: false, message: 'Your student account is missing a student ID number.' });
    }

    const activeQuestions = await loadActiveQuestions(deps.dsaQuickCheckQuestionsCollection, lesson.slug);
    const existingActive = await loadActiveAssignment(deps.dsaQuickCheckAssignmentsCollection, lesson.slug, studentIDNumber);
    const responses = await loadStudentResponses(deps.dsaQuickCheckResponsesCollection, lesson.slug, studentIDNumber);
    const attemptPolicy = buildAttemptPolicy({
      responses,
      activeQuestions,
      activeAssignment: existingActive
    });
    if (activeQuestions.length < QUICK_CHECK_QUESTION_COUNT) {
      return res.status(409).json({
        success: false,
        message: 'This lesson Quick Check is not available yet. The question bank needs at least 5 active questions.',
        requiredQuestionCount: QUICK_CHECK_QUESTION_COUNT,
        activeQuestionCount: activeQuestions.length,
        attemptPolicy
      });
    }
    if (!existingActive && !attemptPolicy.canStart) {
      const reasonMessages = {
        max_attempts_reached: 'You have reached the maximum number of attempts for this lesson.',
        cooldown_active: 'Please wait for the cooldown before starting another attempt.',
        question_bank_unavailable: 'This lesson Quick Check is not available yet.'
      };
      return res.status(409).json({
        success: false,
        message: reasonMessages[attemptPolicy.startBlockedReason] || 'Unable to start this Quick Check right now.',
        attemptPolicy
      });
    }

    const assignment = await loadOrCreateActiveAssignment({ deps, lesson, studentIDNumber, req, activeQuestions });
    const assignedQuestions = toStudentQuestionsForAssignment(activeQuestions, assignment);
    if (assignedQuestions.length !== QUICK_CHECK_QUESTION_COUNT) {
      return res.status(409).json({ success: false, message: 'One or more assigned Quick Check questions are unavailable.' });
    }

    return res.json({
      success: true,
      mode: existingActive ? 'continue' : 'started',
      lesson: {
        slug: lesson.slug,
        title: lesson.title,
        href: lesson.href
      },
      assignment: toStudentActiveAttempt(assignment),
      questions: assignedQuestions,
      response: null,
      attemptPolicy: buildAttemptPolicy({ responses, activeQuestions, activeAssignment: assignment }),
      integrity: buildIntegrityMeta(req, assignment)
    });
  });

  router.put('/lessons/:lessonSlug/quick-check', isAuthenticated, express.json(), async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    if (req.session?.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only student accounts can submit DSA Quick Checks.' });
    }

    const lesson = getDsaLessonBySlug(req.params.lessonSlug);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'DSA lesson not found.' });
    }

    const studentIDNumber = String(req.session?.studentIDNumber || '').trim();
    if (!studentIDNumber) {
      return res.status(400).json({ success: false, message: 'Your student account is missing a student ID number.' });
    }

    const assignment = await loadActiveAssignment(deps.dsaQuickCheckAssignmentsCollection, lesson.slug, studentIDNumber);
    if (!assignment || !Array.isArray(assignment.questionIds) || assignment.questionIds.length < QUICK_CHECK_QUESTION_COUNT) {
      return res.status(400).json({ success: false, message: 'Start or continue the lesson Quick Check before submitting answers.' });
    }

    const activeQuestions = await loadActiveQuestions(deps.dsaQuickCheckQuestionsCollection, lesson.slug);
    const questionOrder = Array.isArray(assignment.questionOrder) && assignment.questionOrder.length
      ? assignment.questionOrder
      : assignment.questionIds;
    const questions = orderQuestionsByAssignment(activeQuestions, questionOrder);
    if (questions.length !== assignment.questionIds.length) {
      return res.status(409).json({ success: false, message: 'One or more assigned Quick Check questions are unavailable.' });
    }

    const rawAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const answers = questions.map((question) => {
      const matched = rawAnswers.find((item) => String(item?.questionId || item?.id || '') === question.questionId) || {};
      const selectedOptionId = String(matched.selectedOptionId || matched.optionId || '').trim();
      const selectedOption = Array.isArray(question.options)
        ? question.options.find((option) => option.optionId === selectedOptionId || option.id === selectedOptionId)
        : null;
      return {
        questionId: question.questionId,
        questionText: question.questionText,
        selectedOptionId: selectedOption?.optionId || selectedOption?.id || '',
        selectedOptionText: selectedOption?.text || '',
        answerText: selectedOption?.text || '',
        isCorrect: Boolean(selectedOption && selectedOption.isCorrect === true)
      };
    });

    if (!answers.every((answer) => answer.selectedOptionId)) {
      return res.status(400).json({ success: false, message: `Choose an answer for all ${QUICK_CHECK_QUESTION_COUNT} Quick Check questions before saving.` });
    }

    const now = new Date();
    const submittedAfterTimeLimit = isAfterTimeLimit(now, assignment);
    const startedAt = assignment.startedAt || assignment.assignedAt || null;
    const completionSeconds = startedAt
      ? Math.max(0, Math.round((now.getTime() - new Date(startedAt).getTime()) / 1000))
      : 0;
    const attemptEvents = await loadAttemptEvents(deps.dsaQuickCheckIntegrityEventsCollection, assignment.attemptId);
    if (submittedAfterTimeLimit && assignment.attemptId) {
      const lateEvent = {
        attemptId: assignment.attemptId,
        lessonSlug: lesson.slug,
        studentUserId: toIdString(req.session.userId),
        studentIDNumber,
        studentName: getStudentName(req),
        eventType: 'late_submission',
        eventLabel: 'Submitted after time limit',
        createdAt: now,
        clientTime: now,
        metadata: {},
        source: 'dsa_quick_check'
      };
      await deps.dsaQuickCheckIntegrityEventsCollection.insertOne(lateEvent);
      attemptEvents.push(lateEvent);
    }
    const integritySummary = summarizeIntegrityEvents(attemptEvents);
    const score = answers.filter((answer) => answer.isCorrect).length;
    const totalQuestions = questions.length;
    const scorePercent = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
    const attemptNumber = Number(assignment.attemptNumber || 1);
    const attemptId = assignment.attemptId || crypto.randomUUID();
    const doc = {
      attemptId,
      lessonSlug: lesson.slug,
      lessonTitle: lesson.title,
      studentUserId: toIdString(req.session.userId),
      studentIDNumber,
      studentName: getStudentName(req),
      attemptNumber,
      answers,
      score,
      totalQuestions,
      scorePercent,
      source: 'dsa_quick_check',
      timeLimitSeconds: Number(assignment.timeLimitSeconds || QUICK_CHECK_TIME_LIMIT_SECONDS),
      maxAttempts: Number(assignment.maxAttempts || MAX_ATTEMPTS),
      cooldownSeconds: Number(assignment.cooldownSeconds || ATTEMPT_COOLDOWN_SECONDS),
      startedAt,
      expiresAt: assignment.expiresAt || null,
      submittedAfterTimeLimit,
      completionSeconds,
      integritySummary,
      riskFlags: buildRiskFlags({ completionSeconds, submittedAfterTimeLimit, integritySummary }),
      submittedAt: now,
      updatedAt: now,
      attemptCount: attemptNumber
    };

    await deps.dsaQuickCheckResponsesCollection.updateOne(
      { attemptId, source: 'dsa_quick_check' },
      { $set: doc },
      { upsert: true }
    );
    await deps.dsaQuickCheckAssignmentsCollection.updateOne(
      assignment.attemptId
        ? { attemptId: assignment.attemptId, source: 'dsa_quick_check' }
        : { _id: assignment._id },
      {
        $set: {
          attemptId,
          status: 'submitted',
          submittedAt: now,
          submittedAfterTimeLimit,
          studentUserId: toIdString(req.session.userId),
          studentName: getStudentName(req)
        }
      }
    );

    const responses = await loadStudentResponses(deps.dsaQuickCheckResponsesCollection, lesson.slug, studentIDNumber);
    const attemptPolicy = buildAttemptPolicy({
      responses,
      activeQuestions,
      activeAssignment: null,
      now
    });

    return res.json({
      success: true,
      message: 'Quick Check submitted.',
      response: toStudentResponse(doc),
      summary: buildStudentSummary(responses),
      history: responses.map(toStudentAttemptHistory),
      attemptPolicy,
      activeAttempt: null,
      integrity: buildIntegrityMeta(req, null)
    });
  });

  router.post('/lessons/:lessonSlug/quick-check/integrity-events', isAuthenticated, express.json(), async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    if (req.session?.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only student accounts can log DSA Quick Check activity.' });
    }

    const lesson = getDsaLessonBySlug(req.params.lessonSlug);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'DSA lesson not found.' });
    }

    const studentIDNumber = String(req.session?.studentIDNumber || '').trim();
    if (!studentIDNumber) {
      return res.status(400).json({ success: false, message: 'Your student account is missing a student ID number.' });
    }

    const assignment = await loadActiveAssignment(deps.dsaQuickCheckAssignmentsCollection, lesson.slug, studentIDNumber);
    if (!assignment?.attemptId) {
      return res.status(400).json({ success: false, message: 'Start or continue the lesson Quick Check before logging activity.' });
    }

    const rawEvents = Array.isArray(req.body?.events) ? req.body.events.slice(0, 25) : [];
    const now = new Date();
    const docs = rawEvents
      .map((event) => ({
        eventType: String(event?.eventType || '').trim(),
        eventLabel: String(event?.eventLabel || '').trim(),
        clientTime: event?.clientTime ? new Date(event.clientTime) : now,
        metadata: event?.metadata && typeof event.metadata === 'object' ? event.metadata : {}
      }))
      .filter((event) => ALLOWED_INTEGRITY_EVENT_TYPES.has(event.eventType))
      .map((event) => ({
        attemptId: assignment.attemptId,
        lessonSlug: lesson.slug,
        studentUserId: toIdString(req.session.userId),
        studentIDNumber,
        studentName: getStudentName(req),
        eventType: event.eventType,
        eventLabel: event.eventLabel || event.eventType,
        createdAt: now,
        clientTime: Number.isNaN(event.clientTime.getTime()) ? now : event.clientTime,
        metadata: event.metadata,
        source: 'dsa_quick_check'
      }));

    for (const doc of docs) {
      await deps.dsaQuickCheckIntegrityEventsCollection.insertOne(doc);
    }

    return res.json({ success: true, storedCount: docs.length });
  });

  router.get('/lessons', (_req, res) => {
    return res.json({
      success: true,
      lessons: getDsaLessons().map((lesson) => ({
        slug: lesson.slug,
        title: lesson.title,
        href: lesson.href,
        section: lesson.section,
        number: lesson.number
      }))
    });
  });

  return router;
}

module.exports = createDsaQuickCheckRoutes;
