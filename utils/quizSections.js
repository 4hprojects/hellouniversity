const ALLOWED_QUESTION_TYPES = new Set([
  'multiple_choice',
  'checkbox',
  'short_answer',
  'paragraph',
  'true_false'
]);

const RESPONSE_VALIDATION_GROUPS = {
  number: new Map([
    ['gt', { inputMode: 'single', valueType: 'number' }],
    ['gte', { inputMode: 'single', valueType: 'number' }],
    ['lt', { inputMode: 'single', valueType: 'number' }],
    ['lte', { inputMode: 'single', valueType: 'number' }],
    ['eq', { inputMode: 'single', valueType: 'number' }],
    ['neq', { inputMode: 'single', valueType: 'number' }],
    ['between', { inputMode: 'range', valueType: 'number' }],
    ['not_between', { inputMode: 'range', valueType: 'number' }],
    ['is_number', { inputMode: 'none', valueType: 'number' }],
    ['whole_number', { inputMode: 'none', valueType: 'number' }]
  ]),
  text: new Map([
    ['contains', { inputMode: 'single', valueType: 'text' }],
    ['not_contains', { inputMode: 'single', valueType: 'text' }],
    ['email', { inputMode: 'none', valueType: 'text' }],
    ['url', { inputMode: 'none', valueType: 'text' }]
  ]),
  length: new Map([
    ['max_char_count', { inputMode: 'single', valueType: 'integer' }],
    ['min_char_count', { inputMode: 'single', valueType: 'integer' }]
  ]),
  regex: new Map([
    ['contains', { inputMode: 'single', valueType: 'regex' }],
    ['not_contains', { inputMode: 'single', valueType: 'regex' }],
    ['matches', { inputMode: 'single', valueType: 'regex' }],
    ['not_matches', { inputMode: 'single', valueType: 'regex' }]
  ])
};

function sanitizeText(value) {
  return String(value == null ? '' : value).trim();
}

function sanitizeStringArray(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => sanitizeText(value)).filter(Boolean))];
}

function normalizeQuestionType(value, question = {}) {
  const normalized = sanitizeText(value || question.type || question.questionType).toLowerCase();
  if (ALLOWED_QUESTION_TYPES.has(normalized)) {
    return normalized;
  }

  const rawOptions = Array.isArray(question.options)
    ? question.options
    : Array.isArray(question.choices)
      ? question.choices
      : [];
  const options = sanitizeStringArray(rawOptions);

  if (options.length) {
    if (options.length === 2 && options.includes('True') && options.includes('False')) {
      return 'true_false';
    }
    return 'multiple_choice';
  }

  return 'short_answer';
}

function isObjectiveQuestion(type) {
  return ['multiple_choice', 'checkbox', 'true_false'].includes(type);
}

function normalizeChoiceOptions(question, type) {
  if (type === 'true_false') {
    return ['True', 'False'];
  }

  return sanitizeStringArray(
    Array.isArray(question.options)
      ? question.options
      : Array.isArray(question.choices)
        ? question.choices
        : []
  );
}

function normalizeCorrectAnswers(question, type, choices) {
  const rawAnswers = Array.isArray(question.correctAnswers)
    ? question.correctAnswers
    : Array.isArray(question.acceptedAnswers)
      ? question.acceptedAnswers
      : Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : question.correctAnswer != null
          ? [question.correctAnswer]
          : [];

  if (!rawAnswers.length) {
    return [];
  }

  if (!isObjectiveQuestion(type)) {
    return sanitizeStringArray(rawAnswers);
  }

  const normalized = rawAnswers.flatMap((answer) => {
    if (typeof answer === 'boolean') {
      return answer ? 'True' : 'False';
    }

    if (typeof answer === 'number' && Number.isInteger(answer)) {
      return choices[answer] ? [choices[answer]] : [];
    }

    const textAnswer = sanitizeText(answer);
    if (!textAnswer) {
      return [];
    }

    if (/^\d+$/.test(textAnswer)) {
      const index = Number(textAnswer);
      if (choices[index]) {
        return [choices[index]];
      }
    }

    return [textAnswer];
  });

  return sanitizeStringArray(normalized);
}

function resolveQuestionPoints(question) {
  const points = Number(question?.points);
  return Number.isFinite(points) && points >= 0 ? points : 1;
}

