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

  test('renderShortAnswerValidationEditor switches between preset and custom validation inputs', () => {
    const presetHtml = shortAnswerHelpers.renderShortAnswerValidationEditor({
      id: 'question-1',
      type: 'short_answer',
      responseValidation: shortAnswerHelpers.createEmptyResponseValidation()
    });
    const customHtml = shortAnswerHelpers.renderShortAnswerValidationEditor({
      id: 'question-1',
      type: 'short_answer',
      responseValidation: {
        minLength: '',
        maxLength: '',
        patternMode: 'custom',
        patternPreset: '',
        customPattern: '['
      }
    });

    expect(presetHtml).toContain('data-field="responseValidationPatternPreset"');
    expect(presetHtml).not.toContain('data-field="responseValidationCustomPattern"');
    expect(customHtml).toContain('data-field="responseValidationCustomPattern"');
    expect(customHtml).toContain('Enter a valid custom regex pattern before publishing.');
  });

  test('open-text publish readiness keeps paragraph simple and short answer validation-aware', () => {
    expect(shortAnswerHelpers.isOpenTextQuestionReadyForPublish({
      type: 'paragraph',
      correctAnswers: ['Reflection'],
      responseValidation: shortAnswerHelpers.createEmptyResponseValidation()
    })).toBe(true);

    expect(shortAnswerHelpers.isOpenTextQuestionReadyForPublish({
      type: 'short_answer',
      correctAnswers: ['AB12'],
      responseValidation: {
        minLength: '10',
        maxLength: '2',
        patternMode: 'preset',
        patternPreset: '',
        customPattern: ''
      }
    })).toBe(false);

    expect(shortAnswerHelpers.buildOpenTextInvalidAnswerMessage({
      type: 'paragraph',
      correctAnswers: [''],
      responseValidation: shortAnswerHelpers.createEmptyResponseValidation()
    })).toBe('Add at least one accepted answer to every short-answer or paragraph question before publishing.');
  });
});
