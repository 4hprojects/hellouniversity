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
      title: 'ClassRush | HelloUniversity',
      description: 'ClassRush — Where knowledge meets competition. Create and host live quiz games.',
      canonicalUrl: 'https://hellouniversity.online/teacher/live-games',
      stylesheets: ['/css/live_games.css']
    }));
  });

  // Teacher: Create New Game
  router.get('/teacher/live-games/new', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/live-games/builder', viewContext(req, {
      title: 'Create ClassRush Game | HelloUniversity',
      description: 'Build a new ClassRush game with multiple choice and true/false questions.',
      canonicalUrl: 'https://hellouniversity.online/teacher/live-games/new',
      stylesheets: ['/css/live_games.css'],
      gameMode: 'create'
    }));
  });

  // Teacher: Edit Game
  router.get('/teacher/live-games/:gameId/edit', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/live-games/builder', viewContext(req, {
      title: 'Edit ClassRush Game | HelloUniversity',
      description: 'Edit your ClassRush game questions and settings.',
      canonicalUrl: `https://hellouniversity.online/teacher/live-games/${req.params.gameId}/edit`,
      stylesheets: ['/css/live_games.css'],
      gameId: req.params.gameId,
      gameMode: 'edit'
    }));
  });

  // Teacher: Host Game (full-screen control panel)
  router.get('/teacher/live-games/:gameId/host', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return res.render('pages/teacher/live-games/host', {
      title: 'Host ClassRush | HelloUniversity',
      gameId: req.params.gameId,
      userId: req.session?.userId,
      userName: [req.session?.firstName, req.session?.lastName].filter(Boolean).join(' ') || 'Host',
      showNav: false,
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined
    });
  });

  router.get('/teacher/live-games/:gameId/reports', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/live-games/reports', viewContext(req, {
      title: 'ClassRush Reports | HelloUniversity',
      description: 'Review completed ClassRush sessions and analytics.',
      canonicalUrl: `https://hellouniversity.online/teacher/live-games/${req.params.gameId}/reports`,
      stylesheets: ['/css/live_games.css'],
      gameId: req.params.gameId
    }));
  });

  router.get('/teacher/live-games/:gameId/reports/:sessionId', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/live-games/report-detail', viewContext(req, {
      title: 'ClassRush Report Detail | HelloUniversity',
      description: 'Inspect leaderboard, question analytics, and player performance for a completed ClassRush session.',
      canonicalUrl: `https://hellouniversity.online/teacher/live-games/${req.params.gameId}/reports/${req.params.sessionId}`,
      stylesheets: ['/css/live_games.css'],
      gameId: req.params.gameId,
      sessionId: req.params.sessionId
    }));
  });

  // Player: Join Game (public page — no login required)
  router.get('/play', (req, res) => {
    const pin = req.query.pin || '';
    const userId = req.session?.userId || '';
    const userName = req.session?.userName || req.session?.name || '';
    const isLoggedIn = Boolean(req.session?.userId);

    return res.render('pages/play', {
      title: 'Join ClassRush | HelloUniversity',
      description: 'Enter a game PIN to join a ClassRush session.',
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
