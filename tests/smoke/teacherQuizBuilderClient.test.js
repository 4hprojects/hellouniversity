const builder = require('../../public/js/teacherQuizBuilder.js');

describe('teacher quiz builder helpers', () => {
  const {
    createSection,
    createQuestion,
    convertQuestionToType,
    getChoiceEditorCopy,
    shouldIgnoreCorrectOptionSelection,
    normalizeResponseValidation,
    sanitizeResponseValidationForPayload,
    getShortAnswerValidationIssue,
    insertQuestionAfterActive,
    duplicateQuestionById,
    removeSectionById,
    moveQuestion,
    moveSection,
    normalizeDragPreview,
    isSameDragPreview,
    resolveDragPreviewTarget,
    dragPreviewClassName,
    computeQuestionSettingsMenuPlacement,
    shouldSaveBeforePreview,
    buildPreviewUrl
  } = builder.__testables;

  function buildSection(title, questions = []) {
    const section = createSection({ title });
    section.questions = questions.map((question) => ({
      ...question,
      sectionId: section.id
    }));
    return section;
  }

  test('insertQuestionAfterActive adds a new question after the active item inside its section', () => {
    const first = createQuestion('multiple_choice');
    const second = createQuestion('short_answer');
    const inserted = createQuestion('paragraph');
    const section = buildSection('Section A', [first, second]);

    const result = insertQuestionAfterActive([section], first.id, section.id, inserted);

    expect(result.sections[0].questions.map((question) => question.id)).toEqual([first.id, inserted.id, second.id]);
    expect(result.activeQuestionId).toBe(inserted.id);
  });

  test('convertQuestionToType preserves objective options while switching types', () => {
    const source = {
      ...createQuestion('multiple_choice'),
      options: ['Red', 'Blue', 'Green'],
      correctAnswers: ['Blue']
    };

    const converted = convertQuestionToType(source, 'checkbox');

    expect(converted.type).toBe('checkbox');
    expect(converted.options).toEqual(['Red', 'Blue', 'Green']);
    expect(converted.correctAnswers).toEqual(['Blue']);
  });

  test('convertQuestionToType maps boolean-like text answers into true false', () => {
    const source = {
      ...createQuestion('short_answer'),
      correctAnswers: ['false']
    };

    const converted = convertQuestionToType(source, 'true_false');

    expect(converted.type).toBe('true_false');
    expect(converted.options).toEqual(['True', 'False']);
    expect(converted.correctAnswers).toEqual(['False']);
  });

  test('convertQuestionToType keeps remaining option text and backfills missing objective options', () => {
    const source = {
      ...createQuestion('short_answer'),
      options: ['Only one option'],
      correctAnswers: ['typed answer']
    };

    const converted = convertQuestionToType(source, 'multiple_choice');

    expect(converted.type).toBe('multiple_choice');
    expect(converted.options[0]).toBe('Only one option');
    expect(converted.options.length).toBeGreaterThanOrEqual(2);
    expect(converted.correctAnswers).toEqual([converted.options[0]]);
  });

  test('getChoiceEditorCopy makes multiple choice single-answer guidance explicit', () => {
    expect(getChoiceEditorCopy('multiple_choice')).toEqual({
      legend: 'Multiple Choice Answers',
      mode: 'Single correct answer',
      hint: 'Select exactly one choice as the answer key for this question.'
    });
  });

  test('shouldIgnoreCorrectOptionSelection blocks blank choices from becoming the answer key', () => {
    const question = {
      ...createQuestion('multiple_choice'),
      options: ['Filled choice', ''],
      correctAnswers: ['Filled choice']
    };

    expect(shouldIgnoreCorrectOptionSelection(question, 0)).toBe(false);
    expect(shouldIgnoreCorrectOptionSelection(question, 1)).toBe(true);
  });

  test('createQuestion leaves new multiple choice questions with no selected answer by default', () => {
    const question = createQuestion('multiple_choice');

    expect(question.options.length).toBeGreaterThanOrEqual(2);
    expect(question.correctAnswers).toEqual([]);
    expect(question.shuffleOptionOrder).toBe(false);
    expect(question.goToSectionBasedOnAnswer).toBe(false);
  });

  test('convertQuestionToType preserves blank accepted-answer slots for text questions during editing', () => {
    const source = {
      ...createQuestion('short_answer'),
      correctAnswers: ['', 'Accepted answer', '']
    };

    const converted = convertQuestionToType(source, 'short_answer');

    expect(converted.correctAnswers).toEqual(['', 'Accepted answer', '']);
  });

  test('convertQuestionToType preserves question settings flags', () => {
    const source = {
      ...createQuestion('multiple_choice'),
      shuffleOptionOrder: true,
      goToSectionBasedOnAnswer: true
    };

    const converted = convertQuestionToType(source, 'checkbox');

    expect(converted.shuffleOptionOrder).toBe(true);
    expect(converted.goToSectionBasedOnAnswer).toBe(true);
  });

  test('createQuestion gives short answer questions a stable empty response validation object', () => {
    const question = createQuestion('short_answer');

    expect(question.responseValidation).toEqual({
      category: '',
      operator: '',
      value: '',
      secondaryValue: '',
      customErrorText: ''
    });
  });

  test('convertQuestionToType preserves short answer response validation and clears it for paragraph', () => {
    const source = {
      ...createQuestion('short_answer'),
      responseValidation: {
        category: 'length',
        operator: 'max_char_count',
        value: '8',
        secondaryValue: '',
        customErrorText: 'Too long.'
      }
    };

    expect(convertQuestionToType(source, 'short_answer').responseValidation).toEqual(source.responseValidation);
    expect(convertQuestionToType(source, 'paragraph').responseValidation).toEqual({
      category: '',
      operator: '',
      value: '',
      secondaryValue: '',
      customErrorText: ''
    });
  });

  test('sanitizeResponseValidationForPayload omits empty defaults and keeps active short answer rules', () => {
    expect(sanitizeResponseValidationForPayload(normalizeResponseValidation({}))).toEqual({});
    expect(sanitizeResponseValidationForPayload({
      category: 'length',
      operator: 'max_char_count',
      value: '12',
      secondaryValue: '',
      customErrorText: 'Too long.'
    })).toEqual({
      category: 'length',
      operator: 'max_char_count',
      value: '12',
      customErrorText: 'Too long.'
    });
  });

  test('getShortAnswerValidationIssue validates the new short answer rule model', () => {
    expect(getShortAnswerValidationIssue({
      category: 'number',
      operator: 'between',
      value: '10',
      secondaryValue: '2',
      customErrorText: ''
    })).toBe('The first range value cannot be greater than the second.');

    expect(getShortAnswerValidationIssue({
      category: 'regex',
      operator: 'matches',
      value: '[',
      secondaryValue: '',
      customErrorText: ''
    })).toBe('Enter a valid regular expression pattern.');
  });

  test('duplicateQuestionById inserts a copied question immediately after the source', () => {
    const first = createQuestion('multiple_choice');
    const second = createQuestion('short_answer');
    const section = buildSection('Section A', [first, second]);

    const result = duplicateQuestionById([section], first.id);

    expect(result.sections[0].questions).toHaveLength(3);
    expect(result.sections[0].questions[1].title).toBe(first.title);
    expect(result.sections[0].questions[1].id).not.toBe(first.id);
    expect(result.activeQuestionId).toBe(result.sections[0].questions[1].id);
  });

  test('moveQuestion can move a question across sections', () => {
    const first = createQuestion('multiple_choice');
    const second = createQuestion('short_answer');
    const third = createQuestion('paragraph');
    const sectionOne = buildSection('Section A', [first, second]);
    const sectionTwo = buildSection('Section B', [third]);

    const result = moveQuestion([sectionOne, sectionTwo], second.id, sectionTwo.id, third.id, 'before');

    expect(result[0].questions.map((question) => question.id)).toEqual([first.id]);
    expect(result[1].questions.map((question) => question.id)).toEqual([second.id, third.id]);
  });

  test('moveQuestion appends to the end of a target section dropzone', () => {
    const first = createQuestion('multiple_choice');
    const second = createQuestion('short_answer');
    const third = createQuestion('paragraph');
    const sectionOne = buildSection('Section A', [first, second]);
    const sectionTwo = buildSection('Section B', [third]);

    const result = moveQuestion([sectionOne, sectionTwo], first.id, sectionTwo.id, '', 'end');

    expect(result[0].questions.map((question) => question.id)).toEqual([second.id]);
    expect(result[1].questions.map((question) => question.id)).toEqual([third.id, first.id]);
  });

  test('moveQuestion no-op move does not corrupt order', () => {
    const first = createQuestion('multiple_choice');
    const second = createQuestion('short_answer');
    const section = buildSection('Section A', [first, second]);

    const result = moveQuestion([section], first.id, section.id, first.id, 'before');

    expect(result[0].questions.map((question) => question.id)).toEqual([first.id, second.id]);
  });

  test('moveSection reorders sections around the target section', () => {
    const sectionOne = buildSection('Section A');
    const sectionTwo = buildSection('Section B');
    const sectionThree = buildSection('Section C');

    const result = moveSection([sectionOne, sectionTwo, sectionThree], sectionThree.id, sectionOne.id, 'before');

    expect(result.map((section) => section.id)).toEqual([sectionThree.id, sectionOne.id, sectionTwo.id]);
  });

  test('moveSection no-op move preserves section order', () => {
    const sectionOne = buildSection('Section A');
    const sectionTwo = buildSection('Section B');

    const result = moveSection([sectionOne, sectionTwo], sectionOne.id, sectionOne.id, 'before');

    expect(result.map((section) => section.id)).toEqual([sectionOne.id, sectionTwo.id]);
  });

  test('resolveDragPreviewTarget returns section before/after preview data', () => {
    const preview = resolveDragPreviewTarget(
      { type: 'section', sectionId: 'section-a', questionId: '' },
      {
        sectionCard: {
          dataset: { sectionId: 'section-b' },
          getBoundingClientRect: () => ({ top: 100, height: 80 })
        },
        event: { clientY: 110 }
      }
    );

    expect(preview).toEqual({
      targetType: 'section-card',
      sectionId: 'section-b',
      questionId: '',
      position: 'before'
    });
  });

  test('resolveDragPreviewTarget returns question dropzone append preview data', () => {
    const preview = resolveDragPreviewTarget(
      { type: 'question', sectionId: 'section-a', questionId: 'question-a' },
      {
        sectionDropzone: {
          dataset: { sectionId: 'section-b' }
        }
      }
    );

    expect(preview).toEqual({
      targetType: 'section-dropzone',
      sectionId: 'section-b',
      questionId: '',
      position: 'end'
    });
  });

  test('drag preview helpers normalize and compare preview state safely', () => {
    expect(normalizeDragPreview(null)).toBeNull();
    expect(isSameDragPreview(null, null)).toBe(true);
    expect(isSameDragPreview(
      { targetType: 'question-card', sectionId: 's1', questionId: 'q1', position: 'after' },
      { targetType: 'question-card', sectionId: 's1', questionId: 'q1', position: 'after' }
    )).toBe(true);
    expect(dragPreviewClassName({ position: 'end' })).toBe('teacher-quiz-builder-drop-target teacher-quiz-builder-drop-target-end');
  });

  test('question settings menu placement prefers below and right-aligned anchoring when space allows', () => {
    const placement = computeQuestionSettingsMenuPlacement(
      { top: 100, bottom: 136, left: 220, right: 256, width: 36, height: 36 },
      { width: 240, height: 180 },
      { viewportWidth: 1280, viewportHeight: 800 }
    );

    expect(placement.vertical).toBe('below');
    expect(placement.horizontal).toBe('right');
    expect(placement.left).toBe(16);
    expect(placement.top).toBe(144);
  });

  test('question settings menu placement flips above when there is not enough room below', () => {
    const placement = computeQuestionSettingsMenuPlacement(
      { top: 720, bottom: 756, left: 900, right: 936, width: 36, height: 36 },
      { width: 240, height: 180 },
      { viewportWidth: 1280, viewportHeight: 800 }
    );

    expect(placement.vertical).toBe('above');
    expect(placement.top).toBe(532);
  });

  test('question settings menu placement flips left alignment when right alignment would overflow', () => {
    const placement = computeQuestionSettingsMenuPlacement(
      { top: 220, bottom: 256, left: 24, right: 60, width: 36, height: 36 },
      { width: 240, height: 180 },
      { viewportWidth: 430, viewportHeight: 900 }
    );

    expect(placement.horizontal).toBe('left');
    expect(placement.left).toBe(24);
  });

  test('question settings menu placement clamps inside narrow viewport bounds', () => {
    const placement = computeQuestionSettingsMenuPlacement(
      { top: 220, bottom: 256, left: 140, right: 176, width: 36, height: 36 },
      { width: 280, height: 180 },
      { viewportWidth: 260, viewportHeight: 320 }
    );

    expect(placement.left).toBe(12);
    expect(placement.top).toBe(32);
    expect(placement.arrowLeft).toBeGreaterThanOrEqual(16);
    expect(placement.arrowLeft).toBeLessThanOrEqual(264);
  });

  test('preview decision logic opens saved clean quizzes directly', () => {
    expect(shouldSaveBeforePreview({
      quizId: 'quiz-123',
      lastSavedSignature: 'same',
      currentSignature: 'same'
    })).toBe(false);
  });

  test('preview decision logic requires save for missing quiz id or dirty state', () => {
    expect(shouldSaveBeforePreview({
      quizId: '',
      lastSavedSignature: '',
      currentSignature: 'draft-signature'
    })).toBe(true);

    expect(shouldSaveBeforePreview({
      quizId: 'quiz-123',
      lastSavedSignature: 'old',
      currentSignature: 'new'
    })).toBe(true);
  });

  test('preview url builder targets the teacher preview route', () => {
    expect(buildPreviewUrl('507f1f77bcf86cd799439099')).toBe('/teacher/quizzes/507f1f77bcf86cd799439099/preview');
  });

  test('removeSectionById blocks deletion when the section still has questions', () => {
    const section = buildSection('Section A', [createQuestion('multiple_choice')]);

    const result = removeSectionById([section], section.id, section.questions[0].id);

    expect(result.removed).toBe(false);
    expect(result.message).toContain('Move or remove all questions');
  });
});
