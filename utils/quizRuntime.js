const {
  isObjectiveQuestion,
  normalizePersistedQuizStructure,
  sanitizeStringArray,
  sanitizeText
} = require('./quizSections');

function shuffleList(items = []) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
}

function normalizeQuizQuestionsForRuntime(quiz = {}) {
  const normalizedStructure = normalizePersistedQuizStructure(quiz);

  return normalizedStructure.questions
    .map((question) => {
      const choices = Array.isArray(question.choices) ? question.choices : [];

      return {
        id: question.id,
        sectionId: question.sectionId,
        order: question.order,
        type: question.type,
        text: question.text,
        questionText: question.text,
        title: question.text,
        description: question.description,
        choices,
        options: choices,
        required: question.required !== false,
        caseSensitive: Boolean(question.caseSensitive),
        points: question.points,
        correctAnswers: Array.isArray(question.correctAnswers) ? question.correctAnswers : [],
        correctChoiceIndexes: (Array.isArray(question.correctAnswers) ? question.correctAnswers : [])
          .map((answer) => choices.findIndex((choice) => choice === answer))
          .filter((value) => value >= 0)
      };
    })
    .filter((question) => question.text);
}

function buildStudentQuizView(quiz = {}, assignment = null) {
  const normalizedStructure = normalizePersistedQuizStructure(quiz);
  const baseQuestions = normalizeQuizQuestionsForRuntime(quiz).map((question) => ({
    id: question.id,
    sectionId: question.sectionId,
    order: question.order,
    type: question.type,
    text: question.text,
    questionText: question.text,
    title: question.text,
    description: question.description,
    choices: question.choices,
    options: question.options,
    required: question.required,
    points: question.points,
    allowMultiple: question.type === 'checkbox'
  }));
  const shouldRandomizeBySection = Boolean(quiz.settings?.randomizeQuestionOrder);
  const sections = normalizedStructure.sections.map((section) => {
    const sectionQuestions = baseQuestions.filter((question) => question.sectionId === section.id);
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      questions: shouldRandomizeBySection ? shuffleList(sectionQuestions) : sectionQuestions
    };
  });
  const questions = sections.flatMap((section) => section.questions);

  return {
    _id: quiz._id,
    title: quiz.title || quiz.quizTitle || 'Untitled Quiz',
    quizTitle: quiz.quizTitle || quiz.title || 'Untitled Quiz',
    description: quiz.description || '',
    type: quiz.type || 'graded',
    classId: quiz.classId || null,
    classLabel: quiz.classLabel || null,
    settings: quiz.settings || {},
    duration: Number(quiz.settings?.timeLimitMinutes || quiz.duration || 0),
    dueDate: assignment?.dueDate || quiz.settings?.endAt || quiz.dueDate || null,
    questionCount: questions.length,
    totalPoints: Number(quiz.totalPoints || questions.reduce((sum, question) => sum + question.points, 0)),
    questions,
    sections: sections.map((section) => ({
      ...section,
      questionCount: section.questions.length
    }))
  };
}

function getAnswerEntry(question, answers, index) {
  if (!Array.isArray(answers)) {
    return undefined;
  }

  const matched = answers.find((answer) => (
    answer
    && typeof answer === 'object'
    && !Array.isArray(answer)
    && sanitizeText(answer.questionId) === question.id
  ));

  if (matched) {
    return matched;
  }

  return answers[index];
}

function normalizeSingleChoiceAnswer(question, entry) {
  const normalized = {
    questionId: question.id,
    type: question.type,
    choiceIndex: -1,
    value: ''
  };

  if (entry == null) {
    return normalized;
  }

  let rawValue = entry;
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    if (Number.isInteger(entry.choiceIndex)) {
      normalized.choiceIndex = entry.choiceIndex;
    } else if (Number.isInteger(entry.choice)) {
      normalized.choiceIndex = entry.choice;
    } else if (Number.isInteger(entry.index)) {
      normalized.choiceIndex = entry.index;
    } else if (typeof entry.value === 'boolean') {
      rawValue = entry.value ? 'True' : 'False';
    } else if (entry.value != null) {
      rawValue = entry.value;
    } else if (entry.answer != null) {
      rawValue = entry.answer;
    } else if (entry.text != null) {
      rawValue = entry.text;
    }
  }

  if (normalized.choiceIndex >= 0 && question.choices[normalized.choiceIndex]) {
    normalized.value = question.choices[normalized.choiceIndex];
    return normalized;
  }

  if (typeof rawValue === 'number' && Number.isInteger(rawValue) && question.choices[rawValue]) {
    normalized.choiceIndex = rawValue;
    normalized.value = question.choices[rawValue];
    return normalized;
  }

  const textValue = typeof rawValue === 'boolean'
    ? (rawValue ? 'True' : 'False')
    : sanitizeText(rawValue);
  normalized.value = textValue;
  normalized.choiceIndex = question.choices.findIndex((choice) => choice === textValue);
  return normalized;
}

