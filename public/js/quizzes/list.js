(async function () {
  const list = document.getElementById('quizList');
  const empty = document.getElementById('emptyState');
  empty.textContent = 'Loading...';
  try {
    const res = await fetch('/api/quizzes'); // defaults to mine=1 in API
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to load quizzes');
    const quizzes = data.quizzes || [];
    if (quizzes.length === 0) {
      empty.textContent = 'No quizzes yet. Create your first quiz.';
      return;
    }
    empty.remove();
    quizzes.forEach(q => {
      const questionCount = q.questionCount ?? (Array.isArray(q.questions) ? q.questions.length : 0);
      const createdAt = q.createdAt ? new Date(q.createdAt).toLocaleString() : '';
      const title = q.title || '(Untitled)';
      const id = q._id;

      const card = document.createElement('a');
      card.href = `/teacher/quizzes/${id}/results`;
      card.className = 'block border rounded p-4 bg-white hover:shadow';
      card.innerHTML = `
        <div class="font-semibold mb-1 truncate" title="${title}">${title}</div>
        <div class="text-sm text-gray-600">Questions: ${questionCount}</div>
        <div class="text-xs text-gray-500 mt-1">Created: ${createdAt}</div>
        <div class="mt-3 text-green-700 underline">View Results</div>
      `;
      list.appendChild(card);
    });
  } catch (e) {
    empty.textContent = 'Error loading quizzes.';
  }
})();