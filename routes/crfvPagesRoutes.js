const express = require('express');
const ejs = require('ejs');
const path = require('path');

const CRFV_SHARED_STYLESHEET = '/crfv/css/dialog.css';
const CRFV_SHARED_SCRIPT = '/crfv/js/dialog.js';
const CRFV_APP_SHELL_STYLESHEET = '/crfv/css/app-shell.css';
const CRFV_APP_SHELL_SCRIPT = '/crfv/js/app-shell.js';
const REPORT_CLUSTER_TABS = Object.freeze([
  { id: 'reports', label: 'Reports', href: '/crfv/reports' },
  { id: 'audittrail', label: 'Audit Trail', href: '/crfv/audittrail' },
  { id: 'payment-reports', label: 'Payment Reports', href: '/crfv/payment-reports' },
  { id: 'payment-audits', label: 'Payment Audits', href: '/crfv/payment-audits' }
]);

function addUniqueItem(items, item, position = 'end') {
  const list = Array.isArray(items) ? [...items] : [];
  if (list.includes(item)) {
    return list;
  }
  if (position === 'start') {
    list.unshift(item);
  } else {
    list.push(item);
  }
  return list;
}

function renderCrfvLayout(res, bodyTemplatePath, pageLocals) {
  const usesAppShell = Boolean(pageLocals.appShellNav);
  const shellStylesheets = usesAppShell
    ? addUniqueItem(pageLocals.stylesheets, CRFV_APP_SHELL_STYLESHEET)
    : pageLocals.stylesheets;
  const shellDeferScripts = usesAppShell
    ? addUniqueItem(pageLocals.deferScriptUrls, CRFV_APP_SHELL_SCRIPT)
    : pageLocals.deferScriptUrls;
  const localsWithSharedAssets = {
    ...pageLocals,
    stylesheets: addUniqueItem(shellStylesheets, CRFV_SHARED_STYLESHEET),
    scriptUrls: addUniqueItem(pageLocals.scriptUrls, CRFV_SHARED_SCRIPT, 'start'),
    deferScriptUrls: shellDeferScripts
  };

  return ejs.renderFile(bodyTemplatePath, localsWithSharedAssets, (err, bodyHtml) => {
    if (err) {
      console.error('Error rendering CRFV body template:', err);
      return res.status(500).render('pages/errors/500');
    }
    return res.render('layouts/crfv', {
      ...localsWithSharedAssets,
      body: bodyHtml
    });
  });
}

function withCrfvAppShell(pageLocals, navConfig = {}) {
  return {
    ...pageLocals,
    pageClass: navConfig.pageClass || '',
    appShellNav: {
      title: navConfig.title || '',
      subtitle: navConfig.subtitle || '',
      showHomeLink: navConfig.showHomeLink !== false,
      showClock: navConfig.showClock !== false,
      showLogout: navConfig.showLogout !== false,
      showAccountLink: navConfig.showAccountLink !== false,
      accountLinkActive: Boolean(navConfig.accountLinkActive),
      tabs: Array.isArray(navConfig.tabs) ? navConfig.tabs : [],
      activeTab: navConfig.activeTab || ''
    }
  };
}

