const path = require('path');
const express = require('express');
const request = require('supertest');

const createWebPagesRoutes = require('../../routes/webPagesRoutes');
const { createCollection } = require('../helpers/inMemoryMongo');
const { createPublishedBlogDoc, createUserDraftDoc } = require('../helpers/blogFixtures');

function buildApp(sessionData = {}, blogDocs = []) {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });

  const blogCollection = createCollection(blogDocs);
  app.use(createWebPagesRoutes({
    projectRoot: process.cwd(),
    getBlogCollection: () => blogCollection,
    isAuthenticated(req, res, next) {
      if (req.session?.userId) {
        return next();
      }
      return res.redirect('/login');
    },
    isAdmin(req, res, next) {
      if (req.session?.role === 'admin') {
        return next();
      }
      return res.status(403).send('Forbidden');
    }
  }));

  return app;
}

describe('blog pages smoke', () => {
  const blogDocs = [
    createPublishedBlogDoc({
      slug: 'sample-tech-post',
      category: 'tech',
      title: 'Sample Tech Post',
      description: 'Tech sample description.',
      contentHtml: '<p>Tech article body.</p>'
    }),
    createPublishedBlogDoc({
      slug: 'growth-random-post',
      category: 'gen',
      title: 'Growth Random Post',
      description: 'Growth sample description.',
      contentHtml: '<p>Growth article body.</p>'
    }),
    createPublishedBlogDoc({
      slug: 'finance-random-post',
      category: 'finance',
      title: 'Finance Random Post',
      description: 'Finance sample description.',
      contentHtml: '<p>Finance article body.</p>'
    }),
    createUserDraftDoc({
      slug: 'author-draft',
      title: 'Author Draft',
      status: 'draft'
    })
  ];

  test('/blogs renders published Mongo blog entries', async () => {
    const app = buildApp({}, blogDocs);
    const response = await request(app).get('/blogs');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Sample Tech Post');
    expect(response.text).toContain('Growth Random Post');
    expect(response.text).not.toContain('Author Draft');
  });

  test('/blogs/:category/:slug renders article content and random reads', async () => {
    const app = buildApp({}, blogDocs);
    const response = await request(app).get('/blogs/tech/sample-tech-post');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Tech article body.');
    expect(response.text).toContain('Random reads from the public archive');
    expect(response.text).toContain('Growth Random Post');
  });

  test('/blogs/new requires authentication', async () => {
    const app = buildApp({}, blogDocs);
    const response = await request(app).get('/blogs/new');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test('/blogs/new and /blogs/my-posts render for authenticated users', async () => {
    const app = buildApp({ userId: 'user-100', role: 'student' }, blogDocs);

    const newResponse = await request(app).get('/blogs/new');
    const mineResponse = await request(app).get('/blogs/my-posts');

    expect(newResponse.status).toBe(200);
    expect(newResponse.text).toContain('id="blogEditorPage"');
    expect(mineResponse.status).toBe(200);
    expect(mineResponse.text).toContain('id="blogMyPostsPage"');
  });

  test('/admin/blogs renders for admins', async () => {
    const app = buildApp({ userId: 'admin-1', role: 'admin' }, blogDocs);
    const response = await request(app).get('/admin/blogs');

    expect(response.status).toBe(200);
    expect(response.text).toContain('id="adminBlogReviewPage"');
  });
});
