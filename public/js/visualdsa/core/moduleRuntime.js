(function exposeModuleRuntime(root, factory) {
  const api = factory(
    root?.VisualDsaStateManager,
    root?.VisualDsaPlaybackController
  );
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./stateManager'), require('./playbackController'));
  }
  if (root) root.VisualDsaModuleRuntime = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createRuntimeApi(stateApi, playbackApi) {
  'use strict';

  function validateAdapter(adapter) {
    ['createStates', 'renderState', 'describeState'].forEach((method) => {
      if (typeof adapter?.[method] !== 'function') {
        throw new TypeError(`VisualDSA adapter must implement ${method}().`);
      }
    });
  }

  function createModuleRuntime(options) {
    validateAdapter(options?.adapter);
    const states = options.adapter.createStates(options.input);
    const stateManager = stateApi.createStateManager(states);
    const renderContext = options.renderContext || {};

    function render(snapshot) {
      options.adapter.renderState(snapshot.state, { ...renderContext, snapshot });
      if (typeof options.onAnnouncement === 'function') {
        options.onAnnouncement(options.adapter.describeState(snapshot.state, snapshot));
      }
      return snapshot;
    }

    const unsubscribe = stateManager.subscribe(render);
    const playback = playbackApi.createPlaybackController({
      stateManager,
      schedule: options.schedule,
      cancel: options.cancel,
      onStatusChange: options.onPlaybackStatusChange
    });

    render(stateManager.getSnapshot());

    return Object.freeze({
      getState: stateManager.getSnapshot,
      next: () => stateManager.next(),
      previous: () => stateManager.previous(),
      reset: () => {
        playback.pause();
        return stateManager.reset();
      },
      restore: stateManager.restore,
      play: playback.play,
      pause: playback.pause,
      setSpeed: playback.setSpeed,
      replaceStates: (nextStates) => {
        playback.pause();
        return stateManager.replace(nextStates);
      },
      destroy: () => {
        playback.destroy();
        unsubscribe();
        if (typeof options.adapter.unmount === 'function') options.adapter.unmount(renderContext);
      }
    });
  }

  return Object.freeze({ createModuleRuntime, validateAdapter });
}));
