(function attachQuizPlayer(root, factory) {
  const api = factory(root);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root?.document) {
    root.document.addEventListener('DOMContentLoaded', () => {
      api.init().catch((error) => {
        console.error('Quiz player init failed:', error);
      });
    });
  }
})(typeof window !== 'undefined' ? window : null, function quizPlayerFactory(root) {
  const SAVE_IDLE = 'idle';
  const SAVE_SAVING = 'saving';
  const SAVE_SAVED = 'saved';
  const SAVE_FAILED = 'failed';

  const state = {
    quiz: null,
    attemptId: '',
    activeSectionId: '',
    visitedSectionIds: [],
    reviewMode: false,
    pendingSubmitConfirmation: false,
    saveState: SAVE_IDLE,
    saveError: '',
    partialSaveTimer: null,
    partialSavePromise: null,
    submitInFlight: false
  };

  function $(selector, scope = root?.document) {
    return scope?.querySelector(selector) || null;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getSectionOrderMap(sections = []) {
    return new Map((Array.isArray(sections) ? sections : []).map((section, index) => [section.id, index]));
  }

  function getNextAuthoredSectionId(sections = [], currentSectionId = '') {
    const sectionOrderMap = getSectionOrderMap(sections);
    const currentIndex = sectionOrderMap.get(currentSectionId);
    if (!Number.isInteger(currentIndex)) {
      return '';
    }
    return sections[currentIndex + 1]?.id || '';
  }

  function getSelectedChoiceIndex(form, questionId) {
    const selected = form?.querySelector(`input[name="q-${questionId}"]:checked`);
    return selected ? Number(selected.value) : -1;
  }

  function resolveNextSectionId(quiz, currentSectionId, form) {
    const sections = Array.isArray(quiz?.sections) ? quiz.sections : [];
    const currentSection = sections.find((section) => section.id === currentSectionId);
    if (!currentSection) {
      return '';
    }

    const routedQuestion = currentSection.questions
      .slice()
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
      .filter((question) => question.type === 'multiple_choice' && question.goToSectionBasedOnAnswer)
      .pop();

    if (!routedQuestion) {
      return getNextAuthoredSectionId(sections, currentSectionId);
    }

    const selectedChoiceIndex = getSelectedChoiceIndex(form, routedQuestion.id);
    const matchedRoute = Array.isArray(routedQuestion.answerRoutes)
      ? routedQuestion.answerRoutes.find((route) => Number(route.optionIndex) === selectedChoiceIndex)
      : null;

    if (matchedRoute?.sectionId) {
      return matchedRoute.sectionId;
    }

    return getNextAuthoredSectionId(sections, currentSectionId);
  }

  function buildRenderSections(quiz) {
    if (Array.isArray(quiz.sections) && quiz.sections.length) {
      let startNumber = 1;
      return quiz.sections.map((section, sectionIndex) => {
        const sectionQuestions = Array.isArray(section.questions) && section.questions.length
          ? section.questions
          : (Array.isArray(quiz.questions) ? quiz.questions.filter((question) => question.sectionId === section.id) : []);
        const currentStart = startNumber;
        startNumber += sectionQuestions.length;
        return {
          id: section.id || `section-${sectionIndex + 1}`,
          title: section.title || `Section ${sectionIndex + 1}`,
          description: section.description || '',
          startNumber: currentStart,
          questions: sectionQuestions
        };
      });
    }

    return [{
      id: 'section-1',
      title: 'Section 1',
      description: '',
      startNumber: 1,
      questions: Array.isArray(quiz.questions) ? quiz.questions : []
    }];
  }

  function renderQuestion(question, index) {
    const description = question.description
      ? `<p class="quiz-description">${escapeHtml(question.description)}</p>`
      : '';
    const requiredMark = question.required
      ? '<span class="required-asterisk">*</span>'
      : '';
    const requiredNote = question.required
      ? '<p class="required-note">Required field</p>'
      : '';

    if (question.type === 'short_answer') {
      return `
        <fieldset class="quiz-fieldset" data-question-card="${escapeHtml(question.id)}">
          <legend class="quiz-legend">${index + 1}. ${escapeHtml(question.text)}${requiredMark}</legend>
          ${description}
          <input type="text" class="quiz-text-input" data-question-id="${escapeHtml(question.id)}" data-question-type="${escapeHtml(question.type)}" placeholder="Type your answer"${question.required ? ' required' : ''}>
          ${requiredNote}
        </fieldset>
      `;
    }

    if (question.type === 'paragraph') {
      return `
        <fieldset class="quiz-fieldset" data-question-card="${escapeHtml(question.id)}">
          <legend class="quiz-legend">${index + 1}. ${escapeHtml(question.text)}${requiredMark}</legend>
          ${description}
          <textarea class="quiz-textarea" data-question-id="${escapeHtml(question.id)}" data-question-type="${escapeHtml(question.type)}" placeholder="Write your answer"${question.required ? ' required' : ''}></textarea>
          ${requiredNote}
        </fieldset>
      `;
    }

    const inputType = question.type === 'checkbox' ? 'checkbox' : 'radio';
    const choices = Array.isArray(question.choices) ? question.choices : [];

    return `
      <fieldset class="quiz-fieldset" data-question-card="${escapeHtml(question.id)}">
        <legend class="quiz-legend">${index + 1}. ${escapeHtml(question.text)}${requiredMark}</legend>
        ${description}
        <div class="radio-group">
          ${choices.map((choice, choiceIndex) => `
            <label class="radio-label">
              <input
                type="${inputType}"
                name="q-${escapeHtml(question.id)}"
                value="${choiceIndex}"
                data-question-id="${escapeHtml(question.id)}"
                data-question-type="${escapeHtml(question.type)}"
                ${choiceIndex === 0 && question.required ? 'required' : ''}
              />
              <span>${escapeHtml(choice)}</span>
            </label>
          `).join('')}
        </div>
        ${requiredNote}
      </fieldset>
    `;
  }

  function getQuestionInputState(question, form) {
    if (question.type === 'checkbox') {
      const selectedValues = Array.from(form.querySelectorAll(`input[name="q-${question.id}"]:checked`))
        .map((input) => Number(input.value))
        .filter((value) => Number.isInteger(value) && value >= 0);
      return { choiceIndexes: selectedValues };
    }

    if (question.type === 'short_answer' || question.type === 'paragraph') {
      const field = form.querySelector(`[data-question-id="${question.id}"][data-question-type="${question.type}"]`);
      return { text: field?.value?.trim() || '' };
    }

    const selected = form.querySelector(`input[name="q-${question.id}"]:checked`);
    return { choiceIndex: selected ? Number(selected.value) : -1 };
  }

  function isQuestionAnswered(question, responseState) {
    if (question.type === 'checkbox') {
      return Array.isArray(responseState?.choiceIndexes) && responseState.choiceIndexes.length > 0;
    }

    if (question.type === 'short_answer' || question.type === 'paragraph') {
      return Boolean(String(responseState?.text || '').trim());
    }

    return Number.isInteger(responseState?.choiceIndex) && responseState.choiceIndex >= 0;
  }

  function collectQuestionProgress(quiz, form) {
    return quiz.questions.map((question) => {
      const responseState = getQuestionInputState(question, form);
      const answered = isQuestionAnswered(question, responseState);
      return {
        questionId: question.id,
        sectionId: question.sectionId,
        prompt: question.text,
        required: question.required !== false,
        answered,
        missingRequired: question.required !== false && !answered,
        missingOptional: question.required === false && !answered
      };
    });
  }

  function summarizeProgress(quiz, progressEntries) {
    const total = Array.isArray(progressEntries) ? progressEntries.length : 0;
    const answered = progressEntries.filter((entry) => entry.answered).length;
    const missingRequired = progressEntries.filter((entry) => entry.missingRequired).length;
    const remaining = total - answered;
    const bySection = (Array.isArray(quiz?.sections) ? quiz.sections : []).map((section) => {
      const sectionEntries = progressEntries.filter((entry) => entry.sectionId === section.id);
      return {
        sectionId: section.id,
        title: section.title || 'Section',
        answered: sectionEntries.filter((entry) => entry.answered).length,
        total: sectionEntries.length,
        missingRequired: sectionEntries.filter((entry) => entry.missingRequired).length,
        questions: section.questions.map((question) => {
          const entry = sectionEntries.find((item) => item.questionId === question.id);
          return {
            questionId: question.id,
            prompt: question.text,
            answered: Boolean(entry?.answered),
            required: question.required !== false,
            missingRequired: Boolean(entry?.missingRequired),
            missingOptional: Boolean(entry?.missingOptional)
          };
        })
      };
    });

    return {
      total,
      answered,
      remaining,
      missingRequired,
      bySection
    };
  }

  function collectAnswers(quiz, form) {
    return quiz.questions.map((question) => {
      const responseState = getQuestionInputState(question, form);

      if (question.type === 'checkbox') {
        return { questionId: question.id, choiceIndexes: responseState.choiceIndexes || [] };
      }

      if (question.type === 'short_answer' || question.type === 'paragraph') {
        return { questionId: question.id, text: responseState.text || '' };
      }

      return { questionId: question.id, choiceIndex: Number.isInteger(responseState.choiceIndex) ? responseState.choiceIndex : -1 };
    });
  }

  function setInlineMessage(message, tone = 'info') {
    const element = $('#quizInlineMessage');
    if (!element) return;

    if (!message) {
      element.hidden = true;
      element.textContent = '';
      element.className = 'quiz-inline-message';
      return;
    }

    element.hidden = false;
    element.textContent = message;
    element.className = `quiz-inline-message quiz-inline-message-${tone}`;
  }

  function setSaveState(nextState, message) {
    state.saveState = nextState;
    state.saveError = nextState === SAVE_FAILED ? message || 'Save failed.' : '';
    const element = $('#quizSaveStatus');
    if (!element) return;

    element.className = 'quiz-save-status';
    if (nextState === SAVE_SAVING) {
      element.classList.add('quiz-save-status-saving');
      element.textContent = message || 'Saving progress...';
      return;
    }
    if (nextState === SAVE_SAVED) {
      element.classList.add('quiz-save-status-saved');
      element.textContent = message || 'Progress saved.';
      return;
    }
    if (nextState === SAVE_FAILED) {
      element.classList.add('quiz-save-status-error');
      element.textContent = message || 'Unable to save progress.';
      return;
    }

    element.textContent = message || 'Progress will save automatically while you answer.';
  }

  function updateProgressSummary() {
    if (!state.quiz) {
      return;
    }

    const form = $('#quizForm');
    const summary = summarizeProgress(state.quiz, collectQuestionProgress(state.quiz, form));
    const sections = Array.isArray(state.quiz.sections) ? state.quiz.sections : [];
    const currentIndex = sections.findIndex((section) => section.id === state.activeSectionId);

    const sectionLabel = currentIndex >= 0
      ? `Section ${currentIndex + 1} of ${sections.length}`
      : `Section 0 of ${sections.length}`;
    const summaryText = summary.total
      ? `${summary.answered} of ${summary.total} question(s) answered.`
      : 'No quiz questions found.';

    const currentSectionText = sections[currentIndex]?.title
      ? `${sectionLabel}: ${sections[currentIndex].title}`
      : sectionLabel;

    const sectionLabelElement = $('#quizProgressSectionLabel');
    if (sectionLabelElement) {
      sectionLabelElement.textContent = currentSectionText;
    }
    const progressSummary = $('#quizProgressSummary');
    if (progressSummary) {
      progressSummary.textContent = summaryText;
    }
    const answeredCount = $('#quizAnsweredCount');
    if (answeredCount) {
      answeredCount.textContent = `Answered: ${summary.answered}`;
    }
    const remainingCount = $('#quizRemainingCount');
    if (remainingCount) {
      remainingCount.textContent = `Remaining: ${summary.remaining}`;
    }
    const requiredCount = $('#quizRequiredCount');
    if (requiredCount) {
      requiredCount.textContent = `Required missing: ${summary.missingRequired}`;
    }

    renderReviewPanel(summary);
  }

  function getReviewQuestionTone(question) {
    if (question.missingRequired) return 'quiz-review-item-required';
    if (question.missingOptional) return 'quiz-review-item-optional';
    return 'quiz-review-item-answered';
  }

  function getReviewQuestionLabel(question) {
    if (question.missingRequired) return 'Required missing';
    if (question.missingOptional) return 'Optional blank';
    return 'Answered';
  }

  function renderReviewPanel(summary) {
    const reviewSummary = $('#quizReviewSummary');
    if (reviewSummary) {
      reviewSummary.textContent = `${summary.answered} answered, ${summary.remaining} remaining, ${summary.missingRequired} required question(s) still blank.`;
    }

    const warning = $('#quizMissingWarning');
    if (warning) {
      if (summary.missingRequired > 0) {
        warning.hidden = false;
        warning.innerHTML = `
          <strong>Required questions are still blank.</strong>
          You can still submit this quiz, but review these items first if you want to complete them.
        `;
      } else {
        warning.hidden = true;
        warning.textContent = '';
      }
    }

    const list = $('#quizReviewList');
    if (!list) {
      return;
    }

    list.innerHTML = summary.bySection.map((section, sectionIndex) => `
      <section class="quiz-review-section">
        <div class="quiz-review-section-header">
          <div>
            <h3>Section ${sectionIndex + 1}: ${escapeHtml(section.title)}</h3>
            <p class="student-meta">${section.answered} of ${section.total} answered${section.missingRequired ? ` | ${section.missingRequired} required missing` : ''}</p>
          </div>
        </div>
        <div class="quiz-review-section-items">
          ${section.questions.map((question, questionIndex) => `
            <button
              type="button"
              class="quiz-review-item ${getReviewQuestionTone(question)}"
              data-review-jump-section="${escapeHtml(section.sectionId)}"
              data-review-jump-question="${escapeHtml(question.questionId)}"
            >
              <span class="quiz-review-item-index">Q${questionIndex + 1}</span>
              <span class="quiz-review-item-copy">
                <strong>${escapeHtml(question.prompt || 'Untitled question')}</strong>
                <span>${getReviewQuestionLabel(question)}</span>
              </span>
            </button>
          `).join('')}
        </div>
      </section>
    `).join('');

    list.querySelectorAll('[data-review-jump-section]').forEach((button) => {
      button.addEventListener('click', () => {
        jumpToQuestion(button.dataset.reviewJumpSection, button.dataset.reviewJumpQuestion);
      });
    });
  }

  function focusQuestion(questionId) {
    const card = root?.document?.querySelector(`[data-question-card="${questionId}"]`);
    if (!card) return;
    card.scrollIntoView({ block: 'start', behavior: 'smooth' });
    const focusTarget = card.querySelector('input, textarea');
    focusTarget?.focus();
  }

  function jumpToQuestion(sectionId, questionId) {
    state.reviewMode = false;
    state.pendingSubmitConfirmation = false;
    state.activeSectionId = sectionId || state.activeSectionId;
    syncSectionVisibility();
    focusQuestion(questionId);
  }

  function syncQuestionCardStates() {
    const form = $('#quizForm');
    if (!form || !state.quiz) {
      return;
    }

    const progressEntries = collectQuestionProgress(state.quiz, form);
    progressEntries.forEach((entry) => {
      const card = form.querySelector(`[data-question-card="${entry.questionId}"]`);
      if (!card) return;
      card.classList.toggle('quiz-question-answered', entry.answered);
      card.classList.toggle('quiz-question-required-missing', entry.missingRequired);
      card.classList.toggle('quiz-question-optional-missing', entry.missingOptional);
    });
  }

  function syncSectionVisibility() {
    const quiz = state.quiz;
    if (!quiz) {
      return;
    }

    const sections = Array.isArray(quiz.sections) ? quiz.sections : [];
    const activeSectionId = state.activeSectionId || sections[0]?.id || '';
    state.activeSectionId = activeSectionId;

    const form = $('#quizForm');
    root?.document?.querySelectorAll('[data-quiz-section-id]').forEach((sectionElement) => {
      sectionElement.hidden = state.reviewMode || sectionElement.dataset.quizSectionId !== activeSectionId;
    });

    const reviewPanel = $('#quizReviewPanel');
    if (reviewPanel) {
      reviewPanel.hidden = !state.reviewMode;
    }

    const prevButton = $('#prevSectionBtn');
    const nextButton = $('#nextSectionBtn');
    const reviewButton = $('#reviewQuizBtn');
    const backToQuizButton = $('#backToQuizBtn');
    const submitButton = $('#submitBtn');
    const sectionStatus = $('#sectionStatus');
    const status = $('#status');
    const currentIndex = sections.findIndex((section) => section.id === activeSectionId);
    const nextSectionId = resolveNextSectionId(quiz, activeSectionId, form);

    if (sectionStatus) {
      sectionStatus.textContent = state.reviewMode
        ? 'Reviewing all sections before submission'
        : currentIndex >= 0
          ? `Section ${currentIndex + 1} of ${sections.length}`
          : '';
    }

    if (prevButton) {
      prevButton.hidden = state.reviewMode || state.visitedSectionIds.length === 0;
      prevButton.disabled = state.reviewMode || state.visitedSectionIds.length === 0 || state.submitInFlight;
    }

    if (nextButton) {
      nextButton.hidden = state.reviewMode || !nextSectionId;
      nextButton.disabled = state.reviewMode || !nextSectionId || state.submitInFlight;
    }

    if (reviewButton) {
      reviewButton.hidden = state.reviewMode || Boolean(nextSectionId) || state.submitInFlight;
      reviewButton.disabled = Boolean(nextSectionId) || state.submitInFlight;
    }

    if (backToQuizButton) {
      backToQuizButton.hidden = !state.reviewMode;
      backToQuizButton.disabled = !state.reviewMode || state.submitInFlight;
    }

    if (submitButton) {
      submitButton.hidden = !state.reviewMode;
      submitButton.disabled = state.submitInFlight;
      submitButton.textContent = state.pendingSubmitConfirmation
        ? 'Submit With Blanks'
        : 'Submit Quiz';
    }

    if (status && !state.submitInFlight && !state.pendingSubmitConfirmation) {
      status.textContent = '';
    }

    syncQuestionCardStates();
    updateProgressSummary();
  }

  function queuePartialSave() {
    if (!state.attemptId || state.submitInFlight) {
      return;
    }

    setSaveState(SAVE_SAVING, 'Saving progress...');
    if (state.partialSaveTimer) {
      root.clearTimeout(state.partialSaveTimer);
    }
    state.partialSaveTimer = root.setTimeout(() => {
      state.partialSaveTimer = null;
      void savePartial();
    }, 500);
  }

  async function savePartial() {
    if (!state.quiz || !state.attemptId) {
      return [];
    }

    if (state.partialSavePromise) {
      return state.partialSavePromise;
    }

    const answers = collectAnswers(state.quiz, $('#quizForm'));
    setSaveState(SAVE_SAVING, 'Saving progress...');

    state.partialSavePromise = root.fetch(`/api/quizzes/${state.quiz._id}/attempts/${state.attemptId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to save progress.');
        }
        setSaveState(SAVE_SAVED, 'Progress saved.');
        return answers;
      })
      .catch((error) => {
        setSaveState(SAVE_FAILED, error.message || 'Unable to save progress.');
        throw error;
      })
      .finally(() => {
        state.partialSavePromise = null;
      });

    return state.partialSavePromise;
  }

  function enterReviewMode() {
    state.reviewMode = true;
    state.pendingSubmitConfirmation = false;
    setInlineMessage('', 'info');
    syncSectionVisibility();
  }

  function leaveReviewMode() {
    state.reviewMode = false;
    state.pendingSubmitConfirmation = false;
    setInlineMessage('', 'info');
    syncSectionVisibility();
  }

  function getMissingRequiredSummary() {
    if (!state.quiz) {
      return { missingRequired: 0, firstMissing: null };
    }

    const summary = summarizeProgress(state.quiz, collectQuestionProgress(state.quiz, $('#quizForm')));
    const firstMissingSection = summary.bySection.find((section) => section.questions.some((question) => question.missingRequired));
    const firstMissingQuestion = firstMissingSection?.questions.find((question) => question.missingRequired) || null;

    return {
      missingRequired: summary.missingRequired,
      firstMissing: firstMissingSection && firstMissingQuestion
        ? {
          sectionId: firstMissingSection.sectionId,
          questionId: firstMissingQuestion.questionId
        }
        : null
    };
  }

  async function submitQuiz() {
    const status = $('#status');
    const result = $('#result');
    const submitButton = $('#submitBtn');
    const missingSummary = getMissingRequiredSummary();

    if (missingSummary.missingRequired > 0 && !state.pendingSubmitConfirmation) {
      state.pendingSubmitConfirmation = true;
      status.textContent = `${missingSummary.missingRequired} required question(s) are still blank. Review them or submit anyway.`;
      setInlineMessage(
        `${missingSummary.missingRequired} required question(s) are still blank. You can still submit this quiz, but this is your confirmation step.`,
        'warning'
      );
      syncSectionVisibility();
      return;
    }

    state.submitInFlight = true;
    status.textContent = 'Submitting...';
    submitButton.disabled = true;
    setInlineMessage('', 'info');

    try {
      if (state.partialSaveTimer) {
        root.clearTimeout(state.partialSaveTimer);
        state.partialSaveTimer = null;
      }

      const answers = await savePartial();
      const submitResponse = await root.fetch(`/api/quizzes/${state.quiz._id}/attempts/${state.attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      const submitData = await submitResponse.json();
      if (!submitResponse.ok || !submitData.success) {
        throw new Error(submitData.message || 'Submit failed');
      }

      result.textContent = `Score: ${submitData.finalScore} / ${submitData.totalQuizPoints}`;
      status.textContent = 'Quiz submitted successfully.';
      setSaveState(SAVE_SAVED, 'Final answers submitted.');
      state.pendingSubmitConfirmation = false;
      $('#prevSectionBtn').disabled = true;
      $('#nextSectionBtn').disabled = true;
      $('#reviewQuizBtn').disabled = true;
      $('#backToQuizBtn').disabled = true;
    } catch (error) {
      status.textContent = error.message || 'Submit error';
      setInlineMessage(error.message || 'Unable to submit the quiz right now.', 'error');
    } finally {
      state.submitInFlight = false;
      syncSectionVisibility();
    }
  }

  function moveToNextSection() {
    const nextSectionId = resolveNextSectionId(state.quiz, state.activeSectionId, $('#quizForm'));
    if (!nextSectionId || nextSectionId === state.activeSectionId) {
      syncSectionVisibility();
      return;
    }

    state.visitedSectionIds.push(state.activeSectionId);
    state.activeSectionId = nextSectionId;
    syncSectionVisibility();
  }

  function moveToPreviousSection() {
    const previousSectionId = state.visitedSectionIds.pop();
    if (!previousSectionId) {
      syncSectionVisibility();
      return;
    }

    state.activeSectionId = previousSectionId;
    syncSectionVisibility();
  }

  function wireNavigation() {
    $('#prevSectionBtn')?.addEventListener('click', moveToPreviousSection);
    $('#nextSectionBtn')?.addEventListener('click', moveToNextSection);
    $('#reviewQuizBtn')?.addEventListener('click', enterReviewMode);
    $('#backToQuizBtn')?.addEventListener('click', leaveReviewMode);
    $('#submitBtn')?.addEventListener('click', submitQuiz);
    $('#quizForm')?.addEventListener('change', () => {
      state.pendingSubmitConfirmation = false;
      syncSectionVisibility();
      queuePartialSave();
    });
    $('#quizForm')?.addEventListener('input', () => {
      state.pendingSubmitConfirmation = false;
      syncSectionVisibility();
      queuePartialSave();
    });
  }

  function renderQuiz(quiz) {
    const form = $('#quizForm');
    const sections = buildRenderSections(quiz);
    state.quiz = {
      ...quiz,
      sections,
      questions: sections.flatMap((section) => section.questions)
    };
    state.activeSectionId = sections[0]?.id || '';
    state.visitedSectionIds = [];
    state.reviewMode = false;
    state.pendingSubmitConfirmation = false;
    setInlineMessage('', 'info');
    setSaveState(SAVE_IDLE, 'Progress will save automatically while you answer.');

    if (!state.quiz.questions.length) {
      form.innerHTML = '<div class="quiz-empty-state">This quiz has no questions yet.</div>';
      $('#submitBtn').disabled = true;
      $('#prevSectionBtn').hidden = true;
      $('#nextSectionBtn').hidden = true;
      $('#reviewQuizBtn').hidden = true;
      $('#backToQuizBtn').hidden = true;
      $('#quizReviewPanel').hidden = true;
      setInlineMessage('This quiz is available, but no questions have been added yet.', 'warning');
      updateProgressSummary();
      return;
    }

    form.innerHTML = sections.map((section, sectionIndex) => `
      <section class="quiz-section-group" data-quiz-section-id="${escapeHtml(section.id)}" hidden>
        ${section.title || section.description ? `
          <fieldset class="quiz-fieldset quiz-section-header">
            <legend class="quiz-legend">Section ${sectionIndex + 1}</legend>
            <p class="quiz-legend quiz-section-heading">${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</p>
            ${section.description ? `<p class="quiz-section-description">${escapeHtml(section.description)}</p>` : ''}
          </fieldset>
        ` : ''}
        ${section.questions.map((question, index) => renderQuestion(question, section.startNumber + index - 1)).join('')}
      </section>
    `).join('');

    syncSectionVisibility();
  }

  async function init() {
    const quizId = root.__QUIZ_ID__;
    if (!quizId) {
      return;
    }

    const title = $('#quizTitle');

    try {
      setSaveState(SAVE_IDLE, 'Loading quiz...');
      const quizResponse = await root.fetch(`/api/quizzes/${quizId}`);
      const quizData = await quizResponse.json();
      if (!quizResponse.ok || !quizData.success) {
        throw new Error(quizData.message || 'Quiz not found');
      }

      title.textContent = quizData.quiz.title || quizData.quiz.quizTitle || 'Quiz';
      $('#quizDescription').textContent = quizData.quiz.description || '';

      const startResponse = await root.fetch(`/api/quizzes/${quizId}/start`, { method: 'POST' });
      const startData = await startResponse.json();
      if (!startResponse.ok || !startData.success || !startData.attemptId) {
        throw new Error(startData.message || 'Cannot start attempt');
      }

      state.attemptId = startData.attemptId;
      renderQuiz(quizData.quiz);
      wireNavigation();
      setSaveState(SAVE_IDLE, 'Progress will save automatically while you answer.');
    } catch (error) {
      title.textContent = 'Error loading quiz';
      $('#quizForm').innerHTML = '<div class="quiz-empty-state">The quiz could not be loaded.</div>';
      setInlineMessage(error.message || 'Unexpected error', 'error');
      setSaveState(SAVE_FAILED, 'Quiz load failed.');
      $('#quizSectionNavigation').hidden = true;
      const submitRow = $('.quiz-submit-row');
      if (submitRow) {
        submitRow.hidden = true;
      }
    }
  }

  return {
    init,
    __testables: {
      buildRenderSections,
      getNextAuthoredSectionId,
      resolveNextSectionId,
      isQuestionAnswered,
      summarizeProgress
    }
  };
});
