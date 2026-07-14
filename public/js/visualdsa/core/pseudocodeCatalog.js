(function exposeVisualDsaPseudocode(root) {
  'use strict';
  const version = '1.0.0';
  const algorithms = Object.freeze({
    arrays: ['Check the requested index and capacity.', 'Locate the indexed array cell.', 'Shift values without overwriting them.', 'Read, write, insert, or remove the value.', 'Finish with the updated logical size.'],
    stacks: ['Check whether the stack is empty or full.', 'Locate the top of the stack.', 'Push, pop, or read the top value.', 'Update the top and stack size.'],
    queues: ['Check whether the queue is empty or full.', 'Locate the front and rear positions.', 'Read or remove the front, or add after the rear.', 'Wrap the index when it reaches capacity.', 'Update the queue size.'],
    'binary-search': ['Set low to 0 and high to the last index.', 'While low is not greater than high:', 'Choose mid = floor((low + high) / 2).', 'Compare the midpoint value with the target.', 'Move low or high past mid; stop when found.'],
    'sorting:bubble': ['Repeat passes through the unsorted region.', 'Compare adjacent values.', 'Swap them when the left value is greater.', 'Mark the pass end as sorted.', 'Stop early when a pass makes no swaps.'],
    'sorting:selection': ['For each position in the unsorted region:', 'Remember that position as the current minimum.', 'Scan the remaining values for a smaller one.', 'Update the minimum when a smaller value appears.', 'Swap the minimum into the current position.'],
    'sorting:insertion': ['Take the next value as the key.', 'Compare the key with values to its left.', 'Shift larger values one position right.', 'Insert the key into the open position.', 'Repeat for each remaining key.'],
    bst: ['Start at the root.', 'Compare the target with the current node.', 'Move left when smaller or right when larger.', 'Insert, report found, or stop at an empty link.', 'For traversal, visit nodes in the selected order.']
  });
  const phaseLines = Object.freeze({
    arrays: { ready: 0, select: 1, access: 1, traverse: 1, 'shift-right': 2, 'shift-left': 2, remove: 3, updated: 3, inserted: 3, deleted: 4 },
    stacks: { ready: 0, underflow: 0, overflow: 0, 'select-top': 1, pushed: 2, popped: 2, peeked: 2 },
    queues: { ready: 0, empty: 0, full: 0, 'select-front': 1, 'front-read': 2, dequeued: 2, enqueued: 2 },
    'binary-search': { ready: 0, compare: 3, 'update-low': 4, 'update-high': 4, found: 4, 'not-found': 4 },
    'sorting:bubble': { ready: 0, compare: 1, swap: 2, 'pass-complete': 3 },
    'sorting:selection': { ready: 0, scan: 2, 'new-minimum': 3, 'swap-minimum': 4, 'minimum-in-place': 4 },
    'sorting:insertion': { ready: 0, 'select-key': 0, compare: 1, shift: 2, 'insert-key': 3 },
    bst: { ready: 0, compare: 1, inserted: 3, found: 3, 'not-found': 3, visit: 4 }
  });
  function key(moduleKey, state = {}, fallbackAlgorithm = 'bubble') { return moduleKey === 'sorting' ? `sorting:${state.algorithm || fallbackAlgorithm}` : moduleKey; }
  function resolve(moduleKey, state, fallbackAlgorithm) { const catalogKey=key(moduleKey,state,fallbackAlgorithm);return Object.freeze({ version, key:catalogKey, lines:algorithms[catalogKey]||[], activeLine:phaseLines[catalogKey]?.[state?.phase] ?? null }); }
  root.VisualDsaPseudocode = Object.freeze({ version, algorithms, resolve });
}(typeof globalThis !== 'undefined' ? globalThis : this));
