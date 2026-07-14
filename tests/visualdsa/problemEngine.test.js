const { generateProblem, validateAction } = require('../../app/visualdsa/problemEngine');

describe('VisualDSA deterministic problem engine', () => {
  test.each(['array-insert-v1', 'stack-operation-sequence-v1', 'queue-operation-sequence-v1'])('reproduces %s from the same seed and version', (templateKey) => {
    const first = generateProblem({ templateKey, seed: 'fixed-seed' });
    const second = generateProblem({ templateKey, seed: 'fixed-seed' });
    expect(second).toEqual(first);
    expect(first.expectedStepsHash).toMatch(/^[a-f0-9]{64}$/);
  });
  test('different seeds produce different array problems', () => {
    expect(generateProblem({ templateKey: 'array-insert-v1', seed: 'one' }).input)
      .not.toEqual(generateProblem({ templateKey: 'array-insert-v1', seed: 'two' }).input);
  });
  test.each(['bubble-sort-full-trace-v1','selection-sort-full-trace-v1','insertion-sort-full-trace-v1'])('reproduces and sorts %s',templateKey=>{const first=generateProblem({templateKey,seed:'sorting-seed'});const second=generateProblem({templateKey,seed:'sorting-seed'});expect(second).toEqual(first);expect(first.expectedStates.at(-1).values).toEqual([...first.input.values].sort((a,b)=>a-b));});
  test('server derives correctness rather than accepting client correctness', () => {
    const problem = generateProblem({ templateKey: 'stack-operation-sequence-v1', seed: 'fixed' });
    const result = validateAction({ templateKey: 'stack-operation-sequence-v1', problem, action: { stepNumber: 0, payload: { value: problem.input.values.at(-1), isCorrect: false } } });
    expect(result.isCorrect).toBe(true);
    expect(result.validationVersion).toBe('1.0.0');
  });
  test('rejects unknown templates and out-of-range steps', () => {
    expect(() => generateProblem({ templateKey: 'unknown', seed: 'x' })).toThrow('Unknown');
    const problem = generateProblem({ templateKey: 'queue-operation-sequence-v1', seed: 'x' });
    expect(validateAction({ templateKey: 'queue-operation-sequence-v1', problem, action: { stepNumber: 99, payload: {} } }).accepted).toBe(false);
  });
});
