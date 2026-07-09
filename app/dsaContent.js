const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const PACKAGE_ROOT = path.join(__dirname, '..', 'docs', 'hellouniversity-dsa-complete-package');
const DSA_DOCS_ROOT = path.join(PACKAGE_ROOT, 'docs', 'dsa');
const VISUALDSA_DOCS_ROOT = path.join(PACKAGE_ROOT, 'docs', 'visualdsa');
const COURSE_ROUTE = '/data-structures-and-algorithms';
const VISUALDSA_ROUTE = '/visualdsa';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
});

const SECTION_ORDER = [
  {
    title: 'Foundations',
    slug: 'foundations',
    summary: 'Build the thinking habits behind DSA: problem breakdown, complexity, recursion, and careful tracing.'
  },
  {
    title: 'Linear Data Structures',
    slug: 'linear-data-structures',
    summary: 'Learn how arrays, strings, linked lists, stacks, and queues organize data in sequence.'
  },
  {
    title: 'Non-Linear Data Structures',
    slug: 'non-linear-data-structures',
    summary: 'Move into trees, heaps, and graphs where relationships branch, connect, and form networks.'
  },
  {
    title: 'Searching and Sorting',
    slug: 'searching-and-sorting',
    summary: 'Compare core searching and sorting techniques through traces, tradeoffs, and Python examples.'
  },
  {
    title: 'Algorithm Design',
    slug: 'algorithm-design',
    summary: 'Study common design strategies: brute force, divide and conquer, greedy choices, and dynamic programming.'
  },
  {
    title: 'Hashing and Advanced Structures',
    slug: 'hashing-and-advanced-structures',
    summary: 'Use hash tables, sets, maps, and tries for faster lookup, grouping, and prefix-based tasks.'
  },
  {
    title: 'Review',
    slug: 'review',
    summary: 'Connect the full course into practical problem-solving patterns and project decisions.'
  }
];

