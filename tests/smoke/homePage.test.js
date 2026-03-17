const path = require('path');
const express = require('express');
const request = require('supertest');

const createWebPagesRoutes = require('../../routes/webPagesRoutes');
const { getHomePageContent } = require('../../app/homePageContent');

function buildWebPagesApp(sessionData = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use(createWebPagesRoutes({ projectRoot: process.cwd() }));
  return app;
}

describe('home page smoke', () => {
  test('landing page renders server-side sections without legacy homepage script coupling', async () => {
    const app = buildWebPagesApp({});
    const homePageContent = getHomePageContent({
      role: undefined,
      isAuthenticated: false,
      brandName: 'HelloUniversity'
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('All-in-one platform for');
    expect(response.text).toContain(homePageContent.recentLessons[0].title);
    expect(response.text).toContain(homePageContent.recentBlogs[0].title);
    expect(response.text).toContain('id="homeRoleStudents"');
    expect(response.text).toContain('href="/#homeRoleStudents"');
    expect(response.text).toContain('href="/signup"');
    expect(response.text).not.toContain('/js/blogs.js');
    expect(response.text).not.toContain('randomBlogsContainer');
  });

  test('landing page adapts the primary workspace call to action for teacher sessions', async () => {
    const app = buildWebPagesApp({
      userId: 'T-1001',
      role: 'teacher'
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Open Teacher Workspace');
    expect(response.text).toContain('href="/teacher/dashboard"');
  });
});
