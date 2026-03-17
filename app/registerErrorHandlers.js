function registerErrorHandlers(app) {
  app.use((err, req, res, _next) => {
    console.error(err.stack);
    if (req.originalUrl.startsWith('/api')) {
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
    return res.status(500).render('pages/errors/500');
  });

  app.use((req, res) => {
    return res.status(404).render('pages/errors/404');
  });
}

module.exports = { registerErrorHandlers };
