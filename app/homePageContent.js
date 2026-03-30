const { getLessonsCatalogPageData } = require('./lessonsCatalog');
const { getEventsPageData } = require('./eventsCatalog');
const { homeFaqItems } = require('./faqContent');

function getPrimaryWorkspace(currentRole, isAuthenticated) {
  if (currentRole === 'teacher') {
    return {
      href: '/teacher/dashboard',
      label: 'Open Teacher Workspace',
      icon: 'co_present'
    };
  }

  if (currentRole === 'teacher_pending') {
    return {
      href: '/approval-pending',
      label: 'View Account Status',
      icon: 'hourglass_top'
    };
  }

  if (currentRole === 'admin') {
    return {
      href: '/admin_dashboard',
      label: 'Open Admin Workspace',
      icon: 'admin_panel_settings'
    };
  }

  if (currentRole === 'manager') {
    return {
      href: '/crfv',
      label: 'Open Operations Workspace',
      icon: 'volunteer_activism'
    };
  }

  if (isAuthenticated) {
    return {
      href: '/dashboard',
      label: 'Open Student Workspace',
      icon: 'dashboard'
    };
  }

  return {
    href: '/login',
    label: 'Sign In to Continue',
    icon: 'login'
  };
}

function getRolePathAction(roleKey, currentRole, isAuthenticated) {
  if (roleKey === 'student') {
    if (isAuthenticated && !['teacher', 'teacher_pending', 'admin', 'manager'].includes(currentRole)) {
      return { href: '/dashboard', label: 'Open Student Workspace' };
    }

    return { href: '/login', label: 'Sign In for Student Access' };
  }

  if (roleKey === 'teacher') {
    if (currentRole === 'teacher' || currentRole === 'admin') {
      return { href: '/teacher/dashboard', label: 'Open Teacher Workspace' };
    }

    return { href: '/login', label: 'Sign In for Teacher Access' };
  }

  if (currentRole === 'admin') {
    return { href: '/admin_dashboard', label: 'Open Admin Workspace' };
  }

  if (currentRole === 'manager') {
    return { href: '/crfv', label: 'Open Operations Workspace' };
  }

  return { href: '/login', label: 'Sign In for Admin Access' };
}

