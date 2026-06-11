const fs = require('fs');
const path = require('path');

const { extractLessonDetailContent } = require('./lessonDetailContent');
const { sanitizeLessonHtml } = require('./blogService');
const { stripHtmlForWordCount, countWords } = require('../utils/htmlProcessing');

const LESSONS_ROOT = path.join(__dirname, '..', 'views', 'pages', 'lessons');

// Orphaned draft file, not linked from any track or route.
const EXCLUDED_FILES = new Set([path.join(LESSONS_ROOT, 'java', 'lesson2_.ejs')]);

function findLessonFiles() {
  const files = [];

  for (const track of fs.readdirSync(LESSONS_ROOT, { withFileTypes: true })) {
    if (!track.isDirectory()) continue;

    const trackDir = path.join(LESSONS_ROOT, track.name);
    for (const entry of fs.readdirSync(trackDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.ejs')) continue;

      const filePath = path.join(trackDir, entry.name);
      if (EXCLUDED_FILES.has(filePath)) continue;

      files.push({
        track: track.name,
        lesson: entry.name.slice(0, -'.ejs'.length),
        filePath
      });
    }
  }

  return files;
}

function buildLessonDocuments() {
  return findLessonFiles().map(({ track, lesson, filePath }) => {
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const detail = extractLessonDetailContent(rawHtml);
    const contentHtml = sanitizeLessonHtml(detail.contentHtml || '');

    return {
      track,
      lesson,
      legacyTitle: detail.legacyTitle || '',
      heroImage: detail.heroImage || null,
      contentHtml,
      wordCount: countWords(stripHtmlForWordCount(contentHtml)),
      updatedAt: new Date()
    };
  });
}

async function importLessonsToCollection(lessonsCollection, options = {}) {
  const { write = false } = options;
  const docs = buildLessonDocuments();

  for (const doc of docs) {
    console.log(
      `${write ? 'WRITE' : 'PLAN'}: ${doc.track}/${doc.lesson} - "${doc.legacyTitle}" (${doc.wordCount} words)`
    );

    if (write) {
      await lessonsCollection.updateOne(
        { track: doc.track, lesson: doc.lesson },
        { $set: doc },
        { upsert: true }
      );
    }
  }

  return {
    importedCount: docs.length
  };
}

module.exports = {
  buildLessonDocuments,
  importLessonsToCollection
};
