const { getDsaLessonBySlug, getDsaLessons } = require('./dsaContent');

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[.。]+$/g, '')
    .trim();
}

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

function makeOptions(correctText, distractors, seedText) {
  const optionTexts = [normalizeText(correctText)];
  distractors.forEach((candidate) => {
    const text = normalizeText(candidate);
    if (!text || optionTexts.some((existing) => existing.toLowerCase() === text.toLowerCase())) return;
    if (optionTexts.length < 4) optionTexts.push(text);
  });

  [
    'It always stores values in sorted order',
    'It removes all data before solving the problem',
    'It works only with numbers',
    'It avoids every comparison'
  ].forEach((fallback) => {
    if (optionTexts.length < 4 && !optionTexts.some((existing) => existing.toLowerCase() === fallback.toLowerCase())) {
      optionTexts.push(fallback);
    }
  });

  return stableShuffle(optionTexts.slice(0, 4), seedText).map((text, index) => ({
    optionId: `option${index + 1}`,
    label: OPTION_LABELS[index],
    text,
    isCorrect: text.toLowerCase() === optionTexts[0].toLowerCase()
  }));
}

function fromMarkdownQuestion(lesson, question, index) {
  const options = Array.isArray(question.options) ? question.options : [];
  return {
    lessonSlug: lesson.slug,
    lessonTitle: lesson.title,
    questionId: `${lesson.slug}-q${String(index + 1).padStart(3, '0')}`,
    questionText: question.text,
    type: 'multiple_choice',
    options: options.map((option, optionIndex) => ({
      optionId: option.id || `option${optionIndex + 1}`,
      label: option.label || OPTION_LABELS[optionIndex] || String(optionIndex + 1),
      text: option.text,
      isCorrect: option.isCorrect === true
    })),
    status: 'active',
    difficulty: index < 2 ? 'easy' : 'medium',
    tags: [lesson.section, lesson.slug, 'markdown-source'],
    source: 'dsa_seed_v1'
  };
}

const CURATED_LESSON_QUESTIONS = {
  introduction: [
    {
      questionText: 'What is a data structure?',
      correct: 'A way to organize and store data so it can be used efficiently',
      distractors: [
        'A programming language used only for math',
        'A file that stores the final output of a program',
        'A rule that tells the computer what color to display'
      ],
      difficulty: 'easy',
      tags: ['definition']
    },
    {
      questionText: 'What is an algorithm?',
      correct: 'A step-by-step process for solving a problem',
      distractors: [
        'A place where data is stored permanently',
        'A random guess made by a program',
        'A variable name used inside Python code'
      ],
      difficulty: 'easy',
      tags: ['definition']
    },
    {
      questionText: 'Why are data structures and algorithms usually studied together?',
      correct: 'Programs need both organized data and clear steps for processing that data',
      distractors: [
        'They are both only used when designing websites',
        'Algorithms replace the need to store data',
        'Data structures automatically solve every problem'
      ],
      difficulty: 'easy',
      tags: ['relationship']
    },
    {
      questionText: 'Which data structure is a natural choice for storing a simple ordered list of student names?',
      correct: 'A list or array',
      distractors: [
        'A single number variable',
        'A timer',
        'A printed certificate'
      ],
      difficulty: 'easy',
      tags: ['application']
    },
    {
      questionText: 'Which algorithmic process checks items one by one until a match is found or the list ends?',
      correct: 'Linear search',
      distractors: [
        'Stack push',
        'Queue enqueue',
        'Hash table creation'
      ],
      difficulty: 'easy',
      tags: ['application']
    },
    {
      questionText: 'A program stores a class roster, then finds one student by name. Which pairing best describes this task?',
      correct: 'A data structure stores the roster, and an algorithm searches it',
      distractors: [
        'An algorithm stores the roster, and a color theme searches it',
        'A data structure guesses the answer without steps',
        'A single print statement replaces both storage and search'
      ],
      difficulty: 'medium',
      tags: ['relationship']
    },
    {
      questionText: 'Which example is most clearly a data structure?',
      correct: 'A list of exam scores',
      distractors: [
        'Adding all scores one by one',
        'Checking whether a score is passing',
        'Printing the highest score'
      ],
      difficulty: 'easy',
      tags: ['classification']
    },
    {
      questionText: 'Which example is most clearly an algorithm?',
      correct: 'Steps for finding the highest score in a list',
      distractors: [
        'The list that contains all scores',
        'The number stored as the highest score',
        'The screen where the score is displayed'
      ],
      difficulty: 'easy',
      tags: ['classification']
    },
    {
      questionText: 'Why does choosing a good data structure matter?',
      correct: 'It can make storing, finding, and updating data easier or faster',
      distractors: [
        'It makes every program run without testing',
        'It removes the need for algorithms',
        'It changes Python into another language'
      ],
      difficulty: 'medium',
      tags: ['reasoning']
    },
    {
      questionText: 'Why does choosing a good algorithm matter?',
      correct: 'It affects how many steps a program may need to solve a problem',
      distractors: [
        'It decides the color of the output',
        'It prevents data from being stored',
        'It makes all inputs exactly the same size'
      ],
      difficulty: 'medium',
      tags: ['reasoning']
    },
    {
      questionText: 'A school wants to process students in the order they arrive for enrollment. Which structure idea fits best?',
      correct: 'A queue',
      distractors: [
        'A random number',
        'A single Boolean value',
        'A recursive drawing'
      ],
      difficulty: 'medium',
      tags: ['application']
    },
    {
      questionText: 'An app needs an undo feature that reverses the most recent action first. Which structure idea fits best?',
      correct: 'A stack',
      distractors: [
        'A queue for oldest action first',
        'A single string with no history',
        'A sorted grade table only'
      ],
      difficulty: 'medium',
      tags: ['application']
    },
    {
      questionText: 'Which question should you ask before choosing a data structure?',
      correct: 'How will the program need to store, access, and update the data?',
      distractors: [
        'Which option has the shortest name?',
        'Can I avoid understanding the problem?',
        'Which structure appears first alphabetically?'
      ],
      difficulty: 'medium',
      tags: ['reasoning']
    },
    {
      questionText: 'Which question should you ask before choosing an algorithm?',
      correct: 'What exact steps are needed to transform the input into the desired output?',
      distractors: [
        'How many colors should the page use?',
        'Can the program skip all input?',
        'Which variable name looks longest?'
      ],
      difficulty: 'medium',
      tags: ['reasoning']
    },
    {
      questionText: 'What does “input-process-output” mean in problem solving?',
      correct: 'Data enters the program, steps are performed, and a result is produced',
      distractors: [
        'The program starts with the final answer',
        'Only output matters, not the data or steps',
        'Input and process are always the same thing'
      ],
      difficulty: 'easy',
      tags: ['trace-comprehension']
    },
    {
      questionText: 'A contact app stores names with phone numbers. Which structure idea is closest?',
      correct: 'A map or dictionary that connects each name to a phone number',
      distractors: [
        'A stack that only remembers the latest name',
        'A queue that removes every contact after reading it',
        'A number variable that stores all names at once'
      ],
      difficulty: 'medium',
      tags: ['application']
    },
    {
      questionText: 'What is the best beginner-friendly meaning of efficiency in DSA?',
      correct: 'Solving the problem correctly while using reasonable time and memory',
      distractors: [
        'Writing code with no spaces',
        'Always choosing the longest solution',
        'Avoiding all data storage'
      ],
      difficulty: 'medium',
      tags: ['reasoning']
    },
    {
      questionText: 'Which situation shows why algorithm choice matters?',
      correct: 'Searching 10 names one by one may be fine, but searching 1,000,000 names needs more care',
      distractors: [
        'A program looks better if the function name is longer',
        'All programs take the same time no matter the input size',
        'Data disappears when a list becomes large'
      ],
      difficulty: 'medium',
      tags: ['reasoning']
    },
    {
      questionText: 'Which statement best separates storing data from processing data?',
      correct: 'A data structure holds the data; an algorithm describes steps performed on the data',
      distractors: [
        'A data structure and an algorithm are always identical',
        'An algorithm is only a type of database table',
        'A data structure performs all steps without instructions'
      ],
      difficulty: 'easy',
      tags: ['relationship']
    },
    {
      questionText: 'Given students = ["Ana", "Ben", "Carlo"], what does the program check first in a linear search for "Carlo"?',
      correct: 'It checks "Ana" first because linear search starts at the beginning',
      distractors: [
        'It checks "Carlo" first because that is the target',
        'It checks all names at exactly the same time',
        'It sorts the names before checking anything'
      ],
      difficulty: 'easy',
      tags: ['trace-comprehension']
    }
  ]
};

