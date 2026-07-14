const { createPracticeService } = require('../../app/visualdsa/practiceService');
const identity = { userId: 'u1', studentId: 's1' };
const sessionId = '123e4567-e89b-12d3-a456-426614174000';

function setup(overrides = {}) {
  const repository = {
    createProblem: jest.fn(async () => ({ id: 'problem' })),
    createPractice: jest.fn(async () => ({ sessionId })),
    findPractice: jest.fn(async () => ({ id: sessionId, userId: 'u1', studentId: 's1', status: 'in_progress' })),
    findActionByClientEventId: jest.fn(async () => null),
    appendPracticeAction: jest.fn(async ({ validation }) => ({ result: validation })),
    completePractice: jest.fn(async () => ({ status: 'completed' })),
    ...overrides
  };
  const validateModuleAction = jest.fn(async () => ({ accepted: true, isCorrect: true, misconceptionCode: null }));
  return { repository, validateModuleAction, service: createPracticeService({ repository, validateModuleAction }) };
}

describe('VisualDSA practice service', () => {
  test('creates a server-owned problem and session', async () => {
    const { service, repository } = setup();
    expect(await service.startPractice({ identity, moduleDefinition: { key: 'arrays' }, request: {} })).toEqual({ sessionId });
    expect(repository.createPractice).toHaveBeenCalledWith(expect.objectContaining({ identity }));
  });
  test('requires authoritative enrollment for class-scoped practice', async () => {
    const {repository,validateModuleAction}=setup();const authorizeEnrollment=jest.fn(async()=>false);const service=createPracticeService({repository,validateModuleAction,authorizeEnrollment});
    await expect(service.startPractice({identity,moduleDefinition:{key:'arrays'},request:{classId:'507f1f77bcf86cd799439011'}})).rejects.toMatchObject({code:'PRACTICE_CLASS_ACCESS_DENIED'});expect(repository.createPractice).not.toHaveBeenCalled();
  });
  test('validates and appends an owned active action', async () => {
    const { service, repository, validateModuleAction } = setup();
    const result = await service.submitPracticeAction({ identity, sessionId, action: { clientEventId: 'event' } });
    expect(result).toEqual(expect.objectContaining({ accepted: true, isCorrect: true, duplicate: false }));
    expect(validateModuleAction).toHaveBeenCalled();
    expect(repository.appendPracticeAction).toHaveBeenCalled();
  });
  test('returns the existing result for an owned duplicate without revalidation', async () => {
    const { service, validateModuleAction } = setup({ findActionByClientEventId: jest.fn(async () => ({ studentId: 's1', practiceSessionId: sessionId, result: { accepted: true } })) });
    expect(await service.submitPracticeAction({ identity, sessionId, action: { clientEventId: 'event' } })).toEqual({ accepted: true, duplicate: true });
    expect(validateModuleAction).not.toHaveBeenCalled();
  });
  test('rejects cross-user, duplicate-resource, and completed-session access', async () => {
    await expect(setup({ findPractice: jest.fn(async () => ({ userId: 'other', studentId: 'other', status: 'in_progress' })) }).service.submitPracticeAction({ identity, sessionId, action: {} })).rejects.toMatchObject({ code: 'PRACTICE_SESSION_ACCESS_DENIED' });
    await expect(setup({ findPractice: jest.fn(async () => ({ userId: 'u1', studentId: 's1', status: 'completed' })) }).service.completePractice({ identity, sessionId })).rejects.toMatchObject({ code: 'PRACTICE_SESSION_NOT_ACTIVE' });
  });
  test('derives response numbers and safe retry feedback on the server', async () => {
    const { service, repository, validateModuleAction } = setup({
      listPracticeActions: jest.fn(async () => [{ isCorrect: false, hintLevel: 0 }])
    });
    validateModuleAction.mockResolvedValue({ accepted: true, isCorrect: false, misconceptionCode: 'AR02' });
    const result = await service.submitPracticeAction({ identity, sessionId, action: { clientEventId: 'event', stepNumber: 2 } });
    expect(result).toEqual(expect.objectContaining({ responseNumber: 2, canRetry: true, hintAvailable: true }));
    expect(result.misconception).toEqual(expect.objectContaining({ code: 'AR02', title: 'Shift direction' }));
    expect(repository.appendPracticeAction).toHaveBeenCalledWith(expect.objectContaining({ responseNumber: 2 }));
  });
  test('issues escalating hints only after an owned incorrect response', async () => {
    const recordPracticeHint=jest.fn();
    const { service }=setup({listPracticeActions:jest.fn(async()=>[{isCorrect:false,hintLevel:1}]),recordPracticeHint});
    await expect(service.requestHint({identity,sessionId,stepNumber:2})).resolves.toEqual(expect.objectContaining({hintLevel:2,responseNumber:1}));
    expect(recordPracticeHint).toHaveBeenCalledWith(expect.objectContaining({stepNumber:2,hintLevel:2}));
    const unavailable=setup({listPracticeActions:jest.fn(async()=>[])}).service;
    await expect(unavailable.requestHint({identity,sessionId,stepNumber:2})).rejects.toMatchObject({code:'HINT_NOT_AVAILABLE'});
  });
});
