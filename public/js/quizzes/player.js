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
      ? `<p class="mb-3 text-sm text-gray-600">${escapeHtml(question.description)}</p>`
      : '';

    if (question.type === 'short_answer') {
      return `
        <div class="border rounded p-4 bg-white space-y-3">
          <div>
            <div class="mb-1 font-semibold">${index + 1}. ${escapeHtml(question.text)}</div>
            ${description}
          </div>
          <input type="text" class="w-full rounded border px-3 py-2" data-question-id="${escapeHtml(question.id)}" data-question-type="${escapeHtml(question.type)}" placeholder="Type your answer">
        </div>
      `;
    }

    if (question.type === 'paragraph') {
      return `
        <div class="border rounded p-4 bg-white space-y-3">
          <div>
            <div class="mb-1 font-semibold">${index + 1}. ${escapeHtml(question.text)}</div>
            ${description}
          </div>
          <textarea class="w-full rounded border px-3 py-2 min-h-28" data-question-id="${escapeHtml(question.id)}" data-question-type="${escapeHtml(question.type)}" placeholder="Write your answer"></textarea>
        </div>
      `;
    }

    const inputType = question.type === 'checkbox' ? 'checkbox' : 'radio';
    const choices = Array.isArray(question.choices) ? question.choices : [];

    return `
      <div class="border rounded p-4 bg-white space-y-3">
        <div>
          <div class="mb-1 font-semibold">${index + 1}. ${escapeHtml(question.text)}</div>
          ${description}
        </div>
        <div class="space-y-2">
          ${choices.map((choice, choiceIndex) => `
            <label class="flex items-start gap-3 rounded border border-gray-200 px-3 py-2">
              <input
                type="${inputType}"
                name="q-${escapeHtml(question.id)}"
                value="${choiceIndex}"
                data-question-id="${escapeHtml(question.id)}"
                data-question-type="${escapeHtml(question.type)}"
                class="mt-1"
              />
              <span>${escapeHtml(choice)}</span>
            </label>
          `).join('')}
        </div>
      </div>
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
      form.innerHTML = '<div class="rounded border bg-white p-4 text-sm text-gray-600">This quiz has no questions yet.</div>';
      $('#submitBtn').disabled = true;
      return;
    }

    form.innerHTML = buildRenderSections(quiz).map((section, sectionIndex) => `
      <section class="space-y-4">
        ${section.title || section.description ? `
          <div class="rounded border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
            <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Section ${sectionIndex + 1}</div>
            <div class="text-lg font-semibold">${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</div>
            ${section.description ? `<div class="mt-1 text-sm text-gray-600">${escapeHtml(section.description)}</div>` : ''}
          </div>
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
    message.className = 'text-red-600';
    message.textContent = error.message || 'Unexpected error';
    document.body.appendChild(message);
  }
})();