function q(questionText, correct, distractors, tags = [], difficulty = 'medium') {
  return { questionText, correct, distractors, tags, difficulty };
}

function buildSpecQuestions(spec) {
  return [
    q(`What is ${spec.concept}?`, spec.definition, spec.definitionDistractors, ['definition'], 'easy'),
    q(`Which statement correctly classifies ${spec.concept}?`, spec.classification, spec.classificationDistractors, ['classification'], 'easy'),
    q(`Which rule is central to ${spec.concept}?`, spec.rule, spec.ruleDistractors, ['operation-behavior'], 'easy'),
    q(`In ${spec.concept}, what does ${spec.operations[0].name} do?`, spec.operations[0].correct, spec.operations[0].distractors, ['operation-behavior'], 'easy'),
    q(`In ${spec.concept}, what does ${spec.operations[1].name} do?`, spec.operations[1].correct, spec.operations[1].distractors, ['operation-behavior'], 'medium'),
    q(`Which step belongs to ${spec.concept}?`, spec.operations[2].correct, spec.operations[2].distractors, ['operation-behavior'], 'medium'),
    q(spec.trace.questionText, spec.trace.correct, spec.trace.distractors, ['trace-comprehension'], 'medium'),
    q(spec.trace2.questionText, spec.trace2.correct, spec.trace2.distractors, ['trace-comprehension'], 'medium'),
    q(spec.application.questionText, spec.application.correct, spec.application.distractors, ['application'], 'medium'),
    q(`Which situation is a natural use of ${spec.concept}?`, spec.application.correct, spec.application.distractors, ['application'], 'medium'),
    q(spec.complexity.questionText, spec.complexity.correct, spec.complexity.distractors, ['complexity-performance'], 'medium'),
    q(spec.performance.questionText, spec.performance.correct, spec.performance.distractors, ['complexity-performance'], 'medium'),
    q(spec.edge.questionText, spec.edge.correct, spec.edge.distractors, ['edge-cases'], 'medium'),
    q(spec.misconception.questionText, spec.misconception.correct, spec.misconception.distractors, ['misconception'], 'medium'),
    q(spec.comparison.questionText, spec.comparison.correct, spec.comparison.distractors, ['comparison-tradeoff'], 'medium'),
    q(`Which condition must be checked when using ${spec.concept}?`, spec.condition.correct, spec.condition.distractors, ['edge-cases'], 'medium'),
    q(spec.smallExample.questionText, spec.smallExample.correct, spec.smallExample.distractors, ['trace-comprehension'], 'medium'),
    q(spec.memory.questionText, spec.memory.correct, spec.memory.distractors, ['complexity-performance'], 'medium'),
    q(spec.choice.questionText, spec.choice.correct, spec.choice.distractors, ['application'], 'medium'),
    q(spec.invariant.questionText, spec.invariant.correct, spec.invariant.distractors, ['reasoning'], 'medium')
  ];
}

