(function expose(root, factory) {
  const api = factory(root?.VisualDsaStateManager);
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../core/stateManager'));
  if (root) root.VisualDsaQueueModule = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function build(stateApi) {
  'use strict';
  function validateInput(input = {}) {
    const operation = String(input.operation || '').toLowerCase();
    const capacity = Number(input.capacity ?? 6);
    const values = Array.isArray(input.values) ? input.values.map(String) : String(input.values || '').split(',').map((v) => v.trim()).filter(Boolean);
    const front = values.length ? Number(input.front ?? 0) : -1;
    const errors = [];
    if (!['enqueue', 'dequeue', 'front'].includes(operation)) errors.push('Choose enqueue, dequeue, or front.');
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) errors.push('Capacity must be between 1 and 10.');
    if (values.length > capacity) errors.push('Queue size cannot exceed capacity.');
    if (values.some((v) => v.length > 12)) errors.push('Each value may contain at most 12 characters.');
    if (values.length && (!Number.isInteger(front) || front < 0 || front >= capacity)) errors.push('Front must be a valid capacity index.');
    if (operation === 'enqueue' && !String(input.newValue ?? '').trim()) errors.push('Enter a value to enqueue.');
    return { valid: !errors.length, errors, value: errors.length ? null : stateApi.snapshot({ operation, values, capacity, front, newValue: String(input.newValue ?? '').trim() }) };
  }
  function physicalSlots(values, front, capacity) {
    const slots = Array(capacity).fill(null);
    values.forEach((value, offset) => { slots[(front + offset) % capacity] = value; });
    return slots;
  }
  function generateSteps(input) {
    const checked = input?.valid ? input : validateInput(input);
    if (!checked.valid) throw new TypeError(checked.errors.join(' '));
    const { operation, values, capacity, front, newValue } = checked.value;
    const rear = values.length ? (front + values.length - 1) % capacity : -1;
    const base = { values: [...values], slots: physicalSlots(values, front, capacity), capacity, size: values.length, front, rear, counters: { enqueues: 0, dequeues: 0, frontReads: 0, wraparounds: 0 } };
    const states = [{ ...base, phase: 'ready', explanation: `Queue ready. Front is ${front}; rear is ${rear}.` }];
    if (operation === 'enqueue') {
      if (values.length === capacity) states.push({ ...base, phase: 'full', invalid: true, explanation: 'Enqueue rejected: the queue is full.' });
      else {
        const nextRear = values.length ? (rear + 1) % capacity : 0;
        const nextFront = values.length ? front : nextRear;
        const nextValues = [...values, newValue];
        states.push({ ...base, values: nextValues, slots: physicalSlots(nextValues, nextFront, capacity), size: nextValues.length, front: nextFront, rear: nextRear, currentIndex: nextRear, phase: 'enqueued', explanation: `Enqueue ${newValue} at rear index ${nextRear}. Front stays ${nextFront}.`, counters: { enqueues: 1, dequeues: 0, frontReads: 0, wraparounds: values.length && nextRear < rear ? 1 : 0 } });
      }
    } else if (!values.length) states.push({ ...base, phase: 'empty', invalid: true, explanation: `${operation === 'dequeue' ? 'Dequeue' : 'Front'} rejected: the queue is empty.` });
    else if (operation === 'dequeue') {
      const removed = values[0];
      const nextValues = values.slice(1);
      const nextFront = nextValues.length ? (front + 1) % capacity : -1;
      const nextRear = nextValues.length ? rear : -1;
      states.push({ ...base, currentIndex: front, phase: 'select-front', explanation: `Read ${removed} at front index ${front}.` });
      states.push({ ...base, values: nextValues, slots: physicalSlots(nextValues, nextFront, capacity), size: nextValues.length, front: nextFront, rear: nextRear, phase: 'dequeued', explanation: `Dequeue removes ${removed}. ${nextValues.length ? `Front moves to ${nextFront}; rear stays ${nextRear}.` : 'The queue is now empty and both pointers reset.'}`, counters: { enqueues: 0, dequeues: 1, frontReads: 1, wraparounds: nextValues.length && nextFront < front ? 1 : 0 } });
    } else states.push({ ...base, currentIndex: front, phase: 'front-read', explanation: `Front returns ${values[0]} without changing the queue.`, counters: { enqueues: 0, dequeues: 0, frontReads: 1, wraparounds: 0 } });
    return states.map(stateApi.snapshot);
  }
  function validateStudentAction(action, state) {
    const correct = String(action?.value) === String(state?.values?.[0]);
    return { accepted: true, isCorrect: correct, misconceptionCode: correct ? null : 'QU01', message: correct ? 'Correct: the front leaves first.' : 'A queue follows FIFO; choose the front value.' };
  }
  return Object.freeze({ id: 'queues', version: '1.0.0', validateInput, generateSteps, validateStudentAction });
}));
