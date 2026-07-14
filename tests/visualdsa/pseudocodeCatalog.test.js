require('../../public/js/visualdsa/core/pseudocodeCatalog');

describe('VisualDSA pseudocode catalog', () => {
  const catalog = global.VisualDsaPseudocode;
  test('is versioned and provides distinct sorting strategies', () => {
    expect(catalog.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(catalog.resolve('sorting', { algorithm: 'bubble', phase: 'compare' }).lines)
      .not.toEqual(catalog.resolve('sorting', { algorithm: 'selection', phase: 'scan' }).lines);
  });
  test.each([
    ['arrays', { phase: 'shift-right' }], ['stacks', { phase: 'select-top' }],
    ['queues', { phase: 'select-front' }], ['binary-search', { phase: 'compare' }],
    ['sorting', { algorithm: 'insertion', phase: 'shift' }], ['bst', { phase: 'visit' }]
  ])('maps %s instructional state to a visible line', (moduleKey, state) => {
    const result = catalog.resolve(moduleKey, state);
    expect(result.lines[result.activeLine]).toEqual(expect.any(String));
  });
  test('declares an unknown phase as intentionally unmapped', () => {
    expect(catalog.resolve('arrays', { phase: 'unknown' }).activeLine).toBeNull();
  });
});
