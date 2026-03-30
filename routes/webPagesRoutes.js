const express = require('express');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const { getLessonMeta } = require('../app/lessonMeta');
const { getHomePageContent } = require('../app/homePageContent');
const {
  getBlogDetailPageData,
  getBlogEntryByLegacySlug,
  getBlogsPageData,
  getRandomPublishedBlogs,
  isApprovalFocusedCategory
} = require('../app/blogService');
const { getBookMeta, getBookSeries, getBooksPageData } = require('../app/bookMeta');
const { extractBookDetailContent } = require('../app/bookDetailContent');
const { getLessonsCatalogPageData } = require('../app/lessonsCatalog');
const { buildFaqStructuredDataScript } = require('../app/faqContent');
const {
  getArchivedSubmissionPage,
  getEventPage,
  getEventsPageData,
  hasArchivedSubmissionPage,
  hasEventPage
} = require('../app/eventsCatalog');

function renderBodyInMainLayout(res, bodyTemplatePath, pageLocals) {
  return ejs.renderFile(bodyTemplatePath, pageLocals, (err, bodyHtml) => {
    if (err) {
      console.error('Error rendering body template:', err);
      return res.status(500).render('pages/errors/500');
    }
    return res.render('layouts/main', {
      ...pageLocals,
      body: bodyHtml
    });
  });
}

function renderTemplateFile(templatePath, pageLocals) {
  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, pageLocals, (err, html) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(html);
    });
  });
}

