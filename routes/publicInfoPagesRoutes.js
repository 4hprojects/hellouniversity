const express = require('express');
const ejs = require('ejs');
const path = require('path');
const { helpFaqItems, buildFaqStructuredDataScript } = require('../app/faqContent');

function renderBodyInMainLayout(res, bodyTemplatePath, pageLocals) {
  return ejs.renderFile(bodyTemplatePath, pageLocals, (err, bodyHtml) => {
    if (err) {
      console.error('Error rendering body template:', err);
      return res.status(500).render('pages/errors/500');
    }

    return res.render('layouts/main', {
      ...pageLocals,
      body: bodyHtml
    });
  });
}

function createPageLocals(req, overrides = {}) {
  return {
    brandName: 'HelloUniversity',
    role: req.session?.role,
    user: req.session?.userId ? { role: req.session?.role } : undefined,
    showNav: true,
    showAds: false,
    ...overrides
  };
}

function createPublicInfoPagesRoutes({ projectRoot }) {
  const router = express.Router();

  router.get('/help.html', (_req, res) => res.redirect(301, '/help'));

  router.get('/help', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'help.ejs');
    return renderBodyInMainLayout(res, bodyPath, createPageLocals(req, {
      title: 'Help & Support | HelloUniversity',
      description: 'Get help with HelloUniversity login, signup, lessons, classes, quizzes, dashboards, and common school and higher education workflows.',
      canonicalUrl: 'https://hellouniversity.online/help',
      stylesheets: ['/css/help.css'],
      deferScriptUrls: ['/js/checkSession.js'],
      extraHead: buildFaqStructuredDataScript(helpFaqItems),
      helpFaqItems
    }));
  });

  router.get('/about', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'about.ejs');
    return renderBodyInMainLayout(res, bodyPath, createPageLocals(req, {
      title: 'About HelloUniversity',
      description: 'Learn how HelloGrade evolved into HelloUniversity, a digital academic platform for school and higher education workflows such as classes, assessments, communication, and learning management.',
      canonicalUrl: 'https://hellouniversity.online/about',
      stylesheets: ['/css/about.css'],
      deferScriptUrls: ['/js/checkSession.js']
    }));
  });

  router.get('/features', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'features.ejs');
    return renderBodyInMainLayout(res, bodyPath, createPageLocals(req, {
      title: 'Platform Features | HelloUniversity',
      description: 'Review the core HelloUniversity product areas across lessons, classes, assessments, communication, and student academic workflows.',
      canonicalUrl: 'https://hellouniversity.online/features',
      stylesheets: ['/css/platform-guides.css', '/css/study_picks_panel.css'],
      deferScriptUrls: ['/js/checkSession.js', '/js/studyPicksPanel.js']
    }));
  });

  router.get('/teacher-guide', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'teacher-guide.ejs');
    return renderBodyInMainLayout(res, bodyPath, createPageLocals(req, {
      title: 'Teacher Guide | HelloUniversity',
      description: 'See how you can set up classes, share materials, post updates, run quizzes, and review student activity in HelloUniversity.',
      canonicalUrl: 'https://hellouniversity.online/teacher-guide',
      stylesheets: ['/css/platform-guides.css'],
      deferScriptUrls: ['/js/checkSession.js']
    }));
  });

  router.get('/student-guide', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'student-guide.ejs');
    return renderBodyInMainLayout(res, bodyPath, createPageLocals(req, {
      title: 'Student Workflow Guide | HelloUniversity',
      description: 'Understand how students move through lessons, classes, activities, attendance, and grade-related visibility in HelloUniversity.',
      canonicalUrl: 'https://hellouniversity.online/student-guide',
      stylesheets: ['/css/platform-guides.css'],
      deferScriptUrls: ['/js/checkSession.js']
    }));
  });

  router.get('/how-it-works', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'how-it-works.ejs');
    return renderBodyInMainLayout(res, bodyPath, createPageLocals(req, {
      title: 'How HelloUniversity Works',
      description: 'See how HelloUniversity connects public learning resources, account access, and role-aware academic workspaces.',
      canonicalUrl: 'https://hellouniversity.online/how-it-works',
      stylesheets: ['/css/platform-guides.css'],
      deferScriptUrls: ['/js/checkSession.js']
    }));
  });

  router.get('/classrush-guide', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'classrush-guide.ejs');
    return renderBodyInMainLayout(res, bodyPath, createPageLocals(req, {
      title: 'ClassRush Guide | HelloUniversity',
      description: 'See how you can create a ClassRush game, start a live session, share a PIN or QR code, and review reports after class.',
      canonicalUrl: 'https://hellouniversity.online/classrush-guide',
      stylesheets: ['/css/platform-guides.css'],
      deferScriptUrls: ['/js/checkSession.js']
    }));
  });

  return router;
}

module.exports = createPublicInfoPagesRoutes;
