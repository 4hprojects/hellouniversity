require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const { getBlogsPageData } = require('../../app/blogService');
const { getLessonsCatalogPageData } = require('../../app/lessonsCatalog');
const { getBooksPageData } = require('../../app/bookMeta');
const { getEventsPageData } = require('../../app/eventsCatalog');

const BASE_URL = 'https://hellouniversity.online';
const STATIC_URLS = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/features', changefreq: 'monthly', priority: 0.8 },
  { loc: '/teacher-guide', changefreq: 'monthly', priority: 0.7 },
  { loc: '/student-guide', changefreq: 'monthly', priority: 0.7 },
  { loc: '/how-it-works', changefreq: 'monthly', priority: 0.7 },
  { loc: '/blogs/', changefreq: 'weekly', priority: 0.8 },
  { loc: '/lessons', changefreq: 'weekly', priority: 0.8 },
  { loc: '/books', changefreq: 'monthly', priority: 0.5 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.5 },
  { loc: '/about', changefreq: 'monthly', priority: 0.5 },
  { loc: '/help', changefreq: 'monthly', priority: 0.5 },
  { loc: '/privacy-policy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/cookie-policy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms-and-conditions', changefreq: 'yearly', priority: 0.3 }
];

function buildSitemap(urls) {
  const xmlUrls = urls.map((url) => `
      <url>
        <loc>${BASE_URL}${url.loc}</loc>
        <changefreq>${url.changefreq}</changefreq>
        <priority>${url.priority}</priority>
      </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlUrls}
</urlset>`;
}

async function getPublishedBlogEntriesFromMongo() {
  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  const dbName = String(process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'myDatabase').trim();

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to generate the blog sitemap from Mongo.');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const collection = client.db(dbName).collection('tblBlogs');
    const pageData = await getBlogsPageData(collection);
    return Array.isArray(pageData.blogEntries) ? pageData.blogEntries : [];
  } finally {
    await client.close();
  }
}

async function run() {
  const blogEntries = await getPublishedBlogEntriesFromMongo();
  const lessonEntries = getLessonsCatalogPageData().sections
    .flatMap((section) => section.tracks)
    .flatMap((track) => track.lessons);
  const bookEntries = getBooksPageData().bookSeries
    .flatMap((series) => series.entries)
    .map((entry) => ({
      href: entry.href || null
    }))
    .filter((entry) => typeof entry.href === 'string' && entry.href);
  const eventEntries = getEventsPageData().eventEntries;

  const dynamicUrls = blogEntries.map((entry) => ({
    loc: entry.href,
    changefreq: 'weekly',
    priority: 0.8
  }))
    .concat(lessonEntries.map((entry) => ({
      loc: entry.href,
      changefreq: 'monthly',
      priority: 0.7
    })))
    .concat(bookEntries.map((entry) => ({
      loc: entry.href,
      changefreq: 'monthly',
      priority: 0.6
    })))
    .concat(eventEntries.filter((entry) => entry.indexable).map((entry) => ({
      loc: entry.href,
      changefreq: 'yearly',
      priority: 0.4
    })));

  const dedupedUrls = Array.from(
    new Map(
      [...STATIC_URLS, ...dynamicUrls].map((entry) => [entry.loc, entry])
    ).values()
  );

  const sitemapContent = buildSitemap(dedupedUrls);
  const outputPath = path.join(__dirname, '..', 'sitemap.xml');
  fs.writeFileSync(outputPath, sitemapContent, { encoding: 'utf8' });

  console.log(`Sitemap written to: ${outputPath}`);
  console.log(`Total URLs: ${dedupedUrls.length}`);
}

run().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exit(1);
});
