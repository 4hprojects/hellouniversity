(function attachTeacherQuizBuilder(root, factory) {
    const api = factory(root);

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.teacherQuizBuilder = api;
        if (root.document) {
            root.document.addEventListener('DOMContentLoaded', api.init);
        }
    }
})(typeof window !== 'undefined' ? window : null, function teacherQuizBuilderFactory(root) {
    const state = {
        classes: [],
        sections: [],
        activeQuestionId: '',
        currentTab: 'questions',
        lastSavedQuizId: '',
        sectionMessages: {},
        dragItem: null
    };

    function init() {
        state.lastSavedQuizId = getQuizId();
        wireEvents();
        syncPreviewLink();
        showTab('questions');
        Promise.all([loadClasses(), loadQuizIfEditing()]);
    }

    function wireEvents() {
        document.addEventListener('click', handleQuestionTypeButtonClick);
        document.querySelectorAll('[data-builder-add-section]').forEach((button) => {
            button.addEventListener('click', addSection);
        });
        document.querySelectorAll('[data-builder-tab]').forEach((button) => {
            button.addEventListener('click', () => showTab(button.dataset.builderTab));
        });
        document.getElementById('teacherQuizSaveDraftButton')?.addEventListener('click', saveDraftQuiz);
        document.getElementById('teacherQuizPublishButton')?.addEventListener('click', publishQuiz);
        document.getElementById('teacherQuizQuestionNav')?.addEventListener('click', handleQuestionNavClick);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('click', handleQuestionListClick);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('focusin', handleQuestionListFocus);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('input', handleQuestionFieldChange);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('change', handleQuestionFieldChange);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('dragstart', handleDragStart);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('dragover', handleDragOver);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('drop', handleDrop);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('dragend', clearDragState);
    }

    function getQuizMode() {
        return document.body?.dataset?.quizMode || 'create';
    }

    function getQuizId() {
        return document.body?.dataset?.quizId || '';
    }

    async function loadClasses() {
        try {
            const response = await fetch('/api/teacher/classes', { credentials: 'include' });
            const data = await response.json();
            if (!response.ok || !data.success) {
                return;
            }
            state.classes = Array.isArray(data.classes) ? data.classes : [];
            renderClassOptions();
        } catch (error) {
            console.error('Quiz builder class load failed:', error);
        }
    }

    async function loadQuizIfEditing() {
        if (getQuizMode() !== 'edit' || !getQuizId()) {
            state.sections = createInitialSections();
            state.activeQuestionId = state.sections[0]?.questions[0]?.id || '';
            renderQuestions();
            return;
        }

        setStatus('Loading quiz...');

        try {
            const response = await fetch(`/api/quiz-builder/quizzes/${encodeURIComponent(getQuizId())}`, { credentials: 'include' });
            const data = await response.json();
            if (!response.ok || !data.success || !data.quiz) {
                throw new Error(data.message || 'Failed to load quiz.');
            }
            hydrateForm(data.quiz);
            setStatus('Quiz loaded.');
        } catch (error) {
            console.error('Quiz builder detail load failed:', error);
            state.sections = createInitialSections();
            state.activeQuestionId = state.sections[0]?.questions[0]?.id || '';
            renderQuestions();
            setStatus(error.message || 'Unable to load quiz.');
        }
    }

    function hydrateForm(quiz) {
        setValue('teacherQuizTitle', quiz.title || quiz.quizTitle || '');
        setValue('teacherQuizDescription', quiz.description || '');
        setValue('teacherQuizSubject', quiz.subject || '');
        setValue('teacherQuizType', quiz.type || 'graded');
        setValue('teacherQuizStatus', quiz.status || 'draft');
        setValue('teacherQuizShowScoreMode', quiz.settings?.showScoreMode || 'after_review');
        setValue('teacherQuizTimeLimit', quiz.settings?.timeLimitMinutes || '');
        setValue('teacherQuizStartAt', formatDateTimeLocal(quiz.settings?.startAt));
        setValue('teacherQuizEndAt', formatDateTimeLocal(quiz.settings?.endAt));
        setChecked('teacherQuizRequireLogin', quiz.settings?.requireLogin !== false);
        setChecked('teacherQuizOneResponse', quiz.settings?.oneResponsePerStudent !== false);
        setChecked('teacherQuizRandomizeQuestions', Boolean(quiz.settings?.randomizeQuestionOrder));
        setChecked('teacherQuizRandomizeOptions', Boolean(quiz.settings?.randomizeOptionOrder));

        state.sections = normalizeSections(quiz.sections, quiz.questions);
        if (!getAllQuestions(state.sections).length) {
            state.sections = createInitialSections();
        }
        state.activeQuestionId = getAllQuestions(state.sections)[0]?.id || '';
        state.lastSavedQuizId = getQuizId();
        state.sectionMessages = {};

        renderClassOptions(quiz.classId || '');
        renderQuestions();
        syncPreviewLink();
    }

    function renderClassOptions(selectedClassId = '') {
        const select = document.getElementById('teacherQuizClassId');
        if (!select) {
            return;
        }

        const currentValue = selectedClassId || select.value;
        select.innerHTML = '<option value="">No class selected</option>' + state.classes.map((classItem) => `
            <option value="${escapeHtml(classItem._id)}">${escapeHtml(classItem.className || 'Untitled Class')} ${classItem.section ? `(${escapeHtml(classItem.section)})` : ''}</option>
        `).join('');
        select.value = currentValue;
    }

    function showTab(tabName) {
        state.currentTab = tabName === 'settings' ? 'settings' : 'questions';
        document.querySelectorAll('[data-builder-tab]').forEach((button) => {
            const isActive = button.dataset.builderTab === state.currentTab;
            button.classList.toggle('teacher-quiz-builder-tab-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
        });
        document.querySelectorAll('[data-builder-panel]').forEach((panel) => {
            panel.hidden = panel.dataset.builderPanel !== state.currentTab;
        });
    }

    function renderQuestions(options = {}) {
        ensureBuilderState();
        ensureActiveQuestion();
        renderQuestionNav();
        renderQuestionList();
        if (options.scrollToQuestionId) {
            scrollQuestionIntoView(options.scrollToQuestionId, Boolean(options.focusTitle));
        }
    }

    function renderQuestionNav() {
        const container = document.getElementById('teacherQuizQuestionNav');
        if (!container) {
            return;
        }

        const questions = getAllQuestions(state.sections);
        if (!questions.length) {
            container.innerHTML = '<p class="teacher-empty-state">Questions will appear here as you add them.</p>';
            return;
        }

        const questionNumberMap = createQuestionNumberMap(state.sections);
        container.innerHTML = state.sections.map((section, sectionIndex) => `
            <section class="teacher-quiz-builder-question-nav-group">
                <div class="teacher-quiz-builder-question-nav-section-heading">
                    <span class="teacher-quiz-builder-question-nav-section-index">Section ${sectionIndex + 1}</span>
                    <span class="teacher-quiz-builder-question-nav-section-label">${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</span>
                </div>
                <div class="teacher-quiz-builder-question-nav-group-items">
                    ${section.questions.length
                        ? section.questions.map((question) => `
                            <button type="button" class="teacher-quiz-builder-question-nav-item${question.id === state.activeQuestionId ? ' teacher-quiz-builder-question-nav-item-active' : ''}" data-nav-question-id="${escapeAttribute(question.id)}">
                                <span class="teacher-quiz-builder-question-nav-index">Question ${questionNumberMap.get(question.id) || 0}</span>
                                <span class="teacher-quiz-builder-question-nav-label">${escapeHtml(question.title || readableQuestionType(question.type))}</span>
                            </button>
                        `).join('')
                        : '<p class="teacher-quiz-builder-question-nav-empty">No questions in this section yet.</p>'
                    }
                </div>
            </section>
        `).join('');
    }

    function renderQuestionList() {
        const container = document.getElementById('teacherQuizQuestionList');
        if (!container) {
            return;
        }

        const questionNumberMap = createQuestionNumberMap(state.sections);
        container.innerHTML = state.sections.map((section, sectionIndex) => renderSectionCard(section, sectionIndex, questionNumberMap)).join('');
    }

    function renderSectionCard(section, sectionIndex, questionNumberMap) {
        const message = state.sectionMessages[section.id] || '';

        return `
            <article class="teacher-card teacher-quiz-builder-section-card" data-section-card="true" data-section-id="${escapeAttribute(section.id)}" id="${sectionElementId(section.id)}">
                <div class="teacher-quiz-builder-section-card-accent"></div>
                <div class="teacher-quiz-builder-section-card-body">
                    <div class="teacher-quiz-builder-section-header">
                        <div class="teacher-quiz-builder-section-heading">
                            <div class="teacher-quiz-builder-section-heading-top">
                                <span class="material-icons teacher-quiz-builder-drag-handle" draggable="true" title="Drag to reorder section" data-drag-type="section" data-section-id="${escapeAttribute(section.id)}">drag_indicator</span>
                                <div class="teacher-quiz-builder-section-title-stack">
                                    <p class="teacher-eyebrow">Section ${sectionIndex + 1}</p>
                                    <input type="text" class="teacher-input teacher-quiz-builder-section-title-input" data-section-field="title" data-section-id="${escapeAttribute(section.id)}" value="${escapeAttribute(section.title)}" placeholder="Section title">
                                </div>
                            </div>
                            <p class="teacher-meta">Group related questions together and control their authored order.</p>
                        </div>
                        <div class="teacher-quiz-builder-section-actions">
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-mobile-sort-button" data-action="move-section-up" data-section-id="${escapeAttribute(section.id)}">Move Up</button>
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-mobile-sort-button" data-action="move-section-down" data-section-id="${escapeAttribute(section.id)}">Move Down</button>
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="delete-section" data-section-id="${escapeAttribute(section.id)}">Delete Section</button>
                        </div>
                    </div>

                    <label class="teacher-quiz-builder-question-body-row">
                        <span class="teacher-field-label">Section Description</span>
                        <textarea class="teacher-textarea teacher-quiz-builder-section-description" data-section-field="description" data-section-id="${escapeAttribute(section.id)}" placeholder="Optional section instructions">${escapeHtml(section.description || '')}</textarea>
                    </label>

                    ${message ? `<p class="teacher-quiz-builder-section-message">${escapeHtml(message)}</p>` : ''}

                    <div class="teacher-quiz-builder-section-questions" data-section-dropzone="true" data-section-id="${escapeAttribute(section.id)}">
                        ${section.questions.length
                            ? section.questions.map((question) => renderQuestionCard(question, section.id, questionNumberMap)).join('')
                            : '<div class="teacher-quiz-builder-section-empty"><p class="teacher-empty-state">No questions in this section yet. Add one from the section footer or the quick-add rail.</p></div>'
                        }
                    </div>

                    <div class="teacher-quiz-builder-section-footer">
                        <button type="button" class="teacher-btn teacher-btn-secondary" data-question-type="multiple_choice" data-section-id="${escapeAttribute(section.id)}">Add Question</button>
                    </div>
                </div>
            </article>
        `;
    }

    function renderQuestionCard(question, sectionId, questionNumberMap) {
        const questionNumber = questionNumberMap.get(question.id) || 0;

        return `
            <article class="teacher-card teacher-quiz-builder-question-card${question.id === state.activeQuestionId ? ' teacher-quiz-builder-question-card-active' : ''}" data-question-card="true" data-question-id="${escapeAttribute(question.id)}" data-section-id="${escapeAttribute(sectionId)}" id="${questionElementId(question.id)}">
                <div class="teacher-quiz-builder-question-card-accent"></div>
                <div class="teacher-quiz-builder-question-card-body">
                    <div class="teacher-quiz-builder-question-card-header">
                        <div class="teacher-quiz-builder-question-heading">
                            <div class="teacher-quiz-builder-question-heading-top">
                                <span class="material-icons teacher-quiz-builder-drag-handle" draggable="true" title="Drag to reorder question" data-drag-type="question" data-question-id="${escapeAttribute(question.id)}" data-section-id="${escapeAttribute(sectionId)}">drag_indicator</span>
                                <div>
                                    <p class="teacher-eyebrow">Question ${questionNumber}</p>
                                    <h3>${escapeHtml(readableQuestionType(question.type))}</h3>
                                    <p class="teacher-meta">Adjust the prompt, answer rules, and scoring for this item.</p>
                                </div>
                            </div>
                        </div>
                        <div class="teacher-quiz-builder-question-actions">
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-mobile-sort-button" data-action="move-question-up" data-question-id="${escapeAttribute(question.id)}">Move Up</button>
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-mobile-sort-button" data-action="move-question-down" data-question-id="${escapeAttribute(question.id)}">Move Down</button>
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="duplicate-question" data-question-id="${escapeAttribute(question.id)}">Duplicate</button>
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="delete-question" data-question-id="${escapeAttribute(question.id)}">Delete</button>
                        </div>
                    </div>

                    <div class="teacher-quiz-builder-question-grid">
                        <label class="teacher-quiz-builder-question-body-row">
                            <span class="teacher-field-label">Question Title</span>
                            <input type="text" class="teacher-input" data-field="title" data-question-id="${escapeAttribute(question.id)}" value="${escapeAttribute(question.title)}" placeholder="Enter the question">
                        </label>
                        <label class="teacher-quiz-builder-question-body-row teacher-quiz-builder-question-type-select">
                            <span class="teacher-field-label">Question Type</span>
                            <select class="teacher-select" data-field="type" data-question-id="${escapeAttribute(question.id)}">
                                ${questionTypeOptions(question.type)}
                            </select>
                        </label>
                        <label class="teacher-quiz-builder-question-body-row teacher-quiz-builder-points-input">
                            <span class="teacher-field-label">Points</span>
                            <input type="number" min="0" class="teacher-input" data-field="points" data-question-id="${escapeAttribute(question.id)}" value="${escapeAttribute(question.points)}">
                        </label>
                    </div>

                    <label class="teacher-quiz-builder-question-body-row">
                        <span class="teacher-field-label">Description</span>
                        <textarea class="teacher-textarea" data-field="description" data-question-id="${escapeAttribute(question.id)}" placeholder="Optional helper text">${escapeHtml(question.description)}</textarea>
                    </label>

                    ${renderAnswerEditor(question)}

                    <div class="teacher-quiz-builder-question-footer">
                        <div class="teacher-quiz-builder-question-footer-controls">
                            <label class="teacher-checkbox-row">
                                <input type="checkbox" data-field="required" data-question-id="${escapeAttribute(question.id)}" ${question.required ? 'checked' : ''}>
                                <span>Required</span>
                            </label>
                            ${(question.type === 'short_answer' || question.type === 'paragraph') ? `
                                <label class="teacher-checkbox-row">
                                    <input type="checkbox" data-field="caseSensitive" data-question-id="${escapeAttribute(question.id)}" ${question.caseSensitive ? 'checked' : ''}>
                                    <span>Case sensitive answer checking</span>
                                </label>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    function renderAnswerEditor(question) {
        if (question.type === 'short_answer' || question.type === 'paragraph') {
            return `
                <fieldset class="quiz-fieldset">
                    <legend class="quiz-legend">Accepted Answers</legend>
                    <input type="text" class="quiz-text-input" data-field="acceptedAnswers" data-question-id="${escapeAttribute(question.id)}" value="${escapeAttribute(question.correctAnswers.join(', '))}" placeholder="Comma-separated accepted answers">
                </fieldset>
            `;
        }

        return `
            <fieldset class="quiz-fieldset">
                <legend class="quiz-legend">Options</legend>
                <div style="display:flex; justify-content:flex-end; margin-bottom:0.5rem;">
                    ${question.type !== 'true_false' ? `<button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="add-option" data-question-id="${escapeAttribute(question.id)}">Add Option</button>` : ''}
                </div>
                <div class="radio-group">
                    ${question.options.map((option, optionIndex) => renderOptionRow(question, option, optionIndex)).join('')}
                </div>
            </fieldset>
        `;
    }

    function renderOptionRow(question, option, optionIndex) {
        const inputType = question.type === 'checkbox' ? 'checkbox' : 'radio';
        return `
            <div class="radio-label" style="gap:0.5rem">
                <input type="${inputType}" name="correct-${escapeAttribute(question.id)}" data-field="correctOption" data-question-id="${escapeAttribute(question.id)}" data-option-index="${optionIndex}" ${question.correctAnswers.includes(option) ? 'checked' : ''}>
                <input type="text" class="quiz-text-input" style="margin-top:0; flex:1" data-field="optionText" data-question-id="${escapeAttribute(question.id)}" data-option-index="${optionIndex}" value="${escapeAttribute(option)}" ${question.type === 'true_false' ? 'disabled' : ''}>
                ${question.type !== 'true_false' ? `<button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="remove-option" data-question-id="${escapeAttribute(question.id)}" data-option-index="${optionIndex}">Remove</button>` : ''}
            </div>
        `;
    }

    function questionTypeOptions(selectedType) {
        return [
            ['multiple_choice', 'Multiple Choice'],
            ['checkbox', 'Checkbox'],
            ['short_answer', 'Short Answer'],
            ['paragraph', 'Paragraph'],
            ['true_false', 'True / False']
        ].map(([value, label]) => `
            <option value="${value}" ${value === selectedType ? 'selected' : ''}>${label}</option>
        `).join('');
    }

    function handleQuestionTypeButtonClick(event) {
        const button = event.target.closest('button[data-question-type]');
        if (!button) {
            return;
        }
        event.preventDefault();
        addQuestion(button.dataset.questionType, button.dataset.sectionId || '');
    }

    function addQuestion(type, sectionId) {
        const result = insertQuestionAfterActive(state.sections, state.activeQuestionId, sectionId, createQuestion(type, sectionId));
        state.sections = result.sections;
        state.activeQuestionId = result.activeQuestionId;
        state.sectionMessages = {};
        showTab('questions');
        renderQuestions({ scrollToQuestionId: state.activeQuestionId, focusTitle: true });
        setStatus('Question added.');
    }

    function addSection() {
        const result = insertSectionAfterActive(state.sections, state.activeQuestionId, createSection({ title: `Section ${state.sections.length + 1}` }));
        state.sections = result.sections;
        state.sectionMessages = {};
        showTab('questions');
        renderQuestions();
        scrollSectionIntoView(result.sectionId);
        setStatus('Section added.');
    }

    function handleQuestionNavClick(event) {
        const button = event.target.closest('[data-nav-question-id]');
        if (!button) {
            return;
        }
        const questionId = button.dataset.navQuestionId || '';
        setActiveQuestion(questionId);
        showTab('questions');
        renderQuestionNav();
        updateQuestionCardActiveState();
        scrollQuestionIntoView(questionId, false);
    }

    function handleQuestionListClick(event) {
        const actionButton = event.target.closest('[data-action]');
        if (actionButton) {
            event.preventDefault();
            const action = actionButton.dataset.action;
            const questionId = actionButton.dataset.questionId || '';
            const sectionId = actionButton.dataset.sectionId || '';

            if (action === 'add-section') {
                addSection();
                return;
            }
            if (action === 'duplicate-question') {
                const result = duplicateQuestionById(state.sections, questionId);
                state.sections = result.sections;
                state.activeQuestionId = result.activeQuestionId;
                state.sectionMessages = {};
                renderQuestions({ scrollToQuestionId: state.activeQuestionId, focusTitle: true });
                setStatus('Question duplicated.');
                return;
            }
            if (action === 'delete-question') {
                const result = removeQuestionById(state.sections, questionId, state.activeQuestionId);
                state.sections = result.sections;
                state.activeQuestionId = result.activeQuestionId;
                state.sectionMessages = {};
                renderQuestions({ scrollToQuestionId: state.activeQuestionId });
                setStatus('Question removed.');
                return;
            }
            if (action === 'delete-section') {
                const result = removeSectionById(state.sections, sectionId, state.activeQuestionId);
                state.sections = result.sections;
                state.activeQuestionId = result.activeQuestionId;
                state.sectionMessages = result.message ? { [sectionId]: result.message } : {};
                renderQuestions();
                if (result.removed) {
                    setStatus('Section removed.');
                }
                return;
            }
            if (action === 'move-section-up' || action === 'move-section-down') {
                const result = moveSectionByOffset(state.sections, sectionId, action === 'move-section-up' ? -1 : 1);
                state.sections = result.sections;
                renderQuestions();
                scrollSectionIntoView(sectionId);
                setStatus('Section order updated.');
                return;
            }
            if (action === 'move-question-up' || action === 'move-question-down') {
                const result = moveQuestionByOffset(state.sections, questionId, action === 'move-question-up' ? -1 : 1);
                state.sections = result.sections;
                state.activeQuestionId = questionId;
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Question order updated.');
                return;
            }
            if (action === 'add-option') {
                updateQuestion(questionId, (question) => {
                    question.options.push(`Option ${question.options.length + 1}`);
                    return convertQuestionToType(question, question.type);
                });
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Option added.');
                return;
            }
            if (action === 'remove-option') {
                const optionIndex = Number(actionButton.dataset.optionIndex);
                updateQuestion(questionId, (question) => {
                    question.options.splice(optionIndex, 1);
                    return convertQuestionToType(question, question.type);
                });
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Option removed.');
                return;
            }
        }

        const questionCard = event.target.closest('[data-question-id]');
        if (questionCard) {
            setActiveQuestion(questionCard.dataset.questionId || '');
            renderQuestionNav();
            updateQuestionCardActiveState();
        }
    }

    function handleQuestionListFocus(event) {
        const questionCard = event.target.closest('[data-question-id]');
        if (!questionCard) {
            return;
        }
        setActiveQuestion(questionCard.dataset.questionId || '');
        renderQuestionNav();
        updateQuestionCardActiveState();
    }

    function handleQuestionFieldChange(event) {
        const questionId = event.target.dataset.questionId || '';
        const sectionId = event.target.dataset.sectionId || '';
        const questionField = event.target.dataset.field;
        const sectionField = event.target.dataset.sectionField;

        if (sectionField && sectionId) {
            updateSection(sectionId, (section) => {
                section[sectionField] = event.target.value;
                return section;
            });
            renderQuestionNav();
            return;
        }

        if (!questionField || !questionId) {
            return;
        }

        setActiveQuestion(questionId);

        if (questionField === 'title' || questionField === 'description') {
            updateQuestion(questionId, (question) => {
                question[questionField] = event.target.value;
                return question;
            });
            renderQuestionNav();
            return;
        }

        if (questionField === 'points') {
            updateQuestion(questionId, (question) => {
                question.points = Math.max(0, Number(event.target.value || 0));
                return question;
            });
            return;
        }

        if (questionField === 'required' || questionField === 'caseSensitive') {
            updateQuestion(questionId, (question) => {
                question[questionField] = Boolean(event.target.checked);
                return question;
            });
            return;
        }

        if (questionField === 'acceptedAnswers') {
            updateQuestion(questionId, (question) => {
                question.correctAnswers = event.target.value.split(',').map((value) => value.trim()).filter(Boolean);
                return question;
            });
            return;
        }

        if (questionField === 'type') {
            updateQuestion(questionId, (question) => convertQuestionToType(question, event.target.value));
            renderQuestions({ scrollToQuestionId: questionId });
            setStatus('Question type updated.');
            return;
        }

        if (questionField === 'optionText') {
            const optionIndex = Number(event.target.dataset.optionIndex);
            updateQuestion(questionId, (question) => {
                const oldValue = question.options[optionIndex];
                question.options[optionIndex] = event.target.value;
                question.correctAnswers = question.correctAnswers.map((answer) => answer === oldValue ? event.target.value : answer);
                return convertQuestionToType(question, question.type);
            });
            renderQuestions({ scrollToQuestionId: questionId });
            return;
        }

        if (questionField === 'correctOption') {
            const optionIndex = Number(event.target.dataset.optionIndex);
            updateQuestion(questionId, (question) => {
                const optionValue = question.options[optionIndex];
                if (question.type === 'checkbox') {
                    if (event.target.checked) {
                        question.correctAnswers = Array.from(new Set(question.correctAnswers.concat(optionValue)));
                    } else {
                        question.correctAnswers = question.correctAnswers.filter((answer) => answer !== optionValue);
                    }
                } else {
                    question.correctAnswers = [optionValue];
                }
                return convertQuestionToType(question, question.type);
            });
            renderQuestions({ scrollToQuestionId: questionId });
        }
    }

    async function saveDraftQuiz() {
        await persistQuiz({ status: 'draft', publishAfterSave: false });
    }

    async function publishQuiz() {
        await persistQuiz({ status: 'draft', publishAfterSave: true });
    }

    async function persistQuiz({ status, publishAfterSave }) {
        const payload = buildPayload(status);
        const isEdit = getQuizMode() === 'edit' && getQuizId();
        const url = isEdit ? `/api/quiz-builder/quizzes/${encodeURIComponent(getQuizId())}` : '/api/quiz-builder/quizzes';
        const method = isEdit ? 'PUT' : 'POST';
        let targetQuizId = isEdit ? getQuizId() : '';

        setBusyState(true);
        setStatus(publishAfterSave ? (isEdit ? 'Saving quiz before publishing...' : 'Creating quiz before publishing...') : (isEdit ? 'Saving quiz...' : 'Creating quiz...'));

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to save quiz.');
            }

            if (!isEdit && data.quizId) {
                targetQuizId = data.quizId;
            }

            if (targetQuizId) {
                state.lastSavedQuizId = targetQuizId;
                syncPreviewLink(targetQuizId);
            }

            if (publishAfterSave) {
                await publishQuizById(targetQuizId);
                if (!isEdit && targetQuizId) {
                    window.location.href = `/teacher/quizzes/${encodeURIComponent(targetQuizId)}/edit`;
                }
                return;
            }

            setValue('teacherQuizStatus', 'draft');
            if (!isEdit && targetQuizId) {
                window.location.href = `/teacher/quizzes/${encodeURIComponent(targetQuizId)}/edit`;
                return;
            }

            setStatus(data.message || 'Quiz saved successfully.');
        } catch (error) {
            console.error('Quiz builder save failed:', error);
            if (!isEdit && targetQuizId) {
                window.location.href = `/teacher/quizzes/${encodeURIComponent(targetQuizId)}/edit`;
                return;
            }
            setStatus(error.message || 'Unable to save quiz.');
        } finally {
            setBusyState(false);
        }
    }

    async function publishQuizById(quizId) {
        if (!quizId) {
            setStatus('Save the quiz first before publishing.');
            return;
        }

        try {
            const response = await fetch(`/api/quiz-builder/quizzes/${encodeURIComponent(quizId)}/publish`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to publish quiz.');
            }
            setValue('teacherQuizStatus', 'published');
            setStatus(data.message || 'Quiz published successfully.');
        } catch (error) {
            console.error('Quiz publish failed:', error);
            throw error;
        }
    }

    function buildPayload(statusOverride) {
        const classSelect = document.getElementById('teacherQuizClassId');
        const selectedOption = classSelect?.selectedOptions?.[0];
        const normalizedSections = normalizeSectionTree(state.sections);
        const payloadSections = normalizedSections.map((section, index) => ({
            id: section.id,
            title: section.title || `Section ${index + 1}`,
            description: section.description || '',
            order: index
        }));
        const payloadQuestions = normalizedSections.flatMap((section) => section.questions.map((question, questionIndex) => ({
            id: question.id,
            sectionId: section.id,
            order: questionIndex,
            type: question.type,
            title: question.title.trim(),
            description: question.description.trim(),
            required: question.required !== false,
            points: Number(question.points || 0),
            options: question.options.map((option) => String(option || '').trim()).filter(Boolean),
            correctAnswers: question.correctAnswers.map((answer) => String(answer || '').trim()).filter(Boolean),
            caseSensitive: Boolean(question.caseSensitive)
        })));

        return {
            title: getValue('teacherQuizTitle'),
            description: getValue('teacherQuizDescription'),
            subject: getValue('teacherQuizSubject'),
            classId: classSelect?.value || '',
            classLabel: classSelect?.value ? selectedOption?.textContent?.trim() || '' : '',
            type: getValue('teacherQuizType') || 'graded',
            status: statusOverride || getValue('teacherQuizStatus') || 'draft',
            settings: {
                requireLogin: Boolean(document.getElementById('teacherQuizRequireLogin')?.checked),
                oneResponsePerStudent: Boolean(document.getElementById('teacherQuizOneResponse')?.checked),
                randomizeQuestionOrder: Boolean(document.getElementById('teacherQuizRandomizeQuestions')?.checked),
                randomizeOptionOrder: Boolean(document.getElementById('teacherQuizRandomizeOptions')?.checked),
                showScoreMode: getValue('teacherQuizShowScoreMode') || 'after_review',
                startAt: getValue('teacherQuizStartAt') || null,
                endAt: getValue('teacherQuizEndAt') || null,
                timeLimitMinutes: getValue('teacherQuizTimeLimit') || null
            },
            sections: payloadSections,
            questions: payloadQuestions
        };
    }

    function handleDragStart(event) {
        if (isCompactLayout()) {
            return;
        }

        const handle = event.target.closest('[data-drag-type]');
        if (!handle) {
            return;
        }

        state.dragItem = {
            type: handle.dataset.dragType,
            sectionId: handle.dataset.sectionId || '',
            questionId: handle.dataset.questionId || ''
        };

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify(state.dragItem));
        handle.closest('[data-section-id], [data-question-id]')?.classList.add('teacher-quiz-builder-dragging');
    }

    function handleDragOver(event) {
        if (!state.dragItem || isCompactLayout()) {
            return;
        }

        const questionCard = event.target.closest('[data-question-card="true"]');
        const sectionCard = event.target.closest('[data-section-card="true"]');
        const sectionDropzone = event.target.closest('[data-section-dropzone="true"]');
        if (!questionCard && !sectionCard && !sectionDropzone) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(event) {
        if (!state.dragItem || isCompactLayout()) {
            return;
        }

        event.preventDefault();

        if (state.dragItem.type === 'section') {
            const targetSection = event.target.closest('[data-section-card="true"]');
            if (targetSection) {
                state.sections = moveSection(state.sections, state.dragItem.sectionId, targetSection.dataset.sectionId || '', getDropPosition(targetSection, event));
                clearDragState();
                renderQuestions();
                scrollSectionIntoView(state.dragItem.sectionId);
                setStatus('Section order updated.');
                return;
            }
        }

        if (state.dragItem.type === 'question') {
            const targetQuestion = event.target.closest('[data-question-card="true"]');
            if (targetQuestion) {
                state.sections = moveQuestion(
                    state.sections,
                    state.dragItem.questionId,
                    targetQuestion.dataset.sectionId || '',
                    targetQuestion.dataset.questionId || '',
                    getDropPosition(targetQuestion, event)
                );
                state.activeQuestionId = state.dragItem.questionId;
                clearDragState();
                renderQuestions({ scrollToQuestionId: state.activeQuestionId });
                setStatus('Question order updated.');
                return;
            }

            const targetDropzone = event.target.closest('[data-section-dropzone="true"]');
            if (targetDropzone) {
                state.sections = moveQuestion(state.sections, state.dragItem.questionId, targetDropzone.dataset.sectionId || '', '', 'end');
                state.activeQuestionId = state.dragItem.questionId;
                clearDragState();
                renderQuestions({ scrollToQuestionId: state.activeQuestionId });
                setStatus('Question order updated.');
                return;
            }
        }

        clearDragState();
    }

    function clearDragState() {
        state.dragItem = null;
        document.querySelectorAll('.teacher-quiz-builder-dragging').forEach((element) => {
            element.classList.remove('teacher-quiz-builder-dragging');
        });
    }

    function setActiveQuestion(questionId) {
        state.activeQuestionId = questionId;
    }

    function ensureBuilderState() {
        if (!state.sections.length) {
            state.sections = createInitialSections();
        }
    }

    function ensureActiveQuestion() {
        const questions = getAllQuestions(state.sections);
        if (!questions.length) {
            state.activeQuestionId = '';
            return;
        }
        if (!questions.some((question) => question.id === state.activeQuestionId)) {
            state.activeQuestionId = questions[0].id;
        }
    }

    function updateQuestionCardActiveState() {
        document.querySelectorAll('[data-question-card="true"]').forEach((card) => {
            card.classList.toggle('teacher-quiz-builder-question-card-active', card.dataset.questionId === state.activeQuestionId);
        });
    }

    function scrollQuestionIntoView(questionId, focusTitle) {
        if (!root || !root.document || !questionId) {
            return;
        }
        root.setTimeout(() => {
            const card = root.document.getElementById(questionElementId(questionId));
            if (!card) {
                return;
            }
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (focusTitle) {
                card.querySelector('[data-field="title"]')?.focus();
            }
        }, 0);
    }

    function scrollSectionIntoView(sectionId) {
        if (!root || !root.document || !sectionId) {
            return;
        }
        root.setTimeout(() => {
            root.document.getElementById(sectionElementId(sectionId))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
    }

    function syncPreviewLink(quizId = state.lastSavedQuizId || getQuizId()) {
        const previewLink = document.getElementById('teacherQuizPreviewLink');
        if (!previewLink) {
            return;
        }

        if (quizId) {
            previewLink.href = `/teacher/quizzes/${encodeURIComponent(quizId)}/preview`;
            previewLink.classList.remove('teacher-quiz-builder-action-disabled');
            previewLink.removeAttribute('aria-disabled');
            previewLink.removeAttribute('tabindex');
        } else {
            previewLink.href = '#';
            previewLink.classList.add('teacher-quiz-builder-action-disabled');
            previewLink.setAttribute('aria-disabled', 'true');
            previewLink.setAttribute('tabindex', '-1');
        }
    }

    function questionElementId(questionId) {
        return `teacher-quiz-question-${questionId}`;
    }

    function sectionElementId(sectionId) {
        return `teacher-quiz-section-${sectionId}`;
    }

    function createInitialSections() {
        const firstSection = createSection({ title: 'Section 1' });
        firstSection.questions = [createQuestion('multiple_choice', firstSection.id)];
        return normalizeSectionTree([firstSection]);
    }

    function normalizeSections(rawSections, rawQuestions) {
        const sectionsInput = Array.isArray(rawSections) && rawSections.length ? rawSections : [createSection({ title: 'Section 1', id: generateSectionId() })];
        const seenSectionIds = new Set();
        const orderedSections = sectionsInput.map((section, index) => ({
            id: createUniqueId(section?.id, seenSectionIds, 'section', index),
            title: String(section?.title || '').trim(),
            description: String(section?.description || '').trim(),
            order: Number.isFinite(Number(section?.order)) ? Number(section.order) : index,
            questions: [],
            _sourceIndex: index
        })).sort((left, right) => left.order - right.order || left._sourceIndex - right._sourceIndex);

        const defaultSectionId = orderedSections[0]?.id || generateSectionId();
        const validSectionIds = new Set(orderedSections.map((section) => section.id));
        const seenQuestionIds = new Set();
        const questionsInput = Array.isArray(rawQuestions) ? rawQuestions : [];
        const normalizedQuestions = questionsInput.map((question, index) => {
            const normalized = normalizeQuestion(question, validSectionIds.has(question?.sectionId) ? question.sectionId : defaultSectionId);
            normalized.id = createUniqueId(normalized.id, seenQuestionIds, 'question', index);
            normalized.sectionId = validSectionIds.has(normalized.sectionId) ? normalized.sectionId : defaultSectionId;
            normalized.order = Number.isFinite(Number(question?.order)) ? Number(question.order) : index;
            normalized._sourceIndex = index;
            return normalized;
        }).sort((left, right) => orderedSections.findIndex((section) => section.id === left.sectionId) - orderedSections.findIndex((section) => section.id === right.sectionId) || left.order - right.order || left._sourceIndex - right._sourceIndex);

        normalizedQuestions.forEach((question) => {
            const section = orderedSections.find((sectionItem) => sectionItem.id === question.sectionId) || orderedSections[0];
            section.questions.push({ ...question, sectionId: section.id });
        });

        return normalizeSectionTree(orderedSections);
    }

    function createSection(overrides = {}) {
        return {
            id: overrides.id || generateSectionId(),
            title: String(overrides.title || '').trim(),
            description: String(overrides.description || '').trim(),
            order: Number.isFinite(Number(overrides.order)) ? Number(overrides.order) : 0,
            questions: Array.isArray(overrides.questions) ? overrides.questions.map((question) => normalizeQuestion(question, overrides.id || question.sectionId || '')) : []
        };
    }

    function normalizeQuestion(question, fallbackSectionId) {
        const normalized = {
            id: question?.id || generateQuestionId(),
            sectionId: String(question?.sectionId || fallbackSectionId || '').trim() || fallbackSectionId || '',
            order: Number.isFinite(Number(question?.order)) ? Number(question.order) : 0,
            type: normalizeQuestionType(question?.type),
            title: question?.title || '',
            description: question?.description || '',
            required: question?.required !== false,
            points: Number.isFinite(Number(question?.points)) ? Math.max(0, Number(question.points)) : 1,
            options: Array.isArray(question?.options) ? question.options.slice() : [],
            correctAnswers: Array.isArray(question?.correctAnswers) ? question.correctAnswers.slice() : Array.isArray(question?.acceptedAnswers) ? question.acceptedAnswers.slice() : [],
            caseSensitive: Boolean(question?.caseSensitive)
        };
        return convertQuestionToType(normalized, normalized.type);
    }

    function createQuestion(type, sectionId) {
        const normalizedType = normalizeQuestionType(type);
        return convertQuestionToType({
            id: generateQuestionId(),
            sectionId: sectionId || '',
            order: 0,
            type: normalizedType,
            title: '',
            description: '',
            required: true,
            points: 1,
            options: [],
            correctAnswers: [],
            caseSensitive: false
        }, normalizedType);
    }

    function convertQuestionToType(question, nextType) {
        const normalizedType = normalizeQuestionType(nextType);
        const converted = {
            id: question.id || generateQuestionId(),
            sectionId: question.sectionId || '',
            order: Number.isFinite(Number(question.order)) ? Number(question.order) : 0,
            type: normalizedType,
            title: String(question.title || ''),
            description: String(question.description || ''),
            required: question.required !== false,
            points: Number.isFinite(Number(question.points)) ? Math.max(0, Number(question.points)) : 1,
            options: Array.isArray(question.options) ? question.options.map((option) => String(option || '')) : [],
            correctAnswers: Array.isArray(question.correctAnswers) ? question.correctAnswers.map((answer) => String(answer || '')) : [],
            caseSensitive: Boolean(question.caseSensitive)
        };

        if (normalizedType === 'short_answer' || normalizedType === 'paragraph') {
            converted.options = [];
            converted.correctAnswers = converted.correctAnswers.map((answer) => answer.trim()).filter(Boolean);
            return converted;
        }

        if (normalizedType === 'true_false') {
            converted.options = ['True', 'False'];
            converted.correctAnswers = [mapTrueFalseAnswer(converted.correctAnswers)];
            return converted;
        }

        const options = converted.options.map((option) => option.trim()).filter(Boolean);
        while (options.length < 2) {
            const nextLabel = `Option ${options.length + 1}`;
            options.push(options.includes(nextLabel) ? `Option ${options.length + 2}` : nextLabel);
        }
        const validAnswers = converted.correctAnswers.map((answer) => answer.trim()).filter((answer) => options.includes(answer));
        converted.options = options;
        converted.correctAnswers = normalizedType === 'checkbox' ? (validAnswers.length ? Array.from(new Set(validAnswers)) : [options[0]]) : [validAnswers[0] || options[0]];
        return converted;
    }

    function mapTrueFalseAnswer(correctAnswers) {
        const signals = correctAnswers.map((value) => String(value || '').trim().toLowerCase());
        if (signals.some((value) => ['false', 'f', 'no', '0'].includes(value))) {
            return 'False';
        }
        if (signals.some((value) => ['true', 't', 'yes', '1'].includes(value))) {
            return 'True';
        }
        return 'True';
    }

    function insertQuestionAfterActive(sections, activeQuestionId, preferredSectionId, questionToInsert) {
        const nextSections = normalizeSectionTree(cloneSections(sections));
        if (!nextSections.length) {
            const seedSection = createSection({ title: 'Section 1' });
            questionToInsert.sectionId = seedSection.id;
            seedSection.questions = [questionToInsert];
            return { sections: normalizeSectionTree([seedSection]), activeQuestionId: questionToInsert.id };
        }

        const activeLocation = findQuestionLocation(nextSections, activeQuestionId);
        const targetSectionId = preferredSectionId || activeLocation?.section?.id || nextSections[nextSections.length - 1].id;
        const targetSection = nextSections.find((section) => section.id === targetSectionId) || nextSections[nextSections.length - 1];
        const insertIndex = activeLocation && activeLocation.section.id === targetSection.id ? activeLocation.questionIndex + 1 : targetSection.questions.length;
        questionToInsert.sectionId = targetSection.id;
        targetSection.questions.splice(insertIndex, 0, normalizeQuestion(questionToInsert, targetSection.id));
        return { sections: normalizeSectionTree(nextSections), activeQuestionId: questionToInsert.id };
    }

    function insertSectionAfterActive(sections, activeQuestionId, sectionToInsert) {
        const nextSections = normalizeSectionTree(cloneSections(sections));
        const activeLocation = findQuestionLocation(nextSections, activeQuestionId);
        nextSections.splice(activeLocation ? activeLocation.sectionIndex + 1 : nextSections.length, 0, createSection(sectionToInsert));
        return { sections: normalizeSectionTree(nextSections), sectionId: sectionToInsert.id };
    }

    function duplicateQuestionById(sections, questionId) {
        const location = findQuestionLocation(sections, questionId);
        if (!location) {
            return { sections: normalizeSectionTree(cloneSections(sections)), activeQuestionId: '' };
        }

        const duplicated = normalizeQuestion({ ...JSON.parse(JSON.stringify(location.question)), id: generateQuestionId() }, location.section.id);
        return insertQuestionAfterActive(sections, questionId, location.section.id, duplicated);
    }

    function removeQuestionById(sections, questionId, activeQuestionId) {
        const nextSections = normalizeSectionTree(cloneSections(sections));
        const location = findQuestionLocation(nextSections, questionId);
        if (!location) {
            return { sections: nextSections, activeQuestionId };
        }
        location.section.questions.splice(location.questionIndex, 1);
        const normalizedSections = normalizeSectionTree(nextSections);
        const remainingQuestions = getAllQuestions(normalizedSections);
        if (!remainingQuestions.length) {
            return { sections: normalizedSections, activeQuestionId: '' };
        }
        if (questionId !== activeQuestionId) {
            return { sections: normalizedSections, activeQuestionId };
        }
        const replacement = remainingQuestions[location.globalIndex] || remainingQuestions[location.globalIndex - 1] || remainingQuestions[0];
        return { sections: normalizedSections, activeQuestionId: replacement ? replacement.id : '' };
    }

    function removeSectionById(sections, sectionId, activeQuestionId) {
        const nextSections = normalizeSectionTree(cloneSections(sections));
        const sectionIndex = nextSections.findIndex((section) => section.id === sectionId);
        if (sectionIndex === -1) {
            return { sections: nextSections, activeQuestionId, removed: false, message: '' };
        }
        if (nextSections[sectionIndex].questions.length) {
            return { sections: nextSections, activeQuestionId, removed: false, message: 'Move or remove all questions from this section before deleting it.' };
        }
        nextSections.splice(sectionIndex, 1);
        const normalizedSections = nextSections.length ? normalizeSectionTree(nextSections) : [createSection({ title: 'Section 1' })];
        const remainingQuestions = getAllQuestions(normalizedSections);
        return {
            sections: normalizeSectionTree(normalizedSections),
            activeQuestionId: remainingQuestions.some((question) => question.id === activeQuestionId) ? activeQuestionId : (remainingQuestions[0]?.id || ''),
            removed: true,
            message: ''
        };
    }

    function moveSection(sections, sourceSectionId, targetSectionId, position) {
        if (!sourceSectionId || !targetSectionId || sourceSectionId === targetSectionId) {
            return normalizeSectionTree(cloneSections(sections));
        }

        const nextSections = normalizeSectionTree(cloneSections(sections));
        const sourceIndex = nextSections.findIndex((section) => section.id === sourceSectionId);
        const targetIndex = nextSections.findIndex((section) => section.id === targetSectionId);
        if (sourceIndex === -1 || targetIndex === -1) {
            return nextSections;
        }

        const [movedSection] = nextSections.splice(sourceIndex, 1);
        const baseTargetIndex = nextSections.findIndex((section) => section.id === targetSectionId);
        nextSections.splice(position === 'after' ? baseTargetIndex + 1 : baseTargetIndex, 0, movedSection);
        return normalizeSectionTree(nextSections);
    }

    function moveSectionByOffset(sections, sectionId, offset) {
        const nextSections = normalizeSectionTree(cloneSections(sections));
        const sourceIndex = nextSections.findIndex((section) => section.id === sectionId);
        const targetIndex = sourceIndex + offset;
        if (sourceIndex === -1 || targetIndex < 0 || targetIndex >= nextSections.length) {
            return { sections: nextSections };
        }
        return { sections: moveSection(nextSections, sectionId, nextSections[targetIndex].id, offset > 0 ? 'after' : 'before') };
    }

    function moveQuestion(sections, questionId, targetSectionId, targetQuestionId, position) {
        const nextSections = normalizeSectionTree(cloneSections(sections));
        const sourceLocation = findQuestionLocation(nextSections, questionId);
        if (!sourceLocation) {
            return nextSections;
        }

        const [movingQuestion] = sourceLocation.section.questions.splice(sourceLocation.questionIndex, 1);
        const destinationSection = nextSections.find((section) => section.id === targetSectionId) || sourceLocation.section;
        movingQuestion.sectionId = destinationSection.id;

        if (position === 'end' || !targetQuestionId) {
            destinationSection.questions.push(movingQuestion);
            return normalizeSectionTree(nextSections);
        }

        const destinationQuestionIndex = destinationSection.questions.findIndex((question) => question.id === targetQuestionId);
        if (destinationQuestionIndex === -1) {
            destinationSection.questions.push(movingQuestion);
            return normalizeSectionTree(nextSections);
        }

        destinationSection.questions.splice(position === 'after' ? destinationQuestionIndex + 1 : destinationQuestionIndex, 0, movingQuestion);
        return normalizeSectionTree(nextSections);
    }

    function moveQuestionByOffset(sections, questionId, offset) {
        const flatQuestions = flattenQuestionEntries(sections);
        const sourceIndex = flatQuestions.findIndex((entry) => entry.question.id === questionId);
        const targetIndex = sourceIndex + offset;
        if (sourceIndex === -1 || targetIndex < 0 || targetIndex >= flatQuestions.length) {
            return { sections: normalizeSectionTree(cloneSections(sections)) };
        }
        const targetEntry = flatQuestions[targetIndex];
        return { sections: moveQuestion(sections, questionId, targetEntry.section.id, targetEntry.question.id, offset > 0 ? 'after' : 'before') };
    }

    function updateQuestion(questionId, updater) {
        const nextSections = normalizeSectionTree(cloneSections(state.sections));
        const location = findQuestionLocation(nextSections, questionId);
        if (!location) {
            return;
        }

        const updatedQuestion = updater({
            ...location.question,
            options: location.question.options.slice(),
            correctAnswers: location.question.correctAnswers.slice()
        });
        location.section.questions[location.questionIndex] = normalizeQuestion(updatedQuestion, location.section.id);
        location.section.questions[location.questionIndex].sectionId = location.section.id;
        state.sections = normalizeSectionTree(nextSections);
    }

    function updateSection(sectionId, updater) {
        const nextSections = normalizeSectionTree(cloneSections(state.sections));
        const sectionIndex = nextSections.findIndex((section) => section.id === sectionId);
        if (sectionIndex === -1) {
            return;
        }

        const updatedSection = updater({ ...nextSections[sectionIndex], questions: nextSections[sectionIndex].questions.slice() });
        nextSections[sectionIndex] = createSection(updatedSection);
        nextSections[sectionIndex].id = sectionId;
        nextSections[sectionIndex].questions = nextSections[sectionIndex].questions.map((question) => normalizeQuestion(question, sectionId));
        state.sections = normalizeSectionTree(nextSections);
    }

    function findQuestionLocation(sections, questionId) {
        const flatQuestions = flattenQuestionEntries(sections);
        const globalIndex = flatQuestions.findIndex((entry) => entry.question.id === questionId);
        if (globalIndex === -1) {
            return null;
        }
        const entry = flatQuestions[globalIndex];
        return {
            section: entry.section,
            sectionIndex: entry.sectionIndex,
            question: entry.question,
            questionIndex: entry.questionIndex,
            globalIndex
        };
    }

    function flattenQuestionEntries(sections) {
        const entries = [];
        (Array.isArray(sections) ? sections : []).forEach((section, sectionIndex) => {
            section.questions.forEach((question, questionIndex) => {
                entries.push({ section, sectionIndex, question, questionIndex });
            });
        });
        return entries;
    }

    function getAllQuestions(sections) {
        return (Array.isArray(sections) ? sections : []).flatMap((section) => Array.isArray(section.questions) ? section.questions : []);
    }

    function createQuestionNumberMap(sections) {
        const map = new Map();
        let questionNumber = 1;
        (Array.isArray(sections) ? sections : []).forEach((section) => {
            (Array.isArray(section.questions) ? section.questions : []).forEach((question) => {
                map.set(question.id, questionNumber);
                questionNumber += 1;
            });
        });
        return map;
    }

    function normalizeSectionTree(sections) {
        const sourceSections = Array.isArray(sections) && sections.length ? sections : [createSection({ title: 'Section 1' })];
        return sourceSections.map((section, sectionIndex) => {
            const normalizedSection = createSection({
                id: section.id || generateSectionId(),
                title: String(section.title || '').trim() || `Section ${sectionIndex + 1}`,
                description: String(section.description || '').trim(),
                order: sectionIndex,
                questions: []
            });
            normalizedSection.questions = Array.isArray(section.questions)
                ? section.questions.map((question, questionIndex) => ({ ...normalizeQuestion(question, normalizedSection.id), sectionId: normalizedSection.id, order: questionIndex }))
                : [];
            return normalizedSection;
        });
    }

    function cloneSections(sections) {
        return normalizeSectionTree((Array.isArray(sections) ? sections : []).map((section) => ({
            id: section.id,
            title: section.title,
            description: section.description,
            order: section.order,
            questions: Array.isArray(section.questions) ? section.questions.map((question) => ({
                id: question.id,
                sectionId: question.sectionId,
                order: question.order,
                type: question.type,
                title: question.title,
                description: question.description,
                required: question.required,
                points: question.points,
                options: Array.isArray(question.options) ? question.options.slice() : [],
                correctAnswers: Array.isArray(question.correctAnswers) ? question.correctAnswers.slice() : [],
                caseSensitive: question.caseSensitive
            })) : []
        })));
    }

    function getDropPosition(element, event) {
        const rect = element.getBoundingClientRect();
        return event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
    }

    function createUniqueId(baseValue, seenIds, prefix, index) {
        const base = String(baseValue || '').trim() || `${prefix}-${index + 1}`;
        let candidate = base;
        let suffix = 2;
        while (seenIds.has(candidate)) {
            candidate = `${base}-${suffix}`;
            suffix += 1;
        }
        seenIds.add(candidate);
        return candidate;
    }

    function isCompactLayout() {
        return Boolean(root?.matchMedia?.('(max-width: 1100px)').matches);
    }

    function normalizeQuestionType(type) {
        const allowed = ['multiple_choice', 'checkbox', 'short_answer', 'paragraph', 'true_false'];
        return allowed.includes(type) ? type : 'multiple_choice';
    }

    function readableQuestionType(type) {
        return {
            multiple_choice: 'Multiple Choice',
            checkbox: 'Checkbox',
            short_answer: 'Short Answer',
            paragraph: 'Paragraph',
            true_false: 'True / False'
        }[type] || 'Question';
    }

    function generateQuestionId() {
        return `question-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
    }

    function generateSectionId() {
        return `section-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
    }

    function getValue(id) {
        return document.getElementById(id)?.value?.trim() || '';
    }

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        }
    }

    function setChecked(id, checked) {
        const element = document.getElementById(id);
        if (element) {
            element.checked = checked;
        }
    }

    function setStatus(message) {
        const element = document.getElementById('teacherQuizBuilderStatus');
        if (element) {
            element.textContent = message;
        }
    }

    function setBusyState(isBusy) {
        document.getElementById('teacherQuizSaveDraftButton')?.toggleAttribute('disabled', isBusy);
        document.getElementById('teacherQuizPublishButton')?.toggleAttribute('disabled', isBusy);
    }

    function formatDateTimeLocal(value) {
        if (!value) {
            return '';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - offset * 60000);
        return localDate.toISOString().slice(0, 16);
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/"/g, '&quot;');
    }

    return {
        init,
        __testables: {
            createQuestion,
            createSection,
            normalizeSections,
            normalizeQuestionType,
            convertQuestionToType,
            insertQuestionAfterActive,
            duplicateQuestionById,
            removeQuestionById,
            removeSectionById,
            moveQuestion,
            moveSection,
            moveSectionByOffset,
            moveQuestionByOffset,
            normalizeSectionTree
        }
    };
});
