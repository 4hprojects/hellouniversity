const express = require('express');
const rateLimit = require('express-rate-limit');
const Filter = require('bad-words');
const validator = require('validator');

module.exports = function blogsCommentsRoutes({ usersCollection, commentsCollection, blogCollection, ObjectId }) {
  const router = express.Router();
  const filter = new Filter();

  // Rate limiter for comment posting
  const commentLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5,
    message: { success: false, message: 'Too many comments submitted. Please try again later.' }
  });

  // POST /api/comments/:blogId (supports slashes)
  router.post('/comments/:blogId(*)', commentLimiter, async (req, res) => {
    const { blogId } = req.params;
    const { comment, isAnonymous } = req.body;
    const userId = req.session ? req.session.userId : null;
    const studentIDNumber = req.session ? req.session.studentIDNumber : null;

    console.log('POST /api/comments for blogId:', blogId);
    console.log('comment:', comment);
    console.log('isAnonymous:', isAnonymous);
    console.log('userId:', userId, 'type:', typeof userId);
    console.log('studentIDNumber:', studentIDNumber);

    try {
      if (!comment || comment.trim() === '') {
        return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
      }

      const isAnonymousBool = isAnonymous === true || isAnonymous === 'true';
      const sanitizedComment = filter.clean(comment);
      let username = 'Anonymous';

      if (userId && !isAnonymousBool && ObjectId.isValid(userId)) {
        const user = await usersCollection.findOne(
          { _id: new ObjectId(userId) },
          { projection: { firstName: 1 } }
        );
        username = user ? user.firstName : 'Unknown User';
      } else if (userId && !isAnonymousBool) {
        console.error('Invalid userId:', userId);
        return res.status(400).json({ success: false, message: 'Invalid user ID.' });
      }

      const newComment = {
        blogId,
        userId: isAnonymousBool ? null : userId,
        studentIDNumber: isAnonymousBool ? null : studentIDNumber,
        username: validator.escape(username),
        comment: validator.escape(sanitizedComment),
        isAnonymous: isAnonymousBool,
        createdAt: new Date()
      };

      const result = await commentsCollection.insertOne(newComment);

      if (result.acknowledged) {
        return res.json({ success: true, message: 'Comment posted successfully.' });
      }
      return res.status(500).json({ success: false, message: 'Failed to post comment.' });
    } catch (error) {
      console.error('Error posting comment:', error);
      res.status(500).json({ success: false, message: 'An error occurred while posting your comment.' });
    }
  });

  // GET /api/comments/:blogId (supports slashes)
  router.get('/comments/:blogId(*)', async (req, res) => {
    const { blogId } = req.params;
    try {
      console.log('GET /api/comments for blogId:', blogId);
      const comments = await commentsCollection.find({ blogId }).sort({ createdAt: -1 }).toArray();
      res.json({ success: true, comments });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ success: false, message: 'An error occurred while fetching comments.' });
    }
  });

  // Also support /api/comments?blogId=<id>
  router.get('/comments', async (req, res) => {
    const { blogId } = req.query;
    if (!blogId) return res.status(400).json({ success: false, message: 'blogId is required' });
    try {
      console.log('GET /api/comments (query) blogId:', blogId);
      const comments = await commentsCollection.find({ blogId }).sort({ createdAt: -1 }).toArray();
      res.json({ success: true, comments });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ success: false, message: 'An error occurred while fetching comments.' });
    }
  });

  // POST /api/blogs
  router.post('/blogs', async (req, res) => {
    try {
      const { title, slug, content, author } = req.body;

      if (!title || !slug || !content) {
        return res.status(400).json({
          success: false,
          message: 'title, slug, and content are required.'
        });
      }

      const existing = await blogCollection.findOne({ slug });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A blog with this slug already exists.'
        });
      }

      const newPost = {
        title,
        slug,
        content,
        author: author || 'Anonymous',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await blogCollection.insertOne(newPost);
      if (result.acknowledged) {
        return res.status(201).json({ success: true, blogPost: newPost });
      }
      return res.status(500).json({ success: false, message: 'Failed to create blog post.' });
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
};