const CURATED_LESSON_SPECS = {
  'algorithmic-thinking': {
    concept: 'algorithmic thinking',
    definition: 'Breaking a problem into clear inputs, steps, decisions, and outputs',
    definitionDistractors: ['Choosing a data type at random', 'Writing code before reading the problem', 'Drawing only the final screen'],
    classification: 'It is a problem-solving process rather than a single data structure',
    classificationDistractors: ['It is a Python list operation', 'It is a type of binary tree', 'It is a sorting algorithm only'],
    rule: 'Understand the input and output before designing the steps',
    ruleDistractors: ['Start from the longest possible code', 'Ignore small examples', 'Choose recursion for every task'],
    operations: [
      { name: 'decomposition', correct: 'It splits a large problem into smaller parts', distractors: ['It combines all variables into one string', 'It sorts the output alphabetically', 'It removes every condition'] },
      { name: 'dry running', correct: 'It traces steps by hand on a small input', distractors: ['It deletes code comments', 'It changes the programming language', 'It skips the process step'] },
      { correct: 'Write pseudocode before translating the idea into code', distractors: ['Use only random test data', 'Avoid naming the inputs', 'Store every value in the same variable'] }
    ],
    trace: { questionText: 'For input numbers [2, 4, 6], an algorithm adds each number to total starting at 0. What is total after the second number?', correct: '6', distractors: ['2', '4', '12'] },
    trace2: { questionText: 'If a dry run shows output 9 when the expected output is 10, what does that reveal?', correct: 'At least one step or condition needs to be checked', distractors: ['The algorithm is automatically correct', 'The input should be ignored', 'The output no longer matters'] },
    application: { questionText: 'A program must compute the average grade of a class. Which plan is best?', correct: 'Read grades, sum them, count them, then divide sum by count', distractors: ['Print the first grade only', 'Sort names before reading grades', 'Divide before any grades are read'] },
    complexity: { questionText: 'Why can a step-by-step algorithm be compared for efficiency?', correct: 'The number of steps can grow differently as input size grows', distractors: ['All algorithms have exactly one step', 'Efficiency depends only on font size', 'Input size never changes'] },
    performance: { questionText: 'Which plan usually scales better for checking a list once?', correct: 'One pass through the list', distractors: ['A nested pass for every item without need', 'Repeating the same check forever', 'Restarting from the beginning after each item'] },
    edge: { questionText: 'Which input is an important edge case for an average-grade algorithm?', correct: 'An empty list of grades', distractors: ['A list with ordinary values', 'A class name string', 'A printed report title'] },
    misconception: { questionText: 'Which statement is a misconception about algorithms?', correct: 'An algorithm must be written in a programming language to exist', distractors: ['An algorithm can be described in pseudocode', 'An algorithm should have clear steps', 'An algorithm can be dry-run before coding'] },
    comparison: { questionText: 'How is pseudocode different from Python code?', correct: 'Pseudocode expresses the logic without requiring exact Python syntax', distractors: ['Pseudocode runs faster than Python', 'Pseudocode stores data permanently', 'Pseudocode replaces testing'] },
    condition: { correct: 'Whether the input format and expected output are clear', distractors: ['Whether the variable names are longest', 'Whether the code has colors', 'Whether the output is guessed'] },
    smallExample: { questionText: 'A step says “if score >= 75, mark Pass.” What happens when score is 75?', correct: 'The result is Pass', distractors: ['The result is Fail', 'The condition is skipped', 'The score becomes 0'] },
    memory: { questionText: 'When does an algorithm use extra memory?', correct: 'When it stores additional values such as counters, lists, or tables', distractors: ['Only when the screen is bright', 'Only when the answer is wrong', 'Never, because algorithms are steps'] },
    choice: { questionText: 'Which task most needs algorithmic thinking before coding?', correct: 'Designing steps to validate and summarize many student records', distractors: ['Changing a button color', 'Renaming a folder', 'Opening a browser tab'] },
    invariant: { questionText: 'In a loop that totals numbers, what should remain true after each iteration?', correct: 'The total equals the sum of numbers processed so far', distractors: ['The total always equals the last number', 'The input list becomes empty immediately', 'The loop condition never changes'] }
  },
  'time-and-space-complexity': {
    concept: 'time and space complexity',
    definition: 'A way to describe how running time and memory use grow with input size',
    definitionDistractors: ['A measurement of screen loading color', 'A rule for naming functions', 'A guarantee that code is always fast'],
    classification: 'It is an analysis tool for comparing algorithms',
    classificationDistractors: ['It is a data structure that stores keys', 'It is only a Python module', 'It is a visual layout rule'],
    rule: 'Focus on growth rate as n becomes larger',
    ruleDistractors: ['Count only comments', 'Measure only one tiny input', 'Ignore loops and stored data'],
    operations: [
      { name: 'O(1)', correct: 'It describes work that stays constant as input grows', distractors: ['It always means one second', 'It grows once for each item', 'It means nested loops'] },
      { name: 'O(n)', correct: 'It describes work that grows roughly in proportion to n', distractors: ['It never depends on input size', 'It always sorts the data', 'It doubles memory every step'] },
      { correct: 'A nested loop over the same list can lead to O(n^2)', distractors: ['A single assignment always causes O(n^2)', 'Printing once causes O(n^2)', 'A dictionary key always causes O(n^2)'] }
    ],
    trace: { questionText: 'A loop checks each of 5 items once. How many item checks happen?', correct: '5', distractors: ['1', '10', '25'] },
    trace2: { questionText: 'A nested loop compares each pair in a list of 4 items. About how many pair checks can happen?', correct: '16', distractors: ['4', '8', '1'] },
    application: { questionText: 'A feature must search millions of records often. Which concern matters most?', correct: 'How the search time grows as records increase', distractors: ['The length of the function name', 'The color of the output', 'The order of import statements only'] },
    complexity: { questionText: 'Which complexity is usually better for large n?', correct: 'O(log n)', distractors: ['O(n^2)', 'O(n^3)', 'O(2^n)'] },
    performance: { questionText: 'Why can O(n^2) become slow?', correct: 'The number of operations can grow much faster than the input size', distractors: ['It uses no operations', 'It means constant time', 'It only works for strings'] },
    edge: { questionText: 'Which case can hide performance problems during testing?', correct: 'Testing only very small inputs', distractors: ['Testing larger inputs', 'Testing edge cases', 'Comparing two algorithms'] },
    misconception: { questionText: 'Which statement is false about Big O?', correct: 'Big O predicts the exact runtime in seconds on every computer', distractors: ['Big O describes growth rate', 'Big O can compare algorithms', 'Big O often ignores constant factors'] },
    comparison: { questionText: 'How does time complexity differ from space complexity?', correct: 'Time tracks operations; space tracks extra memory', distractors: ['Both mean only CPU brand', 'Space counts only printed output', 'Time counts only variable names'] },
    condition: { correct: 'What input size n represents in the problem', distractors: ['Which color theme is active', 'Which comment is longest', 'Whether the file has a title'] },
    smallExample: { questionText: 'If an algorithm does two separate loops over n items, what is its simplified growth?', correct: 'O(n)', distractors: ['O(1)', 'O(n^2)', 'O(log n)'] },
    memory: { questionText: 'Which example uses O(n) extra space?', correct: 'Creating a new list that stores one result for each input item', distractors: ['Using one counter variable', 'Reading one item and discarding it', 'Comparing two numbers once'] },
    choice: { questionText: 'Which task benefits most from complexity analysis?', correct: 'Choosing between two search methods for a large dataset', distractors: ['Choosing a page title', 'Choosing an icon color', 'Choosing a folder name'] },
    invariant: { questionText: 'When comparing complexities, what should stay consistent?', correct: 'The meaning of input size n', distractors: ['The number of screenshots', 'The font used in code', 'The order of menu items'] }
  }
};

