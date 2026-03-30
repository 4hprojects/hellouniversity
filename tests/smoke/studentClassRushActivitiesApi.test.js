const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createStudentWebRoutes = require('../../routes/studentWebRoutes');
const { isAuthenticated } = require('../../middleware/routeAuthGuards');

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
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
      return toIdString(row[key]) === toIdString(expected);
    });
  });
}

function buildMockClient({
  classes = [],
  classQuizzes = [],
  quizzes = [],
  attempts = [],
  liveGameAssignments = [],
  liveGameAttempts = [],
  liveGames = []
}) {
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
                if (query._id && query._id.$in) {
                  const ids = query._id.$in.map((value) => toIdString(value));
                  return createCursor(classes.filter((row) => ids.includes(toIdString(row._id))));
                }
                return createCursor(classes);
              }
            };
          }

          if (name === 'tblClassQuizzes') {
            return {
              find(query = {}) {
                const classIds = Array.isArray(query.classId?.$in) ? query.classId.$in.map((value) => toIdString(value)) : [];
                return createCursor(classQuizzes.filter((row) => classIds.includes(toIdString(row.classId))));
              }
            };
          }

          if (name === 'tblQuizzes') {
            return {
              find(query = {}) {
                const ids = Array.isArray(query._id?.$in) ? query._id.$in.map((value) => toIdString(value)) : [];
                return createCursor(quizzes.filter((row) => ids.includes(toIdString(row._id))));
              }
            };
          }

          if (name === 'tblAttempts') {
            return {
              find(query = {}) {
                const ids = Array.isArray(query.quizId?.$in) ? query.quizId.$in.map((value) => toIdString(value)) : [];
                const filters = Array.isArray(query.$or) ? query.$or : [];
                return createCursor(attempts.filter((row) => ids.includes(toIdString(row.quizId)) && matchOrFilter(row, filters)));
              }
            };
          }

          if (name === 'tblLiveGameAssignments') {
            return {
              find(query = {}) {
                const classIds = Array.isArray(query.classId?.$in) ? query.classId.$in.map((value) => String(value)) : [];
                return createCursor(liveGameAssignments.filter((row) => classIds.includes(String(row.classId || ''))));
              }
            };
          }

          if (name === 'tblLiveGameAttempts') {
            return {
              find(query = {}) {
                const ids = Array.isArray(query.assignmentId?.$in) ? query.assignmentId.$in.map((value) => String(value)) : [];
                const filters = Array.isArray(query.$or) ? query.$or : [];
                return createCursor(liveGameAttempts.filter((row) => ids.includes(String(row.assignmentId || '')) && matchOrFilter(row, filters)));
              }
            };
          }

          if (name === 'tblLiveGames') {
            return {
              find(query = {}) {
                const ids = Array.isArray(query._id?.$in) ? query._id.$in.map((value) => toIdString(value)) : [];
                return createCursor(liveGames.filter((row) => ids.includes(toIdString(row._id))));
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
    client,
    isAuthenticated,
    getUsersCollection: () => null,
    getLogsCollection: () => null
  }));
  return app;
}

describe('student ClassRush activities integration smoke', () => {
  const classId = new ObjectId('507f1f77bcf86cd799439012');
  const quizId = new ObjectId('507f1f77bcf86cd799439015');
  const gameId = new ObjectId('507f1f77bcf86cd799439016');
  const assignmentId = new ObjectId('507f1f77bcf86cd799439017');

  const client = buildMockClient({
    classes: [{
      _id: classId,
      classCode: 'C000123',
      className: 'BSIT 1A',
      instructorName: 'Prof. Santos',
      schedule: 'Mon / Wed',
      time: '08:00 - 09:30',
      status: 'active',
      students: ['2024-00123']
    }],
    classQuizzes: [{
      _id: new ObjectId('507f1f77bcf86cd799439018'),
      classId,
      quizId,
      dueDate: '2026-04-05T08:00:00.000Z'
    }],
    quizzes: [{
      _id: quizId,
      title: 'Functions Quiz',
      description: 'Short quiz on functions',
      questions: [{}, {}]
    }],
    attempts: [{
      _id: new ObjectId('507f1f77bcf86cd799439019'),
      quizId,
      studentId: '507f1f77bcf86cd799439011',
      isCompleted: true,
      submittedAt: '2026-03-30T07:00:00.000Z',
      finalScore: 18
    }],
    liveGameAssignments: [{
      _id: assignmentId,
      gameId: gameId.toHexString(),
      gameTitle: 'Self-Paced ClassRush',
      gameDescription: 'Practice ClassRush',
      classId: classId.toHexString(),
      classCode: 'C000123',
      className: 'BSIT 1A',
      questionCount: 1,
      assignmentMode: 'whole_class',
      assignedStudents: [],
      dueDate: '2026-04-06T08:00:00.000Z',
      duePolicy: 'lock_after_due',
      scoringProfile: 'accuracy'
    }],
    liveGameAttempts: [{
      _id: new ObjectId('507f1f77bcf86cd799439020'),
      assignmentId: assignmentId.toHexString(),
      studentIDNumber: '2024-00123',
      studentUserId: '507f1f77bcf86cd799439011',
      status: 'in_progress',
      updatedAt: '2026-03-30T09:00:00.000Z'
    }],
    liveGames: [{
      _id: gameId,
      title: 'Self-Paced ClassRush',
      description: 'Practice ClassRush',
      questions: [{ title: 'Q1' }]
    }]
  });

  test('GET /api/student/activities includes self-paced ClassRush rows with generic activity fields', async () => {
    const app = buildStudentApiApp({
      sessionData: {
        userId: '507f1f77bcf86cd799439011',
        role: 'student',
        studentIDNumber: '2024-00123'
      },
      client
    });

    const response = await request(app).get('/api/student/activities');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.rows).toHaveLength(2);

    const classRushRow = response.body.rows.find((row) => row.activityType === 'classrush');
    expect(classRushRow).toBeTruthy();
    expect(classRushRow.activityTitle).toBe('Self-Paced ClassRush');
    expect(classRushRow.actionUrl).toBe(`/classrush/assignments/${assignmentId.toHexString()}`);
    expect(classRushRow.status).toBe('In Progress');
  });

  test('GET /api/student/classes/:classId exposes generic next-due activity fields for self-paced ClassRush', async () => {
    const app = buildStudentApiApp({
      sessionData: {
        userId: '507f1f77bcf86cd799439011',
        role: 'student',
        studentIDNumber: '2024-00123'
      },
      client
    });

    const response = await request(app).get(`/api/student/classes/${classId.toHexString()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary.nextDue).toBeTruthy();
    expect(response.body.summary.nextDue.activityTitle).toBeTruthy();
  });
});
