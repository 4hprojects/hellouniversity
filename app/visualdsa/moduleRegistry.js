const MODULES = [
  {
    key: 'arrays',
    version: '1.0.0',
    title: 'Array Operations',
    slugs: ['array-visualizer'],
    primarySlug: 'array-visualizer',
    relatedLessonSlugs: ['arrays'],
    supportedModes: ['guided', 'exploration', 'practice'],
    status: 'foundation',
    maximumInputSize: 12
  },
  {
    key: 'stacks',
    version: '1.0.0',
    title: 'Stack Operations',
    slugs: ['stack-visualizer'],
    primarySlug: 'stack-visualizer',
    relatedLessonSlugs: ['stacks'],
    supportedModes: ['guided', 'exploration', 'practice'],
    status: 'foundation',
    maximumInputSize: 10
  },
  {
    key: 'queues',
    version: '1.0.0',
    title: 'Queue Operations',
    slugs: ['queue-visualizer'],
    primarySlug: 'queue-visualizer',
    relatedLessonSlugs: ['queues'],
    supportedModes: ['guided', 'exploration', 'practice'],
    status: 'foundation',
    maximumInputSize: 10
  },
  {
    key: 'binary-search',
    version: '1.0.0',
    title: 'Binary Search',
    slugs: ['binary-search-visualizer'],
    primarySlug: 'binary-search-visualizer',
    relatedLessonSlugs: ['binary-search'],
    supportedModes: ['guided', 'exploration', 'practice'],
    status: 'planned',
    maximumInputSize: 15
  },
  {
    key: 'sorting',
    version: '1.0.0',
    title: 'Introductory Sorting',
    slugs: [
      'sorting-visualizer',
      'bubble-sort-visualizer',
      'selection-sort-visualizer',
      'insertion-sort-visualizer'
    ],
    primarySlug: 'sorting-visualizer',
    relatedLessonSlugs: ['bubble-sort', 'selection-sort', 'insertion-sort'],
    supportedModes: ['guided', 'exploration', 'practice'],
    status: 'planned',
    maximumInputSize: 12
  },
  {
    key: 'bst',
    version: '1.0.0',
    title: 'Binary Search Tree',
    slugs: ['binary-search-tree-visualizer'],
    primarySlug: 'binary-search-tree-visualizer',
    relatedLessonSlugs: ['binary-search-trees', 'tree-traversals'],
    supportedModes: ['guided', 'exploration', 'practice'],
    status: 'planned',
    maximumInputSize: 15
  }
].map((moduleDefinition) => Object.freeze({
  ...moduleDefinition,
  slugs: Object.freeze([...moduleDefinition.slugs]),
  relatedLessonSlugs: Object.freeze([...moduleDefinition.relatedLessonSlugs]),
  supportedModes: Object.freeze([...moduleDefinition.supportedModes])
}));

const MODULE_BY_SLUG = new Map();

for (const moduleDefinition of MODULES) {
  for (const slug of moduleDefinition.slugs) {
    if (MODULE_BY_SLUG.has(slug)) {
      throw new Error(`Duplicate VisualDSA module slug: ${slug}`);
    }
    MODULE_BY_SLUG.set(slug, moduleDefinition);
  }
}

function getVisualDsaModules() {
  return [...MODULES];
}

function getVisualDsaModuleBySlug(slug) {
  return MODULE_BY_SLUG.get(String(slug || '').trim().toLowerCase()) || null;
}

function getDefaultSortingAlgorithm(slug) {
  const value = String(slug || '').trim().toLowerCase();
  if (value.startsWith('selection-sort')) return 'selection';
  if (value.startsWith('insertion-sort')) return 'insertion';
  return 'bubble';
}

module.exports = {
  getDefaultSortingAlgorithm,
  getVisualDsaModuleBySlug,
  getVisualDsaModules
};