const LINEAR_SPECS = {
  arrays: ['arrays', 'An indexed collection of elements stored in order', 'A linear data structure with index-based access', 'Use an index to access a specific position', 'index access', 'It reads or writes the element at a given position', 'traversal', 'It visits elements one by one', 'Check bounds before using an index', 'For arr = [4, 7, 9], what is arr[1]?', '7', 'A grade list where positions matter', 'O(n) for scanning an unsorted array', 'Searching unsorted data may require checking every element', 'Accessing index 0 in an empty array is invalid', 'Arrays and linked lists differ because arrays support direct index access', 'The index is within 0 and length - 1', 'After appending 8 to [2, 5], what is the list?', '[2, 5, 8]', 'Storing n values requires O(n) memory', 'Use an array for a fixed ordered sequence of scores', 'The order of elements stays meaningful'],
  strings: ['strings', 'A sequence of characters treated as text', 'A linear sequence of characters', 'Characters are accessed by position', 'indexing', 'It reads the character at a position', 'slicing', 'It creates a substring from a range', 'Remember that many languages use zero-based indexing', 'For word = "code", what is word[0]?', '"c"', 'Checking whether a word is a palindrome', 'O(n) to scan all characters', 'String algorithms often depend on length', 'Python strings are immutable', 'Strings are like arrays of characters but may not allow direct character replacement', 'The index is valid for the string length', 'For "level", what is the reverse?', '"level"', 'Building many new strings can use extra memory', 'Use a string operation to validate a username prefix', 'Character order is preserved'],
  recursion: ['recursion', 'A technique where a function solves a problem by calling itself on smaller input', 'An algorithm design technique', 'Every recursive solution needs a base case', 'recursive call', 'It calls the same function with a smaller or simpler input', 'base case', 'It stops the recursion', 'Move each call closer to the base case', 'For factorial(3), what smaller call happens first?', 'factorial(2)', 'Solving factorial or tree traversal naturally', 'Often O(n) calls for factorial(n)', 'Recursive calls add stack frames', 'Missing base cases can cause infinite recursion', 'Recursion uses the call stack while iteration uses loops explicitly', 'The input gets smaller or simpler', 'If countdown(2) prints n then calls countdown(n-1), what prints first?', '2', 'Each active call uses stack memory', 'Use recursion for nested structures like trees', 'The base case is eventually reached']
};

const STRUCTURE_SPECS = {
  'linked-lists': ['linked lists', 'A sequence of nodes where each node stores data and a link to the next node', 'A linear linked data structure', 'Nodes are connected by references instead of indexes', 'head', 'It points to the first node', 'next pointer', 'It points to the following node', 'Handle None at the end of the list', 'In A -> B -> C, what node follows B?', 'C', 'Frequent insertion at the front of a list', 'O(n) to search by value', 'Traversal follows links one node at a time', 'Losing a next pointer can disconnect nodes', 'Arrays use indexes; linked lists use links between nodes', 'The head reference is updated when inserting at the front', 'After inserting X at the front of A -> B, what is first?', 'X', 'Each node stores data plus a reference', 'Use a linked list when front insertions are common', 'Every reachable node is connected from head'],
  stacks: ['stacks', 'A collection where the most recently added item is removed first', 'A linear LIFO data structure', 'Last In, First Out controls removal order', 'push', 'It adds an item to the top', 'pop', 'It removes the top item', 'Check for empty stack before popping', 'After push A, push B, pop, what is removed?', 'B', 'Undo history in an editor', 'O(1) push and pop on a typical stack', 'Only the top item is directly accessed', 'Popping an empty stack causes underflow', 'Stacks remove newest first; queues remove oldest first', 'The stack is not empty before pop', 'After pushing 1 then 2, what does peek return?', '2', 'A stack stores all active items until popped', 'Use a stack to reverse recent actions', 'The top always refers to the newest item'],
  queues: ['queues', 'A collection where the earliest added item is removed first', 'A linear FIFO data structure', 'First In, First Out controls removal order', 'enqueue', 'It adds an item to the rear', 'dequeue', 'It removes an item from the front', 'Check for empty queue before dequeuing', 'After enqueue A, enqueue B, dequeue, what is removed?', 'A', 'Serving customers in arrival order', 'O(1) enqueue and dequeue with a proper queue', 'A queue tracks waiting order', 'Removing from an empty queue is an underflow case', 'Queues remove oldest first; stacks remove newest first', 'Front and rear positions are maintained correctly', 'After enqueue 1 then 2, what is at the front?', '1', 'A queue stores waiting items until served', 'Use a queue for print jobs or enrollment lines', 'The front always refers to the next item to serve']
};

const TREE_GRAPH_SPECS = {
  trees: ['trees', 'A hierarchical structure made of nodes connected by edges', 'A non-linear hierarchical data structure', 'One root can connect to child subtrees', 'root', 'It is the top node with no parent', 'leaf', 'It is a node with no children', 'Handle an empty tree before reading the root', 'In a tree with root A and children B and C, what is A?', 'The root', 'Representing folders and subfolders', 'Traversal usually visits each node once: O(n)', 'Tree height affects many operations', 'A cycle would violate a normal tree structure', 'Trees are hierarchical; arrays are linear', 'Each child has one parent in a standard tree', 'If B has no children, what type of node is B?', 'A leaf', 'A tree stores one node object per item plus links', 'Use a tree for organization charts', 'There is a unique path from root to each node'],
  'binary-search-trees': ['binary search trees', 'A binary tree where left values are smaller and right values are larger than the node', 'A searchable ordered binary tree', 'Left subtree values are less; right subtree values are greater', 'insert', 'It places a value by comparing left or right at each node', 'search', 'It follows comparisons until the value is found or a null link appears', 'Decide how duplicates are handled', 'In a BST with root 10, where does 7 go?', 'Left of 10', 'Maintaining a sorted set with search', 'O(log n) average search when balanced', 'A skewed BST can degrade to O(n)', 'Inserting sorted data can create a tall skewed tree', 'BSTs keep order; heaps prioritize root value', 'The BST ordering rule is preserved after insert', 'Inorder traversal of a BST returns what order?', 'Sorted order', 'Each node stores value and up to two child links', 'Use a BST when ordered search is needed', 'Every subtree also satisfies the BST rule'],
  'tree-traversals': ['tree traversals', 'Systematic ways to visit every node in a tree', 'Algorithms for visiting tree nodes', 'Traversal order determines when each node is processed', 'preorder', 'It visits root before left and right subtrees', 'inorder', 'It visits left subtree, root, then right subtree', 'Handle an empty subtree as a stopping point', 'For root A with left B and right C, what is preorder?', 'A, B, C', 'Printing a tree in a chosen order', 'O(n) because each node is visited once', 'Traversal cost grows with number of nodes', 'Forgetting null checks can break recursive traversal', 'BFS uses a queue; DFS-style traversals use recursion or a stack', 'Each node should be visited exactly once', 'For root A with left B and right C, what is inorder?', 'B, A, C', 'Recursive traversal uses call-stack memory', 'Use inorder to get sorted values from a BST', 'The chosen traversal order remains consistent'],
  heaps: ['heaps', 'A complete binary tree that keeps highest or lowest priority at the root', 'A priority-based tree structure', 'The heap property controls parent-child priority', 'heapify', 'It restores the heap property', 'extract', 'It removes the root priority item and rebalances', 'Keep the tree complete after updates', 'In a max heap, where is the largest value?', 'At the root', 'Implementing a priority queue', 'O(log n) insert and remove in a binary heap', 'Heap operations move along the height of the tree', 'A heap is not fully sorted internally', 'Heaps give quick priority access; BSTs give ordered search', 'The heap property holds after each update', 'After extracting from a heap, what must happen?', 'Restore the heap property', 'A heap stores all items plus array positions or links', 'Use a heap for scheduling next highest-priority job', 'The root always has the required priority'],
  graphs: ['graphs', 'A structure of vertices connected by edges', 'A non-linear network data structure', 'Edges define relationships between vertices', 'vertex', 'It represents an item or point in the graph', 'edge', 'It connects two vertices', 'Decide whether edges are directed or undirected', 'In edge A -> B, which vertex is the destination?', 'B', 'Representing roads, friendships, or dependencies', 'Adjacency-list space is often O(V + E)', 'Graph cost depends on vertices and edges', 'Cycles can cause repeated visits if not tracked', 'Adjacency lists store neighbors; matrices store a grid of connections', 'Every referenced neighbor is a valid vertex', 'If A connects to B and C, what is in A’s adjacency list?', 'B and C', 'Dense graphs may use much more edge storage', 'Use a graph for route planning between places', 'Edges accurately represent the intended relationships'],
  'graph-traversals': ['graph traversals', 'Algorithms for visiting vertices and edges in a graph', 'Graph search algorithms', 'Use a visited set to avoid revisiting vertices', 'BFS', 'It explores neighbors level by level using a queue', 'DFS', 'It explores deeply using recursion or a stack', 'Mark vertices as visited before repeated paths loop', 'Starting BFS at A with neighbors B and C, what is visited after A?', 'B and C before deeper vertices', 'Finding reachable pages from a starting page', 'BFS and DFS are O(V + E) with adjacency lists', 'Traversal work grows with vertices and edges', 'Without visited tracking, cycles can repeat forever', 'BFS is better for shortest unweighted paths; DFS is useful for deep exploration', 'A vertex is processed at most once', 'In DFS from A to B to D, what happens before trying C?', 'D is explored before returning to C', 'BFS queue or DFS stack stores pending vertices', 'Use BFS for minimum hops in an unweighted graph', 'Visited tracking prevents duplicate processing']
};