function createCrfvPagesRoutes({
  projectRoot,
  isAuthenticated = (_req, _res, next) => next(),
  isAdminOrManager = (_req, _res, next) => next()
}) {
  const router = express.Router();

  router.get(['/crfv', '/crfv/', '/crfv/index'], (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'index.ejs');
    const pageLocals = {
      title: 'CRFV Event Management System | Main Menu',
      description: 'Welcome to the CRFV Event System main menu. Access attendance, registration, event creation, and reports.',
      canonicalUrl: 'https://hellouniversity.online/crfv/index',
      stylesheets: [
        '/dist/output.css',
        '/crfv/css/index.css'
      ],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta property="og:title" content="CRFV Event System Main Menu">
      <meta property="og:description" content="Access all CRFV event management tools: attendance, registration, event creation, and reports.">
      <meta property="og:image" content="https://hellouniversity.online/images/hellouniversity-blog-banner.jpg">
      <meta property="og:url" content="https://hellouniversity.online/crfv/index">
      <meta property="og:type" content="website">
      <meta property="og:site_name" content="CRFV Event System">
    `,
      deferScriptUrls: ['/crfv/js/index.js']
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-index',
      title: 'Main Menu',
      showHomeLink: false,
      showAccountLink: false
    }));
  });

  router.get('/crfv/attendance', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'attendance.ejs');
    const pageLocals = {
      title: 'RFID Attendance | CRFV Event System',
      description: 'RFID attendance monitoring for CRFV events. Secure, mobile-friendly, and easy to use.',
      canonicalUrl: 'https://hellouniversity.online/crfv/attendance',
      stylesheets: ['/crfv/css/attendance.css'],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="robots" content="noindex, nofollow">
    `,
      scriptUrls: [
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        '/crfv/js/attendance.js'
      ]
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-attendance',
      title: 'Attendance',
      subtitle: 'Scan attendees and manage live event attendance.'
    }));
  });

  router.get('/crfv/event-create', isAdminOrManager, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'event-create.ejs');
    const pageLocals = {
      title: 'Create Event | CRFV Event Management System',
      description: 'Create new events in the CRFV Event System. Organize seminars, conferences, and more with ease.',
      canonicalUrl: 'https://hellouniversity.online/crfv/event-create',
      stylesheets: [
        '/crfv/css/index.css',
        '/dist/output.css',
        '/crfv/css/event-create.css'
      ],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="keywords" content="CRFV, create event, event management, seminar, conference, event system">
      <meta property="og:title" content="Create Event - CRFV Event System">
      <meta property="og:description" content="Easily create and manage events, seminars, and conferences with the CRFV Event System.">
      <meta property="og:image" content="https://hellouniversity.online/images/hellograde-blog-banner.jpg">
      <meta property="og:url" content="https://hellouniversity.online/crfv/event-create">
      <meta property="og:type" content="website">
      <meta property="og:site_name" content="CRFV Event System">
    `,
      scriptUrls: [
        'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js',
        '/crfv/js/attendance-schedule-ui.js',
        '/crfv/js/event-create.js'
      ]
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-event-create',
      title: 'Create Event',
      subtitle: 'Create, update, and manage CRFV event schedules.'
    }));
  });

  router.get('/crfv/admin-register', isAdminOrManager, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'admin-register.ejs');
    const pageLocals = {
      title: 'Register | CRFV Event Management System',
      description: 'Register for CRFV events with secure attendee registration and bulk upload support.',
      canonicalUrl: 'https://hellouniversity.online/crfv/admin-register',
      stylesheets: ['/crfv/css/admin-register.css'],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="keywords" content="CRFV, event registration, attendee, seminar, conference, organization, register, event system">
      <meta property="og:title" content="Register for CRFV Events">
      <meta property="og:description" content="Secure and easy registration for CRFV events, seminars, and conferences.">
      <meta property="og:image" content="https://hellouniversity.online/images/hellograde-blog-banner.jpg">
      <meta property="og:url" content="https://hellouniversity.online/crfv/admin-register">
      <meta property="og:type" content="website">
      <meta property="og:site_name" content="CRFV Event System">
    `,
      scriptUrls: [
        'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js',
        '/crfv/js/admin-register.js'
      ]
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-admin-register',
      title: 'Registration',
      subtitle: 'Register attendees and process bulk uploads.'
    }));
  });

  router.get('/crfv/reports', isAdminOrManager, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'reports.ejs');
    const pageLocals = {
      title: 'CRFV Event Management System | Reports',
      description: 'View, export, and analyze attendance, accommodation, events, and audit logs for CRFV events.',
      canonicalUrl: 'https://hellouniversity.online/crfv/reports',
      stylesheets: [
        '/crfv/css/index.css',
        '/crfv/css/reports.css',
        '/crfv/css/intro.css'
      ],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="keywords" content="CRFV, event reports, event management, attendance, accommodation, audit logs, organization events, export XLSX, seminars, conferences">
      <meta property="og:title" content="CRFV Event Management System Reports">
      <meta property="og:description" content="View and export detailed reports for CRFV events, attendance, accommodation, and logs.">
      <meta property="og:image" content="https://hellouniversity.online/images/hellograde-blog-banner.jpg">
      <meta property="og:url" content="https://hellouniversity.online/crfv/reports">
      <meta property="og:type" content="website">
      <meta property="og:site_name" content="CRFV Event System">
    `,
      scriptUrls: [
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js',
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        '/crfv/js/reports.js',
        '/crfv/js/reportscounter.js',
        '/crfv/mini/modallogout.js'
      ]
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-reports',
      title: 'Reports',
      subtitle: 'Review attendee, accommodation, and attendance reports.',
      tabs: REPORT_CLUSTER_TABS,
      activeTab: 'reports'
    }));
  });

  router.get('/crfv/user-register', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'user-register.ejs');
    const pageLocals = {
      title: 'CRFV Event Management System Registration',
      description: 'Register for CRFV events. Sign up for conferences, seminars, and organizational events.',
      canonicalUrl: 'https://hellouniversity.online/crfv/user-register',
      stylesheets: ['/crfv/css/user-register.css'],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="keywords" content="CRFV, event registration, sign up, conferences, seminars">
    `,
      scriptUrls: ['/crfv/js/user-register.js']
    };

    return renderCrfvLayout(res, bodyPath, pageLocals);
  });

  router.get('/crfv/attendanceSummary', isAdminOrManager, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'attendanceSummary.ejs');
    const pageLocals = {
      title: 'Attendance Summary | CRFV Event System',
      description: 'View and export event attendance summary with AM/PM session counters and attendee records.',
      canonicalUrl: 'https://hellouniversity.online/crfv/attendanceSummary',
      stylesheets: ['/crfv/css/attendanceSummary.css'],
      extraHead: `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    `,
      scriptUrls: [
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js',
        '/crfv/js/attendanceSummary.js'
      ]
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-attendance-summary',
      title: 'Attendance Summary',
      subtitle: 'Review attendance and punctuality by event and date.'
    }));
  });

  router.get('/crfv/audittrail', isAdminOrManager, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'audittrail.ejs');
    const pageLocals = {
      title: 'CRFV Event Management System | Audit Logs',
      description: 'View and search CRFV audit logs to track user actions, system changes, and security events.',
      canonicalUrl: 'https://hellouniversity.online/crfv/audittrail',
      stylesheets: [
        '/crfv/css/index.css',
        '/crfv/css/audittrail.css',
        '/crfv/css/intro.css'
      ],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="keywords" content="CRFV, audit trail, logs, event management, system logs, security, user actions, reports">
      <meta property="og:title" content="CRFV Event Management System Audit Logs">
      <meta property="og:description" content="Track and review all system actions and changes in the CRFV Event Management System audit logs.">
      <meta property="og:image" content="https://hellouniversity.online/images/hellograde-blog-banner.jpg">
      <meta property="og:url" content="https://hellouniversity.online/crfv/audittrail">
      <meta property="og:type" content="website">
      <meta property="og:site_name" content="CRFV Event System">
    `,
      scriptUrls: [
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js',
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        '/crfv/js/audittrail.js'
      ]
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-audittrail',
      title: 'Audit Trail',
      subtitle: 'Track user activity and exported audit logs.',
      tabs: REPORT_CLUSTER_TABS,
      activeTab: 'audittrail'
    }));
  });

  router.get('/crfv/payment-reports', isAdminOrManager, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'payment-reports.ejs');
    const pageLocals = {
      title: 'Payment Reports | CRFV Event System',
      description: 'View, filter, and export CRFV payment reports by event, status, and custom columns.',
      canonicalUrl: 'https://hellouniversity.online/crfv/payment-reports',
      stylesheets: [
        '/crfv/css/reports.css',
        '/crfv/css/payment-reports.css'
      ],
      extraHead: `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    `,
      scriptUrls: [
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
        '/crfv/js/payment-reports.js'
      ]
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-payment-reports',
      title: 'Payment Reports',
      subtitle: 'Edit and export payment records by event.',
      tabs: REPORT_CLUSTER_TABS,
      activeTab: 'payment-reports'
    }));
  });

  router.get('/crfv/payment-audits', isAdminOrManager, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'payment-audits.ejs');
    const pageLocals = {
      title: 'Payment Audits | CRFV Event System',
      description: 'Review read-only CRFV payment totals and detailed payment rows across events in one report page.',
      canonicalUrl: 'https://hellouniversity.online/crfv/payment-audits',
      stylesheets: [
        '/crfv/css/reports.css',
        '/crfv/css/payment-audits.css'
      ],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="robots" content="noindex, nofollow">
    `,
      scriptUrls: [
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
        '/crfv/js/payment-audits.js'
      ]
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-payment-audits',
      title: 'Payment Audits',
      subtitle: 'Review read-only payment rows across CRFV events.',
      tabs: REPORT_CLUSTER_TABS,
      activeTab: 'payment-audits'
    }));
  });

  router.get('/crfv/system-settings', isAdminOrManager, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'system-settings.ejs');
    const pageLocals = {
      title: 'System Settings | CRFV Event System',
      description: 'Manage shared CRFV system defaults, including the default attendance schedule for future events.',
      canonicalUrl: 'https://hellouniversity.online/crfv/system-settings',
      stylesheets: ['/crfv/css/system-settings.css'],
      extraHead: `
      <meta name="robots" content="noindex, nofollow">
    `,
      scriptUrls: [
        '/crfv/js/attendance-schedule-ui.js',
        '/crfv/js/system-settings.js'
      ]
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-system-settings',
      title: 'System Settings',
      subtitle: 'Manage shared CRFV defaults for future events and system behavior.'
    }));
  });

  router.get('/crfv/account-settings', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'account-settings.ejs');
    const pageLocals = {
      title: 'User Profile Settings | CRFV Event System',
      description: 'Manage your CRFV user profile, credentials, and session settings.',
      canonicalUrl: 'https://hellouniversity.online/crfv/account-settings',
      stylesheets: ['/crfv/css/account-settings.css'],
      deferScriptUrls: ['/crfv/js/account-settings.js'],
      extraHead: `
      <meta name="robots" content="noindex, nofollow">
    `
    };

    return renderCrfvLayout(res, bodyPath, withCrfvAppShell(pageLocals, {
      pageClass: 'crfv-page-account-settings',
      title: 'User Profile Settings',
      subtitle: 'Manage your profile, credentials, and active session.',
      accountLinkActive: true
    }));
  });

  router.get('/crfv/about', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'about.ejs');
    const pageLocals = {
      title: 'About CRFV | HelloUniversity',
      description: 'Learn about CRFV Event Management System features and usage guide.',
      canonicalUrl: 'https://hellouniversity.online/crfv/about',
      stylesheets: ['/dist/output.css', '/crfv/css/index.css', '/crfv/css/about.css'],
      extraHead: `
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    `,
      scriptUrls: ['/crfv/js/about.js']
    };

    return renderCrfvLayout(res, bodyPath, pageLocals);
  });

  router.get('/crfv/roles', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'roles.ejs');
    const pageLocals = {
      title: 'CRFV Roles and Permissions | HelloUniversity',
      description: 'Review CRFV role definitions and permission matrix.',
      canonicalUrl: 'https://hellouniversity.online/crfv/roles',
      stylesheets: ['/dist/output.css', '/crfv/css/index.css', '/crfv/css/roles.css'],
      extraHead: `
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    `,
      scriptUrls: ['/crfv/js/roles.js']
    };

    return renderCrfvLayout(res, bodyPath, pageLocals);
  });

  router.get('/crfv/privacy-policy', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'privacy-policy.ejs');
    const pageLocals = {
      title: 'CRFV Privacy Policy | HelloUniversity',
      description: 'Read the CRFV privacy policy and data handling practices.',
      canonicalUrl: 'https://hellouniversity.online/crfv/privacy-policy',
      stylesheets: ['/dist/output.css', '/crfv/css/privacy-policy.css'],
      extraHead: `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4537208011192461" crossorigin="anonymous"></script>
    `,
      scriptUrls: ['https://unpkg.com/scrollreveal', '/crfv/js/privacy-policy.js']
    };

    return renderCrfvLayout(res, bodyPath, pageLocals);
  });

  router.get('/crfv/event-agreement', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'crfv', 'event-agreement.ejs');
    const pageLocals = {
      title: 'CRFV Event Agreement | HelloUniversity',
      description: 'Review CRFV event participation terms and conditions.',
      canonicalUrl: 'https://hellouniversity.online/crfv/event-agreement',
      stylesheets: ['/dist/output.css', '/crfv/css/event-agreement.css'],
      extraHead: `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    `,
      scriptUrls: ['/crfv/js/event-agreement.js']
    };

    return renderCrfvLayout(res, bodyPath, pageLocals);
  });

  return router;
}

module.exports = createCrfvPagesRoutes;
