const express = require('express');
const { validateGamePayload, mapGameInput, projectGameSummary, generateGameDocPin, generateAndUploadGameQr } = require('../utils/liveGameHelpers');
const { deleteFromR2, getObjectBuffer } = require('../utils/r2Client');

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
            settings: 1, gamePin: 1, gameQrKey: 1, ownerUserId: 1, ownerName: 1, createdAt: 1, updatedAt: 1
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
      const userName = [req.session.firstName, req.session.lastName].filter(Boolean).join(' ') || 'Unknown';
      const gamePin = await generateGameDocPin(deps.liveGamesCollection);

      let gameQrKey = null;
      try {
        gameQrKey = await generateAndUploadGameQr(gamePin);
      } catch (qrErr) {
        console.warn('ClassRush QR generation failed (non-fatal):', qrErr.message);
      }

      const gameDoc = {
        ...mapGameInput(req.body, userId, userName),
        gamePin,
        gameQrKey,
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

  // GET /api/live-games/:gameId/qr — serve the game's QR code PNG from R2
  router.get('/:gameId/qr', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const deps = depsOr503(res);
      if (!deps) return;

      const { gameId } = req.params;
      if (!ObjectId.isValid(gameId)) return res.status(400).end();

      const filter = { _id: new ObjectId(gameId), ...ownerFilter(req) };
      const game = await deps.liveGamesCollection.findOne(filter, { projection: { gameQrKey: 1, gamePin: 1 } });
      if (!game) return res.status(404).end();

      let qrKey = game.gameQrKey;

      // Backfill: generate QR on-the-fly if stored key is missing
      if (!qrKey && game.gamePin) {
        try {
          qrKey = await generateAndUploadGameQr(game.gamePin);
          await deps.liveGamesCollection.updateOne(filter, { $set: { gameQrKey: qrKey } });
        } catch (err) {
          console.warn('ClassRush QR on-the-fly generation failed:', err.message);
          return res.status(500).end();
        }
      }

      if (!qrKey) return res.status(404).end();

      const buffer = await getObjectBuffer(qrKey);
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    } catch (err) {
      console.error('GET /api/live-games/:gameId/qr error:', err);
      return res.status(500).end();
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
      const existing = await deps.liveGamesCollection.findOne(filter, { projection: { ownerUserId: 1, ownerName: 1, createdAt: 1, gamePin: 1, gameQrKey: 1 } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
      }

      const gamePin = existing.gamePin || await generateGameDocPin(deps.liveGamesCollection);

      let gameQrKey = existing.gameQrKey || null;
      if (!gameQrKey && gamePin) {
        try {
          gameQrKey = await generateAndUploadGameQr(gamePin);
        } catch (qrErr) {
          console.warn('ClassRush QR backfill failed (non-fatal):', qrErr.message);
        }
      }

      const updates = { ...mapGameInput(req.body, existing.ownerUserId, existing.ownerName), gamePin, gameQrKey };

      await deps.liveGamesCollection.updateOne(filter, { $set: updates });

      return res.json({ success: true, message: 'Game updated.', gamePin, gameQrKey });
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
      const game = await deps.liveGamesCollection.findOne(filter, { projection: { gameQrKey: 1 } });
      if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
      }

      await deps.liveGamesCollection.deleteOne(filter);

      if (game.gameQrKey) {
        deleteFromR2(game.gameQrKey).catch(err =>
          console.warn('ClassRush QR R2 delete failed (non-fatal):', err.message)
        );
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
      const clonePin = await generateGameDocPin(deps.liveGamesCollection);

      let cloneQrKey = null;
      try {
        cloneQrKey = await generateAndUploadGameQr(clonePin);
      } catch (qrErr) {
        console.warn('ClassRush QR generation for clone failed (non-fatal):', qrErr.message);
      }

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
        ownerName: [req.session.firstName, req.session.lastName].filter(Boolean).join(' ') || original.ownerName,
        questionCount: (original.questions || []).length,
        gamePin: clonePin,
        gameQrKey: cloneQrKey,
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
