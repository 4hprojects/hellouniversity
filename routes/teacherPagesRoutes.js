const express = require('express');

function renderTeacherPage(res, view, options = {}) {
  return res.render(view, {
    role: options.role,
    user: options.user,
    ...options
  });
}

function createTeacherPagesRoutes({ isAuthenticated, isTeacherOrAdminOrPending, getUsersCollection }) {
  const router = express.Router();

  function viewContext(req, overrides = {}) {
    return {
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      ...overrides
    };
  }

  router.get('/teacher/dashboard', isAuthenticated, isTeacherOrAdminOrPending, async (req, res) => {
    const role = req.session?.role;
    let pendingVerification = null;
    if (role === 'teacher_pending') {
      try {
        const { ObjectId } = require('mongodb');
        const col = getUsersCollection ? getUsersCollection() : null;
        if (col && ObjectId.isValid(req.session.userId)) {
          const u = await col.findOne(
            { _id: new ObjectId(req.session.userId) },
            { projection: { verificationDocKey: 1, verificationDocUploadedAt: 1 } }
          );
          pendingVerification = {
            docSubmitted: !!u?.verificationDocKey,
            uploadedAt: u?.verificationDocUploadedAt || null
          };
        }
      } catch (e) {
        console.error('Teacher dashboard pending lookup error:', e);
      }
    }
    return renderTeacherPage(res, 'pages/teacher/dashboard', viewContext(req, {
      title: 'Teacher Dashboard | HelloUniversity',
      description: 'Teacher workspace for lessons, quizzes, responses, and analytics.',
      canonicalUrl: 'https://hellouniversity.online/teacher/dashboard',
      stylesheets: ['/css/teacher_quizzes.css'],
      pendingVerification
    }));
  });

  router.get('/teacher/classes', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/dashboard', viewContext(req, {
      title: 'Class Management | HelloUniversity',
      description: 'Create, organize, and manage teacher-owned classes, enrollment, and class structure.',
      canonicalUrl: 'https://hellouniversity.online/teacher/classes',
      stylesheets: ['/css/teacher_quizzes.css']
    }));
  });

  router.get('/teacher/classes/new', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/editor', viewContext(req, {
      title: 'Create Class | HelloUniversity',
      description: 'Create a new class, set its schedule, and publish or save it as draft.',
      canonicalUrl: 'https://hellouniversity.online/teacher/classes/new',
      stylesheets: ['/css/teacher_quizzes.css'],
      classMode: 'create'
    }));
  });

  router.get('/teacher/classes/:classId', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/overview', viewContext(req, {
      title: 'Class Overview | HelloUniversity',
      description: 'Review class details, enrollment, teaching team, and quick management actions.',
      canonicalUrl: `https://hellouniversity.online/teacher/classes/${req.params.classId}`,
      stylesheets: ['/css/teacher_quizzes.css'],
      classId: req.params.classId
    }));
  });

  router.get('/teacher/classes/:classId/edit', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/editor', viewContext(req, {
      title: 'Edit Class | HelloUniversity',
      description: 'Update class information, visibility, and enrollment settings.',
      canonicalUrl: `https://hellouniversity.online/teacher/classes/${req.params.classId}/edit`,
      stylesheets: ['/css/teacher_quizzes.css'],
      classId: req.params.classId,
      classMode: 'edit'
    }));
  });

  router.get('/teacher/classes/:classId/students', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/students', viewContext(req, {
      title: 'Manage Students | HelloUniversity',
      description: 'Review the class roster, add students, and manage enrollment.',
      canonicalUrl: `https://hellouniversity.online/teacher/classes/${req.params.classId}/students`,
      stylesheets: ['/css/teacher_quizzes.css'],
      classId: req.params.classId
    }));
  });

  router.get('/teacher/classes/:classId/team', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/team', viewContext(req, {
      title: 'Teaching Team | HelloUniversity',
      description: 'Manage co-teachers and teaching team access for the current class.',
      canonicalUrl: `https://hellouniversity.online/teacher/classes/${req.params.classId}/team`,
      stylesheets: ['/css/teacher_quizzes.css'],
      classId: req.params.classId
    }));
  });

  router.get('/teacher/classes/:classId/modules', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/modules', viewContext(req, {
      title: 'Class Modules | HelloUniversity',
      description: 'Organize class modules, topics, and weekly structure.',
      canonicalUrl: `https://hellouniversity.online/teacher/classes/${req.params.classId}/modules`,
      stylesheets: ['/css/teacher_quizzes.css'],
      classId: req.params.classId
    }));
  });

  router.get('/teacher/classes/:classId/materials', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/materials', viewContext(req, {
      title: 'Class Materials | HelloUniversity',
      description: 'Manage uploaded class files, links, and supporting materials.',
      canonicalUrl: `https://hellouniversity.online/teacher/classes/${req.params.classId}/materials`,
      stylesheets: ['/css/teacher_quizzes.css'],
      classId: req.params.classId
    }));
  });

  router.get('/teacher/classes/:classId/announcements', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/announcements', viewContext(req, {
      title: 'Class Announcements | HelloUniversity',
      description: 'Post and manage updates for students in a class.',
      canonicalUrl: `https://hellouniversity.online/teacher/classes/${req.params.classId}/announcements`,
      stylesheets: ['/css/teacher_quizzes.css'],
      classId: req.params.classId
    }));
  });

  router.get('/teacher/classes/:classId/settings', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/classes/settings', viewContext(req, {
      title: 'Class Settings | HelloUniversity',
      description: 'Configure class behavior, enrollment, and lifecycle controls.',
      canonicalUrl: `https://hellouniversity.online/teacher/classes/${req.params.classId}/settings`,
      stylesheets: ['/css/teacher_quizzes.css'],
      classId: req.params.classId
    }));
  });

  router.get('/teacher/lessons/new', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'teacher/lessons_new', viewContext(req, {
      title: 'Create Lesson | HelloUniversity'
    }));
  });

  router.get('/teacher/quizzes', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/quizzes/dashboard', viewContext(req, {
      title: 'Quiz Dashboard | HelloUniversity',
      description: 'Manage draft, published, closed, and archived quizzes.',
      canonicalUrl: 'https://hellouniversity.online/teacher/quizzes',
      stylesheets: ['/css/teacher_quizzes.css']
    }));
  });

  router.get('/teacher/quizzes/new', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/quizzes/builder', viewContext(req, {
      title: 'Create Quiz | HelloUniversity',
      description: 'Build a new quiz with sections, questions, and settings.',
      canonicalUrl: 'https://hellouniversity.online/teacher/quizzes/new',
      stylesheets: ['/css/teacher_quizzes.css', '/css/teacher_quiz_builder.css'],
      quizMode: 'create'
    }));
  });

  router.get('/teacher/quizzes/:quizId/edit', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/quizzes/builder', viewContext(req, {
      title: 'Edit Quiz | HelloUniversity',
      description: 'Edit quiz structure, questions, and settings.',
      canonicalUrl: `https://hellouniversity.online/teacher/quizzes/${req.params.quizId}/edit`,
      stylesheets: ['/css/teacher_quizzes.css', '/css/teacher_quiz_builder.css'],
      quizId: req.params.quizId,
      quizMode: 'edit'
    }));
  });

  router.get('/teacher/quizzes/:quizId/preview', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/quizzes/preview', viewContext(req, {
      title: 'Quiz Preview | HelloUniversity',
      description: 'Preview the quiz experience before publishing.',
      canonicalUrl: `https://hellouniversity.online/teacher/quizzes/${req.params.quizId}/preview`,
      stylesheets: ['/css/teacher_quizzes.css'],
      quizId: req.params.quizId
    }));
  });

  router.get('/teacher/quizzes/:quizId/responses', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/quizzes/responses', viewContext(req, {
      title: 'Quiz Responses | HelloUniversity',
      description: 'Review submissions, grading progress, and response status.',
      canonicalUrl: `https://hellouniversity.online/teacher/quizzes/${req.params.quizId}/responses`,
      stylesheets: ['/css/teacher_quizzes.css'],
      quizId: req.params.quizId
    }));
  });

  router.get('/teacher/quizzes/:quizId/analytics', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return renderTeacherPage(res, 'pages/teacher/quizzes/analytics', viewContext(req, {
      title: 'Quiz Analytics | HelloUniversity',
      description: 'View completion, score, and item-level analytics for a quiz.',
      canonicalUrl: `https://hellouniversity.online/teacher/quizzes/${req.params.quizId}/analytics`,
      stylesheets: ['/css/teacher_quizzes.css'],
      quizId: req.params.quizId
    }));
  });

  router.get('/teacher/quizzes/:quizId/results', isAuthenticated, isTeacherOrAdminOrPending, (req, res) => {
    return res.redirect(`/teacher/quizzes/${req.params.quizId}/responses`);
  });

  return router;
}

module.exports = createTeacherPagesRoutes;