const SEARCH_SORT_SPECS = {
  'linear-search': ['linear search', 'A search that checks items one by one from start to end', 'A sequential search algorithm', 'Stop when the target is found or the list ends', 'comparison', 'It checks the current item against the target', 'return not found', 'It reports failure after all items are checked', 'Handle an empty list', 'Searching [3, 5, 7] for 7, what is checked first?', '3', 'Finding a name in a small unsorted list', 'O(n) worst-case time', 'The target may be at the end or absent', 'It does not require sorted data', 'Linear search works on unsorted data; binary search requires sorted data', 'Each item is checked in order until stopping', 'Searching [3, 5, 7] for 5 returns which index?', '1', 'Only a few variables are needed: O(1) extra space', 'Use linear search for small or unsorted collections', 'No item before the current position matched the target'],
  'binary-search': ['binary search', 'A search that repeatedly halves a sorted search range', 'A divide-and-conquer search algorithm', 'The data must be sorted', 'mid check', 'It compares the target with the middle value', 'range update', 'It discards the half that cannot contain the target', 'Stop when low passes high', 'In [2, 4, 6, 8, 10], what is the first middle value?', '6', 'Searching a large sorted list of IDs', 'O(log n) worst-case time', 'Each comparison cuts the search range about in half', 'Using binary search on unsorted data can fail', 'Binary search is faster than linear search on large sorted lists', 'The remaining range is sorted', 'If target 8 is greater than middle 6, which half remains?', 'Right half', 'Iterative binary search uses O(1) extra space', 'Use binary search for sorted arrays or lists', 'The target, if present, remains inside low..high'],
  'bubble-sort': ['bubble sort', 'A sorting algorithm that repeatedly swaps adjacent out-of-order items', 'A comparison-based sorting algorithm', 'Large values bubble toward the end after passes', 'compare adjacent', 'It checks neighboring items', 'swap', 'It exchanges two adjacent out-of-order values', 'Stop early if a pass makes no swaps', 'After one pass on [3, 1, 2], which value reaches the end?', '3', 'Teaching basic comparison sorting', 'O(n^2) worst-case time', 'Nested passes make it slow for large lists', 'Already sorted input can finish early with a swapped flag', 'Bubble sort swaps adjacent pairs; selection sort selects a minimum', 'After each pass, the end portion is sorted', 'After comparing 4 and 2 in ascending sort, what happens?', 'They swap', 'It sorts in place with O(1) extra space', 'Use bubble sort mainly for learning or tiny lists', 'The largest unsorted item moves to its final area each pass'],
  'selection-sort': ['selection sort', 'A sorting algorithm that repeatedly selects the smallest remaining item', 'A comparison-based in-place sorting algorithm', 'Select the minimum from the unsorted section each pass', 'find minimum', 'It scans the unsorted part for the smallest value', 'swap into place', 'It moves the selected item to the boundary of the sorted section', 'Avoid swapping if the minimum is already in place', 'In [4, 2, 5], what is selected first for ascending order?', '2', 'Sorting a small list with simple in-place logic', 'O(n^2) time in all basic cases', 'It scans the remaining unsorted section each pass', 'It usually performs fewer swaps than bubble sort', 'Selection sort selects a minimum; insertion sort shifts into a sorted prefix', 'The sorted prefix grows by one each pass', 'After first pass on [4, 2, 5], what begins the list?', '2', 'It uses O(1) extra space', 'Use selection sort when simple logic and few swaps matter', 'Items before the boundary are in sorted order'],
  'insertion-sort': ['insertion sort', 'A sorting algorithm that inserts each new item into a sorted prefix', 'A comparison-based sorting algorithm', 'Keep a sorted left side and insert the next key', 'key', 'It is the value currently being inserted', 'shift', 'It moves larger values right to make space', 'Handle the beginning of the list while shifting', 'Inserting 2 into sorted [1, 3, 4] gives what?', '[1, 2, 3, 4]', 'Sorting small or nearly sorted data', 'O(n) best case when already sorted', 'O(n^2) worst case when many shifts are needed', 'Reverse-sorted input causes many shifts', 'Insertion sort is good for nearly sorted data; selection sort still scans', 'The left side remains sorted after each insertion', 'In [2, 4, 3], which value is the key at index 2?', '3', 'It sorts in place with O(1) extra space', 'Use insertion sort for small nearly sorted lists', 'Every processed prefix is sorted'],
  'merge-sort': ['merge sort', 'A divide-and-conquer sort that splits then merges sorted halves', 'A stable divide-and-conquer sorting algorithm', 'Divide the list, sort halves, then merge', 'split', 'It divides the list into smaller parts', 'merge', 'It combines sorted halves into one sorted list', 'The base case is a list of size 0 or 1', 'Merging [1, 4] and [2, 3] starts with which value?', '1', 'Sorting large data with predictable O(n log n) time', 'O(n log n) time', 'Merging requires processing all items at each level', 'It usually needs O(n) extra space', 'Merge sort uses extra space; quick sort often partitions in place', 'Each merge receives sorted sublists', 'After splitting [8, 2, 5, 1], what size are the main halves?', '2 and 2', 'The merge step commonly uses extra arrays', 'Use merge sort when stable predictable sorting matters', 'Merged output remains sorted'],
  'quick-sort': ['quick sort', 'A divide-and-conquer sort that partitions around a pivot', 'A comparison-based partitioning sort', 'Values are partitioned relative to the pivot', 'pivot', 'It is the value used to split smaller and larger items', 'partition', 'It rearranges items around the pivot', 'Choose pivots carefully to avoid bad splits', 'With pivot 5, where should 2 go?', 'Before the pivot side for smaller values', 'Fast average-case in-place sorting', 'O(n log n) average time', 'Bad pivots can cause O(n^2)', 'Already sorted data can be bad for naive pivot choice', 'Quick sort partitions; merge sort merges sorted halves', 'After partition, pivot is in its final sorted position', 'For [3, 1, 4] with pivot 3, which value is smaller?', '1', 'In-place partitioning can use low extra memory', 'Use quick sort when average speed matters', 'Partition keeps smaller and larger sides separated']
};

