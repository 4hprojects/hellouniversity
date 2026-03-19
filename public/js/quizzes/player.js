(async function () {
  const quizId = window.__QUIZ_ID__;
  const $ = (selector, root = document) => root.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
        <fieldset class="quiz-fieldset">
          <legend class="quiz-legend">${index + 1}. ${escapeHtml(question.text)}${requiredMark}</legend>
          ${description}
          <input type="text" class="quiz-text-input" data-question-id="${escapeHtml(question.id)}" data-question-type="${escapeHtml(question.type)}" placeholder="Type your answer"${question.required ? ' required' : ''}>
          ${requiredNote}
        </fieldset>
      `;
    }

    if (question.type === 'paragraph') {
      return `
        <fieldset class="quiz-fieldset">
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
      <fieldset class="quiz-fieldset">
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

  function collectAnswers(quiz, form) {
    return quiz.questions.map((question) => {
      if (question.type === 'checkbox') {
        const selected = Array.from(form.querySelectorAll(`input[name="q-${question.id}"]:checked`))
          .map((input) => Number(input.value))
          .filter((value) => Number.isInteger(value) && value >= 0);
        return { questionId: question.id, choiceIndexes: selected };
      }

      if (question.type === 'short_answer' || question.type === 'paragraph') {
        const field = form.querySelector(`[data-question-id="${question.id}"][data-question-type="${question.type}"]`);
        return { questionId: question.id, text: field?.value?.trim() || '' };
      }

      const selected = form.querySelector(`input[name="q-${question.id}"]:checked`);
      return { questionId: question.id, choiceIndex: selected ? Number(selected.value) : -1 };
    });
  }

  try {
    const quizResponse = await fetch(`/api/quizzes/${quizId}`);
    const quizData = await quizResponse.json();
    if (!quizResponse.ok || !quizData.success) {
      throw new Error(quizData.message || 'Quiz not found');
    }

    const quiz = quizData.quiz;
    $('#quizTitle').textContent = quiz.title || quiz.quizTitle || 'Quiz';

    const startResponse = await fetch(`/api/quizzes/${quizId}/start`, { method: 'POST' });
    const startData = await startResponse.json();
    if (!startResponse.ok || !startData.success || !startData.attemptId) {
      throw new Error(startData.message || 'Cannot start attempt');
    }
    const attemptId = startData.attemptId;

    const form = $('#quizForm');
    if (!Array.isArray(quiz.questions) || !quiz.questions.length) {
      form.innerHTML = '<div class="quiz-empty-state">This quiz has no questions yet.</div>';
      $('#submitBtn').disabled = true;
      return;
    }

    form.innerHTML = buildRenderSections(quiz).map((section, sectionIndex) => `
      <section class="quiz-section-group">
        ${section.title || section.description ? `
          <fieldset class="quiz-fieldset quiz-section-header">
            <legend class="quiz-legend">Section ${sectionIndex + 1}</legend>
            <p class="quiz-legend" style="margin:0">${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</p>
            ${section.description ? `<p class="quiz-section-description">${escapeHtml(section.description)}</p>` : ''}
          </fieldset>
        ` : ''}
        ${section.questions.map((question, index) => renderQuestion(question, section.startNumber + index - 1)).join('')}
      </section>
    `).join('');

    async function savePartial() {
      const answers = collectAnswers(quiz, form);
      await fetch(`/api/quizzes/${quizId}/attempts/${attemptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      return answers;
    }

    $('#submitBtn').addEventListener('click', async () => {
      $('#status').textContent = 'Submitting...';
      try {
        const answers = await savePartial();
        const submitResponse = await fetch(`/api/quizzes/${quizId}/attempts/${attemptId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers })
        });
        const submitData = await submitResponse.json();
        if (!submitResponse.ok || !submitData.success) {
          throw new Error(submitData.message || 'Submit failed');
        }

        $('#result').textContent = `Score: ${submitData.finalScore} / ${submitData.totalQuizPoints}`;
        $('#status').textContent = '';
        $('#submitBtn').disabled = true;
      } catch (error) {
        $('#status').textContent = error.message || 'Submit error';
      }
    });
  } catch (error) {
    $('#quizTitle').textContent = 'Error loading quiz';
    const message = document.createElement('div');
    message.className = 'quiz-error';
    message.textContent = error.message || 'Unexpected error';
    document.body.appendChild(message);
  }
})();
