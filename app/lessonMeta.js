const LESSON_META = {
  'mst24/mst24-lesson1': {
    title: 'Understanding Information Technology | HelloUniversity Lessons',
    description:
      'Understand the fundamentals of Information Technology, including hardware, software, data, networking, and IT in modern organizations.',
    keywords:
      'Information Technology, IT fundamentals, IT components, hardware, software, data, networking, MST24 lesson 1, HelloUniversity lessons',
    ogImage:
      'https://hellouniversity.online/images/mst24lesson1-towfiqu-barbhuiya-oZuBNC-6E2s-unsplash.webp'
  },
  'mst24/mst24-lesson2': {
    title: 'History of Computers | HelloUniversity Lessons',
    description:
      'Explore the evolution of computers from early mechanical devices to modern computing platforms and their impact on society.',
    keywords:
      'history of computers, computing evolution, MST24 lesson 2, information technology history, HelloUniversity lessons'
  },
  'it114/it114-lesson1-introduction-to-python': {
    title: 'Lesson 1: Introduction to Python Programming | HelloUniversity Lessons',
    description:
      'Start learning Python programming with this beginner-friendly lesson covering syntax, setup, and practical coding foundations.',
    keywords:
      'Python programming, Python for beginners, introduction to Python, IT114 lesson 1, coding fundamentals, HelloUniversity lessons',
    ogImage: 'https://hellouniversity.online/images/it114lesson1-python-intro.webp'
  },
  'it114/it114-lesson2-python-programming-basics': {
    title: 'Python Programming Basics | HelloUniversity Lessons',
    description:
      'Learn Python syntax fundamentals, variables, data types, and essential coding patterns for beginners.',
    keywords:
      'python basics, python syntax, variables, data types, IT114 lesson 2, HelloUniversity lessons'
  },
  'node/node-lesson1': {
    title: 'Lesson 1: Introduction to Node.js and MVC Architecture | HelloUniversity Lessons',
    description:
      'Learn Node.js and MVC Architecture in this beginner-friendly guide for IT students and aspiring full-stack developers.',
    keywords:
      'Node.js, MVC architecture, introduction to Node.js, JavaScript backend, full-stack development, HelloUniversity lessons',
    ogImage: 'https://hellouniversity.online/images/nodejs-mvc-guide.jpg'
  },
  'node/node-lesson2': {
    title: 'Getting Started with Node.js and Express | HelloUniversity Lessons',
    description:
      'Build foundational backend skills with Node.js and Express, including routing, middleware, and project structure.',
    keywords:
      'node.js express, backend basics, routing, middleware, node lesson 2, HelloUniversity lessons'
  },
  'java/java-lesson1': {
    title: 'Introduction to Computer Programming | HelloUniversity Lessons',
    description:
      'Start your Java track with core programming concepts, problem-solving foundations, and beginner-friendly examples.',
    keywords:
      'java lesson 1, computer programming fundamentals, introduction to programming, HelloUniversity lessons'
  },
  'dsalgo/dsalgo-lesson1': {
    title: 'Data Structures and Algorithms Overview | HelloUniversity Lessons',
    description:
      'Understand the fundamentals of data structures and algorithms and how they improve software performance and problem solving.',
    keywords:
      'data structures, algorithms, DSA basics, dsalgo lesson 1, HelloUniversity lessons'
  },
  'mini/recursion': {
    title: 'Recursion Mini Lesson | HelloUniversity Lessons',
    description:
      'Learn recursion concepts with practical examples, base cases, and step-by-step execution flow.',
    keywords:
      'recursion, recursive functions, algorithm thinking, mini lesson, HelloUniversity lessons'
  },
  'mini/algo-flowchart': {
    title: 'Algorithm and Flowchart Fundamentals | HelloUniversity Lessons',
    description:
      'Master algorithm design and flowchart basics to plan, visualize, and communicate problem-solving logic.',
    keywords:
      'algorithm, flowchart, problem solving, mini lesson, HelloUniversity lessons'
  }
};

function getLessonMeta(track, lesson) {
  return LESSON_META[`${track}/${lesson}`] || null;
}

module.exports = {
  getLessonMeta
};
