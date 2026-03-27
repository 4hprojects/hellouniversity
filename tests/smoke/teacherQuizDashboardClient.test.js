const dashboard = require('../../public/js/teacherQuizDashboard.js');

describe('teacher quiz dashboard share-link helpers', () => {
  const { buildResponderPath, getShareLinkActionMarkup } = dashboard.__testables;

  test('buildResponderPath returns the canonical responder route', () => {
    expect(buildResponderPath('507f1f77bcf86cd799439099')).toBe('/quizzes/507f1f77bcf86cd799439099/respond');
  });

  test('share link action renders only for published quizzes', () => {
    expect(getShareLinkActionMarkup({
      _id: 'quiz-123',
      status: 'published'
    })).toContain('Copy Link');

    expect(getShareLinkActionMarkup({
      _id: 'quiz-123',
      status: 'draft'
    })).toBe('');

    expect(getShareLinkActionMarkup({
      _id: 'quiz-123',
      status: 'closed'
    })).toBe('');
  });
});
