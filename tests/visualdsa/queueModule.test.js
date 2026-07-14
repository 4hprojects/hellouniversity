const queues = require('../../public/js/visualdsa/modules/queues/queueModule');

describe('VisualDSA Queue module', () => {
  test('enqueues at rear without moving front', () => {
    expect(queues.generateSteps({ operation: 'enqueue', values: ['A', 'B'], newValue: 'C', capacity: 4, front: 0 }).at(-1))
      .toEqual(expect.objectContaining({ values: ['A', 'B', 'C'], front: 0, rear: 2, size: 3 }));
  });
  test('dequeues from front without moving rear', () => {
    expect(queues.generateSteps({ operation: 'dequeue', values: ['A', 'B'], capacity: 4, front: 1 }).at(-1))
      .toEqual(expect.objectContaining({ values: ['B'], front: 2, rear: 2, size: 1 }));
  });
  test('resets pointers after final dequeue', () => {
    expect(queues.generateSteps({ operation: 'dequeue', values: ['A'], capacity: 4, front: 3 }).at(-1))
      .toEqual(expect.objectContaining({ values: [], front: -1, rear: -1, size: 0 }));
  });
  test('wraps rear with modulo and tracks wraparound', () => {
    const state = queues.generateSteps({ operation: 'enqueue', values: ['A', 'B'], newValue: 'C', capacity: 4, front: 2 }).at(-1);
    expect(state.rear).toBe(0);
    expect(state.counters.wraparounds).toBe(1);
  });
  test('front does not mutate and invalid operations preserve state', () => {
    expect(queues.generateSteps({ operation: 'front', values: ['A'], capacity: 2, front: 0 }).at(-1).values).toEqual(['A']);
    expect(queues.generateSteps({ operation: 'dequeue', values: [], capacity: 2 }).at(-1).phase).toBe('empty');
    expect(queues.generateSteps({ operation: 'enqueue', values: ['A'], newValue: 'B', capacity: 1, front: 0 }).at(-1).phase).toBe('full');
  });
  test('classifies rear-removal prediction as QU01', () => {
    const state = queues.generateSteps({ operation: 'dequeue', values: ['front', 'rear'], capacity: 3, front: 0 })[0];
    expect(queues.validateStudentAction({ value: 'rear' }, state)).toEqual(expect.objectContaining({ isCorrect: false, misconceptionCode: 'QU01' }));
  });
});
