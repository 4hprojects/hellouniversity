(function exposePlaybackController(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VisualDsaPlaybackController = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createPlaybackApi() {
  'use strict';

  const SPEED_DELAYS = Object.freeze({ 0.5: 1600, 1: 900, 2: 450 });

  function createPlaybackController(options) {
    const stateManager = options?.stateManager;
    const schedule = options?.schedule || setTimeout;
    const cancel = options?.cancel || clearTimeout;
    const onStatusChange = options?.onStatusChange || (() => {});
    if (!stateManager) throw new TypeError('Playback requires a state manager.');

    let timer = null;
    let playing = false;
    let speed = 1;

    function emit() {
      const value = Object.freeze({ playing, speed });
      onStatusChange(value);
      return value;
    }

    function clearTimer() {
      if (timer !== null) cancel(timer);
      timer = null;
    }

    function pause() {
      clearTimer();
      playing = false;
      return emit();
    }

    function tick() {
      if (!playing) return;
      const before = stateManager.getSnapshot();
      if (!before.canNext) {
        pause();
        return;
      }
      stateManager.next();
      if (stateManager.getSnapshot().canNext) {
        timer = schedule(tick, SPEED_DELAYS[speed]);
      } else {
        pause();
      }
    }

    return Object.freeze({
      play: () => {
        if (playing || !stateManager.getSnapshot().canNext) return emit();
        playing = true;
        emit();
        timer = schedule(tick, SPEED_DELAYS[speed]);
        return Object.freeze({ playing, speed });
      },
      pause,
      toggle: () => (playing ? pause() : this?.play?.()),
      setSpeed: (nextSpeed) => {
        const normalized = Number(nextSpeed);
        if (!Object.hasOwn(SPEED_DELAYS, normalized)) throw new RangeError('Unsupported playback speed.');
        speed = normalized;
        if (playing) {
          clearTimer();
          timer = schedule(tick, SPEED_DELAYS[speed]);
        }
        return emit();
      },
      getStatus: () => Object.freeze({ playing, speed }),
      destroy: pause
    });
  }

  return Object.freeze({ createPlaybackController, SPEED_DELAYS });
}));