const DESIGN_ADVANCED_SPECS = {
  'brute-force-algorithms': ['brute force algorithms', 'Algorithms that try all straightforward possibilities', 'An exhaustive problem-solving approach', 'Check every candidate when no shortcut is used', 'exhaustive search', 'It tests all possible candidates', 'nested loop pair check', 'It tries combinations of items', 'Avoid missing valid candidates', 'Pair-sum brute force on [1, 4, 5] checks which pair first?', '1 and 4', 'Building a correct baseline solution', 'Often O(n^2) or worse depending on candidates', 'Trying all possibilities can grow quickly', 'It may be too slow for large inputs', 'Brute force is simple but optimized methods reduce work', 'Every possible candidate is considered', 'For password length 2 over digits, how many combinations exist?', '100', 'It may use little memory but much time', 'Use brute force first to verify a small solution', 'No candidate is skipped accidentally'],
  'divide-and-conquer': ['divide and conquer', 'Solving a problem by splitting it into subproblems, solving them, and combining results', 'An algorithm design strategy', 'Divide, conquer, and combine', 'divide', 'It splits the problem into smaller parts', 'combine', 'It merges or uses subproblem results', 'A base case stops further division', 'Merge sort divides [8, 2, 5, 1] into what?', 'Two smaller halves', 'Sorting or searching by repeated splitting', 'Often O(n log n) for balanced split-and-combine algorithms', 'Balanced subproblems usually improve performance', 'Unbalanced splits can reduce the benefit', 'Divide and conquer splits work; brute force tries candidates directly', 'Each subproblem is smaller than the original', 'Binary search keeps which part after comparison?', 'The half that can contain the target', 'Recursion can use call-stack memory', 'Use divide and conquer when a problem naturally splits', 'Subproblem answers combine into the full answer'],
  'greedy-algorithms': ['greedy algorithms', 'Algorithms that choose the best-looking local option at each step', 'An algorithm design strategy', 'Make a locally optimal choice at each step', 'local choice', 'It chooses the best immediate option', 'counterexample check', 'It tests whether local choices can fail', 'Verify the greedy-choice property for the problem', 'Choosing the largest coin first is an example of what?', 'A greedy choice', 'Activity selection with compatible intervals', 'Often efficient when the greedy property holds', 'Greedy avoids exploring every combination', 'Greedy can fail when local choices block better global solutions', 'Greedy chooses locally; dynamic programming stores subproblem results', 'Each chosen item remains part of the solution', 'If a greedy route picks nearest city each time, what can go wrong?', 'It may miss a shorter overall route', 'Greedy often uses little extra memory', 'Use greedy when local optimal choices are provably safe', 'The partial solution remains feasible'],
  'dynamic-programming': ['dynamic programming', 'Solving overlapping subproblems by storing and reusing results', 'An algorithm design strategy using saved subproblem answers', 'Reuse answers instead of recomputing them', 'memoization', 'It stores recursive results in a cache', 'tabulation', 'It fills a table from smaller cases upward', 'Identify overlapping subproblems and base cases', 'Why is naive Fibonacci slow?', 'It recomputes the same subproblems many times', 'Optimization problems with repeated subproblems', 'DP can reduce exponential recursion to polynomial time for some problems', 'Stored results trade memory for speed', 'Missing base cases breaks the recurrence', 'DP stores subproblem results; greedy does not revisit choices', 'A state definition matches the subproblem being solved', 'If memo stores fib(5), what happens next time fib(5) is needed?', 'The cached value is reused', 'DP tables or caches use extra memory', 'Use DP for overlapping subproblems and optimal substructure', 'Each stored state has one correct computed value'],
  'hash-tables': ['hash tables', 'A structure that maps keys to values using a hash function', 'A key-value lookup data structure', 'Hash keys into bucket positions', 'hash function', 'It converts a key into an index or bucket', 'collision handling', 'It resolves multiple keys mapping to the same place', 'Handle collisions correctly', 'If two keys map to the same bucket, what occurred?', 'A collision', 'Fast lookup by student ID', 'Average O(1) search, insert, and delete', 'Good hashing spreads keys across buckets', 'Worst case can degrade when many keys collide', 'Hash tables optimize key lookup; arrays optimize index access', 'Equal keys map consistently', 'Looking up phone["Ana"] uses what?', 'The key "Ana"', 'A hash table stores buckets and key-value entries', 'Use a hash table for fast key-based lookup', 'Each key is associated with the intended value'],
  'sets-and-maps': ['sets and maps', 'Structures for unique values and key-value associations', 'Hash-based collection types in many languages', 'Sets prevent duplicates; maps associate keys with values', 'set membership', 'It checks whether a value is present', 'map lookup', 'It retrieves a value by key', 'Choose set for uniqueness and map for key-value data', 'Adding "Ana" twice to a set leaves how many "Ana" entries?', 'One', 'Counting word frequency with a dictionary', 'Average O(1) membership or key lookup in hash-based versions', 'Hashing makes common lookups fast', 'Mutable keys can break map behavior in some languages', 'A set stores values; a map stores key-value pairs', 'Keys are unique in a map', 'If counts["cat"] becomes 3, what is "cat"?', 'A key', 'Sets and maps store entries in memory based on count', 'Use a set to remove duplicates from IDs', 'No duplicate element exists in a set'],
  tries: ['tries', 'A tree-like structure for storing strings by shared prefixes', 'A prefix tree data structure', 'Each path can represent a prefix or word', 'insert word', 'It creates or follows character nodes', 'prefix search', 'It follows characters of the prefix', 'Use an end-of-word marker to separate full words from prefixes', 'After inserting "car" and "cat", which prefix is shared?', '"ca"', 'Autocomplete suggestions', 'O(m) search for word length m', 'Runtime depends on key length more than number of stored words', 'Without end markers, prefixes and full words can be confused', 'Tries optimize prefix lookup; hash tables optimize exact key lookup', 'Characters are followed in order from root', 'If node for "app" is marked end-of-word, what does that mean?', '"app" is a stored word', 'A trie may use many nodes for sparse alphabets', 'Use a trie for prefix autocomplete', 'Every stored word ends at a marked node'],
  'dsa-review-and-integration': ['DSA review and integration', 'Choosing and combining structures and algorithms to solve complete problems', 'A synthesis of DSA concepts', 'Match the problem need to the right structure and algorithm', 'structure selection', 'It chooses how data should be stored', 'algorithm selection', 'It chooses the steps to process the data', 'Check correctness, complexity, and edge cases together', 'A task needs undo, arrival order, and fast lookup. How many structure ideas may be needed?', 'More than one', 'Designing a small app with search, sorting, and history', 'Integrated solutions compare total time and memory costs', 'One weak structure choice can slow the whole workflow', 'Using every structure at once adds unnecessary complexity', 'Stacks, queues, trees, graphs, and maps solve different access patterns', 'Each chosen component has a clear responsibility', 'For autocomplete plus counts, which pair fits?', 'Trie plus map', 'Integrated designs may store data in multiple structures', 'Use integration when a project has multiple data needs', 'The chosen DSA pieces work together toward the requirement']
};

