const { countMojibakeMarkers, maybeFixMojibake, decodeHtmlEntities, stripTags, extractFirstMatch, extractMetaValue, extractHeroImageTag, extractImageAttribute } = require('../utils/htmlProcessing');

const INTERNAL_LINK_REWRITES = new Map([
  ['/blogs/effective-study-techniques', '/blogs/gen/effective-study-techniques'],
  ['/blogs/effective-study-techniques.html', '/blogs/gen/effective-study-techniques'],
  ['/blogs/prompt-engineering', '/blogs/tech/promptengineering'],
  ['/blogs/promptengineering', '/blogs/tech/promptengineering'],
  ['/blogs/brain-rot', '/blogs/tech/brainrot'],
  ['/blogs/brainrot', '/blogs/tech/brainrot'],
  ['/blogs/it114-lesson1-introduction-to-python', '/lessons/it114/it114-lesson1-introduction-to-python'],
  ['/blogs/mst24-lesson1-understanding-it', '/lessons/mst24/mst24-lesson1'],
  ['/blogs/mst24lesson1-understandingit', '/lessons/mst24/mst24-lesson1'],
  ['/blogs/mst24lesson6-cybersecurity', '/lessons/mst24/mst24-lesson6'],
  ['/blogs/mst24lesson7-socialmedia', '/lessons/mst24/mst24-lesson7'],
  ['/blogs/mst24lesson8-artificialintelligence', '/lessons/mst24/mst24-lesson8'],
  ['/blogs/master-time-management', '/blogs/gen/master-time-management'],
  ['/blogs/master-time-management.html', '/blogs/gen/master-time-management'],
  ['/blogs/programmingmindset', '/blogs/gen/programmingmindset'],
  ['/blogs/year2038', '/blogs/tech/year2038']
]);

function normalizeInternalHref(href) {
  const trimmed = href.trim();
  const [pathname, hash = ''] = trimmed.split('#');
  const normalizedPath = pathname.replace(/\.html$/i, '');
  const rewrittenPath = INTERNAL_LINK_REWRITES.get(normalizedPath.toLowerCase()) || normalizedPath;
  return hash ? `${rewrittenPath}#${hash}` : rewrittenPath;
}

function isInternalHref(href) {
  return href.startsWith('/') && !href.startsWith('//');
}

function rewriteAnchors(html) {
  return html.replace(/<a\b([^>]*?)href="([^"]+)"([^>]*)>/gi, (match, before, href, after) => {
    const rewrittenHref = isInternalHref(href) ? normalizeInternalHref(href) : href;
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
    .replace(/(<\/(?:p|section|div|ul|ol|table|figure)>)\s*(?:<br\s*\/?>\s*){2,}/gi, '$1\n')
    .replace(/(?:\s*<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .trim();
}

function extractBookDetailContent(rawHtml) {
  const normalizedHtml = maybeFixMojibake(String(rawHtml || '')).replace(/\r\n/g, '\n');
  const headingTag = extractFirstMatch(normalizedHtml, /<h[12][^>]*>[\s\S]*?<\/h[12]>/i);
  const metaTag = extractFirstMatch(
    normalizedHtml,
    /<p[^>]*>\s*Published on:\s*<span[^>]*>[\s\S]*?<\/span>\s*by\s*<span[^>]*>[\s\S]*?<\/span>\s*<\/p>/i
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

  bodyHtml = rewriteAnchors(cleanupSpacing(bodyHtml));

  return {
    legacyTitle: stripTags(headingTag),
    publishedOn: extractMetaValue(metaTag, /Published on:\s*<span[^>]*>([\s\S]*?)<\/span>/i),
    author: extractMetaValue(metaTag, /by\s*<span[^>]*>([\s\S]*?)<\/span>/i),
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
  extractBookDetailContent
};
