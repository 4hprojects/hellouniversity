(function expose(root, factory) {
  const api = factory(root?.VisualDsaStateManager);
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../core/stateManager'));
  if (root) root.VisualDsaStackModule = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function build(stateApi) {
  'use strict';
  function validateInput(input = {}) {
    const operation = String(input.operation || '').toLowerCase();
    const capacity = Number(input.capacity ?? 6);
    const values = Array.isArray(input.values) ? input.values.map(String) : String(input.values || '').split(',').map((v) => v.trim()).filter(Boolean);
    const errors = [];
    if (!['push', 'pop', 'peek'].includes(operation)) errors.push('Choose push, pop, or peek.');
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) errors.push('Capacity must be between 1 and 10.');
    if (values.length > capacity) errors.push('Stack size cannot exceed capacity.');
    if (values.some((v) => v.length > 12)) errors.push('Each value may contain at most 12 characters.');
    if (operation === 'push' && !String(input.newValue ?? '').trim()) errors.push('Enter a value to push.');
    return { valid: !errors.length, errors, value: errors.length ? null : stateApi.snapshot({ operation, values, capacity, newValue: String(input.newValue ?? '').trim() }) };
  }
  function generateSteps(input) {
    const checked = input?.valid ? input : validateInput(input);
    if (!checked.valid) throw new TypeError(checked.errors.join(' '));
    const { operation, values, capacity, newValue } = checked.value;
    const base = { values: [...values], capacity, size: values.length, top: values.length - 1, counters: { pushes: 0, pops: 0, peeks: 0 } };
    const states = [{ ...base, phase: 'ready', explanation: `Stack ready. Top index is ${base.top}.` }];
    if (operation === 'push') {
      if (values.length === capacity) return states.concat([{ ...base, phase: 'overflow', invalid: true, explanation: 'Push rejected: the fixed-capacity stack is full.' }]).map(stateApi.snapshot);
      const next = [...values, newValue];
      states.push({ ...base, values: next, size: next.length, top: next.length - 1, currentIndex: next.length - 1, phase: 'pushed', explanation: `Push ${newValue} onto the top.`, counters: { pushes: 1, pops: 0, peeks: 0 } });
    } else if (!values.length) {
      states.push({ ...base, phase: 'underflow', invalid: true, explanation: `${operation === 'pop' ? 'Pop' : 'Peek'} rejected: the stack is empty.` });
    } else if (operation === 'pop') {
      states.push({ ...base, currentIndex: values.length - 1, phase: 'select-top', explanation: `Read ${values.at(-1)} from the top.` });
      const next = values.slice(0, -1);
      states.push({ ...base, values: next, size: next.length, top: next.length - 1, phase: 'popped', explanation: `Pop removes ${values.at(-1)}.`, counters: { pushes: 0, pops: 1, peeks: 0 } });
    } else {
      states.push({ ...base, currentIndex: values.length - 1, phase: 'peeked', explanation: `Peek returns ${values.at(-1)} without changing the stack.`, counters: { pushes: 0, pops: 0, peeks: 1 } });
    }
    return states.map(stateApi.snapshot);
  }
  function validateStudentAction(action, state) {
    const correct = String(action?.value) === String(state?.values?.at(-1));
    return { accepted: true, isCorrect: correct, misconceptionCode: correct ? null : 'ST02', message: correct ? 'Correct: the top leaves first.' : 'A stack follows LIFO; choose the top value.' };
  }
  return Object.freeze({ id: 'stacks', version: '1.0.0', validateInput, generateSteps, validateStudentAction });
}));
