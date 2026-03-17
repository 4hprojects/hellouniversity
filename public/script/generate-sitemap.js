const fs = require('fs');
const path = require('path');
const { getBlogsPageData } = require('../../app/blogCatalog');

const BASE_URL = 'https://hellouniversity.online';

const STATIC_URLS = [
  { loc: '/login', changefreq: 'daily', priority: 0.8 },
  { loc: '/signup', changefreq: 'weekly', priority: 0.7 },
  { loc: '/blogs/', changefreq: 'weekly', priority: 0.9 },
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/search', changefreq: 'weekly', priority: 0.6 },
  { loc: '/events', changefreq: 'monthly', priority: 0.5 },
  { loc: '/events/2025bytefunrun', changefreq: 'yearly', priority: 0.4 },
  { loc: '/events/2025bytefunruninfo', changefreq: 'yearly', priority: 0.4 },
  { loc: '/events/bytefunrun2025results', changefreq: 'yearly', priority: 0.4 },
  { loc: '/events/itquizbee2025', changefreq: 'yearly', priority: 0.4 },
  { loc: '/events/itquizbee2025results', changefreq: 'yearly', priority: 0.4 },
  { loc: '/events/baguio-smart-city-challenge-bsu', changefreq: 'yearly', priority: 0.4 },
  { loc: '/submissions/it114finalproject2025', changefreq: 'yearly', priority: 0.3 },
  { loc: '/books', changefreq: 'monthly', priority: 0.5 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.5 },
  { loc: '/about', changefreq: 'monthly', priority: 0.5 },
  { loc: '/help', changefreq: 'monthly', priority: 0.5 },
  { loc: '/privacy-policy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/cookie-policy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms-and-conditions', changefreq: 'yearly', priority: 0.3 },
  { loc: '/reset-password', changefreq: 'weekly', priority: 0.6 }
];

function buildSitemap(urls) {
  const xmlUrls = urls.map((url) => {
    return `
      <url>
        <loc>${BASE_URL}${url.loc}</loc>
        <changefreq>${url.changefreq}</changefreq>
        <priority>${url.priority}</priority>
      </url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlUrls}
</urlset>`;
}

function run() {
  const blogEntries = getBlogsPageData().blogEntries;
  const dynamicUrls = blogEntries.map((entry) => ({
    loc: entry.href,
    changefreq: 'weekly',
    priority: 0.8
  }));

  const allUrls = [
    ...STATIC_URLS,
    ...dynamicUrls
  ];

  const sitemapContent = buildSitemap(allUrls);
  const outputPath = path.join(__dirname, '..', 'sitemap.xml');
  fs.writeFileSync(outputPath, sitemapContent, { encoding: 'utf8' });

  console.log(`Sitemap written to: ${outputPath}`);
  console.log(`Total URLs: ${allUrls.length}`);
}

run();