function getHomePageContent({ role, isAuthenticated, brandName, recentBlogsOverride = null }) {
  const currentRole = role || null;
  const primaryWorkspace = getPrimaryWorkspace(currentRole, isAuthenticated);
  const heroPrimaryAction = isAuthenticated
    ? primaryWorkspace
    : { href: '/features', label: 'Explore Platform Features', icon: 'rocket_launch' };
  const finalCtaAction = isAuthenticated
    ? primaryWorkspace
    : { href: '/how-it-works', label: 'See How It Works', icon: 'rocket_launch' };
  const lessonsPageData = getLessonsCatalogPageData();
  const eventsPageData = getEventsPageData();

  const featuredLessons = Array.isArray(lessonsPageData.featuredLessons)
    ? lessonsPageData.featuredLessons.slice(0, 3)
    : [];
  const latestBlogEntries = Array.isArray(recentBlogsOverride)
    ? recentBlogsOverride.slice(0, 3)
    : [];
  const eventEntries = Array.isArray(eventsPageData.eventEntries)
    ? eventsPageData.eventEntries.filter((entry) => entry.indexable).slice(0, 2)
    : [];

  const latestUpdate = latestBlogEntries[0] || eventEntries[0] || null;
  const relatedUpdates = [
    ...latestBlogEntries.slice(1).map((entry) => ({
      eyebrow: entry.categoryLabel,
      title: entry.title,
      description: entry.description,
      href: entry.href,
      ctaLabel: 'Read article',
      icon: entry.categoryIcon || 'article'
    })),
    ...eventEntries.slice(0, 1).map((entry) => ({
      eyebrow: 'Events',
      title: entry.title,
      description: entry.summary,
      href: entry.href,
      ctaLabel: entry.ctaLabel || 'Open archive page',
      icon: 'event'
    })),
    ...featuredLessons.slice(0, 1).map((entry) => ({
      eyebrow: entry.track,
      title: entry.title,
      description: entry.description,
      href: entry.href,
      ctaLabel: 'Open lesson',
      icon: entry.icon || 'menu_book'
    }))
  ].slice(0, 3);

  const heroMetrics = [
    {
      label: 'Role paths',
      value: '3',
      description: 'Students, teachers, and academic teams.'
    },
    {
      label: 'Lesson tracks',
      value: String(lessonsPageData.lessonStats?.trackCount || 0),
      description: 'Structured learning paths across technical and growth topics.'
    },
    {
      label: 'Featured reads',
      value: String(latestBlogEntries.length),
      description: 'Published education-focused articles highlighted from the latest HelloUniversity resources.'
    },
    {
      label: 'Event pages',
      value: String(eventEntries.length),
      description: 'Selected event coverage and public academic activity records.'
    }
  ];

  const rolePaths = [
    {
      id: 'homeRoleStudents',
      icon: 'school',
      title: 'Students',
      description: 'Keep lessons, attendance, activities, and day-to-day academic work in one student-facing flow.',
      bullets: [
        'Track attendance and assigned activities',
        'Move from lessons into practical study work',
        'Use one workspace instead of scattered pages'
      ],
      action: getRolePathAction('student', currentRole, isAuthenticated),
      isCurrent: isAuthenticated && !['teacher', 'teacher_pending', 'admin', 'manager'].includes(currentRole)
    },
    {
      id: 'homeRoleTeachers',
      icon: 'co_present',
      title: 'Teachers',
      description: 'Organize classes, manage communication, build quizzes, launch ClassRush live games, and stay inside a task-oriented teaching workspace.',
      bullets: [
        'Manage classes, materials, and teams',
        'Create quizzes and review analytics',
        'Host ClassRush - real-time live quiz sessions',
        'Keep teaching workflows in one shell'
      ],
      action: getRolePathAction('teacher', currentRole, isAuthenticated),
      isCurrent: currentRole === 'teacher'
    },
    {
      id: 'homeRoleOperations',
      icon: 'admin_panel_settings',
      title: 'Admin and Operations',
      description: 'Support oversight, records, imports, and operational flows without forcing users through the student path.',
      bullets: [
        'Review records and admin workflows',
        'Access operations tools and archive pages',
        'Use role-aware entry points for sensitive tasks'
      ],
      action: getRolePathAction('operations', currentRole, isAuthenticated),
      isCurrent: currentRole === 'admin' || currentRole === 'manager'
    }
  ];

  const capabilityCards = [
    {
      icon: 'menu_book',
      title: 'Lessons and Reading Paths',
      description: 'Structured lesson tracks, companion reading, and guided content stay accessible from one public entry point.',
      href: '/lessons',
      ctaLabel: 'Browse lessons'
    },
    {
      icon: 'dashboard_customize',
      title: 'Platform Features',
      description: 'See the public-facing overview of classes, assessments, communication, and learning support before signing in.',
      href: '/features',
      ctaLabel: 'View features'
    },
    {
      icon: 'co_present',
      title: 'Teacher Workflow Guide',
      description: 'Review how teachers use classes, materials, quizzes, announcements, and student monitoring inside HelloUniversity.',
      href: '/teacher-guide',
      ctaLabel: 'Read teacher guide'
    },
    {
      icon: 'school',
      title: 'Student Workflow Guide',
      description: 'Follow the student path from lesson discovery to classes, activities, attendance, and academic updates.',
      href: '/student-guide',
      ctaLabel: 'Read student guide'
    },
    {
      icon: 'quiz',
      title: 'Classes, Assessments, and Communication',
      description: 'Class management, quizzes, announcements, and response workflows live behind role-aware workspaces instead of scattered tools.',
      href: primaryWorkspace.href,
      ctaLabel: primaryWorkspace.label
    },
    {
      icon: 'sports_esports',
      title: 'ClassRush - Live Quiz Games',
      description: 'Where knowledge meets competition. Teachers host real-time quiz games; students join instantly with a PIN from any device.',
      href: '/play',
      ctaLabel: 'Play now'
    },
    {
      icon: 'fact_check',
      title: 'Attendance and Records',
      description: 'Attendance, student records, and reporting workflows are grouped into clearer day-to-day paths.',
      href: isAuthenticated && !['teacher', 'teacher_pending', 'admin', 'manager'].includes(currentRole) ? '/attendance' : '/login',
      ctaLabel: isAuthenticated && !['teacher', 'teacher_pending', 'admin', 'manager'].includes(currentRole)
        ? 'Open attendance'
        : 'Sign in for student tools'
    },
    {
      icon: 'search',
      title: 'Search and Discovery',
      description: 'Public search, catalogs, and support pages make it easier to find the right content before signing in.',
      href: '/search',
      ctaLabel: 'Search the site'
    },
    {
      icon: 'event',
      title: 'Events and Archives',
      description: 'Published event details, archived registration pages, and results stay available through a dedicated events section.',
      href: '/events',
      ctaLabel: 'Open archive'
    },
    {
      icon: 'help_outline',
      title: 'Help and Support',
      description: 'Support, help, policies, and contact routes stay visible from the public side of the platform.',
      href: '/help',
      ctaLabel: 'Get support'
    }
  ];

  const learningHighlights = featuredLessons.map((entry) => ({
    ...entry,
    ctaLabel: 'Open lesson'
  }));

  const publicGuides = [
    {
      href: '/features',
      icon: 'dashboard_customize',
      title: 'Platform Features',
      meta: 'Public overview of the core product areas',
      ctaLabel: 'View features'
    },
    {
      href: '/teacher-guide',
      icon: 'co_present',
      title: 'Teacher Workflow Guide',
      meta: 'How classes, quizzes, materials, and communication fit together',
      ctaLabel: 'Read teacher guide'
    },
    {
      href: '/student-guide',
      icon: 'school',
      title: 'Student Workflow Guide',
      meta: 'How students move from lessons into class activity and updates',
      ctaLabel: 'Read student guide'
    },
    {
      href: '/how-it-works',
      icon: 'route',
      title: 'How HelloUniversity Works',
      meta: 'A simple explanation of the public site, accounts, and role-aware workspaces',
      ctaLabel: 'Open walkthrough'
    },
    {
      href: '/classrush-guide',
      icon: 'sports_esports',
      title: 'ClassRush Guide',
      meta: 'How live quiz games work for teachers and students',
      ctaLabel: 'Open ClassRush guide'
    }
  ];

  const heroVisualItems = [
    { icon: 'dashboard_customize', label: 'Features', tag: 'See the public product overview', href: '/features' },
    { icon: 'co_present', label: 'Teacher Guide', tag: 'Understand the teaching workflow', href: '/teacher-guide' },
    { icon: 'school', label: 'Student Guide', tag: 'Follow the student experience', href: '/student-guide' },
    { icon: 'route', label: 'How It Works', tag: 'Public pages and role-aware workspaces', href: '/how-it-works' },
    { icon: 'menu_book', label: 'Lessons', tag: 'Curated learning tracks', href: '/lessons' },
    { icon: 'sports_esports', label: 'ClassRush', tag: 'See the live quiz game flow', href: '/classrush-guide' }
  ];

  const recentLessons = featuredLessons.map((entry) => ({
    href: entry.href,
    icon: entry.icon || 'menu_book',
    title: entry.title,
    meta: `${entry.track} - Guided lesson`,
    ctaLabel: 'Read lesson'
  }));

  const recentBlogs = latestBlogEntries.map((entry) => ({
    href: entry.href,
    icon: entry.categoryIcon || 'article',
    title: entry.title,
    meta: `${entry.categoryLabel} - ${entry.publishedOn || 'Recent post'}`,
    ctaLabel: 'Read article'
  }));

  const recentEvents = eventEntries.map((entry) => ({
    href: entry.href,
    icon: 'event',
    title: entry.title,
    meta: `${entry.dateLabel || 'Archive page'} - ${entry.venue || 'HelloUniversity'}`,
    ctaLabel: 'View event'
  }));

  const learningSnapshot = [
    {
      label: 'Tracks',
      value: String(lessonsPageData.lessonStats?.trackCount || 0)
    },
    {
      label: 'Lessons',
      value: String(lessonsPageData.lessonStats?.lessonCount || 0)
    },
    {
      label: 'Growth tracks',
      value: String(lessonsPageData.lessonStats?.professionalTrackCount || 0)
    }
  ];

  return {
    brandName,
    primaryWorkspace,
    heroPrimaryAction,
    finalCtaAction,
    heroMetrics,
    heroVisualItems,
    rolePaths,
    capabilityCards,
    learningHighlights,
    publicGuides,
    recentLessons,
    recentBlogs,
    recentEvents,
    learningSnapshot,
    latestUpdate,
    relatedUpdates,
    faqItems: homeFaqItems
  };
}

module.exports = {
  getHomePageContent
};
