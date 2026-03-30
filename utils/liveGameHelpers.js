const crypto = require('crypto');
const QRCode = require('qrcode');

const { uploadToR2 } = require('./r2Client');
const { toIdString } = require('./liveGameClassLinking');

const SITE_BASE_URL = (process.env.SITE_BASE_URL || 'https://hellouniversity.online').replace(/\/$/, '');
const ALLOWED_TIME_LIMITS = [10, 20, 30, 60, 90, 120];
const VALID_QUESTION_TYPES = ['multiple_choice', 'true_false', 'poll', 'type_answer'];
const OPTION_BASED_QUESTION_TYPES = ['multiple_choice', 'true_false', 'poll'];
const CSV_EXPORT_COLUMNS = [
  'sessionId',
  'gameId',
  'gameTitle',
  'pin',
  'startedAt',
  'finishedAt',
  'linkedClassId',
  'linkedClassName',
  'playerRank',
  'playerName',
  'userId',
  'questionIndex',
  'questionType',
  'questionTitle',
  'answered',
  'submittedText',
  'selectedOptionId',
  'selectedOptionText',
  'correct',
  'pointsAwarded',
  'responseTimeMs',
  'finalScore'
];

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }
  return Boolean(value);
}

function normalizeInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTimeLimit(value, fallback = 20) {
  return normalizeInteger(value, fallback);
}

function normalizeAnswerTextKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCorrectState(value) {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

function isOptionQuestionType(type) {
  return OPTION_BASED_QUESTION_TYPES.includes(String(type || '').trim().toLowerCase());
}

function isPollQuestionType(type) {
  return String(type || '').trim().toLowerCase() === 'poll';
}

function isTypeAnswerQuestionType(type) {
  return String(type || '').trim().toLowerCase() === 'type_answer';
}

function normalizeUniqueStringArray(values, maxLength = 200) {
  const seen = new Set();
  const input = Array.isArray(values)
    ? values
    : (values === undefined || values === null ? [] : [values]);

  return input.reduce((acc, value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return acc;
    if (normalized.length > maxLength) {
      acc.push(normalized.slice(0, maxLength));
      seen.add(normalizeAnswerTextKey(normalized.slice(0, maxLength)));
      return acc;
    }

    const key = normalizeAnswerTextKey(normalized);
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.push(normalized);
    return acc;
  }, []);
}

function normalizeAcceptedAnswers(raw) {
  if (Array.isArray(raw)) {
    return normalizeUniqueStringArray(raw);
  }
  if (typeof raw === 'string') {
    return normalizeUniqueStringArray([raw]);
  }
  if (Array.isArray(raw?.values)) {
    return normalizeUniqueStringArray(raw.values);
  }
  return normalizeUniqueStringArray(
    [raw?.correctAnswer, ...(Array.isArray(raw?.acceptedAnswers) ? raw.acceptedAnswers : [])].filter(Boolean)
  );
}

function normalizeGameLinkedClass(value) {
  if (!value) return null;

  const classId = String(value.classId || value._id || '').trim();
  if (!classId) return null;

  return {
    classId,
    classCode: String(value.classCode || '').trim(),
    className: String(value.className || '').trim()
  };
}

function normalizeGameSettings(raw = {}) {
  return {
    requireLogin: normalizeBoolean(raw.requireLogin, false),
    questionTimeLimitDefault: normalizeTimeLimit(raw.questionTimeLimitDefault ?? raw.questionTimeLimitSec, 20),
    showLeaderboardAfterEach: raw.showLeaderboardAfterEach !== undefined
      ? normalizeBoolean(raw.showLeaderboardAfterEach, true)
      : normalizeBoolean(raw.showLeaderboard, true),
    maxPlayers: Math.min(Math.max(normalizeInteger(raw.maxPlayers, 50), 2), 200),
    randomizeQuestionOrder: normalizeBoolean(raw.randomizeQuestionOrder ?? raw.randomizeQuestions, false),
    randomizeAnswerOrder: normalizeBoolean(raw.randomizeAnswerOrder ?? raw.randomizeAnswers, false)
  };
}

function normalizeQuestionOptions(rawOptions = []) {
  if (!Array.isArray(rawOptions)) return [];
  return rawOptions.map((option) => ({
    id: option?.id || '',
    text: String(option?.text || '').trim(),
    isCorrect: option?.isCorrect === true
  }));
}

function normalizeGameQuestion(raw = {}, index = 0, settings = {}) {
  const type = String(raw.type || 'multiple_choice').trim().toLowerCase();
  const timeLimitSeconds = normalizeTimeLimit(
    raw.timeLimitSeconds ?? raw.timeLimitSec,
    settings.questionTimeLimitDefault || 20
  );
  const acceptedAnswers = isTypeAnswerQuestionType(type)
    ? normalizeAcceptedAnswers(raw.acceptedAnswers ?? raw.correctAnswer)
    : [];
  const options = isOptionQuestionType(type)
    ? normalizeQuestionOptions(raw.options)
    : [];
  const normalizedPoints = typeof raw.points === 'number' && raw.points > 0 ? raw.points : 1000;

  return {
    id: raw.id || '',
    type,
    title: String(raw.title || '').trim(),
    imageUrl: String(raw.imageUrl || '').trim() || null,
    options: isPollQuestionType(type)
      ? options.map((option) => ({ ...option, isCorrect: false }))
      : options,
    acceptedAnswers,
    timeLimitSeconds,
    points: isPollQuestionType(type) ? 0 : normalizedPoints,
    order: typeof raw.order === 'number' ? raw.order : index
  };
}

function normalizeGamePayload(body = {}) {
  const settings = normalizeGameSettings(body.settings || {});
  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    coverImage: String(body.coverImage || '').trim() || null,
    linkedClassId: String(body.linkedClassId || '').trim(),
    linkedClass: normalizeGameLinkedClass(body.linkedClass),
    settings,
    questions: Array.isArray(body.questions)
      ? body.questions.map((question, index) => normalizeGameQuestion(question, index, settings))
      : []
  };
}

