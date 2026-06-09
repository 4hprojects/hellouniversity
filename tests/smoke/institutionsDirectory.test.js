const {
  searchInstitutions,
  serializeInstitution
} = require('../../utils/institutionsDirectory');

describe('institutions directory search', () => {
  test('returns at most 10 serialized matches by default', () => {
    const results = searchInstitutions({ type: 'college', query: 'manila' });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
    expect(results.map(serializeInstitution)[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        type: 'college'
      })
    );
  });

  test('normalizes punctuation and spacing in school names', () => {
    const results = searchInstitutions({
      type: 'university',
      query: 'aklan state university banga'
    });

    expect(results[0]).toEqual(
      expect.objectContaining({
        name: expect.stringContaining('Aklan State University-Banga')
      })
    );
  });

  test('ranks school-name matches ahead of location-only matches', () => {
    const results = searchInstitutions({ type: 'college', query: 'manila' });

    expect(results[0].name.toLowerCase()).toContain('manila');
  });
});
