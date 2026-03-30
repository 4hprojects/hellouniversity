const path = require('path');
const express = require('express');
const request = require('supertest');

const createAdminPagesRoutes = require('../../routes/adminPagesRoutes');
const { isAuthenticated, isAdmin } = require('../../middleware/routeAuthGuards');

function buildAdminPagesApp(sessionData = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use(createAdminPagesRoutes({
    projectRoot: process.cwd(),
    isAuthenticated,
    isAdmin
  }));
  return app;
}

describe('admin pages smoke', () => {
  const adminSession = {
    userId: 'A-1001',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User'
  };

  test('admin dashboard renders supported operations only', async () => {
    const app = buildAdminPagesApp(adminSession);

    const response = await request(app).get('/admin_dashboard');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Admin Dashboard | HelloUniversity');
    expect(response.text).toContain('Grade Search');
    expect(response.text).toContain('Attendance');
    expect(response.text).toContain('Grade CSV Import');
    expect(response.text).not.toContain('Reports are shortcuts, not generated exports.');
    expect(response.text).not.toContain('Attendance import route is not mounted.');
  });

  test('admin users page renders for an authenticated admin', async () => {
    const app = buildAdminPagesApp(adminSession);

    const response = await request(app).get('/admin/users');

    expect(response.status).toBe(200);
    expect(response.text).toContain('User Management | Admin | HelloUniversity');
    expect(response.text).toContain('Search, sort, export, and manage user accounts.');
    expect(response.text).toContain('exportUsersBtn');
    expect(response.text).toContain('resetSelectedUsersBtn');
  });
});
