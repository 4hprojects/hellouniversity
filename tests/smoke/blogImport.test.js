const { buildLegacyBlogDocuments, importLegacyBlogsToCollection } = require('../../app/blogImport');
const { createCollection } = require('../helpers/inMemoryMongo');

describe('blog import utility', () => {
  test('buildLegacyBlogDocuments returns normalized published blog records', () => {
    const docs = buildLegacyBlogDocuments();

    expect(Array.isArray(docs)).toBe(true);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0]).toEqual(expect.objectContaining({
      category: expect.any(String),
      slug: expect.any(String),
      title: expect.any(String),
      contentHtml: expect.any(String),
      status: 'published',
      sourceType: 'legacy'
    }));
  });

  test('importLegacyBlogsToCollection inserts docs without duplicating route keys on rerun', async () => {
    const collection = createCollection();
    const initial = await importLegacyBlogsToCollection(collection);
    const afterFirstImport = await collection.countDocuments();
    const rerun = await importLegacyBlogsToCollection(collection);
    const afterSecondImport = await collection.countDocuments();

    expect(initial.importedCount).toBeGreaterThan(0);
    expect(rerun.importedCount).toBe(initial.importedCount);
    expect(afterFirstImport).toBeGreaterThan(0);
    expect(afterSecondImport).toBe(afterFirstImport);
  });
});
