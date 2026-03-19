(function attachHostController(global) {
  'use strict';

  const SHAPES = ['&#9650;', '&#9670;', '&#9679;', '&#9632;'];

  const state = {
    socket: null,
    sessionId: '',
    pin: '',
    phase: 'lobby', // lobby | question | waiting | results | leaderboard | podium
    questionCount: 0,
    currentQI: -1,
    timerInterval: null,
    timerSeconds: 0
  };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function showScreen(name) {
    document.querySelectorAll('.host-screen').forEach(s => s.classList.remove('active'));
    const el = byId('screen' + name.charAt(0).toUpperCase() + name.slice(1));
    if (el) el.classList.add('active');
    state.phase = name;
    updateControls();
  }

  function updateControls() {
    byId('hostStartBtn').style.display = state.phase === 'lobby' ? '' : 'none';
    byId('hostNextBtn').style.display = ['lobby', 'results', 'leaderboard'].includes(state.phase) && state.phase !== 'lobby' ? '' : 'none';
    byId('hostSkipBtn').style.display = state.phase === 'question' ? '' : 'none';
    byId('hostShowLbBtn').style.display = state.phase === 'results' ? '' : 'none';
    byId('hostEndBtn').style.display = state.phase !== 'lobby' && state.phase !== 'podium' ? '' : 'none';

    // Hide Next on leaderboard if it's the last question
    if (state.phase === 'leaderboard' && state.currentQI >= state.questionCount - 1) {
      byId('hostNextBtn').style.display = 'none';
      byId('hostEndBtn').textContent = 'Show Final Results';
    }
  }

  function startTimer(seconds) {
    clearInterval(state.timerInterval);
    state.timerSeconds = seconds;
    byId('hostTimer').textContent = seconds;
    state.timerInterval = setInterval(() => {
      state.timerSeconds--;
      byId('hostTimer').textContent = Math.max(0, state.timerSeconds);
      if (state.timerSeconds <= 0) clearInterval(state.timerInterval);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(state.timerInterval);
  }

  function renderQuestion(data) {
    state.currentQI = data.questionIndex;
    byId('hostQCounter').textContent = `Question ${data.questionIndex + 1} of ${data.totalQuestions}`;
    byId('hostQTitle').textContent = data.question.title;

    const grid = byId('hostOptionsGrid');
    grid.innerHTML = (data.question.options || []).map((opt, i) =>
      `<div class="host-option">
        <span class="option-shape">${SHAPES[i] || ''}</span>
        ${escapeHtml(opt.text)}
      </div>`
    ).join('');
  }

  function renderResults(data) {
    byId('hostResultsTitle').textContent = `Question ${data.questionIndex + 1} Results`;

    const chart = byId('hostResultsChart');
    const maxCount = Math.max(1, ...Object.values(data.distribution));
    chart.innerHTML = (data.options || []).map((opt) => {
      const count = data.distribution[opt.id] || 0;
      const heightPct = (count / maxCount) * 100;
      return `
        <div class="host-bar-col">
          <div class="host-bar-count">${count}</div>
          <div class="host-bar" style="height:${Math.max(4, heightPct)}%"></div>
          <div class="host-bar-label">${escapeHtml(opt.text)}${opt.isCorrect ? ' ✓' : ''}</div>
        </div>`;
    }).join('');

    byId('hostResultsSummary').textContent =
      `${data.correctCount} of ${data.totalPlayers} correct`;
  }

  function renderLeaderboard(data) {
    const list = byId('hostLeaderboardList');
    const resultsList = byId('hostResultsLeaderboard');
    const markup = (data.leaderboard || []).map((p, i) =>
      `<li class="host-leaderboard-item" style="animation-delay:${i * 0.08}s">
        <span class="host-lb-rank">${i + 1}</span>
        <span class="host-lb-name">${escapeHtml(p.odName)}</span>
        <span class="host-lb-score">${p.score.toLocaleString()}</span>
      </li>`
    ).join('');
    list.innerHTML = markup;
    if (resultsList) resultsList.innerHTML = markup;
  }

  function restoreFromReconnectState(reconnectState) {
    if (!reconnectState) {
      showScreen('lobby');
      return;
    }

    state.currentQI = reconnectState.currentQuestionIndex ?? -1;
    state.questionCount = reconnectState.questionCount || state.questionCount;

    if (reconnectState.hostView === 'question' && reconnectState.question) {
      renderQuestion(reconnectState.question);
      if (reconnectState.answerCount) {
        byId('hostAnswerBar').textContent = `${reconnectState.answerCount.answerCount} / ${reconnectState.answerCount.totalPlayers} answered`;
      }
      if (reconnectState.question.deadline) {
        const deadline = new Date(reconnectState.question.deadline);
        const seconds = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        startTimer(seconds);
      }
      showScreen('question');
      return;
    }

    if (reconnectState.results) {
      stopTimer();
      renderResults(reconnectState.results);
      if (reconnectState.leaderboard) renderLeaderboard(reconnectState.leaderboard);
      showScreen('results');
      return;
    }

    showScreen(reconnectState.hostView === 'podium' ? 'podium' : 'lobby');
  }

  function showHostError(msg) {
    const el = byId('hostErrorMsg');
    if (el) el.textContent = msg;
    document.querySelectorAll('.host-screen').forEach(s => s.classList.remove('active'));
    const errScreen = byId('screenError');
    if (errScreen) errScreen.classList.add('active');
    byId('hostControls').style.display = 'none';
  }

  // ── Socket setup ───────────────────────────────────────────

  function connectSocket() {
    const socket = io('/game', { transports: ['websocket', 'polling'] });
    state.socket = socket;

    // Timeout: if PIN never loads within 10s, show an actionable error
    const connectTimeout = setTimeout(() => {
      showHostError('Connection timed out. The server may be restarting — please refresh the page.');
      socket.disconnect();
    }, 10000);

    socket.on('connect', () => {
      const gameId = document.body.dataset.gameId;
      const userId = document.body.dataset.userId;
      const userName = document.body.dataset.userName;

      socket.emit('host:create', { gameId, userId, userName }, (res) => {
        clearTimeout(connectTimeout);
        if (res.error) {
          showHostError(res.error);
          socket.disconnect();
          return;
        }
        state.sessionId = res.sessionId;
        state.pin = res.pin;
        state.questionCount = res.questionCount;

        const pinEl = byId('hostPin');
        if (pinEl) pinEl.textContent = res.pin;
        const copyBtn = byId('hostCopyPinBtn');
        if (copyBtn) copyBtn.style.visibility = '';

        // Load QR code for the lobby
        const qrImg = byId('hostQrImg');
        if (qrImg) {
          const gameId = document.body.dataset.gameId;
          qrImg.src = `/api/live-games/${gameId}/qr`;
          qrImg.style.display = '';
        }

        // Handle reconnect — restore player chips from ack
        if (res.reconnected && res.players) {
          byId('hostPlayerCount').textContent = res.playerCount || res.players.length;
          const chips = byId('hostPlayerChips');
          chips.innerHTML = res.players.map(p =>
            `<span class="host-player-chip">${escapeHtml(p.name)}</span>`
          ).join('');
          byId('hostStartBtn').disabled = (res.playerCount || res.players.length) < 1;
        } else {
          byId('hostStartBtn').disabled = true;
        }

        restoreFromReconnectState(res.reconnectState);
      });
    });

    socket.on('connect_error', () => {
      showHostError('Could not connect to the game server. Check your connection and refresh.');
    });

    // ── Lobby events ──
    socket.on('lobby:playerJoined', (data) => {
      byId('hostPlayerCount').textContent = data.playerCount;
      const chips = byId('hostPlayerChips');
      chips.innerHTML = (data.players || []).map(p =>
        `<span class="host-player-chip">${escapeHtml(p.name)}</span>`
      ).join('');
      byId('hostStartBtn').disabled = data.playerCount < 1;
    });

    socket.on('lobby:playerLeft', (data) => {
      byId('hostPlayerCount').textContent = data.playerCount;
      if (data.players) {
        const chips = byId('hostPlayerChips');
        chips.innerHTML = data.players.map(p =>
          `<span class="host-player-chip">${escapeHtml(p.name)}</span>`
        ).join('');
      }
      byId('hostStartBtn').disabled = data.playerCount < 1;
    });

    socket.on('lobby:playerDisconnected', (data) => {
      // Could grey out chip — keeping simple for MVP
    });

    // ── Game events ──
    socket.on('game:question', (data) => {
      renderQuestion(data);
      byId('hostAnswerBar').textContent = '0 / 0 answered';

      const deadline = new Date(data.deadline);
      const seconds = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      startTimer(seconds);
      showScreen('question');
    });

    socket.on('game:answerCount', (data) => {
      byId('hostAnswerBar').textContent = `${data.answerCount} / ${data.totalPlayers} answered`;
    });

    socket.on('game:questionResults', (data) => {
      stopTimer();
      renderResults(data);
      showScreen('results');
    });

    socket.on('game:leaderboard', (data) => {
      renderLeaderboard(data);
      // Don't auto-show — host clicks "Show Leaderboard"
    });

    socket.on('game:finished', (data) => {
      stopTimer();
      const podium = byId('hostPodium');
      const spots = data.podium || [];
      const labels = ['first', 'second', 'third'];
      // Show 2nd, 1st, 3rd order visually
      const order = [1, 0, 2];
      podium.innerHTML = order.map(idx => {
        const p = spots[idx];
        if (!p) return '';
        return `
          <div class="host-podium-spot ${labels[idx]}">
            <div class="host-podium-rank">${idx + 1}</div>
            <div class="host-podium-name">${escapeHtml(p.odName)}</div>
            <div class="host-podium-score">${p.score.toLocaleString()} pts</div>
          </div>`;
      }).join('');

      const finalList = byId('hostFinalList');
      finalList.innerHTML = (data.leaderboard || []).map((p, i) =>
        `<li class="host-leaderboard-item">
          <span class="host-lb-rank">${i + 1}</span>
          <span class="host-lb-name">${escapeHtml(p.odName)}</span>
          <span class="host-lb-score">${p.score.toLocaleString()}</span>
        </li>`
      ).join('');

      showScreen('podium');
    });

    socket.on('game:hostDisconnected', () => {
      // We are the host — this shouldn't fire for us
    });

    socket.on('disconnect', () => {
      // Try to reconnect automatically — socket.io handles this
    });
  }

  // ── Button handlers ────────────────────────────────────────

  function onStart() {
    state.socket.emit('host:start', {}, (res) => {
      if (res.error) return alert(res.error);
      // After start, immediately send first question
      state.socket.emit('host:nextQuestion', {}, (r) => {
        if (r.error) alert(r.error);
      });
    });
  }

  function onNext() {
    state.socket.emit('host:nextQuestion', {}, (res) => {
      if (res.error) return alert(res.error);
    });
  }

  function onSkip() {
    stopTimer();
    state.socket.emit('host:endQuestion', {}, (res) => {
      if (res.error) alert(res.error);
    });
  }

  function onShowLeaderboard() {
    showScreen('leaderboard');
  }

  function onEnd() {
    if (state.phase === 'leaderboard' && state.currentQI >= state.questionCount - 1) {
      // Show final results
      state.socket.emit('host:end', {}, (res) => {
        if (res.error) alert(res.error);
      });
    } else if (confirm('End the game early?')) {
      state.socket.emit('host:end', {}, (res) => {
        if (res.error) alert(res.error);
      });
    }
  }

  function onCopyPin() {
    if (!state.pin) return;
    navigator.clipboard.writeText(state.pin).then(() => {
      const btn = byId('hostCopyPinBtn');
      if (!btn) return;
      const icon = btn.querySelector('.material-icons');
      if (icon) icon.textContent = 'check';
      btn.classList.add('host-copy-pin-btn--copied');
      setTimeout(() => {
        if (icon) icon.textContent = 'content_copy';
        btn.classList.remove('host-copy-pin-btn--copied');
      }, 2000);
    }).catch(() => {});
  }

  function onReplay() {
    const gameId = document.body.dataset.gameId;
    if (!gameId) return;
    window.location.href = `/teacher/live-games/${gameId}/host`;
  }

  function init() {
    byId('hostStartBtn')?.addEventListener('click', onStart);
    byId('hostNextBtn')?.addEventListener('click', onNext);
    byId('hostSkipBtn')?.addEventListener('click', onSkip);
    byId('hostShowLbBtn')?.addEventListener('click', onShowLeaderboard);
    byId('hostEndBtn')?.addEventListener('click', onEnd);
    byId('hostCopyPinBtn')?.addEventListener('click', onCopyPin);
    byId('hostReplayBtn')?.addEventListener('click', onReplay);

    connectSocket();
  }

  global.hostController = { init };
})(window);
