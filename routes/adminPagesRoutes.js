const express = require('express');

function createAdminPagesRoutes({ projectRoot, isAuthenticated, isAdmin }) {
  const router = express.Router();

  router.get('/admin_dashboard', isAuthenticated, isAdmin, (req, res) => {
    return res.render('pages/admin/dashboard', {
      title: 'Admin Dashboard | HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined
    });
  });

  router.get('/admin/teacher-verification', isAuthenticated, isAdmin, (req, res) => {
    return res.render('pages/admin/teacher-verification', {
      title: 'Teacher Verification | Admin | HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined
    });
  });

  router.get('/admin/users', isAuthenticated, isAdmin, (req, res) => {
    return res.render('pages/admin/users', {
      title: 'User Management | Admin | HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined
    });
  });

  return router;
}

module.exports = createAdminPagesRoutes;
