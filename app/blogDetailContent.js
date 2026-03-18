const { getBlogEntryByLegacySlug } = require('./blogCatalog');
const { countMojibakeMarkers, maybeFixMojibake, decodeHtmlEntities, stripTags, extractFirstMatch, extractMetaValue, extractHeroImageTag, extractImageAttribute } = require('../utils/htmlProcessing');

const INTERNAL_PATH_REWRITES = new Map([
  ['/index', '/'],
  ['/blog', '/blogs/'],
  ['/blogs', '/blogs/'],
  ['/blogs/index', '/blogs/'],
  ['/blogs/index.html', '/blogs/'],
  ['/blogs/blog5', '/blogs/'],
  ['/blogs/blog7', '/blogs/'],
  ['/blogs/blog10', '/blogs/'],
  ['/blogs/tech-comparison/email-clients-comparison', '/blogs/tech/email-clients-comparison'],
  ['/blogs/tech-comparison/cloud-storage-showdown', '/blogs/'],
  ['/blogs/it114-lesson1-introduction-to-python-programming', '/lessons/it114/it114-lesson1-introduction-to-python'],
  ['/blogs/it114-lesson1-introduction-to-python', '/lessons/it114/it114-lesson1-introduction-to-python'],
  ['/blogs/it114-lesson4-conditional-statements', '/lessons/it114/it114-lesson4-conditional-statements'],
  ['/blogs/it114-lesson5-while-looping-statement', '/lessons/it114/it114-lesson5-while-looping-statement'],
  ['/blogs/it114-lesson8-randommodule', '/lessons/it114/it114-lesson8-randommodule'],
  ['/blogs/mst24lesson1-understanding-it', '/lessons/mst24/mst24-lesson1'],
  ['/blogs/mst24lesson1-understandingit', '/lessons/mst24/mst24-lesson1'],
  ['/mst24-lesson1-understanding-it', '/lessons/mst24/mst24-lesson1'],
  ['/blogs/mst24lesson6-cybersecurity', '/lessons/mst24/mst24-lesson6'],
  ['/blogs/mst24lesson7-socialmedia', '/lessons/mst24/mst24-lesson7'],
  ['/blogs/mst24lesson8-artificialintelligence', '/lessons/mst24/mst24-lesson8'],
  ['/blogs/mst24lesson12-thegigeconomy', '/lessons/mst24/mst24-lesson12'],
  ['/blogs/scp2-beginning-with-the-end-in-mind', '/books/7-habits/scp2-beginning-with-the-end-in-mind'],
  ['/blogs/scp3-put-first-things-first', '/books/7-habits/scp3-put-first-things-first'],
  ['/blogs/scp5-seek-first-to-understand', '/books/7-habits/scp5-seek-first-to-understand'],
  ['/blogs/ai/chatgpt-2025-practical-guide', '/blogs/tech/cgpt2025']
]);

function getInternalPath(href) {
  const trimmed = String(href || '').trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (!/^(?:www\.)?hellouniversity\.online$/i.test(parsed.hostname)) {
        return '';
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch (err) {
      return '';
    }
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  return '';
}

function normalizeInternalHref(href) {
  const internalPath = getInternalPath(href);
  if (!internalPath) {
    return href;
  }

  const parsed = new URL(internalPath, 'https://hellouniversity.online');
  let pathname = parsed.pathname.replace(/\.html$/i, '');
  const lowerPathname = pathname.toLowerCase();

  if (INTERNAL_PATH_REWRITES.has(lowerPathname)) {
    pathname = INTERNAL_PATH_REWRITES.get(lowerPathname);
  } else if (/^\/blogs\/events\/[^/]+$/i.test(pathname)) {
    pathname = `/events/${pathname.split('/').pop()}`;
  } else if (/^\/blogs\/[^/]+$/i.test(pathname)) {
    const aliasEntry = getBlogEntryByLegacySlug(pathname.split('/')[2]);
    if (aliasEntry) {
      pathname = aliasEntry.href;
    }
  }

  if (pathname === '/blogs') {
    pathname = '/blogs/';
  }

  return `${pathname}${parsed.search}${parsed.hash}`;
}

function isInternalHref(href) {
  return Boolean(getInternalPath(href));
}

function rewriteAnchors(html) {
  return html.replace(/<a\b([^>]*?)href="([^"]+)"([^>]*)>/gi, (match, before, href, after) => {
    const rewrittenHref = normalizeInternalHref(href);
    let attrsBefore = before || '';
    let attrsAfter = after || '';

    if (isInternalHref(rewrittenHref)) {
      attrsBefore = attrsBefore.replace(/\s+target="_blank"/gi, '').replace(/\s+rel="noopener noreferrer"/gi, '');
      attrsAfter = attrsAfter.replace(/\s+target="_blank"/gi, '').replace(/\s+rel="noopener noreferrer"/gi, '');
    }

    return `<a${attrsBefore}href="${rewrittenHref}"${attrsAfter}>`;
  });
}