function specArrayToObject(values) {
  const [
    concept, definition, classification, rule,
    op1Name, op1Correct, op2Name, op2Correct, op3Correct,
    traceQuestion, traceCorrect, applicationCorrect,
    complexityCorrect, performanceCorrect, edgeCorrect,
    comparisonCorrect, conditionCorrect,
    smallQuestion, smallCorrect, memoryCorrect, choiceCorrect, invariantCorrect
  ] = values;
  const commonDefinitionDistractors = ['A screen style for displaying output', 'A random variable name', 'A file format used only for images'];
  const commonClassificationDistractors = ['A password policy', 'A page layout component', 'A network address only'];
  const commonRuleDistractors = ['Ignore input order completely', 'Use the same operation for every problem', 'Remove all stored values before processing'];
  return {
    concept,
    definition,
    definitionDistractors: commonDefinitionDistractors,
    classification,
    classificationDistractors: commonClassificationDistractors,
    rule,
    ruleDistractors: commonRuleDistractors,
    operations: [
      { name: op1Name, correct: op1Correct, distractors: ['It deletes every item', 'It sorts unrelated records', 'It changes the data type without using the value'] },
      { name: op2Name, correct: op2Correct, distractors: ['It skips all stored data', 'It creates a random answer', 'It only changes printed formatting'] },
      { correct: op3Correct, distractors: ['Ignore boundary cases', 'Assume all inputs are already correct', 'Use an unrelated data structure'] }
    ],
    trace: { questionText: traceQuestion, correct: traceCorrect, distractors: ['The first value is always removed', 'The result cannot be determined from the operation', 'All values are processed at once without order'] },
    trace2: { questionText: `Which tiny trace best matches ${concept}?`, correct: smallCorrect, distractors: ['The operation ignores the chosen rule', 'The structure becomes empty before the first step', 'The result is unrelated to the input'] },
    application: { questionText: `Which application fits ${concept}?`, correct: applicationCorrect, distractors: ['Choosing a font size', 'Changing only a page background', 'Renaming a folder without processing data'] },
    complexity: { questionText: `What performance fact is important for ${concept}?`, correct: complexityCorrect, distractors: ['It is always O(1) for every operation', 'It never uses memory', 'It runs without depending on input'] },
    performance: { questionText: `Why does performance matter for ${concept}?`, correct: performanceCorrect, distractors: ['Only the file name matters', 'The input size never changes', 'All operations cost exactly the same'] },
    edge: { questionText: `Which edge case matters for ${concept}?`, correct: edgeCorrect, distractors: ['A normal middle item only', 'A decorative label', 'A different course section'] },
    misconception: { questionText: `Which statement is a misconception about ${concept}?`, correct: `It should be used for every DSA problem`, distractors: [`${concept} has specific use cases`, 'The problem requirements matter', 'Edge cases should be tested'] },
    comparison: { questionText: `Which comparison about ${concept} is accurate?`, correct: comparisonCorrect, distractors: ['It is identical to every other DSA topic', 'It never has tradeoffs', 'It only affects comments'] },
    condition: { correct: conditionCorrect, distractors: ['Whether the title is short', 'Whether the UI has icons', 'Whether the input can be ignored'] },
    smallExample: { questionText: smallQuestion, correct: smallCorrect, distractors: ['No valid step can happen', 'The answer is always the last option', 'The structure changes randomly'] },
    memory: { questionText: `What memory fact applies to ${concept}?`, correct: memoryCorrect, distractors: ['It stores nothing in all cases', 'It stores only colors', 'It uses memory unrelated to input'] },
    choice: { questionText: `When should you choose ${concept}?`, correct: choiceCorrect, distractors: ['When the problem has no data', 'When the output should be random', 'When a shorter name is desired'] },
    invariant: { questionText: `What should remain true while using ${concept}?`, correct: invariantCorrect, distractors: ['The rules change after every step', 'Correctness is checked only by guessing', 'The input meaning disappears'] }
  };
}

Object.entries({
  ...CURATED_LESSON_SPECS,
  ...LINEAR_SPECS,
  ...STRUCTURE_SPECS,
  ...TREE_GRAPH_SPECS,
  ...SEARCH_SORT_SPECS,
  ...DESIGN_ADVANCED_SPECS
}).forEach(([slug, values]) => {
  CURATED_LESSON_QUESTIONS[slug] = buildSpecQuestions(Array.isArray(values) ? specArrayToObject(values) : values);
});

function curatedQuestionToBankQuestion(lesson, question, index) {
  return {
    lessonSlug: lesson.slug,
    lessonTitle: lesson.title,
    questionId: `${lesson.slug}-q${String(index + 1).padStart(3, '0')}`,
    questionText: question.questionText,
    type: 'multiple_choice',
    options: makeOptions(question.correct, question.distractors, `${lesson.slug}:curated:${index + 1}:${question.questionText}`),
    status: 'active',
    difficulty: question.difficulty || 'medium',
    tags: [lesson.section, lesson.slug, 'curated', ...(question.tags || [])],
    source: 'dsa_curated_v1'
  };
}

