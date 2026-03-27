(function attachTeacherQuizDashboard(global) {
    const state = { quizzes: [] };

    function init() {
        document.getElementById('teacherQuizSearchInput')?.addEventListener('input', render);
        document.getElementById('teacherQuizStatusFilter')?.addEventListener('change', loadQuizzes);
        document.getElementById('teacherQuizRefreshButton')?.addEventListener('click', loadQuizzes);
        loadQuizzes();
    }

    async function loadQuizzes() {
        setStatus('Loading quizzes...');

        try {
            const params = new URLSearchParams();
            const status = document.getElementById('teacherQuizStatusFilter')?.value || '';
            if (status) params.set('status', status);

            const response = await fetch(`/api/quiz-builder/quizzes${params.toString() ? `?${params.toString()}` : ''}`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load quizzes.');
            }

            state.quizzes = Array.isArray(data.quizzes) ? data.quizzes : [];
            updateSummary();
            render();
        } catch (error) {
            console.error('Teacher quiz dashboard load failed:', error);
            state.quizzes = [];
            updateSummary();
            renderCards([]);
            setStatus(error.message || 'Unable to load quizzes.');
        }
    }

    function render() {
        const query = (document.getElementById('teacherQuizSearchInput')?.value || '').trim().toLowerCase();
        const quizzes = state.quizzes.filter((quiz) => {
            if (!query) return true;
            return [quiz.title, quiz.subject, quiz.classLabel].some((value) => String(value || '').toLowerCase().includes(query));
        });

        renderCards(quizzes);
        setStatus(
            quizzes.length === state.quizzes.length
                ? `${quizzes.length} quiz(es) loaded.`
                : `${quizzes.length} of ${state.quizzes.length} quiz(es) match your search.`
        );
    }

    function renderCards(quizzes) {
        const container = document.getElementById('teacherQuizDashboardCards');
        if (!container) return;

        if (!quizzes.length) {
            container.innerHTML = '<article class="teacher-card"><p class="teacher-empty-state">No quizzes found for the current filters.</p></article>';
            return;
        }

        container.innerHTML = quizzes.map((quiz) => {
            const status = String(quiz.status || 'draft');
            const badgeClass = status === 'published'
                ? 'teacher-badge-live'
                : status === 'draft'
                    ? 'teacher-badge-draft'
                    : 'teacher-badge-muted';

            return `
                <article class="teacher-card teacher-card-split">
                    <div>
                        <div class="teacher-card-header">
                            <div>
                                <p class="teacher-eyebrow">${escapeHtml(quiz.subject || 'Subject')}</p>
                                <h2>${escapeHtml(quiz.title || 'Untitled Quiz')}</h2>
                            </div>
                            <span class="teacher-badge ${badgeClass}">${escapeHtml(status)}</span>
                        </div>
                        <p class="teacher-meta">${escapeHtml(quiz.classLabel || 'No class assigned')}</p>
                        <p class="teacher-meta">${Number(quiz.questionCount || 0)} question(s) | ${Number(quiz.totalPoints || 0)} point(s)</p>
                        <p class="teacher-meta">${Number(quiz.responseCount || 0)} response(s) | Updated ${formatDate(quiz.updatedAt)}</p>
                    </div>
                    <div class="teacher-card-actions">
                        <a href="/teacher/quizzes/${encodeURIComponent(quiz._id)}/edit" class="teacher-btn teacher-btn-secondary">Edit</a>
                        <a href="/teacher/quizzes/${encodeURIComponent(quiz._id)}/preview" class="teacher-btn teacher-btn-secondary">Preview</a>
                        <a href="/teacher/quizzes/${encodeURIComponent(quiz._id)}/responses" class="teacher-btn teacher-btn-secondary">Responses</a>
                        ${getShareLinkActionMarkup(quiz)}
                        <button type="button" class="teacher-btn teacher-btn-secondary" data-action="duplicate" data-quiz-id="${escapeHtml(quiz._id)}">Duplicate</button>
                        <button type="button" class="teacher-btn teacher-btn-secondary" data-action="${status === 'archived' ? 'restore' : (status === 'published' ? 'close' : 'publish')}" data-quiz-id="${escapeHtml(quiz._id)}">${status === 'archived' ? 'Restore' : (status === 'published' ? 'Close' : 'Publish')}</button>
                        <button type="button" class="teacher-btn teacher-btn-secondary" data-action="archive" data-quiz-id="${escapeHtml(quiz._id)}">Archive</button>
                    </div>
                </article>
            `;
        }).join('');

        container.querySelectorAll('[data-action]').forEach((button) => {
            button.addEventListener('click', () => runAction(button.dataset.quizId, button.dataset.action));
        });
        container.querySelectorAll('[data-copy-link]').forEach((button) => {
            button.addEventListener('click', () => copyShareLink(button.dataset.quizId));
        });
    }

    async function runAction(quizId, action) {
        const paths = {
            duplicate: 'duplicate',
            publish: 'publish',
            close: 'close',
            archive: 'archive',
            restore: 'restore'
        };
        if (!paths[action]) return;

        setStatus(`${action.charAt(0).toUpperCase() + action.slice(1)} in progress...`);

        try {
            const response = await fetch(`/api/quiz-builder/quizzes/${encodeURIComponent(quizId)}/${paths[action]}`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || `Failed to ${action} quiz.`);
            }

            await loadQuizzes();
        } catch (error) {
            console.error(`Teacher quiz ${action} failed:`, error);
            setStatus(error.message || `Unable to ${action} quiz.`);
        }
    }

    async function copyShareLink(quizId) {
        try {
            await copyText(buildResponderUrl(quizId));
            setStatus('Responder link copied.');
        } catch (error) {
            console.error('Teacher quiz link copy failed:', error);
            setStatus('Unable to copy responder link.');
        }
    }

    function updateSummary() {
        const published = state.quizzes.filter((quiz) => quiz.status === 'published').length;
        const draft = state.quizzes.filter((quiz) => quiz.status === 'draft').length;
        const inactive = state.quizzes.filter((quiz) => quiz.status === 'closed' || quiz.status === 'archived').length;

        setText('teacherQuizTotalCount', String(state.quizzes.length));
        setText('teacherQuizPublishedCount', String(published));
        setText('teacherQuizDraftCount', String(draft));
        setText('teacherQuizInactiveCount', String(inactive));
    }

    function setStatus(message) {
        setText('teacherQuizDashboardStatus', message);
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function formatDate(value) {
        if (!value) return 'recently';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'recently';
        return date.toLocaleString();
    }

    function buildResponderPath(quizId) {
        return `/quizzes/${encodeURIComponent(String(quizId || ''))}/respond`;
    }

    function buildResponderUrl(quizId) {
        const origin = global.location?.origin || '';
        return `${origin}${buildResponderPath(quizId)}`;
    }

    async function copyText(value) {
        if (global.navigator?.clipboard?.writeText) {
            await global.navigator.clipboard.writeText(value);
            return;
        }

        const input = document.createElement('textarea');
        input.value = value;
        input.setAttribute('readonly', 'readonly');
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    }

    function getShareLinkActionMarkup(quiz) {
        if (String(quiz?.status || '').toLowerCase() !== 'published') {
            return '';
        }

        return `<button type="button" class="teacher-btn teacher-btn-secondary" data-copy-link="true" data-quiz-id="${escapeHtml(quiz._id)}">Copy Link</button>`;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    if (typeof document !== 'undefined' && document?.addEventListener) {
        document.addEventListener('DOMContentLoaded', init);
    }
    global.teacherQuizDashboard = { init };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            __testables: {
                buildResponderPath,
                getShareLinkActionMarkup
            }
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