function slugToTitle(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function createWebPagesRoutes({
  projectRoot,
  getBlogCollection = () => null,
  isAuthenticated = (_req, _res, next) => next(),
  isAdmin = (_req, _res, next) => next()
}) {
  const router = express.Router();

  router.get('/footer-fragment', (req, res) => {
    return res.render('partials/footerContent');
  });

  router.get('/', async (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'home', 'index.ejs');

    try {
      const randomBlogs = await getRandomPublishedBlogs(getBlogCollection(), { limit: 3 });
      const homePageContent = getHomePageContent({
        role: req.session?.role,
        isAuthenticated: Boolean(req.session?.userId),
        brandName: 'HelloUniversity',
        recentBlogsOverride: randomBlogs
      });
      const pageLocals = {
        title: 'HelloUniversity - Digital Academic Platform',
        description: 'HelloUniversity is a digital academic platform with public learning resources, workflow guides, and role-aware tools for classes, assessments, communication, and learning management.',
        canonicalUrl: 'https://hellouniversity.online/',
        brandName: 'HelloUniversity',
        role: req.session?.role,
        user: req.session?.userId ? { role: req.session?.role } : undefined,
        showNav: true,
        showAds: true,
        adSlot: '6484558778',
        stylesheets: ['/css/homepage.css', '/css/study_picks_panel.css'],
        deferScriptUrls: ['/js/studyPicksPanel.js'],
        extraHead: buildFaqStructuredDataScript(homePageContent.faqItems),
        ...homePageContent
      };

      return renderBodyInMainLayout(res, bodyPath, pageLocals);
    } catch (error) {
      console.error('Error rendering home page with random blogs:', error);
      return res.status(500).render('pages/errors/500');
    }
  });

  router.get('/search.html', (req, res) => {
    const searchParams = new URLSearchParams(req.query || {});
    const destination = searchParams.toString()
      ? `/search?${searchParams.toString()}`
      : '/search';

    return res.redirect(301, destination);
  });

  router.get('/search', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'search.ejs');
    const initialQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const pageLocals = {
      title: initialQuery ? `Search "${initialQuery}" | HelloUniversity` : 'Search | HelloUniversity',
      description: 'Search lessons, blogs, events, and published HelloUniversity content from one page.',
      canonicalUrl: 'https://hellouniversity.online/search',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/search.css'],
      deferScriptUrls: ['/js/checkSession.js', '/js/searchPage.js'],
      extraHead: `
      <meta name="robots" content="noindex, follow">
      <script async src="https://cse.google.com/cse.js?cx=92f202aaff90f46bb"></script>
    `,
      initialQuery
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get(['/blog', '/blog/', '/blog.html', '/blogs/index', '/blogs/index.html'], (req, res) => {
    return res.redirect(301, '/blogs/');
  });

  router.get(['/blogs', '/blogs/'], async (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'blogs.ejs');
    try {
      const blogsPageData = await getBlogsPageData(
        getBlogCollection(),
        (getEventsPageData().eventEntries || []).length
      );
      const pageLocals = {
        title: 'Blogs | HelloUniversity',
        description: 'Browse HelloUniversity articles on classroom technology, student productivity, study habits, and digital learning workflows.',
        canonicalUrl: 'https://hellouniversity.online/blogs/',
        brandName: 'HelloUniversity',
        role: req.session?.role,
        user: req.session?.userId ? { role: req.session?.role } : undefined,
        showNav: true,
        showAds: false,
        stylesheets: ['/css/blogsPage.css', '/css/study_picks_panel.css'],
        deferScriptUrls: ['/js/checkSession.js', '/js/blogsPage.js', '/js/studyPicksPanel.js'],
        ...blogsPageData
      };

      return renderBodyInMainLayout(res, bodyPath, pageLocals);
    } catch (error) {
      console.error('Error rendering blogs landing page:', error);
      return res.status(500).render('pages/errors/500');
    }
  });

  router.get('/blogs/new', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'blog-author.ejs');
    const pageLocals = {
      title: 'Write a Blog | HelloUniversity',
      description: 'Create a new blog draft and submit it for admin review.',
      canonicalUrl: 'https://hellouniversity.online/blogs/new',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/blogWorkspace.css'],
      deferScriptUrls: ['/js/blogEditorPage.js'],
      editBlogId: typeof req.query.edit === 'string' ? req.query.edit.trim() : ''
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/blogs/my-posts', isAuthenticated, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'blog-my-posts.ejs');
    const pageLocals = {
      title: 'My Blog Posts | HelloUniversity',
      description: 'Review your blog drafts, submitted posts, and review decisions.',
      canonicalUrl: 'https://hellouniversity.online/blogs/my-posts',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/blogWorkspace.css'],
      deferScriptUrls: ['/js/blogMyPostsPage.js']
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/admin/blogs', isAuthenticated, isAdmin, (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'admin-blog-review.ejs');
    const pageLocals = {
      title: 'Admin Blog Review | HelloUniversity',
      description: 'Review submitted community blogs and decide which ones become public.',
      canonicalUrl: 'https://hellouniversity.online/admin/blogs',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/blogWorkspace.css'],
      deferScriptUrls: ['/js/adminBlogsPage.js']
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/blogs/:category/:slug.html', async (req, res, next) => {
    const category = req.params.category;
    const slug = req.params.slug.replace(/\.html$/i, '');

    if (!/^[a-zA-Z0-9\-_]+$/.test(category) || !/^[a-zA-Z0-9\-_]+$/.test(slug)) {
      return next();
    }

    if (category.toLowerCase() === 'events') {
      return res.redirect(301, `/events/${slug}`);
    }

    try {
      const blogDetailData = await getBlogDetailPageData(getBlogCollection(), category, slug);
      if (!blogDetailData) {
        return next();
      }

      return res.redirect(301, blogDetailData.entry.href);
    } catch (error) {
      console.error('Error resolving category blog redirect:', error);
      return res.status(500).render('pages/errors/500');
    }
  });

  router.get('/blogs/:category/:slug', async (req, res, next) => {
    const category = req.params.category;
    const slug = req.params.slug.replace(/\.html$/i, '');

    if (!/^[a-zA-Z0-9\-_]+$/.test(category) || !/^[a-zA-Z0-9\-_]+$/.test(slug)) {
      return next();
    }

    if (category.toLowerCase() === 'events') {
      return res.redirect(301, `/events/${slug}`);
    }

    try {
      const blogDetailData = await getBlogDetailPageData(getBlogCollection(), category, slug);
      if (!blogDetailData) {
        return next();
      }

      const pageDescription =
        blogDetailData.entry.description ||
        `Read ${slugToTitle(slug)} from the HelloUniversity ${blogDetailData.category.label} archive.`;
      const pageKeywords =
        blogDetailData.entry.keywords ||
        `${blogDetailData.entry.title}, ${blogDetailData.category.label}, HelloUniversity`;
      const canonicalUrl = `https://hellouniversity.online${blogDetailData.entry.href}`;
      const detailBodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'blogDetail.ejs');
      const detailTitle = blogDetailData.entry.title || slugToTitle(slug);
      const heroImage = blogDetailData.entry.heroImage
        ? {
            src: blogDetailData.entry.heroImage,
            alt: blogDetailData.entry.heroImageAlt || blogDetailData.entry.title
          }
        : null;

      const pageLocals = {
        title: detailTitle.includes('HelloUniversity') ? detailTitle : `${detailTitle} | HelloUniversity Blogs`,
        description: pageDescription,
        canonicalUrl,
        brandName: 'HelloUniversity',
        role: req.session?.role,
        user: req.session?.userId ? { role: req.session?.role } : undefined,
        showNav: true,
        showAds: false,
        stylesheets: ['/dist/output.css', '/css/blogDetail.css'],
        deferScriptUrls: ['/js/checkSession.js'],
        extraHead: `
      ${blogDetailData.entry.author ? `<meta name="author" content="${blogDetailData.entry.author}">` : ''}
      ${pageKeywords ? `<meta name="keywords" content="${pageKeywords}">` : ''}
      <meta name="robots" content="${isApprovalFocusedCategory(blogDetailData.entry.category) ? 'index, follow' : 'noindex, follow'}">
      <meta property="og:title" content="${detailTitle}">
      <meta property="og:description" content="${pageDescription}">
      <meta property="og:url" content="${canonicalUrl}">
      <meta property="og:type" content="article">
      <meta property="og:site_name" content="HelloUniversity">
      ${blogDetailData.entry.ogImage ? `<meta property="og:image" content="${blogDetailData.entry.ogImage}">` : ''}
    `,
        blogDetail: {
          slug: blogDetailData.entry.slug,
          title: detailTitle,
          description: pageDescription,
          author: blogDetailData.entry.author || '',
          publishedOn: blogDetailData.entry.publishedOn || '',
          updatedOn: blogDetailData.entry.updatedOn || '',
          legacyTitle: blogDetailData.entry.legacyTitle || '',
          heroImage,
          contentHtml: blogDetailData.entry.contentHtml,
          category: blogDetailData.category,
          relatedEntries: blogDetailData.relatedEntries,
          newerEntry: blogDetailData.newerEntry,
          olderEntry: blogDetailData.olderEntry,
          randomEntries: blogDetailData.randomEntries
        }
      };

      return renderBodyInMainLayout(res, detailBodyPath, pageLocals);
    } catch (err) {
      console.error('Error rendering Mongo-backed blog detail:', err);
      return res.status(500).render('pages/errors/500');
    }
  });

  router.get('/blogs/:legacySlug.html', async (req, res, next) => {
    try {
      const entry = await getBlogEntryByLegacySlug(getBlogCollection(), req.params.legacySlug);
      if (!entry) {
        return next();
      }

      return res.redirect(301, entry.href);
    } catch (error) {
      console.error('Error resolving legacy blog redirect:', error);
      return res.status(500).render('pages/errors/500');
    }
  });

  router.get('/blogs/:legacySlug', async (req, res, next) => {
    try {
      const entry = await getBlogEntryByLegacySlug(getBlogCollection(), req.params.legacySlug);
      if (!entry) {
        return next();
      }

      return res.redirect(301, entry.href);
    } catch (error) {
      console.error('Error resolving legacy blog redirect:', error);
      return res.status(500).render('pages/errors/500');
    }
  });

  router.get(['/events.html', '/events/index', '/events/index.html', '/events/events', '/events/events.html'], (req, res) => {
    return res.redirect(301, '/events');
  });

  router.get('/events', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'events.ejs');
    const eventsPageData = getEventsPageData();
    const pageLocals = {
      title: 'Events | HelloUniversity',
      description: 'Browse HelloUniversity event records, selected results, and preserved academic activity pages kept for reference.',
      canonicalUrl: 'https://hellouniversity.online/events',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/events.css'],
      deferScriptUrls: ['/js/checkSession.js', '/js/eventsPage.js'],
      extraHead: '<meta name="robots" content="noindex, follow">',
      ...eventsPageData
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/events/:slug.html', (req, res, next) => {
    const { slug } = req.params;

    if (slug === 'it114finalproject2025') {
      return res.redirect(301, '/submissions/it114finalproject2025');
    }

    if (!hasEventPage(slug)) {
      return next();
    }

    return res.redirect(301, `/events/${slug}`);
  });

  router.get('/events/:slug', (req, res, next) => {
    const { slug } = req.params;

    if (slug === 'it114finalproject2025') {
      return res.redirect(301, '/submissions/it114finalproject2025');
    }

    const detailPage = getEventPage(slug);
    if (!detailPage) {
      return next();
    }

    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'archiveDetail.ejs');
    const pageLocals = {
      title: `${detailPage.title} | HelloUniversity`,
      description: detailPage.description,
      canonicalUrl: `https://hellouniversity.online${detailPage.href}`,
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/archiveDetail.css'],
      deferScriptUrls: ['/js/checkSession.js'],
      extraHead: `<meta name="robots" content="${detailPage.indexable === false ? 'noindex, follow' : 'index, follow'}">`,
      detailPage
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/submissions/:slug.html', (req, res, next) => {
    const { slug } = req.params;

    if (!hasArchivedSubmissionPage(slug)) {
      return next();
    }

    return res.redirect(301, `/submissions/${slug}`);
  });

  router.get('/submissions/:slug', (req, res, next) => {
    const detailPage = getArchivedSubmissionPage(req.params.slug);
    if (!detailPage) {
      return next();
    }

    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'archiveDetail.ejs');
    const pageLocals = {
      title: `${detailPage.title} | HelloUniversity`,
      description: detailPage.description,
      canonicalUrl: `https://hellouniversity.online${detailPage.href}`,
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/archiveDetail.css'],
      deferScriptUrls: ['/js/checkSession.js'],
      extraHead: '<meta name="robots" content="noindex, follow">',
      detailPage
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/privacy-policy.html', (req, res) => {
    return res.redirect(301, '/privacy-policy');
  });

  router.get('/privacy-policy', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'privacy-policy.ejs');
    const pageLocals = {
      title: 'Privacy Policy | HelloUniversity',
      description: 'Read how HelloUniversity handles personal information across the main platform, public pages, and support workflows.',
      canonicalUrl: 'https://hellouniversity.online/privacy-policy',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/privacy.css'],
      deferScriptUrls: ['/js/checkSession.js']
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/cookie-policy.html', (req, res) => {
    return res.redirect(301, '/cookie-policy');
  });

  router.get('/cookie-policy', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'cookie-policy.ejs');
    const pageLocals = {
      title: 'Cookie Policy | HelloUniversity',
      description: 'Read how HelloUniversity uses session cookies, local storage, analytics, and similar browser-side technologies across the main platform.',
      canonicalUrl: 'https://hellouniversity.online/cookie-policy',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/cookie.css'],
      deferScriptUrls: ['/js/checkSession.js']
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/terms-and-conditions.html', (req, res) => {
    return res.redirect(301, '/terms-and-conditions');
  });

  router.get('/terms-and-conditions', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'terms-and-conditions.ejs');
    const pageLocals = {
      title: 'Terms and Conditions | HelloUniversity',
      description: 'Read the terms governing use of HelloUniversity, including account responsibilities, acceptable use, content rules, and service limitations.',
      canonicalUrl: 'https://hellouniversity.online/terms-and-conditions',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/terms.css'],
      deferScriptUrls: ['/js/checkSession.js']
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get(['/lessons', '/lessons/index'], (req, res) => {
    const lessonsBodyPath = path.join(projectRoot, 'views', 'pages', 'lessons', 'index.ejs');
    const lessonsCatalogPageData = getLessonsCatalogPageData();
    const pageLocals = {
      title: 'Lessons | HelloUniversity',
      description: 'Browse public HelloUniversity lesson tracks, choose a clear starting path, and move into foundations or programming study.',
      canonicalUrl: 'https://hellouniversity.online/lessons',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: true,
      adSlot: '1190959056',
      stylesheets: ['/css/lessons.css'],
      scriptUrls: ['/js/ads.js'],
      deferScriptUrls: ['/js/checkSession.js', '/js/lessonsPage.js'],
      ...lessonsCatalogPageData
    };

    return renderBodyInMainLayout(res, lessonsBodyPath, pageLocals);
  });

  router.get(['/books.html', '/books/index', '/books/index.html'], (req, res) => {
    return res.redirect(301, '/books');
  });

  router.get('/books', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'books.ejs');
    const booksPageData = getBooksPageData();
    const pageLocals = {
      title: 'Books | HelloUniversity',
      description: 'Browse companion reading tracks on personal effectiveness and leadership, including the 7 Habits and The Way of the Shepherd.',
      canonicalUrl: 'https://hellouniversity.online/books',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: true,
      adSlot: '1190959056',
      stylesheets: ['/css/books.css'],
      deferScriptUrls: ['/js/checkSession.js', '/js/booksPage.js'],
      ...booksPageData
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/books/:series.html', (req, res, next) => {
    const series = getBookSeries(req.params.series);

    if (!series) {
      return next();
    }

    return res.redirect(301, `/books#series-${series.id}`);
  });

  router.get('/books/:series', (req, res, next) => {
    const series = getBookSeries(req.params.series);

    if (!series) {
      return next();
    }

    return res.redirect(301, `/books#series-${series.id}`);
  });

  router.get('/books/:series/:entry.html', (req, res) => {
    const { series, entry } = req.params;

    if (!/^[a-zA-Z0-9\-_]+$/.test(series) || !/^[a-zA-Z0-9\-_]+$/.test(entry)) {
      return res.redirect(301, '/lessons');
    }

    return res.redirect(301, `/books/${series}/${entry}`);
  });

  router.get('/books/:series/:entry', async (req, res, next) => {
    const { series } = req.params;
    const entry = req.params.entry.replace(/\.html$/i, '');

    if (!/^[a-zA-Z0-9\-_]+$/.test(series) || !/^[a-zA-Z0-9\-_]+$/.test(entry)) {
      return next();
    }

    const bodyPath = path.join(projectRoot, 'views', 'pages', 'books', series, `${entry}.ejs`);
    if (!fs.existsSync(bodyPath)) {
      return next();
    }

    const bookMeta = getBookMeta(series, entry);
    const bookSeries = getBookSeries(series);
    if (!bookMeta || !bookSeries) {
      return next();
    }

    const currentEntryIndex = bookSeries.entries.findIndex((item) => item.slug === entry);
    if (currentEntryIndex === -1) {
      return next();
    }

    let legacyBookHtml;
    try {
      legacyBookHtml = await renderTemplateFile(bodyPath, {
        title: '',
        description: '',
        canonicalUrl: '',
        brandName: 'HelloUniversity'
      });
    } catch (err) {
      console.error('Error rendering legacy book template:', err);
      return res.status(500).render('pages/errors/500');
    }

    const bookContent = extractBookDetailContent(legacyBookHtml);
    const pageTitle = bookMeta?.title || `${slugToTitle(entry)} | HelloUniversity`;
    const pageDescription =
      bookMeta?.description ||
      `Read ${slugToTitle(entry)} from the ${slugToTitle(series)} reading track on HelloUniversity.`;
    const pageKeywords = bookMeta?.keywords || `${slugToTitle(entry)}, ${slugToTitle(series)}, HelloUniversity`;
    const canonicalUrl = `https://hellouniversity.online/books/${series}/${entry}`;
    const detailBodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'bookDetail.ejs');
    const previousEntry = currentEntryIndex > 0 ? bookSeries.entries[currentEntryIndex - 1] : null;
    const nextEntry = currentEntryIndex < bookSeries.entries.length - 1 ? bookSeries.entries[currentEntryIndex + 1] : null;
    const detailTitle = bookMeta.title || bookContent.legacyTitle || slugToTitle(entry);

    const pageLocals = {
      title: pageTitle.includes('HelloUniversity') ? pageTitle : `${pageTitle} | HelloUniversity`,
      description: pageDescription,
      canonicalUrl,
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/dist/output.css', '/css/bookDetail.css'],
      deferScriptUrls: ['/js/checkSession.js'],
      extraHead: `
      ${bookMeta?.author ? `<meta name="author" content="${bookMeta.author}">` : ''}
      ${pageKeywords ? `<meta name="keywords" content="${pageKeywords}">` : ''}
      <meta name="robots" content="index, follow">
      <meta property="og:title" content="${detailTitle}">
      <meta property="og:description" content="${pageDescription}">
      <meta property="og:url" content="${canonicalUrl}">
      <meta property="og:type" content="article">
      <meta property="og:site_name" content="HelloUniversity">
      ${bookContent.heroImage?.src ? `<meta property="og:image" content="https://hellouniversity.online${bookContent.heroImage.src}">` : ''}
    `,
      bookDetail: {
        slug: entry,
        title: detailTitle,
        description: pageDescription,
        author: bookContent.author || bookMeta.author || '',
        publishedOn: bookContent.publishedOn || '',
        legacyTitle: bookContent.legacyTitle || '',
        heroImage: bookContent.heroImage,
        contentHtml: bookContent.contentHtml,
        series: bookSeries,
        sequenceLabel: bookMeta.sequenceLabel || '',
        previousEntry,
        nextEntry
      }
    };

    return renderBodyInMainLayout(res, detailBodyPath, pageLocals);
  });

  router.get('/contact.html', (req, res) => {
    return res.redirect(301, '/contact');
  });

  router.get('/contact', (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'site', 'contact.ejs');
    const contactStatus = req.query.contactStatus === 'sent' || req.query.contactStatus === 'error'
      ? req.query.contactStatus
      : '';
    const contactStatusMessage = typeof req.query.message === 'string'
      ? req.query.message.trim().slice(0, 220)
      : '';
    const pageLocals = {
      title: 'Contact Us | HelloUniversity',
      description: 'Contact HelloUniversity for support, inquiries, and collaboration opportunities.',
      canonicalUrl: 'https://hellouniversity.online/contact',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: false,
      stylesheets: ['/css/contact.css'],
      deferScriptUrls: ['/js/checkSession.js', '/js/contactPage.js'],
      contactStatus,
      contactStatusMessage
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get(['/lessons/mst24/mst24-lesson1', '/lessons/mst24/mst24-lesson1.html'], (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'lessons', 'mst24', 'mst24-lesson1.ejs');
    const pageLocals = {
      title: 'Understanding Information Technology | HelloUniversity Lessons',
      description: 'Understand the fundamentals of Information Technology, including hardware, software, data, networking, and IT in modern organizations.',
      canonicalUrl: 'https://hellouniversity.online/lessons/mst24/mst24-lesson1',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: true,
      adSlot: '1190959056',
      bodyAttributes: 'class="lesson-detail-page" data-blog-id="mst24-lesson1"',
      stylesheets: ['/css/blogs.css', '/dist/output.css', '/css/lessonDetail.css'],
      scriptUrls: ['https://unpkg.com/scrollreveal', '/js/blogs.js', '/js/blogComments.js', '/js/shareButtons.js'],
      deferScriptUrls: ['/js/checkSession.js', '/js/scrollRevealInit.js'],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="keywords" content="Information Technology, IT fundamentals, IT components, hardware, software, data, networking, MST24 lesson 1, HelloUniversity lessons">
      <meta name="robots" content="index, follow">
      <meta property="og:title" content="Understanding Information Technology - MST24 Lesson 1 | HelloUniversity Lessons">
      <meta property="og:description" content="Learn the core foundations of Information Technology and how IT systems power real-world industries.">
      <meta property="og:image" content="https://hellouniversity.online/images/mst24lesson1-towfiqu-barbhuiya-oZuBNC-6E2s-unsplash.webp">
      <meta property="og:url" content="https://hellouniversity.online/lessons/mst24/mst24-lesson1">
      <meta property="og:type" content="article">
      <meta property="og:site_name" content="HelloUniversity">
    `
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get(['/lessons/it114/it114-lesson1-introduction-to-python', '/lessons/it114/it114-lesson1-introduction-to-python.html'], (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'lessons', 'it114', 'it114-lesson1-introduction-to-python.ejs');
    const pageLocals = {
      title: 'Lesson 1: Introduction to Python Programming | HelloUniversity Lessons',
      description: 'Start learning Python programming with this beginner-friendly lesson covering syntax, setup, and practical coding foundations.',
      canonicalUrl: 'https://hellouniversity.online/lessons/it114/it114-lesson1-introduction-to-python',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: true,
      adSlot: '1190959056',
      bodyAttributes: 'class="lesson-detail-page" data-blog-id="it114-lesson1-introduction-to-python"',
      stylesheets: ['/css/blogs.css', '/dist/output.css', '/css/lessonDetail.css'],
      scriptUrls: ['https://unpkg.com/scrollreveal', '/js/blogs.js', '/js/blogComments.js', '/js/shareButtons.js'],
      deferScriptUrls: ['/js/checkSession.js', '/js/scrollRevealInit.js'],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="keywords" content="Python programming, Python for beginners, introduction to Python, IT114 lesson 1, coding fundamentals, HelloUniversity lessons">
      <meta name="robots" content="index, follow">
      <meta property="og:title" content="Lesson 1: Introduction to Python Programming | HelloUniversity Lessons">
      <meta property="og:description" content="Learn Python fundamentals, why Python matters, and how to begin writing code as an IT student or aspiring developer.">
      <meta property="og:image" content="https://hellouniversity.online/images/it114lesson1-python-intro.webp">
      <meta property="og:url" content="https://hellouniversity.online/lessons/it114/it114-lesson1-introduction-to-python">
      <meta property="og:type" content="article">
      <meta property="og:site_name" content="HelloUniversity">
    `
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get(['/lessons/node/node-lesson1', '/lessons/node/node-lesson1.html'], (req, res) => {
    const bodyPath = path.join(projectRoot, 'views', 'pages', 'lessons', 'node', 'node-lesson1.ejs');
    const pageLocals = {
      title: 'Lesson 1: Introduction to Node.js and MVC Architecture | HelloUniversity Lessons',
      description: 'Learn Node.js and MVC Architecture in this beginner-friendly guide for IT students and aspiring full-stack developers.',
      canonicalUrl: 'https://hellouniversity.online/lessons/node/node-lesson1',
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: true,
      adSlot: '1190959056',
      bodyAttributes: 'class="lesson-detail-page" data-blog-id="node-lesson1"',
      stylesheets: ['/css/blogs.css', '/dist/output.css', '/css/lessonDetail.css'],
      scriptUrls: ['https://unpkg.com/scrollreveal', '/js/blogs.js', '/js/blogComments.js', '/js/shareButtons.js'],
      deferScriptUrls: ['/js/checkSession.js', '/js/scrollRevealInit.js'],
      extraHead: `
      <meta name="author" content="Henson M. Sagorsor">
      <meta name="keywords" content="Node.js, MVC architecture, introduction to Node.js, JavaScript backend, full-stack development, HelloUniversity lessons">
      <meta name="robots" content="index, follow">
      <meta property="og:title" content="Lesson 1: Introduction to Node.js and MVC Architecture | HelloUniversity Lessons">
      <meta property="og:description" content="Master the basics of Node.js and MVC Architecture. Learn why Node.js matters and how MVC structures web applications.">
      <meta property="og:image" content="https://hellouniversity.online/images/nodejs-mvc-guide.jpg">
      <meta property="og:url" content="https://hellouniversity.online/lessons/node/node-lesson1">
      <meta property="og:type" content="article">
      <meta property="og:site_name" content="HelloUniversity">
    `
    };
    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  router.get('/lessons/:track/:lesson', (req, res, next) => {
    const track = req.params.track;
    const lesson = req.params.lesson.replace(/\.html$/i, '');

    if (!/^[a-zA-Z0-9\-_]+$/.test(track) || !/^[a-zA-Z0-9\-_]+$/.test(lesson)) {
      return next();
    }

    const bodyPath = path.join(projectRoot, 'views', 'pages', 'lessons', track, `${lesson}.ejs`);
    if (!fs.existsSync(bodyPath)) {
      return next();
    }

    const lessonMeta = getLessonMeta(track, lesson);
    const pageTitle = lessonMeta?.title || `${slugToTitle(lesson)} | HelloUniversity Lessons`;
    const pageDescription =
      lessonMeta?.description ||
      `Lesson content for ${slugToTitle(lesson)} in the ${track.toUpperCase()} track.`;
    const pageKeywords =
      lessonMeta?.keywords ||
      `${track.toUpperCase()} lesson, ${slugToTitle(lesson)}, HelloUniversity lessons`;
    const canonicalUrl = lessonMeta?.canonicalUrl || `https://hellouniversity.online/lessons/${track}/${lesson}`;

    const pageLocals = {
      title: pageTitle.includes('HelloUniversity') ? pageTitle : `${pageTitle} | HelloUniversity Lessons`,
      description: pageDescription,
      canonicalUrl,
      brandName: 'HelloUniversity',
      role: req.session?.role,
      user: req.session?.userId ? { role: req.session?.role } : undefined,
      showNav: true,
      showAds: true,
      adSlot: '1190959056',
      bodyAttributes: `class="lesson-detail-page" data-blog-id="${lesson}"`,
      stylesheets: ['/css/blogs.css', '/dist/output.css', '/css/lessonDetail.css'],
      scriptUrls: ['https://unpkg.com/scrollreveal', '/js/blogs.js', '/js/blogComments.js', '/js/shareButtons.js'],
      deferScriptUrls: ['/js/checkSession.js', '/js/scrollRevealInit.js'],
      extraHead: `
      <meta name="robots" content="index, follow">
      ${pageKeywords ? `<meta name="keywords" content="${pageKeywords}">` : ''}
      <meta property="og:title" content="${pageTitle}">
      <meta property="og:description" content="${pageDescription}">
      ${lessonMeta?.ogImage ? `<meta property="og:image" content="${lessonMeta.ogImage}">` : ''}
      <meta property="og:url" content="${canonicalUrl}">
      <meta property="og:type" content="article">
      <meta property="og:site_name" content="HelloUniversity">
    `
    };

    return renderBodyInMainLayout(res, bodyPath, pageLocals);
  });

  return router;
}

module.exports = createWebPagesRoutes;
