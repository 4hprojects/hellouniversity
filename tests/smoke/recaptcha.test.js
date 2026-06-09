const { verifyRecaptchaToken } = require('../../utils/recaptcha');

function createFetchMock(payload) {
  return jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue(payload)
  });
}

describe('recaptcha verification helper', () => {
  test('accepts v3 token when action and score pass', async () => {
    const fetchImpl = createFetchMock({ success: true, action: 'signup', score: 0.9 });

    const result = await verifyRecaptchaToken({
      token: 'token',
      secret: 'secret',
      expectedAction: 'signup',
      minimumScore: 0.5,
      fetchImpl
    });

    expect(result.success).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('rejects wrong v3 action', async () => {
    const fetchImpl = createFetchMock({ success: true, action: 'login', score: 0.9 });

    const result = await verifyRecaptchaToken({
      token: 'token',
      secret: 'secret',
      expectedAction: 'signup',
      minimumScore: 0.5,
      fetchImpl
    });

    expect(result).toMatchObject({ success: false, reason: 'action-mismatch' });
  });

  test('rejects low v3 score', async () => {
    const fetchImpl = createFetchMock({ success: true, action: 'signup', score: 0.2 });

    const result = await verifyRecaptchaToken({
      token: 'token',
      secret: 'secret',
      expectedAction: 'signup',
      minimumScore: 0.5,
      fetchImpl
    });

    expect(result).toMatchObject({ success: false, reason: 'low-score' });
  });
});
