const path = require('path');
const express = require('express');
const request = require('supertest');

const createWebPagesRoutes = require('../../routes/webPagesRoutes');
const createPublicInfoPagesRoutes = require('../../routes/publicInfoPagesRoutes');
const createAuthWebRoutes = require('../../routes/authWebRoutes');
const { createCollection } = require('../helpers/inMemoryMongo');

function buildApp(sessionData = {}) {
  const app = express();
  app.locals.projectRoot = process.cwd();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });

  const blogCollection = createCollection([]);
  app.use(createPublicInfoPagesRoutes({
    projectRoot: process.cwd()
  }));
  app.use(createWebPagesRoutes({
    projectRoot: process.cwd(),
    getBlogCollection: () => blogCollection
  }));
  app.use(createAuthWebRoutes({
    getUsersCollection: () => null,
    getLogsCollection: () => null,
    sendEmail: async () => ({ success: true }),
    bcrypt: { compare: async () => false },
    validator: {
      trim(value) {
        return String(value || '').trim();
      },
      isEmail() {
        return false;
      },
      normalizeEmail(value) {
        return String(value || '').trim().toLowerCase();
      }
    },
    isAuthenticated(req, res, next) {
      if (req.session?.userId) {
        return next();
      }
      return res.redirect('/login');
    }
  }));

  return app;
}

describe('public branding pages smoke', () => {
  test('about page presents HelloUniversity as a digital academic platform', async () => {
    const app = buildApp();
    const response = await request(app).get('/about');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<title>About HelloUniversity</title>');
    expect(response.text).toContain('Digital academic platform for school and higher education workflows.');
    expect(response.text).toContain('HelloUniversity is not a university itself.');
    expect(response.text).toContain('The current product direction centers on five connected pillars.');
    expect(response.text).toContain('Academic Management');
    expect(response.text).toContain('Monitoring and Intelligent Support');
    expect(response.text).toContain('Academic Teams');
    expect(response.text).toContain('Support school and higher education operations');
  });

  test('login and signup pages frame HelloUniversity as a platform workspace', async () => {
    const app = buildApp();

    const loginResponse = await request(app).get('/login');
    const signupResponse = await request(app).get('/signup');

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.text).toContain('Access the HelloUniversity platform with your email.');
    expect(loginResponse.text).toContain('digital academic platform designed to support school and higher education workflows');
    expect(signupResponse.status).toBe(200);
    expect(signupResponse.text).toContain('Set up your HelloUniversity platform account in one pass.');
    expect(signupResponse.text).toContain('Account type');
    expect(signupResponse.text).toContain('Your details');
    expect(signupResponse.text).toContain('Your school');
    expect(signupResponse.text).toContain('Set a password');
    expect(signupResponse.text).toContain('digital academic platform designed to support school and higher education workflows');
  });

  test('signup page uses recaptcha v3 script when captcha is configured', async () => {
    const originalCaptchaEnv = {
      DISABLE_CAPTCHA: process.env.DISABLE_CAPTCHA,
      RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY
    };
    process.env.DISABLE_CAPTCHA = 'false';
    process.env.RECAPTCHA_SITE_KEY = 'site-key';

    try {
      const app = buildApp();
      const response = await request(app).get('/signup');

      expect(response.status).toBe(200);
      expect(response.text).toContain('https://www.google.com/recaptcha/api.js?render=site-key');
      expect(response.text).toContain('data-recaptcha-action="signup"');
      expect(response.text).not.toContain('class="g-recaptcha"');
    } finally {
      if (typeof originalCaptchaEnv.DISABLE_CAPTCHA === 'undefined') {
        delete process.env.DISABLE_CAPTCHA;
      } else {
        process.env.DISABLE_CAPTCHA = originalCaptchaEnv.DISABLE_CAPTCHA;
      }

      if (typeof originalCaptchaEnv.RECAPTCHA_SITE_KEY === 'undefined') {
        delete process.env.RECAPTCHA_SITE_KEY;
      } else {
        process.env.RECAPTCHA_SITE_KEY = originalCaptchaEnv.RECAPTCHA_SITE_KEY;
      }
    }
  });

  test('help page publishes HelloUniversity-specific FAQ content and schema', async () => {
    const app = buildApp();
    const response = await request(app).get('/help');

    expect(response.status).toBe(200);
    expect(response.text).toContain('HelloUniversity FAQ');
    expect(response.text).toContain('What is HelloUniversity used for?');
    expect(response.text).toContain('Does HelloUniversity support senior high school, college, and university workflows?');
    expect(response.text).toContain('"@type":"FAQPage"');
  });

  test('platform guide pages render the current public workflow content', async () => {
    const app = buildApp();

    const featuresResponse = await request(app).get('/features');
    const teacherGuideResponse = await request(app).get('/teacher-guide');
    const studentGuideResponse = await request(app).get('/student-guide');
    const howItWorksResponse = await request(app).get('/how-it-works');
    const classrushGuideResponse = await request(app).get('/classrush-guide');

    expect(featuresResponse.status).toBe(200);
    expect(featuresResponse.text).toContain('Platform Features');
    expect(featuresResponse.text).toContain('Check attendance, progress, and grades');

    expect(teacherGuideResponse.status).toBe(200);
    expect(teacherGuideResponse.text).toContain('Teacher Guide | HelloUniversity');
    expect(teacherGuideResponse.text).toContain('Plan class work, post updates, run quizzes, and review what your students finished.');
    expect(teacherGuideResponse.text).toContain('View Platform Features');
    expect(teacherGuideResponse.text).toContain('Live ClassRush games');

    expect(studentGuideResponse.status).toBe(200);
    expect(studentGuideResponse.text).toContain('Student Workflow Guide');
    expect(studentGuideResponse.text).toContain('Track updates, attendance, and academic records');

    expect(howItWorksResponse.status).toBe(200);
    expect(howItWorksResponse.text).toContain('How HelloUniversity Works');
    expect(howItWorksResponse.text).toContain('Content and workflow layer');

    expect(classrushGuideResponse.status).toBe(200);
    expect(classrushGuideResponse.text).toContain('ClassRush Guide');
    expect(classrushGuideResponse.text).toContain('Create a ClassRush Game');
    expect(classrushGuideResponse.text).toContain('share the game PIN or QR code');
  });
});
