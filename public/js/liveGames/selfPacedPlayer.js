(function attachSelfPacedPlayer(global) {
  'use strict';

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
    return document.getElementById(id);
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

  function showAlert(message, tone) {
    const alert = byId('classrushAssignmentAlert');
    if (!alert) return;
    if (!message) {
      alert.hidden = true;
      alert.textContent = '';
      alert.className = 'student-card classrush-assignment-alert';
      return;
    }
    alert.hidden = false;
    alert.textContent = message;
    alert.className = `student-card classrush-assignment-alert ${tone ? `is-${tone}` : ''}`;
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

  function setStatusLine(message) {
    const line = byId('classrushAssignmentStatusLine');
    if (line) line.textContent = message || '';
  }

  function updateSummary() {
    const attempt = state.payload?.attempt || {};
    const scoreValue = attempt.score;
    const percentValue = attempt.percent;
    const showRank = attempt.showRank === true;

    byId('classrushAnsweredCount').textContent = String(attempt.answeredCount || 0);
    byId('classrushScoreValue').textContent = Number.isFinite(Number(scoreValue)) ? String(scoreValue) : '-';
    byId('classrushPercentValue').textContent = Number.isFinite(Number(percentValue)) ? `${Number(percentValue).toFixed(1)}%` : '-';
    byId('classrushRankValue').textContent = showRank && attempt.rank ? `#${attempt.rank}` : '-';

    const submittedSummary = byId('classrushSubmittedSummary');
    const submittedMeta = byId('classrushSubmittedMeta');
    if (!submittedSummary || !submittedMeta) return;

    if (String(attempt.status || '') === 'submitted') {
      submittedSummary.hidden = false;
      submittedMeta.textContent = [
        Number.isFinite(Number(scoreValue)) ? `Score ${scoreValue}` : '',
        Number.isFinite(Number(percentValue)) ? `${Number(percentValue).toFixed(1)}% correct` : '',
        attempt.rank && showRank ? `Rank #${attempt.rank}` : '',
        attempt.elapsedTimeMs ? formatDuration(attempt.elapsedTimeMs) : '',
        attempt.isLateSubmission ? 'Submitted late' : ''
      ].filter(Boolean).join(' | ');
    } else {
      submittedSummary.hidden = true;
      submittedMeta.textContent = '';
    }
  }

  function renderQuestionList() {
    const list = byId('classrushQuestionList');
    if (!list) return;

    const questions = getQuestions();
    if (!questions.length) {
      list.innerHTML = '<p class="student-empty-state">No questions are available for this ClassRush assignment.</p>';
      return;
    }

    const responses = getResponses();
    list.innerHTML = questions.map((question, index) => {
      const response = responses.find((item) => Number(item.questionIndex) === index);
      const isAnswered = Boolean(response && (response.answerId || response.submittedText));
      return `
        <button
          type="button"
          class="classrush-question-nav-btn ${index === state.currentQuestionIndex ? 'is-active' : ''} ${isAnswered ? 'is-answered' : ''}"
          data-question-index="${index}">
          Question ${index + 1}
        </button>
      `;
    }).join('');
  }

  function renderQuestion() {
    const question = getCurrentQuestion();
    const attempt = state.payload?.attempt || {};
    const isSubmitted = String(attempt.status || '') === 'submitted';
    const questionCard = byId('classrushQuestionCard');
    const actions = byId('classrushSubmitBtn')?.parentElement;

    if (!question || !questionCard || !actions) {
      if (questionCard) {
        questionCard.innerHTML = '<p class="student-empty-state">No question is available right now.</p>';
      }
      return;
    }

    byId('classrushQuestionCounter').textContent = `Question ${state.currentQuestionIndex + 1} of ${getQuestions().length}`;
    byId('classrushQuestionPrompt').textContent = question.title || 'Untitled question';

    const response = getCurrentResponse();
    const optionsWrap = byId('classrushQuestionOptions');
    const textWrap = byId('classrushQuestionTextWrap');
    const textInput = byId('classrushQuestionText');

    if (question.type === 'type_answer') {
      optionsWrap.innerHTML = '';
      textWrap.hidden = false;
      textInput.value = response?.submittedText || '';
      textInput.disabled = isSubmitted;
    } else {
      textWrap.hidden = true;
      textInput.value = '';
      optionsWrap.innerHTML = (question.options || []).map((option) => `
        <button
          type="button"
          class="classrush-option-btn ${response?.answerId === option.id ? 'is-selected' : ''}"
          data-option-id="${escapeHtml(option.id)}"
          ${isSubmitted ? 'disabled' : ''}>
          ${escapeHtml(option.text)}
        </button>
      `).join('');
    }

    byId('classrushPrevBtn').disabled = isSubmitted || state.currentQuestionIndex <= 0;
    byId('classrushNextBtn').disabled = isSubmitted || state.currentQuestionIndex >= (getQuestions().length - 1);
    byId('classrushSubmitBtn').disabled = isSubmitted;
    actions.hidden = false;

    renderQuestionList();
    startTimer();
  }

  function clearTimer() {
    if (state.timerId) {
      global.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerLabel(ms) {
    const label = byId('classrushQuestionTimer');
    if (!label) return;
    if (!Number.isFinite(Number(ms))) {
      label.textContent = '--';
      return;
    }
    const seconds = Math.max(0, Math.ceil(Number(ms) / 1000));
    label.textContent = `${seconds}s`;
  }

  async function handleTimerExpired() {
    clearTimer();
    await persistCurrentQuestion(state.currentQuestionIndex);
    if (state.currentQuestionIndex < getQuestions().length - 1) {
      await moveToQuestion(state.currentQuestionIndex + 1);
    } else {
      showAlert('Time is up for the final question. Review your progress or submit your ClassRush now.', 'warning');
    }
  }

  function startTimer() {
    clearTimer();

    const question = getCurrentQuestion();
    const scoringProfile = String(state.payload?.assignment?.scoringProfile || 'accuracy');
    if (!question || scoringProfile === 'accuracy') {
      updateTimerLabel(NaN);
      return;
    }

    const savedTimeMs = Number(getCurrentResponse()?.timeMs || 0);
    const limitMs = Number(question.timeLimitSeconds || 0) * 1000;
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

  function getCurrentResponsePayload() {
    const question = getCurrentQuestion();
    if (!question) return null;

    const existingResponse = getCurrentResponse();
    const previousTimeMs = Number(existingResponse?.timeMs || 0);
    const additionalTimeMs = state.questionEnteredAt ? Math.max(0, Date.now() - state.questionEnteredAt) : 0;
    const nextTimeMs = previousTimeMs + additionalTimeMs;

    if (question.type === 'type_answer') {
      return {
        questionIndex: state.currentQuestionIndex,
        answerText: byId('classrushQuestionText')?.value || '',
        timeMs: nextTimeMs
      };
    }

    return {
      questionIndex: state.currentQuestionIndex,
      answerId: existingResponse?.answerId || null,
      timeMs: nextTimeMs
    };
  }

  async function persistCurrentQuestion(nextQuestionIndex) {
    const payload = getCurrentResponsePayload();
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
      throw new Error(data.message || 'Failed to save progress.');
    }

    const responses = getResponses().filter((item) => Number(item.questionIndex) !== state.currentQuestionIndex);
    responses.push({
      questionIndex: state.currentQuestionIndex,
      answerId: payload.answerId || null,
      submittedText: payload.answerText ? String(payload.answerText).trim() : null,
      timeMs: Number(payload.timeMs || 0)
    });
    state.payload.attempt.responses = responses;
    state.payload.attempt.currentQuestionIndex = nextQuestionIndex;
    state.payload.attempt.answeredCount = responses.filter((item) => item.answerId || item.submittedText).length;
    state.questionEnteredAt = Date.now();
    updateSummary();
    renderQuestionList();
  }

  async function moveToQuestion(nextIndex) {
    if (state.saving) return;
    state.saving = true;
    clearTimer();

    try {
      await persistCurrentQuestion(nextIndex);
      state.currentQuestionIndex = nextIndex;
      renderQuestion();
    } catch (error) {
      showAlert(error.message || 'Failed to save your ClassRush progress.', 'error');
    } finally {
      state.saving = false;
    }
  }

  async function submitAssignment() {
    if (state.saving) return;
    state.saving = true;
    clearTimer();
    showAlert('');

    try {
      await persistCurrentQuestion(state.currentQuestionIndex);
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
      render();
      showAlert(data.message || 'ClassRush submitted.', data.attempt?.isLateSubmission ? 'warning' : '');
    } catch (error) {
      showAlert(error.message || 'Failed to submit ClassRush assignment.', 'error');
    } finally {
      state.saving = false;
    }
  }

  function updateLocalOptionSelection(answerId) {
    const responses = getResponses().filter((item) => Number(item.questionIndex) !== state.currentQuestionIndex);
    responses.push({
      questionIndex: state.currentQuestionIndex,
      answerId,
      submittedText: null,
      timeMs: Number(getCurrentResponse()?.timeMs || 0)
    });
    state.payload.attempt.responses = responses;
  }

  function render() {
    const payload = state.payload;
    if (!payload) return;

    byId('classrushAssignmentTitle').textContent = payload.assignment?.title || 'ClassRush Assignment';
    byId('classrushAssignmentDescription').textContent = payload.assignment?.description || 'Complete your assigned self-paced ClassRush activity.';
    byId('classrushAssignmentClassLine').textContent = payload.assignment?.className
      ? `${payload.assignment.className}${payload.assignment.classCode ? ` (${payload.assignment.classCode})` : ''}`
      : 'Class information unavailable';

    const dueText = payload.assignment?.dueDate ? `Due ${formatDateTime(payload.assignment.dueDate, 'N/A')}` : 'No due date';
    const startText = payload.assignment?.startDate ? `Open ${formatDateTime(payload.assignment.startDate, 'N/A')}` : 'Available now';
    byId('classrushAssignmentWindowLine').textContent = `${startText} | ${dueText}`;
    setStatusLine(String(payload.attempt?.status || '').replace(/_/g, ' '));

    if (payload.availability?.message) {
      showAlert(payload.availability.message, payload.availability.state === 'late' ? 'warning' : '');
    } else {
      showAlert('');
    }

    updateSummary();

    if (String(payload.attempt?.status || '') === 'submitted') {
      clearTimer();
      updateTimerLabel(NaN);
      byId('classrushQuestionCard').innerHTML = '<p class="student-empty-state">This self-paced ClassRush activity has already been submitted.</p>';
      byId('classrushPrevBtn').disabled = true;
      byId('classrushNextBtn').disabled = true;
      byId('classrushSubmitBtn').disabled = true;
      renderQuestionList();
      return;
    }

    if (!payload.availability?.message || payload.availability?.state === 'late' || payload.availability?.state === 'open') {
      renderQuestion();
    }
  }

  async function loadAssignment() {
    try {
      const response = await fetch(`/api/student/classrush/assignments/${encodeURIComponent(state.assignmentId)}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load ClassRush assignment.');
      }

      state.payload = data;
      state.currentQuestionIndex = Number(data.attempt?.currentQuestionIndex || 0);
      render();
    } catch (error) {
      showAlert(error.message || 'Failed to load ClassRush assignment.', 'error');
      byId('classrushAssignmentStatusLine').textContent = 'Unavailable';
      byId('classrushQuestionCard').innerHTML = '<p class="student-empty-state">This ClassRush assignment is unavailable right now.</p>';
    }
  }

  function bindEvents() {
    byId('classrushPrevBtn')?.addEventListener('click', () => {
      if (state.currentQuestionIndex > 0) {
        moveToQuestion(state.currentQuestionIndex - 1);
      }
    });

    byId('classrushNextBtn')?.addEventListener('click', () => {
      if (state.currentQuestionIndex < getQuestions().length - 1) {
        moveToQuestion(state.currentQuestionIndex + 1);
      }
    });

    byId('classrushSubmitBtn')?.addEventListener('click', submitAssignment);

    byId('classrushQuestionOptions')?.addEventListener('click', async (event) => {
      const optionButton = event.target.closest('[data-option-id]');
      if (!optionButton || state.saving || String(state.payload?.attempt?.status || '') === 'submitted') return;
      updateLocalOptionSelection(optionButton.dataset.optionId || '');
      try {
        state.saving = true;
        await persistCurrentQuestion(state.currentQuestionIndex);
        renderQuestion();
      } catch (error) {
        showAlert(error.message || 'Failed to save your answer.', 'error');
      } finally {
        state.saving = false;
      }
    });

    byId('classrushQuestionList')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-question-index]');
      if (!button) return;
      const nextIndex = Number(button.dataset.questionIndex);
      if (!Number.isFinite(nextIndex) || nextIndex === state.currentQuestionIndex) return;
      moveToQuestion(nextIndex);
    });

    byId('classrushQuestionText')?.addEventListener('blur', async () => {
      if (state.saving || String(state.payload?.attempt?.status || '') === 'submitted') return;
      try {
        state.saving = true;
        await persistCurrentQuestion(state.currentQuestionIndex);
      } catch (error) {
        showAlert(error.message || 'Failed to save your answer.', 'error');
      } finally {
        state.saving = false;
      }
    });
  }

  function init() {
    const page = byId('classrushAssignmentPage');
    if (!page) return;

    state.assignmentId = page.dataset.assignmentId || '';
    bindEvents();
    loadAssignment();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