function normalizeStoredGame(game = {}) {
  const normalized = normalizeGamePayload({
    ...game,
    linkedClass: game.linkedClass
  });

  return {
    ...game,
    title: normalized.title,
    description: normalized.description,
    coverImage: normalized.coverImage,
    linkedClass: normalized.linkedClass,
    settings: normalized.settings,
    questions: normalized.questions.map((question) => ({
      ...question,
      id: question.id || crypto.randomUUID(),
      options: question.options.map((option) => ({
        ...option,
        id: option.id || crypto.randomUUID()
      }))
    })),
    questionCount: game.questionCount || normalized.questions.length
  };
}

function getPlayerDisplayName(player) {
  return String(player?.displayName || player?.odName || '').trim();
}

function getPlayerSocketId(player) {
  return player?.socketId || player?.odId || null;
}

function normalizeParticipantKey(value) {
  return String(value || '').trim().toLowerCase();
}

function buildParticipantKey(nickname, userId) {
  if (userId) {
    return `user:${normalizeParticipantKey(userId)}`;
  }
  return `guest:${normalizeParticipantKey(nickname)}`;
}

function normalizePlayerRecord(player = {}) {
  const displayName = getPlayerDisplayName(player);
  return {
    ...player,
    displayName,
    socketId: getPlayerSocketId(player),
    userId: player.userId || null,
    score: Number(player.score || 0),
    streak: Number(player.streak || 0),
    joinedAt: player.joinedAt || 0,
    participantKey: player.participantKey || buildParticipantKey(displayName, player.userId || null)
  };
}

function getResponseDisplayName(response) {
  return String(response?.displayName || response?.odName || '').trim();
}

function getResponseSocketId(response) {
  return response?.socketId || response?.odId || null;
}

function normalizeResponseRecord(response = {}) {
  const displayName = getResponseDisplayName(response);
  const submittedText = String(response?.submittedText ?? response?.answerText ?? '').trim();
  return {
    ...response,
    displayName,
    socketId: getResponseSocketId(response),
    participantKey: response.participantKey || buildParticipantKey(displayName, response.userId || null),
    answerId: response.answerId || response.optionId || null,
    submittedText: submittedText || null,
    correct: normalizeCorrectState(response.correct),
    timeMs: Number(response.timeMs || 0),
    pointsAwarded: Number(response.pointsAwarded || 0),
    totalScoreAfterQuestion: Number(response.totalScoreAfterQuestion || 0)
  };
}

