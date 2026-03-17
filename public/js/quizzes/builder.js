(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  const questions = [];

  function render() {
    const container = $('#questionsContainer');
    container.innerHTML = '';
    questions.forEach((q, qi) => {
      const card = document.createElement('div');
      card.className = 'border rounded p-4';
      card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
          <div class="font-semibold">Question ${qi + 1}</div>
          <button type="button" data-action="remove-q" data-qi="${qi}" class="text-red-600 hover:underline">Remove</button>
        </div>
        <label class="block mb-3">
          <span class="text-sm text-gray-600">Question Text</span>
          <input type="text" class="mt-1 w-full border rounded px-3 py-2" data-field="text" data-qi="${qi}" value="${q.text || ''}" placeholder="Enter question..." />
        </label>
        <div class="mb-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Choices (select the correct answer)</span>
            <button type="button" data-action="add-choice" data-qi="${qi}" class="text-green-700 hover:underline">+ Add choice</button>
          </div>
          <div class="mt-2 space-y-2" data-role="choices">
            ${q.choices.map((c, ci) => `
              <div class="flex items-center gap-2">
                <input type="radio" name="correct-${qi}" value="${ci}" ${q.correctAnswer === ci ? 'checked' : ''} data-action="set-correct" data-qi="${qi}" data-ci="${ci}" />
                <input type="text" class="flex-1 border rounded px-3 py-2" data-field="choice" data-qi="${qi}" data-ci="${ci}" value="${c}" placeholder="Choice ${ci + 1}" />
                <button type="button" class="text-red-600 hover:underline" data-action="remove-choice" data-qi="${qi}" data-ci="${ci}">Remove</button>
              </div>
            `).join('')}
          </div>
        </div>
        <label class="block">
          <span class="text-sm text-gray-600">Points</span>
          <input type="number" min="0" class="mt-1 w-32 border rounded px-3 py-2" data-field="points" data-qi="${qi}" value="${q.points ?? 1}" />
        </label>
      `;
      container.appendChild(card);
    });
  }

  function addQuestion() {
    questions.push({ text: '', choices: ['', ''], correctAnswer: 0, points: 1 });
    render();
  }
  function removeQuestion(qi) { questions.splice(qi, 1); render(); }
  function addChoice(qi) { questions[qi].choices.push(''); render(); }
  function removeChoice(qi, ci) {
    questions[qi].choices.splice(ci, 1);
    if (questions[qi].correctAnswer >= questions[qi].choices.length) {
      questions[qi].correctAnswer = Math.max(0, questions[qi].choices.length - 1);
    }
    render();
  }
  function setCorrect(qi, ci) { questions[qi].correctAnswer = ci; }

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.field === 'text') {
      questions[Number(t.dataset.qi)].text = t.value;
    } else if (t.dataset.field === 'choice') {
      questions[Number(t.dataset.qi)].choices[Number(t.dataset.ci)] = t.value;
    } else if (t.dataset.field === 'points') {
      questions[Number(t.dataset.qi)].points = Number(t.value || 0);
    }
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    const r = e.target.closest('input[type="radio"][data-action="set-correct"]');
    if (b) {
      const { action } = b.dataset;
      if (action === 'remove-q') removeQuestion(Number(b.dataset.qi));
      if (action === 'add-choice') addChoice(Number(b.dataset.qi));
      if (action === 'remove-choice') removeChoice(Number(b.dataset.qi), Number(b.dataset.ci));
    } else if (r) {
      setCorrect(Number(r.dataset.qi), Number(r.dataset.ci));
    }
  });

  async function saveQuiz() {
    const quizTitle = $('#quizTitle').value.trim();
    const description = $('#description').value.trim();
    const maxAttempts = Math.max(1, Number($('#attemptsAllowed').value || 1));
    const duration = Math.max(0, Number($('#timeLimit').value || 0));
    const dueDateVal = $('#dueDate')?.value || '';
    const latePenaltyPercent = Math.max(0, Math.min(100, Number($('#latePenaltyPercent')?.value || 0)));

    const errEl = $('#formError');
    const okEl = $('#formSuccess');
    errEl.textContent = '';
    okEl.textContent = '';

    if (!quizTitle) return errEl.textContent = 'Title is required.';
    if (questions.length === 0) return errEl.textContent = 'Add at least one question.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return errEl.textContent = `Question ${i + 1}: text is required.`;
      const choices = q.choices.map(c => (c || '').trim()).filter(Boolean);
      if (choices.length < 2) return errEl.textContent = `Question ${i + 1}: need at least 2 choices.`;
      if (q.correctAnswer == null || q.correctAnswer < 0 || q.correctAnswer >= q.choices.length) {
        return errEl.textContent = `Question ${i + 1}: select a correct answer.`;
      }
    }

    const payload = {
      quizTitle,
      description,
      questions: questions.map(q => ({
        text: q.text.trim(),
        choices: q.choices.map(c => String(c || '').trim()),
        correctAnswer: Number(q.correctAnswer),
        points: Number(q.points ?? 1)
      })),
      dueDate: dueDateVal ? new Date(dueDateVal).toISOString() : null,
      latePenaltyPercent,
      maxAttempts,
      duration
    };

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create quiz.');
      okEl.textContent = 'Quiz created.';
      setTimeout(() => window.location.href = '/teacher/quizzes', 600);
    } catch (err) {
      errEl.textContent = err.message || 'Network error.';
    }
  }

  $('#addQuestionBtn').addEventListener('click', addQuestion);
  $('#saveQuizBtn').addEventListener('click', saveQuiz);

  addQuestion();
})();