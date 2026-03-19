(function attachPlayerClient(global) {
  'use strict';

  const SHAPES = ['&#9650;', '&#9670;', '&#9679;', '&#9632;'];
  const COLORS = ['var(--kahoot-red)', 'var(--kahoot-blue)', 'var(--kahoot-gold)', 'var(--kahoot-green)'];

  const state = {
    socket: null,
    pin: '',
    nickname: '',
    phase: 'join',
    timerInterval: null,
    questionDeadline: null,
    answered: false,
    score: 0
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

  function showJoinError(msg) {
    const el = byId('joinError');
    el.textContent = msg;
    el.style.display = 'block';
  }

  function hideJoinError() {
    byId('joinError').style.display = 'none';
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

  // ── Socket ──────────────────────────────────────────────

  function connectAndJoin() {
    hideJoinError();
    const pin = byId('pinInput').value.trim();
    const nickname = byId('nicknameInput').value.trim();
    if (!pin || pin.length < 4) return showJoinError('Please enter a valid game PIN.');
    if (!nickname || nickname.length < 1) return showJoinError('Please enter a nickname.');

    state.pin = pin;
    state.nickname = nickname;

    const userId = document.body.dataset.userId || undefined;
    const socket = io('/game', { transports: ['websocket', 'polling'] });
    state.socket = socket;

    socket.on('connect', () => {
      socket.emit('player:join', { pin, nickname, userId }, (res) => {
        if (res.error) {
          socket.disconnect();
          return showJoinError(res.error);
        }
        byId('waitingName').textContent = nickname;
        showScreen('waiting');
      });
    });

    socket.on('connect_error', () => {
      showJoinError('Unable to connect. Please try again.');
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
      const myResult = data.myResult;
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
        streakEl.textContent = myResult.streak > 1 ? `${myResult.streak} streak!` : '';
        rankEl.textContent = myResult.rank ? `Rank: ${myResult.rank}` : '';
        state.score += myResult.points;
      } else {
        box.className = 'player-result wrong';
        icon.innerHTML = '<span class="material-icons">cancel</span>';
        text.textContent = 'Wrong!';
        scoreEl.textContent = '+0';
        streakEl.textContent = '';
        rankEl.textContent = myResult.rank ? `Rank: ${myResult.rank}` : '';
      }
      showScreen('result');
    });

    socket.on('game:waitForNext', () => {
      byId('waitingMsg').textContent = 'Get ready for the next question...';
      showScreen('waiting');
    });

    socket.on('game:finished', (data) => {
      stopTimer();
      const myRank = data.myRank;
      const myScore = data.myScore;
      const icon = byId('playerFinalRank');
      const scoreEl = byId('playerFinalScore');

      if (myRank === 1) {
        icon.textContent = '🥇 1st Place!';
      } else if (myRank === 2) {
        icon.textContent = '🥈 2nd Place!';
      } else if (myRank === 3) {
        icon.textContent = '🥉 3rd Place!';
      } else {
        icon.textContent = `#${myRank || '?'}`;
      }
      scoreEl.textContent = `${(myScore || 0).toLocaleString()} points`;
      showScreen('final');
    });

    socket.on('game:kicked', () => {
      stopTimer();
      socket.disconnect();
      showScreen('kicked');
    });

    socket.on('game:cancelled', () => {
      stopTimer();
      socket.disconnect();
      byId('waitingMsg').textContent = 'The host ended the game.';
      showScreen('waiting');
    });

    socket.on('disconnect', () => {
      // Socket.IO auto-reconnects — if game was cancelled, we stay on that screen
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
        return;
      }
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
