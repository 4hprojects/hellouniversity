const TRACK_SECTIONS = [
  {
    id: 'core',
    title: 'Core Tracks',
    eyebrow: 'Foundations',
    description: 'Start with the main academic tracks that anchor the learning hub.'
  },
  {
    id: 'build',
    title: 'Build Skills',
    eyebrow: 'Applied Learning',
    description: 'Hands-on programming, workflow, and problem-solving tracks.'
  }
];

const LESSON_TRACKS = [
  {
    id: 'it-fundamentals',
    section: 'core',
    domain: 'foundations',
    domainLabel: 'Foundations',
    title: 'IT Fundamentals',
    icon: 'computer',
    level: 'Beginner',
    summary: 'Core infrastructure, computing history, digital systems, and the modern IT landscape.',
    lessons: [
      { title: 'Understanding IT', href: '/lessons/mst24/mst24-lesson1' },
      { title: 'History of Computers', href: '/lessons/mst24/mst24-lesson2' },
      { title: 'Hardware Components', href: '/lessons/mst24/mst24-lesson3' },
      { title: 'Computer Software', href: '/lessons/mst24/mst24-lesson4' },
      { title: 'Internet and WWW', href: '/lessons/mst24/mst24-lesson5' },
      { title: 'Cybersecurity', href: '/lessons/mst24/mst24-lesson6' },
      { title: 'Social Media', href: '/lessons/mst24/mst24-lesson7' },
      { title: 'Artificial Intelligence', href: '/lessons/mst24/mst24-lesson8' },
      { title: 'Cloud Computing', href: '/lessons/mst24/mst24-lesson9' },
      { title: 'E-Commerce', href: '/lessons/mst24/mst24-lesson10' },
      { title: 'Telecommunications', href: '/lessons/mst24/mst24-lesson11' },
      { title: 'The Gig Economy', href: '/lessons/mst24/mst24-lesson12' }
    ]
  },
  {
    id: 'google-workspace',
    section: 'core',
    domain: 'foundations',
    domainLabel: 'Productivity',
    title: 'Google Workspace',
    icon: 'workspace_premium',
    level: 'Beginner',
    summary: 'Office-suite workflows, collaboration tools, and the Google productivity stack.',
    lessons: [
      { title: 'Office Suites', href: '/lessons/mst24/mst24-lesson13-1' },
      { title: 'Google Workspace', href: '/lessons/mst24/mst24-lesson13-2' },
      { title: 'Gmail', href: '/lessons/mst24/mst24-lesson13-3' },
      { title: 'Google Drive', href: '/lessons/mst24/mst24-lesson13-4' },
      { title: 'Google Docs', href: '/lessons/mst24/mst24-lesson13-5' },
      { title: 'Google Sheets', href: '/lessons/mst24/mst24-lesson13-6' },
      { title: 'Google Slides', href: '/lessons/mst24/mst24-lesson13-7' },
      { title: 'Google Forms', href: '/lessons/mst24/mst24-lesson13-8' },
      { title: 'Google Gemini', href: '/lessons/mst24/mst24-lesson13-9' }
    ]
  },
  {
    id: 'python-programming',
    section: 'build',
    domain: 'programming',
    domainLabel: 'Programming',
    title: 'Python Programming',
    icon: 'code',
    level: 'Beginner to Intermediate',
    summary: 'A full Python sequence from syntax fundamentals to functions, OOP, threading, and tooling.',
    lessons: [
      { title: 'Introduction to Python', href: '/lessons/it114/it114-lesson1-introduction-to-python' },
      { title: 'Python Programming Basics', href: '/lessons/it114/it114-lesson2-python-programming-basics' },
      { title: 'Python Strings', href: '/lessons/it114/it114-lesson3-python-strings' },
      { title: 'Conditional Statements', href: '/lessons/it114/it114-lesson4-conditional-statements' },
      { title: 'While Looping Statement', href: '/lessons/it114/it114-lesson5-while-looping-statement' },
      { title: 'Data Structures', href: '/lessons/it114/it114-lesson6-datastructures' },
      { title: 'For Loop', href: '/lessons/it114/it114-lesson7-forloop' },
      { title: 'Random Module', href: '/lessons/it114/it114-lesson8-randommodule' },
      { title: 'Function Modules', href: '/lessons/it114/it114-lesson9-functionmodules' },
      { title: 'Return Statement', href: '/lessons/it114/it114-lesson9_1-returnstatement' },
      { title: 'Error Handling', href: '/lessons/it114/it114-lesson10-errorhandling' },
      { title: 'Python Scope', href: '/lessons/it114/it114-lesson11-pythonscope' },
      { title: 'Python Time and Date', href: '/lessons/it114/it114-lesson12-pythontimedate' },
      { title: '2D Nested Loop', href: '/lessons/it114/it114-lesson13-2dnestedloop' },
      { title: 'Install Python Library', href: '/lessons/it114/it114-lesson14-install-python-library' },
      { title: 'Text Color', href: '/lessons/it114/it114-lesson15-textcolor' },
      { title: 'Lambda', href: '/lessons/it114/it114-lesson16-lambda' },
      { title: 'Threading', href: '/lessons/it114/it114-lesson17-threading' },
      { title: 'Classes', href: '/lessons/it114/it114-lesson18-classes' },
      { title: 'Executable Files', href: '/lessons/it114/it114-lesson19-exefile' },
      { title: 'Program Documentation', href: '/lessons/it114/it114-lesson20-programdocumentation' }
    ]
  },
  {
    id: 'java-programming',
    section: 'build',
    domain: 'programming',
    domainLabel: 'Programming',
    title: 'Java Programming',
    icon: 'terminal',
    level: 'Beginner to Intermediate',
    summary: 'Core programming concepts, Java syntax, arrays, OOP, file handling, and exceptions.',
    lessons: [
      { title: 'Introduction to Computer Programming', href: '/lessons/java/java-lesson1' },
      { title: 'Introduction to Java', href: '/lessons/java/java-lesson2' },
      { title: 'Fundamentals of Java Programming', href: '/lessons/java/java-lesson3' },
      { title: 'Java Operators', href: '/lessons/java/java-lesson4' },
      { title: 'Java Control Structures', href: '/lessons/java/java-lesson6' },
      { title: 'Java Functions and Methods', href: '/lessons/java/java-lesson7' },
      { title: 'Java Arrays', href: '/lessons/java/java-lesson8' },
      { title: 'Java Multidimensional Arrays', href: '/lessons/java/java-lesson8_1' },
      { title: 'Java Strings', href: '/lessons/java/java-lesson9' },
      { title: 'Java OOP Basics', href: '/lessons/java/java-lesson10' },
      { title: 'Java File Handling', href: '/lessons/java/java-lesson11' },
      { title: 'Java File Handling Practice', href: '/lessons/java/java-lesson11_1' },
      { title: 'Java File Handling Advanced', href: '/lessons/java/java-lesson11_2' },
      { title: 'Java File Handling Integration', href: '/lessons/java/java-lesson11_3' },
      { title: 'Java Exception Handling', href: '/lessons/java/java-lesson12' }
    ]
  },
  {
    id: 'node-programming',
    section: 'build',
    domain: 'programming',
    domainLabel: 'Programming',
    title: 'Node.js Programming',
    icon: 'dns',
    level: 'Intermediate',
    summary: 'Backend web development with Node.js, Express, view engines, MongoDB, and capstone integration.',
    lessons: [
      { title: 'Node.js and MVC Architecture', href: '/lessons/node/node-lesson1' },
      { title: 'Getting Started with Node.js and Express', href: '/lessons/node/node-lesson2' },
      { title: 'View Templates: EJS vs Handlebars', href: '/lessons/node/node-lesson3' },
      { title: 'NoSQL with MongoDB', href: '/lessons/node/node-lesson4' },
      { title: 'Capstone Integration', href: '/lessons/node/node-lesson7' }
    ]
  },
  {
    id: 'mini-lessons',
    section: 'build',
    domain: 'programming',
    domainLabel: 'Mini Lessons',
    title: 'Mini Lessons',
    icon: 'bolt',
    level: 'Quick Study',
    summary: 'Short learning units for targeted concepts and refreshers.',
    lessons: [
      { title: 'Recursion', href: '/lessons/mini/recursion' },
      { title: 'Algorithm and Flowchart Fundamentals', href: '/lessons/mini/algo-flowchart' }
    ]
  },
  {
    id: 'dsa',
    section: 'build',
    domain: 'programming',
    domainLabel: 'Problem Solving',
    title: 'Data Structures and Algorithms',
    icon: 'schema',
    level: 'Intermediate',
    summary: 'Complexity, problem solving, arrays, linked lists, trees, graphs, and algorithm analysis.',
    lessons: [
      { title: 'Data Structures and Algorithms Overview', href: '/lessons/dsalgo/dsalgo-lesson1' },
      { title: 'Problem Solving Patterns', href: '/lessons/dsalgo/dsalgo-lesson1_2' },
      { title: 'Algorithm Design Basics', href: '/lessons/dsalgo/dsalgo-lesson1_3' },
      { title: 'Efficiency and Complexity', href: '/lessons/dsalgo/dsalgo-lesson1_4' },
      { title: 'Applied DSA Exercises', href: '/lessons/dsalgo/dsalgo-lesson1_5' },
      { title: 'Arrays and Linked Lists', href: '/lessons/dsalgo/dsalgo-lesson2' },
      { title: 'Stacks and Queues', href: '/lessons/dsalgo/dsalgo-lesson3' },
      { title: 'Trees', href: '/lessons/dsalgo/dsalgo-lesson4' },
      { title: 'Graphs', href: '/lessons/dsalgo/dsalgo-lesson5' },
      { title: 'Searching Algorithms', href: '/lessons/dsalgo/dsalgo-lesson6' },
      { title: 'Sorting Algorithms', href: '/lessons/dsalgo/dsalgo-lesson7' },
      { title: 'Algorithm Analysis and Optimization', href: '/lessons/dsalgo/dsalgo-lesson8' }
    ]
  },
];

