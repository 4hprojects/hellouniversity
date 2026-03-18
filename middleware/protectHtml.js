module.exports = function protectHtml(rootDir) {
  return function (req, res, next) {
    const pathStr = req.path.toLowerCase();
    const isProtectedDashboard = pathStr === '/dashboard.html';
    const isProtectedTeacherHtml = /^\/teacher\/.+\.html$/.test(pathStr);

    if (isProtectedDashboard || isProtectedTeacherHtml) {
      if (!req.session?.userId) {
        return res.redirect('/login');
      }
      if (isProtectedTeacherHtml) {
        const role = req.session?.role;
        if (role !== 'teacher' && role !== 'admin' && role !== 'teacher_pending') {
          return res.status(403).render('pages/errors/403');
        }
      }
    }
    next();
  };
};
