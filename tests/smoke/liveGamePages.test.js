const path = require('path');
const express = require('express');
const request = require('supertest');

const createLiveGamePagesRoutes = require('../../routes/liveGamePagesRoutes');
const { isAuthenticated, isTeacherOrAdmin, isTeacherOrAdminOrPending } = require('../../middleware/routeAuthGuards');

function buildLiveGamePagesApp(sessionData = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use(createLiveGamePagesRoutes({
    isAuthenticated,
    isTeacherOrAdmin,
    isTeacherOrAdminOrPending
  }));
  return app;
}

describe('live game pages smoke', () => {
  const teacherSession = {
    userId: '507f1f77bcf86cd799439011',
    role: 'teacher',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  };

  test('teacher live-game routes render for authenticated teachers', async () => {
    const app = buildLiveGamePagesApp(teacherSession);

    const dashboardResponse = await request(app).get('/teacher/live-games');
    const builderResponse = await request(app).get('/teacher/live-games/new');
    const editResponse = await request(app).get('/teacher/live-games/507f1f77bcf86cd799439099/edit');
    const hostResponse = await request(app).get('/teacher/live-games/507f1f77bcf86cd799439099/host');
    const reportsResponse = await request(app).get('/teacher/live-games/507f1f77bcf86cd799439099/reports');
    const reportDetailResponse = await request(app).get('/teacher/live-games/507f1f77bcf86cd799439099/reports/507f1f77bcf86cd799439088');
    const assignmentDetailResponse = await request(app).get('/teacher/live-games/507f1f77bcf86cd799439099/assignments/507f1f77bcf86cd799439077');

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.text).toContain('ClassRush');
    expect(dashboardResponse.text).toContain('teacherGameDashboard.js');

    expect(builderResponse.status).toBe(200);
    expect(builderResponse.text).toContain('Create ClassRush Game');
    expect(builderResponse.text).toContain('Poll');
    expect(builderResponse.text).toContain('Type Answer');
    expect(builderResponse.text).toContain('Randomize question order');
    expect(builderResponse.text).toContain('lgLaunchContext');
    expect(builderResponse.text).toContain('Back to Class');
    expect(builderResponse.text).toContain('lgAssignBtn');
    expect(builderResponse.text).toContain('lgAssignOverlay');

    expect(editResponse.status).toBe(200);
    expect(editResponse.text).toContain('Edit ClassRush Game');

    expect(hostResponse.status).toBe(200);
    expect(hostResponse.text).toContain('Host ClassRush');
    expect(hostResponse.text).toContain('hellouniversity.online/play');

    expect(reportsResponse.status).toBe(200);
    expect(reportsResponse.text).toContain('ClassRush Reports');
    expect(reportsResponse.text).toContain('Self-Paced Assignments');

    expect(reportDetailResponse.status).toBe(200);
    expect(reportDetailResponse.text).toContain('ClassRush Report Detail');
    expect(reportDetailResponse.text).toContain('Export CSV');

    expect(assignmentDetailResponse.status).toBe(200);
    expect(assignmentDetailResponse.text).toContain('Self-Paced Assignment');
    expect(assignmentDetailResponse.text).toContain('teacherGameReports.js');
  });

  test('play page renders without authentication', async () => {
    const app = buildLiveGamePagesApp();

    const response = await request(app).get('/play?pin=1234567');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Join ClassRush');
    expect(response.text).toContain('Where knowledge meets competition.');
    expect(response.text).toContain('data-pin="1234567"');
    expect(response.text).toContain('id="openLoginBtn"');
    expect(response.text).toContain('id="playerLoginOverlay"');
    expect(response.text).toContain('/js/authClient.js');
  });

  test('unauthenticated teacher ClassRush routes redirect to login with returnTo', async () => {
    const app = buildLiveGamePagesApp();

    const dashboardResponse = await request(app).get('/teacher/live-games');
    const builderResponse = await request(app).get('/teacher/live-games/new');
    const hostResponse = await request(app).get('/teacher/live-games/507f1f77bcf86cd799439099/host');
    const reportResponse = await request(app).get('/teacher/live-games/507f1f77bcf86cd799439099/reports/507f1f77bcf86cd799439088');
    const assignmentResponse = await request(app).get('/teacher/live-games/507f1f77bcf86cd799439099/assignments/507f1f77bcf86cd799439077');

    expect(dashboardResponse.status).toBe(302);
    expect(dashboardResponse.headers.location).toBe('/login?returnTo=%2Fteacher%2Flive-games');

    expect(builderResponse.status).toBe(302);
    expect(builderResponse.headers.location).toBe('/login?returnTo=%2Fteacher%2Flive-games%2Fnew');

    expect(hostResponse.status).toBe(302);
    expect(hostResponse.headers.location).toBe('/login?returnTo=%2Fteacher%2Flive-games%2F507f1f77bcf86cd799439099%2Fhost');

    expect(reportResponse.status).toBe(302);
    expect(reportResponse.headers.location).toBe('/login?returnTo=%2Fteacher%2Flive-games%2F507f1f77bcf86cd799439099%2Freports%2F507f1f77bcf86cd799439088');

    expect(assignmentResponse.status).toBe(302);
    expect(assignmentResponse.headers.location).toBe('/login?returnTo=%2Fteacher%2Flive-games%2F507f1f77bcf86cd799439099%2Fassignments%2F507f1f77bcf86cd799439077');
  });
});
