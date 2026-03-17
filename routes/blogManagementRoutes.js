const express = require('express');
const {
  buildManagementPost,
  getActorDisplayName,
  normalizeCategory,
  toIdString,
  validateDraftPayload,
  validateSubmissionPayload
} = require('../app/blogService');

function createBlogManagementRoutes({
  getBlogCollection,
  getUsersCollection,
  ObjectId,
  isAuthenticated,
  isAdmin
}) {
  const router = express.Router();

  function getSessionUserId(req) {
    return String(req.session?.userId || '').trim();
  }

  function getCollectionOrFail(res) {
    const blogCollection = getBlogCollection();
    if (!blogCollection) {
      res.status(503).json({ success: false, message: 'Blog service is unavailable right now.' });
      return null;
    }
    return blogCollection;
  }

  async function findPostById(blogCollection, blogId) {
    if (!ObjectId.isValid(blogId)) {
      return null;
    }

    return blogCollection.findOne({ _id: new ObjectId(blogId) });
  }

  function canEditDraft(post, userId) {
    return Boolean(post)
      && String(post.authorUserId || '') === userId
      && ['draft', 'rejected'].includes(post.status || 'draft');
  }

  async function ensureUniqueRouteKey(blogCollection, currentId, category, slug) {
    const existing = await blogCollection.findOne({ category, slug });
    if (!existing) {
      return null;
    }

    if (currentId && toIdString(existing._id) === currentId) {
      return null;
    }

    return existing;
  }

  router.get('/blogs/mine', isAuthenticated, async (req, res) => {
    const blogCollection = getCollectionOrFail(res);
    if (!blogCollection) {
      return;
    }

    try {
      const rows = await blogCollection.find({
        authorUserId: getSessionUserId(req)
      }).toArray();

      const posts = rows
        .sort((left, right) => {
          const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
          const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
          return rightTime - leftTime;
        })
        .map(buildManagementPost);

      return res.json({ success: true, posts });
    } catch (error) {
      console.error('Error loading authored blog posts:', error);
      return res.status(500).json({ success: false, message: 'Unable to load your blog posts right now.' });
    }
  });

  router.get('/blogs/:blogId', isAuthenticated, async (req, res) => {
    const blogCollection = getCollectionOrFail(res);
    if (!blogCollection) {
      return;
    }

    try {
      const post = await findPostById(blogCollection, req.params.blogId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Blog post not found.' });
      }

      const currentUserId = getSessionUserId(req);
      const isOwner = String(post.authorUserId || '') === currentUserId;
      const isAdminUser = req.session?.role === 'admin';

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      return res.json({ success: true, post: buildManagementPost(post) });
    } catch (error) {
      console.error('Error loading blog post:', error);
      return res.status(500).json({ success: false, message: 'Unable to load this blog post right now.' });
    }
  });

  router.post('/blogs', isAuthenticated, async (req, res) => {
    const blogCollection = getCollectionOrFail(res);
    if (!blogCollection) {
      return;
    }

    try {
      const validation = validateDraftPayload(req.body || {});
      if (validation.errors.length) {
        return res.status(400).json({ success: false, message: validation.errors[0] });
      }

      const duplicate = await ensureUniqueRouteKey(
        blogCollection,
        '',
        validation.payload.category,
        validation.payload.slug
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'A blog post already uses that category and slug.'
        });
      }

      const usersCollection = getUsersCollection ? getUsersCollection() : null;
      const actorRecord = usersCollection && ObjectId.isValid(req.session?.userId)
        ? await usersCollection.findOne({ _id: new ObjectId(req.session.userId) })
        : null;
      const actorName = getActorDisplayName(req, actorRecord);
      const now = new Date();
      const doc = {
        ...validation.payload,
        authorUserId: getSessionUserId(req),
        authorName: actorName,
        sourceType: 'user',
        status: 'draft',
        reviewNotes: '',
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        publishedLabel: '',
        updatedLabel: ''
      };

      const result = await blogCollection.insertOne(doc);
      return res.status(201).json({
        success: true,
        message: 'Draft saved.',
        post: buildManagementPost({ ...doc, _id: result.insertedId })
      });
    } catch (error) {
      console.error('Error creating draft blog post:', error);
      return res.status(500).json({ success: false, message: 'Unable to save this draft right now.' });
    }
  });

  router.put('/blogs/:blogId', isAuthenticated, async (req, res) => {
    const blogCollection = getCollectionOrFail(res);
    if (!blogCollection) {
      return;
    }

    try {
      const post = await findPostById(blogCollection, req.params.blogId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Blog post not found.' });
      }

      const currentUserId = getSessionUserId(req);
      if (!canEditDraft(post, currentUserId)) {
        return res.status(403).json({
          success: false,
          message: 'Only your draft or rejected posts can be edited.'
        });
      }

      const validation = validateDraftPayload(req.body || {});
      if (validation.errors.length) {
        return res.status(400).json({ success: false, message: validation.errors[0] });
      }

      const duplicate = await ensureUniqueRouteKey(
        blogCollection,
        toIdString(post._id),
        validation.payload.category,
        validation.payload.slug
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'A blog post already uses that category and slug.'
        });
      }

      const updatedDoc = {
        ...validation.payload,
        updatedAt: new Date(),
        reviewNotes: post.status === 'rejected' ? post.reviewNotes || '' : ''
      };

      await blogCollection.updateOne(
        { _id: post._id },
        { $set: updatedDoc }
      );

      return res.json({
        success: true,
        message: 'Draft updated.',
        post: buildManagementPost({ ...post, ...updatedDoc })
      });
    } catch (error) {
      console.error('Error updating draft blog post:', error);
      return res.status(500).json({ success: false, message: 'Unable to update this draft right now.' });
    }
  });

  router.post('/blogs/:blogId/submit', isAuthenticated, async (req, res) => {
    const blogCollection = getCollectionOrFail(res);
    if (!blogCollection) {
      return;
    }

    try {
      const post = await findPostById(blogCollection, req.params.blogId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Blog post not found.' });
      }

      const currentUserId = getSessionUserId(req);
      if (!canEditDraft(post, currentUserId)) {
        return res.status(403).json({
          success: false,
          message: 'Only your draft or rejected posts can be submitted.'
        });
      }

      const validation = validateSubmissionPayload(post);
      if (validation.errors.length) {
        return res.status(400).json({ success: false, message: validation.errors[0] });
      }

      const updatedDoc = {
        status: 'submitted',
        updatedAt: new Date(),
        reviewNotes: ''
      };

      await blogCollection.updateOne({ _id: post._id }, { $set: updatedDoc });

      return res.json({
        success: true,
        message: 'Post submitted for review.',
        post: buildManagementPost({ ...post, ...updatedDoc })
      });
    } catch (error) {
      console.error('Error submitting blog post:', error);
      return res.status(500).json({ success: false, message: 'Unable to submit this post right now.' });
    }
  });

  router.get('/admin/blogs', isAuthenticated, isAdmin, async (req, res) => {
    const blogCollection = getCollectionOrFail(res);
    if (!blogCollection) {
      return;
    }

    try {
      const statusFilter = String(req.query.status || 'submitted').trim().toLowerCase();
      const query = statusFilter && statusFilter !== 'all'
        ? { status: statusFilter }
        : {};

      const posts = (await blogCollection.find(query).toArray())
        .sort((left, right) => {
          const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
          const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
          return rightTime - leftTime;
        })
        .map(buildManagementPost);

      return res.json({ success: true, posts });
    } catch (error) {
      console.error('Error loading admin blog review queue:', error);
      return res.status(500).json({ success: false, message: 'Unable to load blog submissions right now.' });
    }
  });

  router.post('/admin/blogs/:blogId/approve', isAuthenticated, isAdmin, async (req, res) => {
    const blogCollection = getCollectionOrFail(res);
    if (!blogCollection) {
      return;
    }

    try {
      const post = await findPostById(blogCollection, req.params.blogId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Blog post not found.' });
      }

      if (post.status !== 'submitted') {
        return res.status(409).json({ success: false, message: 'Only submitted posts can be approved.' });
      }

      const now = new Date();
      const updatedDoc = {
        status: 'published',
        publishedAt: now,
        updatedAt: now,
        reviewNotes: ''
      };

      await blogCollection.updateOne({ _id: post._id }, { $set: updatedDoc });

      return res.json({
        success: true,
        message: 'Blog post published.',
        post: buildManagementPost({ ...post, ...updatedDoc })
      });
    } catch (error) {
      console.error('Error approving blog post:', error);
      return res.status(500).json({ success: false, message: 'Unable to approve this blog post right now.' });
    }
  });

  router.post('/admin/blogs/:blogId/reject', isAuthenticated, isAdmin, async (req, res) => {
    const blogCollection = getCollectionOrFail(res);
    if (!blogCollection) {
      return;
    }

    try {
      const post = await findPostById(blogCollection, req.params.blogId);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Blog post not found.' });
      }

      if (post.status !== 'submitted') {
        return res.status(409).json({ success: false, message: 'Only submitted posts can be rejected.' });
      }

      const reviewNotes = String(req.body?.reviewNotes || '').trim();
      if (!reviewNotes) {
        return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
      }

      const updatedDoc = {
        status: 'rejected',
        updatedAt: new Date(),
        reviewNotes
      };

      await blogCollection.updateOne({ _id: post._id }, { $set: updatedDoc });

      return res.json({
        success: true,
        message: 'Blog post rejected.',
        post: buildManagementPost({ ...post, ...updatedDoc })
      });
    } catch (error) {
      console.error('Error rejecting blog post:', error);
      return res.status(500).json({ success: false, message: 'Unable to reject this blog post right now.' });
    }
  });

  return router;
}

module.exports = createBlogManagementRoutes;
