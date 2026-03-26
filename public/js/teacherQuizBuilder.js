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
        quizStatus: 'draft',
        activeQuestionId: '',
        currentTab: 'questions',
        lastSavedQuizId: '',
        lastSavedSignature: '',
        initialSignature: '',
        lastSavedAt: null,
        sectionMessages: {},
        dragItem: null,
        dragPreview: null,
        questionNavExpanded: false,
        questionNavUserControlled: false,
        questionNavDrag: null,
        questionNavSuppressClickUntil: 0,
        workspaceStatusExpanded: false,
        questionDescriptionExpanded: {},
        questionSecondaryExpanded: {},
        isBusy: false
    };
    let activeConfirmDialog = null;
    const shortAnswerHelpers = resolveShortAnswerHelpers(root);

    function init() {
        state.lastSavedQuizId = getQuizId();
        state.questionDescriptionExpanded = {};
        wireEvents();
        syncPreviewLink();
        showTab('questions');
        syncWorkspaceStatusVisibility();
        Promise.all([loadClasses(), loadQuizIfEditing()]);
    }

    function wireEvents() {
        document.addEventListener('click', handleQuestionTypeButtonClick);
        document.addEventListener('click', handleQuickAddDropdownClick);
        document.addEventListener('keydown', handleGlobalKeydown);
        root?.addEventListener('resize', handleViewportChange);
        root?.document?.addEventListener('scroll', handleViewportChange, true);
        document.querySelectorAll('[data-builder-add-section]').forEach((button) => {
            button.addEventListener('click', addSection);
        });
        document.querySelectorAll('[data-builder-tab]').forEach((button) => {
            button.addEventListener('click', () => showTab(button.dataset.builderTab));
        });
        document.getElementById('teacherQuizSaveDraftButton')?.addEventListener('click', saveDraftQuiz);
        document.getElementById('teacherQuizPublishButton')?.addEventListener('click', publishQuiz);
        document.getElementById('teacherQuizQuestionNav')?.addEventListener('click', handleQuestionNavClick);
        document.getElementById('teacherQuizQuestionNav')?.addEventListener('pointerdown', handleQuestionNavPointerDown);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('click', handleQuestionListClick);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('focusin', handleQuestionListFocus);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('input', handleQuestionFieldChange);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('change', handleQuestionFieldChange);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('dragstart', handleDragStart);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('dragover', handleDragOver);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('drop', handleDrop);
        document.getElementById('teacherQuizQuestionList')?.addEventListener('dragend', clearDragState);
        document.getElementById('teacherQuizReadinessList')?.addEventListener('click', handleReadinessActionClick);
        document.getElementById('teacherQuizFocusFirstIssueButton')?.addEventListener('click', focusFirstIncompleteReadinessItem);
        document.getElementById('teacherQuizWorkspaceStatusToggle')?.addEventListener('click', toggleWorkspaceStatus);
        document.getElementById('teacherQuizConfirmModal')?.addEventListener('click', handleConfirmModalClick);
        document.getElementById('teacherQuizConfirmCancelButton')?.addEventListener('click', () => closeConfirmDialog(false));
        document.getElementById('teacherQuizConfirmButton')?.addEventListener('click', () => closeConfirmDialog(true));
        document.querySelectorAll('[data-builder-dock-action="save"]').forEach((button) => {
            button.addEventListener('click', saveDraftQuiz);
        });
        document.querySelectorAll('[data-builder-dock-action="preview"]').forEach((button) => {
            button.addEventListener('click', openDockPreview);
        });
        document.querySelectorAll('[data-builder-dock-action="publish"]').forEach((button) => {
            button.addEventListener('click', publishQuiz);
        });
        document.getElementById('teacherQuizQuestionNavToggle')?.addEventListener('click', toggleQuestionNav);

        [
            'teacherQuizTitle',
            'teacherQuizDescription',
            'teacherQuizSubject',
            'teacherQuizClassId',
            'teacherQuizType',
            'teacherQuizStartAt',
            'teacherQuizEndAt',
            'teacherQuizTimeLimit',
            'teacherQuizShowScoreMode',
            'teacherQuizRequireLogin',
            'teacherQuizOneResponse',
            'teacherQuizRandomizeQuestions',
            'teacherQuizRandomizeOptions'
        ].forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', renderBuilderSummary);
                element.addEventListener('change', renderBuilderSummary);
            }
        });

        document.getElementById('teacherQuizTitle')?.addEventListener('input', () => {
            setFieldError('teacherQuizTitle', 'quizTitleError', '');
            const dockInput = document.getElementById('teacherQuizDockTitleInput');
            if (dockInput && document.activeElement !== dockInput) {
                dockInput.value = document.getElementById('teacherQuizTitle').value;
            }
        });

        document.getElementById('teacherQuizDockTitleInput')?.addEventListener('input', () => {
            const mainInput = document.getElementById('teacherQuizTitle');
            if (mainInput) {
                mainInput.value = document.getElementById('teacherQuizDockTitleInput').value;
                mainInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        document.getElementById('teacherQuizClassId')?.addEventListener('change', () => {
            setFieldError('teacherQuizClassId', 'quizClassError', '');
        });
    }

    function resolveShortAnswerHelpers(runtimeRoot) {
        if (runtimeRoot?.teacherQuizBuilderShortAnswer) {
            return runtimeRoot.teacherQuizBuilderShortAnswer;
        }

        if (typeof require === 'function') {
            try {
                return require('./teacherQuizBuilderShortAnswer.js');
            } catch (error) {
                console.error('Teacher quiz Short Answer helper load failed:', error);
            }
        }

        throw new Error('teacherQuizBuilderShortAnswer helpers are required before teacherQuizBuilder.');
    }

    function isOpenTextQuestion(questionOrType) {
        return shortAnswerHelpers.isOpenTextQuestion(questionOrType);
    }

    function isOpenTextQuestionType(type) {
        return shortAnswerHelpers.isOpenTextQuestionType(type);
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
        state.quizStatus = normalizeQuizStatus(quiz.status);
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
        state.questionDescriptionExpanded = {};
        state.questionSecondaryExpanded = {};

        renderClassOptions(quiz.classId || '');
        state.lastSavedSignature = computeBuilderSignature();
        state.initialSignature = state.lastSavedSignature;
        state.lastSavedAt = null;
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

    function toggleWorkspaceStatus() {
        state.workspaceStatusExpanded = !state.workspaceStatusExpanded;
        syncWorkspaceStatusVisibility();
    }

    function syncWorkspaceStatusVisibility() {
        const body = document.getElementById('teacherQuizWorkspaceStatusBody');
        const button = document.getElementById('teacherQuizWorkspaceStatusToggle');
        const card = body?.closest('.teacher-quiz-builder-command-card');
        if (body) {
            body.hidden = !state.workspaceStatusExpanded;
        }
        if (card) {
            card.classList.toggle('teacher-quiz-builder-command-card-collapsed', !state.workspaceStatusExpanded);
        }
        if (button) {
            button.setAttribute('aria-expanded', String(state.workspaceStatusExpanded));
            const icon = button.querySelector('[data-workspace-status-toggle-icon]');
            const label = button.querySelector('[data-workspace-status-toggle-label]');
            if (icon) {
                icon.textContent = state.workspaceStatusExpanded ? 'expand_less' : 'expand_more';
            }
            if (label) {
                label.textContent = state.workspaceStatusExpanded ? 'Hide panel' : 'Show panel';
            }
        }
    }

    function renderQuestions(options = {}) {
        ensureBuilderState();
        ensureActiveQuestion();
        renderQuestionNav();
        renderQuestionList();
        renderBuilderSummary();
        syncQuestionNavVisibility();
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
            <section class="teacher-quiz-builder-question-nav-group" data-nav-section-group="true" data-section-id="${escapeAttribute(section.id)}">
                <div class="teacher-quiz-builder-question-nav-section-heading">
                    <span class="teacher-quiz-builder-question-nav-section-index">Section ${sectionIndex + 1}</span>
                    <span class="teacher-quiz-builder-question-nav-section-label">${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</span>
                </div>
                <div class="teacher-quiz-builder-question-nav-group-items" data-nav-section-items="true" data-section-id="${escapeAttribute(section.id)}">
                    ${section.questions.length
                        ? section.questions.map((question) => renderQuestionNavItem(question, section.id, questionNumberMap)).join('')
                        : '<p class="teacher-quiz-builder-question-nav-empty">No questions in this section yet.</p>'
                    }
                    <div class="teacher-quiz-builder-question-nav-end-dropzone" data-nav-section-end-dropzone="true" data-section-id="${escapeAttribute(section.id)}" aria-hidden="true">
                        <span>Move to section end</span>
                    </div>
                </div>
            </section>
        `).join('');
        syncQuestionNavDragState();
    }

    function renderQuestionNavItem(question, sectionId, questionNumberMap) {
        const activeClass = question.id === state.activeQuestionId ? ' teacher-quiz-builder-question-nav-item-active' : '';
        const readinessTone = isQuestionReadyForPublish(question) ? 'ready' : 'pending';
        const readinessLabel = isQuestionReadyForPublish(question) ? 'Ready' : 'Needs setup';

        return `
            <div class="teacher-quiz-builder-question-nav-item${activeClass}" data-nav-question-item="true" data-nav-question-id="${escapeAttribute(question.id)}" data-nav-section-id="${escapeAttribute(sectionId)}">
                <button type="button" class="teacher-quiz-builder-question-nav-item-button" data-nav-question-button="true" data-nav-question-id="${escapeAttribute(question.id)}">
                    <div class="teacher-quiz-builder-question-nav-top">
                        <span class="teacher-quiz-builder-question-nav-index">Question ${questionNumberMap.get(question.id) || 0}</span>
                        <span class="teacher-quiz-builder-question-nav-status teacher-quiz-builder-question-nav-status-${readinessTone}">${readinessLabel}</span>
                    </div>
                    <span class="teacher-quiz-builder-question-nav-label">${escapeHtml(question.title || readableQuestionType(question.type))}</span>
                    <span class="teacher-quiz-builder-question-nav-meta">${escapeHtml(readableQuestionType(question.type))} | ${escapeHtml(formatPointsLabel(question.points))}</span>
                </button>
                <button type="button" class="teacher-quiz-builder-question-nav-drag-handle" data-nav-drag-handle="true" data-nav-question-id="${escapeAttribute(question.id)}" data-nav-section-id="${escapeAttribute(sectionId)}" aria-label="Drag to reorder question" title="Drag to reorder question">
                    <span class="material-icons" aria-hidden="true">drag_indicator</span>
                </button>
            </div>
        `;
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
        const sectionQuestionCount = section.questions.length;
        const sectionPoints = section.questions.reduce((sum, question) => sum + Math.max(0, Number(question.points || 0)), 0);
        const sectionCardPreview = getSectionCardDragPreview(section.id);
        const sectionDropzonePreview = getSectionDropzoneDragPreview(section.id);

        return `
            <article class="teacher-card teacher-quiz-builder-section-card${isDraggedSection(section.id) ? ' teacher-quiz-builder-dragging' : ''}${sectionCardPreview ? ` ${dragPreviewClassName(sectionCardPreview)}` : ''}" data-section-card="true" data-section-id="${escapeAttribute(section.id)}" id="${sectionElementId(section.id)}">
                <div class="teacher-quiz-builder-section-card-accent"></div>
                <div class="teacher-quiz-builder-section-card-body">
                    <div class="teacher-quiz-builder-section-header">
                        <div class="teacher-quiz-builder-section-heading">
                            <div class="teacher-quiz-builder-section-heading-top">
                                <div class="teacher-quiz-builder-section-topbar">
                                    <p class="teacher-eyebrow">Section ${sectionIndex + 1}</p>
                                    <span class="material-icons teacher-quiz-builder-drag-handle" draggable="true" aria-label="Reorder" data-tooltip="Reorder" data-drag-type="section" data-section-id="${escapeAttribute(section.id)}">drag_indicator</span>
                                    <div class="teacher-quiz-builder-section-actions">
                                        <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-mobile-sort-button teacher-quiz-builder-action-icon-btn" data-action="move-section-up" data-section-id="${escapeAttribute(section.id)}" title="Move Up" aria-label="Move section up"><span class="material-icons" aria-hidden="true">arrow_upward</span><span class="teacher-quiz-builder-action-label">Move Up</span></button>
                                        <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-mobile-sort-button teacher-quiz-builder-action-icon-btn" data-action="move-section-down" data-section-id="${escapeAttribute(section.id)}" title="Move Down" aria-label="Move section down"><span class="material-icons" aria-hidden="true">arrow_downward</span><span class="teacher-quiz-builder-action-label">Move Down</span></button>
                                        <button type="button" class="teacher-btn teacher-btn-danger teacher-btn-small teacher-quiz-builder-action-icon-btn" data-action="delete-section" data-section-id="${escapeAttribute(section.id)}" title="Delete Section" aria-label="Delete section"><span class="material-icons" aria-hidden="true">delete_outline</span><span class="teacher-quiz-builder-action-label">Delete Section</span></button>
                                    </div>
                                </div>
                                <div class="teacher-quiz-builder-section-title-stack">
                                    <input type="text" class="teacher-input teacher-quiz-builder-section-title-input" data-section-field="title" data-section-id="${escapeAttribute(section.id)}" value="${escapeAttribute(section.title)}" placeholder="Section title">
                                    <div class="teacher-quiz-builder-section-stats-row">
                                        <div class="teacher-quiz-builder-section-stats" aria-label="Section summary">
                                            <span class="teacher-quiz-builder-section-stat">${escapeHtml(formatCountLabel(sectionQuestionCount, 'question'))}</span>
                                            <span class="teacher-quiz-builder-section-stat">${escapeHtml(formatPointsLabel(sectionPoints))}</span>
                                        </div>
                                        <p class="teacher-meta teacher-quiz-builder-section-guidance">Group related questions together and control their authored order.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <label class="teacher-quiz-builder-question-body-row">
                        <textarea class="teacher-textarea teacher-quiz-builder-section-description" data-section-field="description" data-section-id="${escapeAttribute(section.id)}" placeholder="Optional section instructions">${escapeHtml(section.description || '')}</textarea>
                    </label>

                    ${message ? `<p class="teacher-quiz-builder-section-message">${escapeHtml(message)}</p>` : ''}

                    <div class="teacher-quiz-builder-section-questions${sectionDropzonePreview ? ` ${dragPreviewClassName(sectionDropzonePreview)}` : ''}" data-section-dropzone="true" data-section-id="${escapeAttribute(section.id)}">
                        ${section.questions.length
                            ? section.questions.map((question) => renderQuestionCard(question, section.id, questionNumberMap)).join('')
                            : '<div class="teacher-quiz-builder-section-empty"><p class="teacher-empty-state">No questions yet — use the toolbar above or the button below to add one.</p></div>'
                        }
                    </div>

                    <div class="teacher-quiz-builder-section-footer">
                        <div class="teacher-dropdown teacher-quiz-builder-section-add-dropdown">
                            <button
                                type="button"
                                class="teacher-btn teacher-btn-secondary teacher-quiz-builder-section-add-toggle"
                                id="teacherQuizSectionAddToggle-${escapeAttribute(section.id)}"
                                data-builder-dropdown-toggle="true"
                                aria-haspopup="true"
                                aria-expanded="false"
                            >
                                <span class="material-icons" aria-hidden="true">add</span>
                                <span>Add Question</span>
                            </button>
                            <div class="dropdown-menu teacher-quiz-builder-section-add-menu" aria-labelledby="teacherQuizSectionAddToggle-${escapeAttribute(section.id)}" hidden>
                                <button type="button" data-question-type="multiple_choice" data-section-id="${escapeAttribute(section.id)}">
                                    <span class="material-icons" aria-hidden="true">radio_button_checked</span>
                                    Multiple Choice
                                </button>
                                <button type="button" data-question-type="checkbox" data-section-id="${escapeAttribute(section.id)}">
                                    <span class="material-icons" aria-hidden="true">check_box</span>
                                    Checkbox
                                </button>
                                <button type="button" data-question-type="short_answer" data-section-id="${escapeAttribute(section.id)}">
                                    <span class="material-icons" aria-hidden="true">short_text</span>
                                    Short Answer
                                </button>
                                <button type="button" data-question-type="paragraph" data-section-id="${escapeAttribute(section.id)}">
                                    <span class="material-icons" aria-hidden="true">notes</span>
                                    Paragraph
                                </button>
                                <button type="button" data-question-type="true_false" data-section-id="${escapeAttribute(section.id)}">
                                    <span class="material-icons" aria-hidden="true">toggle_on</span>
                                    True / False
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    function renderQuestionCard(question, sectionId, questionNumberMap) {
        const questionNumber = questionNumberMap.get(question.id) || 0;
        const questionReady = isQuestionReadyForPublish(question);
        const secondaryExpanded = Boolean(state.questionSecondaryExpanded[question.id]);
        const responseSummary = summarizeQuestionResponseShape(question);
        const questionCardPreview = getQuestionCardDragPreview(sectionId, question.id);
        const isOpenTextQuestion = question.type === 'short_answer' || question.type === 'paragraph';
        const showQuestionSettingsMenu = true;

        return `
            <article class="teacher-card teacher-quiz-builder-question-card${question.id === state.activeQuestionId ? ' teacher-quiz-builder-question-card-active' : ''}${isDraggedQuestion(question.id) ? ' teacher-quiz-builder-dragging' : ''}${questionCardPreview ? ` ${dragPreviewClassName(questionCardPreview)}` : ''}" data-question-card="true" data-question-id="${escapeAttribute(question.id)}" data-section-id="${escapeAttribute(sectionId)}" id="${questionElementId(question.id)}">
                <div class="teacher-quiz-builder-question-card-accent"></div>
                <div class="teacher-quiz-builder-question-card-body">
                    <div class="teacher-quiz-builder-question-card-header teacher-quiz-builder-question-card-header-forms">
                        <div class="teacher-quiz-builder-question-anchor-row">
                            <p class="teacher-eyebrow">Question ${questionNumber}</p>
                            <span class="material-icons teacher-quiz-builder-drag-handle" draggable="true" aria-label="Reorder" data-tooltip="Reorder" data-drag-type="question" data-question-id="${escapeAttribute(question.id)}" data-section-id="${escapeAttribute(sectionId)}">drag_indicator</span>
                            <div class="teacher-quiz-builder-question-actions">
                                <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-mobile-sort-button teacher-quiz-builder-action-icon-btn" data-action="move-question-up" data-question-id="${escapeAttribute(question.id)}" title="Move Up" aria-label="Move question up"><span class="material-icons" aria-hidden="true">arrow_upward</span><span class="teacher-quiz-builder-action-label">Move Up</span></button>
                                <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-mobile-sort-button teacher-quiz-builder-action-icon-btn" data-action="move-question-down" data-question-id="${escapeAttribute(question.id)}" title="Move Down" aria-label="Move question down"><span class="material-icons" aria-hidden="true">arrow_downward</span><span class="teacher-quiz-builder-action-label">Move Down</span></button>
                                <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-action-icon-btn" data-action="duplicate-question" data-question-id="${escapeAttribute(question.id)}" title="Duplicate" aria-label="Duplicate question"><span class="material-icons" aria-hidden="true">content_copy</span><span class="teacher-quiz-builder-action-label">Duplicate</span></button>
                                <button type="button" class="teacher-btn teacher-btn-danger teacher-btn-small teacher-quiz-builder-action-icon-btn" data-action="delete-question" data-question-id="${escapeAttribute(question.id)}" title="Delete" aria-label="Delete question"><span class="material-icons" aria-hidden="true">delete_outline</span><span class="teacher-quiz-builder-action-label">Delete</span></button>
                            </div>
                        </div>
                        <div class="teacher-quiz-builder-question-editor-row">
                            <label class="teacher-quiz-builder-question-prompt-wrap">
                                <input
                                    type="text"
                                    class="teacher-input teacher-quiz-builder-question-prompt-input"
                                    data-field="title"
                                    data-question-id="${escapeAttribute(question.id)}"
                                    value="${escapeAttribute(question.title)}"
                                    placeholder="Untitled Question"
                                >
                            </label>
                            <label class="teacher-quiz-builder-question-type-shell">
                                <select class="teacher-select teacher-quiz-builder-question-type-picker" data-field="type" data-question-id="${escapeAttribute(question.id)}" aria-label="Question Type">
                                    ${questionTypeOptions(question.type)}
                                </select>
                            </label>
                        </div>
                    </div>

                    ${renderAnswerEditor(question, {
                        isOpenTextQuestion,
                        isExpanded: secondaryExpanded,
                        responseSummary,
                        questionReady
                    })}

                    ${isOpenTextQuestion ? '' : `
                    <div class="teacher-quiz-builder-question-footer teacher-quiz-builder-question-footer-forms">
                        <div class="teacher-quiz-builder-question-footer-controls teacher-quiz-builder-question-footer-controls-forms">
                            <div class="teacher-quiz-builder-question-footer-summary">
                                <span class="teacher-quiz-builder-question-status teacher-quiz-builder-question-status-${questionReady ? 'ready' : 'pending'}">${questionReady ? 'Ready' : 'Needs setup'}</span>
                                <span class="teacher-quiz-builder-question-chip">${escapeHtml(formatPointsLabel(question.points))}</span>
                                <span class="teacher-quiz-builder-question-chip">${question.required !== false ? 'Required' : 'Optional'}</span>
                                <span class="teacher-quiz-builder-question-chip">${escapeHtml(responseSummary)}</span>
                            </div>
                            <label class="teacher-checkbox-row">
                                <input type="checkbox" data-field="required" data-question-id="${escapeAttribute(question.id)}" ${question.required ? 'checked' : ''}>
                                <span>Required</span>
                            </label>
                            ${showQuestionSettingsMenu ? renderQuestionSettingsDropdown(question) : ''}
                        </div>
                    </div>
                    `}

                    ${renderQuestionSecondaryPanel(question, secondaryExpanded)}
                </div>
            </article>
        `;
    }

    function renderQuestionSecondaryPanel(question, isExpanded) {
        const openTextQuestion = isOpenTextQuestion(question);
        if (!openTextQuestion) {
            return renderQuestionDescriptionEditor(question);
        }

        // Description for open-text questions is rendered inline inside the answer editor.
        return '';
    }

    function renderQuestionDescriptionEditor(question, options = {}) {
        const isVisible = options.forceVisible || Boolean(state.questionDescriptionExpanded[question.id]);

        if (!isVisible) {
            return '';
        }

        return `
            <div class="teacher-quiz-builder-question-description-block">
                <div class="teacher-quiz-builder-question-optional-head">
                    <span class="teacher-field-label">Description</span>
                    ${options.forceVisible
                        ? ''
                        : String(question.description || '').trim()
                        ? ''
                        : `<button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-question-optional-dismiss" data-action="hide-question-description" data-question-id="${escapeAttribute(question.id)}">Hide</button>`
                    }
                </div>
                <label class="teacher-quiz-builder-question-body-row">
                    <textarea class="teacher-textarea" data-field="description" data-question-id="${escapeAttribute(question.id)}" placeholder="Optional helper text">${escapeHtml(question.description)}</textarea>
                </label>
            </div>
        `;
    }

    function renderAnswerEditor(question, options = {}) {
        if (options.isOpenTextQuestion) {
            return renderOpenTextAnswerEditor(question, options);
        }

        return `
            <fieldset class="quiz-fieldset teacher-quiz-builder-choices-fieldset teacher-quiz-builder-choices-fieldset-${escapeAttribute(question.type)} teacher-quiz-builder-answer-sheet">
                <legend class="quiz-legend">${escapeHtml(readableQuestionType(question.type))}</legend>
                <div class="radio-group">
                    ${question.options.map((option, optionIndex) => renderOptionRow(question, option, optionIndex)).join('')}
                </div>
                <div class="teacher-quiz-builder-answer-add-row">
                    ${question.type !== 'true_false' ? `
                        <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="add-option" data-question-id="${escapeAttribute(question.id)}"><span class="material-icons" aria-hidden="true">add</span> Add option</button>
                        <button type="button" class="teacher-btn teacher-btn-ghost teacher-btn-small teacher-quiz-builder-answer-link" data-action="add-other-option" data-question-id="${escapeAttribute(question.id)}">add "Other"</button>
                    ` : ''}
                    ${renderPointsInlineControl(question)}
                </div>
            </fieldset>
        `;
    }

    function summarizeOpenTextAdvanced(question) {
        return shortAnswerHelpers.summarizeOpenTextAdvanced(question);
    }

    function renderPointsInlineControl(question) {
        return `
            <label class="teacher-quiz-builder-points-inline-shell">
                <span class="teacher-field-label">Points</span>
                <input
                    type="number"
                    min="0"
                    class="teacher-input teacher-quiz-builder-points-inline-input"
                    data-field="points"
                    data-question-id="${escapeAttribute(question.id)}"
                    value="${escapeAttribute(question.points)}"
                >
            </label>
        `;
    }

    function renderOpenTextAnswerEditor(question, options = {}) {
        return shortAnswerHelpers.renderOpenTextAnswerEditor(question, {
            responseSummary: options.responseSummary,
            renderPointsInlineControl,
            renderSettingsControl: renderQuestionSettingsDropdown,
            renderDescriptionControl: renderQuestionDescriptionEditor,
            renderResponseValidationControl: renderShortAnswerValidationEditor,
            summarizeQuestionResponseShape,
            escapeHtml,
            escapeAttribute
        });
    }

    function renderShortAnswerValidationEditor(question) {
        const secondaryExpanded = Boolean(state.questionSecondaryExpanded[question.id]);
        if (question.type !== 'short_answer' || !secondaryExpanded) {
            return '';
        }

        return shortAnswerHelpers.renderShortAnswerValidationEditor(question, {
            escapeHtml,
            escapeAttribute
        });
    }

    function renderQuestionSettingsDropdown(question) {
        const hasDescription = Boolean(String(question.description || '').trim()) || Boolean(state.questionDescriptionExpanded[question.id]);
        const supportsOptionShuffle = questionSupportsOptionShuffle(question);
        const supportsAnswerRouting = questionSupportsAnswerRouting(question);
        const isOpenTextQuestion = question.type === 'short_answer' || question.type === 'paragraph';
        const isMultipleChoiceQuestion = question.type === 'multiple_choice';
        const secondaryExpanded = Boolean(state.questionSecondaryExpanded[question.id]);

        return `
            <div class="teacher-dropdown teacher-quiz-builder-question-settings-dropdown">
                <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-quiz-builder-action-icon-btn teacher-quiz-builder-question-more-toggle" data-builder-dropdown-toggle="true" aria-haspopup="true" aria-expanded="false" title="Question settings" aria-label="Question settings">
                    <span class="material-icons" aria-hidden="true">more_vert</span>
                    <span class="teacher-quiz-builder-action-label">Question settings</span>
                </button>
                <div class="dropdown-menu teacher-quiz-builder-question-settings-menu" hidden>
                    <button type="button" class="teacher-quiz-builder-question-settings-item" data-action="show-question-description" data-question-id="${escapeAttribute(question.id)}">
                        <span class="material-icons" aria-hidden="true">notes</span>
                        <span>${hasDescription ? 'Edit description' : 'Add description'}</span>
                    </button>
                    ${isMultipleChoiceQuestion && supportsOptionShuffle ? `
                        <button type="button" class="teacher-quiz-builder-question-settings-item" data-action="toggle-question-option-shuffle" data-question-id="${escapeAttribute(question.id)}">
                            <span class="material-icons" aria-hidden="true">${question.shuffleOptionOrder ? 'check_box' : 'check_box_outline_blank'}</span>
                            <span>Shuffle option order</span>
                        </button>
                    ` : ''}
                    ${isMultipleChoiceQuestion && supportsAnswerRouting ? `
                        <button type="button" class="teacher-quiz-builder-question-settings-item" data-action="toggle-question-answer-routing" data-question-id="${escapeAttribute(question.id)}">
                            <span class="material-icons" aria-hidden="true">${question.goToSectionBasedOnAnswer ? 'check_box' : 'check_box_outline_blank'}</span>
                            <span>Go to section based on answer</span>
                        </button>
                    ` : ''}
                    ${question.type === 'short_answer' ? `
                        <button type="button" class="teacher-quiz-builder-question-settings-item" data-action="toggle-question-secondary" data-question-id="${escapeAttribute(question.id)}" aria-expanded="${secondaryExpanded ? 'true' : 'false'}">
                            <span class="material-icons" aria-hidden="true">${secondaryExpanded ? 'rule' : 'rule'}</span>
                            <span>Response validation</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function renderOptionRow(question, option, optionIndex) {
        const inputType = question.type === 'checkbox' ? 'checkbox' : 'radio';
        const isCorrect = question.correctAnswers.includes(option);
        const letter = String.fromCharCode(65 + optionIndex);
        const correctIcon = question.type === 'checkbox'
            ? (isCorrect ? 'check_box' : 'check_box_outline_blank')
            : (isCorrect ? 'radio_button_checked' : 'radio_button_unchecked');
        const correctText = question.type === 'checkbox'
            ? (isCorrect ? 'Correct answer' : 'Mark correct')
            : (isCorrect ? 'Correct answer' : 'Set as correct');
        return `
            <div class="radio-label teacher-quiz-builder-option-row-card teacher-quiz-builder-option-row-card-${escapeAttribute(question.type)}${isCorrect ? ' radio-label-correct' : ''}">
                <span class="teacher-quiz-builder-option-dot" aria-hidden="true">
                    <span class="material-icons">${correctIcon}</span>
                </span>
                <input type="text" class="quiz-text-input" data-field="optionText" data-question-id="${escapeAttribute(question.id)}" data-option-index="${optionIndex}" value="${escapeAttribute(option)}" ${question.type === 'true_false' ? 'disabled' : ''} placeholder="Choice ${letter}">
                <label class="teacher-quiz-builder-option-correct-wrap" title="${inputType === 'radio' ? 'Mark as correct answer' : 'Toggle as correct'}" data-tooltip="${inputType === 'radio' ? 'Mark as correct answer' : 'Mark as correct answer'}">
                    <input type="${inputType}" name="correct-${escapeAttribute(question.id)}" data-field="correctOption" data-question-id="${escapeAttribute(question.id)}" data-option-index="${optionIndex}" ${isCorrect ? 'checked' : ''}>
                    <span class="material-icons teacher-quiz-builder-option-correct-icon">${correctIcon}</span>
                    <span class="teacher-quiz-builder-option-correct-text">${correctText}</span>
                </label>
                ${question.type !== 'true_false' ? `<button type="button" class="teacher-quiz-builder-option-remove" data-action="remove-option" data-question-id="${escapeAttribute(question.id)}" data-option-index="${optionIndex}" title="Remove choice ${letter}" aria-label="Remove choice ${letter}" data-tooltip="Remove option"><span class="material-icons">close</span></button>` : ''}
            </div>
        `;
    }

    function getChoiceEditorCopy(type) {
        if (type === 'checkbox') {
            return {
                legend: 'Checkbox Answers',
                mode: 'Multiple correct answers',
                hint: 'Select every choice that should count as correct.'
            };
        }

        if (type === 'true_false') {
            return {
                legend: 'True / False Answer',
                mode: 'Single correct answer',
                hint: 'Choose whether True or False is the correct response.'
            };
        }

        return {
            legend: 'Multiple Choice Answers',
            mode: 'Single correct answer',
            hint: 'Select exactly one choice as the answer key for this question.'
        };
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

    function formatCountLabel(value, noun) {
        const count = Math.max(0, Number(value || 0));
        return `${count} ${noun}${count === 1 ? '' : 's'}`;
    }

    function formatPointsLabel(value) {
        const points = Math.max(0, Number(value || 0));
        return `${points} pt${points === 1 ? '' : 's'}`;
    }

    function questionSupportsOptionShuffle(question) {
        return ['multiple_choice', 'checkbox', 'true_false'].includes(normalizeQuestionType(question?.type));
    }

    function questionSupportsAnswerRouting(question) {
        return ['multiple_choice', 'checkbox', 'true_false'].includes(normalizeQuestionType(question?.type));
    }

    function summarizeQuestionResponseShape(question) {
        if (question.type === 'short_answer' || question.type === 'paragraph') {
            const acceptedAnswers = Array.isArray(question.correctAnswers)
                ? question.correctAnswers.filter((answer) => String(answer || '').trim()).length
                : 0;
            return acceptedAnswers ? formatCountLabel(acceptedAnswers, 'accepted answer') : 'No answer key';
        }

        const optionCount = Array.isArray(question.options)
            ? question.options.filter((option) => String(option || '').trim()).length
            : 0;
        return optionCount ? formatCountLabel(optionCount, 'option') : 'No options';
    }

    function handleQuestionTypeButtonClick(event) {
        const button = event.target.closest('button[data-question-type]');
        if (!button) {
            return;
        }
        event.preventDefault();
        addQuestion(button.dataset.questionType, button.dataset.sectionId || '');
    }

    function handleQuickAddDropdownClick(event) {
        const toggle = event.target.closest('[data-builder-dropdown-toggle]');
        if (toggle) {
            event.preventDefault();
            const dropdown = toggle.closest('.teacher-dropdown');
            const shouldOpen = toggle.getAttribute('aria-expanded') !== 'true';
            closeDropdowns(dropdown);
            setDropdownOpen(dropdown, shouldOpen);
            return;
        }

        if (event.target.closest('.dropdown-menu button[data-question-type]')) {
            closeDropdowns();
            return;
        }

        if (!event.target.closest('.teacher-dropdown')) {
            closeDropdowns();
        }
    }

    function handleViewportChange() {
        const openQuestionMenu = document.querySelector('.teacher-quiz-builder-question-settings-dropdown [data-builder-dropdown-toggle][aria-expanded="true"]');
        const dropdown = openQuestionMenu?.closest('.teacher-dropdown');
        if (!dropdown) {
            return;
        }
        positionQuestionSettingsMenu(dropdown);
    }

    function handleGlobalKeydown(event) {
        if (event.key === 'Escape' && activeConfirmDialog) {
            event.preventDefault();
            closeConfirmDialog(false);
            return;
        }

        const key = String(event.key || '').toLowerCase();
        if ((event.ctrlKey || event.metaKey) && !event.altKey && key === 's') {
            event.preventDefault();
            if (!state.isBusy) {
                saveDraftQuiz();
            }
            return;
        }

        if (event.key === 'Escape') {
            closeDropdowns();
        }
    }

    function getConfirmDialogElements() {
        if (!root?.document) {
            return {};
        }

        return {
            shell: root.document.getElementById('teacherQuizConfirmModal'),
            title: root.document.getElementById('teacherQuizConfirmModalTitle'),
            message: root.document.getElementById('teacherQuizConfirmModalMessage'),
            confirmButton: root.document.getElementById('teacherQuizConfirmButton'),
            cancelButton: root.document.getElementById('teacherQuizConfirmCancelButton')
        };
    }

    function handleConfirmModalClick(event) {
        if (event.target.closest('[data-close-quiz-confirm-modal="true"]')) {
            closeConfirmDialog(false);
        }
    }

    function showConfirmDialog(options = {}) {
        const { shell, title, message, confirmButton, cancelButton } = getConfirmDialogElements();
        const dialogTitle = String(options.title || 'Delete item?');
        const dialogMessage = String(options.message || 'This action cannot be undone.');
        const confirmLabel = String(options.confirmLabel || 'Delete');
        const cancelLabel = String(options.cancelLabel || 'Cancel');

        if (!shell || !title || !message || !confirmButton || !cancelButton) {
            return Promise.resolve(root?.confirm ? root.confirm(dialogMessage) : true);
        }

        closeConfirmDialog(false, { preserveFocus: true, suppressResolve: true });
        title.textContent = dialogTitle;
        message.textContent = dialogMessage;
        confirmButton.textContent = confirmLabel;
        cancelButton.textContent = cancelLabel;
        shell.hidden = false;
        root.document.body?.classList.add('teacher-modal-open');

        return new Promise((resolve) => {
            activeConfirmDialog = {
                resolve,
                opener: root.document.activeElement instanceof root.HTMLElement ? root.document.activeElement : null
            };

            root.setTimeout(() => {
                confirmButton.focus();
            }, 0);
        });
    }

    function closeConfirmDialog(confirmed, options = {}) {
        const { preserveFocus = false, suppressResolve = false } = options;
        const { shell } = getConfirmDialogElements();

        if (shell) {
            shell.hidden = true;
        }
        root?.document?.body?.classList.remove('teacher-modal-open');

        if (!activeConfirmDialog) {
            return;
        }

        const { resolve, opener } = activeConfirmDialog;
        activeConfirmDialog = null;

        if (!preserveFocus && opener && typeof opener.focus === 'function') {
            root.setTimeout(() => {
                opener.focus();
            }, 0);
        }

        if (!suppressResolve && typeof resolve === 'function') {
            resolve(Boolean(confirmed));
        }
    }

    function handleReadinessActionClick(event) {
        const button = event.target.closest('[data-readiness-key]');
        if (!button || button.disabled) {
            return;
        }

        event.preventDefault();
        focusReadinessItem(button.dataset.readinessKey || '');
    }

    function focusFirstIncompleteReadinessItem() {
        const sections = normalizeSectionTree(state.sections);
        const questions = getAllQuestions(sections);
        const readiness = buildReadinessState(sections, questions, getValue('teacherQuizTitle'));
        const firstIncomplete = readiness.items.find((item) => !item.done);
        if (!firstIncomplete) {
            return;
        }

        focusReadinessItem(firstIncomplete.key);
    }

    function focusReadinessItem(readinessKey) {
        const sections = normalizeSectionTree(state.sections);
        const questions = getAllQuestions(sections);

        if (readinessKey === 'title') {
            showTab('questions');
            focusBuilderField('teacherQuizTitle');
            return;
        }

        if (readinessKey === 'class') {
            showTab('questions');
            focusBuilderField('teacherQuizClassId');
            return;
        }

        if (readinessKey === 'section_questions') {
            const missingSection = findSectionWithoutQuestions(sections);
            if (!missingSection) {
                return;
            }
            showTab('questions');
            renderQuestions();
            scrollSectionIntoView(missingSection.id);
            return;
        }

        if (readinessKey === 'question_prompts') {
            const missingPromptQuestion = findQuestionWithoutPrompt(questions);
            if (!missingPromptQuestion) {
                return;
            }
            showTab('questions');
            setActiveQuestion(missingPromptQuestion.id);
            renderQuestions({ scrollToQuestionId: missingPromptQuestion.id, focusTitle: true });
            return;
        }

        if (readinessKey === 'answer_keys') {
            const invalidAnswerQuestion = findQuestionWithInvalidAnswers(questions);
            if (!invalidAnswerQuestion) {
                return;
            }
            showTab('questions');
            setActiveQuestion(invalidAnswerQuestion.id);
            renderQuestions({ scrollToQuestionId: invalidAnswerQuestion.id });
            root?.setTimeout(() => {
                const card = root.document.getElementById(questionElementId(invalidAnswerQuestion.id));
                const selector = invalidAnswerQuestion.type === 'short_answer' || invalidAnswerQuestion.type === 'paragraph'
                    ? '[data-field="acceptedAnswerText"]'
                    : '[data-field="correctOption"], [data-field="optionText"]';
                card?.querySelector(selector)?.focus();
            }, 0);
        }
    }

    function focusBuilderField(id) {
        const element = document.getElementById(id);
        if (!element) {
            return;
        }

        root?.setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.focus();
        }, 0);
    }

    function closeDropdowns(exceptDropdown) {
        document.querySelectorAll('.teacher-dropdown').forEach((dropdown) => {
            if (dropdown !== exceptDropdown) {
                setDropdownOpen(dropdown, false);
            }
        });
    }

    function setDropdownOpen(dropdown, isOpen) {
        const toggle = dropdown?.querySelector('[data-builder-dropdown-toggle]');
        const menu = dropdown?.querySelector('.dropdown-menu');
        if (!toggle || !menu) {
            return;
        }
        toggle.setAttribute('aria-expanded', String(isOpen));
        if (isQuestionSettingsMenu(menu)) {
            if (isOpen) {
                menu.hidden = false;
                positionQuestionSettingsMenu(dropdown);
                return;
            }
            clearQuestionSettingsMenuPosition(menu);
        }
        menu.hidden = !isOpen;
    }

    function isQuestionSettingsMenu(menu) {
        return Boolean(menu?.classList?.contains('teacher-quiz-builder-question-settings-menu'));
    }

    function clearQuestionSettingsMenuPosition(menu) {
        if (!menu) {
            return;
        }
        menu.hidden = true;
        menu.style.removeProperty('top');
        menu.style.removeProperty('left');
        menu.style.removeProperty('--question-settings-arrow-left');
        menu.classList.remove(
            'teacher-quiz-builder-question-settings-menu-open-above',
            'teacher-quiz-builder-question-settings-menu-open-below',
            'teacher-quiz-builder-question-settings-menu-align-left',
            'teacher-quiz-builder-question-settings-menu-align-right'
        );
    }

    function positionQuestionSettingsMenu(dropdown) {
        const toggle = dropdown?.querySelector('[data-builder-dropdown-toggle]');
        const menu = dropdown?.querySelector('.teacher-quiz-builder-question-settings-menu');
        if (!toggle || !menu || !root) {
            return;
        }

        menu.hidden = false;
        menu.classList.remove(
            'teacher-quiz-builder-question-settings-menu-open-above',
            'teacher-quiz-builder-question-settings-menu-open-below',
            'teacher-quiz-builder-question-settings-menu-align-left',
            'teacher-quiz-builder-question-settings-menu-align-right'
        );
        menu.style.removeProperty('top');
        menu.style.removeProperty('left');
        menu.style.removeProperty('--question-settings-arrow-left');

        const placement = computeQuestionSettingsMenuPlacement(toggle.getBoundingClientRect(), measureQuestionSettingsMenu(menu), {
            viewportWidth: root.innerWidth || 0,
            viewportHeight: root.innerHeight || 0
        });

        menu.style.top = `${placement.top}px`;
        menu.style.left = `${placement.left}px`;
        menu.style.setProperty('--question-settings-arrow-left', `${placement.arrowLeft}px`);
        menu.classList.add(
            placement.vertical === 'above'
                ? 'teacher-quiz-builder-question-settings-menu-open-above'
                : 'teacher-quiz-builder-question-settings-menu-open-below',
            placement.horizontal === 'left'
                ? 'teacher-quiz-builder-question-settings-menu-align-left'
                : 'teacher-quiz-builder-question-settings-menu-align-right'
        );
    }

    function measureQuestionSettingsMenu(menu) {
        const previousVisibility = menu.style.visibility;
        const previousPointerEvents = menu.style.pointerEvents;
        menu.style.visibility = 'hidden';
        menu.style.pointerEvents = 'none';
        const rect = menu.getBoundingClientRect();
        menu.style.visibility = previousVisibility;
        menu.style.pointerEvents = previousPointerEvents;

        return {
            width: rect.width,
            height: rect.height
        };
    }

    function computeQuestionSettingsMenuPlacement(toggleRect, menuRect, viewport = {}) {
        const gutter = 12;
        const gap = 8;
        const viewportWidth = Math.max(0, Number(viewport.viewportWidth || 0));
        const viewportHeight = Math.max(0, Number(viewport.viewportHeight || 0));
        const menuWidth = Math.max(0, Number(menuRect.width || 0));
        const menuHeight = Math.max(0, Number(menuRect.height || 0));

        let horizontal = 'right';
        let left = toggleRect.right - menuWidth;
        if (left < gutter && toggleRect.left + menuWidth <= viewportWidth - gutter) {
            horizontal = 'left';
            left = toggleRect.left;
        }
        left = clamp(left, gutter, Math.max(gutter, viewportWidth - gutter - menuWidth));

        let vertical = 'below';
        let top = toggleRect.bottom + gap;
        if (top + menuHeight > viewportHeight - gutter && toggleRect.top - gap - menuHeight >= gutter) {
            vertical = 'above';
            top = toggleRect.top - gap - menuHeight;
        }
        top = clamp(top, gutter, Math.max(gutter, viewportHeight - gutter - menuHeight));

        const arrowCenter = clamp((toggleRect.left + (toggleRect.width / 2)) - left, 16, Math.max(16, menuWidth - 16));

        return {
            top,
            left,
            vertical,
            horizontal,
            arrowLeft: arrowCenter
        };
    }

    function clamp(value, min, max) {
        if (max < min) {
            return min;
        }
        return Math.min(Math.max(value, min), max);
    }

    function toggleQuestionNav() {
        state.questionNavExpanded = !state.questionNavExpanded;
        state.questionNavUserControlled = true;
        syncQuestionNavVisibility();
    }

    function syncQuestionNavVisibility() {
        const container = document.getElementById('teacherQuizQuestionNav');
        const toggle = document.getElementById('teacherQuizQuestionNavToggle');
        const card = container?.closest('.teacher-quiz-builder-nav-card');
        if (container) {
            container.classList.toggle('teacher-quiz-builder-question-nav--hidden', !state.questionNavExpanded);
        }
        if (card) {
            card.classList.toggle('teacher-quiz-builder-nav-card-collapsed', !state.questionNavExpanded);
        }
        if (toggle) {
            toggle.setAttribute('aria-expanded', String(state.questionNavExpanded));
            const icon = toggle.querySelector('[data-nav-toggle-icon]');
            const label = toggle.querySelector('[data-nav-toggle-label]');
            if (icon) {
                icon.textContent = state.questionNavExpanded ? 'unfold_less' : 'unfold_more';
            }
            if (label) {
                label.textContent = state.questionNavExpanded ? 'Hide map' : 'Show map';
            }
        }
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
        if (Date.now() < Number(state.questionNavSuppressClickUntil || 0)) {
            event.preventDefault();
            return;
        }

        const button = event.target.closest('[data-nav-question-button="true"]');
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

    function handleQuestionNavPointerDown(event) {
        const handle = event.target.closest('[data-nav-drag-handle="true"]');
        if (!handle || (event.pointerType === 'mouse' && event.button !== 0)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        closeDropdowns();

        clearQuestionNavDrag();
        state.questionNavDrag = {
            pointerId: event.pointerId,
            questionId: handle.dataset.navQuestionId || '',
            sectionId: handle.dataset.navSectionId || '',
            startX: Number(event.clientX || 0),
            startY: Number(event.clientY || 0),
            isDragging: false,
            preview: null,
            sourceHandle: handle
        };

        if (typeof handle.setPointerCapture === 'function') {
            try {
                handle.setPointerCapture(event.pointerId);
            } catch (error) {
                // Ignore capture failures and continue with document-level listeners.
            }
        }

        bindQuestionNavPointerEvents();
        syncQuestionNavDragState();
    }

    function bindQuestionNavPointerEvents() {
        if (!root?.document) {
            return;
        }

        root.document.addEventListener('pointermove', handleQuestionNavPointerMove);
        root.document.addEventListener('pointerup', handleQuestionNavPointerUp);
        root.document.addEventListener('pointercancel', handleQuestionNavPointerCancel);
    }

    function unbindQuestionNavPointerEvents() {
        if (!root?.document) {
            return;
        }

        root.document.removeEventListener('pointermove', handleQuestionNavPointerMove);
        root.document.removeEventListener('pointerup', handleQuestionNavPointerUp);
        root.document.removeEventListener('pointercancel', handleQuestionNavPointerCancel);
    }

    function handleQuestionNavPointerMove(event) {
        const dragState = state.questionNavDrag;
        if (!dragState || event.pointerId !== dragState.pointerId) {
            return;
        }

        const movedX = Number(event.clientX || 0) - dragState.startX;
        const movedY = Number(event.clientY || 0) - dragState.startY;
        if (!dragState.isDragging && Math.hypot(movedX, movedY) < 6) {
            return;
        }

        dragState.isDragging = true;
        event.preventDefault();

        const preview = getQuestionNavPreviewAtPoint(dragState, Number(event.clientX || 0), Number(event.clientY || 0));
        if (isQuestionNavPreviewNoOp(preview, dragState, state.sections)) {
            setQuestionNavDragPreview(null);
            return;
        }

        setQuestionNavDragPreview(preview);
    }

    function handleQuestionNavPointerUp(event) {
        const dragState = state.questionNavDrag;
        if (!dragState || event.pointerId !== dragState.pointerId) {
            return;
        }

        const didDrag = Boolean(dragState.isDragging);
        if (didDrag) {
            event.preventDefault();
            applyQuestionNavDrop(dragState);
            state.questionNavSuppressClickUntil = Date.now() + 250;
            return;
        }

        clearQuestionNavDrag();
    }

    function handleQuestionNavPointerCancel(event) {
        const dragState = state.questionNavDrag;
        if (!dragState || event.pointerId !== dragState.pointerId) {
            return;
        }

        clearQuestionNavDrag();
        state.questionNavSuppressClickUntil = Date.now() + 250;
    }

    function getQuestionNavPreviewAtPoint(dragItem, clientX, clientY) {
        if (!root?.document?.elementFromPoint) {
            return null;
        }

        const target = root.document.elementFromPoint(clientX, clientY);
        if (!target) {
            return null;
        }

        const questionNavItem = target.closest('[data-nav-question-item="true"]');
        const sectionEndDropzone = target.closest('[data-nav-section-end-dropzone="true"]');

        return resolveQuestionNavPreviewTarget(dragItem, {
            questionNavItem,
            sectionEndDropzone,
            event: { clientY }
        });
    }

    function setQuestionNavDragPreview(nextPreview) {
        const dragState = state.questionNavDrag;
        if (!dragState) {
            return;
        }

        const normalizedPreview = normalizeDragPreview(nextPreview);
        if (isSameDragPreview(dragState.preview, normalizedPreview)) {
            return;
        }

        dragState.preview = normalizedPreview;
        syncQuestionNavDragState();
    }

    function applyQuestionNavDrop(dragState) {
        const preview = normalizeDragPreview(dragState?.preview);
        if (!preview || isQuestionNavPreviewNoOp(preview, dragState, state.sections)) {
            clearQuestionNavDrag();
            return;
        }

        if (preview.targetType === 'question-nav-item') {
            state.sections = moveQuestion(
                state.sections,
                dragState.questionId,
                preview.sectionId || '',
                preview.questionId || '',
                preview.position || 'before'
            );
        } else if (preview.targetType === 'question-nav-section-end') {
            state.sections = moveQuestion(
                state.sections,
                dragState.questionId,
                preview.sectionId || '',
                '',
                'end'
            );
        }

        state.activeQuestionId = dragState.questionId;
        clearQuestionNavDrag();
        showTab('questions');
        renderQuestions();
        focusQuestionNavItem(state.activeQuestionId);
        setStatus('Question order updated.');
    }

    function clearQuestionNavDrag() {
        const dragState = state.questionNavDrag;
        if (dragState?.sourceHandle && typeof dragState.sourceHandle.releasePointerCapture === 'function') {
            try {
                if (!dragState.sourceHandle.hasPointerCapture || dragState.sourceHandle.hasPointerCapture(dragState.pointerId)) {
                    dragState.sourceHandle.releasePointerCapture(dragState.pointerId);
                }
            } catch (error) {
                // Ignore release failures when the browser already cleared pointer capture.
            }
        }

        state.questionNavDrag = null;
        unbindQuestionNavPointerEvents();
        syncQuestionNavDragState();
    }

    function syncQuestionNavDragState() {
        const container = document.getElementById('teacherQuizQuestionNav');
        if (!container) {
            return;
        }

        const dragState = state.questionNavDrag;
        const preview = normalizeDragPreview(dragState?.preview);
        const isDragging = Boolean(dragState?.isDragging);

        container.classList.toggle('teacher-quiz-builder-question-nav-drag-active', isDragging);

        container.querySelectorAll('[data-nav-question-item="true"]').forEach((item) => {
            const itemQuestionId = item.dataset.navQuestionId || '';
            const itemSectionId = item.dataset.navSectionId || '';
            const isPreviewTarget = preview?.targetType === 'question-nav-item'
                && preview.questionId === itemQuestionId
                && preview.sectionId === itemSectionId;

            item.classList.toggle('teacher-quiz-builder-dragging', isDragging && itemQuestionId === dragState?.questionId);
            item.classList.toggle('teacher-quiz-builder-drop-target', Boolean(isPreviewTarget));
            item.classList.toggle('teacher-quiz-builder-drop-target-before', Boolean(isPreviewTarget && preview.position === 'before'));
            item.classList.toggle('teacher-quiz-builder-drop-target-after', Boolean(isPreviewTarget && preview.position === 'after'));
        });

        container.querySelectorAll('[data-nav-section-end-dropzone="true"]').forEach((dropzone) => {
            const isPreviewTarget = preview?.targetType === 'question-nav-section-end'
                && preview.sectionId === (dropzone.dataset.sectionId || '');

            dropzone.classList.toggle('teacher-quiz-builder-question-nav-end-dropzone-active', Boolean(isPreviewTarget));
        });
    }

    async function handleQuestionListClick(event) {
        const actionButton = event.target.closest('[data-action]');
        if (actionButton) {
            event.preventDefault();
            const action = actionButton.dataset.action;
            const questionId = actionButton.dataset.questionId || '';
            const sectionId = actionButton.dataset.sectionId || '';

            if (actionButton.closest('.teacher-quiz-builder-question-settings-menu')) {
                closeDropdowns();
            }

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
                const confirmed = await showConfirmDialog({
                    title: 'Delete question?',
                    message: 'This question will be removed permanently. This action cannot be undone.',
                    confirmLabel: 'Delete question'
                });
                if (!confirmed) {
                    return;
                }
                const result = removeQuestionById(state.sections, questionId, state.activeQuestionId);
                state.sections = result.sections;
                state.activeQuestionId = result.activeQuestionId;
                state.sectionMessages = {};
                renderQuestions({ scrollToQuestionId: state.activeQuestionId });
                setStatus('Question removed.');
                return;
            }
            if (action === 'delete-section') {
                const confirmed = await showConfirmDialog({
                    title: 'Delete section?',
                    message: 'Delete this section only after its questions have been moved or removed.',
                    confirmLabel: 'Delete section'
                });
                if (!confirmed) {
                    return;
                }
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
                    question.options.push('');
                    return convertQuestionToType(question, question.type);
                });
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Option added.');
                return;
            }
            if (action === 'show-question-description') {
                state.questionSecondaryExpanded[questionId] = true;
                state.questionDescriptionExpanded[questionId] = true;
                renderQuestions({ scrollToQuestionId: questionId });
                root?.setTimeout(() => {
                    const card = root.document.getElementById(questionElementId(questionId));
                    card?.querySelector('[data-field="description"]')?.focus();
                }, 0);
                return;
            }
            if (action === 'toggle-question-option-shuffle') {
                updateQuestion(questionId, (question) => {
                    if (!questionSupportsOptionShuffle(question)) {
                        return question;
                    }
                    question.shuffleOptionOrder = !question.shuffleOptionOrder;
                    return question;
                });
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Question option shuffle updated.');
                return;
            }
            if (action === 'toggle-question-answer-routing') {
                updateQuestion(questionId, (question) => {
                    if (!questionSupportsAnswerRouting(question)) {
                        return question;
                    }
                    question.goToSectionBasedOnAnswer = !question.goToSectionBasedOnAnswer;
                    return question;
                });
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Answer-based section routing updated.');
                return;
            }
            if (action === 'hide-question-description') {
                delete state.questionDescriptionExpanded[questionId];
                updateQuestion(questionId, (question) => {
                    question.description = '';
                    return question;
                });
                renderQuestions({ scrollToQuestionId: questionId });
                return;
            }
            if (action === 'toggle-question-secondary') {
                state.questionSecondaryExpanded[questionId] = !state.questionSecondaryExpanded[questionId];
                renderQuestions({ scrollToQuestionId: questionId });
                return;
            }
            if (action === 'clear-response-validation') {
                updateQuestion(questionId, (question) => {
                    question.responseValidation = shortAnswerHelpers.clearResponseValidation();
                    return question;
                });
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Response validation cleared.');
                return;
            }
            if (action === 'add-accepted-answer') {
                updateQuestion(questionId, (question) => {
                    question.correctAnswers = Array.isArray(question.correctAnswers) ? question.correctAnswers.concat('') : [''];
                    return question;
                });
                renderQuestions({ scrollToQuestionId: questionId });
                root?.setTimeout(() => {
                    const card = root.document.getElementById(questionElementId(questionId));
                    const inputs = card?.querySelectorAll('[data-field="acceptedAnswerText"]');
                    inputs?.[inputs.length - 1]?.focus();
                }, 0);
                setStatus('Accepted answer added.');
                return;
            }
            if (action === 'remove-accepted-answer') {
                const answerIndex = Number(actionButton.dataset.answerIndex);
                updateQuestion(questionId, (question) => {
                    const nextAnswers = Array.isArray(question.correctAnswers) ? question.correctAnswers.slice() : [];
                    nextAnswers.splice(answerIndex, 1);
                    question.correctAnswers = nextAnswers.length ? nextAnswers : [''];
                    return question;
                });
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Accepted answer removed.');
                return;
            }
            if (action === 'add-other-option') {
                updateQuestion(questionId, (question) => {
                    const existingOptions = Array.isArray(question.options) ? question.options.map((option) => String(option || '').trim().toLowerCase()) : [];
                    if (!existingOptions.includes('other')) {
                        question.options.push('Other');
                    }
                    return convertQuestionToType(question, question.type);
                });
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Other option added.');
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
            renderBuilderSummary();
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
            renderBuilderSummary();
            return;
        }

        if (questionField === 'points') {
            updateQuestion(questionId, (question) => {
                question.points = Math.max(0, Number(event.target.value || 0));
                return question;
            });
            renderBuilderSummary();
            return;
        }

        if (questionField === 'required' || questionField === 'caseSensitive') {
            updateQuestion(questionId, (question) => {
                question[questionField] = Boolean(event.target.checked);
                return question;
            });
            renderBuilderSummary();
            return;
        }

        if (
            questionField === 'responseValidationCategory'
            || questionField === 'responseValidationOperator'
            || questionField === 'responseValidationValue'
            || questionField === 'responseValidationSecondaryValue'
            || questionField === 'responseValidationCustomErrorText'
        ) {
            updateQuestion(questionId, (question) => {
                question.responseValidation = updateResponseValidationField(question.responseValidation, questionField, event.target.value);
                return question;
            });
            if (questionField === 'responseValidationCategory' || questionField === 'responseValidationOperator' || event.type === 'change') {
                renderQuestions({ scrollToQuestionId: questionId });
            } else {
                renderBuilderSummary();
            }
            return;
        }

        if (questionField === 'acceptedAnswerText') {
            const answerIndex = Number(event.target.dataset.answerIndex);
            updateQuestion(questionId, (question) => {
                const nextAnswers = Array.isArray(question.correctAnswers) ? question.correctAnswers.slice() : [];
                while (nextAnswers.length <= answerIndex) {
                    nextAnswers.push('');
                }
                nextAnswers[answerIndex] = event.target.value;
                question.correctAnswers = nextAnswers;
                return question;
            });
            renderBuilderSummary();
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
            // Only re-render the full question list on blur/commit (change),
            // not on every keystroke (input) — avoids destroying the focused input.
            if (event.type === 'change') {
                renderQuestions({ scrollToQuestionId: questionId });
            }
            return;
        }

        if (questionField === 'correctOption') {
            const optionIndex = Number(event.target.dataset.optionIndex);
            const location = findQuestionLocation(state.sections, questionId);
            const currentQuestion = location?.question;
            if (shouldIgnoreCorrectOptionSelection(currentQuestion, optionIndex)) {
                renderQuestions({ scrollToQuestionId: questionId });
                setStatus('Add choice text before marking it as the answer key.');
                return;
            }
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

    function shouldIgnoreCorrectOptionSelection(question, optionIndex) {
        if (!question || !Array.isArray(question.options)) {
            return false;
        }

        const optionValue = question.options[optionIndex];
        return String(optionValue || '').trim().length === 0;
    }

    async function saveDraftQuiz() {
        await persistQuiz({ status: 'draft', publishAfterSave: false });
    }

    async function publishQuiz() {
        await persistQuiz({ status: 'draft', publishAfterSave: true });
    }

    async function openDockPreview() {
        try {
            let previewQuizId = state.lastSavedQuizId || getQuizId();
            if (shouldSaveBeforePreview({
                quizId: previewQuizId,
                lastSavedSignature: state.lastSavedSignature,
                currentSignature: computeBuilderSignature()
            })) {
                previewQuizId = await persistQuiz({ status: 'draft', publishAfterSave: false, redirectOnCreate: false });
            }

            if (!previewQuizId) {
                setStatus('Save the quiz first before previewing it.');
                return;
            }

            root.open(buildPreviewUrl(previewQuizId), '_blank', 'noopener');
        } catch (error) {
            console.error('Quiz preview preparation failed:', error);
        }
    }

    async function persistQuiz({ status, publishAfterSave, redirectOnCreate = true }) {
        if (!validateQuizBeforePersist({ publishAfterSave })) {
            return '';
        }

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
                return targetQuizId;
            }

            state.quizStatus = normalizeQuizStatus(status);
            markBuilderSaved();
            renderBuilderSummary();
            if (!isEdit && targetQuizId && redirectOnCreate) {
                window.location.href = `/teacher/quizzes/${encodeURIComponent(targetQuizId)}/edit`;
                return targetQuizId;
            }

            setStatus(data.message || 'Quiz saved successfully.');
            return targetQuizId;
        } catch (error) {
            console.error('Quiz builder save failed:', error);
            if (!isEdit && targetQuizId && redirectOnCreate) {
                window.location.href = `/teacher/quizzes/${encodeURIComponent(targetQuizId)}/edit`;
                return targetQuizId;
            }
            setStatus(error.message || 'Unable to save quiz.');
            throw error;
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
            state.quizStatus = 'published';
            markBuilderSaved();
            renderBuilderSummary();
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
        const payloadQuestions = normalizedSections.flatMap((section) => section.questions.map((question, questionIndex) => {
            const payloadQuestion = {
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
                caseSensitive: Boolean(question.caseSensitive),
                shuffleOptionOrder: Boolean(question.shuffleOptionOrder),
                goToSectionBasedOnAnswer: Boolean(question.goToSectionBasedOnAnswer)
            };
            if (question.type === 'short_answer') {
                const responseValidation = sanitizeResponseValidationForPayload(question.responseValidation);
                if (Object.keys(responseValidation).length) {
                    payloadQuestion.responseValidation = responseValidation;
                }
            }
            return payloadQuestion;
        }));

        return {
            title: getValue('teacherQuizTitle'),
            description: getValue('teacherQuizDescription'),
            subject: getValue('teacherQuizSubject'),
            classId: classSelect?.value || '',
            classLabel: classSelect?.value ? selectedOption?.textContent?.trim() || '' : '',
            type: getValue('teacherQuizType') || 'graded',
            status: normalizeQuizStatus(statusOverride || state.quizStatus),
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
        setDragPreview(null);
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
            setDragPreview(null);
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragPreview(resolveDragPreviewTarget(state.dragItem, {
            questionCard,
            sectionCard,
            sectionDropzone,
            event
        }));
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

    function setDragPreview(nextPreview) {
        const normalizedPreview = normalizeDragPreview(nextPreview);
        if (isSameDragPreview(state.dragPreview, normalizedPreview)) {
            return;
        }
        state.dragPreview = normalizedPreview;
        renderQuestions();
    }

    function normalizeDragPreview(preview) {
        if (!preview || !preview.targetType) {
            return null;
        }

        return {
            targetType: preview.targetType,
            sectionId: preview.sectionId || '',
            questionId: preview.questionId || '',
            position: preview.position || ''
        };
    }

    function isSameDragPreview(left, right) {
        const normalizedLeft = normalizeDragPreview(left);
        const normalizedRight = normalizeDragPreview(right);

        if (!normalizedLeft && !normalizedRight) {
            return true;
        }
        if (!normalizedLeft || !normalizedRight) {
            return false;
        }

        return normalizedLeft.targetType === normalizedRight.targetType
            && normalizedLeft.sectionId === normalizedRight.sectionId
            && normalizedLeft.questionId === normalizedRight.questionId
            && normalizedLeft.position === normalizedRight.position;
    }

    function resolveDragPreviewTarget(dragItem, context = {}) {
        if (!dragItem || !context) {
            return null;
        }

        if (dragItem.type === 'section' && context.sectionCard) {
            return {
                targetType: 'section-card',
                sectionId: context.sectionCard.dataset.sectionId || '',
                questionId: '',
                position: getDropPosition(context.sectionCard, context.event)
            };
        }

        if (dragItem.type === 'question' && context.questionCard) {
            return {
                targetType: 'question-card',
                sectionId: context.questionCard.dataset.sectionId || '',
                questionId: context.questionCard.dataset.questionId || '',
                position: getDropPosition(context.questionCard, context.event)
            };
        }

        if (dragItem.type === 'question' && context.sectionDropzone) {
            return {
                targetType: 'section-dropzone',
                sectionId: context.sectionDropzone.dataset.sectionId || '',
                questionId: '',
                position: 'end'
            };
        }

        return null;
    }

    function resolveQuestionNavPreviewTarget(dragItem, context = {}) {
        if (!dragItem || !context) {
            return null;
        }

        if (context.questionNavItem) {
            return {
                targetType: 'question-nav-item',
                sectionId: context.questionNavItem.dataset.navSectionId || '',
                questionId: context.questionNavItem.dataset.navQuestionId || '',
                position: getDropPosition(context.questionNavItem, context.event)
            };
        }

        if (context.sectionEndDropzone) {
            return {
                targetType: 'question-nav-section-end',
                sectionId: context.sectionEndDropzone.dataset.sectionId || '',
                questionId: '',
                position: 'end'
            };
        }

        return null;
    }

    function isQuestionNavPreviewNoOp(preview, dragItem, sections = []) {
        const normalizedPreview = normalizeDragPreview(preview);
        if (!normalizedPreview || !dragItem?.questionId) {
            return true;
        }

        if (normalizedPreview.targetType === 'question-nav-item') {
            return normalizedPreview.questionId === dragItem.questionId;
        }

        if (normalizedPreview.targetType !== 'question-nav-section-end') {
            return false;
        }

        const targetSection = (Array.isArray(sections) ? sections : []).find((section) => section.id === normalizedPreview.sectionId);
        const sectionQuestions = Array.isArray(targetSection?.questions) ? targetSection.questions : [];
        return sectionQuestions.length > 0 && sectionQuestions[sectionQuestions.length - 1]?.id === dragItem.questionId;
    }

    function dragPreviewClassName(preview) {
        if (!preview) {
            return '';
        }

        return `teacher-quiz-builder-drop-target teacher-quiz-builder-drop-target-${preview.position}`;
    }

    function getSectionCardDragPreview(sectionId) {
        const preview = normalizeDragPreview(state.dragPreview);
        if (!preview || preview.targetType !== 'section-card' || preview.sectionId !== sectionId) {
            return null;
        }
        return preview;
    }

    function getQuestionCardDragPreview(sectionId, questionId) {
        const preview = normalizeDragPreview(state.dragPreview);
        if (!preview || preview.targetType !== 'question-card') {
            return null;
        }
        if (preview.sectionId !== sectionId || preview.questionId !== questionId) {
            return null;
        }
        return preview;
    }

    function getSectionDropzoneDragPreview(sectionId) {
        const preview = normalizeDragPreview(state.dragPreview);
        if (!preview || preview.targetType !== 'section-dropzone' || preview.sectionId !== sectionId) {
            return null;
        }
        return preview;
    }

    function isDraggedSection(sectionId) {
        return state.dragItem?.type === 'section' && state.dragItem?.sectionId === sectionId;
    }

    function isDraggedQuestion(questionId) {
        return state.dragItem?.type === 'question' && state.dragItem?.questionId === questionId;
    }

    function clearDragState() {
        const hadPreview = Boolean(state.dragPreview);
        state.dragItem = null;
        state.dragPreview = null;
        document.querySelectorAll('.teacher-quiz-builder-dragging').forEach((element) => {
            element.classList.remove('teacher-quiz-builder-dragging');
        });
        if (hadPreview) {
            renderQuestions();
        }
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

    function focusQuestionNavItem(questionId) {
        if (!root || !root.document || !questionId) {
            return;
        }

        root.setTimeout(() => {
            const navButton = root.document.querySelector(`[data-nav-question-button="true"][data-nav-question-id="${cssEscape(questionId)}"]`);
            if (!navButton) {
                return;
            }

            navButton.focus({ preventScroll: true });
            navButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }, 0);
    }

    function cssEscape(value) {
        const raw = String(value || '');
        if (root?.CSS?.escape) {
            return root.CSS.escape(raw);
        }
        return raw.replace(/["\\]/g, '\\$&');
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
            previewLink.href = buildPreviewUrl(quizId);
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

    function buildPreviewUrl(quizId) {
        return `/teacher/quizzes/${encodeURIComponent(quizId)}/preview`;
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
            caseSensitive: Boolean(question?.caseSensitive),
            shuffleOptionOrder: Boolean(question?.shuffleOptionOrder || question?.randomizeOptionOrder),
            goToSectionBasedOnAnswer: Boolean(question?.goToSectionBasedOnAnswer || question?.answerBasedSectionRouting),
            responseValidation: normalizeResponseValidation(question?.responseValidation)
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
            caseSensitive: false,
            shuffleOptionOrder: false,
            goToSectionBasedOnAnswer: false,
            responseValidation: createEmptyResponseValidation()
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
            caseSensitive: Boolean(question.caseSensitive),
            shuffleOptionOrder: Boolean(question.shuffleOptionOrder),
            goToSectionBasedOnAnswer: Boolean(question.goToSectionBasedOnAnswer),
            responseValidation: normalizeResponseValidation(question.responseValidation)
        };

        if (isOpenTextQuestionType(normalizedType)) {
            return shortAnswerHelpers.convertQuestionToOpenTextType(converted, normalizedType);
        }

        if (normalizedType === 'true_false') {
            converted.options = ['True', 'False'];
            converted.correctAnswers = [mapTrueFalseAnswer(converted.correctAnswers)];
            converted.responseValidation = createEmptyResponseValidation();
            return converted;
        }

        // Preserve empty-string options (user may be mid-edit); only pad to minimum 2 slots.
        const options = converted.options.map((option) => option.trim());
        while (options.length < 2) {
            options.push('');
        }
        const firstNonEmpty = options.find(Boolean) || '';
        const validAnswers = converted.correctAnswers.map((answer) => answer.trim()).filter((answer) => answer && options.includes(answer));
        converted.options = options;
        converted.correctAnswers = normalizedType === 'checkbox'
            ? (validAnswers.length ? Array.from(new Set(validAnswers)) : (firstNonEmpty ? [firstNonEmpty] : []))
            : (validAnswers[0] ? [validAnswers[0]] : (firstNonEmpty ? [firstNonEmpty] : []));
        converted.responseValidation = createEmptyResponseValidation();
        return converted;
    }

    function createEmptyResponseValidation() {
        return shortAnswerHelpers.createEmptyResponseValidation();
    }

    function normalizeResponseValidation(responseValidation) {
        return shortAnswerHelpers.normalizeResponseValidation(responseValidation);
    }

    function sanitizeResponseValidationForPayload(responseValidation) {
        return shortAnswerHelpers.sanitizeResponseValidationForPayload(responseValidation);
    }

    function getShortAnswerValidationIssue(responseValidation) {
        return shortAnswerHelpers.getShortAnswerValidationIssue(responseValidation);
    }

    function updateResponseValidationField(responseValidation, questionField, nextValue) {
        return shortAnswerHelpers.updateResponseValidationField(responseValidation, questionField, nextValue);
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
        if (!questionId || (targetQuestionId && questionId === targetQuestionId)) {
            return normalizeSectionTree(cloneSections(sections));
        }

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
            correctAnswers: location.question.correctAnswers.slice(),
            shuffleOptionOrder: Boolean(location.question.shuffleOptionOrder),
            goToSectionBasedOnAnswer: Boolean(location.question.goToSectionBasedOnAnswer),
            responseValidation: normalizeResponseValidation(location.question.responseValidation)
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
                caseSensitive: question.caseSensitive,
                shuffleOptionOrder: question.shuffleOptionOrder,
                goToSectionBasedOnAnswer: question.goToSectionBasedOnAnswer,
                responseValidation: normalizeResponseValidation(question.responseValidation)
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

    function renderBuilderSummary() {
        const sections = normalizeSectionTree(state.sections);
        const questions = getAllQuestions(sections);
        const totalPoints = questions.reduce((sum, question) => sum + Math.max(0, Number(question.points || 0)), 0);
        const rawTitle = getValue('teacherQuizTitle');
        const title = rawTitle || 'Untitled Quiz';
        const classLabel = getSelectedText('teacherQuizClassId') || 'No class selected';
        const status = formatQuizStatus(state.quizStatus);
        const quizType = getSelectedText('teacherQuizType') || 'Graded Quiz';
        const readiness = buildReadinessState(sections, questions, rawTitle);
        const completedChecks = readiness.items.filter((item) => item.done).length;
        const totalChecks = readiness.items.length;
        const progressValue = totalChecks ? Math.round((completedChecks / totalChecks) * 100) : 0;
        const nextIncomplete = readiness.items.find((item) => !item.done) || null;

        setText('teacherQuizSidebarSectionCount', String(sections.length));
        setText('teacherQuizSidebarQuestionCount', String(questions.length));
        setText('teacherQuizSidebarPoints', String(totalPoints));
        setText('teacherQuizSummaryTitle', title);
        setText('teacherQuizSummaryClass', classLabel);
        setText('teacherQuizSummaryStatus', status);
        setText('teacherQuizSummaryType', quizType);
        const dockTitleInput = document.getElementById('teacherQuizDockTitleInput');
        if (dockTitleInput && document.activeElement !== dockTitleInput) {
            dockTitleInput.value = rawTitle;
        }
        setText('teacherQuizDesktopDockReadiness', readiness.label);
        setText('teacherQuizProgressLabel', `${completedChecks} of ${totalChecks} checks complete`);
        setText(
            'teacherQuizProgressHint',
            readiness.ready
                ? 'All publishing checks are complete. Review settings or publish when ready.'
                : `Next: ${nextIncomplete?.label || 'Finish the remaining checklist items.'}`
        );
        syncSaveState();

        const badge = document.getElementById('teacherQuizReadinessBadge');
        if (badge) {
            badge.textContent = readiness.label;
            badge.classList.toggle('teacher-quiz-builder-readiness-badge-ready', readiness.ready);
            badge.classList.toggle('teacher-quiz-builder-readiness-badge-warning', !readiness.ready);
        }

        const dockReadiness = document.getElementById('teacherQuizDesktopDockReadiness');
        if (dockReadiness) {
            dockReadiness.classList.toggle('teacher-quiz-builder-dock-readiness-ready', readiness.ready);
            dockReadiness.classList.toggle('teacher-quiz-builder-dock-readiness-warning', !readiness.ready);
        }

        const progressBarTrack = document.getElementById('teacherQuizProgressBarTrack');
        if (progressBarTrack) {
            progressBarTrack.setAttribute('aria-valuenow', String(progressValue));
        }

        const progressBar = document.getElementById('teacherQuizProgressBar');
        if (progressBar) {
            progressBar.style.width = `${progressValue}%`;
        }

        const progressButton = document.getElementById('teacherQuizFocusFirstIssueButton');
        if (progressButton) {
            progressButton.disabled = readiness.ready;
            const label = progressButton.querySelector('span:last-child');
            if (label) {
                label.textContent = readiness.ready ? 'All checks complete' : 'Jump to next issue';
            }
        }

        const list = document.getElementById('teacherQuizReadinessList');
        if (list) {
            list.innerHTML = readiness.items.map((item) => `
                <li class="teacher-quiz-builder-readiness-entry">
                    <button
                        type="button"
                        class="teacher-quiz-builder-readiness-item teacher-quiz-builder-readiness-item-${item.done ? 'complete' : 'pending'}${item.done ? '' : ' teacher-quiz-builder-readiness-item-actionable'}"
                        data-readiness-key="${escapeAttribute(item.key)}"
                        ${item.done ? 'disabled' : ''}
                    >
                        <span class="material-icons" aria-hidden="true">${item.done ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>${escapeHtml(item.label)}</span>
                        <span class="teacher-quiz-builder-readiness-cta">${item.done ? 'Done' : 'Fix now'}</span>
                    </button>
                </li>
            `).join('');
        }
    }

    function buildReadinessState(sections, questions, title) {
        const hasClass = Boolean(getValue('teacherQuizClassId'));
        const emptySection = findSectionWithoutQuestions(sections);
        const questionMissingPrompt = findQuestionWithoutPrompt(questions);
        const invalidAnswerQuestion = findQuestionWithInvalidAnswers(questions);
        const items = [
            { key: 'title', label: 'Add a clear quiz title.', done: hasMeaningfulQuizTitle(title) },
            { key: 'class', label: 'Connect the quiz to a class.', done: hasClass },
            { key: 'section_questions', label: 'Include at least one question in every active section.', done: !emptySection && sections.length > 0 },
            { key: 'question_prompts', label: 'Write prompts for all questions.', done: !questionMissingPrompt && questions.length > 0 },
            { key: 'answer_keys', label: 'Set valid answer keys for each question type.', done: !invalidAnswerQuestion && questions.length > 0 }
        ];
        const ready = items.every((item) => item.done);
        return {
            ready,
            label: ready ? 'Ready to publish' : 'Needs attention',
            items
        };
    }

    function hasMeaningfulQuizTitle(title) {
        return Boolean(String(title || '').trim());
    }

    function findSectionWithoutQuestions(sections) {
        return sections.find((section) => !section.questions.length) || null;
    }

    function findQuestionWithoutPrompt(questions) {
        return questions.find((question) => !String(question.title || '').trim()) || null;
    }

    function findQuestionWithInvalidAnswers(questions) {
        return questions.find((question) => !isQuestionReadyForPublish(question)) || null;
    }

    function isQuestionReadyForPublish(question) {
        const promptReady = Boolean(String(question.title || '').trim());
        if (!promptReady) {
            return false;
        }

        if (isOpenTextQuestion(question)) {
            return shortAnswerHelpers.isOpenTextQuestionReadyForPublish(question);
        }

        const options = Array.isArray(question.options) ? question.options.map((option) => String(option || '').trim()).filter(Boolean) : [];
        const answers = Array.isArray(question.correctAnswers) ? question.correctAnswers.map((answer) => String(answer || '').trim()).filter(Boolean) : [];
        return options.length >= 2 && answers.length > 0 && answers.every((answer) => options.includes(answer));
    }

    function getSelectedText(id) {
        const element = document.getElementById(id);
        if (!element || !element.selectedOptions || !element.selectedOptions[0]) {
            return '';
        }
        return element.selectedOptions[0].textContent?.trim() || '';
    }

    function normalizeQuizStatus(status) {
        const normalized = String(status || '').trim().toLowerCase();
        if (normalized === 'published' || normalized === 'closed' || normalized === 'archived') {
            return normalized;
        }
        return 'draft';
    }

    function formatQuizStatus(status) {
        const normalized = normalizeQuizStatus(status);
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function computeBuilderSignature() {
        return JSON.stringify(buildPayload(state.quizStatus));
    }

    function shouldSaveBeforePreview({ quizId, lastSavedSignature, currentSignature }) {
        if (!quizId) {
            return true;
        }
        if (!lastSavedSignature) {
            return true;
        }
        return lastSavedSignature !== currentSignature;
    }

    function syncSaveState() {
        const saveState = document.getElementById('teacherQuizSaveState');
        if (!saveState) {
            return;
        }

        const currentSignature = computeBuilderSignature();
        if (!state.initialSignature) {
            state.initialSignature = currentSignature;
        }

        const hasSavedSnapshot = Boolean(state.lastSavedSignature);
        const isSaved = hasSavedSnapshot && currentSignature === state.lastSavedSignature;
        const isPristineCreate = !hasSavedSnapshot && currentSignature === state.initialSignature;

        let label = 'Unsaved changes';
        let modifier = 'dirty';

        if (state.isBusy) {
            label = 'Saving...';
            modifier = 'saving';
        } else if (isSaved) {
            label = state.lastSavedAt ? `Saved ${formatRelativeTime(state.lastSavedAt)}` : 'All changes saved';
            modifier = 'saved';
        } else if (isPristineCreate) {
            label = 'Not saved yet';
            modifier = 'neutral';
        }

        saveState.textContent = label;
        saveState.classList.remove(
            'teacher-quiz-builder-save-state-neutral',
            'teacher-quiz-builder-save-state-dirty',
            'teacher-quiz-builder-save-state-saving',
            'teacher-quiz-builder-save-state-saved'
        );
        saveState.classList.add(`teacher-quiz-builder-save-state-${modifier}`);
    }

    function markBuilderSaved(savedAt = new Date()) {
        state.lastSavedSignature = computeBuilderSignature();
        state.lastSavedAt = savedAt;
        if (!state.initialSignature) {
            state.initialSignature = state.lastSavedSignature;
        }
    }

    function formatRelativeTime(dateInput) {
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (Number.isNaN(date.getTime())) {
            return 'recently';
        }

        const elapsedMs = Date.now() - date.getTime();
        const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));
        if (elapsedSeconds < 30) {
            return 'just now';
        }
        if (elapsedSeconds < 3600) {
            return `${Math.round(elapsedSeconds / 60)}m ago`;
        }
        if (elapsedSeconds < 86400) {
            return `${Math.round(elapsedSeconds / 3600)}h ago`;
        }
        return `${Math.round(elapsedSeconds / 86400)}d ago`;
    }

    function setFieldError(fieldId, errorId, message) {
        const field = document.getElementById(fieldId);
        const error = errorId ? document.getElementById(errorId) : null;
        if (field) {
            field.classList.toggle('error', Boolean(message));
        }
        if (error) {
            error.textContent = message || '';
        }
    }

    function validateQuizBeforePersist({ publishAfterSave }) {
        const title = getValue('teacherQuizTitle');
        const sections = normalizeSectionTree(state.sections);
        const questions = getAllQuestions(sections);
        const missingSection = findSectionWithoutQuestions(sections);
        const missingPromptQuestion = findQuestionWithoutPrompt(questions);
        const invalidAnswerQuestion = findQuestionWithInvalidAnswers(questions);
        const missingClass = !getValue('teacherQuizClassId');

        setFieldError('teacherQuizTitle', 'quizTitleError', '');
        setFieldError('teacherQuizClassId', 'quizClassError', '');

        if (!publishAfterSave) {
            return true;
        }

        if (!hasMeaningfulQuizTitle(title)) {
            setFieldError('teacherQuizTitle', 'quizTitleError', 'Add a quiz title before publishing.');
            showTab('questions');
            document.getElementById('teacherQuizTitle')?.focus();
            setStatus('Add a quiz title before publishing.');
            return false;
        }

        if (missingClass) {
            setFieldError('teacherQuizClassId', 'quizClassError', 'Select a class before publishing.');
            showTab('questions');
            document.getElementById('teacherQuizClassId')?.focus();
            setStatus('Select a class before publishing.');
            return false;
        }

        if (missingSection) {
            showTab('questions');
            renderQuestions();
            scrollSectionIntoView(missingSection.id);
            setStatus(`Add at least one question to ${missingSection.title || 'this section'} before publishing.`);
            return false;
        }

        if (missingPromptQuestion) {
            showTab('questions');
            setActiveQuestion(missingPromptQuestion.id);
            renderQuestions({ scrollToQuestionId: missingPromptQuestion.id, focusTitle: true });
            setStatus('Write a prompt for every question before publishing.');
            return false;
        }

        if (invalidAnswerQuestion) {
            showTab('questions');
            setActiveQuestion(invalidAnswerQuestion.id);
            renderQuestions({ scrollToQuestionId: invalidAnswerQuestion.id });
            setStatus(buildInvalidAnswerMessage(invalidAnswerQuestion));
            return false;
        }

        return true;
    }

    function buildInvalidAnswerMessage(question) {
        if (isOpenTextQuestion(question)) {
            return shortAnswerHelpers.buildOpenTextInvalidAnswerMessage(question);
        }
        return 'Set valid options and correct answers for every objective question before publishing.';
    }

    function setStatus(message) {
        const element = document.getElementById('teacherQuizBuilderStatus');
        if (element) {
            element.textContent = message;
        }
        showToast(message);
    }

    /* ── Toast / Snackbar ─────────────────────────────────── */

    let _toastTimer = null;

    function showToast(message, type) {
        if (!root || !root.document) {
            return;
        }

        let toast = root.document.getElementById('teacherQuizBuilderToast');
        if (!toast) {
            toast = root.document.createElement('div');
            toast.id = 'teacherQuizBuilderToast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            toast.setAttribute('aria-atomic', 'true');
            root.document.body.appendChild(toast);
        }

        const isError = type === 'error' || /fail|error|invalid|unable|required|select a|add a|write|set valid|at least/i.test(message);
        toast.className = 'teacher-quiz-builder-toast' + (isError ? ' teacher-quiz-builder-toast-error' : '');
        toast.textContent = message;
        toast.classList.add('teacher-quiz-builder-toast-visible');

        if (_toastTimer) {
            root.clearTimeout(_toastTimer);
        }
        _toastTimer = root.setTimeout(() => {
            toast.classList.remove('teacher-quiz-builder-toast-visible');
            _toastTimer = null;
        }, isError ? 5000 : 3200);
    }

    function setBusyState(isBusy) {
        state.isBusy = isBusy;
        [
            document.getElementById('teacherQuizSaveDraftButton'),
            document.getElementById('teacherQuizPublishButton')
        ].forEach((button) => {
            button?.toggleAttribute('disabled', isBusy);
            button?.classList.toggle('loading', isBusy);
        });
        document.querySelectorAll('[data-builder-dock-action="save"], [data-builder-dock-action="publish"]').forEach((button) => {
            button.toggleAttribute('disabled', isBusy);
            button.classList.toggle('loading', isBusy);
        });
        syncSaveState();
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
            getChoiceEditorCopy,
            shouldIgnoreCorrectOptionSelection,
            createEmptyResponseValidation,
            normalizeResponseValidation,
            sanitizeResponseValidationForPayload,
            getShortAnswerValidationIssue,
            insertQuestionAfterActive,
            duplicateQuestionById,
            removeQuestionById,
            removeSectionById,
            moveQuestion,
            moveSection,
            moveSectionByOffset,
            moveQuestionByOffset,
            normalizeSectionTree,
            normalizeDragPreview,
            isSameDragPreview,
            resolveDragPreviewTarget,
            resolveQuestionNavPreviewTarget,
            isQuestionNavPreviewNoOp,
            dragPreviewClassName,
            computeQuestionSettingsMenuPlacement,
            shouldSaveBeforePreview,
            buildPreviewUrl
        }
    };
});