async function generateAndUploadGameQr(gamePin) {
  const joinUrl = `${SITE_BASE_URL}/play?pin=${gamePin}`;
  const pngBuffer = await QRCode.toBuffer(joinUrl, {
    type: 'png',
    width: 400,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' }
  });
  const key = `clashrush-qr/${gamePin}.png`;
  await uploadToR2(key, pngBuffer, 'image/png');
  return key;
}

async function generateGamePin(sessionsCollection) {
  const MAX_ATTEMPTS = 10;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const pin = String(crypto.randomInt(100000, 999999));
    const existing = await sessionsCollection.findOne(
      { pin, status: { $in: ['lobby', 'in_progress'] } },
      { projection: { _id: 1 } }
    );
    if (!existing) return pin;
  }
  throw new Error('Unable to generate unique game PIN after multiple attempts.');
}

async function generateGameDocPin(gamesCollection) {
  const MAX_ATTEMPTS = 10;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const pin = String(crypto.randomInt(1000000, 9999999));
    const existing = await gamesCollection.findOne({ gamePin: pin }, { projection: { _id: 1 } });
    if (!existing) return pin;
  }
  throw new Error('Unable to generate unique game document PIN after multiple attempts.');
}

function calculateScore(correct, timeMs, timeLimitSeconds, streak) {
  if (!correct) return { points: 0, streakBonus: 0 };

  const timeLimitMs = timeLimitSeconds * 1000;
  const clampedTime = Math.max(0, Math.min(timeMs, timeLimitMs));
  const timeRatio = clampedTime / timeLimitMs;
  const basePoints = Math.round(1000 * (1 - timeRatio * 0.5));
  const streakBonus = Math.min(streak * 100, 500);

  return { points: basePoints + streakBonus, streakBonus };
}

function buildLeaderboard(players) {
  return [...players]
    .map((player) => normalizePlayerRecord(player))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return (left.joinedAt || 0) - (right.joinedAt || 0);
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));
}

function sanitizeQuestionForPlayer(question) {
  const normalizedQuestion = normalizeGameQuestion(question);
  return {
    id: normalizedQuestion.id,
    type: normalizedQuestion.type,
    title: normalizedQuestion.title,
    imageUrl: normalizedQuestion.imageUrl || null,
    timeLimitSeconds: normalizedQuestion.timeLimitSeconds,
    points: normalizedQuestion.points,
    acceptedAnswerCount: normalizedQuestion.acceptedAnswers.length,
    options: normalizedQuestion.options.map((option) => ({
      id: option.id,
      text: option.text
    }))
  };
}

function shuffleArray(items) {
  const copy = Array.isArray(items) ? items.slice() : [];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function prepareHostedQuestions(questions = [], settings = {}) {
  const normalizedSettings = normalizeGameSettings(settings);
  let preparedQuestions = questions.map((question, index) => {
    const normalizedQuestion = normalizeGameQuestion(question, index, normalizedSettings);
    return {
      ...normalizedQuestion,
      options: normalizedQuestion.options.map((option) => ({ ...option })),
      acceptedAnswers: normalizedQuestion.acceptedAnswers.slice()
    };
  });

  if (normalizedSettings.randomizeQuestionOrder) {
    preparedQuestions = shuffleArray(preparedQuestions);
  }

  if (normalizedSettings.randomizeAnswerOrder) {
    preparedQuestions = preparedQuestions.map((question) => {
      if (!isOptionQuestionType(question.type) || question.options.length < 2) {
        return question;
      }
      return {
        ...question,
        options: shuffleArray(question.options)
      };
    });
  }

  return preparedQuestions.map((question, index) => ({
    ...question,
    order: index
  }));
}

function getCorrectOptionId(question) {
  return question.options.find((option) => option.isCorrect)?.id || null;
}

function isAcceptedTextAnswer(question, submittedText) {
  const normalizedAnswer = normalizeAnswerTextKey(submittedText);
  if (!normalizedAnswer) return false;
  return normalizeAcceptedAnswers(question.acceptedAnswers).some((answer) => normalizeAnswerTextKey(answer) === normalizedAnswer);
}

function buildOptionDistribution(question, responses) {
  const distribution = {};
  question.options.forEach((option) => {
    distribution[option.id] = 0;
  });
  responses.forEach((response) => {
    if (response.answerId && distribution[response.answerId] !== undefined) {
      distribution[response.answerId] += 1;
    }
  });
  return distribution;
}

function buildSubmittedTextBreakdown(responses) {
  const grouped = new Map();
  responses.forEach((rawResponse) => {
    const response = normalizeResponseRecord(rawResponse);
    const submittedText = String(response.submittedText || '').trim();
    if (!submittedText) return;
    const key = normalizeAnswerTextKey(submittedText);
    if (!grouped.has(key)) {
      grouped.set(key, {
        normalizedText: key,
        submittedText,
        count: 0,
        correctCount: 0
      });
    }
    const entry = grouped.get(key);
    entry.count += 1;
    if (response.correct === true) {
      entry.correctCount += 1;
    }
  });

  return [...grouped.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.submittedText.localeCompare(right.submittedText);
  });
}

