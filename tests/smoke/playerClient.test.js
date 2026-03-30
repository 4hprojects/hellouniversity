const playerClient = require('../../public/js/liveGames/playerClient.js');

describe('live ClassRush player login helpers', () => {
  const {
    buildLoginPromptCopy,
    buildPlayReturnToPath,
    shouldPromptLoginForJoinError
  } = playerClient.__testables;

  test('auth-required join errors trigger the login modal path', () => {
    expect(shouldPromptLoginForJoinError('This game requires you to be logged in.')).toBe(true);
    expect(shouldPromptLoginForJoinError('This session is only for logged-in students in the linked class.')).toBe(true);
    expect(shouldPromptLoginForJoinError('You are not enrolled in the linked class for this session.')).toBe(false);
  });

  test('play returnTo path preserves the current PIN when present', () => {
    expect(buildPlayReturnToPath('1234567')).toBe('/play?pin=1234567');
    expect(buildPlayReturnToPath('')).toBe('/play');
  });

  test('login prompt copy changes for linked-class sessions', () => {
    expect(buildLoginPromptCopy('This game requires you to be logged in.')).toEqual({
      title: 'Log in to join ClassRush',
      description: 'This ClassRush session requires a logged-in account. Sign in, then continue joining with the same PIN and nickname.'
    });

    expect(buildLoginPromptCopy('This session is only for logged-in students in the linked class.')).toEqual({
      title: 'Log in with your student account',
      description: 'This ClassRush session is linked to a class. Sign in with the enrolled student account and we will retry your join automatically.'
    });
  });
});
