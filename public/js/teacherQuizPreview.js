(function attachTeacherQuizPreview(global) {
    async function init() {
        const quizId = document.body?.dataset?.quizId;
        if (!quizId) return;

        try {
            const response = await fetch(`/api/quiz-builder/quizzes/${encodeURIComponent(quizId)}`, { credentials: 'include' });
            const data = await response.json();
            if (!response.ok || !data.success || !data.quiz) {
                throw new Error(data.message || 'Failed to load quiz preview.');
            }

            renderPreview(data.quiz);
        } catch (error) {
            console.error('Quiz preview load failed:', error);
            renderErrorState(error.message || 'Unable to load quiz preview.');
        }
    }

    function renderPreview(quiz) {
        const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
        const sections = buildPreviewSections(quiz, questions);

        setText('teacherQuizPreviewTitle', quiz.title || quiz.quizTitle || 'Preview Quiz');
        setText(
            'teacherQuizPreviewDescription',
            quiz.description || 'Use this saved preview to check instructions, sections, and question layout before publishing.'
        );

        clearStateRegion();
        renderSummarySignals(quiz, questions);
        renderPreviewNotice();
        renderSectionNav(sections, questions.length);
        renderQuestions(sections, questions.length);
    }

    function renderSummarySignals(quiz, questions) {
        const meta = document.getElementById('teacherQuizPreviewMeta');
        if (!meta) return;

        const totalPoints = questions.reduce((sum, question) => sum + Number(question.points || 0), 0);
        const settings = quiz.settings || {};
        const signals = [
            { label: 'Status', value: formatStatus(quiz.status || 'draft') },
            { label: 'Class', value: quiz.classLabel || 'No class assigned' },
            { label: 'Type', value: formatLabel(quiz.type || 'graded') },
            { label: 'Questions', value: String(questions.length) },
            { label: 'Total Points', value: formatPoints(totalPoints) },
            { label: 'Start Date', value: formatDateTime(settings.startAt, 'Not scheduled') },
            { label: 'End Date', value: formatDateTime(settings.endAt, 'No closing date') },
            { label: 'Time Limit', value: formatTimeLimit(settings.timeLimitMinutes) },
            { label: 'Score Visibility', value: formatScoreMode(settings.showScoreMode) }
        ];

        meta.innerHTML = signals.map((signal) => `
            <article class="teacher-quiz-preview-signal-card">
                <span class="teacher-quiz-preview-signal-label">${escapeHtml(signal.label)}</span>
                <strong class="teacher-quiz-preview-signal-value">${escapeHtml(signal.value)}</strong>
            </article>
        `).join('');
    }

    function renderPreviewNotice() {
        const container = document.getElementById('teacherQuizPreviewNotice');
        if (!container) return;

        container.innerHTML = `
            <div class="teacher-quiz-preview-callout-icon" aria-hidden="true">
                <span class="material-icons">visibility</span>
            </div>
            <div class="teacher-quiz-preview-callout-copy">
                <h2>Preview only</h2>
                <p>Answers are disabled and no submission will be recorded. Use this page to validate instructions, sections, and question layout.</p>
            </div>
        `;
    }

    function buildPreviewSections(quiz, questions) {
        const normalizedQuestions = Array.isArray(questions)
            ? questions.slice().sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
            : [];

        if (Array.isArray(quiz.sections) && quiz.sections.length) {
            const sections = quiz.sections.map((section, sectionIndex) => ({
                id: section.id || `section-${sectionIndex + 1}`,
                title: section.title || `Section ${sectionIndex + 1}`,
                description: section.description || '',
                anchorId: createSectionAnchor(section.id || section.title || `section-${sectionIndex + 1}`, sectionIndex),
                questions: []
            }));

            const sectionsById = new Map(sections.map((section) => [section.id, section]));
            normalizedQuestions.forEach((question) => {
                const targetSection = sectionsById.get(question.sectionId) || sections[0];
                if (targetSection) {
                    targetSection.questions.push(question);
                }
            });

            let startNumber = 1;
            return sections.map((section) => {
                const nextSection = {
                    ...section,
                    startNumber
                };
                startNumber += section.questions.length;
                return nextSection;
            });
        }

        return [{
            id: 'section-1',
            title: 'Section 1',
            description: '',
            anchorId: createSectionAnchor('section-1', 0),
            startNumber: 1,
            questions: normalizedQuestions
        }];
    }

    function renderSectionNav(sections, questionCount) {
        const container = document.getElementById('teacherQuizPreviewSectionNavList');
        if (!container) return;

        if (!questionCount) {
            container.innerHTML = '<p class="teacher-meta">Add questions to generate section jump links.</p>';
            return;
        }

        container.innerHTML = sections.map((section, sectionIndex) => {
            const rawTitle = section.title || `Section ${sectionIndex + 1}`;
            const displayTitle = rawTitle.length > 6 ? rawTitle.slice(0, 6) + '\u2026' : rawTitle;
            return `
            <a href="#${escapeAttribute(section.anchorId)}" class="teacher-quiz-preview-jump-chip" title="${escapeAttribute(rawTitle)}">
                <span class="teacher-quiz-preview-jump-label">Section ${sectionIndex + 1}</span>
                <span class="teacher-quiz-preview-jump-value">${escapeHtml(displayTitle)}</span>
            </a>`;
        }).join('');
    }

    function renderQuestions(sections, questionCount) {
        const questionsContainer = document.getElementById('teacherQuizPreviewQuestions');
        if (!questionsContainer) return;

        if (!questionCount) {
            questionsContainer.innerHTML = `
                <article class="teacher-card teacher-quiz-preview-empty-card">
                    <h2>No questions yet</h2>
                    <p class="teacher-meta">This saved preview is ready, but the quiz does not contain any questions yet.</p>
                </article>
            `;
            return;
        }

        questionsContainer.innerHTML = sections.map((section, sectionIndex) => `
            <section id="${escapeAttribute(section.anchorId)}" class="teacher-card teacher-quiz-preview-section">
                <div class="teacher-quiz-preview-section-head">
                    <div class="teacher-quiz-preview-section-copy">
                        <p class="teacher-eyebrow">Section ${sectionIndex + 1}</p>
                        <h2>${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</h2>
                        ${section.description ? `<p class="teacher-meta teacher-quiz-preview-section-description">${escapeHtml(section.description)}</p>` : ''}
                    </div>
                    <span class="teacher-quiz-preview-section-count">${section.questions.length} question${section.questions.length === 1 ? '' : 's'}</span>
                </div>
                <div class="teacher-list-stack">
                    ${section.questions.length
                        ? section.questions.map((question, index) => renderQuestionCard(question, section.startNumber + index)).join('')
                        : '<article class="teacher-quiz-preview-empty-section"><p class="teacher-meta">This section has no questions yet.</p></article>'}
                </div>
            </section>
        `).join('');
    }

    function renderQuestionCard(question, questionNumber) {
        return `
            <article class="teacher-card teacher-quiz-preview-question-card">
                <div class="teacher-quiz-preview-question-head">
                    <div class="teacher-quiz-preview-question-copy">
                        <p class="teacher-quiz-preview-question-index">Question ${questionNumber}</p>
                        <h3>${escapeHtml(question.title || 'Untitled question')}</h3>
                    </div>
                    <div class="teacher-quiz-preview-question-chips">
                        <span class="teacher-quiz-preview-mini-chip">${escapeHtml(formatQuestionType(question.type || 'question'))}</span>
                        <span class="teacher-quiz-preview-mini-chip">${escapeHtml(formatPoints(Number(question.points || 0)))}</span>
                    </div>
                </div>
                ${question.description ? `<p class="teacher-quiz-preview-question-description">${escapeHtml(question.description)}</p>` : ''}
                <div class="teacher-quiz-preview-answer-sheet">
                    ${renderAnswerSurface(question)}
                </div>
            </article>
        `;
    }

    function renderAnswerSurface(question) {
        if (question.type === 'short_answer') {
            return '<input type="text" class="quiz-text-input teacher-quiz-preview-control" placeholder="Short answer" disabled aria-disabled="true">';
        }
        if (question.type === 'paragraph') {
            return '<textarea class="quiz-textarea teacher-quiz-preview-control" placeholder="Long answer" disabled aria-disabled="true"></textarea>';
        }

        const options = Array.isArray(question.options) ? question.options : [];
        if (!options.length) {
            return '<div class="teacher-quiz-preview-inline-empty">No answer options configured yet.</div>';
        }

        return `<div class="radio-group teacher-quiz-preview-choice-group">${options.map((option) => `
            <label class="radio-label teacher-quiz-preview-choice">
                <input type="${question.type === 'checkbox' ? 'checkbox' : 'radio'}" disabled aria-disabled="true">
                <span>${escapeHtml(option)}</span>
            </label>
        `).join('')}</div>`;
    }

    function renderErrorState(message) {
        setText('teacherQuizPreviewTitle', 'Preview Quiz');
        setText('teacherQuizPreviewDescription', message);

        const stateRegion = document.getElementById('teacherQuizPreviewStateRegion');
        if (stateRegion) {
            stateRegion.innerHTML = `
                <article class="teacher-card teacher-quiz-preview-alert teacher-quiz-preview-alert-error" role="alert">
                    <div class="teacher-quiz-preview-inline-status">
                        <span class="material-icons" aria-hidden="true">error_outline</span>
                        <div>
                            <strong>Preview unavailable</strong>
                            <p class="teacher-meta">${escapeHtml(message)}</p>
                        </div>
                    </div>
                </article>
            `;
        }

        const meta = document.getElementById('teacherQuizPreviewMeta');
        if (meta) {
            meta.innerHTML = `
                <article class="teacher-quiz-preview-signal-card">
                    <span class="teacher-quiz-preview-signal-label">Status</span>
                    <strong class="teacher-quiz-preview-signal-value">Unavailable</strong>
                </article>
            `;
        }

        const notice = document.getElementById('teacherQuizPreviewNotice');
        if (notice) {
            notice.innerHTML = `
                <div class="teacher-quiz-preview-callout-icon" aria-hidden="true">
                    <span class="material-icons">info</span>
                </div>
                <div class="teacher-quiz-preview-callout-copy">
                    <h2>Unable to load preview</h2>
                    <p>Return to the builder and try opening the saved preview again.</p>
                </div>
            `;
        }

        const sectionNav = document.getElementById('teacherQuizPreviewSectionNavList');
        if (sectionNav) {
            sectionNav.innerHTML = '<p class="teacher-meta">Section jump links are unavailable right now.</p>';
        }

        const questionsContainer = document.getElementById('teacherQuizPreviewQuestions');
        if (questionsContainer) {
            questionsContainer.innerHTML = '';
        }
    }

    function clearStateRegion() {
        const stateRegion = document.getElementById('teacherQuizPreviewStateRegion');
        if (stateRegion) {
            stateRegion.innerHTML = '';
        }
    }

    function createSectionAnchor(value, index) {
        const normalized = String(value || `section-${index + 1}`)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return `teacher-quiz-preview-section-${normalized || `section-${index + 1}`}-${index + 1}`;
    }

    function formatStatus(value) {
        return formatLabel(value);
    }

    function formatQuestionType(value) {
        if (value === 'true_false') return 'True / False';
        return formatLabel(value);
    }

    function formatLabel(value) {
        return String(value || '')
            .split('_')
            .filter(Boolean)
            .map(capitalizeWord)
            .join(' ') || 'Not set';
    }

    function formatScoreMode(value) {
        const labels = {
            immediate: 'Immediate',
            after_review: 'After review',
            hidden: 'Hidden'
        };
        return labels[value] || 'After review';
    }

    function formatTimeLimit(value) {
        const minutes = Number(value || 0);
        if (!minutes) return 'No time limit';
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }

    function formatPoints(value) {
        const points = Number(value || 0);
        return `${points} point${points === 1 ? '' : 's'}`;
    }

    function formatDateTime(value, fallback) {
        if (!value) return fallback;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return fallback;

        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function capitalizeWord(value) {
        const word = String(value || '');
        return word ? word.charAt(0).toUpperCase() + word.slice(1) : '';
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    document.addEventListener('DOMContentLoaded', init);
    global.teacherQuizPreview = { init };
})(window);
