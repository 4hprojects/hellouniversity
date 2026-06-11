const { maybeFixMojibake, stripTags, extractFirstMatch, extractHeroImageTag, extractImageAttribute } = require('../utils/htmlProcessing');
const { rewriteAnchors, cleanupSpacing } = require('./blogDetailContent');

function extractLessonDetailContent(rawHtml) {
  const normalizedHtml = maybeFixMojibake(String(rawHtml || ''))
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/^<section\b[^>]*>/i, '')
    .replace(/<\/section>$/i, '');
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
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  // Some lesson files have intro content before <article id="content"> opens,
  // and/or multiple sibling/duplicated <article> wrappers. Strip the <article>
  // tags themselves wherever they appear so no surrounding content is dropped.
  bodyHtml = bodyHtml.replace(/<\/?article\b[^>]*>/gi, '');

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
  extractLessonDetailContent
};
