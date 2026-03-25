(function attachTeacherQuizBuilderShortAnswer(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.teacherQuizBuilderShortAnswer = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function teacherQuizBuilderShortAnswerFactory() {
    const SHORT_ANSWER_PATTERN_PRESETS = [
        { value: '', label: 'No format restriction' },
        { value: 'numbers_only', label: 'Numbers only' },
        { value: 'letters_only', label: 'Letters only' },
        { value: 'alphanumeric', label: 'Letters and numbers' },
        { value: 'email', label: 'Email address' },
        { value: 'url', label: 'Website URL' },
        { value: 'student_id', label: 'Student ID format' }
    ];

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
        return {
            minLength: '',
            maxLength: '',
            patternMode: 'preset',
            patternPreset: '',
            customPattern: ''
        };
    }

    function normalizeResponseValidation(responseValidation) {
        return {
            minLength: String(responseValidation?.minLength ?? '').trim(),
            maxLength: String(responseValidation?.maxLength ?? '').trim(),
            patternMode: responseValidation?.patternMode === 'custom' ? 'custom' : 'preset',
            patternPreset: String(responseValidation?.patternPreset ?? '').trim(),
            customPattern: String(responseValidation?.customPattern ?? '').trim()
        };
    }

    function sanitizeResponseValidationForPayload(responseValidation) {
        const normalized = normalizeResponseValidation(responseValidation);
        const payload = {};

        if (normalized.minLength !== '') {
            payload.minLength = Math.max(0, Number(normalized.minLength));
        }
        if (normalized.maxLength !== '') {
            payload.maxLength = Math.max(0, Number(normalized.maxLength));
        }
        if (normalized.patternMode === 'custom') {
            payload.patternMode = 'custom';
            if (normalized.customPattern) {
                payload.customPattern = normalized.customPattern;
            }
        } else if (normalized.patternPreset) {
            payload.patternMode = 'preset';
            payload.patternPreset = normalized.patternPreset;
        }

        return payload;
    }

    function getShortAnswerValidationIssue(responseValidation) {
        const normalized = normalizeResponseValidation(responseValidation);
        const minLength = normalized.minLength === '' ? null : Number(normalized.minLength);
        const maxLength = normalized.maxLength === '' ? null : Number(normalized.maxLength);

        if ((normalized.minLength !== '' && (!Number.isFinite(minLength) || minLength < 0)) || (normalized.maxLength !== '' && (!Number.isFinite(maxLength) || maxLength < 0))) {
            return 'Use zero or positive numbers for response length rules.';
        }

        if (minLength != null && maxLength != null && minLength > maxLength) {
            return 'Minimum length cannot be greater than maximum length.';
        }

        if (normalized.patternMode === 'custom' && normalized.customPattern) {
            try {
                new RegExp(normalized.customPattern);
            } catch (error) {
                return 'Enter a valid custom regex pattern before publishing.';
            }
        }

        return '';
    }

    function hasResponseValidation(responseValidation) {
        const normalized = normalizeResponseValidation(responseValidation);
        return normalized.minLength !== ''
            || normalized.maxLength !== ''
            || (normalized.patternMode === 'custom' && normalized.customPattern !== '')
            || (normalized.patternMode === 'preset' && normalized.patternPreset !== '');
    }

    function summarizeOpenTextAdvanced(question) {
        const responseValidation = normalizeResponseValidation(question.responseValidation);
        const summary = [];

        if (String(question.description || '').trim()) {
            summary.push('Description');
        }
        if (question.caseSensitive) {
            summary.push('Case sensitive');
        }
        if (question.type === 'short_answer' && hasResponseValidation(responseValidation)) {
            summary.push('Validation');
        }

        return summary.length ? summary.join(' | ') : 'No advanced rules';
    }

    function renderOpenTextAnswerEditor(question, options = {}) {
        const acceptedAnswers = getEditableAcceptedAnswers(question.correctAnswers);
        const copy = getOpenTextEditorCopy(question.type);
        const renderPointsInlineControl = options.renderPointsInlineControl || (() => '');
        const summarizeQuestionResponseShape = options.summarizeQuestionResponseShape || (() => '');
        const escapeHtmlValue = options.escapeHtml || escapeHtml;
        const escapeAttributeValue = options.escapeAttribute || escapeAttribute;

        return `
                <section class="teacher-quiz-builder-open-text-shell teacher-quiz-builder-open-text-shell-${escapeAttributeValue(question.type)}">
                    <div class="teacher-quiz-builder-open-text-main">
                        <div class="teacher-quiz-builder-open-text-main-header">
                            <div>
                                <span class="teacher-field-label">${copy.answerLabel}</span>
                                <p class="teacher-meta">Each entry is treated as an alternative correct response during grading.</p>
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
                        </div>

                        <div class="teacher-quiz-builder-open-text-advanced-summary">
                            <span class="teacher-quiz-builder-question-chip">${escapeHtmlValue(options.responseSummary || summarizeQuestionResponseShape(question))}</span>
                            <span class="teacher-quiz-builder-question-chip">${question.required !== false ? 'Required' : 'Optional'}</span>
                            <span class="teacher-quiz-builder-question-chip">${escapeHtmlValue(summarizeOpenTextAdvanced(question))}</span>
                        </div>
                    </div>
                </section>
            `;
    }

    function renderShortAnswerValidationEditor(question, options = {}) {
        const responseValidation = normalizeResponseValidation(question.responseValidation);
        const validationIssue = getShortAnswerValidationIssue(responseValidation);
        const escapeHtmlValue = options.escapeHtml || escapeHtml;
        const escapeAttributeValue = options.escapeAttribute || escapeAttribute;

        return `
            <div class="teacher-quiz-builder-short-answer-validation">
                <div class="teacher-quiz-builder-short-answer-validation-header">
                    <div>
                        <span class="teacher-field-label">Response Validation</span>
                        <p class="teacher-meta">Optional rules for uncommon answer formats such as IDs, codes, or fixed-length responses.</p>
                    </div>
                </div>
                <div class="teacher-quiz-builder-short-answer-validation-grid">
                    <label class="teacher-quiz-builder-question-body-row">
                        <span class="teacher-field-label">Minimum length</span>
                        <input
                            type="number"
                            min="0"
                            class="teacher-input"
                            data-field="responseValidationMinLength"
                            data-question-id="${escapeAttributeValue(question.id)}"
                            value="${escapeAttributeValue(responseValidation.minLength)}"
                            placeholder="No minimum"
                        >
                    </label>
                    <label class="teacher-quiz-builder-question-body-row">
                        <span class="teacher-field-label">Maximum length</span>
                        <input
                            type="number"
                            min="0"
                            class="teacher-input"
                            data-field="responseValidationMaxLength"
                            data-question-id="${escapeAttributeValue(question.id)}"
                            value="${escapeAttributeValue(responseValidation.maxLength)}"
                            placeholder="No maximum"
                        >
                    </label>
                    <label class="teacher-quiz-builder-question-body-row">
                        <span class="teacher-field-label">Format rule</span>
                        <select class="teacher-select" data-field="responseValidationPatternMode" data-question-id="${escapeAttributeValue(question.id)}">
                            <option value="preset" ${responseValidation.patternMode === 'preset' ? 'selected' : ''}>Common format</option>
                            <option value="custom" ${responseValidation.patternMode === 'custom' ? 'selected' : ''}>Expert regex</option>
                        </select>
                    </label>
                    ${responseValidation.patternMode === 'custom'
                        ? `
                            <label class="teacher-quiz-builder-question-body-row teacher-quiz-builder-short-answer-validation-full">
                                <span class="teacher-field-label">Custom regex</span>
                                <input
                                    type="text"
                                    class="teacher-input"
                                    data-field="responseValidationCustomPattern"
                                    data-question-id="${escapeAttributeValue(question.id)}"
                                    value="${escapeAttributeValue(responseValidation.customPattern)}"
                                    placeholder="Example: ^[A-Z]{2}\\d{4}$"
                                >
                            </label>
                        `
                        : `
                            <label class="teacher-quiz-builder-question-body-row teacher-quiz-builder-short-answer-validation-full">
                                <span class="teacher-field-label">Common format</span>
                                <select class="teacher-select" data-field="responseValidationPatternPreset" data-question-id="${escapeAttributeValue(question.id)}">
                                    ${SHORT_ANSWER_PATTERN_PRESETS.map((preset) => `
                                        <option value="${escapeAttributeValue(preset.value)}" ${responseValidation.patternPreset === preset.value ? 'selected' : ''}>${escapeHtmlValue(preset.label)}</option>
                                    `).join('')}
                                </select>
                            </label>
                        `
                    }
                </div>
                <p class="teacher-meta teacher-quiz-builder-short-answer-validation-note">
                    Leave these blank unless the answer must follow a strict pattern. Use expert regex only when the built-in formats are not enough.
                </p>
                ${validationIssue ? `<p class="teacher-quiz-builder-inline-validation" role="alert">${escapeHtmlValue(validationIssue)}</p>` : ''}
            </div>
        `;
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
        const nextValidation = normalizeResponseValidation(responseValidation);

        if (questionField === 'responseValidationMinLength') {
            nextValidation.minLength = nextValue;
        } else if (questionField === 'responseValidationMaxLength') {
            nextValidation.maxLength = nextValue;
        } else if (questionField === 'responseValidationPatternMode') {
            nextValidation.patternMode = nextValue === 'custom' ? 'custom' : 'preset';
        } else if (questionField === 'responseValidationPatternPreset') {
            nextValidation.patternPreset = nextValue;
        } else if (questionField === 'responseValidationCustomPattern') {
            nextValidation.customPattern = nextValue;
        }

        return nextValidation;
    }

    function isOpenTextQuestionReadyForPublish(question) {
        if (!isOpenTextQuestion(question)) {
            return false;
        }

        const hasAcceptedAnswer = getEditableAcceptedAnswers(question.correctAnswers)
            .some((answer) => String(answer || '').trim());

        if (!hasAcceptedAnswer) {
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

        return 'Add at least one accepted answer to every short-answer or paragraph question before publishing.';
    }

    return {
        SHORT_ANSWER_PATTERN_PRESETS,
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
        isOpenTextQuestionReadyForPublish,
        buildOpenTextInvalidAnswerMessage
    };
});