function normalizeResponseValidation(validation = {}) {
  if (
    Object.prototype.hasOwnProperty.call(validation, 'minLength')
    || Object.prototype.hasOwnProperty.call(validation, 'maxLength')
    || Object.prototype.hasOwnProperty.call(validation, 'patternMode')
    || Object.prototype.hasOwnProperty.call(validation, 'patternPreset')
    || Object.prototype.hasOwnProperty.call(validation, 'customPattern')
  ) {
    return {
      category: '',
      operator: '',
      value: '',
      secondaryValue: '',
      customErrorText: ''
    };
  }

  const category = sanitizeText(validation?.category).toLowerCase();
  const group = RESPONSE_VALIDATION_GROUPS[category];
  if (!group) {
    return {
      category: '',
      operator: '',
      value: '',
      secondaryValue: '',
      customErrorText: ''
    };
  }

  const operator = sanitizeText(validation?.operator).toLowerCase();
  if (!group.has(operator)) {
    return {
      category,
      operator: '',
      value: '',
      secondaryValue: '',
      customErrorText: sanitizeText(validation?.customErrorText)
    };
  }

  return {
    category,
    operator,
    value: sanitizeText(validation?.value),
    secondaryValue: sanitizeText(validation?.secondaryValue),
    customErrorText: sanitizeText(validation?.customErrorText)
  };
}

function createDefaultSection(index = 0) {
  return {
    id: `section-${index + 1}`,
    title: `Section ${index + 1}`,
    description: '',
    order: index
  };
}

function uniqueId(base, seen, fallbackPrefix, index) {
  const normalizedBase = sanitizeText(base) || `${fallbackPrefix}-${index + 1}`;
  let candidate = normalizedBase;
  let suffix = 2;

  while (seen.has(candidate)) {
    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  seen.add(candidate);
  return candidate;
}

function normalizePersistedSections(rawSections = []) {
  const sectionsSource = Array.isArray(rawSections) && rawSections.length
    ? rawSections
    : [createDefaultSection(0)];
  const seenIds = new Set();

  return sectionsSource
    .map((section, index) => ({
      id: uniqueId(section?.id, seenIds, 'section', index),
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

function normalizePersistedQuizStructure(quiz = {}) {
  const hasExplicitSections = Array.isArray(quiz.sections) && quiz.sections.length > 0;
  const sections = normalizePersistedSections(quiz.sections);
  const firstSectionId = sections[0]?.id || createDefaultSection(0).id;
  const sectionIds = new Set(sections.map((section) => section.id));
  const sourceQuestions = Array.isArray(quiz.questions) && quiz.questions.length
    ? quiz.questions
    : Array.isArray(quiz.legacyQuestions)
      ? quiz.legacyQuestions
      : [];
  const seenQuestionIds = new Set();

  const normalizedQuestions = sourceQuestions.map((question, index) => {
    const type = normalizeQuestionType(question?.type, question);
    const options = normalizeChoiceOptions(question || {}, type);
    const correctAnswers = normalizeCorrectAnswers(question || {}, type, options);
    const title = sanitizeText(question?.title || question?.text || question?.questionText);
    const description = sanitizeText(question?.description);
    const sectionId = hasExplicitSections && sectionIds.has(sanitizeText(question?.sectionId))
      ? sanitizeText(question.sectionId)
      : firstSectionId;

    return {
      id: uniqueId(question?.id || question?._id, seenQuestionIds, 'question', index),
      sectionId,
      order: Number.isFinite(Number(question?.order)) ? Number(question.order) : index,
      type,
      title,
      text: title,
      questionText: title,
      description,
      required: question?.required !== false,
      points: resolveQuestionPoints(question),
      options,
      choices: options,
      correctAnswers,
      allowMultiple: type === 'checkbox',
      caseSensitive: Boolean(question?.caseSensitive),
      responseValidation: type === 'short_answer'
        ? normalizeResponseValidation(question?.responseValidation)
        : normalizeResponseValidation({}),
      feedbackCorrect: sanitizeText(question?.feedbackCorrect),
      feedbackIncorrect: sanitizeText(question?.feedbackIncorrect),
      _sourceIndex: index
    };
  });

  const groupedQuestions = sections.map((section) => {
    const questions = normalizedQuestions
      .filter((question) => question.sectionId === section.id)
      .sort((left, right) => (
        left.order - right.order
        || left._sourceIndex - right._sourceIndex
      ))
      .map((question, index) => ({
        ...question,
        order: index
      }));

    return {
      ...section,
      questions
    };
  });

  const questions = groupedQuestions.flatMap((section) => section.questions);
  const sectionsWithMeta = groupedQuestions.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    order: section.order,
    questionCount: section.questions.length
  }));

  return {
    sections: sectionsWithMeta,
    questions,
    groupedSections: groupedQuestions
  };
}

module.exports = {
  createDefaultSection,
  isObjectiveQuestion,
  normalizeChoiceOptions,
  normalizeCorrectAnswers,
  normalizeResponseValidation,
  normalizePersistedQuizStructure,
  normalizeQuestionType,
  resolveQuestionPoints,
  sanitizeStringArray,
  sanitizeText
};
