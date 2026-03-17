const builder = require('../../public/js/teacherQuizBuilder.js');

describe('teacher quiz builder helpers', () => {
  const {
    createSection,
    createQuestion,
    convertQuestionToType,
    insertQuestionAfterActive,
    duplicateQuestionById,
    removeSectionById,
    moveQuestion,
    moveSection
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

  test('moveSection reorders sections around the target section', () => {
    const sectionOne = buildSection('Section A');
    const sectionTwo = buildSection('Section B');
    const sectionThree = buildSection('Section C');

    const result = moveSection([sectionOne, sectionTwo, sectionThree], sectionThree.id, sectionOne.id, 'before');

    expect(result.map((section) => section.id)).toEqual([sectionThree.id, sectionOne.id, sectionTwo.id]);
  });

  test('removeSectionById blocks deletion when the section still has questions', () => {
    const section = buildSection('Section A', [createQuestion('multiple_choice')]);

    const result = removeSectionById([section], section.id, section.questions[0].id);

    expect(result.removed).toBe(false);
    expect(result.message).toContain('Move or remove all questions');
  });
});
