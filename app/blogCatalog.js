const fs = require('fs');
const path = require('path');

const BLOG_SOURCE_ROOTS = [
  path.join(__dirname, '..', 'legacy', 'migrated-html', 'blogs'),
  path.join(__dirname, '..', 'public', 'blogs')
];

const BLOG_CATEGORY_META = {
  tech: {
    id: 'tech',
    label: 'Tech',
    icon: 'memory',
    summary: 'Technology explainers, comparisons, and practical computing articles.'
  },
  gen: {
    id: 'gen',
    label: 'Personal Growth',
    icon: 'trending_up',
    summary: 'Study habits, productivity, resilience, and professional growth reads.'
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    icon: 'savings',
    summary: 'Beginner-friendly finance and investing articles with a practical angle.'
  }
};

const BLOG_CATEGORY_ORDER = ['tech', 'gen', 'finance'];

function countMojibakeMarkers(value) {
  const matches = value.match(/[Ã¢ÃƒÃ°ï¿½]|Ã¢â‚¬|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬Â|Ã¢â‚¬Ëœ|Ã¢â‚¬Â¦|Ã‚|Ã°Å¸/g);
  return matches ? matches.length : 0;
}

function maybeFixMojibake(value) {
  if (typeof value !== 'string' || !value) {
    return '';
  }

  const converted = Buffer.from(value, 'latin1').toString('utf8');
  return countMojibakeMarkers(converted) < countMojibakeMarkers(value) ? converted : value;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&reg;/g, '®');
}

function stripTags(value) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractFirstMatch(html, regex) {
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

function parseDateValue(dateText) {
  const parsed = Date.parse(dateText);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toAbsoluteOgImage(image) {
  if (!image) {
    return '';
  }

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  return `https://hellouniversity.online${image}`;
}

function getCategoryDirectory(categoryId) {
  return BLOG_SOURCE_ROOTS
    .map((rootDir) => path.join(rootDir, categoryId))
    .find((candidateDir) => fs.existsSync(candidateDir));
}

function getBlogFilePath(categoryId, fileName) {
  return BLOG_SOURCE_ROOTS
    .map((rootDir) => path.join(rootDir, categoryId, fileName))
    .find((candidatePath) => fs.existsSync(candidatePath));
}

function buildBlogEntry(categoryId, fileName) {
  const filePath = getBlogFilePath(categoryId, fileName);
  if (!filePath) {
    return null;
  }

  const rawHtml = fs.readFileSync(filePath, 'utf8');
  const html = maybeFixMojibake(rawHtml);
  const category = BLOG_CATEGORY_META[categoryId];
  const slug = path.basename(fileName, '.html');

  const bodyTitle = stripTags(extractFirstMatch(html, /<(?:h1|h2)[^>]*>([\s\S]*?)<\/(?:h1|h2)>/i));
  const headTitle = stripTags(extractFirstMatch(html, /<title>([\s\S]*?)<\/title>/i));
  const description = stripTags(
    extractFirstMatch(html, /<meta\s+name="description"\s+content="([^"]*)"/i) ||
    extractFirstMatch(html, /<meta\s+property="og:description"\s+content="([^"]*)"/i)
  );
  const image =
    extractFirstMatch(html, /<meta\s+property="og:image"\s+content="([^"]*)"/i) ||
    extractFirstMatch(html, /<img[^>]+src="([^"]*)"/i);
  const author = stripTags(extractFirstMatch(html, /<meta\s+name="author"\s+content="([^"]*)"/i));
  const publishedOn = stripTags(extractFirstMatch(html, /Published on:\s*<span[^>]*>([\s\S]*?)<\/span>/i));
  const updatedOn = stripTags(extractFirstMatch(html, /Updated on:\s*<span[^>]*>([\s\S]*?)<\/span>/i));
  const keywords = stripTags(extractFirstMatch(html, /<meta\s+name="keywords"\s+content="([^"]*)"/i));

  const title = bodyTitle || headTitle || slug;
  const href = `/blogs/${categoryId}/${slug}`;
  const searchText = [
    category.label,
    title,
    description,
    author,
    publishedOn,
    updatedOn,
    keywords
  ].join(' ').toLowerCase();

  return {
    id: `${categoryId}-${slug}`.toLowerCase(),
    slug,
    category: categoryId,
    categoryLabel: category.label,
    categoryIcon: category.icon,
    title,
    description,
    image,
    ogImage: toAbsoluteOgImage(image),
    author: author || 'HelloUniversity',
    publishedOn,
    updatedOn,
    keywords,
    href,
    searchText,
    sortDate: parseDateValue(updatedOn || publishedOn),
    summaryText: category.summary,
    filePath
  };
}

