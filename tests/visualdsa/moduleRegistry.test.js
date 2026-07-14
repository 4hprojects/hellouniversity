const {
  getDefaultSortingAlgorithm,
  getVisualDsaModuleBySlug,
  getVisualDsaModules
} = require('../../app/visualdsa/moduleRegistry');

describe('VisualDSA module registry', () => {
  test('registers the six versioned research modules with unique keys and primary routes', () => {
    const modules = getVisualDsaModules();

    expect(modules).toHaveLength(6);
    expect(new Set(modules.map((moduleDefinition) => moduleDefinition.key)).size).toBe(6);
    expect(new Set(modules.map((moduleDefinition) => moduleDefinition.primarySlug)).size).toBe(6);

    modules.forEach((moduleDefinition) => {
      expect(moduleDefinition.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(moduleDefinition.slugs).toContain(moduleDefinition.primarySlug);
      expect(moduleDefinition.relatedLessonSlugs.length).toBeGreaterThan(0);
      expect(moduleDefinition.supportedModes).toEqual(['guided', 'exploration', 'practice']);
      expect(getVisualDsaModuleBySlug(moduleDefinition.primarySlug)).toBe(moduleDefinition);
    });
  });

  test('maps existing sorting routes to one shared sorting module', () => {
    const sorting = getVisualDsaModuleBySlug('sorting-visualizer');

    expect(sorting.key).toBe('sorting');
    expect(getVisualDsaModuleBySlug('bubble-sort-visualizer')).toBe(sorting);
    expect(getVisualDsaModuleBySlug('selection-sort-visualizer')).toBe(sorting);
    expect(getVisualDsaModuleBySlug('insertion-sort-visualizer')).toBe(sorting);
  });

  test('derives the named strategy for every sorting route alias', () => {
    expect(getDefaultSortingAlgorithm('bubble-sort-visualizer')).toBe('bubble');
    expect(getDefaultSortingAlgorithm('selection-sort-visualizer')).toBe('selection');
    expect(getDefaultSortingAlgorithm('insertion-sort-visualizer')).toBe('insertion');
    expect(getDefaultSortingAlgorithm('sorting-visualizer')).toBe('bubble');
  });

  test('returns null for unfinished curriculum routes and unknown slugs', () => {
    expect(getVisualDsaModuleBySlug('linked-list-visualizer')).toBeNull();
    expect(getVisualDsaModuleBySlug('not-a-module')).toBeNull();
  });
});
