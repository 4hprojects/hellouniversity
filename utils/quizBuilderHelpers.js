/**
 * Pure helper functions for the quiz builder.
 * These have no closure dependencies and can be imported and unit-tested independently.
 */

const {
  createDefaultSection,
  isObjectiveQuestion,
  normalizeChoiceOptions,
  normalizeCorrectAnswers,
  normalizeQuestionType,
  normalizeResponseValidation,
  resolveQuestionPoints,
  sanitizeText
} = require('./quizSections');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_STATUSES = new Set(['draft', 'published', 'closed', 'archived']);
const ALLOWED_TYPES = new Set(['practice', 'graded', 'survey', 'exit_ticket', 'assignment_check']);
const ALLOWED_QUESTION_TYPES = new Set(['multiple_choice', 'checkbox', 'short_answer', 'paragraph', 'true_false']);

function getShortAnswerValidationError(responseValidation = {}) {
  const normalized = normalizeResponseValidation(responseValidation);
  const hasAnyInput = Boolean(
    normalized.category
    || normalized.operator
    || normalized.value
    || normalized.secondaryValue
    || normalized.customErrorText
  );
  if (!hasAnyInput) {
    return null;
  }
  if (!normalized.category) {
    return 'Choose a response validation type.';
  }
  if (!normalized.operator) {
    return 'Choose a response validation rule.';
  }

  const validateNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const validateInteger = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  };

  if (['gt', 'gte', 'lt', 'lte', 'eq', 'neq'].includes(normalized.operator)) {
    if (validateNumber(normalized.value) == null) {
      return 'Enter a valid number for response validation.';
    }
  }

  if (['between', 'not_between'].includes(normalized.operator)) {
    const first = validateNumber(normalized.value);
    const second = validateNumber(normalized.secondaryValue);
    if (first == null || second == null) {
      return 'Enter valid numbers for the selected range rule.';
    }
    if (first > second) {
      return 'The first range value cannot be greater than the second.';
    }
  }

  if (['max_char_count', 'min_char_count'].includes(normalized.operator)) {
    if (validateInteger(normalized.value) == null) {
      return 'Enter a whole number greater than or equal to zero.';
    }
  }

  if (normalized.category === 'text' && ['contains', 'not_contains'].includes(normalized.operator) && !normalized.value) {
    return 'Enter a validation value.';
  }

  if (normalized.category === 'regex') {
    if (!normalized.value) {
      return 'Enter a validation value.';
    }
    try {
      new RegExp(normalized.value);
    } catch (error) {
      return 'Enter a valid regular expression pattern.';
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ALLOWED_STATUSES.has(normalized) ? normalized : 'draft';
}

function normalizeQuizType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ALLOWED_TYPES.has(normalized) ? normalized : 'graded';
}

function normalizeQuestionTypeValue(value) {
  const normalized = normalizeQuestionType(value);
  return ALLOWED_QUESTION_TYPES.has(normalized) ? normalized : 'multiple_choice';
}

