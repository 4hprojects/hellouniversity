(function attachTeacherQuizResponses(global) {
    async function init() {
        const quizId = document.body?.dataset?.quizId;
        if (!quizId) return;

        try {
            const [quizResponse, responsesResponse] = await Promise.all([
                fetch(`/api/quiz-builder/quizzes/${encodeURIComponent(quizId)}`, { credentials: 'include' }),
                fetch(`/api/quiz-builder/quizzes/${encodeURIComponent(quizId)}/responses`, { credentials: 'include' })
            ]);
            const quizData = await quizResponse.json();
            const responsesData = await responsesResponse.json();

            if (!quizResponse.ok || !quizData.success || !quizData.quiz) throw new Error(quizData.message || 'Failed to load quiz.');
            if (!responsesResponse.ok || !responsesData.success) throw new Error(responsesData.message || 'Failed to load responses.');

            document.getElementById('teacherQuizResponsesTitle').textContent = `${quizData.quiz.title || quizData.quiz.quizTitle || 'Quiz'} Responses`;
            renderResponses(responsesData.responses || []);
        } catch (error) {
            console.error('Quiz responses load failed:', error);
            document.getElementById('teacherQuizResponsesStatus').textContent = error.message || 'Unable to load responses.';
        }
    }

    function renderResponses(rows) {
        const tbody = document.getElementById('teacherQuizResponsesBody');
        const status = document.getElementById('teacherQuizResponsesStatus');
        if (!tbody || !status) return;

        if (!rows.length) {
            status.textContent = 'No responses yet.';
            tbody.innerHTML = '<tr><td colspan="7" class="teacher-meta">No responses have been submitted for this quiz yet.</td></tr>';
            return;
        }

        status.textContent = `${rows.length} response(s) loaded.`;
        tbody.innerHTML = rows.map((row) => `
            <tr>
                <td>${escapeHtml(row.studentName || 'Student')}</td>
                <td>${escapeHtml(row.studentIDNumber || '')}</td>
                <td>${escapeHtml(formatDate(row.submittedAt))}</td>
                <td>${escapeHtml(formatDuration(row.durationSeconds))}</td>
                <td>${Number(row.attemptNumber || 1)}</td>
                <td>${Number(row.score || 0)} / ${Number(row.scorePossible || 0)}</td>
                <td>${escapeHtml(row.status || 'submitted')}</td>
            </tr>
        `).join('');
    }

    function formatDate(value) {
        if (!value) return 'Not submitted';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not submitted';
        return date.toLocaleString();
    }

    function formatDuration(seconds) {
        if (!seconds) return 'N/A';
        const mins = Math.floor(Number(seconds) / 60);
        const secs = Number(seconds) % 60;
        return `${mins}m ${secs}s`;
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    document.addEventListener('DOMContentLoaded', init);
    global.teacherQuizResponses = { init };
})(window);