const LESSONS = [
  ['Introduction to DSA', 'introduction', 'lesson-01-introduction-to-dsa.md', 'Foundations', '/visualdsa/dsa-overview', 'Understand what data structures and algorithms are, why they are studied together, and how they affect real programs.'],
  ['Algorithmic Thinking', 'algorithmic-thinking', 'lesson-02-algorithmic-thinking.md', 'Foundations', '/visualdsa/algorithmic-thinking-demo', 'Practice turning a problem into clear steps before writing code.'],
  ['Time and Space Complexity', 'time-and-space-complexity', 'lesson-03-time-and-space-complexity.md', 'Foundations', '/visualdsa/complexity-comparison', 'Learn how to compare algorithms by how their time and memory use grow.'],
  ['Arrays', 'arrays', 'lesson-04-arrays.md', 'Linear Data Structures', '/visualdsa/array-visualizer', 'Use indexed collections to store, access, update, and traverse ordered data.'],
  ['Strings', 'strings', 'lesson-05-strings.md', 'Linear Data Structures', '/visualdsa/string-visualizer', 'Treat text as a sequence and solve common character-processing tasks.'],
  ['Recursion', 'recursion', 'lesson-06-recursion.md', 'Foundations', '/visualdsa/recursion-call-stack-visualizer', 'Trace functions that solve a problem by calling themselves with smaller inputs.'],
  ['Linked Lists', 'linked-lists', 'lesson-07-linked-lists.md', 'Linear Data Structures', '/visualdsa/linked-list-visualizer', 'Explore node-based sequences where each item points to the next item.'],
  ['Stacks', 'stacks', 'lesson-08-stacks.md', 'Linear Data Structures', '/visualdsa/stack-visualizer', 'Use Last In, First Out behavior for undo, history, and function-call style problems.'],
  ['Queues', 'queues', 'lesson-09-queues.md', 'Linear Data Structures', '/visualdsa/queue-visualizer', 'Use First In, First Out behavior for waiting lines, scheduling, and processing tasks.'],
  ['Trees', 'trees', 'lesson-10-trees.md', 'Non-Linear Data Structures', '/visualdsa/tree-visualizer', 'Represent hierarchical data with roots, parents, children, and leaves.'],
  ['Binary Search Trees', 'binary-search-trees', 'lesson-11-binary-search-trees.md', 'Non-Linear Data Structures', '/visualdsa/binary-search-tree-visualizer', 'Organize comparable values so searching and insertion follow left-right rules.'],
  ['Tree Traversals', 'tree-traversals', 'lesson-12-tree-traversals.md', 'Non-Linear Data Structures', '/visualdsa/tree-traversal-visualizer', 'Visit tree nodes in common orders such as preorder, inorder, postorder, and level order.'],
  ['Heaps', 'heaps', 'lesson-13-heaps.md', 'Non-Linear Data Structures', '/visualdsa/heap-visualizer', 'Learn priority-based tree structures used for efficient minimum or maximum access.'],
  ['Graphs', 'graphs', 'lesson-14-graphs.md', 'Non-Linear Data Structures', '/visualdsa/graph-builder', 'Model connected objects such as routes, friendships, networks, and dependencies.'],
  ['Graph Traversals', 'graph-traversals', 'lesson-15-graph-traversals.md', 'Non-Linear Data Structures', '/visualdsa/graph-traversal-visualizer', 'Trace breadth-first and depth-first ways to explore connected nodes.'],
  ['Linear Search', 'linear-search', 'lesson-16-linear-search.md', 'Searching and Sorting', '/visualdsa/linear-search-visualizer', 'Find a value by checking items one by one and understand when that is enough.'],
  ['Binary Search', 'binary-search', 'lesson-17-binary-search.md', 'Searching and Sorting', '/visualdsa/binary-search-visualizer', 'Search sorted data by repeatedly cutting the search space in half.'],
  ['Bubble Sort', 'bubble-sort', 'lesson-18-bubble-sort.md', 'Searching and Sorting', '/visualdsa/bubble-sort-visualizer', 'Trace a simple comparison sort and see why repeated passes can be expensive.'],
  ['Selection Sort', 'selection-sort', 'lesson-19-selection-sort.md', 'Searching and Sorting', '/visualdsa/selection-sort-visualizer', 'Sort by repeatedly selecting the next smallest or largest value.'],
  ['Insertion Sort', 'insertion-sort', 'lesson-20-insertion-sort.md', 'Searching and Sorting', '/visualdsa/insertion-sort-visualizer', 'Build a sorted section one item at a time, like arranging cards in hand.'],
  ['Merge Sort', 'merge-sort', 'lesson-21-merge-sort.md', 'Searching and Sorting', '/visualdsa/merge-sort-visualizer', 'Use divide and conquer to split, sort, and merge data efficiently.'],
  ['Quick Sort', 'quick-sort', 'lesson-22-quick-sort.md', 'Searching and Sorting', '/visualdsa/quick-sort-visualizer', 'Partition data around a pivot and recursively sort each side.'],
  ['Brute Force Algorithms', 'brute-force-algorithms', 'lesson-23-brute-force-algorithms.md', 'Algorithm Design', '/visualdsa/brute-force-tracing', 'Start with the simplest correct approach and use it as a baseline for improvement.'],
  ['Divide and Conquer', 'divide-and-conquer', 'lesson-24-divide-and-conquer.md', 'Algorithm Design', '/visualdsa/divide-and-conquer-flow', 'Break large problems into smaller parts, solve them, and combine the results.'],
  ['Greedy Algorithms', 'greedy-algorithms', 'lesson-25-greedy-algorithms.md', 'Algorithm Design', '/visualdsa/greedy-choice-visualizer', 'Make locally best choices and learn when that strategy does or does not work.'],
  ['Dynamic Programming Basics', 'dynamic-programming', 'lesson-26-dynamic-programming.md', 'Algorithm Design', '/visualdsa/dynamic-programming-visualizer', 'Reuse stored results to solve problems with overlapping subproblems.'],
  ['Hash Tables', 'hash-tables', 'lesson-27-hash-tables.md', 'Hashing and Advanced Structures', '/visualdsa/hash-table-visualizer', 'Use keys and hashing to support fast lookup, insertion, and grouping.'],
  ['Sets and Maps', 'sets-and-maps', 'lesson-28-sets-and-maps.md', 'Hashing and Advanced Structures', '/visualdsa/sets-and-maps-visualizer', 'Apply uniqueness and key-value relationships to common programming tasks.'],
  ['Tries', 'tries', 'lesson-29-tries.md', 'Hashing and Advanced Structures', '/visualdsa/trie-visualizer', 'Store strings by shared prefixes for autocomplete and word-search style problems.'],
  ['DSA Review and Integration', 'dsa-review-and-integration', 'lesson-30-dsa-review-and-integration.md', 'Review', '/visualdsa/dsa-review-dashboard', 'Review the full course and connect each structure or algorithm to practical decisions.']
].map(([title, slug, fileName, section, visualdsaRoute, summary], index) => ({
  title,
  slug,
  fileName,
  section,
  visualdsaRoute,
  summary,
  number: index + 1,
  href: `${COURSE_ROUTE}/${slug}`,
  sourcePath: path.join(DSA_DOCS_ROOT, 'lessons', fileName)
}));

