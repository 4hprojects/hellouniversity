(function attachSelfPacedPlayer(global) {
  'use strict';

  const BLOCKED_SCREEN_COPY = {
    scheduled: {
      icon: 'schedule',
      title: 'ClassRush not open yet'
    },
    locked: {
      icon: 'lock',
      title: 'ClassRush closed'
    },
    unavailable: {
      icon: 'block',
      title: 'ClassRush unavailable'
    },
    error: {
      icon: 'error',
      title: 'ClassRush unavailable'
    }
  };

  const state = {
    assignmentId: '',
    payload: null,
    currentQuestionIndex: 0,
    questionEnteredAt: 0,
    timerId: null,
    timerRemainingMs: 0,
    saving: false
  };

  function byId(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateTime(value, fallback) {
    const timestamp = new Date(value || '').getTime();
    if (Number.isNaN(timestamp) || timestamp <= 0) {
      return fallback || 'N/A';
    }

    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(timestamp));
  }

  function formatDuration(ms) {
    if (!Number.isFinite(Number(ms))) return 'N/A';
    const totalSeconds = Math.max(0, Math.round(Number(ms) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  function formatScoringProfile(profile) {
    switch (String(profile || '').trim()) {
      case 'timed_accuracy':
        return 'Timed Accuracy';
      case 'live_scoring':
        return 'Live Scoring';
      case 'accuracy':
      default:
        return 'Accuracy';
    }
  }

  function shouldShowTimer(scoringProfile) {
    void scoringProfile;
    return true;
  }

  function buildReadyCtaLabel(attempt = {}) {
    const answeredCount = Number(attempt.answeredCount || 0);
    const currentQuestionIndex = Number(attempt.currentQuestionIndex || 0);
    return answeredCount > 0 || currentQuestionIndex > 0
      ? 'Resume ClassRush'
      : 'Start ClassRush';
  }

  function buildFinalPrimaryDisplay(attempt = {}) {
    if (attempt.showRank === true && attempt.rank) {
      return {
        value: `#${attempt.rank}`,
        label: 'Final Rank'
      };
    }

    if (Number.isFinite(Number(attempt.score))) {
      return {
        value: String(attempt.score),
        label: 'Final Score'
      };
    }

    return {
      value: '-',
      label: 'Final Score'
    };
  }

  function resolveQuestionAction(questionType, isFinalQuestion) {
    if (String(questionType || '').trim() === 'type_answer') {
      return {
        autoAdvance: false,
        buttonLabel: isFinalQuestion ? 'Submit ClassRush' : 'Next Question'
      };
    }

    if (isFinalQuestion) {
      return {
        autoAdvance: false,
        buttonLabel: 'Submit ClassRush'
      };
    }

    return {
      autoAdvance: true,
      buttonLabel: ''
    };
  }

  function shouldDisablePrimaryAction({ saving, questionType, hasResponse }) {
    if (saving) return true;
    if (String(questionType || '').trim() === 'type_answer') return false;
    return !hasResponse;
  }

  function resolveScreenMode({ availabilityState, attemptStatus }) {
    if (String(attemptStatus || '').trim() === 'submitted') {
      return 'final';
    }

    if (['scheduled', 'locked', 'unavailable', 'error'].includes(String(availabilityState || '').trim())) {
      return 'state';
    }

    return 'ready';
  }

  function getQuestions() {
    return Array.isArray(state.payload?.questions) ? state.payload.questions : [];
  }

  function getResponses() {
    return Array.isArray(state.payload?.attempt?.responses) ? state.payload.attempt.responses : [];
  }

  function getCurrentQuestion() {
    return getQuestions()[state.currentQuestionIndex] || null;
  }

  function getCurrentResponse() {
    return getResponses().find((response) => Number(response.questionIndex) === Number(state.currentQuestionIndex)) || null;
  }

  function isFinalQuestion() {
    return state.currentQuestionIndex >= Math.max(0, getQuestions().length - 1);
  }

  function hasCurrentResponse() {
    const response = getCurrentResponse();
    return Boolean(response && (response.answerId || response.submittedText));
  }

  function showScreen(name) {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.player-screen').forEach((screen) => screen.classList.remove('active'));
    const element = byId(`screen${name.charAt(0).toUpperCase()}${name.slice(1)}`);
    if (element) {
      element.classList.add('active');
    }
  }

  function showBanner(message, tone) {
    const banner = byId('selfPacedNoticeBanner');
    if (!banner) return;

    if (!message) {
      banner.hidden = true;
      banner.textContent = '';
      banner.className = 'self-paced-banner';
      return;
    }

    banner.hidden = false;
    banner.textContent = message;
    banner.className = `self-paced-banner${tone ? ` is-${tone}` : ''}`;
  }

  function setQuestionMeta(message, tone) {
    const meta = byId('selfPacedQuestionMeta');
    if (!meta) return;
    meta.textContent = message || '';
    meta.className = `self-paced-question-meta${tone ? ` is-${tone}` : ''}`;
  }

  function showToast(message, tone) {
    setQuestionMeta(message, tone);
  }

  function clearTimer() {
    if (state.timerId) {
      global.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerLabel(ms) {
    const timer = byId('playerTimer');
    if (!timer) return;

    if (!Number.isFinite(Number(ms))) {
      timer.textContent = '--';
      timer.classList.add('self-paced-timer-hidden');
      return;
    }

    timer.classList.remove('self-paced-timer-hidden');
    timer.textContent = String(Math.max(0, Math.ceil(Number(ms) / 1000)));
  }

  function getQuestionCounterText() {
    return `Question ${state.currentQuestionIndex + 1} of ${getQuestions().length}`;
  }

  function renderStateScreen(message, stateKey) {
    clearTimer();
    const config = BLOCKED_SCREEN_COPY[String(stateKey || '').trim()] || BLOCKED_SCREEN_COPY.unavailable;
    const title = byId('selfPacedStateTitle');
    const copy = byId('selfPacedStateCopy');
    const icon = byId('selfPacedStateIcon');

    if (title) title.textContent = config.title;
    if (copy) copy.textContent = message || 'This ClassRush assignment cannot be opened right now.';
    if (icon) icon.textContent = config.icon;

    showBanner('', '');
    showScreen('state');
  }

  function renderReadyScreen() {
    clearTimer();
    const assignment = state.payload?.assignment || {};
    const attempt = state.payload?.attempt || {};
    const title = byId('selfPacedReadyTitle');
    const description = byId('selfPacedReadyDescription');
    const classLine = byId('selfPacedReadyClass');
    const windowLine = byId('selfPacedReadyWindow');
    const scoringLine = byId('selfPacedReadyScoring');
    const progressLine = byId('selfPacedReadyProgress');
    const startBtn = byId('selfPacedStartBtn');

    if (title) title.textContent = assignment.title || 'ClassRush Assignment';
    if (description) {
      description.textContent = assignment.description
        || 'Complete this ClassRush activity in a one-question-at-a-time play flow.';
    }
    if (classLine) {
      classLine.textContent = assignment.className
        ? `${assignment.className}${assignment.classCode ? ` (${assignment.classCode})` : ''}`
        : 'Class information unavailable';
    }
    if (windowLine) {
      const startText = assignment.startDate
        ? `Open ${formatDateTime(assignment.startDate, 'N/A')}`
        : 'Available now';
      const dueText = assignment.dueDate
        ? `Due ${formatDateTime(assignment.dueDate, 'N/A')}`
        : 'No due date';
      windowLine.textContent = `${startText} | ${dueText}`;
    }
    if (scoringLine) scoringLine.textContent = formatScoringProfile(assignment.scoringProfile);
    if (progressLine) {
      progressLine.textContent = `${getQuestionCounterText()} | ${Number(attempt.answeredCount || 0)} answered`;
    }
    if (startBtn) startBtn.textContent = buildReadyCtaLabel(attempt);

    showScreen('ready');
  }

  function renderFinalScreen() {
    clearTimer();
    const assignment = state.payload?.assignment || {};
    const attempt = state.payload?.attempt || {};
    const title = byId('selfPacedFinalTitle');
    const subtitle = byId('selfPacedFinalSubtitle');
    const primaryValue = byId('selfPacedFinalPrimaryValue');
    const primaryLabel = byId('selfPacedFinalPrimaryLabel');
    const secondary = byId('selfPacedFinalSecondary');
    const primary = buildFinalPrimaryDisplay(attempt);

    if (title) title.textContent = assignment.title || 'ClassRush completed';
    if (subtitle) {
      subtitle.textContent = assignment.className
        ? `${assignment.className}${assignment.classCode ? ` (${assignment.classCode})` : ''}`
        : 'Self-paced ClassRush';
    }

    if (primaryValue) primaryValue.textContent = primary.value;
    if (primaryLabel) primaryLabel.textContent = primary.label;
    if (secondary) {
      secondary.textContent = [
        primary.label === 'Final Rank' && Number.isFinite(Number(attempt.score)) ? `Score ${attempt.score}` : '',
        Number.isFinite(Number(attempt.percent)) ? `${Number(attempt.percent).toFixed(1)}% correct` : '',
        Number.isFinite(Number(attempt.elapsedTimeMs)) ? formatDuration(attempt.elapsedTimeMs) : '',
        attempt.isLateSubmission ? 'Submitted late' : '',
        attempt.submittedAt ? `Submitted ${formatDateTime(attempt.submittedAt, 'N/A')}` : ''
      ].filter(Boolean).join(' | ');
    }

    showBanner('', '');
    showScreen('final');
  }

  function renderOptionAnswers(question, response) {
    const grid = byId('playerAnswerGrid');
    if (!grid) return;

    grid.className = 'player-answer-grid';
    grid.innerHTML = (question.options || []).map((option, index) => `
      <button
        class="player-answer-btn ${response?.answerId === option.id ? 'selected is-locked' : ''}"
        data-option-id="${escapeHtml(option.id)}"
        style="background:${index === 0 ? 'var(--kahoot-red)' : index === 1 ? 'var(--kahoot-blue)' : index === 2 ? 'var(--kahoot-gold)' : 'var(--kahoot-green)'}"
        ${response?.answerId ? 'disabled' : ''}>
        <span class="answer-shape">${index === 0 ? '&#9650;' : index === 1 ? '&#9670;' : index === 2 ? '&#9679;' : '&#9632;'}</span>
        <span class="answer-text">${escapeHtml(option.text)}</span>
      </button>
    `).join('');
  }

  function renderTextAnswer(question, response, primaryAction) {
    const grid = byId('playerAnswerGrid');
    const textValue = response?.submittedText || '';
    if (!grid) return;

    grid.className = 'player-answer-grid player-answer-grid--text';
    grid.innerHTML = `
      <div class="player-text-answer-card">
        <label class="player-text-answer-label" for="playerTextAnswerInput">Type your answer</label>
        <input
          id="playerTextAnswerInput"
          class="player-text-answer-input"
          type="text"
          maxlength="200"
          autocomplete="off"
          placeholder="Enter your answer"
          value="${escapeHtml(textValue)}">
      </div>
    `;

    const row = byId('selfPacedPrimaryActionRow');
    const button = byId('selfPacedPrimaryBtn');
    if (row) row.hidden = false;
    if (button) {
      button.textContent = primaryAction.buttonLabel;
      button.disabled = state.saving;
    }

    const input = byId('playerTextAnswerInput');
    if (input) {
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  function renderAnswerScreen() {
    const assignment = state.payload?.assignment || {};
    const question = getCurrentQuestion();
    const response = getCurrentResponse();
    const primaryRow = byId('selfPacedPrimaryActionRow');
    const primaryBtn = byId('selfPacedPrimaryBtn');
    const counter = byId('playerQCounter');
    const title = byId('playerQTitle');
    const isTimed = shouldShowTimer(assignment.scoringProfile);

    if (!question) {
      renderStateScreen('No question is available for this ClassRush assignment.', 'unavailable');
      return;
    }

    if (counter) counter.textContent = getQuestionCounterText();
    if (title) title.textContent = question.title || 'Untitled question';
    updateTimerLabel(isTimed ? 0 : Number.NaN);

    const primaryAction = resolveQuestionAction(question.type, isFinalQuestion());
    if (primaryRow) primaryRow.hidden = primaryAction.buttonLabel.length === 0;
    if (primaryBtn) {
      primaryBtn.textContent = primaryAction.buttonLabel;
      primaryBtn.disabled = shouldDisablePrimaryAction({
        saving: state.saving,
        questionType: question.type,
        hasResponse: hasCurrentResponse()
      });
    }

    if (String(question.type || '').trim() === 'type_answer') {
      renderTextAnswer(question, response, primaryAction);
      setQuestionMeta(primaryAction.buttonLabel === 'Submit ClassRush'
        ? 'Type your final answer, then submit your ClassRush.'
        : 'Type your answer, then continue to the next question.');
    } else {
      renderOptionAnswers(question, response);
      if (isFinalQuestion()) {
        setQuestionMeta(response?.answerId
          ? 'Final answer saved. Submit your ClassRush when ready.'
          : 'Choose your final answer to unlock ClassRush submission.');
      } else {
        setQuestionMeta('Choose one answer to continue.');
      }
    }

    showScreen('answer');
    startTimer();
  }

  function updateLocalResponse(nextResponse) {
    const responses = getResponses().filter((item) => Number(item.questionIndex) !== Number(nextResponse.questionIndex));
    responses.push(nextResponse);
    state.payload.attempt.responses = responses;
    state.payload.attempt.answeredCount = responses.filter((item) => item.answerId || item.submittedText).length;
  }

  function getExistingTimeMs() {
    return Number(getCurrentResponse()?.timeMs || 0);
  }

  function getAccumulatedTimeMs() {
    const additionalTimeMs = state.questionEnteredAt ? Math.max(0, Date.now() - state.questionEnteredAt) : 0;
    return getExistingTimeMs() + additionalTimeMs;
  }

  function buildProgressPayload() {
    const question = getCurrentQuestion();
    if (!question) return null;

    const base = {
      questionIndex: state.currentQuestionIndex,
      timeMs: getAccumulatedTimeMs()
    };

    if (String(question.type || '').trim() === 'type_answer') {
      return {
        ...base,
        answerText: String(byId('playerTextAnswerInput')?.value || '')
      };
    }

    return {
      ...base,
      answerId: String(getCurrentResponse()?.answerId || '').trim() || null
    };
  }

  async function persistCurrentQuestion(nextQuestionIndex) {
    const payload = buildProgressPayload();
    if (!payload) return;

    const response = await fetch(`/api/student/classrush/assignments/${encodeURIComponent(state.assignmentId)}/progress`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        currentQuestionIndex: nextQuestionIndex
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to save ClassRush progress.');
    }

    updateLocalResponse({
      questionIndex: state.currentQuestionIndex,
      answerId: payload.answerId || null,
      submittedText: payload.answerText ? String(payload.answerText).trim() : null,
      timeMs: Number(payload.timeMs || 0)
    });
    state.payload.attempt.currentQuestionIndex = nextQuestionIndex;
    state.questionEnteredAt = Date.now();
  }

  async function moveToNextQuestion() {
    if (isFinalQuestion()) return;
    state.saving = false;
    state.currentQuestionIndex += 1;
    renderAnswerScreen();
  }

  async function submitAssignment() {
    if (state.saving) return;
    state.saving = true;
    clearTimer();
    showBanner('', '');
    let submitError = null;

    try {
      const response = await fetch(`/api/student/classrush/assignments/${encodeURIComponent(state.assignmentId)}/submit`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit ClassRush assignment.');
      }

      state.payload = data;
      state.currentQuestionIndex = Number(data.attempt?.currentQuestionIndex || 0);
      renderFinalScreen();
      showBanner(
        data.message || 'ClassRush submitted.',
        data.attempt?.isLateSubmission ? 'warning' : ''
      );
    } catch (error) {
      submitError = error;
    } finally {
      state.saving = false;
      if (submitError) {
        renderAnswerScreen();
        showToast(submitError.message || 'Failed to submit ClassRush assignment.', 'error');
      }
    }
  }

  async function handleTimerExpired() {
    if (state.saving) return;
    clearTimer();
    let timerError = null;

    try {
      state.saving = true;
      setQuestionMeta('Time is up. Saving your progress...', 'saving');
      await persistCurrentQuestion(isFinalQuestion() ? state.currentQuestionIndex : state.currentQuestionIndex + 1);

      if (isFinalQuestion()) {
        await submitAssignment();
        return;
      }

      await moveToNextQuestion();
    } catch (error) {
      timerError = error;
    } finally {
      state.saving = false;
      if (timerError) {
        renderAnswerScreen();
        showToast(timerError.message || 'Time ran out, but your progress could not be saved.', 'error');
      }
    }
  }

  function startTimer() {
    clearTimer();

    const question = getCurrentQuestion();
    const assignment = state.payload?.assignment || {};
    if (!question || !shouldShowTimer(assignment.scoringProfile)) {
      updateTimerLabel(Number.NaN);
      return;
    }

    const limitMs = Math.max(0, Number(question.timeLimitSeconds || 0) * 1000);
    const savedTimeMs = Number(getCurrentResponse()?.timeMs || 0);
    state.timerRemainingMs = Math.max(0, limitMs - savedTimeMs);
    state.questionEnteredAt = Date.now();
    updateTimerLabel(state.timerRemainingMs);

    if (state.timerRemainingMs <= 0) {
      handleTimerExpired();
      return;
    }

    state.timerId = global.setInterval(() => {
      const elapsed = Date.now() - state.questionEnteredAt;
      const remaining = Math.max(0, state.timerRemainingMs - elapsed);
      updateTimerLabel(remaining);
      if (remaining <= 0) {
        handleTimerExpired();
      }
    }, 250);
  }

  async function handleOptionSelection(optionId) {
    if (state.saving || !optionId) return;

    const question = getCurrentQuestion();
    const primaryAction = resolveQuestionAction(question?.type, isFinalQuestion());
    updateLocalResponse({
      questionIndex: state.currentQuestionIndex,
      answerId: optionId,
      submittedText: null,
      timeMs: getExistingTimeMs()
    });
    let saveError = null;

    try {
      state.saving = true;
      setQuestionMeta('Saving answer...', 'saving');
      await persistCurrentQuestion(primaryAction.autoAdvance ? state.currentQuestionIndex + 1 : state.currentQuestionIndex);

      if (primaryAction.autoAdvance) {
        await moveToNextQuestion();
        return;
      }

      state.saving = false;
      renderAnswerScreen();
      return;
    } catch (error) {
      saveError = error;
    } finally {
      state.saving = false;
      if (saveError) {
        renderAnswerScreen();
        showToast(saveError.message || 'Failed to save your answer.', 'error');
      }
    }
  }

  async function handlePrimaryAction() {
    if (state.saving) return;

    const question = getCurrentQuestion();
    if (!question) return;

    const action = resolveQuestionAction(question.type, isFinalQuestion());
    if (!action.buttonLabel) return;

    if (String(question.type || '').trim() === 'type_answer') {
      const answerText = String(byId('playerTextAnswerInput')?.value || '').trim();
      if (!answerText) {
        showToast('Type your answer before continuing.', 'error');
        return;
      }
      let saveError = null;

      try {
        state.saving = true;
        setQuestionMeta(action.buttonLabel === 'Submit ClassRush' ? 'Saving final answer...' : 'Saving answer...', 'saving');
        await persistCurrentQuestion(isFinalQuestion() ? state.currentQuestionIndex : state.currentQuestionIndex + 1);

        if (action.buttonLabel === 'Submit ClassRush') {
          await submitAssignment();
          return;
        }

        await moveToNextQuestion();
      } catch (error) {
        saveError = error;
      } finally {
        state.saving = false;
        if (saveError) {
          renderAnswerScreen();
          showToast(saveError.message || 'Failed to save your answer.', 'error');
        }
      }
      return;
    }

    if (!hasCurrentResponse()) {
      showToast('Choose your answer before submitting.', 'error');
      return;
    }

    await submitAssignment();
  }

  function getBlockedPayloadFromError(error) {
    const payload = error?.payload || {};
    const availabilityState = String(payload?.availability?.state || '').trim();

    if (availabilityState) {
      return {
        title: payload.assignment?.title || 'ClassRush Assignment',
        message: payload.availability?.message || error.message,
        state: availabilityState
      };
    }

    const message = String(error?.message || '').trim();
    if (message.includes('not open yet')) {
      return { title: 'ClassRush Assignment', message, state: 'scheduled' };
    }
    if (message.includes('closed because its due date has passed')) {
      return { title: 'ClassRush Assignment', message, state: 'locked' };
    }
    if (message.includes('do not have access') || message.includes('Only enrolled students')) {
      return { title: 'ClassRush Assignment', message, state: 'unavailable' };
    }

    return { title: 'ClassRush Assignment', message, state: 'error' };
  }

  function renderLoadedPayload() {
    const payload = state.payload;
    const availabilityState = payload?.availability?.state || 'open';
    const attemptStatus = payload?.attempt?.status || 'in_progress';
    const screenMode = resolveScreenMode({ availabilityState, attemptStatus });

    if (payload?.availability?.message && payload.availability.isLateWindow) {
      showBanner(payload.availability.message, 'warning');
    } else {
      showBanner('', '');
    }

    if (screenMode === 'final') {
      renderFinalScreen();
      return;
    }

    if (screenMode === 'state') {
      renderStateScreen(payload?.availability?.message, availabilityState);
      return;
    }

    renderReadyScreen();
  }

  async function loadAssignment() {
    try {
      const response = await fetch(`/api/student/classrush/assignments/${encodeURIComponent(state.assignmentId)}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        const error = new Error(data.message || 'Failed to load ClassRush assignment.');
        error.payload = data;
        throw error;
      }

      state.payload = data;
      state.currentQuestionIndex = Number(data.attempt?.currentQuestionIndex || 0);
      renderLoadedPayload();
    } catch (error) {
      const blocked = getBlockedPayloadFromError(error);
      renderStateScreen(blocked.message, blocked.state);
    }
  }

  function bindEvents() {
    byId('selfPacedStartBtn')?.addEventListener('click', () => {
      renderAnswerScreen();
    });

    byId('playerAnswerGrid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-option-id]');
      if (!button) return;
      handleOptionSelection(String(button.dataset.optionId || '').trim());
    });

    byId('playerAnswerGrid')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target?.id === 'playerTextAnswerInput') {
        event.preventDefault();
        handlePrimaryAction();
      }
    });

    byId('selfPacedPrimaryBtn')?.addEventListener('click', handlePrimaryAction);
  }

  function init() {
    const page = byId('classrushAssignmentPage');
    if (!page) return;

    state.assignmentId = page.dataset.assignmentId || document.body?.dataset?.assignmentId || '';
    bindEvents();
    loadAssignment();
  }

  const api = {
    init,
    __testables: {
      buildFinalPrimaryDisplay,
      buildReadyCtaLabel,
      formatScoringProfile,
      resolveQuestionAction,
      resolveScreenMode,
      shouldDisablePrimaryAction,
      shouldShowTimer
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.selfPacedPlayer = api;
})(typeof window !== 'undefined' ? window : globalThis);
