const player = require('../../public/js/quizzes/player.js');

describe('student quiz player helpers', () => {
  const { resolveNextSectionId, isQuestionAnswered, summarizeProgress } = player.__testables;

  test('resolveNextSectionId follows a configured route from the current section', () => {
    const quiz = {
      sections: [
        {
          id: 'section-a',
          questions: [
            {
              id: 'q-1',
              order: 0,
              type: 'multiple_choice',
              goToSectionBasedOnAnswer: true,
              answerRoutes: [{ optionIndex: 1, sectionId: 'section-c' }]
            }
          ]
        },
        { id: 'section-b', questions: [] },
        { id: 'section-c', questions: [] }
      ]
    };
    const form = {
      querySelector(selector) {
        if (selector === 'input[name="q-q-1"]:checked') {
          return { value: '1' };
        }
        return null;
      }
    };

    expect(resolveNextSectionId(quiz, 'section-a', form)).toBe('section-c');
  });

  test('resolveNextSectionId falls back to the next authored section when no route is selected', () => {
    const quiz = {
      sections: [
        {
          id: 'section-a',
          questions: [
            {
              id: 'q-1',
              order: 0,
              type: 'multiple_choice',
              goToSectionBasedOnAnswer: true,
              answerRoutes: [{ optionIndex: 1, sectionId: 'section-c' }]
            }
          ]
        },
        { id: 'section-b', questions: [] },
        { id: 'section-c', questions: [] }
      ]
    };
    const form = {
      querySelector() {
        return null;
      }
    };

    expect(resolveNextSectionId(quiz, 'section-a', form)).toBe('section-b');
  });

  test('isQuestionAnswered supports objective and text question types', () => {
    expect(isQuestionAnswered({ type: 'multiple_choice' }, { choiceIndex: 0 })).toBe(true);
    expect(isQuestionAnswered({ type: 'multiple_choice' }, { choiceIndex: -1 })).toBe(false);
    expect(isQuestionAnswered({ type: 'checkbox' }, { choiceIndexes: [0, 2] })).toBe(true);
    expect(isQuestionAnswered({ type: 'checkbox' }, { choiceIndexes: [] })).toBe(false);
    expect(isQuestionAnswered({ type: 'short_answer' }, { text: 'Guido' })).toBe(true);
    expect(isQuestionAnswered({ type: 'paragraph' }, { text: '   ' })).toBe(false);
  });

  test('summarizeProgress separates answered, remaining, and required missing states', () => {
    const quiz = {
      sections: [
        {
          id: 'section-a',
          title: 'Warm Up',
          questions: [
            { id: 'q-1', text: 'Required one', required: true },
            { id: 'q-2', text: 'Optional one', required: false }
          ]
        },
        {
          id: 'section-b',
          title: 'Deep Dive',
          questions: [
            { id: 'q-3', text: 'Required two', required: true }
          ]
        }
      ]
    };

    const summary = summarizeProgress(quiz, [
      { questionId: 'q-1', sectionId: 'section-a', prompt: 'Required one', answered: true, missingRequired: false, missingOptional: false },
      { questionId: 'q-2', sectionId: 'section-a', prompt: 'Optional one', answered: false, missingRequired: false, missingOptional: true },
      { questionId: 'q-3', sectionId: 'section-b', prompt: 'Required two', answered: false, missingRequired: true, missingOptional: false }
    ]);

    expect(summary.answered).toBe(1);
    expect(summary.remaining).toBe(2);
    expect(summary.missingRequired).toBe(1);
    expect(summary.bySection[0].answered).toBe(1);
    expect(summary.bySection[0].questions[1].missingOptional).toBe(true);
    expect(summary.bySection[1].questions[0].missingRequired).toBe(true);
  });
});
