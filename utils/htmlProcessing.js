// Shared HTML processing helpers used by blogCatalog, blogDetailContent, and bookDetailContent.

function countMojibakeMarkers(value) {
  const matches = value.match(/[Ã¢ÃƒÃ°ï¿½]|Ã¢â‚¬|Ã¢â‚¬â„¢|Ã¢â‚¬Å"|Ã¢â‚¬Â|Ã¢â‚¬Ëœ|Ã¢â‚¬Â¦|Ã‚|Ã°Å¸/g);
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

module.exports = {
  countMojibakeMarkers,
  maybeFixMojibake,
  decodeHtmlEntities,
  stripTags,
  extractFirstMatch,
  extractMetaValue,
  extractHeroImageTag,
  extractImageAttribute
};