function generatedQuestionTemplates(lesson, existingAnswerTexts) {
  const concept = lesson.title;
  const section = lesson.section;
  const summary = lesson.summary;
  const commonDistractors = [
    'Memorizing syntax without tracing the steps',
    'Skipping the input and output requirements',
    'Choosing a tool before understanding the problem',
    'Using the same approach for every problem'
  ];

  return [
    {
      questionText: `What is the main focus of the ${concept} lesson?`,
      correct: summary,
      distractors: [
        `Replacing every ${section} topic with database queries`,
        `Avoiding all examples that use ${concept}`,
        'Learning only visual design terminology',
        ...commonDistractors
      ],
      difficulty: 'easy',
      tags: ['lesson-focus']
    },
    {
      questionText: `Which course section includes ${concept}?`,
      correct: section,
      distractors: ['Foundations', 'Linear Data Structures', 'Non-Linear Data Structures', 'Searching and Sorting', 'Algorithm Design', 'Hashing and Advanced Structures', 'Review'].filter((item) => item !== section),
      difficulty: 'easy',
      tags: ['course-structure']
    },
    {
      questionText: `When studying ${concept}, what should a student trace first?`,
      correct: 'The input, the steps taken, and the resulting output',
      distractors: ['Only the final answer', 'Only the variable names', 'Only the file name', ...commonDistractors],
      difficulty: 'easy',
      tags: ['tracing']
    },
    {
      questionText: `Why is ${concept} part of a DSA course?`,
      correct: 'It helps students choose and reason about an efficient problem-solving approach',
      distractors: ['It removes the need to test code', 'It guarantees every program uses less memory', 'It only applies to web page styling', ...commonDistractors],
      difficulty: 'medium',
      tags: ['purpose']
    },
    {
      questionText: `Which habit best supports learning ${concept}?`,
      correct: 'Predict each step before running the code',
      distractors: ['Copy code without reading it', 'Ignore edge cases', 'Use random inputs only', ...commonDistractors],
      difficulty: 'easy',
      tags: ['study-habit']
    },
    {
      questionText: `What should you compare when deciding whether to use ${concept}?`,
      correct: 'Correctness, runtime, memory use, and fit for the problem',
      distractors: ['Only the number of lines of code', 'Only the variable names', 'Only the color of the visualizer', ...commonDistractors],
      difficulty: 'medium',
      tags: ['tradeoffs']
    },
    {
      questionText: `Which example would make a ${concept} explanation stronger?`,
      correct: 'A small input traced step by step',
      distractors: ['A very large example with no explanation', 'A screenshot without labels', 'A definition with no input or output', ...commonDistractors],
      difficulty: 'easy',
      tags: ['examples']
    },
    {
      questionText: `What is a good first check after implementing ${concept}?`,
      correct: 'Test it with a small normal case and an edge case',
      distractors: ['Assume it works if there are no comments', 'Delete the test inputs', 'Only test with empty code', ...commonDistractors],
      difficulty: 'medium',
      tags: ['testing']
    },
    {
      questionText: `How should VisualDSA support the ${concept} lesson?`,
      correct: 'By showing how the state changes at each step',
      distractors: ['By hiding all intermediate states', 'By replacing the lesson text completely', 'By showing unrelated animations only', ...commonDistractors],
      difficulty: 'medium',
      tags: ['visualdsa']
    },
    {
      questionText: `Which statement best describes a strong answer about ${concept}?`,
      correct: 'It explains what happens and why the chosen approach fits',
      distractors: ['It gives only a one-word answer', 'It avoids mentioning the data', 'It focuses only on formatting', ...commonDistractors],
      difficulty: 'medium',
      tags: ['explanation']
    },
    {
      questionText: `What kind of mistake should students watch for in ${concept}?`,
      correct: 'Handling the usual case but missing boundary cases',
      distractors: ['Writing comments before code', 'Using meaningful names', 'Drawing a trace table', ...commonDistractors],
      difficulty: 'medium',
      tags: ['edge-cases']
    },
    {
      questionText: `What does a trace table help reveal in ${concept}?`,
      correct: 'How values change during each step of the process',
      distractors: ['The student login password', 'The website color palette', 'The final grade automatically', ...commonDistractors],
      difficulty: 'easy',
      tags: ['tracing']
    },
    {
      questionText: `Which question should guide choosing ${concept} in a project?`,
      correct: 'Does this match the way the project needs to store, search, or process data?',
      distractors: ['Is this the newest topic in the course?', 'Can this avoid all debugging?', 'Will this remove every input?', ...commonDistractors],
      difficulty: 'medium',
      tags: ['application']
    },
    {
      questionText: `What is the safest way to compare ${concept} with another approach?`,
      correct: 'Use the same input and trace both approaches fairly',
      distractors: ['Change the input for each approach', 'Compare only the shorter name', 'Ignore memory and runtime', ...commonDistractors],
      difficulty: 'medium',
      tags: ['comparison']
    },
    {
      questionText: `What should a learner do when confused by ${concept}?`,
      correct: 'Reduce the example size and trace one step at a time',
      distractors: ['Skip every smaller example', 'Add more unrelated features', 'Stop checking the input', ...commonDistractors],
      difficulty: 'easy',
      tags: ['debugging']
    }
  ].map((item, index) => ({
    ...item,
    distractors: [...item.distractors, ...existingAnswerTexts]
      .filter((text) => normalizeText(text).toLowerCase() !== normalizeText(item.correct).toLowerCase()),
    order: index
  }));
}

function buildDsaQuickCheckQuestionBank() {
  return getDsaLessons().flatMap((lessonMeta) => {
    const lesson = getDsaLessonBySlug(lessonMeta.slug);
    const curatedQuestions = CURATED_LESSON_QUESTIONS[lesson.slug];
    if (Array.isArray(curatedQuestions) && curatedQuestions.length) {
      return curatedQuestions.slice(0, 20).map((question, index) => curatedQuestionToBankQuestion(lesson, question, index));
    }

    const markdownQuestions = Array.isArray(lesson.quickCheck?.questions) ? lesson.quickCheck.questions : [];
    const bank = markdownQuestions.map((question, index) => fromMarkdownQuestion(lesson, question, index));
    const existingAnswerTexts = bank.flatMap((question) => question.options.filter((option) => option.isCorrect).map((option) => option.text));
    const templates = generatedQuestionTemplates(lesson, existingAnswerTexts);

    templates.forEach((template) => {
      if (bank.length >= 20) return;
      const questionNumber = bank.length + 1;
      bank.push({
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        questionId: `${lesson.slug}-q${String(questionNumber).padStart(3, '0')}`,
        questionText: template.questionText,
        type: 'multiple_choice',
        options: makeOptions(template.correct, template.distractors, `${lesson.slug}:${questionNumber}:${template.questionText}`),
        status: 'active',
        difficulty: template.difficulty,
        tags: [lesson.section, lesson.slug, ...template.tags],
        source: 'dsa_seed_v1'
      });
    });

    return bank;
  });
}

module.exports = {
  buildDsaQuickCheckQuestionBank,
  stableShuffle
};
