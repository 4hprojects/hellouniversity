(function attachTeacherQuizPreview(global) {
    async function init() {
        const quizId = document.body?.dataset?.quizId;
        if (!quizId) return;

        try {
            const response = await fetch(`/api/quiz-builder/quizzes/${encodeURIComponent(quizId)}`, { credentials: 'include' });
            const data = await response.json();
            if (!response.ok || !data.success || !data.quiz) throw new Error(data.message || 'Failed to load quiz preview.');
            renderPreview(data.quiz);
        } catch (error) {
            console.error('Quiz preview load failed:', error);
            document.getElementById('teacherQuizPreviewDescription').textContent = error.message || 'Unable to load quiz preview.';
        }
    }

    function renderPreview(quiz) {
        document.getElementById('teacherQuizPreviewTitle').textContent = quiz.title || quiz.quizTitle || 'Preview Quiz';
        document.getElementById('teacherQuizPreviewDescription').textContent = quiz.description || 'No instructions provided.';

        const meta = document.getElementById('teacherQuizPreviewMeta');
        if (meta) {
            meta.innerHTML = `<div class="teacher-list-card"><p class="teacher-meta">Subject: ${escapeHtml(quiz.subject || 'Not set')}</p><p class="teacher-meta">Class: ${escapeHtml(quiz.classLabel || 'No class assigned')}</p><p class="teacher-meta">Type: ${escapeHtml(quiz.type || 'graded')}</p><p class="teacher-meta">Questions: ${Array.isArray(quiz.questions) ? quiz.questions.length : 0}</p></div>`;
        }

        const questionsContainer = document.getElementById('teacherQuizPreviewQuestions');
        if (!questionsContainer) return;

        const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
        if (!questions.length) {
            questionsContainer.innerHTML = '<article class="teacher-card"><p class="teacher-empty-state">This quiz has no questions yet.</p></article>';
            return;
        }

        const sections = buildPreviewSections(quiz, questions);
        questionsContainer.innerHTML = sections.map((section, sectionIndex) => `
            <section class="teacher-list-stack">
                <article class="teacher-card">
                    <p class="teacher-eyebrow">Section ${sectionIndex + 1}</p>
                    <h2>${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</h2>
                    ${section.description ? `<p class="teacher-meta">${escapeHtml(section.description)}</p>` : ''}
                </article>
                ${section.questions.map((question, index) => `
                    <article class="teacher-card">
                        <p class="teacher-eyebrow">Question ${index + section.startNumber}</p>
                        <h2>${escapeHtml(question.title || 'Untitled question')}</h2>
                        <p class="teacher-meta">${escapeHtml(question.description || '')}</p>
                        <p class="teacher-meta">Type: ${escapeHtml(question.type || 'question')} | Points: ${Number(question.points || 0)}</p>
                        ${renderAnswerSurface(question)}
                    </article>
                `).join('')}
            </section>
        `).join('');
    }

    function buildPreviewSections(quiz, questions) {
        if (Array.isArray(quiz.sections) && quiz.sections.length) {
            let startNumber = 1;
            return quiz.sections.map((section, sectionIndex) => {
                const sectionQuestions = questions.filter((question) => question.sectionId === section.id);
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
            questions
        }];
    }

    function renderAnswerSurface(question) {
        if (question.type === 'short_answer') return '<input type="text" class="teacher-input" placeholder="Short answer" disabled>';
        if (question.type === 'paragraph') return '<textarea class="teacher-textarea" placeholder="Long answer" disabled></textarea>';

        return `<div class="teacher-list-stack">${(Array.isArray(question.options) ? question.options : []).map((option) => `
            <label class="teacher-option-row">
                <input type="${question.type === 'checkbox' ? 'checkbox' : 'radio'}" disabled>
                <span>${escapeHtml(option)}</span>
            </label>
        `).join('')}</div>`;
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    document.addEventListener('DOMContentLoaded', init);
    global.teacherQuizPreview = { init };
})(window);
