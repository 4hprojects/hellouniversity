(function exposeStateManager(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VisualDsaStateManager = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createStateManagerApi() {
  'use strict';

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function snapshot(value) {
    return deepFreeze(clone(value));
  }

  function createStateManager(initialStates = []) {
    if (!Array.isArray(initialStates) || initialStates.length === 0) {
      throw new TypeError('VisualDSA state history requires at least one state.');
    }

    let states = initialStates.map(snapshot);
    let index = 0;
    const listeners = new Set();

    function current() {
      return states[index];
    }

    function details(reason) {
      return Object.freeze({
        state: current(),
        index,
        length: states.length,
        canPrevious: index > 0,
        canNext: index < states.length - 1,
        reason
      });
    }

    function notify(reason) {
      const value = details(reason);
      listeners.forEach((listener) => listener(value));
      return value;
    }

    function move(nextIndex, reason) {
      const boundedIndex = Math.max(0, Math.min(states.length - 1, nextIndex));
      if (boundedIndex === index) return details(reason);
      index = boundedIndex;
      return notify(reason);
    }

    return Object.freeze({
      getSnapshot: () => details('read'),
      next: () => move(index + 1, 'next'),
      previous: () => move(index - 1, 'previous'),
      reset: () => move(0, 'reset'),
      restore: (targetIndex) => {
        if (!Number.isInteger(targetIndex)) throw new TypeError('State index must be an integer.');
        return move(targetIndex, 'restore');
      },
      replace: (nextStates) => {
        if (!Array.isArray(nextStates) || nextStates.length === 0) {
          throw new TypeError('Replacement history requires at least one state.');
        }
        states = nextStates.map(snapshot);
        index = 0;
        return notify('replace');
      },
      subscribe: (listener) => {
        if (typeof listener !== 'function') throw new TypeError('State listener must be a function.');
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    });
  }

  return Object.freeze({ createStateManager, snapshot });
}));
