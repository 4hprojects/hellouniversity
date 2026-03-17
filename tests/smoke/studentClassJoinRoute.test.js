const express = require('express');
const request = require('supertest');

const createClassesRoutes = require('../../routes/classesRoutes');

function buildClassesApp({ sessionData = {}, classesCollection }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });

  const router = createClassesRoutes(
    {
      getClassesCollection: () => classesCollection,
      getCountersCollection: () => ({}),
      getClassQuizCollection: () => ({}),
      ObjectId: class MockObjectId {
        constructor(value) {
          this.value = value;
        }
      },
      upload: {
        single: () => (_req, _res, next) => next()
      }
    },
    {
      isAuthenticated: (req, res, next) => {
        if (!req.session?.userId) {
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        return next();
      },
      isTeacherOrAdmin: (_req, _res, next) => next()
    }
  );

  app.use('/api', router);
  return app;
}

describe('student class join route smoke', () => {
  test('joins a class using a normalized class code', async () => {
    const classesCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: 'class-1',
        classCode: 'C000123',
        className: 'BSIT 1A',
        instructorName: 'Prof. Santos',
        students: ['2024-00111'],
        schedule: 'Mon / Wed',
        time: '08:00 - 09:30',
        status: 'active'
      }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    };
    const app = buildClassesApp({
      sessionData: {
        userId: 'student-1',
        role: 'student',
        studentIDNumber: '2024-00123'
      },
      classesCollection
    });

    const response = await request(app)
      .post('/api/classes/join')
      .send({ classCode: ' c000123 ' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.alreadyJoined).toBe(false);
    expect(response.body.message).toContain('C000123');
    expect(response.body.classItem.className).toBe('BSIT 1A');
    expect(classesCollection.findOne).toHaveBeenCalledWith({ classCode: 'C000123' });
    expect(classesCollection.updateOne).toHaveBeenCalledWith(
      { _id: 'class-1' },
      { $addToSet: { students: '2024-00123' } }
    );
  });

  test('returns an already-joined response without duplicating enrollment', async () => {
    const classesCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: 'class-2',
        classCode: 'C000456',
        className: 'BSCS 2B',
        instructorName: 'Prof. Cruz',
        students: ['2024-00123'],
        status: 'active'
      }),
      updateOne: jest.fn()
    };
    const app = buildClassesApp({
      sessionData: {
        userId: 'student-1',
        role: 'student',
        studentIDNumber: '2024-00123'
      },
      classesCollection
    });

    const response = await request(app)
      .post('/api/classes/join')
      .send({ classCode: 'c000456' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.alreadyJoined).toBe(true);
    expect(response.body.message).toContain('already enrolled');
    expect(classesCollection.updateOne).not.toHaveBeenCalled();
  });
});
