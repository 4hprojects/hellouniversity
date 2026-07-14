const { getVisualDsaStudentIdentity, normalizeClassId } = require('../../app/visualdsa/identity');

describe('VisualDSA cross-database identity mapping', () => {
  test('derives student and user identifiers from the authenticated session', () => {
    expect(getVisualDsaStudentIdentity({ session: { userId: '507f1f77bcf86cd799439011', studentIDNumber: '2026-001', role: 'student' } }))
      .toEqual({ userId: '507f1f77bcf86cd799439011', studentId: '2026-001' });
  });
  test('rejects missing or non-student identity', () => {
    expect(() => getVisualDsaStudentIdentity({ session: { userId: 'x', role: 'teacher' } })).toThrow('student session');
    expect(() => getVisualDsaStudentIdentity({ session: { userId: 'x', role: 'student' } })).toThrow('studentIDNumber');
  });
  test('normalizes only valid MongoDB class ObjectId strings', () => {
    expect(normalizeClassId('507F1F77BCF86CD799439011')).toBe('507f1f77bcf86cd799439011');
    expect(() => normalizeClassId('class-1')).toThrow('ObjectId');
  });
});
