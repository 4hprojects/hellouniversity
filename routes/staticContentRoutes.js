const express = require('express');
const path = require('path');
const fs = require('fs');

function sendFirstExistingFile(res, next, filePaths) {
  const filePath = filePaths.find((candidate) => fs.existsSync(candidate));
  if (!filePath) {
    return next();
  }

  return res.sendFile(filePath);
}

function createStaticContentRoutes({ projectRoot }) {
  const router = express.Router();

  router.get('/blogs/:blogId', (req, res, next) => {
    const { blogId } = req.params;
    if (!/^[a-zA-Z0-9\-_]+$/.test(blogId)) return next();

    return sendFirstExistingFile(res, next, [
      path.join(projectRoot, 'public', 'blogs', `${blogId}.html`)
    ]);
  });

  router.get('/events/css/:asset', (req, res, next) => {
    const { asset } = req.params;
    if (!/^[a-zA-Z0-9._-]+$/.test(asset)) return next();

    return sendFirstExistingFile(res, next, [
      path.join(projectRoot, 'public', 'events', 'css', asset),
      path.join(projectRoot, 'public', 'blogs', 'events', 'css', asset)
    ]);
  });

  router.get('/events/js/:asset', (req, res, next) => {
    const { asset } = req.params;
    if (!/^[a-zA-Z0-9._-]+$/.test(asset)) return next();

    return sendFirstExistingFile(res, next, [
      path.join(projectRoot, 'public', 'events', 'js', asset),
      path.join(projectRoot, 'public', 'blogs', 'events', 'js', asset)
    ]);
  });

  router.get('/events/:blogId', (req, res, next) => {
    const blogId = req.params.blogId.replace(/\.html$/i, '');
    if (!/^[a-zA-Z0-9\-_]+$/.test(blogId)) return next();

    return sendFirstExistingFile(res, next, [
      path.join(projectRoot, 'public', 'events', `${blogId}.html`),
      path.join(projectRoot, 'public', 'blogs', 'events', `${blogId}.html`)
    ]);
  });

  router.get('/blogs/tech-comparison/:slug', (req, res, next) => {
    const { slug } = req.params;
    const filePath = path.join(projectRoot, 'public', 'blogs', 'tech-comparison', `${slug}.html`);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) return next();
      return res.sendFile(filePath);
    });
  });

  router.get('/ads.txt', (req, res) => {
    res.type('text/plain');
    return res.send('google.com, pub-4537208011192461, DIRECT, f08c47fec0942fa0');
  });

  router.get('/:folder/:page', (req, res, next) => {
    const { folder, page } = req.params;
    if (!/^[a-zA-Z0-9\-_]+$/.test(folder) || !/^[a-zA-Z0-9\-_]+$/.test(page)) return next();

    const filePath = path.join(projectRoot, 'public', folder, `${page}.html`);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) return next();
      return res.sendFile(filePath);
    });
  });

  // Serve HTML files from any subfolder depth without .html extension
  router.get('/*', (req, res, next) => {
    const segments = req.path.replace(/^\/+/, '').split('/');
    if (!segments.every((seg) => /^[a-zA-Z0-9\-_]+$/.test(seg))) return next();

    const filePath = path.join(projectRoot, 'public', ...segments) + '.html';
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) return next();
      return res.sendFile(filePath);
    });
  });

  return router;
}

module.exports = createStaticContentRoutes;
