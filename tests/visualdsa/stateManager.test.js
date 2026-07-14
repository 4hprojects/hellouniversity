const { createStateManager, snapshot } = require('../../public/js/visualdsa/core/stateManager');

describe('VisualDSA state manager', () => {
  test('stores immutable snapshots and restores the exact prior state', () => {
    const source = [
      { step: 0, values: [3, 1] },
      { step: 1, values: [1, 3] }
    ];
    const manager = createStateManager(source);

    source[0].values[0] = 99;
    expect(manager.getSnapshot().state.values).toEqual([3, 1]);
    expect(Object.isFrozen(manager.getSnapshot().state.values)).toBe(true);

    manager.next();
    expect(manager.getSnapshot().state).toEqual({ step: 1, values: [1, 3] });
    manager.previous();
    expect(manager.getSnapshot().state).toEqual({ step: 0, values: [3, 1] });
  });

  test('enforces history boundaries and supports reset, restore, and replacement', () => {
    const manager = createStateManager([{ id: 0 }, { id: 1 }, { id: 2 }]);

    manager.previous();
    expect(manager.getSnapshot().index).toBe(0);
    manager.restore(2);
    manager.next();
    expect(manager.getSnapshot().index).toBe(2);
    manager.reset();
    expect(manager.getSnapshot().index).toBe(0);
    manager.replace([{ id: 'new' }]);
    expect(manager.getSnapshot()).toEqual(expect.objectContaining({ index: 0, length: 1, canNext: false }));
  });

  test('rejects invalid histories and deeply freezes snapshots', () => {
    expect(() => createStateManager([])).toThrow('at least one state');
    expect(() => createStateManager([{ id: 1 }]).restore(0.5)).toThrow('integer');
    const value = snapshot({ nested: { items: [1] } });
    expect(Object.isFrozen(value.nested.items)).toBe(true);
  });
});
