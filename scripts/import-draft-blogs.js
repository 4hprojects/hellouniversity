require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const {
  ADSENSE_APPROVAL_COLLECTION,
  buildImportDocument,
  importDraftBlogDocuments,
  normalizeImportStatus
} = require('../app/draftBlogImport');

function addImportTarget(targetMap, markdownPath, htmlPath = '') {
  const key = path.resolve(markdownPath);
  const current = targetMap.get(key);

  if (!current || (!current.htmlPath && htmlPath)) {
    targetMap.set(key, {
      markdownPath: key,
      htmlPath: htmlPath ? path.resolve(htmlPath) : ''
    });
  }
}

function findHtmlOverridePath(markdownPath) {
  const candidate = path.join(
    path.dirname(markdownPath),
    'publish-ready',
    `${path.basename(markdownPath, '.md')}.html`
  );

  return fs.existsSync(candidate) ? candidate : '';
}

function collectMarkdownDrafts(rootDir, targetMap) {
  const stack = [rootDir];

  while (stack.length) {
    const currentDir = stack.pop();
    const dirents = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const dirent of dirents) {
      const nextPath = path.join(currentDir, dirent.name);

      if (dirent.isDirectory()) {
        if (dirent.name === 'publish-ready') {
          continue;
        }
        stack.push(nextPath);
        continue;
      }

      if (
        dirent.isFile()
        && nextPath.endsWith('.md')
        && path.basename(nextPath).toLowerCase() !== 'readme.md'
      ) {
        addImportTarget(targetMap, nextPath, findHtmlOverridePath(nextPath));
      }
    }
  }
}

function deriveMarkdownPath(htmlPath) {
  const parentDir = path.dirname(htmlPath);
  if (path.basename(parentDir) !== 'publish-ready') {
    throw new Error(`Expected HTML file inside a publish-ready folder: ${htmlPath}`);
  }

  const markdownPath = path.join(path.dirname(parentDir), `${path.basename(htmlPath, '.html')}.md`);
  if (!fs.existsSync(markdownPath)) {
    throw new Error(`Matching Markdown draft not found for ${path.basename(htmlPath)}.`);
  }

  return markdownPath;
}

function resolveImportTargets(inputPaths) {
  const targetMap = new Map();

  if (!inputPaths.length) {
    collectMarkdownDrafts(path.join(process.cwd(), 'docs', 'content-drafts'), targetMap);
    return Array.from(targetMap.values()).sort((left, right) => left.markdownPath.localeCompare(right.markdownPath));
  }

  for (const rawPath of inputPaths) {
    const resolvedPath = path.resolve(process.cwd(), rawPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Path not found: ${rawPath}`);
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      if (path.basename(resolvedPath) === 'publish-ready') {
        for (const name of fs.readdirSync(resolvedPath)) {
          const htmlPath = path.join(resolvedPath, name);
          if (
            fs.statSync(htmlPath).isFile()
            && htmlPath.endsWith('.html')
            && path.basename(htmlPath).toLowerCase() !== 'readme.html'
          ) {
            addImportTarget(targetMap, deriveMarkdownPath(htmlPath), htmlPath);
          }
        }
      } else {
        collectMarkdownDrafts(resolvedPath, targetMap);
      }
      continue;
    }

    if (stat.isFile() && resolvedPath.endsWith('.html')) {
      addImportTarget(targetMap, deriveMarkdownPath(resolvedPath), resolvedPath);
      continue;
    }

    if (stat.isFile() && resolvedPath.endsWith('.md')) {
      addImportTarget(targetMap, resolvedPath, findHtmlOverridePath(resolvedPath));
      continue;
    }

    throw new Error(`Unsupported input path: ${rawPath}`);
  }

  return Array.from(targetMap.values()).sort((left, right) => left.markdownPath.localeCompare(right.markdownPath));
}

function parseArgs(argv) {
  const options = {
    inputPaths: [],
    replaceExisting: false,
    dryRun: false,
    status: 'draft',
    authorName: 'HelloUniversity',
    collection: ''
  };

  for (const arg of argv) {
    if (arg === '--replace') {
      options.replaceExisting = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--status=')) {
      options.status = normalizeImportStatus(arg.split('=').slice(1).join('='));
      continue;
    }

    if (arg.startsWith('--author=')) {
      options.authorName = arg.split('=').slice(1).join('=').trim() || 'HelloUniversity';
      continue;
    }

    if (arg.startsWith('--collection=')) {
      options.collection = arg.split('=').slice(1).join('=').trim().toLowerCase();
      continue;
    }

    options.inputPaths.push(arg);
  }

  return options;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const targets = resolveImportTargets(options.inputPaths);

  if (!targets.length) {
    throw new Error('No draft blog files found.');
  }

  const entries = targets.map(({ markdownPath, htmlPath }) => {
    return buildImportDocument(markdownPath, htmlPath, {
      status: options.status,
      authorName: options.authorName,
      collection: options.collection
    });
  });

  if (options.dryRun) {
    console.log(`Dry run complete. Prepared ${entries.length} Mongo-backed blog document(s):`);
    for (const entry of entries) {
      const collectionMeta = entry.doc.editorialCollection
        ? ` collection=${entry.doc.editorialCollection}${entry.doc.editorialRank ? `#${entry.doc.editorialRank}` : ''}`
        : '';
      console.log(
        `- ${entry.doc.category}/${entry.doc.slug} [status=${entry.doc.status}]`
        + `${collectionMeta}${entry.htmlPath ? ' html-override=yes' : ' html-override=no'}`
      );
    }
    return;
  }

  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  const dbName = String(process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'myDatabase').trim();

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to import draft blogs.');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const collection = client.db(dbName).collection('tblBlogs');
    const result = await importDraftBlogDocuments(collection, entries, {
      replaceExisting: options.replaceExisting
    });

    console.log(
      `Draft blog import completed. Processed ${result.processedCount} entry(s): `
      + `${result.insertedCount} inserted, ${result.updatedCount} updated, ${result.skippedCount} skipped.`
    );

    for (const item of result.results) {
      console.log(`- ${item.action}: ${item.category}/${item.slug}`);
    }
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  const collectionHint = process.argv.some((arg) => arg.includes(ADSENSE_APPROVAL_COLLECTION))
    ? ` (${ADSENSE_APPROVAL_COLLECTION})`
    : '';
  console.error(`Draft blog import failed${collectionHint}:`, error);
  process.exit(1);
});
