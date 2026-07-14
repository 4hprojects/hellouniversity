const path = require('path');
const express = require('express');
const request = require('supertest');

const createWebPagesRoutes = require('../../routes/webPagesRoutes');
const {
  getDsaLessons,
  getDsaProjects,
  getDsaSitemapEntries,
  getVisualDsaEntries,
  getVisualDsaEntryBySlug
} = require('../../app/dsaContent');
const { getLessonsCatalogPageData } = require('../../app/lessonsCatalog');

function buildApp(session = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = { ...session };
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
    expect(landingResponse.text).toContain('Explore algorithms step by step');
    expect(landingResponse.text).toContain('Interactive VisualDSA modules');
    expect(landingResponse.text).toContain('Launch visualization');
    expect(landingResponse.text).toContain('data-visualdsa-sidebar-toggle');
    expect(landingResponse.text).toContain('src="/js/visualdsa/navigation.js"');
    expect(landingResponse.text).toContain('href="/visualdsa/stack-visualizer"');
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.text).toContain('Stacks VisualDSA Demo');
    expect(detailResponse.text).toContain('href="/data-structures-and-algorithms/stacks"');
  });

  test('VisualDSA landing separates working modules from planned routes', async () => {
    const response=await request(buildApp()).get('/visualdsa');expect(response.status).toBe(200);
    expect(response.text).toContain('href="/visualdsa/array-visualizer"');expect(response.text).toContain('Array Operations');
    expect(response.text).toContain('Planned curriculum visuals');expect(response.text).toContain('href="/visualdsa/linked-list-visualizer"');
    expect(response.text).not.toContain('VisualDSA demo placeholders');
  });

  test('research module routes render the shared accessible shell', async () => {
    const response = await request(buildApp()).get('/visualdsa/array-visualizer');

    expect(response.status).toBe(200);
    expect(response.text).toContain('data-visualdsa-shell');
    expect(response.text).toContain('data-visualdsa-sidebar-toggle');
    expect(response.text).toContain('data-module-key="arrays"');
    expect(response.text).toContain('aria-labelledby="visualDsaWorkspaceTitle"');
    expect(response.text).toContain('role="img"');
    expect(response.text).toContain('aria-live="polite"');
    expect(response.text).toContain('href="/css/visualdsa/shell.css"');
    expect(response.text).toContain('src="/js/visualdsa/visualDsaPage.js"');
    expect(response.text).toContain('src="/js/visualdsa/modules/arrays/arrayModule.js"');
    expect(response.text).toContain('data-visualdsa-array-input');
    expect(response.text).toContain('Student toolkit');
    expect(response.text).toContain('Learn the idea, not just the animation');
    expect(response.text).toContain('Need a nudge?');
    expect(response.text).toContain('Check your understanding:');
    expect(response.text).toContain('Use 1–12 whole numbers');
    expect(response.text).toContain('Recorded assessments open from published assignments on My Progress');
  });

  test('unfinished curriculum routes render a documented unavailable state without loading the shell', async () => {
    const response = await request(buildApp()).get('/visualdsa/linked-list-visualizer');

    expect(response.status).toBe(200);
    expect(response.text).toContain('This module is not available yet');
    expect(response.text).toContain('href="/data-structures-and-algorithms/linked-lists"');
    expect(response.text).not.toContain('data-visualdsa-shell');
    expect(response.text).not.toContain('src="/js/visualdsa/visualDsaPage.js"');
  });

  test('Stack route loads its module adapter and input controls', async () => {
    const response = await request(buildApp()).get('/visualdsa/stack-visualizer');
    expect(response.status).toBe(200);
    expect(response.text).toContain('data-module-key="stacks"');
    expect(response.text).toContain('data-visualdsa-stack-input');
    expect(response.text).toContain('src="/js/visualdsa/modules/stacks/stackModule.js"');
  });

  test('Queue route loads its module adapter and input controls', async () => {
    const response = await request(buildApp()).get('/visualdsa/queue-visualizer');
    expect(response.status).toBe(200);
    expect(response.text).toContain('data-module-key="queues"');
    expect(response.text).toContain('data-visualdsa-queue-input');
    expect(response.text).toContain('src="/js/visualdsa/modules/queues/queueModule.js"');
  });
  test('Binary Search route loads active-range module controls',async()=>{const response=await request(buildApp()).get('/visualdsa/binary-search-visualizer');expect(response.status).toBe(200);expect(response.text).toContain('data-visualdsa-binary-search-input');expect(response.text).toContain('src="/js/visualdsa/modules/binary-search/binarySearchModule.js"');});
  test.each(['bubble-sort-visualizer','selection-sort-visualizer','insertion-sort-visualizer'])('Sorting alias %s loads the shared adapter',async(slug)=>{const response=await request(buildApp()).get(`/visualdsa/${slug}`);expect(response.status).toBe(200);expect(response.text).toContain('data-module-key="sorting"');expect(response.text).toContain('data-visualdsa-sorting-input');expect(response.text).toContain('src="/js/visualdsa/modules/sorting/sortingModule.js"');});
  test('BST route loads SVG and textual tree module controls',async()=>{const response=await request(buildApp()).get('/visualdsa/binary-search-tree-visualizer');expect(response.status).toBe(200);expect(response.text).toContain('data-visualdsa-bst-input');expect(response.text).toContain('data-visualdsa-bst-text');expect(response.text).toContain('src="/js/visualdsa/modules/bst/bstModule.js"');});
  test('student progress route requires login and renders the student analytics shell',async()=>{const anonymous=await request(buildApp()).get('/visualdsa/progress');expect(anonymous.status).toBe(302);expect(anonymous.headers.location).toContain('/login');const student=await request(buildApp({userId:'u',studentIDNumber:'s',role:'student'})).get('/visualdsa/progress');expect(student.status).toBe(200);expect(student.text).toContain('data-visualdsa-progress');expect(student.text).toContain('My VisualDSA Progress');expect(student.text).toContain('src="/js/visualdsa/progressPage.js"');});
  test('valid class context is rendered for enrollment-authorized recorded practice requests',async()=>{const id='507f1f77bcf86cd799439011';const response=await request(buildApp({userId:'u',studentIDNumber:'s',role:'student'})).get(`/visualdsa/array-visualizer?classId=${id}`);expect(response.status).toBe(200);expect(response.text).toContain(`data-practice-class-id="${id}"`);const invalid=await request(buildApp({userId:'u',studentIDNumber:'s',role:'student'})).get('/visualdsa/array-visualizer?classId=bad');expect(invalid.text).toContain('data-practice-class-id=""');});

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

  test('public DSA and VisualDSA pages preserve canonical metadata and indexability', async () => {
    const app = buildApp();
    const cases = [
      ['/data-structures-and-algorithms', 'https://hellouniversity.online/data-structures-and-algorithms'],
      ['/data-structures-and-algorithms/stacks', 'https://hellouniversity.online/data-structures-and-algorithms/stacks'],
      ['/data-structures-and-algorithms/projects/enrollment-queue-system', 'https://hellouniversity.online/data-structures-and-algorithms/projects/enrollment-queue-system'],
      ['/visualdsa', 'https://hellouniversity.online/visualdsa'],
      ['/visualdsa/stack-visualizer', 'https://hellouniversity.online/visualdsa/stack-visualizer']
    ];

    for (const [route, canonicalUrl] of cases) {
      const response = await request(app).get(route);
      expect(response.status).toBe(200);
      expect(response.text).toContain(`<link rel="canonical" href="${canonicalUrl}">`);
      expect(response.text).toContain('<meta name="description"');
      expect(response.text).toContain('<meta name="robots" content="index, follow">');
    }
  });

  test('trailing slashes and legacy .html suffixes retain canonical route metadata', async () => {
    const app = buildApp();
    const cases = [
      ['/data-structures-and-algorithms/', 'https://hellouniversity.online/data-structures-and-algorithms'],
      ['/data-structures-and-algorithms/stacks/', 'https://hellouniversity.online/data-structures-and-algorithms/stacks'],
      ['/data-structures-and-algorithms/stacks.html', 'https://hellouniversity.online/data-structures-and-algorithms/stacks'],
      ['/data-structures-and-algorithms/projects/enrollment-queue-system.html', 'https://hellouniversity.online/data-structures-and-algorithms/projects/enrollment-queue-system'],
      ['/visualdsa/', 'https://hellouniversity.online/visualdsa'],
      ['/visualdsa/stack-visualizer.html', 'https://hellouniversity.online/visualdsa/stack-visualizer']
    ];

    for (const [route, canonicalUrl] of cases) {
      const response = await request(app).get(route);
      expect(response.status).toBe(200);
      expect(response.text).toContain(`<link rel="canonical" href="${canonicalUrl}">`);
    }
  });

  test('VisualDSA registry routes and sitemap locations are unique and point to valid related content', () => {
    const lessons = getDsaLessons();
    const projects = getDsaProjects();
    const demos = getVisualDsaEntries();
    const demoRoutes = demos.map((demo) => demo.href);
    const sitemapLocations = getDsaSitemapEntries().map((entry) => entry.loc);
    const validRelatedRoutes = new Set([
      ...lessons.map((lesson) => lesson.href),
      ...projects.map((project) => project.href)
    ]);

    expect(new Set(demoRoutes).size).toBe(demoRoutes.length);
    expect(new Set(demos.map((demo) => demo.slug)).size).toBe(demos.length);
    expect(new Set(sitemapLocations).size).toBe(sitemapLocations.length);

    demos.forEach((demo) => {
      expect(demo.href).toBe(`/visualdsa/${demo.slug}`);
      expect(getVisualDsaEntryBySlug(demo.slug)).toEqual(demo);
      expect(validRelatedRoutes.has(demo.relatedHref)).toBe(true);
    });
  });

  test('lesson quick-check rendering remains role-aware', async () => {
    const anonymous = await request(buildApp()).get('/data-structures-and-algorithms/stacks');
    const student = await request(buildApp({
      userId: 'student-user',
      studentIDNumber: '2026-0001',
      role: 'student'
    })).get('/data-structures-and-algorithms/stacks');
    const teacher = await request(buildApp({
      userId: 'teacher-user',
      role: 'teacher'
    })).get('/data-structures-and-algorithms/stacks');
    const admin = await request(buildApp({
      userId: 'admin-user',
      role: 'admin'
    })).get('/data-structures-and-algorithms/stacks');

    expect(anonymous.text).toContain('Sign in with a student account');
    expect(anonymous.text).not.toContain('data-dsa-quick-check data-lesson-slug="stacks"');
    expect(student.text).toContain('data-dsa-quick-check data-lesson-slug="stacks"');
    expect(student.text).toContain('src="/js/dsaQuickCheck.js"');
    expect(teacher.text).toContain('Instructor review lives inside DSA-enabled class workspaces.');
    expect(teacher.text).not.toContain('src="/js/dsaQuickCheck.js"');
    expect(admin.text).toContain('Instructor review lives inside DSA-enabled class workspaces.');
    expect(admin.text).not.toContain('src="/js/dsaQuickCheck.js"');
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
