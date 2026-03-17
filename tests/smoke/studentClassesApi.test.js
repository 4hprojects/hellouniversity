const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createStudentWebRoutes = require('../../routes/studentWebRoutes');
const { isAuthenticated } = require('../../middleware/routeAuthGuards');

function toIdString(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value.toHexString === 'function') {
    return value.toHexString();
  }
  return String(value);
}

function createCursor(rows) {
  return {
    project(projection) {
      const projectedRows = rows.map((row) => {
        const nextRow = {};
        Object.keys(projection || {}).forEach((key) => {
          if (projection[key]) {
            nextRow[key] = row[key];
          }
        });
        return nextRow;
      });
      return createCursor(projectedRows);
    },
    async toArray() {
      return rows;
    }
  };
}

function matchOrFilter(row, filters) {
  return filters.some((filter) => {
    return Object.entries(filter).every(([key, expected]) => {
      if (key === 'studentId') {
        return toIdString(row.studentId) === toIdString(expected);
      }
      return row[key] === expected;
    });
  });
}

function buildMockClient({ classes = [], classQuizzes = [], quizzes = [], attempts = [] }) {
  return {
    db() {
      return {
        collection(name) {
          if (name === 'tblClasses') {
            return {
              find(query = {}) {
                if (query.students && query.students.$in) {
                  const studentIds = query.students.$in.map((value) => String(value));
                  return createCursor(
                    classes.filter((row) => Array.isArray(row.students) && row.students.some((value) => studentIds.includes(String(value))))
                  );
                }
                return createCursor(classes);
              }
            };
          }

          if (name === 'tblClassQuizzes') {
            return {
              find(query = {}) {
                const classIds = Array.isArray(query.classId?.$in) ? query.classId.$in.map((value) => toIdString(value)) : [];
                return createCursor(
                  classQuizzes.filter((row) => classIds.includes(toIdString(row.classId)))
                );
              }
            };
          }

          if (name === 'tblQuizzes') {
            return {
              find(query = {}) {
                const quizIds = Array.isArray(query._id?.$in) ? query._id.$in.map((value) => toIdString(value)) : [];
                return createCursor(
                  quizzes.filter((row) => quizIds.includes(toIdString(row._id)))
                );
              }
            };
          }

          if (name === 'tblAttempts') {
            return {
              find(query = {}) {
                const quizIds = Array.isArray(query.quizId?.$in) ? query.quizId.$in.map((value) => toIdString(value)) : [];
                const filters = Array.isArray(query.$or) ? query.$or : [];
                return createCursor(
                  attempts.filter((row) => quizIds.includes(toIdString(row.quizId)) && matchOrFilter(row, filters))
                );
              }
            };
          }

          return {
            find() {
              return createCursor([]);
            }
          };
        }
      };
    }
  };
}

function buildStudentApiApp({ sessionData = {}, client }) {
  const app = express();
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use(createStudentWebRoutes({
    projectRoot: process.cwd(),
    client,
    isAuthenticated,
    getUsersCollection: () => null,
    getLogsCollection: () => null
  }));
  return app;
}

describe('student classes api smoke', () => {
  const studentUserId = new ObjectId('507f1f77bcf86cd799439011');
  const joinedClassId = new ObjectId('507f1f77bcf86cd799439012');
  const noActivityClassId = new ObjectId('507f1f77bcf86cd799439013');
  const otherStudentClassId = new ObjectId('507f1f77bcf86cd799439014');
  const quizId = new ObjectId('507f1f77bcf86cd799439015');

  const classes = [
    {
      _id: joinedClassId,
      classCode: 'C000123',
      className: 'BSIT 1A',
      instructorName: 'Prof. Santos',
      schedule: 'Mon / Wed',
      time: '08:00 - 09:30',
      status: 'active',
      students: ['2024-00123']
    },
    {
      _id: noActivityClassId,
      classCode: 'C000124',
      className: 'BSIT 1B',
      instructorName: 'Prof. Cruz',
      schedule: 'Tue / Thu',
      time: '10:00 - 11:30',
      status: 'archived',
      students: ['2024-00123']
    },
    {
      _id: otherStudentClassId,
      classCode: 'C000125',
      className: 'BSCS 2A',
      instructorName: 'Prof. Lee',
      students: ['2024-00999']
    }
  ];

  const classQuizzes = [
    {
      _id: new ObjectId('507f1f77bcf86cd799439016'),
      classId: joinedClassId,
      quizId,
      dueDate: '2026-03-21T08:00:00.000Z'
    }
  ];

  const quizzes = [
    {
      _id: quizId,
      title: 'Functions Quiz',
      description: 'Short quiz on functions',
      questions: [{}, {}]
    }
  ];

  const attempts = [
    {
      _id: new ObjectId('507f1f77bcf86cd799439017'),
      quizId,
      studentId: studentUserId,
      isCompleted: true,
      submittedAt: '2026-03-20T07:00:00.000Z',
      finalScore: 18
    }
  ];

  test('returns only joined classes for the current student', async () => {
    const app = buildStudentApiApp({
      sessionData: {
        userId: studentUserId.toHexString(),
        role: 'student',
        studentIDNumber: '2024-00123'
      },
      client: buildMockClient({ classes, classQuizzes, quizzes, attempts })
    });

    const response = await request(app).get('/api/student/classes');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary.joinedClassCount).toBe(2);
    expect(response.body.classes).toHaveLength(2);
    expect(response.body.classes.map((item) => item.classId)).toEqual([
      joinedClassId.toHexString(),
      noActivityClassId.toHexString()
    ]);
  });

  test('returns not found when the student is not enrolled in the requested class', async () => {
    const app = buildStudentApiApp({
      sessionData: {
        userId: studentUserId.toHexString(),
        role: 'student',
        studentIDNumber: '2024-00123'
      },
      client: buildMockClient({ classes, classQuizzes, quizzes, attempts })
    });

    const response = await request(app).get(`/api/student/classes/${otherStudentClassId.toHexString()}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Class not found.');
  });

  test('keeps zero-count summaries for joined classes without activities', async () => {
    const app = buildStudentApiApp({
      sessionData: {
        userId: studentUserId.toHexString(),
        role: 'student',
        studentIDNumber: '2024-00123'
      },
      client: buildMockClient({ classes, classQuizzes, quizzes, attempts })
    });

    const response = await request(app).get('/api/student/classes');
    const archivedClass = response.body.classes.find((item) => item.classId === noActivityClassId.toHexString());

    expect(response.status).toBe(200);
    expect(archivedClass).toBeTruthy();
    expect(archivedClass.activityCount).toBe(0);
    expect(archivedClass.submittedCount).toBe(0);
    expect(archivedClass.overdueCount).toBe(0);
  });
});
