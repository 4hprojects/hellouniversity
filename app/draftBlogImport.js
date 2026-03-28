const fs = require('fs');
const path = require('path');

const {
  formatDisplayDate,
  normalizeCategory,
  normalizeSlug,
  sanitizeRichHtml,
  validateDraftPayload,
  validateSubmissionPayload
} = require('./blogService');

const VALID_IMPORT_STATUSES = new Set(['draft', 'submitted', 'published']);
const ADSENSE_APPROVAL_COLLECTION = 'adsense-approval';
const ADSENSE_APPROVAL_ORDER = [
  'how-teachers-can-run-a-class-in-hellouniversity-without-scattered-tools',
  'a-practical-quiz-workflow-for-teachers-from-draft-to-student-review',
  'what-students-need-to-see-before-login-on-an-academic-platform',
  'how-to-study-from-public-lessons-without-treating-them-like-passive-reading',
  'where-beginners-should-start-in-hellouniversitys-public-lesson-library',
  'a-beginner-roadmap-from-it-fundamentals-to-python-and-data-structures',
  'how-to-recover-after-falling-behind-on-lessons-and-class-activities',
  'how-to-organize-learning-materials-and-announcements-for-a-cleaner-teaching-week',
  'a-student-guide-to-staying-on-top-of-lessons-activities-and-attendance',
  'how-teachers-can-use-digital-learning-tools-without-losing-classroom-clarity',
  'a-practical-coding-routine-using-python-java-nodejs-and-dsa-lessons',
  'how-to-use-7-habits-reading-and-public-lessons-to-build-a-better-study-week'
];
const ADSENSE_APPROVAL_RANKS = new Map(
  ADSENSE_APPROVAL_ORDER.map((slug, index) => [slug, index + 1])
);

function normalizeImportStatus(value) {
  const status = String(value || 'draft').trim().toLowerCase();
  return VALID_IMPORT_STATUSES.has(status) ? status : 'draft';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseFrontmatter(markdown) {
  const text = String(markdown || '').replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) {
    return {};
  }

  const endIndex = text.indexOf('\n---', 4);
  if (endIndex === -1) {
    return {};
  }

  const rawFrontmatter = text.slice(4, endIndex).split('\n');
  const data = {};

  for (const line of rawFrontmatter) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    const value = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim();
    data[key] = value;
  }

  return data;
}

function extractMarkdownSection(markdown, heading) {
  const text = String(markdown || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const startIndex = lines.findIndex((line) => line.trim() === heading);

  if (startIndex === -1) {
    return '';
  }

  const bodyLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line) && line.trim() !== heading) {
      break;
    }
    bodyLines.push(line);
  }

  return bodyLines.join('\n').trim();
}

function applyInlineMarkdown(text) {
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, href) => {
    return `<a href="${escapeHtml(href)}">${label}</a>`;
  });

  return html;
}

function flushParagraph(paragraphLines, blocks) {
  if (!paragraphLines.length) {
    return;
  }

  const content = applyInlineMarkdown(paragraphLines.join(' ').trim());
  if (content) {
    blocks.push(`<p>${content}</p>`);
  }
  paragraphLines.length = 0;
}

function flushList(listState, blocks) {
  if (!listState.type || !listState.items.length) {
    listState.type = '';
    listState.items = [];
    return;
  }

  const tagName = listState.type === 'ol' ? 'ol' : 'ul';
  const itemsHtml = listState.items.map((item) => `<li>${applyInlineMarkdown(item)}</li>`).join('');
  blocks.push(`<${tagName}>${itemsHtml}</${tagName}>`);
  listState.type = '';
  listState.items = [];
}

