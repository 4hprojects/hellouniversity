const stacks = require('../../public/js/visualdsa/modules/stacks/stackModule');

describe('VisualDSA Stack module', () => {
  test('pushes onto the top and tracks size, top, and counters', () => {
    const states = stacks.generateSteps({ operation: 'push', values: ['7', '18'], newValue: '24', capacity: 3 });
    expect(states.at(-1)).toEqual(expect.objectContaining({ values: ['7', '18', '24'], size: 3, top: 2 }));
    expect(states.at(-1).counters.pushes).toBe(1);
  });

  test('pops only the top and handles the final element', () => {
    expect(stacks.generateSteps({ operation: 'pop', values: ['7', '18'], capacity: 3 }).at(-1).values).toEqual(['7']);
    expect(stacks.generateSteps({ operation: 'pop', values: ['7'], capacity: 3 }).at(-1))
      .toEqual(expect.objectContaining({ values: [], top: -1, size: 0 }));
  });

  test('peek returns the top without mutation', () => {
    const states = stacks.generateSteps({ operation: 'peek', values: ['7', '18'], capacity: 3 });
    expect(states.at(-1).values).toEqual(['7', '18']);
    expect(states.at(-1).top).toBe(1);
    expect(states.at(-1).counters.peeks).toBe(1);
  });

  test('reports overflow and underflow without changing the stack', () => {
    const overflow = stacks.generateSteps({ operation: 'push', values: ['7'], newValue: '8', capacity: 1 }).at(-1);
    const underflow = stacks.generateSteps({ operation: 'pop', values: [], capacity: 3 }).at(-1);
    expect(overflow).toEqual(expect.objectContaining({ phase: 'overflow', invalid: true, values: ['7'] }));
    expect(underflow).toEqual(expect.objectContaining({ phase: 'underflow', invalid: true, top: -1 }));
  });

  test('validates capacity, value length, and required push value', () => {
    expect(stacks.validateInput({ operation: 'push', values: [], newValue: '', capacity: 2 }).valid).toBe(false);
    expect(stacks.validateInput({ operation: 'push', values: ['1234567890123'], newValue: 'x', capacity: 2 }).valid).toBe(false);
    expect(stacks.validateInput({ operation: 'peek', values: [], capacity: 11 }).valid).toBe(false);
  });

  test('classifies FIFO prediction as ST02', () => {
    const state = stacks.generateSteps({ operation: 'pop', values: ['bottom', 'top'], capacity: 3 })[0];
    expect(stacks.validateStudentAction({ value: 'bottom' }, state)).toEqual(expect.objectContaining({ isCorrect: false, misconceptionCode: 'ST02' }));
    expect(stacks.validateStudentAction({ value: 'top' }, state).isCorrect).toBe(true);
  });
});
