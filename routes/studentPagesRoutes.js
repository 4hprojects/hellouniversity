const express = require('express');
const ejs = require('ejs');
const path = require('path');
const { buildLoginRedirectPath } = require('../utils/returnTo');

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

function createStudentPagesRoutes({ projectRoot, isAuthenticated }) {
  const router = express.Router();

  function requireStudentClassRushLogin(req, res, next) {
    if (req.session?.userId) {
      return isAuthenticated(req, res, next);
    }

    return res.redirect(buildLoginRedirectPath(req.originalUrl || req.url || '/classrush'));
  }

  router.get('/dashboard', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'student', 'dashboard.ejs');
    const displayName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() || 'Student';
    const pageLocals = {
      title: 'Student Dashboard | HelloUniversity',
      description: 'See what needs attention first, open your classes, and review your latest student summary in one dashboard.',
      canonicalUrl: 'https://hellouniversity.online/dashboard',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/student_dashboard.css', '/css/study_picks_panel.css'],
      scriptUrls: ['/js/studentDashboard.js'],
      deferScriptUrls: ['/js/studyPicksPanel.js'],
      studentDisplayName: displayName,
      studentIDNumber: req.session?.studentIDNumber || '',
      studentRole: req.session?.role || 'student'
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/attendance.html', isAuthenticated, (_req, res) => {
    return res.redirect(301, '/attendance');
  });

  router.get('/attendance', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'student', 'attendance.ejs');
    const displayName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() || 'Student';
    const pageLocals = {
      title: 'Attendance | HelloUniversity',
      description: 'Review your attendance records, filter by course, and export your current attendance view from the student workspace.',
      canonicalUrl: 'https://hellouniversity.online/attendance',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/student_dashboard.css', '/css/attendance.css'],
      scriptUrls: ['/vendor/xlsx/xlsx.full.min.js'],
      deferScriptUrls: ['/js/attendance.js'],
      studentDisplayName: displayName,
      studentIDNumber: req.session?.studentIDNumber || '',
      studentRole: req.session?.role || 'student'
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/activities.html', isAuthenticated, (_req, res) => {
    return res.redirect(301, '/activities');
  });

  router.get('/activities', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'student', 'activities.ejs');
    const displayName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() || 'Student';
    const pageLocals = {
      title: 'Activities | HelloUniversity',
      description: 'View your assigned quizzes and class activities.',
      canonicalUrl: 'https://hellouniversity.online/activities',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/student_dashboard.css', '/css/activities.css'],
      deferScriptUrls: ['/js/activities.js'],
      studentDisplayName: displayName,
      studentIDNumber: req.session?.studentIDNumber || '',
      studentRole: req.session?.role || 'student'
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/grades.html', isAuthenticated, (_req, res) => {
    return res.redirect(301, '/grades');
  });

  router.get('/grades', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'student', 'grades.ejs');
    const displayName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() || 'Student';
    const pageLocals = {
      title: 'Grades | HelloUniversity',
      description: 'Review your course grade records, latest final grade, and midterm and finals breakdowns in one student page.',
      canonicalUrl: 'https://hellouniversity.online/grades',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/student_dashboard.css'],
      deferScriptUrls: ['/js/studentGrades.js'],
      studentDisplayName: displayName,
      studentIDNumber: req.session?.studentIDNumber || '',
      studentRole: req.session?.role || 'student'
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/classes', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'student', 'classes.ejs');
    const displayName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() || 'Student';
    const pageLocals = {
      title: 'My Classes | HelloUniversity',
      description: 'Review the classes you have joined, open a class workspace, and join a new class from one student hub.',
      canonicalUrl: 'https://hellouniversity.online/classes',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/student_dashboard.css', '/css/student_classes.css'],
      deferScriptUrls: ['/js/studentClasses.js'],
      studentDisplayName: displayName,
      studentIDNumber: req.session?.studentIDNumber || '',
      studentRole: req.session?.role || 'student'
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/classes/:classId', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'student', 'class-detail.ejs');
    const displayName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() || 'Student';
    const pageLocals = {
      title: 'Class Overview | HelloUniversity',
      description: 'Review class details, assigned activities, and student quick links for one joined class.',
      canonicalUrl: `https://hellouniversity.online/classes/${req.params.classId}`,
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/student_dashboard.css', '/css/student_classes.css'],
      deferScriptUrls: ['/js/studentClasses.js'],
      studentDisplayName: displayName,
      studentIDNumber: req.session?.studentIDNumber || '',
      studentRole: req.session?.role || 'student',
      classId: req.params.classId
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/quizzes/:quizId/respond', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'student', 'quiz-respond.ejs');
    const displayName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() || 'Student';
    const pageLocals = {
      title: 'Respond to Quiz | HelloUniversity',
      description: 'Open and submit your assigned quiz in the HelloUniversity student workspace.',
      canonicalUrl: `https://hellouniversity.online/quizzes/${req.params.quizId}/respond`,
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/student_dashboard.css', '/css/quiz.css'],
      deferScriptUrls: ['/js/quizzes/player.js'],
      extraScripts: `
        <script nonce="${res.locals.nonce || ''}">
          window.__QUIZ_ID__ = ${JSON.stringify(req.params.quizId)};
        </script>
      `,
      studentDisplayName: displayName,
      studentIDNumber: req.session?.studentIDNumber || '',
      studentRole: req.session?.role || 'student'
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/classrush/assignments/:assignmentId', requireStudentClassRushLogin, (req, res) => {
    const displayName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim() || 'Student';
    return res.render('pages/student/classrush-assignment', {
      title: 'ClassRush Assignment | HelloUniversity',
      description: 'Open and complete your assigned self-paced ClassRush activity in a dedicated ClassRush player.',
      canonicalUrl: `https://hellouniversity.online/classrush/assignments/${req.params.assignmentId}`,
      nonce: res.locals.nonce || '',
      studentDisplayName: displayName,
      studentIDNumber: req.session?.studentIDNumber || '',
      studentRole: req.session?.role || 'student',
      assignmentId: req.params.assignmentId
    });
  });

  return router;
}

module.exports = createStudentPagesRoutes;