function buildCompletedSessionReport(session) {
  if (!session) return null;

  const players = Array.isArray(session.players) ? session.players.map((player) => normalizePlayerRecord(player)) : [];
  const questions = Array.isArray(session.questions)
    ? session.questions.map((question, index) => normalizeGameQuestion(question, index))
    : [];
  const results = Array.isArray(session.results)
    ? session.results.map((result) => ({
        ...result,
        responses: Array.isArray(result.responses)
          ? result.responses.map((response) => normalizeResponseRecord(response))
          : []
      }))
    : [];
  const leaderboard = buildLeaderboard(players);
  const scoreTimeline = new Map();
  let totalResponseTimeMs = 0;
  let totalResponses = 0;

  const questionAnalytics = questions.map((question, index) => {
    const result = results[index] || { responses: [] };
    const responses = Array.isArray(result.responses) ? result.responses : [];
    const answeredParticipantKeys = new Set();
    let questionResponseTimeMs = 0;

    responses.forEach((response) => {
      questionResponseTimeMs += response.timeMs;
      totalResponseTimeMs += response.timeMs;
      totalResponses += 1;
      answeredParticipantKeys.add(normalizeParticipantKey(response.participantKey));

      const participantKey = normalizeParticipantKey(response.participantKey);
      if (!scoreTimeline.has(participantKey)) {
        scoreTimeline.set(participantKey, []);
      }
      scoreTimeline.get(participantKey).push({
        questionIndex: index,
        score: response.totalScoreAfterQuestion
      });
    });

    const nonResponders = players
      .filter((player) => !answeredParticipantKeys.has(normalizeParticipantKey(player.participantKey)))
      .map((player) => player.displayName);
    const correctCount = responses.filter((response) => response.correct === true).length;
    const answerCount = responses.length;

    return {
      questionIndex: index,
      questionId: question.id,
      questionType: question.type,
      title: question.title,
      correctOptionId: isOptionQuestionType(question.type) && !isPollQuestionType(question.type)
        ? getCorrectOptionId(question)
        : null,
      acceptedAnswers: isTypeAnswerQuestionType(question.type) ? question.acceptedAnswers.slice() : [],
      answerCount,
      correctCount,
      correctRate: isPollQuestionType(question.type)
        ? null
        : (answerCount > 0 ? correctCount / answerCount : 0),
      averageResponseTimeMs: answerCount > 0 ? Math.round(questionResponseTimeMs / answerCount) : null,
      nonResponderCount: nonResponders.length,
      nonResponders,
      optionDistribution: isOptionQuestionType(question.type)
        ? buildOptionDistribution(question, responses)
        : {},
      submittedAnswers: isTypeAnswerQuestionType(question.type)
        ? buildSubmittedTextBreakdown(responses)
        : [],
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect === true
      }))
    };
  });

  const sortedByDifficulty = [...questionAnalytics]
    .filter((item) => item.answerCount > 0 && typeof item.correctRate === 'number')
    .sort((left, right) => {
      if (left.correctRate !== right.correctRate) return left.correctRate - right.correctRate;
      return right.answerCount - left.answerCount;
    });

  const hardestQuestion = sortedByDifficulty[0] || null;
  const easiestQuestion = sortedByDifficulty.length > 0 ? sortedByDifficulty[sortedByDifficulty.length - 1] : null;

  const playerReports = leaderboard.map((player) => {
    const participantKey = normalizeParticipantKey(player.participantKey);
    const answers = questionAnalytics.map((questionAnalyticsItem) => {
      const result = results[questionAnalyticsItem.questionIndex] || { responses: [] };
      const response = (result.responses || [])
        .map((item) => normalizeResponseRecord(item))
        .find((item) => normalizeParticipantKey(item.participantKey) === participantKey);

      return {
        questionIndex: questionAnalyticsItem.questionIndex,
        questionType: questionAnalyticsItem.questionType,
        correct: response ? normalizeCorrectState(response.correct) : null,
        answerId: response ? response.answerId : null,
        submittedText: response ? response.submittedText : null,
        pointsAwarded: response ? Number(response.pointsAwarded || 0) : 0,
        timeMs: response ? Number(response.timeMs || 0) : null
      };
    });

    const answeredQuestions = answers.filter((answer) => answer.correct !== null);
    const correctAnswers = answeredQuestions.filter((answer) => answer.correct === true).length;
    const unansweredCount = Math.max(0, questionAnalytics.length - answers.filter((answer) => answer.answerId || answer.submittedText).length);
    const rankProgression = questionAnalytics.map((questionAnalyticsItem) => {
      const snapshots = Array.isArray(session.rankSnapshots) ? session.rankSnapshots : [];
      const snapshot = snapshots.find((item) => item.questionIndex === questionAnalyticsItem.questionIndex);
      const entry = (snapshot?.leaderboard || [])
        .map((item) => normalizePlayerRecord(item))
        .find((item) => normalizeParticipantKey(item.participantKey) === participantKey);
      return {
        questionIndex: questionAnalyticsItem.questionIndex,
        rank: entry ? entry.rank : null
      };
    });

    return {
      participantKey: player.participantKey,
      playerName: player.displayName,
      userId: player.userId || null,
      finalRank: player.rank,
      finalScore: player.score,
      accuracy: answeredQuestions.length > 0 ? correctAnswers / answeredQuestions.length : 0,
      unansweredCount,
      answers,
      scoreProgression: scoreTimeline.get(participantKey) || [],
      rankProgression
    };
  });

  return {
    summary: {
      sessionId: typeof session._id?.toHexString === 'function' ? session._id.toHexString() : String(session._id || ''),
      gameId: session.gameId,
      gameTitle: session.gameTitle,
      pin: session.pin,
      status: session.status,
      linkedClassId: session.linkedClass?.classId || null,
      linkedClassName: session.linkedClass?.className || null,
      startedAt: session.startedAt || null,
      finishedAt: session.finishedAt || null,
      durationMs: session.startedAt && session.finishedAt
        ? Math.max(0, new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime())
        : null,
      totalPlayers: players.length,
      totalQuestions: questions.length,
      averageResponseTimeMs: totalResponses > 0 ? Math.round(totalResponseTimeMs / totalResponses) : null
    },
    leaderboard,
    questionAnalytics,
    playerReports,
    insights: {
      hardestQuestion: hardestQuestion
        ? {
            questionIndex: hardestQuestion.questionIndex,
            title: hardestQuestion.title,
            correctRate: hardestQuestion.correctRate
          }
        : null,
      easiestQuestion: easiestQuestion
        ? {
            questionIndex: easiestQuestion.questionIndex,
            title: easiestQuestion.title,
            correctRate: easiestQuestion.correctRate
          }
        : null
    }
  };
}

