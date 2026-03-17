const { getBlogsPageData } = require('./blogCatalog');
const { getLessonsCatalogPageData } = require('./lessonsCatalog');
const { getEventsPageData } = require('./eventsCatalog');

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

function getHomePageContent({ role, isAuthenticated, brandName }) {
  const currentRole = role || null;
  const primaryWorkspace = getPrimaryWorkspace(currentRole, isAuthenticated);
  const heroPrimaryAction = isAuthenticated
    ? primaryWorkspace
    : { href: '/signup', label: 'Get Started', icon: 'rocket_launch' };
  const finalCtaAction = isAuthenticated
    ? primaryWorkspace
    : { href: '/signup', label: 'Get Started Today', icon: 'rocket_launch' };
  const blogsPageData = getBlogsPageData();
  const lessonsPageData = getLessonsCatalogPageData();
  const eventsPageData = getEventsPageData();

  const featuredLessons = Array.isArray(lessonsPageData.featuredLessons)
    ? lessonsPageData.featuredLessons.slice(0, 3)
    : [];
  const latestBlogEntries = Array.isArray(blogsPageData.featuredBlogEntries)
    ? blogsPageData.featuredBlogEntries.slice(0, 3)
    : [];
  const eventEntries = Array.isArray(eventsPageData.eventEntries)
    ? eventsPageData.eventEntries.slice(0, 2)
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
      description: 'Students, teachers, and admin or operations teams.'
    },
    {
      label: 'Lesson tracks',
      value: String(lessonsPageData.lessonStats?.trackCount || 0),
      description: 'Structured learning paths across technical and growth topics.'
    },
    {
      label: 'Published articles',
      value: String(blogsPageData.blogStats?.entryCount || 0),
      description: 'Public reads that support study, technology, and growth.'
    },
    {
      label: 'Event pages',
      value: String(eventsPageData.eventStats?.pageCount || 0),
      description: 'Archived event guides, results, and campus coverage.'
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
      description: 'Organize classes, build quizzes, review responses, and stay inside a task-oriented teaching workspace.',
      bullets: [
        'Manage classes, materials, and teams',
        'Create quizzes and review analytics',
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
      icon: 'quiz',
      title: 'Classes and Assessments',
      description: 'Quizzes, class management, and response workflows live behind role-aware workspaces instead of scattered tools.',
      href: primaryWorkspace.href,
      ctaLabel: primaryWorkspace.label
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
      ctaLabel: 'Open events'
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

  const heroVisualItems = [
    { icon: 'menu_book', label: 'Lessons' },
    { icon: 'quiz', label: 'Quizzes' },
    { icon: 'fact_check', label: 'Attendance' },
    { icon: 'event', label: 'Events' },
    { icon: 'groups', label: 'Classes' },
    { icon: 'insights', label: 'Analytics' }
  ];

  const recentLessons = featuredLessons.map((entry) => ({
    href: entry.href,
    icon: entry.icon || 'menu_book',
    title: entry.title,
    meta: `${entry.track} · Guided lesson`,
    ctaLabel: 'Read lesson'
  }));

  const recentBlogs = latestBlogEntries.map((entry) => ({
    href: entry.href,
    icon: entry.categoryIcon || 'article',
    title: entry.title,
    meta: `${entry.categoryLabel} · ${entry.publishedOn || 'Recent post'}`,
    ctaLabel: 'Read article'
  }));

  const recentEvents = eventEntries.map((entry) => ({
    href: entry.href,
    icon: 'event',
    title: entry.title,
    meta: `${entry.dateLabel || 'Archive page'} · ${entry.venue || 'HelloUniversity'}`,
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

  const faqItems = [
    {
      question: 'Can I use the landing page on mobile before signing in?',
      answer: 'Yes. The landing page is designed as a mobile-first public entry point, with stacked sections, full-width actions, and server-rendered content.'
    },
    {
      question: 'Do I need an account to browse lessons, blogs, or events?',
      answer: 'No. Public lessons, blog posts, event pages, and support content can be explored without signing in.'
    },
    {
      question: 'Why do role cards send me to sign in instead of protected pages?',
      answer: 'Public entry points now use safe destinations. If your current session does not match that role, the card sends you through sign-in instead of a broken or unauthorized screen.'
    },
    {
      question: 'Where should returning users start?',
      answer: `Use "${primaryWorkspace.label}" if it matches your role. Otherwise start from lessons, search, or help and move into the workspace you need after signing in.`
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
    recentLessons,
    recentBlogs,
    recentEvents,
    learningSnapshot,
    latestUpdate,
    relatedUpdates,
    faqItems
  };
}

module.exports = {
  getHomePageContent
};