const READING_TRACKS = [
  {
    id: 'seven-habits',
    domain: 'professional',
    domainLabel: 'Companion Reading',
    title: '7 Habits of Highly Effective People',
    icon: 'psychology',
    level: 'Reading Series',
    summary: 'Personal effectiveness, prioritization, communication, and self-renewal for students building stronger academic habits.',
    entryCount: 7,
    href: '/books/7-habits/scp1-be-proactive',
    ctaLabel: 'Start with Be Proactive'
  },
  {
    id: 'way-of-the-shepherd',
    domain: 'professional',
    domainLabel: 'Leadership Reading',
    title: 'The Way of the Shepherd',
    icon: 'groups',
    level: 'Reading Series',
    summary: 'Leadership principles on trust, direction, care, and team stewardship for classroom and project contexts.',
    entryCount: 5,
    href: '/books/the-way-of-the-shepherd/principle1',
    ctaLabel: 'Open leadership reading'
  }
];

const SUPPORT_RESOURCES = [
  {
    title: 'Browse companion books',
    href: '/books',
    icon: 'library_books',
    label: 'Books',
    description: 'Open the separate books hub for leadership and personal-effectiveness reading.'
  },
  {
    title: 'Effective Study Techniques',
    href: '/blogs/gen/effective-study-techniques',
    icon: 'school',
    label: 'Study habits',
    description: 'Use spaced repetition, active recall, and planning strategies when moving through longer lesson tracks.'
  },
  {
    title: 'The Programming Mindset',
    href: '/blogs/gen/programmingmindset',
    icon: 'tips_and_updates',
    label: 'Programming mindset',
    description: 'A practical support read for students moving from concept lessons into real coding work.'
  }
];

