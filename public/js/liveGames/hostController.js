(function attachHostController(global) {
  'use strict';

  const SHAPES = ['&#9650;', '&#9670;', '&#9679;', '&#9632;'];

  const state = {
    socket: null,
    sessionId: '',
    pin: '',
    phase: 'preflight',
    questionCount: 0,
    currentQI: -1,
    timerInterval: null,
    timerSeconds: 0,
    paused: false,
    connecting: false,
    preflightLoaded: false,
    game: null,
    classes: [],
    selectedLinkedClassId: ''
  };

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function formatResponseTime(ms) {
    if (!Number.isFinite(ms) || ms === null) return 'N/A';
    return `${Math.round(ms)} ms`;
  }

  function getPlayerDisplayName(player) {
    return player?.displayName || player?.playerName || player?.name || 'Player';
  }

  function formatClassLabel(linkedClass) {
    if (!linkedClass || !linkedClass.classId) return 'None';
    const parts = [linkedClass.className || 'Untitled class'];
    if (linkedClass.classCode) parts.push(linkedClass.classCode);
    return parts.join(' / ');
  }

  function getSelectedClass() {
    return state.classes.find((item) => String(item._id || '') === String(state.selectedLinkedClassId || '')) || null;
  }

  function showScreen(name) {
    document.querySelectorAll('.host-screen').forEach((screen) => screen.classList.remove('active'));
    const el = byId('screen' + name.charAt(0).toUpperCase() + name.slice(1));
    if (el) el.classList.add('active');
    state.phase = name;
    updateControls();
  }

  function updateControls() {
    const controls = byId('hostControls');
    const showStart = state.phase === 'lobby';
    const showQuestionControls = state.phase === 'question';
    const showResults = state.phase === 'results';
    const showLeaderboard = state.phase === 'leaderboard';

    if (controls) {
      controls.style.display = ['preflight', 'podium', 'error'].includes(state.phase) ? 'none' : 'flex';
    }

    byId('hostStartBtn').style.display = showStart ? '' : 'none';
    byId('hostNextBtn').style.display = (showResults || showLeaderboard) && !showStart ? '' : 'none';
    byId('hostPauseBtn').style.display = showQuestionControls && !state.paused ? '' : 'none';
    byId('hostResumeBtn').style.display = showQuestionControls && state.paused ? '' : 'none';
    byId('hostSkipBtn').style.display = showQuestionControls && !state.paused ? '' : 'none';
    byId('hostShowLbBtn').style.display = showResults ? '' : 'none';
    byId('hostEndBtn').style.display = !['preflight', 'lobby', 'podium', 'error'].includes(state.phase) ? '' : 'none';

    if (showLeaderboard && state.currentQI >= state.questionCount - 1) {
      byId('hostNextBtn').style.display = 'none';
      byId('hostEndBtn').textContent = 'Show Final Results';
    } else {
      byId('hostEndBtn').textContent = 'End Game';
    }
  }

  function startTimer(seconds) {
    clearInterval(state.timerInterval);
    state.timerSeconds = seconds;
    byId('hostTimer').textContent = Math.max(0, seconds);
    state.timerInterval = setInterval(() => {
      state.timerSeconds -= 1;
      byId('hostTimer').textContent = Math.max(0, state.timerSeconds);
      if (state.timerSeconds <= 0) clearInterval(state.timerInterval);
    }, 1000);
  }

  function startTimerFromDeadline(deadline) {
    if (!deadline) {
      stopTimer();
      return;
    }
    const seconds = Math.max(0, Math.round((new Date(deadline) - Date.now()) / 1000));
    startTimer(seconds);
  }

  function stopTimer() {
    clearInterval(state.timerInterval);
  }

  function setPausedState(isPaused, remainingMs) {
    state.paused = isPaused;
    const pauseBanner = byId('hostPauseBanner');
    if (pauseBanner) pauseBanner.style.display = isPaused ? '' : 'none';
    if (isPaused && Number.isFinite(remainingMs)) {
      byId('hostTimer').textContent = Math.max(0, Math.ceil(remainingMs / 1000));
    }
    updateControls();
  }

  function renderQuestion(data) {
    state.currentQI = data.questionIndex;
    byId('hostQCounter').textContent = `Question ${data.questionIndex + 1} of ${data.totalQuestions}`;
    byId('hostQTitle').textContent = data.question.title;

    const grid = byId('hostOptionsGrid');
    if (data.question.type === 'type_answer') {
      grid.className = 'host-options-grid host-options-grid--text';
      grid.innerHTML = `
        <div class="host-text-answer-card">
          <div class="host-text-answer-title">Typed response question</div>
          <div class="host-text-answer-copy">Students submit a short answer. ClassRush checks it against the saved accepted answers.</div>
        </div>
      `;
      return;
    }

    grid.className = 'host-options-grid';
    grid.innerHTML = (data.question.options || []).map((option, index) => `
      <div class="host-option">
        <span class="option-shape">${SHAPES[index] || ''}</span>
        ${escapeHtml(option.text)}
      </div>
    `).join('');
  }

  function renderResults(data) {
    byId('hostResultsTitle').textContent = `Question ${data.questionIndex + 1} Results`;
    const chart = byId('hostResultsChart');
    const detail = byId('hostResultsDetail');

    if (data.questionType === 'type_answer') {
      chart.className = 'host-results-chart host-results-chart--stacked';
      chart.innerHTML = (data.submittedAnswers || []).length
        ? (data.submittedAnswers || []).map((item) => `
          <div class="host-text-result-row">
            <div class="host-text-result-main">
              <strong>${escapeHtml(item.submittedText)}</strong>
              <span>${item.count} response${item.count === 1 ? '' : 's'}</span>
            </div>
            <div class="host-text-result-side">${item.correctCount} accepted</div>
          </div>
        `).join('')
        : '<div class="host-results-empty">No typed answers were submitted.</div>';
      byId('hostResultsSummary').textContent = `${data.correctCount} correct - ${data.answerCount} answered - ${data.totalPlayers} players - Avg ${formatResponseTime(data.averageResponseTimeMs)}`;
      if (detail) {
        detail.innerHTML = `
          <div class="host-results-pill-group">
            ${(data.acceptedAnswers || []).map((answer) => `<span class="host-results-pill">${escapeHtml(answer)}</span>`).join('')}
          </div>
        `;
      }
      return;
    }

    chart.className = 'host-results-chart';
    const maxCount = Math.max(1, ...Object.values(data.distribution || {}));
    chart.innerHTML = (data.options || []).map((option) => {
      const count = data.distribution?.[option.id] || 0;
      const heightPct = (count / maxCount) * 100;
      return `
        <div class="host-bar-col">
          <div class="host-bar-count">${count}</div>
          <div class="host-bar" style="height:${Math.max(4, heightPct)}%"></div>
          <div class="host-bar-label">${escapeHtml(option.text)}${option.isCorrect ? ' (Correct)' : ''}</div>
        </div>`;
    }).join('');

    if (data.questionType === 'poll') {
      byId('hostResultsSummary').textContent = `${data.answerCount} answered - ${data.totalPlayers} players - Avg ${formatResponseTime(data.averageResponseTimeMs)}`;
      if (detail) detail.innerHTML = '<div class="host-results-detail-note">Poll questions are unscored. Use the distribution to guide the next discussion.</div>';
      return;
    }

    byId('hostResultsSummary').textContent = `${data.correctCount} correct - ${data.answerCount} answered - ${data.totalPlayers} players - Avg ${formatResponseTime(data.averageResponseTimeMs)}`;
    if (detail) detail.innerHTML = '';
  }

  function renderLeaderboard(data) {
    const list = byId('hostLeaderboardList');
    const resultsList = byId('hostResultsLeaderboard');
    const markup = (data.leaderboard || []).map((player, index) => `
      <li class="host-leaderboard-item" style="animation-delay:${index * 0.08}s">
        <span class="host-lb-rank">${index + 1}</span>
        <span class="host-lb-name">${escapeHtml(getPlayerDisplayName(player))}</span>
        <span class="host-lb-score">${Number(player.score || 0).toLocaleString()}</span>
      </li>
    `).join('');
    list.innerHTML = markup;
    if (resultsList) resultsList.innerHTML = markup;
  }

  function renderPodium(data) {
    const podium = byId('hostPodium');
    const spots = data.podium || [];
    const labels = ['first', 'second', 'third'];
    const order = [1, 0, 2];
    podium.innerHTML = order.map((idx) => {
      const player = spots[idx];
      if (!player) return '';
      return `
        <div class="host-podium-spot ${labels[idx]}">
          <div class="host-podium-rank">${idx + 1}</div>
          <div class="host-podium-name">${escapeHtml(getPlayerDisplayName(player))}</div>
          <div class="host-podium-score">${Number(player.score || 0).toLocaleString()} pts</div>
        </div>`;
    }).join('');

    const finalList = byId('hostFinalList');
    finalList.innerHTML = (data.leaderboard || []).map((player, index) => `
      <li class="host-leaderboard-item">
        <span class="host-lb-rank">${index + 1}</span>
        <span class="host-lb-name">${escapeHtml(getPlayerDisplayName(player))}</span>
        <span class="host-lb-score">${Number(player.score || 0).toLocaleString()}</span>
      </li>
    `).join('');
  }

  function setSessionMeta(linkedClass, requireLogin) {
    const meta = byId('hostLinkedClassMeta');
    if (!meta) return;
    if (linkedClass?.classId) {
      meta.textContent = `Academic session - ${formatClassLabel(linkedClass)}`;
      return;
    }
    meta.textContent = requireLogin
      ? 'Private live session - login required for all participants'
      : 'Open live session - PIN join available';
  }

  function restoreFromReconnectState(reconnectState) {
    if (!reconnectState) {
      setPausedState(false);
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
      if (reconnectState.question.paused) {
        stopTimer();
        setPausedState(true, reconnectState.question.pausedQuestionRemainingMs || 0);
      } else {
        setPausedState(false);
        startTimerFromDeadline(reconnectState.question.deadline);
      }
      showScreen('question');
      return;
    }

    if (reconnectState.results) {
      stopTimer();
      setPausedState(false);
      renderResults(reconnectState.results);
      if (reconnectState.leaderboard) renderLeaderboard(reconnectState.leaderboard);
      showScreen('results');
      return;
    }

    setPausedState(false);
    showScreen(reconnectState.hostView === 'podium' ? 'podium' : 'lobby');
  }

  function showHostError(msg) {
    const el = byId('hostErrorMsg');
    if (el) el.textContent = msg;
    document.querySelectorAll('.host-screen').forEach((screen) => screen.classList.remove('active'));
    const errorScreen = byId('screenError');
    if (errorScreen) errorScreen.classList.add('active');
    byId('hostControls').style.display = 'none';
    state.phase = 'error';
  }

  function updatePreflightHint() {
    const selectedClass = getSelectedClass();
    const hint = byId('hostLinkedClassHint');
    if (!hint) return;

    if (selectedClass) {
      hint.textContent = 'Linked academic sessions only allow logged-in students who are enrolled in this class.';
      return;
    }

    if (state.game?.settings?.requireLogin === true) {
      hint.textContent = 'This game stays unlinked, but the saved join setting still requires login for all participants.';
      return;
    }

    hint.textContent = 'Leave this unlinked to run an open live session.';
  }

  function populateLinkedClassSelect() {
    const select = byId('hostLinkedClassSelect');
    if (!select) return;

    select.innerHTML = ['<option value="">No linked class</option>']
      .concat(state.classes.map((classItem) => {
        const parts = [classItem.className || 'Untitled class'];
        if (classItem.courseCode) parts.push(classItem.courseCode);
        if (classItem.classCode) parts.push(classItem.classCode);
        return `<option value="${escapeHtml(String(classItem._id || ''))}">${escapeHtml(parts.join(' / '))}</option>`;
      }))
      .join('');

    const savedLinkedClassId = String(state.game?.linkedClass?.classId || '').trim();
    const savedClassIsActive = savedLinkedClassId && state.classes.some((item) => String(item._id || '') === savedLinkedClassId);
    state.selectedLinkedClassId = savedClassIsActive ? savedLinkedClassId : '';
    select.value = state.selectedLinkedClassId;

    const defaultClassEl = byId('hostPreflightDefaultClass');
    if (defaultClassEl) {
      defaultClassEl.textContent = savedClassIsActive
        ? formatClassLabel(state.game.linkedClass)
        : (state.game?.linkedClass?.classId ? `${formatClassLabel(state.game.linkedClass)} (unavailable)` : 'None');
    }

    updatePreflightHint();
  }

  async function loadPreflight() {
    const gameId = document.body.dataset.gameId;
    try {
      const [gameResponse, classesResponse] = await Promise.allSettled([
        fetch(`/api/live-games/${encodeURIComponent(gameId)}`, { credentials: 'include' }),
        fetch('/api/teacher/classes?status=active', { credentials: 'include' })
      ]);

      if (gameResponse.status !== 'fulfilled') {
        throw new Error('Failed to load game details.');
      }

      const gamePayload = await gameResponse.value.json();
      if (!gameResponse.value.ok || !gamePayload.success) {
        throw new Error(gamePayload.message || 'Failed to load game details.');
      }

      state.game = gamePayload.game;
      state.questionCount = Array.isArray(state.game.questions) ? state.game.questions.length : (state.game.questionCount || 0);
      byId('hostPreflightTitle').textContent = state.game.title || 'Untitled ClassRush';
      byId('hostPreflightQuestionCount').textContent = state.questionCount || 0;

      if (classesResponse.status === 'fulfilled') {
        const classesPayload = await classesResponse.value.json();
        if (classesResponse.value.ok && classesPayload.success) {
          state.classes = Array.isArray(classesPayload.classes) ? classesPayload.classes : [];
        } else {
          state.classes = [];
        }
      } else {
        state.classes = [];
      }

      populateLinkedClassSelect();
      state.preflightLoaded = true;
      showScreen('preflight');
    } catch (err) {
      showHostError(err.message || 'Failed to load host setup.');
    }
  }

  function connectSocket(linkedClassId) {
    if (state.connecting) return;
    state.connecting = true;
    const createBtn = byId('hostCreateSessionBtn');
    if (createBtn) {
      createBtn.disabled = true;
      createBtn.textContent = 'Creating...';
    }

    if (state.socket) {
      state.socket.disconnect();
      state.socket = null;
    }

    const socket = io('/game', { transports: ['websocket', 'polling'] });
    state.socket = socket;

    const connectTimeout = setTimeout(() => {
      showHostError('Connection timed out. The server may be restarting. Refresh the page and try again.');
      socket.disconnect();
    }, 10000);

    socket.on('connect', () => {
      const gameId = document.body.dataset.gameId;
      const userId = document.body.dataset.userId;
      const userName = document.body.dataset.userName;

      socket.emit('host:create', { gameId, userId, userName, linkedClassId }, (res) => {
        clearTimeout(connectTimeout);
        state.connecting = false;
        if (createBtn) {
          createBtn.disabled = false;
          createBtn.textContent = 'Create Session';
        }

        if (res.error) {
          showHostError(res.error);
          socket.disconnect();
          return;
        }

        state.sessionId = res.sessionId;
        state.pin = res.pin;
        state.questionCount = res.questionCount;
        setSessionMeta(res.linkedClass, res.requireLogin);

        const reportLink = byId('hostReportLink');
        if (reportLink && state.sessionId) {
          reportLink.href = `/teacher/live-games/${gameId}/reports/${state.sessionId}`;
        }

        const pinEl = byId('hostPin');
        if (pinEl) pinEl.textContent = res.pin;
        const copyBtn = byId('hostCopyPinBtn');
        if (copyBtn) copyBtn.style.visibility = '';

        const qrImg = byId('hostQrImg');
        if (qrImg) {
          qrImg.src = `/api/live-games/${gameId}/qr`;
          qrImg.style.display = '';
        }

        byId('hostPlayerCount').textContent = res.playerCount || res.players?.length || 0;
        const chips = byId('hostPlayerChips');
        chips.innerHTML = (res.players || []).map((player) => `
          <span class="host-player-chip">${escapeHtml(player.name)}</span>
        `).join('');
        byId('hostStartBtn').disabled = (res.playerCount || res.players?.length || 0) < 1;

        restoreFromReconnectState(res.reconnectState);
        if (!res.reconnectState) {
          showScreen('lobby');
        }
      });
    });

    socket.on('connect_error', () => {
      state.connecting = false;
      if (createBtn) {
        createBtn.disabled = false;
        createBtn.textContent = 'Create Session';
      }
      showHostError('Could not connect to the game server. Check your connection and refresh.');
    });

    socket.on('lobby:playerJoined', (data) => {
      byId('hostPlayerCount').textContent = data.playerCount;
      byId('hostPlayerChips').innerHTML = (data.players || []).map((player) => `
        <span class="host-player-chip">${escapeHtml(player.name)}</span>
      `).join('');
      byId('hostStartBtn').disabled = data.playerCount < 1;
    });

    socket.on('lobby:playerLeft', (data) => {
      byId('hostPlayerCount').textContent = data.playerCount;
      if (data.players) {
        byId('hostPlayerChips').innerHTML = data.players.map((player) => `
          <span class="host-player-chip">${escapeHtml(player.name)}</span>
        `).join('');
      }
      byId('hostStartBtn').disabled = data.playerCount < 1;
    });

    socket.on('game:question', (data) => {
      renderQuestion(data);
      byId('hostAnswerBar').textContent = '0 / 0 answered';
      setPausedState(false);
      startTimerFromDeadline(data.deadline);
      showScreen('question');
    });

    socket.on('game:paused', (data) => {
      stopTimer();
      setPausedState(true, data.pausedQuestionRemainingMs || 0);
      showScreen('question');
    });

    socket.on('game:resumed', (data) => {
      setPausedState(false);
      startTimerFromDeadline(data.deadline);
      showScreen('question');
    });

    socket.on('game:answerCount', (data) => {
      byId('hostAnswerBar').textContent = `${data.answerCount} / ${data.totalPlayers} answered`;
    });

    socket.on('game:questionResults', (data) => {
      stopTimer();
      setPausedState(false);
      renderResults(data);
      showScreen('results');
    });

    socket.on('game:leaderboard', (data) => {
      renderLeaderboard(data);
    });

    socket.on('game:finished', (data) => {
      stopTimer();
      setPausedState(false);
      renderPodium(data);
      showScreen('podium');
    });
  }

  function onCreateSession() {
    if (!state.preflightLoaded) return;
    connectSocket(state.selectedLinkedClassId || '');
  }

  function onStart() {
    state.socket.emit('host:start', {}, (res) => {
      if (res.error) return alert(res.error);
      state.socket.emit('host:nextQuestion', {}, (nextRes) => {
        if (nextRes.error) alert(nextRes.error);
      });
    });
  }

  function onNext() {
    state.socket.emit('host:nextQuestion', {}, (res) => {
      if (res.error) alert(res.error);
    });
  }

  function onPause() {
    state.socket.emit('host:pause', {}, (res) => {
      if (res.error) alert(res.error);
    });
  }

  function onResume() {
    state.socket.emit('host:resume', {}, (res) => {
      if (res.error) alert(res.error);
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
      state.socket.emit('host:end', {}, (res) => {
        if (res.error) alert(res.error);
      });
      return;
    }

    if (confirm('End the game early?')) {
      state.socket.emit('host:end', {}, (res) => {
        if (res.error) alert(res.error);
      });
    }
  }

  function onCopyPin() {
    if (!state.pin) return;
    navigator.clipboard.writeText(state.pin).then(() => {
      const btn = byId('hostCopyPinBtn');
      const icon = btn?.querySelector('.material-icons');
      if (!btn) return;
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
    byId('hostCreateSessionBtn')?.addEventListener('click', onCreateSession);
    byId('hostStartBtn')?.addEventListener('click', onStart);
    byId('hostNextBtn')?.addEventListener('click', onNext);
    byId('hostPauseBtn')?.addEventListener('click', onPause);
    byId('hostResumeBtn')?.addEventListener('click', onResume);
    byId('hostSkipBtn')?.addEventListener('click', onSkip);
    byId('hostShowLbBtn')?.addEventListener('click', onShowLeaderboard);
    byId('hostEndBtn')?.addEventListener('click', onEnd);
    byId('hostCopyPinBtn')?.addEventListener('click', onCopyPin);
    byId('hostReplayBtn')?.addEventListener('click', onReplay);
    byId('hostLinkedClassSelect')?.addEventListener('change', (event) => {
      state.selectedLinkedClassId = event.target.value || '';
      updatePreflightHint();
    });

    updateControls();
    loadPreflight();
  }

  global.hostController = { init };
})(window);
