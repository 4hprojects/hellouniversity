const path = require('path');
const express = require('express');
const request = require('supertest');

const createWebPagesRoutes = require('../../routes/webPagesRoutes');
const {
  getDsaLessons,
  getDsaProjects,
  getDsaSitemapEntries,
  getVisualDsaEntries
} = require('../../app/dsaContent');
const { getLessonsCatalogPageData } = require('../../app/lessonsCatalog');

function buildApp() {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = {};
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use(createWebPagesRoutes({
    projectRoot: process.cwd(),
    getBlogCollection: () => null,
    getLessonsCollection: () => null
  }));
  return app;
}

describe('DSA complete package public routes', () => {
  test('course landing renders roadmap, projects, and VisualDSA links', async () => {
    const response = await request(buildApp()).get('/data-structures-and-algorithms');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Data Structures and Algorithms');
    expect(response.text).toContain('Lesson 1: Introduction to DSA');
    expect(response.text).toContain('Applied Projects');
    expect(response.text).toContain('href="/visualdsa"');
    expect(response.text).toContain('Data Structures and Algorithms Course for Beginners');
  });

  test('representative lesson renders markdown content, navigation, and VisualDSA link', async () => {
    const response = await request(buildApp()).get('/data-structures-and-algorithms/stacks');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Lesson 8: Stacks');
    expect(response.text).toContain('<table>');
    expect(response.text).toContain('class Stack');
    expect(response.text).toContain('href="/visualdsa/stack-visualizer"');
    expect(response.text).toContain('Previous');
    expect(response.text).toContain('Lesson 7: Linked Lists');
    expect(response.text).toContain('Next');
    expect(response.text).toContain('Lesson 9: Queues');
    expect(response.text).toContain('Sign in with a student account to answer the Quick Check');
    expect(response.text).not.toContain('<h2>Quick Check</h2>');
    expect(response.text).not.toContain('<h2>Answer Key</h2>');
    expect(response.text).not.toContain('data-dsa-quick-check');
  });

  test('first and last lessons handle previous and next boundaries', async () => {
    const app = buildApp();
    const firstResponse = await request(app).get('/data-structures-and-algorithms/introduction');
    const lastResponse = await request(app).get('/data-structures-and-algorithms/dsa-review-and-integration');

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.text).not.toContain('Previous</span>');
    expect(firstResponse.text).toContain('Lesson 2: Algorithmic Thinking');
    expect(lastResponse.status).toBe(200);
    expect(lastResponse.text).toContain('Lesson 29: Tries');
    expect(lastResponse.text).not.toContain('Next</span>');
  });

  test('representative project route renders starter content and VisualDSA link', async () => {
    const response = await request(buildApp()).get('/data-structures-and-algorithms/projects/enrollment-queue-system');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Project 2: Queue-Based Enrollment System');
    expect(response.text).toContain('from collections import deque');
    expect(response.text).toContain('href="/visualdsa/enrollment-queue-system"');
  });

  test('VisualDSA landing and detail routes link back to related content', async () => {
    const app = buildApp();
    const landingResponse = await request(app).get('/visualdsa');
    const detailResponse = await request(app).get('/visualdsa/stack-visualizer');

    expect(landingResponse.status).toBe(200);
    expect(landingResponse.text).toContain('VisualDSA demo placeholders');
    expect(landingResponse.text).toContain('href="/visualdsa/stack-visualizer"');
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.text).toContain('Stacks VisualDSA Demo');
    expect(detailResponse.text).toContain('href="/data-structures-and-algorithms/stacks"');
  });

  test('all package lesson, project, and VisualDSA routes render', async () => {
    const app = buildApp();

    expect(getDsaLessons()).toHaveLength(30);
    expect(getDsaProjects()).toHaveLength(5);

    for (const lesson of getDsaLessons()) {
      const response = await request(app).get(lesson.href);
      expect(response.status).toBe(200);
      expect(response.text).toContain(lesson.title);
      expect(response.text).toContain(lesson.visualdsaRoute);
    }

    for (const project of getDsaProjects()) {
      const response = await request(app).get(project.href);
      expect(response.status).toBe(200);
      expect(response.text).toContain(project.title);
      expect(response.text).toContain(project.visualdsaRoute);
    }

    for (const demo of getVisualDsaEntries()) {
      const response = await request(app).get(demo.href);
      expect(response.status).toBe(200);
      expect(response.text).toContain(demo.relatedHref);
    }
  });

  test('missing DSA slugs fall through to 404', async () => {
    const app = buildApp();
    const lessonResponse = await request(app).get('/data-structures-and-algorithms/not-a-real-lesson');
    const projectResponse = await request(app).get('/data-structures-and-algorithms/projects/not-a-real-project');
    const demoResponse = await request(app).get('/visualdsa/not-a-real-demo');

    expect(lessonResponse.status).toBe(404);
    expect(projectResponse.status).toBe(404);
    expect(demoResponse.status).toBe(404);
  });

  test('DSA sitemap entries include canonical course, lesson, project, and VisualDSA URLs', () => {
    const sitemapLocations = getDsaSitemapEntries().map((entry) => entry.loc);

    expect(sitemapLocations).toContain('/data-structures-and-algorithms');
    expect(sitemapLocations).toContain('/data-structures-and-algorithms/stacks');
    expect(sitemapLocations).toContain('/data-structures-and-algorithms/projects/enrollment-queue-system');
    expect(sitemapLocations).toContain('/visualdsa');
    expect(sitemapLocations).toContain('/visualdsa/stack-visualizer');
  });

  test('main lessons catalog points the DSA track to the canonical course', () => {
    const catalog = getLessonsCatalogPageData();
    const dsaTrack = catalog.sections
      .flatMap((section) => section.tracks)
      .find((track) => track.id === 'dsa');

    expect(dsaTrack).toBeTruthy();
    expect(dsaTrack.lessons[0].href).toBe('/data-structures-and-algorithms');
    expect(dsaTrack.lessons.some((lesson) => lesson.href === '/data-structures-and-algorithms/stacks')).toBe(true);
  });
});
