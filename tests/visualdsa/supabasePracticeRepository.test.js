const { databaseError, requireData, createSupabasePracticeRepository } = require('../../app/visualdsa/supabasePracticeRepository');

describe('Supabase VisualDSA repository', () => {
  test('normalizes database failures without exposing provider details', () => {
    expect(() => requireData('lookup', { error: new Error('secret detail') })).toThrow('VisualDSA database lookup failed.');
    expect(databaseError('write', new Error('provider'))).toMatchObject({ code: 'VISUALDSA_DATABASE_ERROR' });
  });
  test('requires a server-side Supabase client', () => expect(() => createSupabasePracticeRepository(null)).toThrow('Supabase client'));
  test('returns stored data from successful results', () => expect(requireData('lookup', { data: { id: 'one' }, error: null })).toEqual({ id: 'one' }));
});
