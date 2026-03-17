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

  return router;
}

module.exports = createAdminPagesRoutes;
