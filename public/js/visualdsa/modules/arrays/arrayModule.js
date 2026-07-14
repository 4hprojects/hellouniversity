(function exposeArrayModule(root, factory) {
  const api = factory(root?.VisualDsaStateManager);
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../core/stateManager'));
  if (root) root.VisualDsaArrayModule = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createArrayApi(stateApi) {
  'use strict';

  const LIMITS = Object.freeze({ minimumElements: 1, maximumElements: 12, minimumValue: -99, maximumValue: 999 });
  const OPERATIONS = new Set(['access', 'update', 'traverse', 'insert', 'delete']);

  function parseValues(value) {
    const source = Array.isArray(value) ? value : String(value || '').split(',');
    return source.map((item) => {
      if (typeof item !== 'number' && String(item).trim() === '') {
        throw new TypeError('Enter at least one whole number.');
      }
      const normalized = typeof item === 'number' ? item : Number(String(item).trim());
      if (!Number.isInteger(normalized)) throw new TypeError('Enter whole numbers separated by commas.');
      return normalized;
    });
  }

  function validateInput(input = {}) {
    const operation = String(input.operation || '').toLowerCase();
    const errors = [];
    let values = [];

    if (!OPERATIONS.has(operation)) errors.push('Choose a supported array operation.');
    try {
      values = parseValues(input.values);
    } catch (error) {
      errors.push(error.message);
    }
    if (values.length < LIMITS.minimumElements || values.length > LIMITS.maximumElements) {
      errors.push(`Use between ${LIMITS.minimumElements} and ${LIMITS.maximumElements} values.`);
    }
    if (values.some((value) => value < LIMITS.minimumValue || value > LIMITS.maximumValue)) {
      errors.push(`Values must be between ${LIMITS.minimumValue} and ${LIMITS.maximumValue}.`);
    }

    const size = values.length;
    const requestedCapacity = input.capacity === '' || input.capacity == null ? size : Number(input.capacity);
    const capacity = operation === 'insert' ? requestedCapacity : Math.max(size, requestedCapacity);
    const index = operation === 'traverse' ? null : Number(input.index);
    const newValue = ['update', 'insert'].includes(operation) ? Number(input.newValue) : null;

    if (operation !== 'traverse') {
      const maximumIndex = operation === 'insert' ? size : size - 1;
      if (!Number.isInteger(index) || index < 0 || index > maximumIndex) {
        errors.push(`Index must be between 0 and ${maximumIndex}.`);
      }
    }
    if (['update', 'insert'].includes(operation)
      && (!Number.isInteger(newValue) || newValue < LIMITS.minimumValue || newValue > LIMITS.maximumValue)) {
      errors.push(`The new value must be a whole number between ${LIMITS.minimumValue} and ${LIMITS.maximumValue}.`);
    }
    if (operation === 'insert') {
      if (!Number.isInteger(capacity) || capacity < size || capacity > LIMITS.maximumElements) {
        errors.push(`Capacity must be between ${size} and ${LIMITS.maximumElements}.`);
      } else if (size === capacity) {
        errors.push('The array is full. Increase capacity before inserting.');
      }
    }

    return Object.freeze({
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      value: errors.length ? null : stateApi.snapshot({ operation, values, size, capacity, index, newValue })
    });
  }

  function makeState(base, changes) {
    return {
      ...base,
      currentIndex: null,
      sourceIndex: null,
      destinationIndex: null,
      removedIndex: null,
      insertedIndex: null,
      activeLine: 0,
      counters: { reads: 0, writes: 0, shifts: 0, comparisons: 0 },
      ...changes
    };
  }

  function generateSteps(input) {
    const validation = input?.valid === true && input.value ? input : validateInput(input);
    if (!validation.valid) throw new TypeError(validation.errors.join(' '));
    const value = validation.value;
    const base = { operation: value.operation, capacity: value.capacity, size: value.size };
    const states = [makeState(base, {
      values: [...value.values],
      phase: 'ready',
      explanation: `Array ready with logical size ${value.size} and capacity ${value.capacity}.`
    })];

    if (value.operation === 'access') {
      states.push(makeState(base, {
        values: [...value.values], currentIndex: value.index, phase: 'access', activeLine: 1,
        explanation: `Read index ${value.index}. Its value is ${value.values[value.index]}.`,
        counters: { reads: 1, writes: 0, shifts: 0, comparisons: 0 }
      }));
    } else if (value.operation === 'update') {
      states.push(makeState(base, {
        values: [...value.values], currentIndex: value.index, phase: 'select', activeLine: 1,
        explanation: `Select index ${value.index}, currently storing ${value.values[value.index]}.`,
        counters: { reads: 1, writes: 0, shifts: 0, comparisons: 0 }
      }));
      const updated = [...value.values];
      updated[value.index] = value.newValue;
      states.push(makeState(base, {
        values: updated, currentIndex: value.index, phase: 'updated', activeLine: 2,
        explanation: `Replace the value at index ${value.index} with ${value.newValue}. The logical size stays ${value.size}.`,
        counters: { reads: 1, writes: 1, shifts: 0, comparisons: 0 }
      }));
    } else if (value.operation === 'traverse') {
      value.values.forEach((item, index) => {
        states.push(makeState(base, {
          values: [...value.values], currentIndex: index, phase: 'traverse', activeLine: 1,
          explanation: `Visit index ${index} and read ${item}.`,
          counters: { reads: index + 1, writes: 0, shifts: 0, comparisons: index + 1 }
        }));
      });
    } else if (value.operation === 'insert') {
      const working = [...value.values, ...Array(value.capacity - value.size).fill(null)];
      let shiftCount = 0;
      for (let source = value.size - 1; source >= value.index; source -= 1) {
        const destination = source + 1;
        working[destination] = working[source];
        shiftCount += 1;
        states.push(makeState(base, {
          values: [...working], sourceIndex: source, destinationIndex: destination, phase: 'shift-right', activeLine: 1,
          explanation: `Shift ${working[destination]} from index ${source} to ${destination}. Move right to left to avoid overwriting.`,
          counters: { reads: shiftCount, writes: shiftCount, shifts: shiftCount, comparisons: shiftCount }
        }));
      }
      working[value.index] = value.newValue;
      states.push(makeState({ ...base, size: value.size + 1 }, {
        values: [...working], currentIndex: value.index, insertedIndex: value.index, phase: 'inserted', activeLine: 2,
        explanation: `Insert ${value.newValue} at index ${value.index}. Logical size becomes ${value.size + 1}.`,
        counters: { reads: shiftCount, writes: shiftCount + 1, shifts: shiftCount, comparisons: shiftCount }
      }));
    } else if (value.operation === 'delete') {
      const working = [...value.values];
      const removedValue = working[value.index];
      states.push(makeState(base, {
        values: [...working], currentIndex: value.index, removedIndex: value.index, phase: 'remove', activeLine: 1,
        explanation: `Remove ${removedValue} from index ${value.index}, leaving a gap.`,
        counters: { reads: 1, writes: 0, shifts: 0, comparisons: 0 }
      }));
      let shiftCount = 0;
      for (let source = value.index + 1; source < value.size; source += 1) {
        const destination = source - 1;
        working[destination] = working[source];
        shiftCount += 1;
        states.push(makeState(base, {
          values: [...working], sourceIndex: source, destinationIndex: destination, phase: 'shift-left', activeLine: 2,
          explanation: `Shift ${working[destination]} from index ${source} to ${destination}. Move left to right to close the gap.`,
          counters: { reads: shiftCount + 1, writes: shiftCount, shifts: shiftCount, comparisons: shiftCount }
        }));
      }
      working.length = value.size - 1;
      states.push(makeState({ ...base, size: value.size - 1 }, {
        values: [...working], phase: 'deleted', activeLine: 3,
        explanation: `Deletion complete. Logical size becomes ${value.size - 1}.`,
        counters: { reads: shiftCount + 1, writes: shiftCount, shifts: shiftCount, comparisons: shiftCount }
      }));
    }

    return states.map(stateApi.snapshot);
  }

  function validateStudentAction(action, state) {
    if (!state || !['shift-right', 'shift-left'].includes(state.phase)) {
      return Object.freeze({ accepted: false, isCorrect: false, message: 'This step does not require a shift prediction.' });
    }
    const submittedIndex = Number(action?.sourceIndex);
    const isCorrect = submittedIndex === state.sourceIndex;
    return Object.freeze({
      accepted: true,
      isCorrect,
      message: isCorrect
        ? `Correct. Shift the value from index ${state.sourceIndex} next.`
        : `Not yet. ${state.phase === 'shift-right' ? 'Insertion shifts from right to left.' : 'Deletion shifts from left to right.'}`,
      misconceptionCode: isCorrect ? null : 'AR02'
    });
  }

  return Object.freeze({
    id: 'arrays', version: '1.0.0', LIMITS, validateInput, generateSteps, validateStudentAction
  });
}));
