const express = require('express');

const {
  createDefaultSection,
  isObjectiveQuestion,
  normalizeChoiceOptions,
  normalizeCorrectAnswers,
  normalizePersistedQuizStructure,
  normalizeQuestionType,
  resolveQuestionPoints,
  sanitizeText
} = require('../utils/quizSections');

function createQuizBuilderApiRoutes({
  getQuizzesCollection,
  getAttemptsCollection,
  getLogsCollection,
  getClassQuizCollection,
  getClassesCollection,
  ObjectId,
  isAuthenticated,
  isTeacherOrAdmin
}) {
  const router = express.Router();

  const ALLOWED_STATUSES = new Set(['draft', 'published', 'closed', 'archived']);
  const ALLOWED_TYPES = new Set(['practice', 'graded', 'survey', 'exit_ticket', 'assignment_check']);
  const ALLOWED_QUESTION_TYPES = new Set(['multiple_choice', 'checkbox', 'short_answer', 'paragraph', 'true_false']);

  function depsOr503(res) {
    const quizzesCollection = getQuizzesCollection();
    const attemptsCollection = getAttemptsCollection();
    const logsCollection = getLogsCollection();
    const classQuizCollection = typeof getClassQuizCollection === 'function' ? getClassQuizCollection() : null;
    const classesCollection = typeof getClassesCollection === 'function' ? getClassesCollection() : null;

    if (!quizzesCollection || !attemptsCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }

    return {
      quizzesCollection,
      attemptsCollection,
      logsCollection,
      classQuizCollection,
      classesCollection
    };
  }

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

  function parseDateValue(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normalizeEditableStatus(value) {
    const normalized = normalizeStatus(value);
    return normalized === 'published' ? 'draft' : normalized;
  }

  function isAdminSession(req) {
    return req.session?.role === 'admin';
  }

  function getLinkedClassFilter(req, classId) {
    const filter = { _id: new ObjectId(classId) };
    if (isAdminSession(req)) {
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

      if (question.type === 'checkbox' && question.correctAnswers.length < 1) {
        return `Question ${index + 1} needs at least 1 correct answer.`;
      }

      if (question.type === 'true_false' && question.correctAnswers.length !== 1) {
        return `Question ${index + 1} needs a true or false answer.`;
      }

      if ((question.type === 'short_answer' || question.type === 'paragraph') && question.correctAnswers.length < 1) {
        return `Question ${index + 1} needs at least 1 accepted answer.`;
      }

      if (isObjectiveQuestion(question.type) && question.correctAnswers.some((answer) => !question.options.includes(answer))) {
        return `Question ${index + 1} has a correct answer that does not match an option.`;
      }
    }

    return null;
  }

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

  async function loadOwnedQuiz(req, res, quizzesCollection, quizId) {
    if (!ObjectId.isValid(quizId)) {
      res.status(400).json({ success: false, message: 'Invalid quiz id.' });
      return null;
    }

    const filter = { _id: new ObjectId(quizId) };
    if (req.session.role !== 'admin') {
      filter.ownerUserId = new ObjectId(req.session.userId);
    }

    const quiz = await quizzesCollection.findOne(filter);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found.' });
      return null;
    }

    return quiz;
  }

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

  async function syncQuizClassAssignment({ req, quizDoc, classQuizCollection, classesCollection }) {
    if (!classQuizCollection || !classesCollection) {
      throw new Error('Quiz assignments are unavailable right now.');
    }

    if (!quizDoc.classId) {
      await classQuizCollection.deleteMany({ quizId: quizDoc._id });
      return;
    }

    if (!ObjectId.isValid(quizDoc.classId)) {
      throw new Error('Linked class is invalid.');
    }

    const classDoc = await classesCollection.findOne(getLinkedClassFilter(req, quizDoc.classId));
    if (!classDoc) {
      throw new Error('Linked class not found.');
    }

    const now = new Date();
    await classQuizCollection.deleteMany({
      quizId: quizDoc._id,
      classId: { $ne: classDoc._id }
    });

    await classQuizCollection.updateOne(
      { quizId: quizDoc._id, classId: classDoc._id },
      {
        $set: {
          assignedStudents: [],
          startDate: quizDoc.settings?.startAt || null,
          dueDate: quizDoc.settings?.endAt || null,
          assignedBy: req.session.userId || null,
          assignedByStudentID: req.session.studentIDNumber || null,
          assignedByRole: req.session.role || null,
          updatedAt: now
        },
        $setOnInsert: {
          assignedAt: now
        }
      },
      { upsert: true }
    );
  }

  router.get('/health', isAuthenticated, isTeacherOrAdmin, (req, res) => {
    return res.json({
      success: true,
      message: 'Quiz builder routes are mounted.',
      actorRole: req.session?.role || null
    });
  });

  router.get('/quizzes', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection } = deps;

    try {
      const query = String(req.query.query || '').trim();
      const status = normalizeStatus(req.query.status || '');
      const hasStatusFilter = Boolean(req.query.status);
      const classId = String(req.query.classId || '').trim();

      const filter = {};
      if (req.session.role !== 'admin') {
        filter.ownerUserId = new ObjectId(req.session.userId);
      }
      if (hasStatusFilter) {
        filter.status = status;
      }
      if (classId) {
        filter.classId = classId;
      }
      if (query) {
        filter.$or = [
          { title: { $regex: query, $options: 'i' } },
          { quizTitle: { $regex: query, $options: 'i' } },
          { subject: { $regex: query, $options: 'i' } },
          { classLabel: { $regex: query, $options: 'i' } }
        ];
      }

      const quizzes = await quizzesCollection.find(filter).sort({ updatedAt: -1, createdAt: -1 }).toArray();
      return res.json({ success: true, quizzes: quizzes.map(projectQuizSummary) });
    } catch (error) {
      console.error('Error loading quiz builder dashboard:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const payload = mapQuizInput(req.body);
      const validationError = validateQuizPayload(payload);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const now = new Date();
      const quizDoc = {
        title: payload.title,
        quizTitle: payload.title,
        description: payload.description,
        subject: payload.subject,
        classId: payload.classId,
        classLabel: payload.classLabel,
        type: payload.type,
        status: payload.status,
        settings: payload.settings,
        sections: payload.sections,
        questions: payload.questions,
        legacyQuestions: toLegacyQuestions(payload.questions),
        questionCount: payload.questionCount,
        totalPoints: payload.totalPoints,
        responseCount: 0,
        ownerUserId: new ObjectId(req.session.userId),
        ownerStudentIDNumber: req.session.studentIDNumber || null,
        ownerName: formatActorName(req),
        createdBy: new ObjectId(req.session.userId),
        isActive: payload.status === 'published',
        createdAt: now,
        updatedAt: now,
        publishedAt: payload.status === 'published' ? now : null,
        closedAt: payload.status === 'closed' ? now : null,
        archivedAt: payload.status === 'archived' ? now : null
      };

      const result = await quizzesCollection.insertOne(quizDoc);
      quizDoc._id = result.insertedId;
      await writeLog(logsCollection, req, 'QUIZ_CREATED', quizDoc, `Created quiz ${quizDoc.title}`);

      return res.status(201).json({
        success: true,
        quizId: result.insertedId,
        message: 'Quiz created successfully.'
      });
    } catch (error) {
      console.error('Error creating quiz builder quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes/:quizId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    try {
      const quiz = await loadOwnedQuiz(req, res, deps.quizzesCollection, req.params.quizId);
      if (!quiz) return;

      return res.json({
        success: true,
        quiz: {
          ...quiz,
          ...normalizePersistedQuizStructure(quiz),
          title: quiz.title || quiz.quizTitle || '',
          status: quiz.status || 'draft'
        }
      });
    } catch (error) {
      console.error('Error loading quiz builder quiz detail:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/quizzes/:quizId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const existingQuiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!existingQuiz) return;

      const payload = mapQuizInput(req.body);
      const validationError = validateQuizPayload(payload);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const updateFields = {
        title: payload.title,
        quizTitle: payload.title,
        description: payload.description,
        subject: payload.subject,
        classId: payload.classId,
        classLabel: payload.classLabel,
        type: payload.type,
        status: payload.status,
        settings: payload.settings,
        sections: payload.sections,
        questions: payload.questions,
        legacyQuestions: toLegacyQuestions(payload.questions),
        questionCount: payload.questionCount,
        totalPoints: payload.totalPoints,
        isActive: payload.status === 'published',
        updatedAt: new Date(),
        publishedAt: payload.status === 'published' ? (existingQuiz.publishedAt || new Date()) : null,
        closedAt: payload.status === 'closed' ? new Date() : null,
        archivedAt: payload.status === 'archived' ? new Date() : null
      };

      await quizzesCollection.updateOne({ _id: existingQuiz._id }, { $set: updateFields });
      await writeLog(logsCollection, req, 'QUIZ_UPDATED', existingQuiz, `Updated quiz ${payload.title}`);

      return res.json({ success: true, message: 'Quiz updated successfully.' });
    } catch (error) {
      console.error('Error updating quiz builder quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/publish', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection, classQuizCollection, classesCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;
      const normalizedStructure = normalizePersistedQuizStructure(quiz);

      const publishPayload = {
        title: sanitizeText(quiz.title || quiz.quizTitle),
        sections: normalizedStructure.sections,
        questions: normalizedStructure.questions,
        settings: sanitizeSettings(quiz.settings || {})
      };
      const validationError = validateQuizPayload(publishPayload);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const publishedAt = quiz.publishedAt || new Date();
      const updatedQuizDoc = {
        ...quiz,
        classId: String(quiz.classId || '').trim() || null,
        settings: publishPayload.settings,
        publishedAt
      };

      try {
        await syncQuizClassAssignment({
          req,
          quizDoc: updatedQuizDoc,
          classQuizCollection,
          classesCollection
        });
      } catch (assignmentError) {
        return res.status(400).json({ success: false, message: assignmentError.message || 'Unable to publish quiz.' });
      }

      await quizzesCollection.updateOne(
        { _id: quiz._id },
        {
          $set: {
            status: 'published',
            isActive: true,
            publishedAt,
            updatedAt: new Date(),
            archivedAt: null,
            closedAt: null
          }
        }
      );

      await writeLog(logsCollection, req, 'QUIZ_PUBLISHED', quiz, `Published quiz ${quiz.title || quiz.quizTitle}`);
      return res.json({ success: true, message: 'Quiz published successfully.' });
    } catch (error) {
      console.error('Error publishing quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/close', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      await quizzesCollection.updateOne(
        { _id: quiz._id },
        { $set: { status: 'closed', isActive: false, closedAt: new Date(), updatedAt: new Date() } }
      );

      await writeLog(logsCollection, req, 'QUIZ_CLOSED', quiz, `Closed quiz ${quiz.title || quiz.quizTitle}`);
      return res.json({ success: true, message: 'Quiz closed successfully.' });
    } catch (error) {
      console.error('Error closing quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/archive', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      await quizzesCollection.updateOne(
        { _id: quiz._id },
        { $set: { status: 'archived', isActive: false, archivedAt: new Date(), updatedAt: new Date() } }
      );

      await writeLog(logsCollection, req, 'QUIZ_ARCHIVED', quiz, `Archived quiz ${quiz.title || quiz.quizTitle}`);
      return res.json({ success: true, message: 'Quiz archived successfully.' });
    } catch (error) {
      console.error('Error archiving quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/restore', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      await quizzesCollection.updateOne(
        { _id: quiz._id },
        { $set: { status: 'draft', isActive: false, archivedAt: null, updatedAt: new Date() } }
      );

      await writeLog(logsCollection, req, 'QUIZ_RESTORED', quiz, `Restored quiz ${quiz.title || quiz.quizTitle} to draft`);
      return res.json({ success: true, message: 'Quiz restored successfully.' });
    } catch (error) {
      console.error('Error restoring quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/quizzes/:quizId/duplicate', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, logsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      const now = new Date();
      const { _id, ...quizWithoutId } = quiz;
      const duplicatedQuiz = {
        ...quizWithoutId,
        title: `${quiz.title || quiz.quizTitle || 'Untitled Quiz'} Copy`,
        quizTitle: `${quiz.title || quiz.quizTitle || 'Untitled Quiz'} Copy`,
        status: 'draft',
        isActive: false,
        responseCount: 0,
        publishedAt: null,
        closedAt: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now
      };

      const result = await quizzesCollection.insertOne(duplicatedQuiz);
      duplicatedQuiz._id = result.insertedId;
      await writeLog(logsCollection, req, 'QUIZ_DUPLICATED', duplicatedQuiz, `Duplicated quiz from ${quiz._id}`);

      return res.status(201).json({ success: true, quizId: result.insertedId, message: 'Quiz duplicated successfully.' });
    } catch (error) {
      console.error('Error duplicating quiz:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes/:quizId/responses', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, attemptsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      const attempts = await attemptsCollection
        .find({ quizId: quiz._id })
        .sort({ submittedAt: -1, createdAt: -1 })
        .toArray();

      const rows = attempts.map((attempt) => {
        const finalScore = attempt.finalScore ?? attempt.score ?? 0;
        const possible = quiz.totalPoints || quiz.questionCount || (Array.isArray(quiz.questions) ? quiz.questions.length : 0) || 0;
        return {
          _id: attempt._id,
          studentName: attempt.studentName || 'Student',
          studentIDNumber: attempt.studentIDNumber || '',
          submittedAt: attempt.submittedAt || null,
          durationSeconds: attempt.durationSeconds || null,
          attemptNumber: attempt.attemptNumber || 1,
          score: finalScore,
          scorePossible: possible,
          status: attempt.status || (attempt.isCompleted ? 'submitted' : 'in_progress')
        };
      });

      return res.json({ success: true, responses: rows });
    } catch (error) {
      console.error('Error loading quiz responses:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/quizzes/:quizId/analytics', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = depsOr503(res);
    if (!deps) return;

    const { quizzesCollection, attemptsCollection } = deps;

    try {
      const quiz = await loadOwnedQuiz(req, res, quizzesCollection, req.params.quizId);
      if (!quiz) return;

      const attempts = await attemptsCollection.find({ quizId: quiz._id, isCompleted: true }).toArray();
      const scores = attempts.map((attempt) => Number(attempt.finalScore ?? attempt.score ?? 0));
      const totalResponses = attempts.length;
      const averageScore = totalResponses ? (scores.reduce((sum, value) => sum + value, 0) / totalResponses) : 0;
      const highestScore = totalResponses ? Math.max(...scores) : 0;
      const lowestScore = totalResponses ? Math.min(...scores) : 0;
      const possible = quiz.totalPoints || quiz.questionCount || 0;

      return res.json({
        success: true,
        analytics: {
          totalResponses,
          averageScore,
          highestScore,
          lowestScore,
          completionRate: 0,
          scorePossible: possible
        }
      });
    } catch (error) {
      console.error('Error loading quiz analytics:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}

module.exports = createQuizBuilderApiRoutes;
