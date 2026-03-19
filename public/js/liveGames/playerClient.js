(function attachPlayerClient(global) {
  'use strict';

  const SHAPES = ['&#9650;', '&#9670;', '&#9679;', '&#9632;'];
  const COLORS = ['var(--kahoot-red)', 'var(--kahoot-blue)', 'var(--kahoot-gold)', 'var(--kahoot-green)'];

  const JOIN_ERRORS = {
    'Game not found. Check the PIN.':            { icon: 'search',    hint: 'Make sure the PIN matches the screen exactly.' },
    'This game is no longer accepting players.': { icon: 'block',     hint: 'The game has started or has already ended.' },
    'This game requires you to be logged in.':   { icon: 'lock',      hint: 'Log in to your account, then try again.' },
    'Game is full.':                             { icon: 'group',     hint: 'This game has reached its player limit.' },
    'Game already started.':                     { icon: 'timer_off', hint: 'Ask the host to start a new game.' },
    'Failed to join game.':                      { icon: 'warning',   hint: 'Something went wrong on our end. Please try again.' }
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
    score: 0,
    connecting: false,
    hasConnectedOnce: false,
    lastAnswerResult: null  // stored from player:answer ack for result screen
  };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function showScreen(name) {
    document.querySelectorAll('.player-screen').forEach(s => s.classList.remove('active'));
    const el = byId('screen' + name.charAt(0).toUpperCase() + name.slice(1));
    if (el) el.classList.add('active');
    state.phase = name;
  }

  function showJoinError(msg, opts) {
    const mapped = JOIN_ERRORS[msg] || {};
    const icon = (opts && opts.icon) || mapped.icon || 'error';
    const hint = (opts && opts.hint) || mapped.hint || '';
    const iconEl = byId('joinErrorIcon');
    const msgEl  = byId('joinErrorMsg');
    const hintEl = byId('joinErrorHint');
    if (iconEl) iconEl.textContent = icon;
    if (msgEl)  msgEl.textContent  = msg;
    if (hintEl) { hintEl.textContent = hint; hintEl.style.display = hint ? '' : 'none'; }
    const box = byId('joinError');
    if (box) {
      box.style.display = 'flex';
      box.classList.remove('player-error-shake');
      // Trigger reflow to restart animation
      void box.offsetWidth;
      box.classList.add('player-error-shake');
    }
  }

  function hideJoinError() {
    const box = byId('joinError');
    if (box) box.style.display = 'none';
  }

  function restoreJoinBtn() {
    state.connecting = false;
    const btn = byId('joinBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Join Game'; }
  }

  function startTimer(deadline) {
    clearInterval(state.timerInterval);
    state.questionDeadline = new Date(deadline);
    const timerEl = byId('playerTimer');

    function tick() {
      const remaining = Math.max(0, Math.round((state.questionDeadline - Date.now()) / 1000));
      timerEl.textContent = remaining;
      if (remaining <= 0) clearInterval(state.timerInterval);
    }
    tick();
    state.timerInterval = setInterval(tick, 1000);
  }

  function stopTimer() {
    clearInterval(state.timerInterval);
  }

  // Brief toast for in-game errors (answer rejected, etc.)
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
    void toast.offsetWidth; // reflow
    toast.classList.add('player-ingame-toast--visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('player-ingame-toast--visible'), 3000);
  }

  // ── Socket ──────────────────────────────────────────────

  function connectAndJoin() {
    if (state.connecting) return;
    hideJoinError();
    const pin = byId('pinInput').value.trim();
    const nickname = byId('nicknameInput').value.trim();
    if (!pin || pin.length < 6) return showJoinError('Please enter a valid game PIN.', { icon: 'dialpad', hint: 'Ask the host for the 7-digit PIN shown on screen.' });
    if (!nickname || nickname.length < 1) return showJoinError('Please enter a nickname.', { icon: 'badge', hint: 'Pick any name — this is how others will see you.' });

    state.pin = pin;
    state.nickname = nickname;
    state.connecting = true;
    state.hasConnectedOnce = false;
    const joinBtn = byId('joinBtn');
    if (joinBtn) { joinBtn.disabled = true; joinBtn.textContent = 'Connecting...'; }

    const userId = document.body.dataset.userId || undefined;
    if (state.socket) { state.socket.disconnect(); state.socket = null; }
    const socket = io('/game', { transports: ['websocket', 'polling'] });
    state.socket = socket;

    socket.on('connect', () => {
      clearInterval(state.disconnTimer);
      const disconnBanner = byId('playerDisconnectBanner');
      if (disconnBanner) disconnBanner.style.display = 'none';

      if (!state.hasConnectedOnce) {
        state.hasConnectedOnce = true;
        socket.emit('player:join', { pin, nickname, userId }, (res) => {
          restoreJoinBtn();
          if (res.error) {
            socket.disconnect();
            state.hasConnectedOnce = false;
            return showJoinError(res.error);
          }
          byId('waitingName').textContent = nickname;
          showScreen('waiting');
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

    // ── Game events ──

    socket.on('game:question', (data) => {
      state.answered = false;
      byId('playerQCounter').textContent = `Question ${data.questionIndex + 1}`;
      byId('playerQTitle').textContent = data.question.title;

      const grid = byId('playerAnswerGrid');
      grid.innerHTML = (data.question.options || []).map((opt, i) =>
        `<button class="player-answer-btn" data-option-id="${escapeHtml(opt.id)}" style="background:${COLORS[i] || COLORS[0]}">
          <span class="answer-shape">${SHAPES[i] || ''}</span>
          <span class="answer-text">${escapeHtml(opt.text)}</span>
        </button>`
      ).join('');

      startTimer(data.deadline);
      showScreen('answer');
    });

    socket.on('game:questionResults', (data) => {
      stopTimer();
      // myResult comes from the player:answer ack (stored in state), not from the broadcast
      const myResult = state.lastAnswerResult;
      state.lastAnswerResult = null;
      const box = byId('playerResultBox');
      const icon = byId('playerResultIcon');
      const text = byId('playerResultText');
      const scoreEl = byId('playerResultScore');
      const streakEl = byId('playerResultStreak');
      const rankEl = byId('playerResultRank');

      if (!myResult || !state.answered) {
        box.className = 'player-result wrong';
        icon.innerHTML = '<span class="material-icons">cancel</span>';
        text.textContent = "Time's up!";
        scoreEl.textContent = '+0';
        streakEl.textContent = '';
        rankEl.textContent = '';
      } else if (myResult.correct) {
        box.className = 'player-result correct';
        icon.innerHTML = '<span class="material-icons">check_circle</span>';
        text.textContent = 'Correct!';
        scoreEl.textContent = '+' + myResult.points.toLocaleString();
        streakEl.textContent = '';
        rankEl.textContent = '';
      } else {
        box.className = 'player-result wrong';
        icon.innerHTML = '<span class="material-icons">cancel</span>';
        text.textContent = 'Wrong!';
        scoreEl.textContent = '+0';
        streakEl.textContent = '';
        rankEl.textContent = '';
      }
      showScreen('result');
    });

    socket.on('game:waitForNext', () => {
      byId('waitingMsg').textContent = 'Get ready for the next question...';
      showScreen('waiting');
    });

    socket.on('game:finished', (data) => {
      stopTimer();
      // myRank/myScore come from separate game:myResult event (stored in state)
      showScreen('final');
    });

    socket.on('game:myResult', (data) => {
      const myRank = data.myRank;
      const myScore = data.myScore;
      const rankEl = byId('playerFinalRank');
      const scoreEl = byId('playerFinalScore');

      if (myRank === 1) {
        rankEl.textContent = '\uD83E\uDD47 1st Place!';
      } else if (myRank === 2) {
        rankEl.textContent = '\uD83E\uDD48 2nd Place!';
      } else if (myRank === 3) {
        rankEl.textContent = '\uD83E\uDD49 3rd Place!';
      } else {
        rankEl.textContent = `#${myRank || '?'}`;
      }
      scoreEl.textContent = `${(myScore || 0).toLocaleString()} points`;
    });

    socket.on('game:kicked', () => {
      stopTimer();
      socket.disconnect();
      showScreen('kicked');
    });

    socket.on('game:cancelled', (data) => {
      stopTimer();
      socket.disconnect();
      const titleEl = byId('cancelledTitle');
      const subEl   = byId('cancelledMsg');
      if (titleEl) titleEl.textContent = 'Game Ended';
      const reason = (data && data.reason) || 'The host ended the game.';
      if (subEl)   subEl.textContent   = reason + ' Thanks for playing!';
      showScreen('cancelled');
    });

    socket.on('game:hostDisconnected', () => {
      const banner    = byId('playerDisconnectBanner');
      const bannerMsg = byId('disconnBannerMsg');
      if (banner) banner.style.display = 'flex';
      if (bannerMsg) bannerMsg.textContent = 'Host disconnected — waiting for them to reconnect...';
    });
    socket.on('game:hostReconnected', () => {
      const banner = byId('playerDisconnectBanner');
      if (banner) banner.style.display = 'none';
    });
    socket.on('disconnect', () => {
      if (!state.hasConnectedOnce) return;
      const banner    = byId('playerDisconnectBanner');
      const bannerMsg = byId('disconnBannerMsg');
      if (banner) banner.style.display = 'flex';
      clearInterval(state.disconnTimer);
      let secs = 0;
      state.disconnTimer = setInterval(() => {
        secs++;
        if (bannerMsg) bannerMsg.textContent = `Connection lost — reconnecting... (${secs}s)`;
      }, 1000);
      if (bannerMsg) bannerMsg.textContent = 'Connection lost — reconnecting...';
    });
  }

  function onAnswerClick(e) {
    const btn = e.target.closest('.player-answer-btn');
    if (!btn || state.answered) return;

    state.answered = true;
    const optionId = btn.dataset.optionId;

    // Highlight selected
    document.querySelectorAll('.player-answer-btn').forEach(b => b.classList.add('disabled'));
    btn.classList.add('selected');

    state.socket.emit('player:answer', { optionId }, (res) => {
      if (res.error) {
        state.answered = false;
        document.querySelectorAll('.player-answer-btn').forEach(b => b.classList.remove('disabled'));
        btn.classList.remove('selected');
        // Show brief in-game toast so the player knows the submit failed
        showInGameToast(res.error === 'Time is up.' ? "Time's up — answer not counted." : 'Answer not submitted. Try again.');
        return;
      }
      // Store result from ack; used in game:questionResults to show correct/wrong screen
      state.lastAnswerResult = { correct: res.correct, points: res.points };
      showScreen('submitted');
    });
  }

  function init() {
    // Prefill PIN from query parameter
    const pin = document.body.dataset.pin;
    if (pin) byId('pinInput').value = pin;

    // Prefill nickname if logged in
    const userName = document.body.dataset.userName;
    if (userName) byId('nicknameInput').value = userName;

    byId('joinBtn').addEventListener('click', connectAndJoin);

    // Allow Enter key to join
    byId('nicknameInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') connectAndJoin();
    });
    byId('pinInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') byId('nicknameInput').focus();
    });

    // Delegate answer clicks
    byId('playerAnswerGrid').addEventListener('click', onAnswerClick);
  }

  global.playerClient = { init };
})(window);
