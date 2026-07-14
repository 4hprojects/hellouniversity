const TOOLKITS = Object.freeze({
  arrays: {
    goal: 'Track how an array keeps indexed positions while values are accessed, inserted, or deleted.',
    hint: 'Say the index and value aloud. During a shift, identify the source cell before the destination cell.',
    terms: [['Index', 'A zero-based position in the array.'], ['Logical size', 'The number of values currently in use.'], ['Capacity', 'The total number of available cells.'], ['Shift', 'Moving a value one position while preserving the other values.']],
    reflect: 'Why must insertion shifts usually begin at the occupied end of the array?'
  },
  stacks: {
    goal: 'Use LIFO order to predict which value is available at the top of a stack.',
    hint: 'Cover every value except the top one. Only that value can leave during pop.',
    terms: [['LIFO', 'Last in, first out.'], ['Top', 'The only end used for normal stack insertion and removal.'], ['Push', 'Add a value to the top.'], ['Pop', 'Remove the current top value.'], ['Peek', 'Read the top without changing the stack.']],
    reflect: 'How does the top index change after push, pop, and peek?'
  },
  queues: {
    goal: 'Use FIFO order and follow front, rear, and size through queue operations.',
    hint: 'Ask which value has waited the longest. Dequeue removes that value from the front.',
    terms: [['FIFO', 'First in, first out.'], ['Front', 'The position removed by dequeue.'], ['Rear', 'The position where the newest value is tracked.'], ['Wraparound', 'Returning a circular index to the beginning after the final slot.']],
    reflect: 'Which pointer changes during enqueue, and which changes during dequeue?'
  },
  'binary-search': {
    goal: 'Repeatedly reduce a sorted active range using low, high, and midpoint boundaries.',
    hint: 'Check that the values are sorted, calculate the midpoint, then discard the half that cannot contain the target.',
    terms: [['Active range', 'The inclusive indexes from low through high still being searched.'], ['Midpoint', 'The index compared with the target.'], ['Low', 'The left boundary of the active range.'], ['High', 'The right boundary of the active range.']],
    reflect: 'Why must the new boundary move past the midpoint after an unequal comparison?'
  },
  sorting: {
    goal: 'Compare Bubble, Selection, and Insertion Sort by the work each strategy performs.',
    hint: 'Name the chosen strategy before predicting. Bubble compares neighbors, Selection scans for a minimum, and Insertion shifts around a key.',
    terms: [['Comparison', 'Checking the order of two values.'], ['Swap', 'Exchanging two positions.'], ['Key', 'The value currently being inserted by Insertion Sort.'], ['Pass', 'One major sweep or placement phase of a sorting strategy.'], ['Stable', 'Equal values keep their original relative order.']],
    reflect: 'Which operation—comparison, swap, or shift—does this strategy use most?'
  },
  bst: {
    goal: 'Follow the ordering rule to insert, search, and traverse a Binary Search Tree.',
    hint: 'At each node, compare once: smaller goes left, larger goes right, and equal follows the stated duplicate rule.',
    terms: [['Root', 'The top node of the tree.'], ['Parent', 'A node directly connected above another node.'], ['Subtree', 'A node together with all descendants below it.'], ['Traversal', 'A defined order for visiting every node.'], ['Depth', 'The number of edges from the root to a node.']],
    reflect: 'How does the tree shape affect the number of comparisons needed for search?'
  }
});

function getVisualDsaStudentToolkit(moduleKey) {
  return TOOLKITS[moduleKey] || null;
}

module.exports = { getVisualDsaStudentToolkit, TOOLKITS };
