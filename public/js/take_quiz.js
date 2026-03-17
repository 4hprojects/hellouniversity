let quizData = null;
let currentAttemptId = '';

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
      <article class="bg-white shadow rounded p-4 space-y-3">
        <div>
          <p class="text-lg font-medium">${index + 1}. ${escapeHtml(question.text || question.questionText)}</p>
          ${description}
        </div>
        <input type="text" class="w-full rounded border px-3 py-2" data-question-id="${escapeHtml(question.id)}" data-question-type="${escapeHtml(question.type)}" placeholder="Type your answer">
      </article>
    `;
  }

  if (question.type === 'paragraph') {
    return `
      <article class="bg-white shadow rounded p-4 space-y-3">
        <div>
          <p class="text-lg font-medium">${index + 1}. ${escapeHtml(question.text || question.questionText)}</p>
          ${description}
        </div>
        <textarea class="w-full rounded border px-3 py-2 min-h-32" data-question-id="${escapeHtml(question.id)}" data-question-type="${escapeHtml(question.type)}" placeholder="Write your answer"></textarea>
      </article>
    `;
  }

  const inputType = question.type === 'checkbox' ? 'checkbox' : 'radio';
  const choices = Array.isArray(question.choices) ? question.choices : [];

  return `
    <article class="bg-white shadow rounded p-4 space-y-3">
      <div>
        <p class="text-lg font-medium">${index + 1}. ${escapeHtml(question.text || question.questionText)}</p>
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
            >
            <span>${escapeHtml(choice)}</span>
          </label>
        `).join('')}
      </div>
    </article>
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

function collectAnswers() {
  const form = document.getElementById('quizForm');
  return quizData.questions.map((question) => {
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

async function savePartial() {
  const answers = collectAnswers();
  await fetch(`/api/quizzes/${quizData._id}/attempts/${currentAttemptId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  });
  return answers;
}

async function submitQuiz() {
  const status = document.getElementById('status');
  status.textContent = 'Submitting...';

  try {
    const answers = await savePartial();
    const response = await fetch(`/api/quizzes/${quizData._id}/attempts/${currentAttemptId}/submit`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to submit quiz.');
    }

    document.getElementById('resultContainer').classList.remove('hidden');
    document.getElementById('scoreValue').textContent = data.finalScore;
    document.getElementById('scoreTotal').textContent = data.totalQuizPoints;
    document.getElementById('quizForm').classList.add('hidden');
    document.getElementById('submitBtn').disabled = true;
    status.textContent = '';
  } catch (error) {
    console.error('Error submitting quiz:', error);
    status.textContent = error.message || 'An error occurred while submitting your quiz.';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('quizId');
  if (!quizId) {
    alert('No quizId provided.');
    return;
  }

  try {
    const quizResponse = await fetch(`/api/quizzes/${quizId}`, { credentials: 'include' });
    const quizPayload = await quizResponse.json();
    if (!quizResponse.ok || !quizPayload.success) {
      throw new Error(quizPayload.message || 'Failed to load quiz.');
    }

    quizData = quizPayload.quiz;
    document.getElementById('quizTitle').textContent = quizData.title || quizData.quizTitle || 'Untitled Quiz';
    document.getElementById('quizDescription').textContent = quizData.description || '';

    const startResponse = await fetch(`/api/quizzes/${quizId}/start`, {
      method: 'POST',
      credentials: 'include'
    });
    const startPayload = await startResponse.json();
    if (!startResponse.ok || !startPayload.success || !startPayload.attemptId) {
      throw new Error(startPayload.message || 'Unable to start quiz.');
    }
    currentAttemptId = startPayload.attemptId;

    const form = document.getElementById('quizForm');
    if (!Array.isArray(quizData.questions) || !quizData.questions.length) {
      form.innerHTML = '<div class="bg-white shadow rounded p-4 text-sm text-gray-600">This quiz has no questions yet.</div>';
      document.getElementById('submitBtn').disabled = true;
      return;
    }

    form.innerHTML = buildRenderSections(quizData).map((section, sectionIndex) => `
      <section class="space-y-4">
        ${section.title || section.description ? `
          <article class="bg-white shadow rounded p-4 space-y-2 border-l-4 border-emerald-500">
            <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Section ${sectionIndex + 1}</p>
            <h2 class="text-xl font-semibold">${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</h2>
            ${section.description ? `<p class="text-sm text-gray-600">${escapeHtml(section.description)}</p>` : ''}
          </article>
        ` : ''}
        ${section.questions.map((question, index) => renderQuestion(question, section.startNumber + index - 1)).join('')}
      </section>
    `).join('');
    document.getElementById('submitBtn').addEventListener('click', submitQuiz);
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    alert(error.message || 'An error occurred while loading the quiz.');
  }
});
