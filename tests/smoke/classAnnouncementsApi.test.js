const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createClassAnnouncementsRoutes = require('../../routes/classAnnouncementsRoutes');
const { isAuthenticated } = require('../../middleware/routeAuthGuards');
const { createCollection } = require('../helpers/inMemoryMongo');

function buildAnnouncementsApp({
  sessionData = {},
  users = [],
  classes = [],
  announcements = [],
  comments = [],
  reactions = []
} = {}) {
  const usersCollection = createCollection(users);
  const classesCollection = createCollection(classes);
  const classAnnouncementsCollection = createCollection(announcements);
  const announcementCommentsCollection = createCollection(comments);
  const announcementReactionsCollection = createCollection(reactions);

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use('/api/classes', createClassAnnouncementsRoutes({
    getClassesCollection: () => classesCollection,
    getUsersCollection: () => usersCollection,
    getClassAnnouncementsCollection: () => classAnnouncementsCollection,
    getAnnouncementCommentsCollection: () => announcementCommentsCollection,
    getAnnouncementReactionsCollection: () => announcementReactionsCollection,
    ObjectId,
    isAuthenticated
  }));

  return {
    app,
    usersCollection,
    classesCollection,
    classAnnouncementsCollection,
    announcementCommentsCollection,
    announcementReactionsCollection
  };
}