function markdownToHtml(markdown) {
  const text = String(markdown || '').replace(/\r\n/g, '\n').trim();
  if (!text) {
    return '';
  }

  const lines = text.split('\n');
  const blocks = [];
  const paragraphLines = [];
  const listState = { type: '', items: [] };

  const flushAll = () => {
    flushParagraph(paragraphLines, blocks);
    flushList(listState, blocks);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph(paragraphLines, blocks);
      flushList(listState, blocks);
      continue;
    }

    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      const level = Math.min(6, headingMatch[1].length);
      blocks.push(`<h${level}>${applyInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph(paragraphLines, blocks);
      if (listState.type && listState.type !== 'ol') {
        flushList(listState, blocks);
      }
      listState.type = 'ol';
      listState.items.push(orderedMatch[1].trim());
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph(paragraphLines, blocks);
      if (listState.type && listState.type !== 'ul') {
        flushList(listState, blocks);
      }
      listState.type = 'ul';
      listState.items.push(unorderedMatch[1].trim());
      continue;
    }

    if (listState.type) {
      flushList(listState, blocks);
    }

    paragraphLines.push(line);
  }

  flushAll();

  return blocks.join('\n');
}

function buildImportPayload(frontmatter, contentHtml) {
  return {
    title: frontmatter.title || '',
    slug: normalizeSlug(frontmatter.slug, frontmatter.title || ''),
    category: normalizeCategory(frontmatter.category),
    description: frontmatter.description || '',
    heroImage: '',
    contentHtml,
    keywords: frontmatter.keywords || ''
  };
}

function buildEditorialMetadata(slug, collectionName) {
  const editorialCollection = String(collectionName || '').trim().toLowerCase();

  if (!editorialCollection) {
    return { editorialCollection: '', editorialRank: null };
  }

  if (editorialCollection === ADSENSE_APPROVAL_COLLECTION) {
    const editorialRank = ADSENSE_APPROVAL_RANKS.get(slug);
    if (!editorialRank) {
      throw new Error(`Missing adsense approval editorial rank for slug "${slug}".`);
    }

    return { editorialCollection, editorialRank };
  }

  return { editorialCollection, editorialRank: null };
}

function buildPublishedAt(now, status, editorialRank) {
  if (status !== 'published') {
    return null;
  }

  const baseTime = now instanceof Date ? now.getTime() : Date.now();
  const offsetMinutes = editorialRank ? editorialRank - 1 : 0;
  return new Date(baseTime - (offsetMinutes * 60 * 1000));
}

function buildImportDocument(markdownPath, htmlPath = '', options = {}) {
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const frontmatter = parseFrontmatter(markdown);
  const articleBodyMarkdown = extractMarkdownSection(markdown, '## Article Body');
  const html = htmlPath ? fs.readFileSync(htmlPath, 'utf8') : markdownToHtml(articleBodyMarkdown);
  const contentHtml = sanitizeRichHtml(html);
  const payload = buildImportPayload(frontmatter, contentHtml);
  const status = normalizeImportStatus(options.status);
  const validation = status === 'draft'
    ? validateDraftPayload(payload)
    : validateSubmissionPayload(payload);

  if (validation.errors.length) {
    throw new Error(`${path.basename(markdownPath)}: ${validation.errors[0]}`);
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const { editorialCollection, editorialRank } = buildEditorialMetadata(
    validation.payload.slug,
    options.collection
  );
  const publishedAt = buildPublishedAt(now, status, editorialRank);
  const batchFolder = path.basename(path.dirname(markdownPath));
  const doc = {
    ...validation.payload,
    authorUserId: null,
    authorName: String(options.authorName || 'HelloUniversity').trim() || 'HelloUniversity',
    sourceType: 'repo_import',
    status,
    reviewNotes: '',
    createdAt: now,
    updatedAt: now,
    publishedAt,
    publishedLabel: publishedAt ? formatDisplayDate(publishedAt) : '',
    updatedLabel: '',
    sourceBatch: batchFolder,
    sourceMarkdownPath: path.relative(process.cwd(), markdownPath).replace(/\\/g, '/'),
    sourceHtmlPath: htmlPath ? path.relative(process.cwd(), htmlPath).replace(/\\/g, '/') : '',
    targetAudience: frontmatter.target_audience || '',
    heroImageBrief: frontmatter.hero_image_brief || '',
    publishPriority: frontmatter.publish_priority || '',
    editorialCollection,
    editorialRank
  };

  return {
    doc,
    frontmatter,
    markdownPath,
    htmlPath
  };
}

async function importDraftBlogDocuments(blogCollection, entries, options = {}) {
  const replaceExisting = Boolean(options.replaceExisting);
  const results = [];

  for (const entry of entries) {
    const { doc } = entry;
    const existing = await blogCollection.findOne({
      category: doc.category,
      slug: doc.slug
    });

    if (existing && !replaceExisting) {
      results.push({
        action: 'skipped',
        category: doc.category,
        slug: doc.slug,
        id: String(existing._id),
        reason: 'existing'
      });
      continue;
    }

    if (existing) {
      const nextDoc = {
        ...doc,
        createdAt: existing.createdAt || doc.createdAt,
        authorUserId: existing.authorUserId || doc.authorUserId,
        authorName: existing.authorName || doc.authorName
      };

      await blogCollection.updateOne(
        { _id: existing._id },
        { $set: nextDoc }
      );

      results.push({
        action: 'updated',
        category: doc.category,
        slug: doc.slug,
        id: String(existing._id)
      });
      continue;
    }

    const insertResult = await blogCollection.insertOne(doc);
    results.push({
      action: 'inserted',
      category: doc.category,
      slug: doc.slug,
      id: String(insertResult.insertedId)
    });
  }

  return {
    processedCount: entries.length,
    insertedCount: results.filter((item) => item.action === 'inserted').length,
    updatedCount: results.filter((item) => item.action === 'updated').length,
    skippedCount: results.filter((item) => item.action === 'skipped').length,
    results
  };
}

module.exports = {
  ADSENSE_APPROVAL_COLLECTION,
  buildImportDocument,
  extractMarkdownSection,
  importDraftBlogDocuments,
  markdownToHtml,
  normalizeImportStatus,
  parseFrontmatter
};
