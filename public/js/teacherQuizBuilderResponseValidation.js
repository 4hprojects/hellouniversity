(function attachTeacherQuizBuilderResponseValidation(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.teacherQuizBuilderResponseValidation = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function teacherQuizBuilderResponseValidationFactory() {
    const RESPONSE_VALIDATION_GROUPS = [
        {
            value: 'number',
            label: 'Number',
            operators: [
                { value: 'gt', label: 'Greater than', inputMode: 'single', valueLabel: 'Number', valueType: 'number' },
                { value: 'gte', label: 'Greater than or equal to', inputMode: 'single', valueLabel: 'Number', valueType: 'number' },
                { value: 'lt', label: 'Less than', inputMode: 'single', valueLabel: 'Number', valueType: 'number' },
                { value: 'lte', label: 'Less than or equal to', inputMode: 'single', valueLabel: 'Number', valueType: 'number' },
                { value: 'eq', label: 'Equal to', inputMode: 'single', valueLabel: 'Number', valueType: 'number' },
                { value: 'neq', label: 'Not equal to', inputMode: 'single', valueLabel: 'Number', valueType: 'number' },
                { value: 'between', label: 'Between', inputMode: 'range', valueLabel: 'Min number', secondaryValueLabel: 'Max number', valueType: 'number' },
                { value: 'not_between', label: 'Not between', inputMode: 'range', valueLabel: 'Min number', secondaryValueLabel: 'Max number', valueType: 'number' },
                { value: 'is_number', label: 'Is number', inputMode: 'none', valueType: 'number' },
                { value: 'whole_number', label: 'Whole number', inputMode: 'none', valueType: 'number' }
            ]
        },
        {
            value: 'text',
            label: 'Text',
            operators: [
                { value: 'contains', label: 'Contains', inputMode: 'single', valueLabel: 'Text', valueType: 'text' },
                { value: 'not_contains', label: 'Doesn\'t contain', inputMode: 'single', valueLabel: 'Text', valueType: 'text' },
                { value: 'email', label: 'Email', inputMode: 'none', valueType: 'text' },
                { value: 'url', label: 'URL', inputMode: 'none', valueType: 'text' }
            ]
        },
        {
            value: 'length',
            label: 'Length',
            operators: [
                { value: 'max_char_count', label: 'Maximum character count', inputMode: 'single', valueLabel: 'Maximum', valueType: 'integer' },
                { value: 'min_char_count', label: 'Minimum character count', inputMode: 'single', valueLabel: 'Minimum', valueType: 'integer' }
            ]
        },
        {
            value: 'regex',
            label: 'Regular expression',
            operators: [
                { value: 'contains', label: 'Contains', inputMode: 'single', valueLabel: 'Regex pattern', valueType: 'regex' },
                { value: 'not_contains', label: 'Doesn\'t contain', inputMode: 'single', valueLabel: 'Regex pattern', valueType: 'regex' },
                { value: 'matches', label: 'Matches', inputMode: 'single', valueLabel: 'Regex pattern', valueType: 'regex' },
                { value: 'not_matches', label: 'Doesn\'t match', inputMode: 'single', valueLabel: 'Regex pattern', valueType: 'regex' }
            ]
        }
    ];

    const GROUP_INDEX = new Map(RESPONSE_VALIDATION_GROUPS.map((group) => [group.value, group]));

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

    function createEmptyResponseValidation() {
        return {
            category: '',
            operator: '',
            value: '',
            secondaryValue: '',
            customErrorText: ''
        };
    }

    function getCategoryDefinition(category) {
        return GROUP_INDEX.get(String(category || '').trim()) || null;
    }

    function getOperatorDefinition(category, operator) {
        const group = getCategoryDefinition(category);
        if (!group) {
            return null;
        }
        return group.operators.find((item) => item.value === String(operator || '').trim()) || null;
    }

    function normalizeResponseValidation(responseValidation) {
        if (!responseValidation || typeof responseValidation !== 'object') {
            return createEmptyResponseValidation();
        }

        if (
            Object.prototype.hasOwnProperty.call(responseValidation, 'minLength')
            || Object.prototype.hasOwnProperty.call(responseValidation, 'maxLength')
            || Object.prototype.hasOwnProperty.call(responseValidation, 'patternMode')
            || Object.prototype.hasOwnProperty.call(responseValidation, 'patternPreset')
            || Object.prototype.hasOwnProperty.call(responseValidation, 'customPattern')
        ) {
            return createEmptyResponseValidation();
        }

        const category = String(responseValidation.category || '').trim();
        const operator = String(responseValidation.operator || '').trim();
        const normalized = createEmptyResponseValidation();
        const categoryDefinition = getCategoryDefinition(category);
        if (!categoryDefinition) {
            return normalized;
        }

        normalized.category = categoryDefinition.value;
        const operatorDefinition = getOperatorDefinition(categoryDefinition.value, operator);
        if (!operatorDefinition) {
            normalized.customErrorText = String(responseValidation.customErrorText || '').trim();
            return normalized;
        }

        normalized.operator = operatorDefinition.value;
        normalized.value = String(responseValidation.value ?? '').trim();
        normalized.secondaryValue = String(responseValidation.secondaryValue ?? '').trim();
        normalized.customErrorText = String(responseValidation.customErrorText ?? '').trim();
        return normalized;
    }

    function hasResponseValidation(responseValidation) {
        const normalized = normalizeResponseValidation(responseValidation);
        return Boolean(normalized.category && normalized.operator);
    }

    function sanitizeResponseValidationForPayload(responseValidation) {
        const normalized = normalizeResponseValidation(responseValidation);
        if (!hasResponseValidation(normalized)) {
            return {};
        }

        const operatorDefinition = getOperatorDefinition(normalized.category, normalized.operator);
        if (!operatorDefinition) {
            return {};
        }

        const payload = {
            category: normalized.category,
            operator: normalized.operator
        };

        if (operatorDefinition.inputMode === 'single' && normalized.value !== '') {
            payload.value = normalized.value;
        }

        if (operatorDefinition.inputMode === 'range') {
            if (normalized.value !== '') {
                payload.value = normalized.value;
            }
            if (normalized.secondaryValue !== '') {
                payload.secondaryValue = normalized.secondaryValue;
            }
        }

        if (normalized.customErrorText) {
            payload.customErrorText = normalized.customErrorText;
        }

        return payload;
    }

    function getShortAnswerValidationIssue(responseValidation) {
        const normalized = normalizeResponseValidation(responseValidation);
        const hasAnyInput = Boolean(
            normalized.category
            || normalized.operator
            || normalized.value
            || normalized.secondaryValue
            || normalized.customErrorText
        );
        if (!hasAnyInput) {
            return '';
        }
        if (!normalized.category) {
            return 'Choose a response validation type.';
        }
        if (!normalized.operator) {
            return 'Choose a response validation rule.';
        }

        const operatorDefinition = getOperatorDefinition(normalized.category, normalized.operator);
        if (!operatorDefinition) {
            return 'Choose a valid response validation rule.';
        }

        if (operatorDefinition.inputMode === 'single') {
            if (!normalized.value) {
                return 'Enter a validation value.';
            }
            if (operatorDefinition.valueType === 'number') {
                const numberValue = Number(normalized.value);
                if (!Number.isFinite(numberValue)) {
                    return 'Enter a valid number for response validation.';
                }
            }
            if (operatorDefinition.valueType === 'integer') {
                const integerValue = Number(normalized.value);
                if (!Number.isInteger(integerValue) || integerValue < 0) {
                    return 'Enter a whole number greater than or equal to zero.';
                }
            }
            if (operatorDefinition.valueType === 'regex') {
                try {
                    new RegExp(normalized.value);
                } catch (error) {
                    return 'Enter a valid regular expression pattern.';
                }
            }
        }

        if (operatorDefinition.inputMode === 'range') {
            if (!normalized.value || !normalized.secondaryValue) {
                return 'Enter both values for the selected range rule.';
            }
            const firstValue = Number(normalized.value);
            const secondValue = Number(normalized.secondaryValue);
            if (!Number.isFinite(firstValue) || !Number.isFinite(secondValue)) {
                return 'Enter valid numbers for the selected range rule.';
            }
            if (firstValue > secondValue) {
                return 'The first range value cannot be greater than the second.';
            }
        }

        return '';
    }

    function updateResponseValidationField(responseValidation, questionField, nextValue) {
        const normalized = normalizeResponseValidation(responseValidation);
        if (questionField === 'responseValidationCategory') {
            return {
                category: String(nextValue || '').trim(),
                operator: '',
                value: '',
                secondaryValue: '',
                customErrorText: normalized.customErrorText
            };
        }

        if (questionField === 'responseValidationOperator') {
            return {
                ...normalized,
                operator: String(nextValue || '').trim(),
                value: '',
                secondaryValue: ''
            };
        }

        if (questionField === 'responseValidationValue') {
            return {
                ...normalized,
                value: String(nextValue ?? '').trim()
            };
        }

        if (questionField === 'responseValidationSecondaryValue') {
            return {
                ...normalized,
                secondaryValue: String(nextValue ?? '').trim()
            };
        }

        if (questionField === 'responseValidationCustomErrorText') {
            return {
                ...normalized,
                customErrorText: String(nextValue ?? '').trim()
            };
        }

        return normalized;
    }

    function clearResponseValidation() {
        return createEmptyResponseValidation();
    }

    function renderResponseValidationEditor(question, options = {}) {
        const responseValidation = normalizeResponseValidation(question.responseValidation);
        const issue = getShortAnswerValidationIssue(responseValidation);
        const escapeHtmlValue = options.escapeHtml || escapeHtml;
        const escapeAttributeValue = options.escapeAttribute || escapeAttribute;
        const categoryDefinition = getCategoryDefinition(responseValidation.category);
        const operatorDefinition = getOperatorDefinition(responseValidation.category, responseValidation.operator);
        const operators = categoryDefinition ? categoryDefinition.operators : [];

        return `
            <section class="teacher-quiz-builder-response-validation" aria-label="Response validation">
                <div class="teacher-quiz-builder-response-validation-header">
                    <div>
                        <span class="teacher-field-label">Response validation</span>
                        <p class="teacher-meta">Add a single rule for the format students must follow.</p>
                    </div>
                    <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="clear-response-validation" data-question-id="${escapeAttributeValue(question.id)}">Clear</button>
                </div>
                <div class="teacher-quiz-builder-response-validation-grid">
                    <label class="teacher-quiz-builder-question-body-row">
                        <span class="teacher-field-label">Type</span>
                        <select class="teacher-select" data-field="responseValidationCategory" data-question-id="${escapeAttributeValue(question.id)}">
                            <option value="">Choose type</option>
                            ${RESPONSE_VALIDATION_GROUPS.map((group) => `
                                <option value="${escapeAttributeValue(group.value)}" ${group.value === responseValidation.category ? 'selected' : ''}>${escapeHtmlValue(group.label)}</option>
                            `).join('')}
                        </select>
                    </label>
                    <label class="teacher-quiz-builder-question-body-row">
                        <span class="teacher-field-label">Rule</span>
                        <select class="teacher-select" data-field="responseValidationOperator" data-question-id="${escapeAttributeValue(question.id)}" ${categoryDefinition ? '' : 'disabled'}>
                            <option value="">Choose rule</option>
                            ${operators.map((operator) => `
                                <option value="${escapeAttributeValue(operator.value)}" ${operator.value === responseValidation.operator ? 'selected' : ''}>${escapeHtmlValue(operator.label)}</option>
                            `).join('')}
                        </select>
                    </label>
                    ${operatorDefinition && operatorDefinition.inputMode !== 'none' ? `
                        <label class="teacher-quiz-builder-question-body-row">
                            <span class="teacher-field-label">${escapeHtmlValue(operatorDefinition.valueLabel || 'Value')}</span>
                            <input
                                type="${operatorDefinition.valueType === 'number' || operatorDefinition.valueType === 'integer' ? 'number' : 'text'}"
                                ${operatorDefinition.valueType === 'integer' ? 'step="1" min="0"' : ''}
                                class="teacher-input"
                                data-field="responseValidationValue"
                                data-question-id="${escapeAttributeValue(question.id)}"
                                value="${escapeAttributeValue(responseValidation.value)}"
                                placeholder="${escapeAttributeValue(operatorDefinition.valueLabel || 'Value')}"
                            >
                        </label>
                    ` : ''}
                    ${operatorDefinition && operatorDefinition.inputMode === 'range' ? `
                        <label class="teacher-quiz-builder-question-body-row">
                            <span class="teacher-field-label">${escapeHtmlValue(operatorDefinition.secondaryValueLabel || 'Second value')}</span>
                            <input
                                type="number"
                                class="teacher-input"
                                data-field="responseValidationSecondaryValue"
                                data-question-id="${escapeAttributeValue(question.id)}"
                                value="${escapeAttributeValue(responseValidation.secondaryValue)}"
                                placeholder="${escapeAttributeValue(operatorDefinition.secondaryValueLabel || 'Second value')}"
                            >
                        </label>
                    ` : ''}
                    <label class="teacher-quiz-builder-question-body-row teacher-quiz-builder-response-validation-wide">
                        <span class="teacher-field-label">Custom error text</span>
                        <input
                            type="text"
                            class="teacher-input"
                            data-field="responseValidationCustomErrorText"
                            data-question-id="${escapeAttributeValue(question.id)}"
                            value="${escapeAttributeValue(responseValidation.customErrorText)}"
                            placeholder="Custom error text"
                        >
                    </label>
                </div>
                ${issue ? `<p class="teacher-quiz-builder-inline-validation" role="alert">${escapeHtmlValue(issue)}</p>` : ''}
            </section>
        `;
    }

    return {
        RESPONSE_VALIDATION_GROUPS,
        createEmptyResponseValidation,
        normalizeResponseValidation,
        sanitizeResponseValidationForPayload,
        getShortAnswerValidationIssue,
        updateResponseValidationField,
        clearResponseValidation,
        renderResponseValidationEditor,
        hasResponseValidation
    };
});
