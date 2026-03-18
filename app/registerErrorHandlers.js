function registerErrorHandlers(app) {
  app.use((err, req, res, _next) => {
    console.error(err.stack);
    if (req.originalUrl.startsWith('/api')) {
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
    try {
      return res.status(500).render('pages/errors/500');
    } catch {
      return res.status(500).send('Internal Server Error');
    }
  });

  app.use((req, res) => {
    try {
      return res.status(404).render('pages/errors/404');
    } catch {
      return res.status(404).send('Not Found');
    }
  });
}

module.exports = { registerErrorHandlers };
