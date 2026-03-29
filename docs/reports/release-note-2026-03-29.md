# Release Note - 2026-03-29

## Summary

This release simplifies the public events archive so visitors can find old event pages and results with less navigation overhead.

## Included Changes

- `/events` now uses a lighter archive layout:
  - the sidebar, KPI strip, maintenance-style notes, and extra CTA panel were removed
  - the page keeps a shorter hero, compact featured collections, and one flat searchable/filterable catalog
  - event cards now focus on the core fields only: series, page type, date, venue, summary, and one CTA
- `/events/:slug` pages are more direct:
  - event detail pages now include a breadcrumb back path to `/events`
  - top action buttons are reduced to the most relevant contextual links
  - the spotlight-card band was removed to reduce repetition with the summary and facts panel
- The events data layer was aligned to the new UI:
  - the landing page now renders from a flattened catalog contract instead of section-grouped cards
  - event and detail CTA wording was normalized for consistency
- Product notes were updated:
  - `docs/reports/session-log.md`
  - `docs/webapp-improvement-checklist.md`

## Verification

Verified with:

```powershell
npm test -- tests/smoke/eventsPages.test.js --runInBand
```

Result: `/events`, one noindex event detail page, and one indexable event detail page all passed smoke coverage.

Additional check:

```powershell
npm test -- tests/smoke/eventsPages.test.js tests/smoke/homePage.test.js --runInBand
```

Result: the new `/events` coverage passed; `homePage.test.js` still failed on a pre-existing CTA-copy expectation unrelated to this release.

## Git

- Branch: `main`
- Remote: `origin` (`https://github.com/4hprojects/hellouniversity.git`)
- Session commit: `pending at authoring time`
