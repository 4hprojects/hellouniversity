(function () {
  const form = document.querySelector('[data-dsa-quick-check]');
  if (!form) return;

  const lessonSlug = form.dataset.lessonSlug;
  const list = form.querySelector('[data-dsa-quick-check-list]');
  const status = form.querySelector('[data-dsa-quick-check-status]');
  const submitButton = form.querySelector('button[type="submit"]');
  const blockedTextCopyEvents = ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'];
  const state = {
    questions: [],
    answers: {},
    currentIndex: 0,
    reviewMode: false,
    assignment: null,
    activeAttempt: null,
    summary: null,
    history: [],
    questionBank: { requiredQuestionCount: 5, activeQuestionCount: 0 },
    attemptPolicy: {
      maxAttempts: 3,
      remainingAttempts: 3,
      cooldownSeconds: 300,
      cooldownUntil: null,
      canStart: true,
      startBlockedReason: null
    },
    integrity: {
      watermarkText: ''
    },
    integrityQueue: [],
    flushTimerId: null,
    windowInactive: document.hidden,
    serverOffsetMs: 0,
    timerId: null
  };

  blockedTextCopyEvents.forEach((eventName) => {
    form.addEventListener(eventName, (event) => {
      event.preventDefault();
      logIntegrityEvent(`${eventName.replace('contextmenu', 'context_menu').replace('selectstart', 'select_start').replace('dragstart', 'drag_start')}_blocked`, eventName);
    });
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) return 'Not submitted yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not submitted yet';
    return date.toLocaleString();
  }

  function setStatus(message, tone) {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone || 'neutral';
  }

  function setBusy(isBusy) {
    if (submitButton) submitButton.disabled = isBusy || !isComplete();
    form.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function setSubmitVisible(isVisible) {
    if (!submitButton) return;
    submitButton.hidden = !isVisible;
    submitButton.disabled = !isVisible || !isComplete();
  }

  function integrityEventPayload(eventType, eventLabel, metadata) {
    return {
      eventType,
      eventLabel: eventLabel || eventType,
      clientTime: new Date().toISOString(),
      metadata: metadata || {}
    };
  }

  function logIntegrityEvent(eventType, eventLabel, metadata) {
    if (!state.assignment?.attemptId || !lessonSlug) return;
    state.integrityQueue.push(integrityEventPayload(eventType, eventLabel, metadata));
    if (state.integrityQueue.length >= 3) {
      flushIntegrityEvents();
      return;
    }
    if (!state.flushTimerId) {
      state.flushTimerId = setTimeout(flushIntegrityEvents, 2000);
    }
  }

  async function flushIntegrityEvents() {
    if (state.flushTimerId) {
      clearTimeout(state.flushTimerId);
      state.flushTimerId = null;
    }
    if (!state.integrityQueue.length || !lessonSlug || !state.assignment?.attemptId) return;
    const events = state.integrityQueue.splice(0, state.integrityQueue.length);
    try {
      const response = await fetch(`/api/dsa/lessons/${encodeURIComponent(lessonSlug)}/quick-check/integrity-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ events })
      });
      if (!response.ok) {
        state.integrityQueue.unshift(...events.slice(-10));
      }
    } catch (_error) {
      state.integrityQueue.unshift(...events.slice(-10));
    }
  }

  function getQuestionId(question) {
    return question?.questionId || question?.id || '';
  }

  function isComplete() {
    return state.questions.length > 0 && state.questions.every((question) => state.answers[getQuestionId(question)]);
  }

  function answeredCount() {
    return state.questions.filter((question) => state.answers[getQuestionId(question)]).length;
  }

  function estimatedNow() {
    return new Date(Date.now() + state.serverOffsetMs);
  }

  function formatRemaining(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  function timerMarkup() {
    const expiresAt = state.assignment?.expiresAt ? new Date(state.assignment.expiresAt) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
      return '<span class="dsa-quick-check-timer" data-dsa-quick-check-timer aria-live="polite" aria-label="Time remaining">5:00</span>';
    }
    const remainingMs = expiresAt.getTime() - estimatedNow().getTime();
    return `<span class="dsa-quick-check-timer${remainingMs <= 0 ? ' is-expired' : ''}" data-dsa-quick-check-timer aria-live="polite" aria-label="Time remaining">${formatRemaining(remainingMs)}</span>`;
  }

  function updateTimer() {
    const timer = form.querySelector('[data-dsa-quick-check-timer]');
    if (!timer || !state.assignment?.expiresAt) return;
    const remainingMs = new Date(state.assignment.expiresAt).getTime() - estimatedNow().getTime();
    timer.textContent = formatRemaining(remainingMs);
    timer.classList.toggle('is-expired', remainingMs <= 0);
    if (remainingMs <= 0 && state.assignment.status !== 'submitted') {
      setStatus('Time is up. You can still submit your current answers.', 'warning');
    }
  }

  function startTimer() {
    if (state.timerId) clearInterval(state.timerId);
    updateTimer();
    state.timerId = setInterval(updateTimer, 1000);
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function currentWatermarkText() {
    const baseText = state.integrity?.watermarkText || 'HelloUniversity Quick Check';
    const attempt = state.assignment?.attemptNumber ? `Attempt ${state.assignment.attemptNumber}` : '';
    return [baseText, attempt, formatDate(estimatedNow())].filter(Boolean).join(' · ');
  }

  function watermarkMarkup() {
    const text = currentWatermarkText();
    return `
      <div class="dsa-quick-check-watermark" aria-hidden="true">
        ${Array.from({ length: 12 }, () => `<span>${escapeHtml(text)}</span>`).join('')}
      </div>
    `;
  }

  function syncInactiveState() {
    const shouldHide = state.questions.length > 0 && state.windowInactive;
    form.classList.toggle('is-window-inactive', shouldHide);
    if (shouldHide) {
      setStatus('Quick Check hidden while this window is inactive. Return here to continue.', 'warning');
    }
  }

  function scoreLine(attempt) {
    if (!attempt) return 'No score yet';
    return `${Number(attempt.score || 0)} of ${Number(attempt.totalQuestions || 5)} (${Number(attempt.scorePercent || 0)}%)`;
  }

  function startBlockedMessage(reason) {
    if (reason === 'max_attempts_reached') return 'Maximum attempts reached for this lesson.';
    if (reason === 'cooldown_active') return 'Cooldown active before your next attempt.';
    if (reason === 'question_bank_unavailable') return 'This Quick Check is not available yet.';
    return 'Start is unavailable right now.';
  }

  function renderHistory() {
    const attempts = Array.isArray(state.history) ? state.history : [];
    if (!attempts.length) {
      return '<p class="dsa-quick-check-copy">No submitted attempts yet.</p>';
    }
    return `
      <div class="dsa-quick-check-history" aria-label="Submitted Quick Check attempts">
        ${attempts.map((attempt) => `
          <div class="dsa-quick-check-history-row">
            <strong>Attempt ${escapeHtml(String(attempt.attemptNumber || 1))}</strong>
            <span>${escapeHtml(scoreLine(attempt))}</span>
            <span>${escapeHtml(formatDate(attempt.submittedAt || attempt.updatedAt))}${attempt.submittedAfterTimeLimit ? ' · after time limit' : ''}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderStatusPanel() {
    stopTimer();
    state.questions = [];
    state.answers = {};
    state.assignment = null;
    setSubmitVisible(false);
    syncInactiveState();

    const latest = state.summary?.latest || null;
    const best = state.summary?.best || null;
    const attemptCount = Number(state.summary?.attemptCount || 0);
    const hasActiveAttempt = Boolean(state.activeAttempt);
    const requiredCount = Number(state.questionBank?.requiredQuestionCount || 5);
    const activeCount = Number(state.questionBank?.activeQuestionCount || 0);
    const policy = state.attemptPolicy || {};
    const canStart = hasActiveAttempt || (policy.canStart !== false && activeCount >= requiredCount);
    const actionLabel = hasActiveAttempt ? `Continue Attempt ${state.activeAttempt.attemptNumber || ''}`.trim() : (attemptCount ? 'Start New Attempt' : 'Start Quick Check');
    const subcopy = !canStart
      ? policy.startBlockedReason === 'question_bank_unavailable'
        ? `This Quick Check is not available yet. The bank has ${activeCount} active questions and needs ${requiredCount}.`
        : startBlockedMessage(policy.startBlockedReason)
      : hasActiveAttempt
      ? 'You have an unfinished Quick Check. Continue to use the same questions and timer.'
      : 'Start when you are ready. You will get 5 random questions and a 5-minute soft timer.';
    const cooldownUntil = policy.cooldownUntil ? new Date(policy.cooldownUntil) : null;
    const cooldownText = cooldownUntil && cooldownUntil.getTime() > Date.now()
      ? `Cooldown until ${formatDate(cooldownUntil)}`
      : 'No cooldown active';

    if (list) {
      list.innerHTML = `
        <div class="dsa-quick-check-summary">
          <div>
            <h3>${attemptCount ? 'Your Quick Check Results' : 'Ready for a Quick Check?'}</h3>
            <p class="dsa-quick-check-copy">${escapeHtml(subcopy)}</p>
          </div>
          ${attemptCount ? `
            <div class="dsa-quick-check-score-grid">
              <div>
                <span>Latest</span>
                <strong>${escapeHtml(scoreLine(latest))}</strong>
                <small>${escapeHtml(formatDate(latest?.submittedAt || latest?.updatedAt))}</small>
              </div>
              <div>
                <span>Best</span>
                <strong>${escapeHtml(scoreLine(best))}</strong>
                <small>${escapeHtml(formatDate(best?.submittedAt || best?.updatedAt))}</small>
              </div>
              <div>
                <span>Attempts</span>
                <strong>${escapeHtml(String(attemptCount))} / ${escapeHtml(String(policy.maxAttempts || 3))}</strong>
                <small>${escapeHtml(String(policy.remainingAttempts ?? Math.max(0, 3 - attemptCount)))} remaining</small>
              </div>
              <div>
                <span>Cooldown</span>
                <strong>${escapeHtml(cooldownUntil && cooldownUntil.getTime() > Date.now() ? formatRemaining(cooldownUntil.getTime() - Date.now()) : 'Ready')}</strong>
                <small>${escapeHtml(cooldownText)}</small>
              </div>
            </div>
          ` : ''}
          <button type="button" class="dsa-button dsa-button-primary" data-dsa-start${canStart ? '' : ' disabled'}>${escapeHtml(actionLabel)}</button>
        </div>
        ${renderHistory()}
      `;
    }

    list?.querySelector('[data-dsa-start]')?.addEventListener('click', startAttempt);
    setStatus(!canStart ? startBlockedMessage(policy.startBlockedReason) : hasActiveAttempt ? 'An unfinished attempt is ready to continue.' : (attemptCount ? 'Scores are saved. Start again when ready.' : 'Start the Quick Check when ready.'), !canStart ? 'warning' : 'neutral');
  }

  function renderShell(innerHtml) {
    if (!list) return;
    const total = state.questions.length;
    const position = state.reviewMode ? 'Review' : `Question ${state.currentIndex + 1} of ${total}`;
    list.innerHTML = `
      <div class="dsa-quick-check-player">
        ${watermarkMarkup()}
        <div class="dsa-quick-check-player-bar">
          <span class="dsa-quick-check-progress" aria-live="polite" aria-label="Question position">${escapeHtml(position)}</span>
          ${timerMarkup()}
        </div>
        <div class="dsa-quick-check-nav" aria-label="Quick Check question navigation">
          ${state.questions.map((question, index) => {
            const questionId = getQuestionId(question);
            const isActive = !state.reviewMode && index === state.currentIndex;
            const isAnswered = Boolean(state.answers[questionId]);
            return `<button type="button" class="${isActive ? 'is-active ' : ''}${isAnswered ? 'is-answered' : 'is-unanswered'}" data-dsa-go-question="${index}" aria-label="Go to question ${index + 1}${isAnswered ? ', answered' : ', unanswered'}">${index + 1}</button>`;
          }).join('')}
          <button type="button" class="${state.reviewMode ? 'is-active ' : ''}${isComplete() ? 'is-answered' : 'is-unanswered'}" data-dsa-review aria-label="Review answers">Review</button>
        </div>
        <div class="dsa-quick-check-active-content">
          ${innerHtml}
        </div>
        <div class="dsa-quick-check-inactive-overlay" aria-live="polite">
          <strong>Quick Check hidden</strong>
          <span>Return to this window to continue your active attempt.</span>
        </div>
      </div>
    `;
    bindPlayerButtons();
    setSubmitVisible(true);
    updateTimer();
    syncInactiveState();
  }

  function renderQuestion() {
    const question = state.questions[state.currentIndex];
    if (!question) {
      renderStatusPanel();
      return;
    }
    const questionId = getQuestionId(question);
    const selectedOptionId = state.answers[questionId] || '';
    renderShell(`
      <fieldset class="dsa-quick-check-question">
        <legend>${state.currentIndex + 1}. ${escapeHtml(question.questionText || question.text || 'Question')}</legend>
        <div class="dsa-quick-check-options">
          ${(Array.isArray(question.options) ? question.options : []).map((option) => {
            const optionId = option.optionId || option.id || '';
            return `
              <label class="dsa-quick-check-option">
                <input type="radio" name="${escapeHtml(questionId)}" value="${escapeHtml(optionId)}"${selectedOptionId === optionId ? ' checked' : ''} aria-label="${escapeHtml(`${option.label}. ${option.text}`)}">
                <span><strong>${escapeHtml(option.label)}.</strong> ${escapeHtml(option.text)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </fieldset>
      <div class="dsa-quick-check-player-actions">
        <button type="button" class="dsa-button" data-dsa-prev${state.currentIndex === 0 ? ' disabled' : ''}>Previous</button>
        <button type="button" class="dsa-button dsa-button-primary" data-dsa-next>${state.currentIndex === state.questions.length - 1 ? 'Review' : 'Next'}</button>
      </div>
    `);
    bindAnswerInputs();
  }

  function renderReview() {
    const missing = state.questions
      .map((question, index) => ({ index, answered: Boolean(state.answers[getQuestionId(question)]) }))
      .filter((item) => !item.answered);
    renderShell(`
      <div class="dsa-quick-check-review">
        <h3>Review Your Answers</h3>
        <p>${answeredCount()} of ${state.questions.length} questions answered.</p>
        ${missing.length ? `<p class="dsa-quick-check-warning">Answer questions ${missing.map((item) => item.index + 1).join(', ')} before submitting.</p>` : '<p class="dsa-quick-check-copy">All questions are answered. You can submit when ready.</p>'}
      </div>
      <div class="dsa-quick-check-player-actions">
        <button type="button" class="dsa-button" data-dsa-prev>Previous</button>
        <button type="button" class="dsa-button dsa-button-primary" data-dsa-first-missing${missing.length ? '' : ' disabled'}>${missing.length ? 'Go to first missing' : 'No missing answers'}</button>
      </div>
    `);
  }

  function render() {
    if (!state.questions.length) {
      renderStatusPanel();
      return;
    }
    if (state.reviewMode) renderReview();
    else renderQuestion();
  }

  function bindAnswerInputs() {
    form.querySelectorAll('input[type="radio"][name]').forEach((input) => {
      input.addEventListener('change', () => {
        state.answers[input.name] = input.value;
        render();
      });
    });
  }

  function bindPlayerButtons() {
    form.querySelectorAll('[data-dsa-go-question]').forEach((button) => {
      button.addEventListener('click', () => {
        state.currentIndex = Number(button.dataset.dsaGoQuestion || 0);
        state.reviewMode = false;
        render();
      });
    });
    form.querySelector('[data-dsa-review]')?.addEventListener('click', () => {
      state.reviewMode = true;
      render();
    });
    form.querySelector('[data-dsa-prev]')?.addEventListener('click', () => {
      if (state.reviewMode) {
        state.reviewMode = false;
        state.currentIndex = Math.max(0, state.questions.length - 1);
      } else {
        state.currentIndex = Math.max(0, state.currentIndex - 1);
      }
      render();
    });
    form.querySelector('[data-dsa-next]')?.addEventListener('click', () => {
      if (state.currentIndex >= state.questions.length - 1) {
        state.reviewMode = true;
      } else {
        state.currentIndex += 1;
      }
      render();
    });
    form.querySelector('[data-dsa-first-missing]')?.addEventListener('click', () => {
      const missingIndex = state.questions.findIndex((question) => !state.answers[getQuestionId(question)]);
      if (missingIndex >= 0) {
        state.currentIndex = missingIndex;
        state.reviewMode = false;
        render();
      }
    });
  }

  function collectAnswers() {
    return state.questions.map((question) => {
      const questionId = getQuestionId(question);
      return {
        questionId,
        selectedOptionId: state.answers[questionId] || ''
      };
    });
  }

  function fillAnswers(response) {
    const answers = Array.isArray(response?.answers) ? response.answers : [];
    answers.forEach((answer) => {
      if (answer.questionId && answer.selectedOptionId) {
        state.answers[answer.questionId] = answer.selectedOptionId;
      }
    });
  }

  function applyStatusPayload(payload) {
    state.activeAttempt = payload.activeAttempt || null;
    state.summary = payload.summary || { attemptCount: 0, latest: null, best: null };
    state.history = Array.isArray(payload.history) ? payload.history : [];
    state.questionBank = payload.questionBank || state.questionBank;
    state.attemptPolicy = payload.attemptPolicy || state.attemptPolicy;
    state.integrity = payload.integrity || state.integrity;
  }

  async function loadStatus() {
    if (!lessonSlug) return;
    try {
      setSubmitVisible(false);
      setStatus('Loading Quick Check status...', 'neutral');
      const response = await fetch(`/api/dsa/lessons/${encodeURIComponent(lessonSlug)}/quick-check`, {
        credentials: 'same-origin'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to load Quick Check status.');
      }
      applyStatusPayload(payload);
      renderStatusPanel();
    } catch (error) {
      if (list) list.innerHTML = `<p class="dsa-quick-check-copy">${escapeHtml(error.message || 'Unable to load Quick Check status.')}</p>`;
      setSubmitVisible(false);
      setStatus(error.message || 'Unable to load Quick Check status.', 'error');
    }
  }

  async function startAttempt() {
    if (!lessonSlug) return;
    try {
      setStatus(state.activeAttempt ? 'Continuing Quick Check...' : 'Starting Quick Check...', 'neutral');
      const response = await fetch(`/api/dsa/lessons/${encodeURIComponent(lessonSlug)}/quick-check/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to start Quick Check.');
      }
      state.questions = Array.isArray(payload.questions) ? payload.questions : [];
      state.answers = {};
      state.assignment = payload.assignment || null;
      state.activeAttempt = payload.assignment || null;
      state.attemptPolicy = payload.attemptPolicy || state.attemptPolicy;
      state.integrity = payload.integrity || state.integrity;
      state.serverOffsetMs = payload.assignment?.serverTime
        ? new Date(payload.assignment.serverTime).getTime() - Date.now()
        : 0;
      fillAnswers(payload.response);
      state.currentIndex = 0;
      state.reviewMode = false;
      render();
      startTimer();
      setStatus(payload.mode === 'continue' ? 'Continuing your active attempt.' : 'Timer started. Answer all 5 questions before submitting.', 'neutral');
    } catch (error) {
      setStatus(error.message || 'Unable to start Quick Check.', 'error');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!lessonSlug) return;
      if (!isComplete()) {
      state.reviewMode = true;
      render();
      setStatus('Answer all 5 Quick Check questions before submitting.', 'warning');
      return;
    }

    try {
      setBusy(true);
      setStatus('Submitting Quick Check...', 'neutral');
      await flushIntegrityEvents();
      const response = await fetch(`/api/dsa/lessons/${encodeURIComponent(lessonSlug)}/quick-check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ answers: collectAnswers() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to submit Quick Check.');
      }
      applyStatusPayload(payload);
      state.questions = [];
      state.answers = {};
      state.assignment = null;
      state.activeAttempt = null;
      renderStatusPanel();
      setStatus(`Submitted. Score: ${scoreLine(payload.response)}.`, 'success');
    } catch (error) {
      setStatus(error.message || 'Unable to submit Quick Check.', 'error');
    } finally {
      setBusy(false);
    }
  });

  window.addEventListener('blur', () => {
    state.windowInactive = true;
    logIntegrityEvent('window_blur', 'Window lost focus');
    syncInactiveState();
  });

  window.addEventListener('focus', () => {
    state.windowInactive = document.hidden;
    logIntegrityEvent('window_focus', 'Window focused');
    syncInactiveState();
  });

  document.addEventListener('visibilitychange', () => {
    state.windowInactive = document.hidden;
    logIntegrityEvent(document.hidden ? 'visibility_hidden' : 'visibility_visible', document.hidden ? 'Tab hidden' : 'Tab visible');
    syncInactiveState();
  });

  loadStatus();
})();
