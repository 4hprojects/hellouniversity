const express = require('express');

function renderTeacherPage(res, view, options = {}) {
  return res.render(view, {
    role: options.role,
    user: options.user,
    ...options
  });
}

function createLiveGamePagesRoutes({ isAuthenticated, isTeacherOrAdmin, isTeacherOrAdminOrPending }) {
  const router = express.Router();

  function viewContext(req, overrides = {}) {
    return {
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      ...overrides
    };
  }

  // Teacher: Game Dashboard
  router.get('/teacher/live-games', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/live-games/dashboard', viewContext(req, {
      title: 'Live Games | HelloUniversity',
      description: 'Create and manage Kahoot-style live quiz games.',
      canonicalUrl: 'https://hellouniversity.online/teacher/live-games',
      stylesheets: ['/css/live_games.css']
    }));
  });

  // Teacher: Create New Game
  router.get('/teacher/live-games/new', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/live-games/builder', viewContext(req, {
      title: 'Create Live Game | HelloUniversity',
      description: 'Build a new live quiz game with multiple choice and true/false questions.',
      canonicalUrl: 'https://hellouniversity.online/teacher/live-games/new',
      stylesheets: ['/css/live_games.css'],
      gameMode: 'create'
    }));
  });

  // Teacher: Edit Game
  router.get('/teacher/live-games/:gameId/edit', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/live-games/builder', viewContext(req, {
      title: 'Edit Live Game | HelloUniversity',
      description: 'Edit your live quiz game questions and settings.',
      canonicalUrl: `https://hellouniversity.online/teacher/live-games/${req.params.gameId}/edit`,
      stylesheets: ['/css/live_games.css'],
      gameId: req.params.gameId,
      gameMode: 'edit'
    }));
  });

  // Teacher: Host Game (full-screen control panel)
  router.get('/teacher/live-games/:gameId/host', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return res.render('pages/teacher/live-games/host', {
      title: 'Host Live Game | HelloUniversity',
      gameId: req.params.gameId,
      userId: req.session?.userId,
      userName: req.session?.userName || req.session?.name || 'Host',
      showNav: false,
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined
    });
  });

  // Player: Join Game (public page — no login required)
  router.get('/play', (req, res) => {
    const pin = req.query.pin || '';
    const userId = req.session?.userId || '';
    const userName = req.session?.userName || req.session?.name || '';
    const isLoggedIn = Boolean(req.session?.userId);

    return res.render('pages/play', {
      title: 'Join Live Game | HelloUniversity',
      description: 'Enter a game PIN to join a live quiz.',
      canonicalUrl: 'https://hellouniversity.online/play',
      showNav: false,
      pin,
      userId,
      userName,
      isLoggedIn,
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined
    });
  });

  return router;
}

module.exports = createLiveGamePagesRoutes;
