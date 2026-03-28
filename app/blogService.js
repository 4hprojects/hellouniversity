const validator = require('validator');

const BLOG_CATEGORY_META = {
  tech: {
    id: 'tech',
    label: 'Classroom Technology',
    icon: 'memory',
    summary: 'Teaching technology, digital tools, computing explainers, and practical classroom workflows.'
  },
  gen: {
    id: 'gen',
    label: 'Student Growth',
    icon: 'trending_up',
    summary: 'Study habits, productivity, resilience, and academic growth reads for students and teachers.'
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    icon: 'savings',
    summary: 'Beginner-friendly finance and investing articles with a practical angle.'
  }
};

const BLOG_CATEGORY_ORDER = ['tech', 'gen', 'finance'];
const APPROVAL_FOCUSED_CATEGORY_ORDER = ['tech', 'gen'];
const BLOG_STATUS_META = {
  draft: { label: 'Draft', tone: 'soft' },
  submitted: { label: 'Submitted', tone: 'info' },
  published: { label: 'Published', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' }
};

const HTML_ALLOWED_TAGS = new Set([
  'a', 'article', 'aside', 'blockquote', 'br', 'code', 'div', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img', 'li', 'ol', 'p', 'pre', 'section', 'small',
  'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul'
]);

const HTML_ATTR_ALLOWLIST = {
  a: new Set(['href', 'title', 'target', 'rel', 'class']),
  img: new Set(['src', 'alt', 'title', 'class']),
  '*': new Set(['class'])
};

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDisplayDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeCategory(value) {
  const category = String(value || '').trim().toLowerCase();
  return BLOG_CATEGORY_META[category] ? category : '';
}

function isApprovalFocusedCategory(categoryId) {
  return APPROVAL_FOCUSED_CATEGORY_ORDER.includes(String(categoryId || '').trim().toLowerCase());
}

function normalizeSlug(value, fallbackTitle = '') {
  const source = String(value || fallbackTitle || '')
    .trim()
    .toLowerCase();

  return source
    .replace(/['"`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function normalizeImagePath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return '';
}

function sanitizeUri(tagName, attrName, rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) {
    return '';
  }

  const lowerValue = value.toLowerCase();

  if (attrName === 'href') {
    if (
      lowerValue.startsWith('javascript:') ||
      lowerValue.startsWith('data:text/html') ||
      lowerValue.startsWith('vbscript:')
    ) {
      return '';
    }

    if (
      lowerValue.startsWith('http://') ||
      lowerValue.startsWith('https://') ||
      lowerValue.startsWith('mailto:') ||
      lowerValue.startsWith('tel:') ||
      lowerValue.startsWith('/') ||
      lowerValue.startsWith('#')
    ) {
      return escapeHtml(value);
    }

    return '';
  }

  if (attrName === 'src') {
    if (
      lowerValue.startsWith('javascript:') ||
      lowerValue.startsWith('data:text/html') ||
      lowerValue.startsWith('vbscript:')
    ) {
      return '';
    }

    if (
      lowerValue.startsWith('http://') ||
      lowerValue.startsWith('https://') ||
      lowerValue.startsWith('/') ||
      lowerValue.startsWith('data:image/')
    ) {
      return escapeHtml(value);
    }

    return '';
  }

  if (attrName === 'target') {
    return value === '_blank' ? '_blank' : '';
  }

  if (attrName === 'rel') {
    return validator.whitelist(value, 'a-zA-Z\\s');
  }

  if (attrName === 'class') {
    return validator.whitelist(value, 'a-zA-Z0-9_:\\-\\s');
  }

  if (attrName === 'title' || attrName === 'alt') {
    return escapeHtml(value);
  }

  return '';
}

function sanitizeTagAttributes(tagName, rawAttrs) {
  const allowedAttrs = new Set([
    ...(HTML_ATTR_ALLOWLIST['*'] || []),
    ...(HTML_ATTR_ALLOWLIST[tagName] || [])
  ]);

  const attrs = [];
  const attrPattern = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match;
  let sawBlankTarget = false;
  let relValue = '';

  while ((match = attrPattern.exec(rawAttrs || '')) !== null) {
    const attrName = String(match[1] || '').toLowerCase();
    if (!allowedAttrs.has(attrName) || attrName.startsWith('on')) {
      continue;
    }

    const rawValue = match[2] ?? match[3] ?? match[4] ?? '';
    const sanitizedValue = sanitizeUri(tagName, attrName, rawValue);
    if (!sanitizedValue) {
      continue;
    }

    if (attrName === 'target' && sanitizedValue === '_blank') {
      sawBlankTarget = true;
    }

    if (attrName === 'rel') {
      relValue = sanitizedValue;
    }

    attrs.push(`${attrName}="${sanitizedValue}"`);
  }

  if (tagName === 'a' && sawBlankTarget) {
    const safeRel = relValue || 'noopener noreferrer';
    const hasRel = attrs.some((entry) => entry.startsWith('rel='));
    if (!hasRel) {
      attrs.push(`rel="${safeRel}"`);
    }
  }

  return attrs.length ? ` ${attrs.join(' ')}` : '';
}

function sanitizeRichHtml(html) {
  const rawHtml = String(html || '');
  if (!rawHtml.trim()) {
    return '';
  }

  const stripped = rawHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<(input|button|textarea|select|option)\b[^>]*>/gi, '');

  const sanitized = stripped.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (fullMatch, rawTagName, rawAttrs) => {
    const tagName = String(rawTagName || '').toLowerCase();
    const isClosing = fullMatch.startsWith('</');

    if (!HTML_ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    if (isClosing) {
      return `</${tagName}>`;
    }

    const attrs = sanitizeTagAttributes(tagName, rawAttrs);
    return `<${tagName}${attrs}>`;
  });

  return sanitized
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toAbsoluteOgImage(image) {
  if (!image) {
    return '';
  }

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  if (image.startsWith('/')) {
    return `https://hellouniversity.online${image}`;
  }

  return '';
}

function shuffleRows(rows) {
  const next = rows.slice();
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function formatStatus(status) {
  const meta = BLOG_STATUS_META[status] || BLOG_STATUS_META.draft;
  return {
    value: status || 'draft',
    label: meta.label,
    tone: meta.tone
  };
}

function buildSearchText(doc, categoryMeta) {
  return [
    categoryMeta.label,
    doc.title || '',
    doc.description || '',
    doc.authorName || '',
    doc.keywords || '',
    doc.publishedLabel || '',
    doc.updatedLabel || ''
  ].join(' ').toLowerCase();
}

function buildPublicBlogEntry(doc) {
  const category = BLOG_CATEGORY_META[doc.category] || BLOG_CATEGORY_META.tech;
  const publishedAt = parseDateValue(doc.publishedAt) || parseDateValue(doc.createdAt) || new Date();
  const updatedAt = parseDateValue(doc.updatedAt);

  return {
    id: toIdString(doc._id),
    slug: doc.slug,
    category: doc.category,
    categoryLabel: category.label,
    categoryIcon: category.icon,
    title: doc.title || 'Untitled Blog Post',
    description: doc.description || '',
    image: doc.heroImage || '',
    heroImage: doc.heroImage || '',
    ogImage: toAbsoluteOgImage(doc.heroImage || ''),
    author: doc.authorName || 'HelloUniversity',
    publishedOn: doc.publishedLabel || formatDisplayDate(publishedAt),
    updatedOn: doc.updatedLabel || (updatedAt ? formatDisplayDate(updatedAt) : ''),
    keywords: doc.keywords || '',
    href: `/blogs/${doc.category}/${doc.slug}`,
    searchText: buildSearchText(doc, category),
    sortDate: publishedAt.getTime(),
    summaryText: category.summary,
    contentHtml: doc.contentHtml || '',
    legacyTitle: doc.legacyTitle || '',
    heroImageAlt: doc.heroImageAlt || doc.title || 'Blog article illustration',
    status: formatStatus(doc.status || 'draft'),
    editorialCollection: doc.editorialCollection || '',
    editorialRank: Number.isFinite(Number(doc.editorialRank)) ? Number(doc.editorialRank) : null,
    publishPriority: doc.publishPriority || ''
  };
}

async function getPublishedBlogRows(blogCollection) {
  if (!blogCollection) {
    return [];
  }

  const rows = await blogCollection.find({ status: 'published' }).toArray();
  return rows.sort((left, right) => {
    const leftTime = parseDateValue(left.publishedAt || left.createdAt)?.getTime() || 0;
    const rightTime = parseDateValue(right.publishedAt || right.createdAt)?.getTime() || 0;
    return rightTime - leftTime;
  });
}

async function getBlogsPageData(blogCollection, archivedEventPostCount = 0) {
  const rows = await getPublishedBlogRows(blogCollection);
  const entries = rows
    .map(buildPublicBlogEntry)
    .filter((entry) => isApprovalFocusedCategory(entry.category));
  const curatedGuideEntries = rows
    .filter((row) => row.editorialCollection === 'adsense-approval' && isApprovalFocusedCategory(row.category))
    .sort((left, right) => {
      const leftRank = Number(left.editorialRank) || Number.MAX_SAFE_INTEGER;
      const rightRank = Number(right.editorialRank) || Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank;
    })
    .map(buildPublicBlogEntry);

  const featuredBlogEntries = entries.slice(0, 6);
  const blogCategories = APPROVAL_FOCUSED_CATEGORY_ORDER.map((categoryId) => {
    const meta = BLOG_CATEGORY_META[categoryId];
    const categoryEntries = entries.filter((entry) => entry.category === categoryId);

    return {
      ...meta,
      entryCount: categoryEntries.length,
      entries: categoryEntries.slice(0, 5)
    };
  });

  const techCount = entries.filter((entry) => entry.category === 'tech').length;
  const growthCount = entries.filter((entry) => entry.category === 'gen').length;

  return {
    blogEntries: entries,
    curatedGuideEntries,
    featuredBlogEntries,
    blogCategories,
    blogFilters: [
      { value: 'all', label: 'All Posts' },
      { value: 'tech', label: 'Classroom Technology' },
      { value: 'gen', label: 'Student Growth' }
    ],
    blogStats: {
      entryCount: entries.length,
      categoryCount: blogCategories.length,
      techCount,
      growthCount,
      archivedEventPostCount
    }
  };
}

async function getRandomPublishedBlogs(blogCollection, options = {}) {
  const {
    limit = 3,
    excludeId = '',
    excludeSlug = '',
    excludeCategory = ''
  } = options;

  const rows = await getPublishedBlogRows(blogCollection);
  const filtered = rows.filter((row) => {
    if (!isApprovalFocusedCategory(row.category)) {
      return false;
    }
    if (excludeId && toIdString(row._id) === String(excludeId)) {
      return false;
    }
    if (excludeSlug && row.slug === excludeSlug && (!excludeCategory || row.category === excludeCategory)) {
      return false;
    }
    return true;
  });

  return shuffleRows(filtered).slice(0, limit).map(buildPublicBlogEntry);
}

async function getBlogEntryByLegacySlug(blogCollection, slug) {
  if (!blogCollection) {
    return null;
  }

  const rows = await blogCollection.find({
    slug: String(slug || '').trim().toLowerCase(),
    status: 'published'
  }).toArray();

  if (rows.length !== 1) {
    return null;
  }

  return buildPublicBlogEntry(rows[0]);
}

async function getBlogDetailPageData(blogCollection, category, slug) {
  const rows = await getPublishedBlogRows(blogCollection);
  const entryRow = rows.find((row) => row.category === category && row.slug === slug);
  if (!entryRow) {
    return null;
  }

  const entry = buildPublicBlogEntry(entryRow);
  const categoryEntries = rows
    .filter((row) => row.category === category)
    .map(buildPublicBlogEntry);
  const currentIndex = categoryEntries.findIndex((item) => item.id === entry.id);
  const newerEntry = currentIndex > 0 ? categoryEntries[currentIndex - 1] : null;
  const olderEntry = currentIndex !== -1 && currentIndex < categoryEntries.length - 1
    ? categoryEntries[currentIndex + 1]
    : null;
  const relatedEntries = categoryEntries
    .filter((item) => item.id !== entry.id)
    .slice(0, 6);
  const randomEntries = shuffleRows(
    rows.filter((row) => toIdString(row._id) !== entry.id).map(buildPublicBlogEntry)
  ).slice(0, 3);

  return {
    entry,
    category: BLOG_CATEGORY_META[entry.category],
    categoryEntries,
    relatedEntries,
    newerEntry,
    olderEntry,
    randomEntries
  };
}

function getActorDisplayName(req, userRecord = null) {
  const firstName = String(req.session?.firstName || userRecord?.firstName || '').trim();
  const lastName = String(req.session?.lastName || userRecord?.lastName || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return String(userRecord?.firstName || 'HelloUniversity User').trim();
}

async function getActorUserRecord(usersCollection, userId) {
  if (!usersCollection || !userId) {
    return null;
  }

  try {
    return await usersCollection.findOne({ _id: userId });
  } catch (error) {
    return null;
  }
}

function validateDraftPayload(payload) {
  const title = String(payload.title || '').trim();
  const category = normalizeCategory(payload.category);
  const slug = normalizeSlug(payload.slug, title);
  const description = String(payload.description || '').trim();
  const heroImage = normalizeImagePath(payload.heroImage);
  const rawContentHtml = String(payload.contentHtml || '');
  const contentHtml = sanitizeRichHtml(rawContentHtml);

  const errors = [];
  if (!title) {
    errors.push('Title is required.');
  }
  if (!category) {
    errors.push('Choose a valid category.');
  }
  if (!slug) {
    errors.push('Slug is required.');
  }
  if (String(payload.heroImage || '').trim() && !heroImage) {
    errors.push('Hero image must be an absolute URL or a site-relative path.');
  }

  return {
    errors,
    payload: {
      title,
      category,
      slug,
      description,
      heroImage,
      contentHtml,
      keywords: String(payload.keywords || '').trim().slice(0, 320)
    }
  };
}

function validateSubmissionPayload(payload) {
  const result = validateDraftPayload(payload);
  if (!result.payload.description) {
    result.errors.push('Description is required before submission.');
  }
  if (!result.payload.contentHtml) {
    result.errors.push('Content is required before submission.');
  }
  return result;
}

function buildManagementPost(doc) {
  return {
    id: toIdString(doc._id),
    title: doc.title || 'Untitled draft',
    slug: doc.slug || '',
    category: doc.category || '',
    categoryLabel: BLOG_CATEGORY_META[doc.category]?.label || 'Unknown',
    description: doc.description || '',
    heroImage: doc.heroImage || '',
    contentHtml: doc.contentHtml || '',
    keywords: doc.keywords || '',
    authorName: doc.authorName || 'HelloUniversity User',
    authorUserId: toIdString(doc.authorUserId),
    sourceType: doc.sourceType || 'user',
    publicHref: doc.category && doc.slug ? `/blogs/${doc.category}/${doc.slug}` : '',
    status: formatStatus(doc.status || 'draft'),
    reviewNotes: doc.reviewNotes || '',
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    publishedAt: doc.publishedAt || null,
    createdLabel: formatDisplayDate(doc.createdAt),
    updatedLabel: formatDisplayDate(doc.updatedAt),
    publishedLabel: formatDisplayDate(doc.publishedAt)
  };
}

module.exports = {
  BLOG_CATEGORY_META,
  BLOG_CATEGORY_ORDER,
  BLOG_STATUS_META,
  buildManagementPost,
  buildPublicBlogEntry,
  formatDisplayDate,
  formatStatus,
  getActorDisplayName,
  getActorUserRecord,
  getBlogDetailPageData,
  getBlogEntryByLegacySlug,
  getBlogsPageData,
  getPublishedBlogRows,
  getRandomPublishedBlogs,
  isApprovalFocusedCategory,
  normalizeCategory,
  normalizeImagePath,
  normalizeSlug,
  parseDateValue,
  sanitizeRichHtml,
  toAbsoluteOgImage,
  toIdString,
  validateDraftPayload,
  validateSubmissionPayload
};