function cleanupSpacing(html) {
  return html
    .replace(/^\s*(?:<br\s*\/?>\s*)+/i, '')
    .replace(/(?:<br\s*\/?>\s*)+\s*$/i, '')
    .replace(/(<\/(?:p|section|div|ul|ol|table|figure|blockquote)>)\s*(?:<br\s*\/?>\s*){2,}/gi, '$1\n')
    .replace(/(?:\s*<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .trim();
}

function extractBlogDetailContent(rawHtml) {
  const normalizedHtml = maybeFixMojibake(String(rawHtml || '')).replace(/\r\n/g, '\n');
  const headingTag = extractFirstMatch(normalizedHtml, /<h[12][^>]*>[\s\S]*?<\/h[12]>/i);
  const metaTag = extractFirstMatch(
    normalizedHtml,
    /<p[^>]*>\s*Published on:\s*<span[^>]*>[\s\S]*?<\/span>[\s\S]*?<\/p>/i
  );
  const heroImageTag = extractHeroImageTag(normalizedHtml);

  let bodyHtml = normalizedHtml;

  if (headingTag) {
    bodyHtml = bodyHtml.replace(headingTag, '');
  }

  if (metaTag) {
    bodyHtml = bodyHtml.replace(metaTag, '');
  }

  if (heroImageTag) {
    bodyHtml = bodyHtml.replace(heroImageTag, '');
  }

  bodyHtml = bodyHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ins\b[^>]*class="[^"]*adsbygoogle[^"]*"[^>]*>[\s\S]*?<\/ins>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\sdata-scroll-reveal="[^"]*"/gi, '');

  const articleMatch = bodyHtml.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    bodyHtml = articleMatch[1];
  }

  bodyHtml = bodyHtml
    .replace(/<div[^>]+id="share-buttons"[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]+id="blogNav"[\s\S]*?<\/div>/gi, '')
    .replace(/<h[1-6][^>]*>\s*We(?:&rsquo;|')d Like to Hear Your Feedback\s*<\/h[1-6]>\s*/gi, '')
    .replace(/<form[^>]+id="commentForm"[\s\S]*?<\/form>/gi, '')
    .replace(/<(?:div|p)[^>]+id="commentError"[\s\S]*?<\/(?:div|p)>/gi, '')
    .replace(/<h[1-6][^>]*>\s*Comments\s*<\/h[1-6]>\s*/gi, '')
    .replace(/<div[^>]+id="commentsContainer"[\s\S]*?<\/div>/gi, '')
    .replace(/<p[^>]+id="emptyCommentsMsg"[\s\S]*?<\/p>/gi, '');

  bodyHtml = rewriteAnchors(cleanupSpacing(bodyHtml));

  return {
    legacyTitle: stripTags(headingTag),
    publishedOn: extractMetaValue(metaTag, /Published on:\s*<span[^>]*>([\s\S]*?)<\/span>/i),
    updatedOn: extractMetaValue(metaTag, /Updated on:\s*<span[^>]*>([\s\S]*?)<\/span>/i),
    author: extractMetaValue(metaTag, /by\s*<span[^>]*>([\s\S]*?)<\/span>/i),
    keywords: extractMetaValue(normalizedHtml, /<meta\s+name="keywords"\s+content="([^"]*)"/i),
    heroImage: heroImageTag
      ? {
          src: extractImageAttribute(heroImageTag, 'src'),
          alt: extractImageAttribute(heroImageTag, 'alt')
        }
      : null,
    contentHtml: bodyHtml
  };
}

module.exports = {
  extractBlogDetailContent
};
