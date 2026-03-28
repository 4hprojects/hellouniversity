# AdSense Batch 02 Publish-Ready HTML

This folder contains the first two publish-ready `contentHtml` bodies from batch 02.

## Selected Articles

- `01-how-to-study-from-public-lessons-without-treating-them-like-passive-reading.html`
- `04-how-to-recover-after-falling-behind-on-lessons-and-class-activities.html`

These were chosen first because they are the strongest student-facing approval articles in the batch:

- they teach something practical without login,
- they map cleanly to the current `gen` category,
- they reinforce the public lessons and student-support story of the site.

## Publication Use

For each article:

1. Copy the `title`, `slug`, `category`, `description`, and `keywords` from the matching Markdown draft in `docs/content-drafts/adsense-batch-02/`.
2. Paste the HTML fragment from this folder into the blog editor `Body HTML` field.
3. Add a real `heroImage` path or URL before publishing.

## Import Command

If you want to standardize these articles directly into Mongo-backed blog posts instead of copy-pasting through the editor, use:

```powershell
npm run import:blogs:drafts -- docs/content-drafts/adsense-batch-02/publish-ready --status=draft
```

Useful variants:

```powershell
npm run import:blogs:drafts -- docs/content-drafts/adsense-batch-02/publish-ready --status=submitted
npm run import:blogs:drafts -- docs/content-drafts/adsense-batch-02/publish-ready --status=published --replace
```

## Validation Note

These HTML fragments were written to stay inside the current `sanitizeRichHtml` allowlist in `app/blogService.js`.

- allowed structure used here: `section`, `h2`, `p`, `ul`, `ol`, `li`, `strong`, and `a`
- no scripts, embeds, forms, inline styles, or unsupported attributes are used
