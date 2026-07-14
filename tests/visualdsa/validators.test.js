const { assertUuid, validateAction } = require('../../app/visualdsa/validators');
const id = '123e4567-e89b-12d3-a456-426614174000';
describe('VisualDSA API validators', () => {
  test('accepts a strict action payload', () => expect(validateAction({ clientEventId: id, stepNumber: 0, actionType: 'select', payload: { index: 1 }, clientTimestamp: '2026-07-11T00:00:00Z' })).toEqual(expect.objectContaining({ clientEventId: id })));
  test.each([{ clientEventId: id, stepNumber: -1, actionType: 'select', payload: {} }, { clientEventId: id, stepNumber: 0, actionType: 'hack', payload: {} }, { clientEventId: id, stepNumber: 0, actionType: 'select', payload: {}, score: 100 }])('rejects unsafe action %#', (value) => expect(() => validateAction(value)).toThrow());
  test('uses strict UUID validation', () => { expect(assertUuid(id, 'id')).toBe(id); expect(() => assertUuid('123', 'id')).toThrow(); });
});
