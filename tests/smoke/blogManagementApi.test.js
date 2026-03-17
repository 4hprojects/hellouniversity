const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createBlogManagementRoutes = require('../../routes/blogManagementRoutes');
const { createCollection } = require('../helpers/inMemoryMongo');
const { createUserDraftDoc } = require('../helpers/blogFixtures');

function buildApiApp(sessionData = {}, blogDocs = []) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = sessionData;
    next();
  });

  const blogCollection = createCollection(blogDocs);
  const usersCollection = createCollection([
    {
      _id: new ObjectId('67d6f93f1111111111111111'),
      firstName: 'Admin',
      lastName: 'User'
    }
  ]);

  app.use('/api', createBlogManagementRoutes({
    getBlogCollection: () => blogCollection,
    getUsersCollection: () => usersCollection,
    ObjectId,
    isAuthenticated(req, res, next) {
      if (req.session?.userId) {
        return next();
      }
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    },
    isAdmin(req, res, next) {
      if (req.session?.role === 'admin') {
        return next();
      }
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
  }));

  return { app, blogCollection };
}

describe('blog management API', () => {
  test('authenticated users can create, update, and submit their own drafts', async () => {
    const { app, blogCollection } = buildApiApp({
      userId: 'user-100',
      firstName: 'Taylor',
      lastName: 'Writer',
      role: 'student'
    });

    const createResponse = await request(app)
      .post('/api/blogs')
      .send({
        title: 'My Community Post',
        category: 'tech',
        slug: 'my-community-post',
        description: 'Draft description',
        contentHtml: '<p>Draft body.</p>'
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.post.authorName).toBe('Taylor Writer');
    expect(await blogCollection.countDocuments({ authorUserId: 'user-100' })).toBe(1);

    const draftId = createResponse.body.post.id;

    const updateResponse = await request(app)
      .put(`/api/blogs/${draftId}`)
      .send({
        title: 'My Community Post Updated',
        category: 'tech',
        slug: 'my-community-post',
        description: 'Updated description',
        contentHtml: '<p>Updated draft body.</p>'
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.post.title).toBe('My Community Post Updated');

    const submitResponse = await request(app).post(`/api/blogs/${draftId}/submit`);

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.post.status.value).toBe('submitted');
  });

  test('authors can list only their own posts', async () => {
    const docs = [
      createUserDraftDoc({ authorUserId: 'user-100', title: 'Mine' }),
      createUserDraftDoc({ authorUserId: 'user-200', title: 'Not Mine' })
    ];
    const { app } = buildApiApp({ userId: 'user-100', role: 'student' }, docs);

    const response = await request(app).get('/api/blogs/mine');

    expect(response.status).toBe(200);
    expect(response.body.posts).toHaveLength(1);
    expect(response.body.posts[0].title).toBe('Mine');
  });

  test('admins can approve submitted posts', async () => {
    const docs = [
      createUserDraftDoc({
        _id: new ObjectId('67d6f93f2222222222222222'),
        authorUserId: 'user-100',
        title: 'Submitted Post',
        category: 'gen',
        slug: 'submitted-post',
        status: 'submitted'
      })
    ];
    const { app } = buildApiApp({ userId: 'admin-1', role: 'admin' }, docs);

    const response = await request(app).post('/api/admin/blogs/67d6f93f2222222222222222/approve');

    expect(response.status).toBe(200);
    expect(response.body.post.status.value).toBe('published');
  });

  test('admins must provide rejection notes', async () => {
    const docs = [
      createUserDraftDoc({
        _id: new ObjectId('67d6f93f3333333333333333'),
        authorUserId: 'user-100',
        title: 'Submitted Post',
        category: 'finance',
        slug: 'submitted-finance-post',
        status: 'submitted'
      })
    ];
    const { app } = buildApiApp({ userId: 'admin-1', role: 'admin' }, docs);

    const response = await request(app)
      .post('/api/admin/blogs/67d6f93f3333333333333333/reject')
      .send({ reviewNotes: '' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('rejection reason');
  });

  test('non-admin users cannot access the admin review queue', async () => {
    const { app } = buildApiApp({ userId: 'user-100', role: 'student' }, []);
    const response = await request(app).get('/api/admin/blogs');

    expect(response.status).toBe(403);
  });
});
