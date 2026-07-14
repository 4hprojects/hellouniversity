const arrays = require('../../public/js/visualdsa/modules/arrays/arrayModule');

describe('VisualDSA Array module', () => {
  test('validates input limits, indexes, integer values, and insertion capacity', () => {
    expect(arrays.validateInput({ operation: 'access', values: '4, 8', index: 1 }).valid).toBe(true);
    expect(arrays.validateInput({ operation: 'access', values: '', index: 0 }).valid).toBe(false);
    expect(arrays.validateInput({ operation: 'access', values: '4, nope', index: 0 }).valid).toBe(false);
    expect(arrays.validateInput({ operation: 'access', values: '4, 8', index: 2 }).valid).toBe(false);
    expect(arrays.validateInput({ operation: 'insert', values: [4, 8], index: 1, newValue: 6, capacity: 2 }).errors)
      .toContain('The array is full. Increase capacity before inserting.');
    expect(arrays.validateInput({ operation: 'update', values: [4], index: 0, newValue: 1000 }).valid).toBe(false);
  });

  test('access and update preserve logical size and produce correct counters', () => {
    const access = arrays.generateSteps({ operation: 'access', values: [4, 8, 12], index: 2 });
    const update = arrays.generateSteps({ operation: 'update', values: [4, 8], index: 1, newValue: 9 });

    expect(access.at(-1)).toEqual(expect.objectContaining({ currentIndex: 2, size: 3 }));
    expect(access.at(-1).counters.reads).toBe(1);
    expect(update.at(-1).values).toEqual([4, 9]);
    expect(update.at(-1)).toEqual(expect.objectContaining({ size: 2, currentIndex: 1 }));
    expect(update.at(-1).counters.writes).toBe(1);
  });

  test('traverses every value in index order and preserves duplicates', () => {
    const states = arrays.generateSteps({ operation: 'traverse', values: [5, 5, -2] });
    expect(states.slice(1).map((state) => state.currentIndex)).toEqual([0, 1, 2]);
    expect(states.at(-1).values).toEqual([5, 5, -2]);
    expect(states.at(-1).counters.reads).toBe(3);
  });

  test.each([
    { index: 0, expectedSources: [2, 1, 0], expected: [9, 4, 8, 12] },
    { index: 3, expectedSources: [], expected: [4, 8, 12, 9] }
  ])('inserts at index $index by shifting right to left', ({ index, expectedSources, expected }) => {
    const states = arrays.generateSteps({ operation: 'insert', values: [4, 8, 12], index, newValue: 9, capacity: 4 });
    expect(states.filter((state) => state.phase === 'shift-right').map((state) => state.sourceIndex)).toEqual(expectedSources);
    expect(states.at(-1).values).toEqual(expected);
    expect(states.at(-1).size).toBe(4);
  });

  test.each([
    { index: 0, expectedSources: [1, 2], expected: [8, 12] },
    { index: 2, expectedSources: [], expected: [4, 8] }
  ])('deletes index $index by shifting left to right', ({ index, expectedSources, expected }) => {
    const states = arrays.generateSteps({ operation: 'delete', values: [4, 8, 12], index });
    expect(states.filter((state) => state.phase === 'shift-left').map((state) => state.sourceIndex)).toEqual(expectedSources);
    expect(states.at(-1).values).toEqual(expected);
    expect(states.at(-1).size).toBe(2);
  });

  test('supports single-element deletion and exact immutable snapshots', () => {
    const states = arrays.generateSteps({ operation: 'delete', values: [4], index: 0 });
    expect(states.at(-1).values).toEqual([]);
    expect(states.at(-1).size).toBe(0);
    expect(Object.isFrozen(states.at(-1).values)).toBe(true);
  });

  test('gives specific practice feedback and AR02 classification for wrong shift direction', () => {
    const state = arrays.generateSteps({ operation: 'insert', values: [4, 8], index: 0, newValue: 2, capacity: 3 })[1];
    expect(arrays.validateStudentAction({ sourceIndex: 0 }, state)).toEqual(expect.objectContaining({
      accepted: true,
      isCorrect: false,
      misconceptionCode: 'AR02'
    }));
    expect(arrays.validateStudentAction({ sourceIndex: 1 }, state).isCorrect).toBe(true);
  });
});