const PROJECTS = [
  ['Student Grade Record System', 'student-grade-record-system', 'project-01-student-grade-record-system.md', '/visualdsa/student-grade-record-system', 'Build a small grade record program that stores, updates, and reports student performance data.'],
  ['Queue-Based Enrollment System', 'enrollment-queue-system', 'project-02-queue-based-enrollment-system.md', '/visualdsa/enrollment-queue-system', 'Simulate an enrollment line using queue operations and clear menu-driven processing.'],
  ['Stack-Based Undo Feature', 'stack-based-undo-feature', 'project-03-stack-based-undo-feature.md', '/visualdsa/stack-undo-feature', 'Create a simple undo workflow that records actions and reverses the latest change first.'],
  ['Graph-Based Campus Navigation', 'campus-navigation-graph', 'project-04-graph-based-campus-navigation.md', '/visualdsa/campus-navigation-graph', 'Represent campus locations as a graph and explore route-finding ideas.'],
  ['Sorting Algorithm Visual Comparison', 'sorting-algorithm-comparison', 'project-05-sorting-algorithm-visual-comparison.md', '/visualdsa/sorting-comparison-lab', 'Compare sorting algorithms by tracing their steps, swaps, passes, and runtime behavior.']
].map(([title, slug, fileName, visualdsaRoute, summary], index) => ({
  title,
  slug,
  fileName,
  section: 'Applied Projects',
  visualdsaRoute,
  summary,
  number: index + 1,
  href: `${COURSE_ROUTE}/projects/${slug}`,
  sourcePath: path.join(DSA_DOCS_ROOT, 'projects', fileName)
}));

function stripFrontMatter(markdownSource) {
  return String(markdownSource || '').replace(/^---\n[\s\S]*?\n---\n+/, '');
}

function readMarkdown(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function getMarkdownSection(markdownSource, heading) {
  const lines = stripFrontMatter(markdownSource).split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (startIndex < 0) {
    return '';
  }

  const sectionLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      break;
    }
    sectionLines.push(lines[index]);
  }

  return sectionLines.join('\n').trim();
}

function removeMarkdownSection(markdownSource, heading) {
  const lines = stripFrontMatter(markdownSource).split(/\r?\n/);
  const output = [];
  let skipping = false;

  for (const line of lines) {
    const normalized = line.trim().toLowerCase();
    if (normalized === `## ${heading}`.toLowerCase()) {
      skipping = true;
      continue;
    }
    if (skipping && /^##\s+/.test(line)) {
      skipping = false;
    }
    if (!skipping) {
      output.push(line);
    }
  }

  return output.join('\n').trim();
}

function stripQuickCheckSections(markdownSource) {
  return removeMarkdownSection(removeMarkdownSection(markdownSource, 'Quick Check'), 'Answer Key');
}

function parseNumberedItems(sectionText) {
  return String(sectionText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.match(/^(\d+)\.\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({
      id: `q${match[1]}`,
      order: Number(match[1]),
      text: match[2].trim()
    }));
}

function normalizeOptionText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[.。]+$/g, '')
    .trim();
}

