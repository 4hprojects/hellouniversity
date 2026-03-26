const shortAnswerHelpers = require('../../public/js/teacherQuizBuilderShortAnswer.js');

describe('teacher quiz builder Short Answer helpers', () => {
  test('renderOpenTextAnswerEditor preserves blank accepted-answer slots during editing', () => {
    const html = shortAnswerHelpers.renderOpenTextAnswerEditor({
      id: 'question-1',
      type: 'short_answer',
      correctAnswers: ['', 'Accepted answer', ''],
      required: true,
      description: '',
      caseSensitive: false,
      responseValidation: shortAnswerHelpers.createEmptyResponseValidation()
    }, {
      summarizeQuestionResponseShape: () => 'Short answer',
      renderPointsInlineControl: () => ''
    });

    expect((html.match(/data-field="acceptedAnswerText"/g) || [])).toHaveLength(3);
    expect(html).toContain('Accepted answers');
    expect(html).toContain('Add alternative answer');
    expect(html).toContain('Accepted answer 2');
    expect(html).toContain('leave them blank for manual review');
  });

  test('getOpenTextEditorCopy keeps paragraph copy separate from short answer copy', () => {
    expect(shortAnswerHelpers.getOpenTextEditorCopy('short_answer')).toEqual({
      answerLabel: 'Accepted answers',
      addAnswerLabel: 'Add alternative answer',
      placeholderPrefix: 'Accepted answer'
    });

    expect(shortAnswerHelpers.getOpenTextEditorCopy('paragraph')).toEqual({
      answerLabel: 'Accepted responses',
      addAnswerLabel: 'Add accepted response',
      placeholderPrefix: 'Accepted response'
    });
  });

  test('renderShortAnswerValidationEditor renders category and operator-dependent inputs', () => {
    const html = shortAnswerHelpers.renderShortAnswerValidationEditor({
      id: 'question-1',
      type: 'short_answer',
      responseValidation: {
        category: 'number',
        operator: 'between',
        value: '10',
        secondaryValue: '20',
        customErrorText: 'Use a number in range.'
      }
    });

    expect(html).toContain('Response validation');
    expect(html).toContain('data-field="responseValidationCategory"');
    expect(html).toContain('data-field="responseValidationOperator"');
    expect(html).toContain('data-field="responseValidationValue"');
    expect(html).toContain('data-field="responseValidationSecondaryValue"');
    expect(html).toContain('data-field="responseValidationCustomErrorText"');
    expect(html).toContain('Use a number in range.');
  });

  test('open-text publish readiness blocks invalid short-answer validation rules', () => {
    expect(shortAnswerHelpers.isOpenTextQuestionReadyForPublish({
      type: 'paragraph',
      correctAnswers: [],
      responseValidation: shortAnswerHelpers.createEmptyResponseValidation()
    })).toBe(true);

    expect(shortAnswerHelpers.isOpenTextQuestionReadyForPublish({
      type: 'short_answer',
      correctAnswers: [],
      responseValidation: shortAnswerHelpers.createEmptyResponseValidation()
    })).toBe(true);

    expect(shortAnswerHelpers.isOpenTextQuestionReadyForPublish({
      type: 'short_answer',
      correctAnswers: ['AB12'],
      responseValidation: {
        category: 'number',
        operator: 'between',
        value: '20',
        secondaryValue: '10',
        customErrorText: ''
      }
    })).toBe(false);

    expect(shortAnswerHelpers.buildOpenTextInvalidAnswerMessage({
      type: 'short_answer',
      correctAnswers: [],
      responseValidation: {
        category: 'regex',
        operator: 'matches',
        value: '[',
        secondaryValue: '',
        customErrorText: ''
      }
    })).toBe('Enter a valid regular expression pattern.');
  });
});
