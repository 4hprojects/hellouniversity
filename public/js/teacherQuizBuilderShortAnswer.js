(function attachTeacherQuizBuilderShortAnswer(root, factory) {
    const api = factory(root);

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.teacherQuizBuilderShortAnswer = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function teacherQuizBuilderShortAnswerFactory(root) {
    const responseValidationHelpers = resolveResponseValidationHelpers(root);

    function resolveResponseValidationHelpers(runtimeRoot) {
        if (runtimeRoot?.teacherQuizBuilderResponseValidation) {
            return runtimeRoot.teacherQuizBuilderResponseValidation;
        }

        if (typeof require === 'function') {
            try {
                return require('./teacherQuizBuilderResponseValidation.js');
            } catch (error) {
                console.error('Teacher quiz response validation helper load failed:', error);
            }
        }

        throw new Error('teacherQuizBuilderResponseValidation helpers are required before teacherQuizBuilderShortAnswer.');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/"/g, '&quot;');
    }

    function isOpenTextQuestionType(type) {
        return type === 'short_answer' || type === 'paragraph';
    }

    function isOpenTextQuestion(questionOrType) {
        const type = typeof questionOrType === 'string' ? questionOrType : questionOrType?.type;
        return isOpenTextQuestionType(type);
    }

    function getOpenTextEditorCopy(questionType) {
        if (questionType === 'short_answer') {
            return {
                answerLabel: 'Accepted answers',
                addAnswerLabel: 'Add alternative answer',
                placeholderPrefix: 'Accepted answer'
            };
        }

        return {
            answerLabel: 'Accepted responses',
            addAnswerLabel: 'Add accepted response',
            placeholderPrefix: 'Accepted response'
        };
    }

    function getEditableAcceptedAnswers(correctAnswers) {
        if (Array.isArray(correctAnswers) && correctAnswers.length) {
            return correctAnswers.map((answer) => String(answer || ''));
        }

        return [''];
    }

    function createEmptyResponseValidation() {
        return responseValidationHelpers.createEmptyResponseValidation();
    }

    function normalizeResponseValidation(responseValidation) {
        return responseValidationHelpers.normalizeResponseValidation(responseValidation);
    }

    function sanitizeResponseValidationForPayload(responseValidation) {
        return responseValidationHelpers.sanitizeResponseValidationForPayload(responseValidation);
    }

    function getShortAnswerValidationIssue(responseValidation) {
        return responseValidationHelpers.getShortAnswerValidationIssue(responseValidation);
    }

    function hasResponseValidation(responseValidation) {
        return responseValidationHelpers.hasResponseValidation(responseValidation);
    }

    function summarizeOpenTextAdvanced(question) {
        const summary = [];

        if (String(question.description || '').trim()) {
            summary.push('Description');
        }
        if (question.caseSensitive) {
            summary.push('Case sensitive');
        }
        if (question.type === 'short_answer' && hasResponseValidation(question.responseValidation)) {
            summary.push('Response validation');
        }

        return summary.length ? summary.join(' | ') : 'No advanced rules';
    }

    function renderOpenTextAnswerEditor(question, options = {}) {
        const acceptedAnswers = getEditableAcceptedAnswers(question.correctAnswers);
        const copy = getOpenTextEditorCopy(question.type);
        const renderPointsInlineControl = options.renderPointsInlineControl || (() => '');
        const renderSettingsControl = options.renderSettingsControl || (() => '');
        const renderDescriptionControl = options.renderDescriptionControl || (() => '');
        const renderResponseValidationControl = options.renderResponseValidationControl || (() => '');
        const summarizeQuestionResponseShape = options.summarizeQuestionResponseShape || (() => '');
        const escapeHtmlValue = options.escapeHtml || escapeHtml;
        const escapeAttributeValue = options.escapeAttribute || escapeAttribute;

        return `
                <section class="teacher-quiz-builder-open-text-shell teacher-quiz-builder-open-text-shell-${escapeAttributeValue(question.type)}">
                    <div class="teacher-quiz-builder-open-text-main">
                        <div class="teacher-quiz-builder-open-text-main-header">
                            <div>
                                <span class="teacher-field-label">${copy.answerLabel}</span>
                                <p class="teacher-meta">Optional. Add accepted responses for auto-checking, or leave them blank for manual review.</p>
                            </div>
                            <div class="teacher-quiz-builder-open-text-core-controls">
                                <label class="teacher-checkbox-row teacher-quiz-builder-open-text-required-toggle">
                                    <input type="checkbox" data-field="required" data-question-id="${escapeAttributeValue(question.id)}" ${question.required ? 'checked' : ''}>
                                    <span>Required</span>
                                </label>
                                ${renderPointsInlineControl(question)}
                            </div>
                        </div>

                        <div class="teacher-quiz-builder-answer-list teacher-quiz-builder-open-text-answer-list">
                        ${acceptedAnswers.map((answer, answerIndex) => `
                                <div class="teacher-quiz-builder-answer-row teacher-quiz-builder-open-text-answer-row">
                                    <span class="teacher-quiz-builder-open-text-answer-index" aria-hidden="true">${answerIndex + 1}</span>
                                    <input
                                        type="text"
                                        class="quiz-text-input"
                                        data-field="acceptedAnswerText"
                                        data-question-id="${escapeAttributeValue(question.id)}"
                                        data-answer-index="${answerIndex}"
                                        value="${escapeAttributeValue(answer)}"
                                        placeholder="${copy.placeholderPrefix} ${answerIndex + 1}"
                                    >
                                    ${acceptedAnswers.length > 1 ? `<button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="remove-accepted-answer" data-question-id="${escapeAttributeValue(question.id)}" data-answer-index="${answerIndex}">Remove</button>` : ''}
                                </div>
                        `).join('')}
                        </div>

                        <div class="teacher-quiz-builder-open-text-actions">
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="add-accepted-answer" data-question-id="${escapeAttributeValue(question.id)}">${copy.addAnswerLabel}</button>
                            <div class="teacher-quiz-builder-open-text-advanced-summary">
                                <span class="teacher-quiz-builder-question-chip">${escapeHtmlValue(summarizeQuestionResponseShape(question))}</span>
                                <span class="teacher-quiz-builder-question-chip">${question.required !== false ? 'Required' : 'Optional'}</span>
                                <span class="teacher-quiz-builder-question-chip">${escapeHtmlValue(summarizeOpenTextAdvanced(question))}</span>
                            </div>
                            <label class="teacher-checkbox-row teacher-quiz-builder-open-text-case-toggle">
                                <input type="checkbox" data-field="caseSensitive" data-question-id="${escapeAttributeValue(question.id)}" ${question.caseSensitive ? 'checked' : ''}>
                                <span>Case sensitive answer checking</span>
                            </label>
                            <div class="teacher-quiz-builder-open-text-settings-wrap">
                                ${renderSettingsControl(question)}
                            </div>
                        </div>
                        ${question.type === 'short_answer' ? renderResponseValidationControl(question) : ''}
                        ${renderDescriptionControl(question)}
                    </div>
                </section>
            `;
    }

    function renderShortAnswerValidationEditor(question, options = {}) {
        return responseValidationHelpers.renderResponseValidationEditor(question, options);
    }

    function convertQuestionToOpenTextType(question, normalizedType) {
        return {
            ...question,
            type: normalizedType,
            options: [],
            correctAnswers: getEditableAcceptedAnswers(question.correctAnswers),
            responseValidation: normalizedType === 'short_answer'
                ? normalizeResponseValidation(question.responseValidation)
                : createEmptyResponseValidation()
        };
    }

    function updateResponseValidationField(responseValidation, questionField, nextValue) {
        return responseValidationHelpers.updateResponseValidationField(responseValidation, questionField, nextValue);
    }

    function isOpenTextQuestionReadyForPublish(question) {
        if (!isOpenTextQuestion(question)) {
            return false;
        }

        if (question.type === 'short_answer') {
            return !getShortAnswerValidationIssue(question.responseValidation);
        }

        return true;
    }

    function buildOpenTextInvalidAnswerMessage(question) {
        if (!isOpenTextQuestion(question)) {
            return '';
        }

        if (question.type === 'short_answer') {
            const validationIssue = getShortAnswerValidationIssue(question.responseValidation);
            if (validationIssue) {
                return validationIssue;
            }
        }

        return 'Complete the short-answer response validation rule before publishing.';
    }

    return {
        RESPONSE_VALIDATION_GROUPS: responseValidationHelpers.RESPONSE_VALIDATION_GROUPS,
        isOpenTextQuestion,
        isOpenTextQuestionType,
        getOpenTextEditorCopy,
        getEditableAcceptedAnswers,
        createEmptyResponseValidation,
        normalizeResponseValidation,
        sanitizeResponseValidationForPayload,
        getShortAnswerValidationIssue,
        hasResponseValidation,
        summarizeOpenTextAdvanced,
        renderOpenTextAnswerEditor,
        renderShortAnswerValidationEditor,
        convertQuestionToOpenTextType,
        updateResponseValidationField,
        clearResponseValidation: responseValidationHelpers.clearResponseValidation,
        isOpenTextQuestionReadyForPublish,
        buildOpenTextInvalidAnswerMessage
    };
});
