const express = require('express');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

module.exports = function lessonQuizRoutes(client) {
  const router = express.Router();
  const db = client.db('myDatabase');
  const attemptsCollection = db.collection('tblLessonQuizAttempts');

  // Static answer key for lesson "java-lesson11"
  // MC: values are a/b/c; TF: true/false
  const quizzes = {
    'java-lesson11': {
      total: 10,
      questions: {
        q1: { type: 'mc', correct: 'a' }, // While
        q2: { type: 'mc', correct: 'c' }, // For
        q3: { type: 'mc', correct: 'b' }, // Do-while
        q4: { type: 'mc', correct: 'c' }, // For
        q5: { type: 'mc', correct: 'a' }, // While
        q6: { type: 'tf', correct: 'false' },
        q7: { type: 'tf', correct: 'false' },
        q8: { type: 'tf', correct: 'true' },
        q9: { type: 'tf', correct: 'true' },
        q10: { type: 'tf', correct: 'false' }
      }
    }
  };

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false
  });

  router.post('/attempt', limiter, async (req, res) => {
    try {
      const { lessonId, studentIDNumber, answers } = req.body || {};

      if (!lessonId || !studentIDNumber || !answers || typeof answers !== 'object') {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
      }

      const cleanId = validator.whitelist(studentIDNumber.trim(), 'A-Za-z0-9\\-');
      if (!cleanId) {
        return res.status(400).json({ success: false, message: 'Invalid Student ID.' });
      }

      const quiz = quizzes[lessonId];
      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Lesson not found.' });
      }

      let score = 0;
      const normalizedAnswers = {};

      for (const [qid, meta] of Object.entries(quiz.questions)) {
        const rawAns = (answers[qid] || '').toString().trim();
        const ans = rawAns.toLowerCase();
        normalizedAnswers[qid] = rawAns;

        if (!ans) continue;

        if (meta.type === 'mc') {
          // Expecting 'a' | 'b' | 'c' | 'd'
          if (ans === meta.correct) score++;
        } else if (meta.type === 'tf') {
          // Expecting 'true' | 'false'
          if (ans === meta.correct) score++;
        }
      }

      const doc = {
        lessonId,
        studentIDNumber: cleanId,
        answers: normalizedAnswers,
        score,
        total: quiz.total,
        createdAt: new Date(),
        userAgent: req.get('user-agent') || ''
      };

      await attemptsCollection.insertOne(doc);

      return res.json({ success: true, message: 'Submission saved.', score, total: quiz.total });
    } catch (err) {
      console.error('Error saving lesson quiz attempt:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
};