function loadBlogEntries() {
  return BLOG_CATEGORY_ORDER.flatMap((categoryId) => {
    const categoryDir = getCategoryDirectory(categoryId);
    if (!categoryDir) {
      return [];
    }

    return fs.readdirSync(categoryDir)
      .filter((fileName) => fileName.toLowerCase().endsWith('.html'))
      .map((fileName) => buildBlogEntry(categoryId, fileName))
      .filter(Boolean);
  }).sort((a, b) => b.sortDate - a.sortDate);
}

function countArchivedEventPosts() {
  const eventsDir = getCategoryDirectory('events');
  if (!eventsDir) {
    return 0;
  }

  return fs.readdirSync(eventsDir).filter((fileName) => fileName.toLowerCase().endsWith('.html')).length;
}

const BLOG_ENTRIES = loadBlogEntries();
const BLOG_ENTRY_ALIAS_MAP = BLOG_ENTRIES.reduce((map, entry) => {
  map.set(entry.slug.toLowerCase(), entry);
  return map;
}, new Map());

const BLOG_ENTRY_BY_CATEGORY_AND_SLUG = BLOG_ENTRIES.reduce((map, entry) => {
  map.set(`${entry.category.toLowerCase()}/${entry.slug.toLowerCase()}`, entry);
  return map;
}, new Map());

const BLOG_ENTRIES_BY_CATEGORY = BLOG_CATEGORY_ORDER.reduce((map, categoryId) => {
  map.set(
    categoryId,
    BLOG_ENTRIES
      .filter((entry) => entry.category === categoryId)
      .sort((a, b) => b.sortDate - a.sortDate)
  );
  return map;
}, new Map());

const BLOG_CATEGORY_SECTIONS = BLOG_CATEGORY_ORDER.map((categoryId) => {
  const meta = BLOG_CATEGORY_META[categoryId];
  const entries = BLOG_ENTRIES_BY_CATEGORY.get(categoryId) || [];

  return {
    ...meta,
    entryCount: entries.length,
    entries: entries.slice(0, 5)
  };
});

const FEATURED_BLOG_ENTRIES = BLOG_ENTRIES.slice(0, 6);
const ARCHIVED_EVENT_POST_COUNT = countArchivedEventPosts();

function getBlogsPageData() {
  const techCount = (BLOG_ENTRIES_BY_CATEGORY.get('tech') || []).length;
  const growthCount = (BLOG_ENTRIES_BY_CATEGORY.get('gen') || []).length;
  const financeCount = (BLOG_ENTRIES_BY_CATEGORY.get('finance') || []).length;

  return {
    blogEntries: BLOG_ENTRIES.slice(),
    featuredBlogEntries: FEATURED_BLOG_ENTRIES.slice(),
    blogCategories: BLOG_CATEGORY_SECTIONS.slice(),
    blogFilters: [
      { value: 'all', label: 'All Posts' },
      { value: 'tech', label: 'Tech' },
      { value: 'gen', label: 'Personal Growth' },
      { value: 'finance', label: 'Finance' }
    ],
    blogStats: {
      entryCount: BLOG_ENTRIES.length,
      categoryCount: BLOG_CATEGORY_SECTIONS.length,
      techCount,
      growthCount,
      financeCount,
      archivedEventPostCount: ARCHIVED_EVENT_POST_COUNT
    }
  };
}

function getBlogEntryByLegacySlug(slug) {
  return BLOG_ENTRY_ALIAS_MAP.get(String(slug || '').toLowerCase()) || null;
}

function getBlogEntryByCategoryAndSlug(categoryId, slug) {
  return BLOG_ENTRY_BY_CATEGORY_AND_SLUG.get(
    `${String(categoryId || '').toLowerCase()}/${String(slug || '').toLowerCase()}`
  ) || null;
}

function getBlogDetailPageData(categoryId, slug) {
  const entry = getBlogEntryByCategoryAndSlug(categoryId, slug);
  if (!entry) {
    return null;
  }

  const categoryEntries = BLOG_ENTRIES_BY_CATEGORY.get(entry.category) || [];
  const currentIndex = categoryEntries.findIndex((item) => item.slug.toLowerCase() === entry.slug.toLowerCase());
  const newerEntry = currentIndex > 0 ? categoryEntries[currentIndex - 1] : null;
  const olderEntry = currentIndex !== -1 && currentIndex < categoryEntries.length - 1
    ? categoryEntries[currentIndex + 1]
    : null;
  const relatedEntries = categoryEntries
    .filter((item) => item.slug.toLowerCase() !== entry.slug.toLowerCase())
    .slice(0, 6);

  return {
    entry,
    category: BLOG_CATEGORY_META[entry.category],
    categoryEntries,
    relatedEntries,
    newerEntry,
    olderEntry
  };
}

module.exports = {
  getBlogsPageData,
  getBlogEntryByLegacySlug,
  getBlogEntryByCategoryAndSlug,
  getBlogDetailPageData
};