function normalizeEditableStatus(value) {
  const normalized = normalizeStatus(value);
  return normalized === 'published' ? 'draft' : normalized;
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ---------------------------------------------------------------------------
// Actor / logging helpers
// ---------------------------------------------------------------------------

function formatActorName(req) {
  const fullName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim();
  return fullName || req.session?.studentIDNumber || 'Teacher';
}

async function writeLog(logsCollection, req, action, quizDoc, details) {
  if (!logsCollection) return;

  await logsCollection.insertOne({
    timestamp: new Date(),
    action,
    studentIDNumber: req.session?.studentIDNumber || null,
    name: formatActorName(req),
    quizId: quizDoc?._id || null,
    quizTitle: quizDoc?.title || quizDoc?.quizTitle || null,
    details
  });
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

function createUniqueId(baseValue, seenIds, prefix, index) {
  const base = sanitizeText(baseValue) || `${prefix}-${index + 1}`;
  let candidate = base;
  let suffix = 2;

  while (seenIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  seenIds.add(candidate);
  return candidate;
}

function sanitizeSections(rawSections = []) {
  const sectionsInput = Array.isArray(rawSections) && rawSections.length
    ? rawSections
    : [createDefaultSection(0)];
  const seenIds = new Set();

  return sectionsInput
    .map((section, index) => ({
      id: createUniqueId(section?.id, seenIds, 'section', index),
      title: sanitizeText(section?.title),
      description: sanitizeText(section?.description),
      order: Number.isFinite(Number(section?.order)) ? Number(section.order) : index,
      _sourceIndex: index
    }))
    .sort((left, right) => (
      left.order - right.order
      || left._sourceIndex - right._sourceIndex
    ))
    .map((section, index) => ({
      id: section.id,
      title: section.title || `Section ${index + 1}`,
      description: section.description,
      order: index
    }));
}

function orderQuestionsBySection(questions, sections) {
  const sectionOrder = new Map(sections.map((section, index) => [section.id, index]));
  const nextOrderBySection = new Map();

  return questions
    .slice()
    .sort((left, right) => (
      (sectionOrder.get(left.sectionId) ?? Number.MAX_SAFE_INTEGER)
        - (sectionOrder.get(right.sectionId) ?? Number.MAX_SAFE_INTEGER)
      || left.order - right.order
      || left._sourceIndex - right._sourceIndex
    ))
    .map((question) => {
      const nextOrder = nextOrderBySection.get(question.sectionId) || 0;
      nextOrderBySection.set(question.sectionId, nextOrder + 1);

      return {
        id: question.id,
        sectionId: question.sectionId,
        order: nextOrder,
        type: question.type,
        title: question.title,
        description: question.description,
        required: question.required,
        points: question.points,
        options: question.options,
        correctAnswers: question.correctAnswers,
        allowMultiple: question.allowMultiple,
        caseSensitive: question.caseSensitive,
        responseValidation: question.responseValidation,
        feedbackCorrect: question.feedbackCorrect,
        feedbackIncorrect: question.feedbackIncorrect
      };
    });
}

function sanitizeQuestions(rawQuestions = [], sections = []) {
  if (!Array.isArray(rawQuestions)) return [];

  const sectionIds = new Set(sections.map((section) => section.id));
  const defaultSectionId = sections[0]?.id || createDefaultSection(0).id;
  const usingImplicitDefaultSection = !(Array.isArray(rawQuestions) && Array.isArray(sections) && sections.length > 1)
    && Array.isArray(sections)
    && sections.length === 1
    && sections[0].id === defaultSectionId;
  const seenIds = new Set();

  const normalizedQuestions = rawQuestions.map((question, index) => {
    const type = normalizeQuestionTypeValue(question?.type);
    const options = normalizeChoiceOptions(question || {}, type);
    const correctAnswers = normalizeCorrectAnswers(question || {}, type, options);
    const requestedSectionId = sanitizeText(question?.sectionId);
    const sectionId = usingImplicitDefaultSection && !requestedSectionId
      ? defaultSectionId
      : requestedSectionId || defaultSectionId;

    return {
      id: createUniqueId(question?.id, seenIds, 'question', index),
      sectionId,
      order: Number.isFinite(Number(question?.order)) ? Number(question.order) : index,
      type,
      title: sanitizeText(question?.title),
      description: sanitizeText(question?.description),
      required: question?.required !== false,
      points: Math.max(0, Number(resolveQuestionPoints(question))),
      options,
      correctAnswers,
      allowMultiple: type === 'checkbox',
      caseSensitive: Boolean(question?.caseSensitive),
      responseValidation: type === 'short_answer'
        ? normalizeResponseValidation(question?.responseValidation)
        : normalizeResponseValidation({}),
      feedbackCorrect: sanitizeText(question?.feedbackCorrect),
      feedbackIncorrect: sanitizeText(question?.feedbackIncorrect),
      _sourceIndex: index,
      _sectionExists: sectionIds.has(sectionId)
    };
  });

  return orderQuestionsBySection(normalizedQuestions, sections);
}

function sanitizeSettings(settings = {}) {
  return {
    requireLogin: settings.requireLogin !== false,
    oneResponsePerStudent: settings.oneResponsePerStudent !== false,
    showScoreMode: ['immediate', 'after_review', 'hidden'].includes(settings.showScoreMode)
      ? settings.showScoreMode
      : 'after_review',
    randomizeQuestionOrder: Boolean(settings.randomizeQuestionOrder),
    randomizeOptionOrder: Boolean(settings.randomizeOptionOrder),
    autoSaveProgress: settings.autoSaveProgress !== false,
    startAt: parseDateValue(settings.startAt),
    endAt: parseDateValue(settings.endAt),
    timeLimitMinutes: settings.timeLimitMinutes ? Math.max(0, Number(settings.timeLimitMinutes)) : null
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateQuizPayload(payload) {
  if (!payload.title) {
    return 'Quiz title is required.';
  }
  if (payload.title.length > 180) {
    return 'Quiz title is too long.';
  }
  if (!payload.questions.length) {
    return 'Add at least one question before saving.';
  }
  if (payload.settings.startAt && payload.settings.endAt && payload.settings.startAt > payload.settings.endAt) {
    return 'Start date must be before end date.';
  }

  const sectionIds = new Set(payload.sections.map((section) => section.id));

  for (let index = 0; index < payload.questions.length; index += 1) {
    const question = payload.questions[index];
    if (!question.title) {
      return `Question ${index + 1} requires a title.`;
    }

    if (!sectionIds.has(question.sectionId)) {
      return `Question ${index + 1} belongs to an invalid section.`;
    }

    if (isObjectiveQuestion(question.type) && question.options.length < 2) {
      return `Question ${index + 1} needs at least 2 options.`;
    }

    if (question.type === 'multiple_choice' && question.correctAnswers.length !== 1) {
      return `Question ${index + 1} needs exactly 1 correct answer.`;
    }

    if (question.type === 'checkbox' && question.correctAnswers.length < 2) {
      return `Question ${index + 1} needs at least 2 correct answers.`;
    }

    if (question.type === 'true_false' && question.correctAnswers.length !== 1) {
      return `Question ${index + 1} needs a true or false answer.`;
    }

    if (question.type === 'short_answer') {
      const validationError = getShortAnswerValidationError(question.responseValidation);
      if (validationError) {
        return `Question ${index + 1}: ${validationError}`;
      }
    }

    if (isObjectiveQuestion(question.type) && question.correctAnswers.some((answer) => !question.options.includes(answer))) {
      return `Question ${index + 1} has a correct answer that does not match an option.`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Input mapping
// ---------------------------------------------------------------------------

function mapQuizInput(body = {}) {
  const sections = sanitizeSections(body.sections);
  const questions = sanitizeQuestions(body.questions, sections);
  const totalPoints = questions.reduce((sum, question) => sum + Number(question.points || 0), 0);
  const settings = sanitizeSettings(body.settings);

  return {
    title: sanitizeText(body.title || body.quizTitle),
    description: sanitizeText(body.description),
    subject: sanitizeText(body.subject),
    classId: sanitizeText(body.classId) || null,
    classLabel: sanitizeText(body.classLabel) || null,
    type: normalizeQuizType(body.type),
    status: normalizeEditableStatus(body.status),
    sections,
    questions,
    questionCount: questions.length,
    totalPoints,
    settings
  };
}

function toLegacyQuestions(questions) {
  return questions.map((question) => ({
    text: question.title,
    description: question.description,
    type: question.type,
    choices: question.options,
    correctAnswer: question.type === 'multiple_choice' || question.type === 'true_false'
      ? question.correctAnswers[0] || ''
      : question.correctAnswers,
    points: question.points,
    required: question.required
  }));
}

// ---------------------------------------------------------------------------
// Output projection
// ---------------------------------------------------------------------------

function projectQuizSummary(quizDoc) {
  return {
    _id: quizDoc._id,
    title: quizDoc.title || quizDoc.quizTitle || 'Untitled Quiz',
    quizTitle: quizDoc.quizTitle || quizDoc.title || 'Untitled Quiz',
    description: quizDoc.description || '',
    subject: quizDoc.subject || '',
    classId: quizDoc.classId || null,
    classLabel: quizDoc.classLabel || null,
    type: quizDoc.type || 'graded',
    status: quizDoc.status || 'draft',
    questionCount: Number(quizDoc.questionCount || (Array.isArray(quizDoc.questions) ? quizDoc.questions.length : 0)),
    totalPoints: Number(quizDoc.totalPoints || 0),
    responseCount: Number(quizDoc.responseCount || 0),
    updatedAt: quizDoc.updatedAt || quizDoc.createdAt || null,
    createdAt: quizDoc.createdAt || null
  };
}

module.exports = {
  ALLOWED_STATUSES,
  ALLOWED_TYPES,
  ALLOWED_QUESTION_TYPES,
  normalizeStatus,
  normalizeQuizType,
  normalizeQuestionTypeValue,
  normalizeEditableStatus,
  parseDateValue,
  formatActorName,
  writeLog,
  createUniqueId,
  sanitizeSections,
  orderQuestionsBySection,
  sanitizeQuestions,
  sanitizeSettings,
  validateQuizPayload,
  mapQuizInput,
  toLegacyQuestions,
  projectQuizSummary,
  getShortAnswerValidationError
};
