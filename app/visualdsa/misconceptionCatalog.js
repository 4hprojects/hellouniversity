const DEFINITIONS = Object.freeze({
  AR02: ['Shift direction', 'For insertion, move occupied values from right to left so none are overwritten.', 'arrays'],
  ST02: ['Stack order', 'A stack removes the most recently added value first (LIFO).', 'stacks'],
  QU02: ['Queue order', 'A queue removes the value at the front first (FIFO).', 'queues'],
  BS01: ['Midpoint choice', 'Choose the midpoint inside the current low-to-high search range.', 'binary-search'],
  BS02: ['Boundary update', 'After comparing, discard the half that cannot contain the target.', 'binary-search'],
  SO01: ['Comparison choice', 'Compare the positions required by the selected sorting strategy.', 'bubble-sort'],
  SO02: ['Swap decision', 'Swap only when the selected algorithm requires the compared values to change places.', 'bubble-sort'],
  BT01: ['Tree direction', 'Compare with the current node: smaller goes left and larger goes right.', 'binary-search-trees'],
  BT05: ['Traversal order', 'Follow the selected preorder, inorder, or postorder visit rule.', 'tree-traversals']
});

function studentMisconception(code, moduleKey) {
  if (!code) return null;
  const row = DEFINITIONS[code] || ['Review this step', 'Compare your response with the rule shown in the lesson, then try again.', moduleKey === 'binary-search' ? 'binary-search' : moduleKey];
  return Object.freeze({ code, title: row[0], explanation: row[1], lessonHref: `/data-structures-and-algorithms/${row[2]}` });
}

module.exports = { DEFINITIONS, studentMisconception };
