(async function () {
  const quizId = window.__QUIZ_ID__;
  const tbody = document.getElementById('attemptsBody');
  try {
    const r = await fetch(`/api/quizzes/${quizId}/attempts`);
    const d = await r.json();
    if (!d.success) throw new Error(d.message || 'Failed to load attempts');

    const attempts = d.attempts || [];
    tbody.innerHTML = '';
    if (attempts.length === 0) {
      tbody.innerHTML = `<tr><td class="px-3 py-2 border text-gray-600" colspan="4">No submissions yet.</td></tr>`;
      return;
    }
    attempts.forEach(a => {
      const tr = document.createElement('tr');
      const name = a.userId?.toString?.() || 'Student';
      const submitted = a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '';
      tr.innerHTML = `
        <td class="px-3 py-2 border">${name}</td>
        <td class="px-3 py-2 border">${a.score ?? 0}</td>
        <td class="px-3 py-2 border">${a.finalScore ?? a.score ?? 0}</td>
        <td class="px-3 py-2 border">${submitted}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td class="px-3 py-2 border text-red-600" colspan="4">${e.message || 'Error'}</td></tr>`;
  }
})();