function buildCompletedSessionCsvRows(session) {
  if (!session) return [];

  const normalizedSession = {
    linkedClass: normalizeGameLinkedClass(session.linkedClass),
    players: Array.isArray(session.players) ? session.players.map((player) => normalizePlayerRecord(player)) : [],
    questions: Array.isArray(session.questions) ? session.questions.map((question, index) => normalizeGameQuestion(question, index)) : [],
    results: Array.isArray(session.results)
      ? session.results.map((result) => ({
          ...result,
          responses: Array.isArray(result.responses)
            ? result.responses.map((response) => normalizeResponseRecord(response))
            : []
        }))
      : []
  };
  const leaderboard = buildLeaderboard(normalizedSession.players);
  const leaderboardByKey = new Map(leaderboard.map((player) => [normalizeParticipantKey(player.participantKey), player]));

  return leaderboard.flatMap((player) => {
    const playerKey = normalizeParticipantKey(player.participantKey);
    return normalizedSession.questions.map((question, questionIndex) => {
      const result = normalizedSession.results[questionIndex] || { responses: [] };
      const response = (result.responses || []).find((item) => normalizeParticipantKey(item.participantKey) === playerKey) || null;
      const selectedOption = question.options.find((option) => option.id === response?.answerId) || null;
      const finalEntry = leaderboardByKey.get(playerKey) || player;

      return {
        sessionId: typeof session._id?.toHexString === 'function' ? session._id.toHexString() : String(session._id || ''),
        gameId: session.gameId || '',
        gameTitle: session.gameTitle || '',
        pin: session.pin || '',
        startedAt: session.startedAt ? new Date(session.startedAt).toISOString() : '',
        finishedAt: session.finishedAt ? new Date(session.finishedAt).toISOString() : '',
        linkedClassId: normalizedSession.linkedClass?.classId || '',
        linkedClassName: normalizedSession.linkedClass?.className || '',
        playerRank: finalEntry.rank || '',
        playerName: player.displayName || '',
        userId: player.userId || '',
        questionIndex: questionIndex + 1,
        questionType: question.type,
        questionTitle: question.title,
        answered: response ? 'true' : 'false',
        submittedText: response?.submittedText || '',
        selectedOptionId: response?.answerId || '',
        selectedOptionText: selectedOption?.text || '',
        correct: response?.correct === null || response?.correct === undefined ? '' : String(response.correct),
        pointsAwarded: response ? Number(response.pointsAwarded || 0) : 0,
        responseTimeMs: response && Number.isFinite(response.timeMs) ? Number(response.timeMs) : '',
        finalScore: player.score || 0
      };
    });
  });
}