const QUICK_CHECK_DISTRACTORS = [
  'The data is always sorted before access.',
  'The operation removes every item.',
  'The algorithm checks every possible answer.',
  'The structure stores only unique values.',
  'The newest value is ignored.',
  'The smallest value is always processed first.',
  'The process stops after one comparison.',
  'The item is copied but never stored.',
  'The value is searched using random positions.',
  'The structure cannot change after creation.'
];

function seededNumber(seedText) {
  return String(seedText || '').split('').reduce((total, character) => {
    return (total * 31 + character.charCodeAt(0)) % 2147483647;
  }, 7);
}

function stableShuffle(items, seedText) {
  const result = [...items];
  let seed = seededNumber(seedText);
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = (seed * 48271) % 2147483647;
    const swapIndex = seed % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function buildQuickCheckOptions({ correctAnswer, allAnswers, seedText }) {
  const correctText = normalizeOptionText(correctAnswer?.text);
  if (!correctText) return [];

  const optionTexts = [correctText];
  const candidates = [
    ...allAnswers.map((answer) => answer.text),
    ...QUICK_CHECK_DISTRACTORS
  ];

  candidates.forEach((candidate) => {
    const optionText = normalizeOptionText(candidate);
    if (!optionText || optionTexts.some((existing) => existing.toLowerCase() === optionText.toLowerCase())) {
      return;
    }
    if (optionTexts.length < 4) {
      optionTexts.push(optionText);
    }
  });

  return stableShuffle(optionTexts.slice(0, 4), seedText).map((text, index) => ({
    id: `option${index + 1}`,
    label: String.fromCharCode(65 + index),
    text,
    isCorrect: text.toLowerCase() === correctText.toLowerCase()
  }));
}

function getQuickCheckFromMarkdown(markdownSource, seedPrefix = '') {
  const questions = parseNumberedItems(getMarkdownSection(markdownSource, 'Quick Check'));
  const answerKey = parseNumberedItems(getMarkdownSection(markdownSource, 'Answer Key'));

  return {
    questions: questions.map((question) => {
      const correctAnswer = answerKey.find((answer) => answer.order === question.order);
      const options = buildQuickCheckOptions({
        correctAnswer,
        allAnswers: answerKey,
        seedText: `${seedPrefix}:${question.id}:${question.text}`
      });
      const correctOption = options.find((option) => option.isCorrect);
      return {
        ...question,
        type: 'multiple_choice',
        options,
        correctOptionId: correctOption?.id || ''
      };
    }),
    answerKey
  };
}

function renderMarkdown(filePath) {
  return markdown.render(stripQuickCheckSections(readMarkdown(filePath)));
}

function getDsaLessons() {
  return LESSONS.map((lesson, index) => ({
    ...lesson,
    previous: index > 0 ? LESSONS[index - 1] : null,
    next: index < LESSONS.length - 1 ? LESSONS[index + 1] : null,
    excerpt: lesson.summary
  }));
}

function getDsaProjects() {
  return PROJECTS.map((project) => ({
    ...project,
    excerpt: project.summary
  }));
}

function getDsaSections() {
  const lessons = getDsaLessons();
  return SECTION_ORDER.map((section) => ({
    ...section,
    lessons: lessons.filter((lesson) => lesson.section === section.title)
  })).filter((section) => section.lessons.length);
}

function getDsaLessonBySlug(slug) {
  const lessons = getDsaLessons();
  const lesson = lessons.find((entry) => entry.slug === slug);
  if (!lesson) return null;
  const markdownSource = readMarkdown(lesson.sourcePath);

  return {
    ...lesson,
    quickCheck: getQuickCheckFromMarkdown(markdownSource, lesson.slug),
    contentHtml: markdown.render(stripQuickCheckSections(markdownSource))
  };
}

function getDsaProjectBySlug(slug) {
  const project = getDsaProjects().find((entry) => entry.slug === slug);
  if (!project) return null;

  return {
    ...project,
    contentHtml: renderMarkdown(project.sourcePath)
  };
}

function getDsaCoursePageData() {
  return {
    courseRoute: COURSE_ROUTE,
    visualdsaRoute: VISUALDSA_ROUTE,
    lessons: getDsaLessons(),
    projects: getDsaProjects(),
    sections: getDsaSections(),
    lessonCount: LESSONS.length,
    projectCount: PROJECTS.length,
    courseHighlights: [
      {
        title: 'What you will learn',
        items: [
          'Choose data structures based on how data is stored, accessed, searched, and updated.',
          'Trace algorithms step by step before translating them into Python code.',
          'Compare solutions using time and space complexity instead of guessing which one is better.',
          'Apply DSA concepts in small projects that resemble real academic and software workflows.'
        ]
      },
      {
        title: 'Who this course is for',
        items: [
          'Beginner programming students who already know basic variables, conditions, loops, and functions.',
          'IT and computer science learners preparing for coding activities, projects, or technical interviews.',
          'Teachers who need a structured DSA path with lessons, practice tasks, quick checks, and projects.'
        ]
      },
      {
        title: 'How to study each lesson',
        items: [
          'Read the concept explanation first, then follow the trace tables or examples slowly.',
          'Run or rewrite the Python examples so the operations become concrete.',
          'Use the VisualDSA link as a guided practice layer, then finish the quick check or activity.'
        ]
      }
    ],
    learningFlow: [
      'Read the lesson',
      'Trace the example',
      'Try the VisualDSA demo',
      'Answer the quick check',
      'Build a project'
    ]
  };
}

function getVisualDsaEntries() {
  const byRoute = new Map();

  for (const lesson of getDsaLessons()) {
    byRoute.set(lesson.visualdsaRoute, {
      title: `${lesson.title} VisualDSA Demo`,
      slug: lesson.visualdsaRoute.replace(`${VISUALDSA_ROUTE}/`, ''),
      href: lesson.visualdsaRoute,
      relatedType: 'lesson',
      relatedTitle: lesson.title,
      relatedHref: lesson.href,
      section: lesson.section
    });
  }

  for (const project of getDsaProjects()) {
    byRoute.set(project.visualdsaRoute, {
      title: `${project.title} VisualDSA Lab`,
      slug: project.visualdsaRoute.replace(`${VISUALDSA_ROUTE}/`, ''),
      href: project.visualdsaRoute,
      relatedType: 'project',
      relatedTitle: project.title,
      relatedHref: project.href,
      section: 'Applied Projects'
    });
  }

  return Array.from(byRoute.values());
}

function getVisualDsaEntryBySlug(slug) {
  return getVisualDsaEntries().find((entry) => entry.slug === slug) || null;
}

function getVisualDsaPageData() {
  return {
    visualdsaRoute: VISUALDSA_ROUTE,
    courseRoute: COURSE_ROUTE,
    demos: getVisualDsaEntries(),
    overviewHtml: renderMarkdown(path.join(VISUALDSA_DOCS_ROOT, '00-visualdsa-integration-overview.md'))
  };
}

function getDsaSitemapEntries() {
  return [
    { loc: COURSE_ROUTE, changefreq: 'weekly', priority: 0.8 },
    ...getDsaLessons().map((lesson) => ({ loc: lesson.href, changefreq: 'monthly', priority: 0.7 })),
    ...getDsaProjects().map((project) => ({ loc: project.href, changefreq: 'monthly', priority: 0.6 })),
    { loc: VISUALDSA_ROUTE, changefreq: 'monthly', priority: 0.6 },
    ...getVisualDsaEntries().map((demo) => ({ loc: demo.href, changefreq: 'monthly', priority: 0.5 }))
  ];
}

function getDsaCatalogLessons() {
  return [
    { title: 'Course Overview', href: COURSE_ROUTE },
    ...getDsaLessons().map((lesson) => ({ title: lesson.title, href: lesson.href })),
    { title: 'Applied DSA Projects', href: `${COURSE_ROUTE}#dsaProjects` },
    { title: 'VisualDSA Demos', href: VISUALDSA_ROUTE }
  ];
}

module.exports = {
  COURSE_ROUTE,
  VISUALDSA_ROUTE,
  getDsaCatalogLessons,
  getDsaCoursePageData,
  getDsaLessonBySlug,
  getDsaLessons,
  getDsaProjectBySlug,
  getDsaProjects,
  getDsaSections,
  getDsaSitemapEntries,
  getVisualDsaEntryBySlug,
  getVisualDsaEntries,
  getVisualDsaPageData
};
