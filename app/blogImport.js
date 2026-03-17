const fs = require('fs');

const { getBlogsPageData } = require('./blogCatalog');
const { extractBlogDetailContent } = require('./blogDetailContent');
const {
  parseDateValue,
  sanitizeRichHtml,
  toAbsoluteOgImage
} = require('./blogService');

function buildLegacyBlogDocuments() {
  const pageData = getBlogsPageData();
  const entries = Array.isArray(pageData.blogEntries) ? pageData.blogEntries : [];

  return entries.map((entry) => {
    const rawHtml = fs.readFileSync(entry.filePath, 'utf8');
    const detail = extractBlogDetailContent(rawHtml);
    const publishedAt = parseDateValue(entry.publishedOn || detail.publishedOn) || new Date();
    const updatedAt = parseDateValue(entry.updatedOn || detail.updatedOn) || publishedAt;
    const heroImage = detail.heroImage?.src || entry.image || '';
    const heroImageAlt = detail.heroImage?.alt || entry.title || 'Blog article illustration';

    return {
      category: entry.category,
      slug: entry.slug,
      title: entry.title,
      description: entry.description || '',
      heroImage,
      heroImageAlt,
      ogImage: toAbsoluteOgImage(heroImage),
      contentHtml: sanitizeRichHtml(detail.contentHtml || ''),
      authorUserId: null,
      authorName: detail.author || entry.author || 'HelloUniversity',
      sourceType: 'legacy',
      status: 'published',
      legacyFilePath: entry.filePath,
      keywords: detail.keywords || entry.keywords || '',
      legacyTitle: detail.legacyTitle || '',
      publishedAt,
      updatedAt,
      createdAt: publishedAt,
      publishedLabel: entry.publishedOn || detail.publishedOn || '',
      updatedLabel: entry.updatedOn || detail.updatedOn || ''
    };
  });
}

async function importLegacyBlogsToCollection(blogCollection, options = {}) {
  const { replaceExisting = false } = options;
  const docs = buildLegacyBlogDocuments();

  for (const doc of docs) {
    const existing = await blogCollection.findOne({
      category: doc.category,
      slug: doc.slug
    });

    if (existing && !replaceExisting) {
      continue;
    }

    if (existing) {
      await blogCollection.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...doc,
            authorUserId: existing.authorUserId || doc.authorUserId,
            createdAt: existing.createdAt || doc.createdAt
          }
        }
      );
      continue;
    }

    await blogCollection.insertOne(doc);
  }

  return {
    importedCount: docs.length
  };
}

module.exports = {
  buildLegacyBlogDocuments,
  importLegacyBlogsToCollection
};
