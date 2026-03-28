# AdSense Batch 02 Drafts

This folder contains the second reviewable batch of approval-oriented public article drafts for HelloUniversity.

## Purpose

These drafts are meant to:

- strengthen the student-facing and public-learning value of the site,
- show that HelloUniversity publishes useful study and lesson-path guidance before login,
- stay aligned with the current public blog lanes,
- remain easy to convert into the existing Mongo-backed blog workflow later.

## Frontmatter Mapping

Each draft includes frontmatter that maps to the current blog model:

- `title`
- `slug`
- `category`
- `description`
- `keywords`
- `target_audience`
- `hero_image_brief`
- `publish_priority`

## Category Rules

- `tech` is used for public lesson-path, programming-learning, and catalog-guidance articles.
- `gen` is used for student productivity, study-routine, recovery, and habit-building content.

## Conversion Note

When a draft is approved for publication:

1. Keep the same `title`, `slug`, `category`, `description`, and `keywords`.
2. Convert the Markdown body into sanitized `contentHtml`.
3. Preserve the screenshot intent and internal-link checklist during publication.