const START_PATHS = [
  {
    title: 'Start with Digital Foundations',
    href: '/lessons/mst24/mst24-lesson1',
    icon: 'computer',
    track: 'IT Fundamentals',
    description: 'Best first stop if you want a broad overview of hardware, software, networks, and how digital systems fit together.'
  },
  {
    title: 'Learn Practical School Tools',
    href: '/lessons/mst24/mst24-lesson13-2',
    icon: 'workspace_premium',
    track: 'Google Workspace',
    description: 'Start here if you need useful collaboration, productivity, and document workflow skills right away.'
  },
  {
    title: 'Begin the Coding Path',
    href: '/lessons/it114/it114-lesson1-introduction-to-python',
    icon: 'code',
    track: 'Python Programming',
    description: 'A clean beginner entry point for students who want to move from reading about technology into writing code.'
  },
  {
    title: 'Build Problem-Solving Depth',
    href: '/lessons/dsalgo/dsalgo-lesson1',
    icon: 'schema',
    track: 'Data Structures and Algorithms',
    description: 'Use this path when you are ready to develop stronger algorithmic thinking, structured problem solving, and performance awareness.'
  }
];

const FEATURED_LESSONS = [
  {
    title: 'Understanding Information Technology',
    href: '/lessons/mst24/mst24-lesson1',
    track: 'IT Fundamentals',
    domain: 'foundations',
    icon: 'computer',
    description: 'Start with the foundations of hardware, software, data, networking, and how IT supports real organizations.'
  },
  {
    title: 'Google Workspace',
    href: '/lessons/mst24/mst24-lesson13-2',
    track: 'Google Workspace',
    domain: 'foundations',
    icon: 'workspace_premium',
    description: 'A practical introduction to the collaboration suite many students, teachers, and teams use every day.'
  },
  {
    title: 'Introduction to Python Programming',
    href: '/lessons/it114/it114-lesson1-introduction-to-python',
    track: 'Python Programming',
    domain: 'programming',
    icon: 'code',
    description: 'The cleanest entry point into the coding track, with setup guidance and beginner-friendly foundations.'
  },
  {
    title: 'Introduction to Node.js and MVC Architecture',
    href: '/lessons/node/node-lesson1',
    track: 'Node.js Programming',
    domain: 'programming',
    icon: 'dns',
    description: 'A direct backend-development starting point for students moving into web applications and project structure.'
  },
  {
    title: 'Data Structures and Algorithms Overview',
    href: '/lessons/dsalgo/dsalgo-lesson1',
    track: 'Data Structures and Algorithms',
    domain: 'programming',
    icon: 'schema',
    description: 'A high-value track for interviews, performance thinking, and disciplined problem solving.'
  },
  {
    title: 'Introduction to Java',
    href: '/lessons/java/java-lesson2',
    track: 'Java Programming',
    domain: 'programming',
    icon: 'terminal',
    description: 'A second language path for students who want stronger syntax discipline, OOP foundations, and structured programming practice.'
  }
];

