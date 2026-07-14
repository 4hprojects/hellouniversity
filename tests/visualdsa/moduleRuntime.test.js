const { createModuleRuntime, validateAdapter } = require('../../public/js/visualdsa/core/moduleRuntime');

describe('VisualDSA module runtime', () => {
  function createAdapter() {
    return {
      createStates: jest.fn(() => [{ step: 0 }, { step: 1 }]),
      renderState: jest.fn(),
      describeState: jest.fn((state) => `Step ${state.step}`),
      unmount: jest.fn()
    };
  }

  test('coordinates adapter rendering, history, announcements, and lifecycle cleanup', () => {
    const adapter = createAdapter();
    const announce = jest.fn();
    const runtime = createModuleRuntime({ adapter, input: { seed: 'demo' }, onAnnouncement: announce });

    expect(adapter.createStates).toHaveBeenCalledWith({ seed: 'demo' });
    expect(adapter.renderState).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('Step 0');

    runtime.next();
    expect(adapter.renderState).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith('Step 1');
    runtime.previous();
    expect(runtime.getState().index).toBe(0);

    runtime.destroy();
    expect(adapter.unmount).toHaveBeenCalledTimes(1);
  });

  test('rejects incomplete module adapters', () => {
    expect(() => validateAdapter({ createStates() {} })).toThrow('renderState');
  });
});
