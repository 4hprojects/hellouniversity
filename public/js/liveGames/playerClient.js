(function attachPlayerClient(global) {
  'use strict';

  const SHAPES = ['&#9650;', '&#9670;', '&#9679;', '&#9632;'];
  const COLORS = ['var(--kahoot-red)', 'var(--kahoot-blue)', 'var(--kahoot-gold)', 'var(--kahoot-green)'];
  const PLAYER_SESSION_KEY = 'classrush:player-session';
  const AUTH_REQUIRED_JOIN_ERRORS = new Set([
    'This game requires you to be logged in.',
    'This session is only for logged-in students in the linked class.'
  ]);

  const JOIN_ERRORS = {
    'Game not found. Check the PIN.': {
      icon: 'search',
      hint: 'Make sure the PIN matches the screen exactly.'
    },
    'This game is no longer accepting players.': {
      icon: 'block',
      hint: 'The game has started or has already ended.'
    },
    'This game requires you to be logged in.': {
      icon: 'lock',
      hint: 'Log in to your account, then try again.'
    },
    'This session is only for logged-in students in the linked class.': {
      icon: 'school',
      hint: 'Sign in with your student account, then rejoin from the ClassRush link.'
    },
    'You are not enrolled in the linked class for this session.': {
      icon: 'group_off',
      hint: 'Use the enrolled class account or ask the teacher to verify the roster.'
    },
    'Joining is locked for this session.': {
      icon: 'lock_clock',
      hint: 'The host already started the game and late joining is disabled.'
    },
    'Game is full.': {
      icon: 'group',
      hint: 'This game has reached its player limit.'
    },
    'Game already started.': {
      icon: 'timer_off',
      hint: 'Ask the host to start a new game.'
    },
    'Failed to join game.': {
      icon: 'warning',
      hint: 'Something went wrong on our end. Please try again.'
    }
  };

  const state = {
    socket: null,
    pin: '',
    nickname: '',
    phase: 'join',
    timerInterval: null,
    disconnTimer: null,
    questionDeadline: null,
    answered: false,
    paused: false,
    connecting: false,
    hasConnectedOnce: false,
    currentQuestionType: 'multiple_choice',
    lastAnswerResult: null,
    lastQuestionStanding: null,
    loginModalOpen: false,
    retryJoinAfterLogin: false,
    loginModalTrigger: null
  };

  function byId(id) { return document.getElementById(id); }

  function shouldPromptLoginForJoinError(message) {
    return AUTH_REQUIRED_JOIN_ERRORS.has(String(message || ''));
  }

  function buildPlayReturnToPath(pin) {
    const normalizedPin = String(pin || '').trim();
    return normalizedPin
      ? `/play?pin=${encodeURIComponent(normalizedPin)}`
      : '/play';
  }

  function buildLoginPromptCopy(message) {
    if (message === 'This session is only for logged-in students in the linked class.') {
      return {
        title: 'Log in with your student account',
        description: 'This ClassRush session is linked to a class. Sign in with the enrolled student account and we will retry your join automatically.'
      };
    }

    return {
      title: 'Log in to join ClassRush',
      description: 'This ClassRush session requires a logged-in account. Sign in, then continue joining with the same PIN and nickname.'
    };
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function showScreen(name) {
    document.querySelectorAll('.player-screen').forEach((screen) => screen.classList.remove('active'));
    const el = byId('screen' + name.charAt(0).toUpperCase() + name.slice(1));
    if (el) el.classList.add('active');
    state.phase = name;
  }

  function getLoggedInState() {
    return document.body?.dataset?.loggedIn === 'true';
  }

  function updateJoinLoginCta() {
    const openLoginBtn = byId('openLoginBtn');
    const joinLoginHint = byId('joinLoginHint');
    const isLoggedIn = getLoggedInState();

    if (openLoginBtn) {
      openLoginBtn.hidden = isLoggedIn;
    }

    if (joinLoginHint) {
      joinLoginHint.style.display = isLoggedIn ? 'none' : '';
    }
  }

  function updateFullLoginHref() {
    const fullLoginLink = byId('playerLoginFullLink');
    if (!fullLoginLink) return;
    fullLoginLink.href = `/login?returnTo=${encodeURIComponent(buildPlayReturnToPath(state.pin || byId('pinInput')?.value || ''))}`;
  }

  function setLoginModalError(message) {
    const errorEl = byId('playerLoginError');
    if (errorEl) {
      errorEl.textContent = message || '';
    }
  }

  function setLoginModalLoading(isLoading) {
    const submitBtn = byId('playerLoginSubmit');
    const identifierInput = byId('playerLoginIdentifier');
    const passwordInput = byId('playerLoginPassword');
    const toggleBtn = byId('playerLoginPasswordToggle');

    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? 'Logging in...' : 'Log in';
    }

    if (identifierInput) identifierInput.disabled = isLoading;
    if (passwordInput) passwordInput.disabled = isLoading;
    if (toggleBtn) toggleBtn.disabled = isLoading;
  }

  function getLoginModalFocusableElements() {
    const dialog = byId('playerLoginDialog');
    if (!dialog) return [];

    return Array.from(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.hasAttribute('disabled') && !element.hidden);
  }

  function handleLoginModalKeydown(event) {
    if (!state.loginModalOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeLoginModal();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = getLoginModalFocusableElements();
    if (!focusable.length) return;

    const currentIndex = focusable.indexOf(document.activeElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
      : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);

    event.preventDefault();
    focusable[nextIndex].focus();
  }

  function updateBodyAuthState(user) {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    document.body.dataset.loggedIn = user ? 'true' : 'false';
    document.body.dataset.userId = user?.userId || '';
    document.body.dataset.userName = fullName;
    document.body.dataset.studentId = user?.studentIDNumber || '';
    updateJoinLoginCta();
  }

  async function syncAuthState() {
    const response = await fetch('/api/check-auth', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.authenticated) {
      throw new Error(data.message || 'Unable to refresh login state.');
    }

    updateBodyAuthState(data.user || null);
    return data;
  }

  function openLoginModal(options = {}) {
    const overlay = byId('playerLoginOverlay');
    if (!overlay) return;

    const identifierInput = byId('playerLoginIdentifier');
    const passwordInput = byId('playerLoginPassword');
    const titleEl = byId('playerLoginTitle');
    const copyEl = byId('playerLoginCopy');
    const loginCopy = buildLoginPromptCopy(options.message);

    state.loginModalOpen = true;
    state.retryJoinAfterLogin = options.retryJoin === true;
    state.loginModalTrigger = options.triggerElement || document.activeElement || byId('joinBtn');

    if (titleEl) titleEl.textContent = loginCopy.title;
    if (copyEl) copyEl.textContent = loginCopy.description;
    if (identifierInput && !identifierInput.value && document.body?.dataset?.studentId) {
      identifierInput.value = document.body.dataset.studentId;
    }
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.setAttribute('type', 'password');
    }

    const passwordToggle = byId('playerLoginPasswordToggle');
    const passwordToggleIcon = passwordToggle?.querySelector('.material-icons');
    if (passwordToggle) passwordToggle.setAttribute('aria-label', 'Show password');
    if (passwordToggleIcon) passwordToggleIcon.textContent = 'visibility_off';

    setLoginModalError('');
    setLoginModalLoading(false);
    updateFullLoginHref();
    overlay.hidden = false;
    document.body.classList.add('player-modal-open');
    document.addEventListener('keydown', handleLoginModalKeydown);

    const focusTarget = identifierInput || byId('playerLoginDialog');
    if (focusTarget && typeof focusTarget.focus === 'function') {
      window.requestAnimationFrame(() => focusTarget.focus());
    }
  }

  function closeLoginModal(options = {}) {
    const overlay = byId('playerLoginOverlay');
    if (overlay) {
      overlay.hidden = true;
    }

    document.body.classList.remove('player-modal-open');
    document.removeEventListener('keydown', handleLoginModalKeydown);
    state.loginModalOpen = false;
    state.retryJoinAfterLogin = false;

    const trigger = state.loginModalTrigger;
    state.loginModalTrigger = null;
    if (options.restoreFocus === false) {
      return;
    }

    if (trigger && typeof trigger.focus === 'function') {
      trigger.focus();
    }
  }

  async function handleLoginModalSubmit(event) {
    event.preventDefault();

    if (!global.authClient || typeof global.authClient.login !== 'function') {
      setLoginModalError('Login tools are not available on this page. Use the full login page instead.');
      return;
    }

    const identifier = String(byId('playerLoginIdentifier')?.value || '').trim();
    const password = String(byId('playerLoginPassword')?.value || '');

    if (!identifier || !password) {
      setLoginModalError('Enter your Student ID, Employee ID, or email, and password.');
      return;
    }

    setLoginModalError('');
    setLoginModalLoading(true);

    try {
      const result = await global.authClient.login(identifier, password, {
        returnTo: buildPlayReturnToPath(state.pin || byId('pinInput')?.value || '')
      });

      if (!result.success) {
        if (result.statusCode === 401) {
          setLoginModalError('Invalid Student ID, Employee ID, email, or password. Please try again.');
        } else {
          setLoginModalError(result.message || 'Login failed. Please try again.');
        }
        return;
      }

      await syncAuthState();
      const shouldRetryJoin = state.retryJoinAfterLogin;
      closeLoginModal({ restoreFocus: false });

      if (shouldRetryJoin) {
        connectAndJoin();
        return;
      }

      showInGameToast('Logged in. You can join ClassRush now.');
      byId('nicknameInput')?.focus();
    } catch (_error) {
      setLoginModalError('Login succeeded, but the page could not refresh your session. Reload and try again.');
    } finally {
      setLoginModalLoading(false);
    }
  }

  function showJoinError(msg, opts) {
    const mapped = JOIN_ERRORS[msg] || {};
    const icon = opts?.icon || mapped.icon || 'error';
    const hint = opts?.hint || mapped.hint || '';
    const iconEl = byId('joinErrorIcon');
    const msgEl = byId('joinErrorMsg');
    const hintEl = byId('joinErrorHint');

    if (iconEl) iconEl.textContent = icon;
    if (msgEl) msgEl.textContent = msg;
    if (hintEl) {
      hintEl.textContent = hint;
      hintEl.style.display = hint ? '' : 'none';
    }

    const box = byId('joinError');
    if (box) {
      box.style.display = 'flex';
      box.classList.remove('player-error-shake');
      void box.offsetWidth;
      box.classList.add('player-error-shake');
    }
  }

  function hideJoinError() {
    const box = byId('joinError');
    if (box) box.style.display = 'none';
  }

  function showPausedBanner() {
    const banner = byId('playerPausedBanner');
    if (banner) banner.style.display = 'flex';
  }

  function hidePausedBanner() {
    const banner = byId('playerPausedBanner');
    if (banner) banner.style.display = 'none';
  }

  function restoreJoinBtn() {
    state.connecting = false;
    const btn = byId('joinBtn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Join Game';
    }
  }

  function persistPlayerSession() {
    try {
      localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify({
        pin: state.pin || '',
        nickname: state.nickname || ''
      }));
    } catch (_err) {}
  }

  function clearPlayerSession() {
    try {
      localStorage.removeItem(PLAYER_SESSION_KEY);
    } catch (_err) {}
  }

  function loadSavedPlayerSession() {
    try {
      const raw = localStorage.getItem(PLAYER_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        pin: typeof parsed?.pin === 'string' ? parsed.pin : '',
        nickname: typeof parsed?.nickname === 'string' ? parsed.nickname : ''
      };
    } catch (_err) {
      return null;
    }
  }

  function startTimer(deadline) {
    clearInterval(state.timerInterval);
    state.questionDeadline = new Date(deadline);
    const timerEl = byId('playerTimer');

    function tick() {
      const remaining = Math.max(0, Math.round((state.questionDeadline - Date.now()) / 1000));
      if (timerEl) timerEl.textContent = remaining;
      if (remaining <= 0) clearInterval(state.timerInterval);
    }

    tick();
    state.timerInterval = setInterval(tick, 1000);
  }

  function stopTimer() {
    clearInterval(state.timerInterval);
  }

  function updateAnswerInteractivity() {
    const shouldDisable = state.answered || state.paused;
    document.querySelectorAll('.player-answer-btn').forEach((button) => {
      button.classList.toggle('disabled', shouldDisable);
      button.disabled = shouldDisable;
    });

    const textInput = byId('playerTextAnswerInput');
    const submitBtn = byId('playerTextAnswerSubmit');
    if (textInput) textInput.disabled = shouldDisable;
    if (submitBtn) submitBtn.disabled = shouldDisable;
  }

  function renderOptionQuestion(data) {
    const grid = byId('playerAnswerGrid');
    grid.className = 'player-answer-grid';
    grid.innerHTML = (data.question.options || []).map((option, index) => `
      <button class="player-answer-btn" data-option-id="${escapeHtml(option.id)}" style="background:${COLORS[index] || COLORS[0]}">
        <span class="answer-shape">${SHAPES[index] || ''}</span>
        <span class="answer-text">${escapeHtml(option.text)}</span>
      </button>
    `).join('');
  }

  function renderTypeAnswerQuestion() {
    const grid = byId('playerAnswerGrid');
    grid.className = 'player-answer-grid player-answer-grid--text';
    grid.innerHTML = `
      <div class="player-text-answer-card">
        <label class="player-text-answer-label" for="playerTextAnswerInput">Type your answer</label>
        <input id="playerTextAnswerInput" class="player-text-answer-input" type="text" maxlength="200" autocomplete="off" placeholder="Enter your answer">
        <button id="playerTextAnswerSubmit" class="player-btn player-btn-primary player-text-answer-submit" type="button" data-action="submitTextAnswer">Submit Answer</button>
      </div>
    `;
  }

  function renderQuestion(data) {
    state.currentQuestionType = data.question.type || 'multiple_choice';
    byId('playerQCounter').textContent = `Question ${data.questionIndex + 1}`;
    byId('playerQTitle').textContent = data.question.title;

    if (state.currentQuestionType === 'type_answer') {
      renderTypeAnswerQuestion();
    } else {
      renderOptionQuestion(data);
    }

    updateAnswerInteractivity();
  }

  function renderQuestionStanding() {
    const rankEl = byId('playerResultRank');
    if (!rankEl) return;

    const standing = state.lastQuestionStanding;
    if (!standing || !standing.myRank) {
      rankEl.textContent = '';
      return;
    }

    const scoreText = typeof standing.myScore === 'number'
      ? ` - ${standing.myScore.toLocaleString()} pts`
      : '';
    rankEl.textContent = `Current Rank: #${standing.myRank}${scoreText}`;
  }

  function showInGameToast(msg) {
    let toast = byId('playerInGameToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'playerInGameToast';
      toast.className = 'player-ingame-toast';
      document.querySelector('.player-root').appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.remove('player-ingame-toast--visible');
    void toast.offsetWidth;
    toast.classList.add('player-ingame-toast--visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('player-ingame-toast--visible'), 3000);
  }

  function renderResultState(result) {
    const box = byId('playerResultBox');
    const icon = byId('playerResultIcon');
    const text = byId('playerResultText');
    const scoreEl = byId('playerResultScore');
    const streakEl = byId('playerResultStreak');
    const wasAnswered = result?.answered === true;

    if (result?.questionType === 'poll') {
      box.className = 'player-result neutral';
      icon.innerHTML = '<span class="material-icons">how_to_vote</span>';
      text.textContent = wasAnswered ? 'Response recorded!' : 'Question closed';
      scoreEl.textContent = '+0';
      streakEl.textContent = wasAnswered ? 'Your vote counted in the live results.' : 'You did not answer before the poll closed.';
      renderQuestionStanding();
      showScreen('result');
      return;
    }

    if (!wasAnswered || result?.correct === null) {
      box.className = 'player-result wrong';
      icon.innerHTML = '<span class="material-icons">cancel</span>';
      text.textContent = "Time's up!";
      scoreEl.textContent = '+0';
      streakEl.textContent = '';
      renderQuestionStanding();
      showScreen('result');
      return;
    }

    if (result.correct === true) {
      box.className = 'player-result correct';
      icon.innerHTML = '<span class="material-icons">check_circle</span>';
      text.textContent = 'Correct!';
      scoreEl.textContent = `+${Number(result.points || 0).toLocaleString()}`;
      streakEl.textContent = '';
      renderQuestionStanding();
      showScreen('result');
      return;
    }

    box.className = 'player-result wrong';
    icon.innerHTML = '<span class="material-icons">cancel</span>';
    text.textContent = 'Wrong!';
    scoreEl.textContent = '+0';
    streakEl.textContent = result?.questionType === 'type_answer' && result?.submittedText
      ? `Submitted: ${result.submittedText}`
      : '';
    renderQuestionStanding();
    showScreen('result');
  }

  function restoreReconnectState(reconnectState) {
    const disconnectBanner = byId('playerDisconnectBanner');
    const disconnectBannerMsg = byId('disconnBannerMsg');
    if (disconnectBanner) disconnectBanner.style.display = reconnectState?.hostDisconnected ? 'flex' : 'none';
    if (disconnectBannerMsg && reconnectState?.hostDisconnected) {
      disconnectBannerMsg.textContent = 'Host disconnected - waiting for them to reconnect...';
    }

    if (!reconnectState) {
      state.paused = false;
      hidePausedBanner();
      showScreen('waiting');
      return;
    }

    if ((reconnectState.phase === 'answer' || reconnectState.phase === 'submitted') && reconnectState.question) {
      state.currentQuestionType = reconnectState.question.question.type || 'multiple_choice';
      state.paused = reconnectState.question.paused === true;
      state.answered = reconnectState.phase === 'submitted';
      renderQuestion(reconnectState.question);
      if (state.paused) {
        stopTimer();
        showPausedBanner();
        if (Number.isFinite(reconnectState.question.pausedQuestionRemainingMs)) {
          byId('playerTimer').textContent = Math.max(0, Math.ceil(reconnectState.question.pausedQuestionRemainingMs / 1000));
        }
      } else {
        hidePausedBanner();
        startTimer(reconnectState.question.deadline);
      }
      showScreen(state.answered ? 'submitted' : 'answer');
      updateAnswerInteractivity();
      return;
    }

    if (reconnectState.phase === 'result' && reconnectState.result) {
      stopTimer();
      state.paused = false;
      hidePausedBanner();
      state.lastQuestionStanding = {
        myRank: reconnectState.result.myRank,
        myScore: reconnectState.result.myScore
      };
      renderResultState(reconnectState.result);
      return;
    }

    state.paused = false;
    hidePausedBanner();
    showScreen('waiting');
  }

  function connectAndJoin() {
    if (state.connecting) return;
    hideJoinError();
    updateFullLoginHref();
    state.loginModalTrigger = document.activeElement || byId('joinBtn');

    const pin = byId('pinInput').value.trim();
    const nickname = byId('nicknameInput').value.trim();
    if (!pin || pin.length < 6) {
      return showJoinError('Please enter a valid game PIN.', {
        icon: 'dialpad',
        hint: 'Ask the host for the 7-digit PIN shown on screen.'
      });
    }
    if (!nickname) {
      return showJoinError('Please enter a nickname.', {
        icon: 'badge',
        hint: 'Pick any name - this is how others will see you.'
      });
    }

    state.pin = pin;
    state.nickname = nickname;
    persistPlayerSession();
    state.connecting = true;
    state.hasConnectedOnce = false;

    const joinBtn = byId('joinBtn');
    if (joinBtn) {
      joinBtn.disabled = true;
      joinBtn.textContent = 'Connecting...';
    }

    const userId = document.body.dataset.userId || undefined;
    const studentIDNumber = document.body.dataset.studentId || undefined;
    if (state.socket) {
      state.socket.disconnect();
      state.socket = null;
    }

    const socket = io('/game', { transports: ['websocket', 'polling'] });
    state.socket = socket;

    socket.on('connect', () => {
      clearInterval(state.disconnTimer);
      const disconnectBanner = byId('playerDisconnectBanner');
      if (disconnectBanner) disconnectBanner.style.display = 'none';

      if (!state.hasConnectedOnce) {
        state.hasConnectedOnce = true;
        socket.emit('player:join', { pin, nickname, userId, studentIDNumber }, (res) => {
          restoreJoinBtn();
          if (res.error) {
            socket.disconnect();
            state.socket = null;
            state.hasConnectedOnce = false;
            if (shouldPromptLoginForJoinError(res.error)) {
              showJoinError(res.error);
              openLoginModal({
                message: res.error,
                retryJoin: true,
                triggerElement: state.loginModalTrigger || byId('joinBtn')
              });
              return;
            }
            return showJoinError(res.error);
          }
          byId('waitingName').textContent = nickname;
          restoreReconnectState(res.reconnectState);
        });
      }
    });

    socket.on('connect_error', () => {
      if (!state.hasConnectedOnce) {
        restoreJoinBtn();
        socket.disconnect();
        showJoinError('Could not reach the game server.', {
          icon: 'wifi_off',
          hint: 'Check your internet connection and try again.'
        });
      }
    });

    socket.on('game:question', (data) => {
      state.paused = false;
      state.answered = false;
      state.lastQuestionStanding = null;
      state.lastAnswerResult = null;
      hidePausedBanner();
      renderQuestion(data);
      startTimer(data.deadline);
      showScreen('answer');
    });

    socket.on('game:paused', (data) => {
      state.paused = true;
      stopTimer();
      showPausedBanner();
      if (Number.isFinite(data?.pausedQuestionRemainingMs)) {
        byId('playerTimer').textContent = Math.max(0, Math.ceil(data.pausedQuestionRemainingMs / 1000));
      }
      updateAnswerInteractivity();
    });

    socket.on('game:resumed', (data) => {
      state.paused = false;
      hidePausedBanner();
      updateAnswerInteractivity();
      if (data?.deadline) {
        startTimer(data.deadline);
      }
    });

    socket.on('game:questionResults', (data) => {
      stopTimer();
      state.paused = false;
      hidePausedBanner();
      const myResult = state.lastAnswerResult || {
        questionType: data.questionType,
        answered: false,
        correct: null,
        points: 0,
        submittedText: null
      };
      state.lastAnswerResult = null;
      renderResultState(myResult);
    });

    socket.on('game:waitForNext', () => {
      state.paused = false;
      hidePausedBanner();
      byId('waitingMsg').textContent = 'Get ready for the next question...';
      showScreen('waiting');
    });

    socket.on('game:finished', () => {
      stopTimer();
      state.paused = false;
      hidePausedBanner();
      showScreen('final');
    });

    socket.on('game:myResult', (data) => {
      const myRank = data.myRank;
      const myScore = data.myScore;
      const rankEl = byId('playerFinalRank');
      const scoreEl = byId('playerFinalScore');

      if (myRank === 1) {
        rankEl.textContent = '1st Place!';
      } else if (myRank === 2) {
        rankEl.textContent = '2nd Place!';
      } else if (myRank === 3) {
        rankEl.textContent = '3rd Place!';
      } else {
        rankEl.textContent = `#${myRank || '?'}`;
      }
      scoreEl.textContent = `${(myScore || 0).toLocaleString()} points`;
    });

    socket.on('game:myQuestionResult', (data) => {
      state.lastQuestionStanding = data || null;
      if (state.phase === 'result') {
        renderQuestionStanding();
      }
    });

    socket.on('game:kicked', () => {
      stopTimer();
      hidePausedBanner();
      clearPlayerSession();
      socket.disconnect();
      showScreen('kicked');
    });

    socket.on('game:cancelled', (data) => {
      stopTimer();
      hidePausedBanner();
      clearPlayerSession();
      socket.disconnect();
      const titleEl = byId('cancelledTitle');
      const subEl = byId('cancelledMsg');
      if (titleEl) titleEl.textContent = 'Game Ended';
      if (subEl) subEl.textContent = `${(data && data.reason) || 'The host ended the game.'} Thanks for playing!`;
      showScreen('cancelled');
    });

    socket.on('game:hostDisconnected', () => {
      const banner = byId('playerDisconnectBanner');
      const bannerMsg = byId('disconnBannerMsg');
      if (banner) banner.style.display = 'flex';
      if (bannerMsg) bannerMsg.textContent = 'Host disconnected - waiting for them to reconnect...';
    });

    socket.on('game:hostReconnected', () => {
      const banner = byId('playerDisconnectBanner');
      if (banner) banner.style.display = 'none';
    });

    socket.on('disconnect', () => {
      if (!state.hasConnectedOnce) return;
      const banner = byId('playerDisconnectBanner');
      const bannerMsg = byId('disconnBannerMsg');
      if (banner) banner.style.display = 'flex';
      clearInterval(state.disconnTimer);
      let seconds = 0;
      state.disconnTimer = setInterval(() => {
        seconds += 1;
        if (bannerMsg) bannerMsg.textContent = `Connection lost - reconnecting... (${seconds}s)`;
      }, 1000);
      if (bannerMsg) bannerMsg.textContent = 'Connection lost - reconnecting...';
    });
  }

  function submitAnswer(payload, onRollback) {
    if (!state.socket) return;
    updateAnswerInteractivity();
    state.socket.emit('player:answer', payload, (res) => {
      if (res.error) {
        state.answered = false;
        if (typeof onRollback === 'function') onRollback();
        updateAnswerInteractivity();
        if (res.error === 'Time is up.') {
          showInGameToast("Time's up - answer not counted.");
        } else if (res.error === 'Game is paused.') {
          showInGameToast('The teacher paused this question.');
        } else if (res.error === 'Invalid answer.') {
          showInGameToast('That answer is no longer valid.');
        } else {
          showInGameToast('Answer not submitted. Try again.');
        }
        return;
      }

      state.lastAnswerResult = {
        questionType: res.questionType || state.currentQuestionType,
        answered: true,
        correct: res.correct,
        points: res.points,
        submittedText: payload.answerText || null
      };
      showScreen('submitted');
    });
  }

  function onOptionAnswerClick(event) {
    const btn = event.target.closest('.player-answer-btn');
    if (!btn || state.answered || state.paused || state.currentQuestionType === 'type_answer') return;

    state.answered = true;
    const optionId = btn.dataset.optionId;
    document.querySelectorAll('.player-answer-btn').forEach((button) => button.classList.add('disabled'));
    updateAnswerInteractivity();
    btn.classList.add('selected');

    submitAnswer({ optionId }, () => {
      document.querySelectorAll('.player-answer-btn').forEach((button) => button.classList.remove('disabled', 'selected'));
    });
  }

  function onTextAnswerSubmit() {
    if (state.currentQuestionType !== 'type_answer' || state.answered || state.paused) return;
    const input = byId('playerTextAnswerInput');
    if (!input) return;
    const answerText = (input.value || '').trim();
    if (!answerText) {
      showInGameToast('Type an answer before submitting.');
      return;
    }

    state.answered = true;
    updateAnswerInteractivity();
    submitAnswer({ answerText }, () => {
      input.focus();
    });
  }

  function init() {
    const queryPin = document.body.dataset.pin;
    const saved = loadSavedPlayerSession();
    const restoredPin = queryPin || saved?.pin || '';
    if (restoredPin) byId('pinInput').value = restoredPin;

    const userName = document.body.dataset.userName;
    const restoredNickname = userName || saved?.nickname || '';
    if (restoredNickname) byId('nicknameInput').value = restoredNickname;

    updateJoinLoginCta();
    updateFullLoginHref();

    byId('joinBtn').addEventListener('click', connectAndJoin);
    byId('openLoginBtn')?.addEventListener('click', (event) => {
      openLoginModal({
        message: '',
        retryJoin: false,
        triggerElement: event.currentTarget
      });
    });
    byId('playerLoginClose')?.addEventListener('click', () => closeLoginModal());
    byId('playerLoginOverlay')?.addEventListener('click', (event) => {
      if (event.target === byId('playerLoginOverlay')) {
        closeLoginModal();
      }
    });
    byId('playerLoginForm')?.addEventListener('submit', handleLoginModalSubmit);
    byId('playerLoginPasswordToggle')?.addEventListener('click', () => {
      const passwordInput = byId('playerLoginPassword');
      const passwordIcon = byId('playerLoginPasswordToggle')?.querySelector('.material-icons');
      if (!passwordInput || !passwordIcon) return;

      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      passwordIcon.textContent = isPassword ? 'visibility' : 'visibility_off';
      byId('playerLoginPasswordToggle')?.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
    byId('nicknameInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') connectAndJoin();
    });
    byId('pinInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') byId('nicknameInput').focus();
    });

    byId('pinInput').addEventListener('input', () => {
      state.pin = byId('pinInput').value.trim();
      persistPlayerSession();
      updateFullLoginHref();
    });

    byId('nicknameInput').addEventListener('input', () => {
      state.nickname = byId('nicknameInput').value.trim();
      persistPlayerSession();
    });

    byId('playerAnswerGrid').addEventListener('click', (event) => {
      if (event.target.closest('[data-action="submitTextAnswer"]')) {
        onTextAnswerSubmit();
        return;
      }
      onOptionAnswerClick(event);
    });

    byId('playerAnswerGrid').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target?.id === 'playerTextAnswerInput') {
        event.preventDefault();
        onTextAnswerSubmit();
      }
    });

    if (saved?.pin && saved?.nickname) {
      connectAndJoin();
    }
  }

  const api = {
    init,
    __testables: {
      buildLoginPromptCopy,
      buildPlayReturnToPath,
      shouldPromptLoginForJoinError
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.playerClient = api;
})(typeof window !== 'undefined' ? window : globalThis);
