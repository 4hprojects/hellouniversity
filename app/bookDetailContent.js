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

function countMojibakeMarkers(value) {
  const matches = value.match(/[âÃð�]|â€|â€™|â€œ|â€|â€˜|â€¦|Â|ðŸ/g);
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

function extractFirstMatch(html, pattern) {
  const match = html.match(pattern);
  return match ? match[0] : '';
}

function extractMetaValue(html, pattern) {
  const match = html.match(pattern);
  return match ? stripTags(match[1]) : '';
}

function extractHeroImageTag(html) {
  return extractFirstMatch(html, /<img\b[^>]*>/i);
}

function extractImageAttribute(tag, attribute) {
  const pattern = new RegExp(`\\s${attribute}="([^"]*)"`, 'i');
  const match = tag.match(pattern);
  return match ? decodeHtmlEntities(match[1].trim()) : '';
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
