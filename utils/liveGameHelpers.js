const crypto = require('crypto');
const QRCode = require('qrcode');
const { uploadToR2 } = require('./r2Client');

const SITE_BASE_URL = (process.env.SITE_BASE_URL || 'https://hellouniversity.online').replace(/\/$/, '');

/**
 * Generate a QR code PNG for a game PIN and upload it to Cloudflare R2.
 * The QR encodes the player join URL: {SITE_BASE_URL}/play?pin={gamePin}
 * @param {string} gamePin  - 7-digit game PIN
 * @returns {Promise<string>} The R2 object key
 */
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

/**
 * Generate a unique 6-digit game PIN.
 * Checks active sessions for collisions via the provided collection.
 */
async function generateGamePin(sessionsCollection) {
  const MAX_ATTEMPTS = 10;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const pin = String(crypto.randomInt(100000, 999999));
    const existing = await sessionsCollection.findOne(
      { pin, status: { $in: ['lobby', 'in_progress'] } },
      { projection: { _id: 1 } }
    );
    if (!existing) return pin;
  }
  throw new Error('Unable to generate unique game PIN after multiple attempts.');
}

/**
 * Generate a unique 7-digit PIN for a game document.
 * Checks all saved games for collisions so each game has a stable, unique PIN.
 */
async function generateGameDocPin(gamesCollection) {
  const MAX_ATTEMPTS = 10;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const pin = String(crypto.randomInt(1000000, 9999999));
    const existing = await gamesCollection.findOne({ gamePin: pin }, { projection: { _id: 1 } });
    if (!existing) return pin;
  }
  throw new Error('Unable to generate unique game document PIN after multiple attempts.');
}

/**
 * Calculate points for a single answer.
 * @param {boolean} correct - Whether the answer was correct
 * @param {number} timeMs - Time taken to answer in milliseconds
 * @param {number} timeLimitSeconds - Question time limit in seconds
 * @param {number} streak - Current streak of consecutive correct answers
 * @returns {{ points: number, streakBonus: number }}
 */
function calculateScore(correct, timeMs, timeLimitSeconds, streak) {
  if (!correct) return { points: 0, streakBonus: 0 };

  const timeLimitMs = timeLimitSeconds * 1000;
  const clampedTime = Math.max(0, Math.min(timeMs, timeLimitMs));
  const timeRatio = clampedTime / timeLimitMs;
  const basePoints = Math.round(1000 * (1 - timeRatio * 0.5));
  const streakBonus = Math.min(streak * 100, 500);

  return { points: basePoints + streakBonus, streakBonus };
}

/**
 * Sort players by score descending, then by earliest joinedAt for tiebreaker.
 * Returns a new sorted array with rank added.
 */
function buildLeaderboard(players) {
  return [...players]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    })
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

/**
 * Strip isCorrect from question options before sending to players.
 */
function sanitizeQuestionForPlayer(question) {
  return {
    id: question.id,
    type: question.type,
    title: question.title,
    imageUrl: question.imageUrl || null,
    timeLimitSeconds: question.timeLimitSeconds,
    points: question.points,
    options: (question.options || []).map(opt => ({
      id: opt.id,
      text: opt.text
    }))
  };
}

/**
 * Validate a game deck payload from the builder.
 * Returns { valid: true } or { valid: false, message: '...' }.
 */
function validateGamePayload(body) {
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return { valid: false, message: 'Title is required.' };
  }
  if (body.title.trim().length > 200) {
    return { valid: false, message: 'Title must be 200 characters or fewer.' };
  }
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return { valid: false, message: 'At least one question is required.' };
  }
  if (body.questions.length > 100) {
    return { valid: false, message: 'Maximum 100 questions per game.' };
  }

  for (let i = 0; i < body.questions.length; i++) {
    const q = body.questions[i];
    const label = `Question ${i + 1}`;

    if (!q.title || typeof q.title !== 'string' || !q.title.trim()) {
      return { valid: false, message: `${label}: Question text is required.` };
    }
    if (q.title.trim().length > 500) {
      return { valid: false, message: `${label}: Question text must be 500 characters or fewer.` };
    }

    const validTypes = ['multiple_choice', 'true_false'];
    if (!validTypes.includes(q.type)) {
      return { valid: false, message: `${label}: Invalid question type.` };
    }

    if (!Array.isArray(q.options) || q.options.length < 2) {
      return { valid: false, message: `${label}: At least 2 options required.` };
    }
    if (q.options.length > 4) {
      return { valid: false, message: `${label}: Maximum 4 options.` };
    }

    const hasCorrect = q.options.some(o => o.isCorrect === true);
    if (!hasCorrect) {
      return { valid: false, message: `${label}: Mark one option as correct.` };
    }

    const correctCount = q.options.filter(o => o.isCorrect === true).length;
    if (correctCount > 1) {
      return { valid: false, message: `${label}: Only one correct answer allowed.` };
    }

    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      if (!opt.text || typeof opt.text !== 'string' || !opt.text.trim()) {
        return { valid: false, message: `${label}, Option ${j + 1}: Text is required.` };
      }
      if (opt.text.trim().length > 200) {
        return { valid: false, message: `${label}, Option ${j + 1}: Text must be 200 characters or fewer.` };
      }
    }

    const allowedTimeLimits = [10, 20, 30, 60, 90, 120];
    if (q.timeLimitSeconds !== undefined && !allowedTimeLimits.includes(q.timeLimitSeconds)) {
      return { valid: false, message: `${label}: Invalid time limit.` };
    }
  }

  return { valid: true };
}

/**
 * Normalize a game document from user input.
 */
function mapGameInput(body, ownerId, ownerName) {
  const now = new Date();
  const questions = (body.questions || []).map((q, i) => ({
    id: q.id || crypto.randomUUID(),
    type: q.type,
    title: q.title.trim(),
    imageUrl: (q.imageUrl || '').trim() || null,
    options: q.options.map(o => ({
      id: o.id || crypto.randomUUID(),
      text: o.text.trim(),
      isCorrect: o.isCorrect === true
    })),
    timeLimitSeconds: q.timeLimitSeconds || 20,
    points: typeof q.points === 'number' && q.points > 0 ? q.points : 1000,
    order: i
  }));

  return {
    title: body.title.trim(),
    description: (body.description || '').trim(),
    coverImage: (body.coverImage || '').trim() || null,
    questions,
    settings: {
      requireLogin: body.settings?.requireLogin === true,
      questionTimeLimitDefault: body.settings?.questionTimeLimitDefault || 20,
      showLeaderboardAfterEach: body.settings?.showLeaderboardAfterEach !== false,
      maxPlayers: Math.min(Math.max(parseInt(body.settings?.maxPlayers, 10) || 50, 2), 200)
    },
    ownerUserId: ownerId,
    ownerName: ownerName || 'Unknown',
    questionCount: questions.length,
    updatedAt: now
  };
}

/**
 * Project game documents for listing (strip full question data).
 */
function projectGameSummary(game) {
  return {
    _id: game._id,
    title: game.title,
    description: game.description,
    coverImage: game.coverImage,
    questionCount: game.questionCount || (game.questions || []).length,
    settings: game.settings,
    gamePin: game.gamePin || null,
    gameQrKey: game.gameQrKey || null,
    ownerUserId: game.ownerUserId,
    ownerName: game.ownerName,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt
  };
}

module.exports = {
  generateGamePin,
  generateGameDocPin,
  generateAndUploadGameQr,
  calculateScore,
  buildLeaderboard,
  sanitizeQuestionForPlayer,
  validateGamePayload,
  mapGameInput,
  projectGameSummary
};