function getLessonsCatalogPageData() {
  const tracks = LESSON_TRACKS.map((track) => {
    const lessonCount = track.lessons.length;
    const searchText = [
      track.title,
      track.summary,
      track.level,
      track.domainLabel,
      ...track.lessons.map((lesson) => lesson.title)
    ]
      .join(' ')
      .toLowerCase();

    return {
      ...track,
      lessonCount,
      previewLessons: track.lessons.slice(0, 5),
      remainingLessonCount: Math.max(lessonCount - 5, 0),
      searchText
    };
  });

  const sections = TRACK_SECTIONS.map((section) => ({
    ...section,
    tracks: tracks.filter((track) => track.section === section.id)
  }));

  const trackCount = tracks.length;
  const lessonCount = tracks.reduce((sum, track) => sum + track.lessonCount, 0);
  const professionalTrackCount = READING_TRACKS.length;

  return {
    sections,
    startPaths: START_PATHS,
    supportResources: SUPPORT_RESOURCES,
    featuredLessons: FEATURED_LESSONS,
    lessonFilters: [
      { value: 'all', label: 'All Tracks' },
      { value: 'foundations', label: 'Foundations' },
      { value: 'programming', label: 'Programming' }
    ],
    lessonStats: {
      trackCount,
      lessonCount,
      professionalTrackCount
    }
  };
}

module.exports = {
  getLessonsCatalogPageData
};