describe('class announcements api smoke', () => {
  const teacherUserId = new ObjectId('507f1f77bcf86cd799439101');
  const coTeacherUserId = new ObjectId('507f1f77bcf86cd799439102');
  const studentUserId = new ObjectId('507f1f77bcf86cd799439103');
  const otherStudentUserId = new ObjectId('507f1f77bcf86cd799439104');
  const adminUserId = new ObjectId('507f1f77bcf86cd799439105');
  const classId = new ObjectId('507f1f77bcf86cd799439110');
  const archivedClassId = new ObjectId('507f1f77bcf86cd799439111');
  const announcementId = new ObjectId('507f1f77bcf86cd799439112');
  const studentCommentId = new ObjectId('507f1f77bcf86cd799439113');

  const users = [
    { _id: teacherUserId, firstName: 'Teacher', lastName: 'Owner', studentIDNumber: 'T-1001' },
    { _id: coTeacherUserId, firstName: 'Co', lastName: 'Teacher', studentIDNumber: 'T-1002' },
    { _id: studentUserId, firstName: 'Student', lastName: 'Member', studentIDNumber: '2024-0001' },
    { _id: otherStudentUserId, firstName: 'Other', lastName: 'Student', studentIDNumber: '2024-9999' },
    { _id: adminUserId, firstName: 'Admin', lastName: 'User', studentIDNumber: 'A-0001' }
  ];

  const classes = [
    {
      _id: classId,
      classCode: 'C000201',
      className: 'IT 101',
      instructorId: teacherUserId,
      instructorName: 'Teacher Owner',
      status: 'active',
      students: ['2024-0001'],
      teachingTeam: [
        {
          userId: teacherUserId,
          status: 'active',
          role: 'owner'
        },
        {
          userId: coTeacherUserId,
          status: 'active',
          role: 'co_teacher'
        }
      ]
    },
    {
      _id: archivedClassId,
      classCode: 'C000202',
      className: 'IT 102',
      instructorId: teacherUserId,
      instructorName: 'Teacher Owner',
      status: 'archived',
      students: ['2024-0001'],
      teachingTeam: []
    }
  ];

  test('owner teacher can create, edit, and delete an announcement', async () => {
    const { app, classAnnouncementsCollection } = buildAnnouncementsApp({
      sessionData: {
        userId: teacherUserId.toHexString(),
        role: 'teacher',
        firstName: 'Teacher',
        lastName: 'Owner',
        studentIDNumber: 'T-1001'
      },
      users,
      classes
    });

    const createResponse = await request(app)
      .post(`/api/classes/${classId.toHexString()}/announcements`)
      .send({ title: 'Quiz Reminder', body: 'Prepare for the quiz tomorrow.' });

    expect(createResponse.status).toBe(201);
    expect(classAnnouncementsCollection._rows).toHaveLength(1);

    const createdAnnouncementId = classAnnouncementsCollection._rows[0]._id.toHexString();
    const updateResponse = await request(app)
      .put(`/api/classes/${classId.toHexString()}/announcements/${createdAnnouncementId}`)
      .send({ title: 'Updated Reminder', body: 'The quiz opens at 8 AM.' });

    expect(updateResponse.status).toBe(200);
    expect(classAnnouncementsCollection._rows[0].title).toBe('Updated Reminder');

    const deleteResponse = await request(app)
      .delete(`/api/classes/${classId.toHexString()}/announcements/${createdAnnouncementId}`);

    expect(deleteResponse.status).toBe(200);
    expect(classAnnouncementsCollection._rows).toHaveLength(0);
  });

  test('enrolled student can read, comment, and toggle like on announcements', async () => {
    const { app, announcementCommentsCollection, announcementReactionsCollection } = buildAnnouncementsApp({
      sessionData: {
        userId: studentUserId.toHexString(),
        role: 'student',
        firstName: 'Student',
        lastName: 'Member',
        studentIDNumber: '2024-0001'
      },
      users,
      classes,
      announcements: [
        {
          _id: announcementId,
          classId,
          authorUserId: teacherUserId.toHexString(),
          authorName: 'Teacher Owner',
          authorRole: 'teacher',
          title: 'Welcome',
          body: 'Welcome to class.',
          createdAt: new Date('2026-03-17T08:00:00.000Z'),
          updatedAt: new Date('2026-03-17T08:00:00.000Z')
        }
      ]
    });

    const listResponse = await request(app).get(`/api/classes/${classId.toHexString()}/announcements`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.permissions.canComment).toBe(true);
    expect(listResponse.body.announcements).toHaveLength(1);

    const commentResponse = await request(app)
      .post(`/api/classes/${classId.toHexString()}/announcements/${announcementId.toHexString()}/comments`)
      .send({ body: 'Thank you, noted.' });
    expect(commentResponse.status).toBe(201);
    expect(announcementCommentsCollection._rows).toHaveLength(1);

    const likeResponse = await request(app)
      .post(`/api/classes/${classId.toHexString()}/announcements/${announcementId.toHexString()}/reactions/like`);
    expect(likeResponse.status).toBe(200);
    expect(likeResponse.body.liked).toBe(true);
    expect(announcementReactionsCollection._rows).toHaveLength(1);

    const unlikeResponse = await request(app)
      .post(`/api/classes/${classId.toHexString()}/announcements/${announcementId.toHexString()}/reactions/like`);
    expect(unlikeResponse.status).toBe(200);
    expect(unlikeResponse.body.liked).toBe(false);
    expect(announcementReactionsCollection._rows).toHaveLength(0);
  });

  test('comment author can delete their own comment and owner teacher can delete any comment', async () => {
    const sharedAnnouncements = [
      {
        _id: announcementId,
        classId,
        authorUserId: teacherUserId.toHexString(),
        authorName: 'Teacher Owner',
        authorRole: 'teacher',
        title: 'Welcome',
        body: 'Welcome to class.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const studentApp = buildAnnouncementsApp({
      sessionData: {
        userId: studentUserId.toHexString(),
        role: 'student',
        firstName: 'Student',
        lastName: 'Member',
        studentIDNumber: '2024-0001'
      },
      users,
      classes,
      announcements: sharedAnnouncements
    });

    const createCommentResponse = await request(studentApp.app)
      .post(`/api/classes/${classId.toHexString()}/announcements/${announcementId.toHexString()}/comments`)
      .send({ body: 'My own comment.' });
    expect(createCommentResponse.status).toBe(201);

    const createdCommentId = studentApp.announcementCommentsCollection._rows[0]._id.toHexString();
    const deleteOwnResponse = await request(studentApp.app)
      .delete(`/api/classes/${classId.toHexString()}/announcements/${announcementId.toHexString()}/comments/${createdCommentId}`);
    expect(deleteOwnResponse.status).toBe(200);
    expect(studentApp.announcementCommentsCollection._rows).toHaveLength(0);

    const teacherApp = buildAnnouncementsApp({
      sessionData: {
        userId: teacherUserId.toHexString(),
        role: 'teacher',
        firstName: 'Teacher',
        lastName: 'Owner',
        studentIDNumber: 'T-1001'
      },
      users,
      classes,
      announcements: sharedAnnouncements,
      comments: [
        {
          _id: studentCommentId,
          classId,
          announcementId,
          authorUserId: studentUserId.toHexString(),
          authorName: 'Student Member',
          authorRole: 'student',
          body: 'Need clarification.',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    const deleteStudentCommentResponse = await request(teacherApp.app)
      .delete(`/api/classes/${classId.toHexString()}/announcements/${announcementId.toHexString()}/comments/${studentCommentId.toHexString()}`);
    expect(deleteStudentCommentResponse.status).toBe(200);
    expect(teacherApp.announcementCommentsCollection._rows).toHaveLength(0);
  });

  test('owner teacher can comment and archived classes reject new writes', async () => {
    const { app } = buildAnnouncementsApp({
      sessionData: {
        userId: teacherUserId.toHexString(),
        role: 'teacher',
        firstName: 'Teacher',
        lastName: 'Owner',
        studentIDNumber: 'T-1001'
      },
      users,
      classes,
      announcements: [
        {
          _id: announcementId,
          classId,
          authorUserId: teacherUserId.toHexString(),
          authorName: 'Teacher Owner',
          authorRole: 'teacher',
          title: 'Welcome',
          body: 'Welcome to class.',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    const ownerCommentResponse = await request(app)
      .post(`/api/classes/${classId.toHexString()}/announcements/${announcementId.toHexString()}/comments`)
      .send({ body: 'Use this thread for questions.' });
    expect(ownerCommentResponse.status).toBe(201);

    const archivedCreateResponse = await request(app)
      .post(`/api/classes/${archivedClassId.toHexString()}/announcements`)
      .send({ title: 'Archived', body: 'No longer writable.' });
    expect(archivedCreateResponse.status).toBe(409);
    expect(archivedCreateResponse.body.message).toBe('This class is archived and read-only.');
  });

  test('non-enrolled students get not found for class feeds', async () => {
    const { app } = buildAnnouncementsApp({
      sessionData: {
        userId: otherStudentUserId.toHexString(),
        role: 'student',
        firstName: 'Other',
        lastName: 'Student',
        studentIDNumber: '2024-9999'
      },
      users,
      classes
    });

    const response = await request(app).get(`/api/classes/${classId.toHexString()}/announcements`);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Class not found.');
  });

  test('co-teachers can post and manage their own announcements while admins remain read-only', async () => {
    const sharedAnnouncements = [
      {
        _id: announcementId,
        classId,
        authorUserId: teacherUserId.toHexString(),
        authorName: 'Teacher Owner',
        authorRole: 'teacher',
        title: 'Welcome',
        body: 'Welcome to class.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const coTeacherApp = buildAnnouncementsApp({
      sessionData: {
        userId: coTeacherUserId.toHexString(),
        role: 'teacher',
        firstName: 'Co',
        lastName: 'Teacher',
        studentIDNumber: 'T-1002'
      },
      users,
      classes,
      announcements: sharedAnnouncements
    });

    const coTeacherReadResponse = await request(coTeacherApp.app).get(`/api/classes/${classId.toHexString()}/announcements`);
    expect(coTeacherReadResponse.status).toBe(200);
    expect(coTeacherReadResponse.body.permissions.canPostAnnouncement).toBe(true);

    const coTeacherCreateResponse = await request(coTeacherApp.app)
      .post(`/api/classes/${classId.toHexString()}/announcements`)
      .send({ title: 'Co-Teacher Update', body: 'Shared by the co-teacher.' });
    expect(coTeacherCreateResponse.status).toBe(201);

    const coTeacherAnnouncementId = coTeacherApp.classAnnouncementsCollection._rows.find((row) => row.title === 'Co-Teacher Update')._id.toHexString();

    const coTeacherUpdateResponse = await request(coTeacherApp.app)
      .put(`/api/classes/${classId.toHexString()}/announcements/${coTeacherAnnouncementId}`)
      .send({ title: 'Co-Teacher Update Edited', body: 'Updated by the co-teacher.' });
    expect(coTeacherUpdateResponse.status).toBe(200);

    const coTeacherDeleteResponse = await request(coTeacherApp.app)
      .delete(`/api/classes/${classId.toHexString()}/announcements/${coTeacherAnnouncementId}`);
    expect(coTeacherDeleteResponse.status).toBe(200);

    const coTeacherCommentResponse = await request(coTeacherApp.app)
      .post(`/api/classes/${classId.toHexString()}/announcements/${announcementId.toHexString()}/comments`)
      .send({ body: 'Co-teacher follow-up.' });
    expect(coTeacherCommentResponse.status).toBe(201);

    const adminApp = buildAnnouncementsApp({
      sessionData: {
        userId: adminUserId.toHexString(),
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        studentIDNumber: 'A-0001'
      },
      users,
      classes,
      announcements: sharedAnnouncements
    });

    const adminReadResponse = await request(adminApp.app).get(`/api/classes/${classId.toHexString()}/announcements`);
    expect(adminReadResponse.status).toBe(200);

    const adminCreateResponse = await request(adminApp.app)
      .post(`/api/classes/${classId.toHexString()}/announcements`)
      .send({ title: 'Admin Post', body: 'This should be blocked.' });
    expect(adminCreateResponse.status).toBe(403);
  });
});