function normalizeCheckboxAnswer(question, entry) {
  const normalized = {
    questionId: question.id,
    type: question.type,
    choiceIndexes: [],
    values: []
  };

  if (entry == null) {
    return normalized;
  }

  let values = [];
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    if (Array.isArray(entry.choiceIndexes)) {
      normalized.choiceIndexes = [...new Set(entry.choiceIndexes.filter((value) => Number.isInteger(value)))];
    } else if (Array.isArray(entry.indices)) {
      normalized.choiceIndexes = [...new Set(entry.indices.filter((value) => Number.isInteger(value)))];
    } else if (Number.isInteger(entry.choiceIndex)) {
      normalized.choiceIndexes = [entry.choiceIndex];
    }

    if (Array.isArray(entry.values)) {
      values = entry.values;
    } else if (Array.isArray(entry.answers)) {
      values = entry.answers;
    } else if (entry.value != null) {
      values = [entry.value];
    }
  } else if (Array.isArray(entry)) {
    values = entry;
  } else {
    values = [entry];
  }

  const valuesFromIndexes = normalized.choiceIndexes
    .map((index) => question.choices[index])
    .filter(Boolean);
  const sanitizedValues = sanitizeStringArray(values);
  normalized.values = sanitizeStringArray(valuesFromIndexes.concat(sanitizedValues));

  if (!normalized.choiceIndexes.length) {
    normalized.choiceIndexes = normalized.values
      .map((value) => question.choices.findIndex((choice) => choice === value))
      .filter((index) => index >= 0);
  }

  return normalized;
}

function normalizeTextAnswer(question, entry) {
  let text = '';

  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    if (entry.text != null) {
      text = entry.text;
    } else if (entry.value != null) {
      text = entry.value;
    } else if (entry.answer != null) {
      text = entry.answer;
    }
  } else if (entry != null) {
    text = entry;
  }

  return {
    questionId: question.id,
    type: question.type,
    text: sanitizeText(text)
  };
}

function normalizeSubmittedAnswer(question, answers, index) {
  const entry = getAnswerEntry(question, answers, index);
  if (question.type === 'checkbox') {
    return normalizeCheckboxAnswer(question, entry);
  }
  if (question.type === 'short_answer' || question.type === 'paragraph') {
    return normalizeTextAnswer(question, entry);
  }
  return normalizeSingleChoiceAnswer(question, entry);
}

function equalsStringSet(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function isAnswerCorrect(question, normalizedAnswer) {
  if (question.type === 'checkbox') {
    return equalsStringSet(normalizedAnswer.values, question.correctAnswers);
  }

  if (question.type === 'short_answer' || question.type === 'paragraph') {
    const candidate = sanitizeText(normalizedAnswer.text);
    if (!candidate) {
      return false;
    }

    if (question.caseSensitive) {
      return question.correctAnswers.includes(candidate);
    }

    const lowerCandidate = candidate.toLowerCase();
    return question.correctAnswers.some((answer) => answer.toLowerCase() === lowerCandidate);
  }

  if (Number.isInteger(normalizedAnswer.choiceIndex) && normalizedAnswer.choiceIndex >= 0 && question.correctChoiceIndexes.length === 1) {
    return normalizedAnswer.choiceIndex === question.correctChoiceIndexes[0];
  }

  return sanitizeText(normalizedAnswer.value) === (question.correctAnswers[0] || '');
}

function scoreQuizAttempt(quiz = {}, answers = []) {
  const questions = normalizeQuizQuestionsForRuntime(quiz);
  const totalQuizPoints = Number(quiz.totalPoints || questions.reduce((sum, question) => sum + question.points, 0));

  let rawScore = 0;
  const normalizedAnswers = questions.map((question, index) => {
    const normalizedAnswer = normalizeSubmittedAnswer(question, answers, index);
    const correct = isAnswerCorrect(question, normalizedAnswer);
    const earnedPoints = correct ? question.points : 0;
    rawScore += earnedPoints;
    return {
      ...normalizedAnswer,
      isCorrect: correct,
      earnedPoints
    };
  });

  return {
    questions,
    normalizedAnswers,
    rawScore,
    totalQuizPoints
  };
}

module.exports = {
  buildStudentQuizView,
  isObjectiveQuestion,
  normalizeQuizQuestionsForRuntime,
  scoreQuizAttempt
};
