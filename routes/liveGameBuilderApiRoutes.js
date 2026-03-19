const express = require('express');
const { validateGamePayload, mapGameInput, projectGameSummary } = require('../utils/liveGameHelpers');

function createLiveGameBuilderApiRoutes({
  getLiveGamesCollection,
  getLiveSessionsCollection,
  ObjectId,
  isAuthenticated,
  isTeacherOrAdmin
}) {
  const router = express.Router();

  function depsOr503(res) {
    const liveGamesCollection = getLiveGamesCollection();
    if (!liveGamesCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }
    return { liveGamesCollection };
  }

  function ownerFilter(req) {
    return req.session?.role === 'admin'
      ? {}
      : { ownerUserId: req.session.userId };
  }

  // GET /api/live-games — list teacher's games
  router.get('/', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const deps = depsOr503(res);
      if (!deps) return;

      const filter = ownerFilter(req);
      const search = (req.query.search || '').trim();
      if (search) {
        filter.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      }

      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
      const skip = (page - 1) * limit;

      const [games, total] = await Promise.all([
        deps.liveGamesCollection
          .find(filter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .project({
            title: 1, description: 1, coverImage: 1, questionCount: 1,
            settings: 1, ownerUserId: 1, ownerName: 1, createdAt: 1, updatedAt: 1
          })
          .toArray(),
        deps.liveGamesCollection.countDocuments(filter)
      ]);

      return res.json({
        success: true,
        games,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (err) {
      console.error('GET /api/live-games error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch games.' });
    }
  });

  // POST /api/live-games — create new game
  router.post('/', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const deps = depsOr503(res);
      if (!deps) return;

      const validation = validateGamePayload(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const userId = req.session.userId;
      const userName = req.session.userName || req.session.name || 'Unknown';
      const gameDoc = {
        ...mapGameInput(req.body, userId, userName),
        createdAt: new Date()
      };

      const result = await deps.liveGamesCollection.insertOne(gameDoc);

      return res.status(201).json({
        success: true,
        message: 'Game created.',
        game: { _id: result.insertedId, ...projectGameSummary(gameDoc) }
      });
    } catch (err) {
      console.error('POST /api/live-games error:', err);
      return res.status(500).json({ success: false, message: 'Failed to create game.' });
    }
  });

  // GET /api/live-games/:gameId — get game detail
  router.get('/:gameId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const deps = depsOr503(res);
      if (!deps) return;

      const { gameId } = req.params;
      if (!ObjectId.isValid(gameId)) {
        return res.status(400).json({ success: false, message: 'Invalid game ID.' });
      }

      const filter = { _id: new ObjectId(gameId), ...ownerFilter(req) };
      const game = await deps.liveGamesCollection.findOne(filter);
      if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
      }

      return res.json({ success: true, game });
    } catch (err) {
      console.error('GET /api/live-games/:gameId error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch game.' });
    }
  });

  // PUT /api/live-games/:gameId — update game
  router.put('/:gameId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const deps = depsOr503(res);
      if (!deps) return;

      const { gameId } = req.params;
      if (!ObjectId.isValid(gameId)) {
        return res.status(400).json({ success: false, message: 'Invalid game ID.' });
      }

      const validation = validateGamePayload(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const filter = { _id: new ObjectId(gameId), ...ownerFilter(req) };
      const existing = await deps.liveGamesCollection.findOne(filter, { projection: { ownerUserId: 1, ownerName: 1, createdAt: 1 } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
      }

      const updates = mapGameInput(req.body, existing.ownerUserId, existing.ownerName);

      await deps.liveGamesCollection.updateOne(filter, { $set: updates });

      return res.json({ success: true, message: 'Game updated.' });
    } catch (err) {
      console.error('PUT /api/live-games/:gameId error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update game.' });
    }
  });

  // DELETE /api/live-games/:gameId — delete game
  router.delete('/:gameId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const deps = depsOr503(res);
      if (!deps) return;

      const { gameId } = req.params;
      if (!ObjectId.isValid(gameId)) {
        return res.status(400).json({ success: false, message: 'Invalid game ID.' });
      }

      const filter = { _id: new ObjectId(gameId), ...ownerFilter(req) };
      const result = await deps.liveGamesCollection.deleteOne(filter);
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
      }

      return res.json({ success: true, message: 'Game deleted.' });
    } catch (err) {
      console.error('DELETE /api/live-games/:gameId error:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete game.' });
    }
  });

  // POST /api/live-games/:gameId/duplicate — clone a game
  router.post('/:gameId/duplicate', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const deps = depsOr503(res);
      if (!deps) return;

      const { gameId } = req.params;
      if (!ObjectId.isValid(gameId)) {
        return res.status(400).json({ success: false, message: 'Invalid game ID.' });
      }

      const filter = { _id: new ObjectId(gameId), ...ownerFilter(req) };
      const original = await deps.liveGamesCollection.findOne(filter);
      if (!original) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
      }

      const now = new Date();
      const crypto = require('crypto');
      const clone = {
        title: `${original.title} (Copy)`.slice(0, 200),
        description: original.description,
        coverImage: original.coverImage,
        questions: (original.questions || []).map(q => ({
          ...q,
          id: crypto.randomUUID(),
          options: q.options.map(o => ({ ...o, id: crypto.randomUUID() }))
        })),
        settings: { ...original.settings },
        ownerUserId: req.session.userId,
        ownerName: req.session.userName || req.session.name || original.ownerName,
        questionCount: (original.questions || []).length,
        createdAt: now,
        updatedAt: now
      };

      const result = await deps.liveGamesCollection.insertOne(clone);

      return res.status(201).json({
        success: true,
        message: 'Game duplicated.',
        game: { _id: result.insertedId, ...projectGameSummary(clone) }
      });
    } catch (err) {
      console.error('POST /api/live-games/:gameId/duplicate error:', err);
      return res.status(500).json({ success: false, message: 'Failed to duplicate game.' });
    }
  });

  return router;
}

module.exports = createLiveGameBuilderApiRoutes;
