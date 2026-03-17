const { ObjectId } = require('mongodb');

function createPublishedBlogDoc(overrides = {}) {
  const now = overrides.publishedAt || new Date('2026-03-15T00:00:00.000Z');

  return {
    _id: overrides._id || new ObjectId(),
    slug: overrides.slug || 'sample-tech-post',
    category: overrides.category || 'tech',
    title: overrides.title || 'Sample Tech Post',
    description: overrides.description || 'A sample published post used in tests.',
    heroImage: overrides.heroImage || '/images/sample-tech-post.webp',
    contentHtml: overrides.contentHtml || '<p>Sample published blog body.</p>',
    authorUserId: overrides.authorUserId === undefined ? null : overrides.authorUserId,
    authorName: overrides.authorName || 'HelloUniversity',
    sourceType: overrides.sourceType || 'legacy',
    status: overrides.status || 'published',
    reviewNotes: overrides.reviewNotes || '',
    keywords: overrides.keywords || 'sample, tech',
    publishedAt: now,
    updatedAt: overrides.updatedAt || now,
    createdAt: overrides.createdAt || now,
    publishedLabel: overrides.publishedLabel || 'March 15, 2026',
    updatedLabel: overrides.updatedLabel || 'March 15, 2026',
    legacyTitle: overrides.legacyTitle || ''
  };
}

function createUserDraftDoc(overrides = {}) {
  const now = overrides.updatedAt || new Date('2026-03-16T00:00:00.000Z');

  return {
    _id: overrides._id || new ObjectId(),
    slug: overrides.slug || 'my-draft-post',
    category: overrides.category || 'gen',
    title: overrides.title || 'My Draft Post',
    description: overrides.description || 'Draft description.',
    heroImage: overrides.heroImage || '',
    contentHtml: overrides.contentHtml || '<p>Draft body.</p>',
    authorUserId: overrides.authorUserId || 'user-100',
    authorName: overrides.authorName || 'Test User',
    sourceType: overrides.sourceType || 'user',
    status: overrides.status || 'draft',
    reviewNotes: overrides.reviewNotes || '',
    keywords: overrides.keywords || 'draft',
    publishedAt: overrides.publishedAt || null,
    updatedAt: now,
    createdAt: overrides.createdAt || now,
    publishedLabel: overrides.publishedLabel || '',
    updatedLabel: overrides.updatedLabel || 'March 16, 2026',
    legacyTitle: overrides.legacyTitle || ''
  };
}

module.exports = {
  createPublishedBlogDoc,
  createUserDraftDoc
};