function escapeCsvValue(value) {
  const stringValue = value === undefined || value === null ? '' : String(value);
  if (!/[",\n]/.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function buildCompletedSessionCsv(session) {
  const rows = buildCompletedSessionCsvRows(session);
  const lines = [
    CSV_EXPORT_COLUMNS.join(',')
  ];

  rows.forEach((row) => {
    lines.push(CSV_EXPORT_COLUMNS.map((column) => escapeCsvValue(row[column])).join(','));
  });

  return lines.join('\n');
}

function validateGamePayload(body) {
  const normalized = normalizeGamePayload(body);

  if (!normalized.title) {
    return { valid: false, message: 'Title is required.' };
  }
  if (normalized.title.length > 200) {
    return { valid: false, message: 'Title must be 200 characters or fewer.' };
  }
  if (!Array.isArray(normalized.questions) || normalized.questions.length === 0) {
    return { valid: false, message: 'At least one question is required.' };
  }
  if (normalized.questions.length > 100) {
    return { valid: false, message: 'Maximum 100 questions per game.' };
  }

  for (let index = 0; index < normalized.questions.length; index += 1) {
    const question = normalized.questions[index];
    const label = `Question ${index + 1}`;

    if (!question.title) {
      return { valid: false, message: `${label}: Question text is required.` };
    }
    if (question.title.length > 500) {
      return { valid: false, message: `${label}: Question text must be 500 characters or fewer.` };
    }
    if (!VALID_QUESTION_TYPES.includes(question.type)) {
      return { valid: false, message: `${label}: Invalid question type.` };
    }
    if (!ALLOWED_TIME_LIMITS.includes(question.timeLimitSeconds)) {
      return { valid: false, message: `${label}: Invalid time limit.` };
    }

    if (isTypeAnswerQuestionType(question.type)) {
      if (question.acceptedAnswers.length === 0) {
        return { valid: false, message: `${label}: Add at least one accepted answer.` };
      }
      if (question.acceptedAnswers.length > 10) {
        return { valid: false, message: `${label}: Maximum 10 accepted answers.` };
      }
      for (let answerIndex = 0; answerIndex < question.acceptedAnswers.length; answerIndex += 1) {
        const acceptedAnswer = question.acceptedAnswers[answerIndex];
        if (!acceptedAnswer) {
          return { valid: false, message: `${label}: Accepted answers cannot be empty.` };
        }
        if (acceptedAnswer.length > 200) {
          return { valid: false, message: `${label}: Accepted answers must be 200 characters or fewer.` };
        }
      }
      continue;
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      return { valid: false, message: `${label}: At least 2 options required.` };
    }
    if (question.options.length > 4) {
      return { valid: false, message: `${label}: Maximum 4 options.` };
    }

    for (let optionIndex = 0; optionIndex < question.options.length; optionIndex += 1) {
      const option = question.options[optionIndex];
      if (!option.text) {
        return { valid: false, message: `${label}, Option ${optionIndex + 1}: Text is required.` };
      }
      if (option.text.length > 200) {
        return { valid: false, message: `${label}, Option ${optionIndex + 1}: Text must be 200 characters or fewer.` };
      }
    }

    if (isPollQuestionType(question.type)) {
      continue;
    }

    const correctCount = question.options.filter((option) => option.isCorrect === true).length;
    if (correctCount === 0) {
      return { valid: false, message: `${label}: Mark one option as correct.` };
    }
    if (correctCount > 1) {
      return { valid: false, message: `${label}: Only one correct answer allowed.` };
    }
  }

  return { valid: true };
}

function mapGameInput(body, ownerId, ownerName, options = {}) {
  const normalized = normalizeGamePayload(body);
  const now = new Date();
  const questions = normalized.questions.map((question, index) => ({
    id: question.id || crypto.randomUUID(),
    type: question.type,
    title: question.title,
    imageUrl: question.imageUrl || null,
    options: question.options.map((option) => ({
      id: option.id || crypto.randomUUID(),
      text: option.text,
      isCorrect: option.isCorrect === true
    })),
    acceptedAnswers: question.acceptedAnswers.slice(),
    timeLimitSeconds: question.timeLimitSeconds || 20,
    points: isPollQuestionType(question.type)
      ? 0
      : (typeof question.points === 'number' && question.points > 0 ? question.points : 1000),
    order: index
  }));

  return {
    title: normalized.title,
    description: normalized.description,
    coverImage: normalized.coverImage,
    linkedClass: normalizeGameLinkedClass(options.linkedClass || normalized.linkedClass),
    questions,
    settings: normalized.settings,
    ownerUserId: ownerId,
    ownerName: ownerName || 'Unknown',
    questionCount: questions.length,
    updatedAt: now
  };
}

function projectGameSummary(game) {
  const normalized = normalizeStoredGame(game);
  return {
    _id: normalized._id,
    title: normalized.title,
    description: normalized.description,
    coverImage: normalized.coverImage,
    linkedClass: normalized.linkedClass,
    questionCount: normalized.questionCount || normalized.questions.length,
    settings: normalized.settings,
    gamePin: normalized.gamePin || null,
    gameQrKey: normalized.gameQrKey || null,
    ownerUserId: normalized.ownerUserId,
    ownerName: normalized.ownerName,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt
  };
}

function serializeGameDetail(game) {
  const normalized = normalizeStoredGame(game);
  return {
    ...normalized,
    _id: toIdString(normalized._id)
  };
}

module.exports = {
  ALLOWED_TIME_LIMITS,
  CSV_EXPORT_COLUMNS,
  VALID_QUESTION_TYPES,
  generateGamePin,
  generateGameDocPin,
  generateAndUploadGameQr,
  calculateScore,
  buildLeaderboard,
  sanitizeQuestionForPlayer,
  buildParticipantKey,
  buildCompletedSessionReport,
  buildCompletedSessionCsv,
  buildCompletedSessionCsvRows,
  prepareHostedQuestions,
  validateGamePayload,
  mapGameInput,
  normalizeAnswerTextKey,
  normalizeGamePayload,
  normalizeGameSettings,
  normalizeGameQuestion,
  normalizeStoredGame,
  normalizeGameLinkedClass,
  normalizePlayerRecord,
  normalizeResponseRecord,
  isAcceptedTextAnswer,
  isOptionQuestionType,
  isPollQuestionType,
  isTypeAnswerQuestionType,
  getPlayerDisplayName,
  getPlayerSocketId,
  projectGameSummary,
  serializeGameDetail
};
