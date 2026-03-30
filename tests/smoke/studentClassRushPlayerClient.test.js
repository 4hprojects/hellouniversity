const player = require('../../public/js/liveGames/selfPacedPlayer.js');

describe('self-paced ClassRush player helpers', () => {
  const {
    buildFinalPrimaryDisplay,
    buildReadyCtaLabel,
    formatScoringProfile,
    resolveQuestionAction,
    resolveScreenMode,
    shouldDisablePrimaryAction,
    shouldShowTimer
  } = player.__testables;

  test('buildReadyCtaLabel switches from start to resume when progress exists', () => {
    expect(buildReadyCtaLabel({
      answeredCount: 0,
      currentQuestionIndex: 0
    })).toBe('Start ClassRush');

    expect(buildReadyCtaLabel({
      answeredCount: 1,
      currentQuestionIndex: 1
    })).toBe('Resume ClassRush');
  });

  test('final display prioritizes rank when available and falls back to score', () => {
    expect(buildFinalPrimaryDisplay({
      showRank: true,
      rank: 2,
      score: 950
    })).toEqual({
      value: '#2',
      label: 'Final Rank'
    });

    expect(buildFinalPrimaryDisplay({
      showRank: false,
      score: 950
    })).toEqual({
      value: '950',
      label: 'Final Score'
    });
  });

  test('resolveQuestionAction enforces linear progression and final submit behavior', () => {
    expect(resolveQuestionAction('multiple_choice', false)).toEqual({
      autoAdvance: true,
      buttonLabel: ''
    });

    expect(resolveQuestionAction('multiple_choice', true)).toEqual({
      autoAdvance: false,
      buttonLabel: 'Submit ClassRush'
    });

    expect(resolveQuestionAction('type_answer', false)).toEqual({
      autoAdvance: false,
      buttonLabel: 'Next Question'
    });

    expect(resolveQuestionAction('type_answer', true)).toEqual({
      autoAdvance: false,
      buttonLabel: 'Submit ClassRush'
    });
  });

  test('resolveScreenMode favors final and blocked states before ready mode', () => {
    expect(resolveScreenMode({
      availabilityState: 'open',
      attemptStatus: 'submitted'
    })).toBe('final');

    expect(resolveScreenMode({
      availabilityState: 'scheduled',
      attemptStatus: 'in_progress'
    })).toBe('state');

    expect(resolveScreenMode({
      availabilityState: 'open',
      attemptStatus: 'in_progress'
    })).toBe('ready');
  });

  test('timer visibility and scoring labels match the supported profiles', () => {
    expect(shouldShowTimer('accuracy')).toBe(true);
    expect(shouldShowTimer('timed_accuracy')).toBe(true);
    expect(shouldShowTimer('live_scoring')).toBe(true);

    expect(formatScoringProfile('accuracy')).toBe('Accuracy');
    expect(formatScoringProfile('timed_accuracy')).toBe('Timed Accuracy');
    expect(formatScoringProfile('live_scoring')).toBe('Live Scoring');
  });

  test('final objective submit stays enabled after the last answer is saved', () => {
    expect(shouldDisablePrimaryAction({
      saving: false,
      questionType: 'multiple_choice',
      hasResponse: true
    })).toBe(false);

    expect(shouldDisablePrimaryAction({
      saving: true,
      questionType: 'multiple_choice',
      hasResponse: true
    })).toBe(true);

    expect(shouldDisablePrimaryAction({
      saving: false,
      questionType: 'multiple_choice',
      hasResponse: false
    })).toBe(true);
  });
});
