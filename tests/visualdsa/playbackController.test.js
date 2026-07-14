const { createStateManager } = require('../../public/js/visualdsa/core/stateManager');
const { createPlaybackController, SPEED_DELAYS } = require('../../public/js/visualdsa/core/playbackController');

describe('VisualDSA playback controller', () => {
  test('plays deterministic steps and pauses at the final state', () => {
    const callbacks = [];
    const manager = createStateManager([{ id: 0 }, { id: 1 }, { id: 2 }]);
    const playback = createPlaybackController({
      stateManager: manager,
      schedule: (callback, delay) => {
        callbacks.push({ callback, delay });
        return callbacks.length;
      },
      cancel: jest.fn()
    });

    playback.play();
    expect(callbacks[0].delay).toBe(SPEED_DELAYS[1]);
    callbacks.shift().callback();
    expect(manager.getSnapshot().index).toBe(1);
    callbacks.shift().callback();
    expect(manager.getSnapshot().index).toBe(2);
    expect(playback.getStatus().playing).toBe(false);
  });

  test('supports pause, speed changes, and cleanup without advancing', () => {
    const schedule = jest.fn(() => 4);
    const cancel = jest.fn();
    const manager = createStateManager([{ id: 0 }, { id: 1 }]);
    const playback = createPlaybackController({ stateManager: manager, schedule, cancel });

    playback.setSpeed(2);
    playback.play();
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), SPEED_DELAYS[2]);
    playback.pause();
    expect(cancel).toHaveBeenCalledWith(4);
    playback.destroy();
    expect(manager.getSnapshot().index).toBe(0);
    expect(() => playback.setSpeed(3)).toThrow('Unsupported');
  });
});
