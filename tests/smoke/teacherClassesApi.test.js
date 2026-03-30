const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createTeacherClassManagementApiRoutes = require('../../routes/teacherClassManagementApiRoutes');
const { isAuthenticated, isTeacherOrAdmin } = require('../../middleware/routeAuthGuards');

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function cloneClassDoc(classDoc) {
  return {
    ...classDoc,
    teachingTeam: Array.isArray(classDoc.teachingTeam) ? classDoc.teachingTeam.map((item) => ({ ...item })) : [],
    students: Array.isArray(classDoc.students) ? [...classDoc.students] : []
  };
}

function matchValue(actual, expected) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if ('$exists' in expected) {
      return expected.$exists ? actual !== undefined : actual === undefined;
    }
    if ('$regex' in expected) {
      const pattern = expected.$regex instanceof RegExp
        ? expected.$regex
        : new RegExp(expected.$regex, expected.$options || '');
      return pattern.test(String(actual || ''));
    }
    if ('$elemMatch' in expected) {
      if (!Array.isArray(actual)) return false;
      return actual.some((item) => matchQuery(item, expected.$elemMatch));
    }
    if ('$in' in expected) {
      return expected.$in.some((item) => toIdString(item) === toIdString(actual));
    }
  }

  return toIdString(actual) === toIdString(expected);
}

function matchQuery(row, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') {
      return expected.some((part) => matchQuery(row, part));
    }
    if (key === '$and') {
      return expected.every((part) => matchQuery(row, part));
    }
    return matchValue(row[key], expected);
  });
}

function createCursor(rows) {
  return {
    sort(sortSpec = {}) {
      const entries = Object.entries(sortSpec);
      const sortedRows = [...rows].sort((left, right) => {
        for (const [key, direction] of entries) {
          const leftValue = left[key] || 0;
          const rightValue = right[key] || 0;
          if (leftValue < rightValue) return direction < 0 ? 1 : -1;
          if (leftValue > rightValue) return direction < 0 ? -1 : 1;
        }
        return 0;
      });
      return createCursor(sortedRows);
    },
    limit(limitValue) {
      return createCursor(rows.slice(0, limitValue));
    },
    async toArray() {
      return rows;
    }
  };
}

function buildCollections({
  classes,
  counters = { classCode: 256 },
  counterReturnShape = 'modifyResult',
  users = [],
  logs = [],
  classQuizzes = [],
  quizzes = [],
  attempts = [],
  announcements = []
}) {
  const classDocs = classes.map((item) => cloneClassDoc(item));
  const userDocs = users.map((item) => ({ ...item }));
  const logEntries = logs.map((item) => ({ ...item }));
  const classQuizDocs = classQuizzes.map((item) => ({ ...item }));
  const quizDocs = quizzes.map((item) => ({ ...item }));
  const attemptDocs = attempts.map((item) => ({ ...item }));
  const announcementDocs = announcements.map((item) => ({ ...item }));

  const classesCollection = {
    find(query = {}) {
      return createCursor(classDocs.filter((row) => matchQuery(row, query)));
    },
    async findOne(query = {}) {
      return classDocs.find((row) => matchQuery(row, query)) || null;
    },
    async insertOne(doc) {
      const insertedId = doc._id || new ObjectId();
      classDocs.push({ ...doc, _id: insertedId });
      return { insertedId };
    }
  };

  const countersCollection = {
    async findOneAndUpdate(query = {}, update = {}) {
      const counterId = query._id || 'classCode';
      const nextValue = Number(counters[counterId] || 0) + Number(update.$inc?.nextVal || 0);
      counters[counterId] = nextValue;
      if (counterReturnShape === 'document') {
        return { _id: counterId, nextVal: nextValue };
      }
      return { value: { nextVal: nextValue } };
    }
  };

  const usersCollection = {
    async findOne(query = {}) {
      return userDocs.find((row) => matchQuery(row, query)) || null;
    }
  };

  const logsCollection = {
    find() {
      return createCursor(logEntries);
    },
    async insertOne(entry) {
      logEntries.push(entry);
      return { insertedId: new ObjectId() };
    }
  };

  const classQuizCollection = {
    find(query = {}) {
      return createCursor(
        classQuizDocs.filter((row) => !query.classId || toIdString(row.classId) === toIdString(query.classId))
      );
    }
  };

  const quizzesCollection = {
    find(query = {}) {
      const quizIds = Array.isArray(query._id?.$in) ? query._id.$in.map((value) => toIdString(value)) : [];
      return createCursor(
        quizDocs.filter((row) => !quizIds.length || quizIds.includes(toIdString(row._id)))
      );
    }
  };

  const attemptsCollection = {
    find(query = {}) {
      const quizIds = Array.isArray(query.quizId?.$in) ? query.quizId.$in.map((value) => toIdString(value)) : [];
      const studentIdNumbers = Array.isArray(query.$or?.[0]?.studentIDNumber?.$in)
        ? query.$or[0].studentIDNumber.$in.map((value) => String(value))
        : [];
      return createCursor(
        attemptDocs.filter((row) => (
          (!quizIds.length || quizIds.includes(toIdString(row.quizId)))
          && (!studentIdNumbers.length || studentIdNumbers.includes(String(row.studentIDNumber || '')))
        ))
      );
    }
  };

  const classAnnouncementsCollection = {
    find(query = {}) {
      return createCursor(
        announcementDocs.filter((row) => !query.classId || toIdString(row.classId) === toIdString(query.classId))
      );
    }
  };

  return {
    classesCollection,
    countersCollection,
    usersCollection,
    logsCollection,
    classQuizCollection,
    quizzesCollection,
    attemptsCollection,
    classAnnouncementsCollection,
    classDocs,
    logEntries
  };
}

function buildTeacherApiApp({ sessionData, collections }) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = sessionData;
    res.locals.currentPath = req.path || '/';
    next();
  });
  app.use('/api/teacher/classes', createTeacherClassManagementApiRoutes({
    getClassesCollection: () => collections.classesCollection,
    getCountersCollection: () => collections.countersCollection,
    getUsersCollection: () => collections.usersCollection,
    getLogsCollection: () => collections.logsCollection,
    getQuizzesCollection: () => collections.quizzesCollection,
    getAttemptsCollection: () => collections.attemptsCollection,
    getClassQuizCollection: () => collections.classQuizCollection,
    getClassAnnouncementsCollection: () => collections.classAnnouncementsCollection,
    ObjectId,
    isAuthenticated,
    isTeacherOrAdmin
  }));
  return app;
}

describe('teacher classes api smoke', () => {
  const teacherId = new ObjectId('507f1f77bcf86cd799439011');
  const ownerId = new ObjectId('507f1f77bcf86cd799439012');
  const classId = new ObjectId('507f1f77bcf86cd799439013');

  test('filters class list by query on the server', async () => {
    const collections = buildCollections({
      classes: [
        {
          _id: classId,
          className: 'Data Structures',
          courseCode: 'IT 223',
          classCode: 'C000100',
          section: 'BSIT 2A',
          academicTerm: 'First Semester',
          instructorId: teacherId,
          createdBy: teacherId,
          teachingTeam: [],
          students: ['2024-00123'],
          updatedAt: new Date('2026-03-16T00:00:00.000Z'),
          createdAt: new Date('2026-03-15T00:00:00.000Z')
        },
        {
          _id: new ObjectId('507f1f77bcf86cd799439014'),
          className: 'Operating Systems',
          courseCode: 'IT 224',
          classCode: 'C000101',
          section: 'BSIT 2B',
          academicTerm: 'First Semester',
          instructorId: teacherId,
          createdBy: teacherId,
          teachingTeam: [],
          students: [],
          updatedAt: new Date('2026-03-14T00:00:00.000Z'),
          createdAt: new Date('2026-03-13T00:00:00.000Z')
        }
      ],
      users: [
        {
          _id: teacherId,
          firstName: 'Kayla',
          lastName: 'Ryhs',
          studentIDNumber: '2024-00123',
          emaildb: 'kayla@example.com',
          role: 'teacher'
        }
      ]
    });

    const app = buildTeacherApiApp({
      sessionData: {
        userId: teacherId.toHexString(),
        role: 'teacher',
        studentIDNumber: '2024-00123'
      },
      collections
    });

    const response = await request(app).get('/api/teacher/classes?query=data');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.classes).toHaveLength(1);
    expect(response.body.classes[0].className).toBe('Data Structures');
  });

  test('owner can duplicate a class and remains the owner of the copy', async () => {
    const collections = buildCollections({
      classes: [
        {
          _id: classId,
          className: 'Data Structures',
          courseCode: 'IT 223',
          classCode: 'C000100',
          section: 'BSIT 2A',
          academicTerm: 'First Semester',
          instructorId: ownerId,
          createdBy: ownerId,
          instructorName: 'Original Owner',
          teachingTeam: [
            {
              userId: ownerId,
              name: 'Original Owner',
              role: 'owner',
              status: 'active'
            },
            {
              userId: teacherId,
              name: 'Kayla Ryhs',
              role: 'co_teacher',
              status: 'active'
            }
          ],
          students: ['2024-00123'],
          updatedAt: new Date('2026-03-16T00:00:00.000Z'),
          createdAt: new Date('2026-03-15T00:00:00.000Z')
        }
      ],
      users: [
        {
          _id: ownerId,
          firstName: 'Original',
          lastName: 'Owner',
          studentIDNumber: '2024-00012',
          emaildb: 'owner@example.com',
          role: 'teacher'
        }
      ]
    });

    const app = buildTeacherApiApp({
      sessionData: {
        userId: ownerId.toHexString(),
        role: 'teacher',
        studentIDNumber: '2024-00012'
      },
      collections
    });

    const response = await request(app).post(`/api/teacher/classes/${classId.toHexString()}/duplicate`);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.classCode).toMatch(/^C/);
    expect(collections.classDocs).toHaveLength(2);

    const duplicatedClass = collections.classDocs[1];
    expect(duplicatedClass.className).toBe('Data Structures Copy');
    expect(toIdString(duplicatedClass.instructorId)).toBe(ownerId.toHexString());
    expect(duplicatedClass.students).toEqual([]);
    expect(duplicatedClass.teachingTeam).toHaveLength(1);
    expect(toIdString(duplicatedClass.teachingTeam[0].userId)).toBe(ownerId.toHexString());
  });

  test('creates a class when counter updates return the document directly', async () => {
    const existingClassId = new ObjectId('507f1f77bcf86cd799439015');
    const collections = buildCollections({
      classes: [
        {
          _id: existingClassId,
          className: 'Intro to Programming',
          courseCode: 'IT 101',
          classCode: 'C000001',
          section: 'BSIT 1A',
          academicTerm: 'First Semester',
          instructorId: teacherId,
          createdBy: teacherId,
          teachingTeam: [{ userId: teacherId, role: 'owner', status: 'active' }],
          students: [],
          updatedAt: new Date('2026-03-16T00:00:00.000Z'),
          createdAt: new Date('2026-03-15T00:00:00.000Z')
        }
      ],
      counterReturnShape: 'document',
      users: [
        {
          _id: teacherId,
          firstName: 'Kayla',
          lastName: 'Ryhs',
          studentIDNumber: '2024-00123',
          emaildb: 'kayla@example.com',
          role: 'teacher'
        }
      ]
    });

    const app = buildTeacherApiApp({
      sessionData: {
        userId: teacherId.toHexString(),
        role: 'teacher',
        studentIDNumber: '2024-00123'
      },
      collections
    });

    const response = await request(app)
      .post('/api/teacher/classes')
      .send({
        className: 'Algorithms',
        courseCode: 'IT 225',
        termSystem: 'semester',
        academicTerm: 'First Semester',
        status: 'active'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.classCode).toBe('C000101');
    expect(collections.classDocs).toHaveLength(2);
    expect(collections.classDocs[1].className).toBe('Algorithms');
    expect(collections.classDocs[1].classCode).toBe('C000101');
  });

  test('co-teacher can view a class but cannot archive it', async () => {
    const collections = buildCollections({
      classes: [
        {
          _id: classId,
          className: 'Data Structures',
          courseCode: 'IT 223',
          classCode: 'C000100',
          section: 'BSIT 2A',
          academicTerm: 'First Semester',
          instructorId: ownerId,
          createdBy: ownerId,
          teachingTeam: [
            { userId: ownerId, role: 'owner', status: 'active' },
            { userId: teacherId, role: 'co_teacher', status: 'active' }
          ],
          students: [],
          updatedAt: new Date('2026-03-16T00:00:00.000Z'),
          createdAt: new Date('2026-03-15T00:00:00.000Z')
        }
      ],
      users: [
        {
          _id: teacherId,
          firstName: 'Kayla',
          lastName: 'Ryhs',
          studentIDNumber: '2024-00123',
          emaildb: 'kayla@example.com',
          role: 'teacher'
        }
      ]
    });

    const app = buildTeacherApiApp({
      sessionData: {
        userId: teacherId.toHexString(),
        role: 'teacher',
        studentIDNumber: '2024-00123'
      },
      collections
    });

    const readResponse = await request(app).get(`/api/teacher/classes/${classId.toHexString()}`);
    expect(readResponse.status).toBe(200);
    expect(readResponse.body.permissions.canManageRoster).toBe(true);
    expect(readResponse.body.permissions.canManageLifecycle).toBe(false);

    const archiveResponse = await request(app)
      .post(`/api/teacher/classes/${classId.toHexString()}/archive`)
      .send({ reason: 'term_completed' });

    expect(archiveResponse.status).toBe(403);
  });

  test('returns class insight summary for an owner', async () => {
    const quizId = new ObjectId('507f1f77bcf86cd799439099');
    const collections = buildCollections({
      classes: [
        {
          _id: classId,
          className: 'Data Structures',
          courseCode: 'IT 223',
          classCode: 'C000100',
          section: 'BSIT 2A',
          academicTerm: 'First Semester',
          instructorId: teacherId,
          createdBy: teacherId,
          teachingTeam: [{ userId: teacherId, role: 'owner', status: 'active' }],
          students: ['2024-00123', '2024-00124'],
          modules: [{ moduleId: 'mod-1', title: 'Week 1', hidden: false }],
          materials: [{ materialId: 'mat-1', title: 'Slides', type: 'link', hidden: false }],
          updatedAt: new Date('2026-03-24T10:00:00.000Z'),
          createdAt: new Date('2026-03-15T00:00:00.000Z')
        }
      ],
      users: [
        {
          _id: teacherId,
          firstName: 'Kayla',
          lastName: 'Ryhs',
          studentIDNumber: '2024-00123',
          emaildb: 'kayla@example.com',
          role: 'teacher'
        }
      ],
      classQuizzes: [
        {
          _id: new ObjectId('507f1f77bcf86cd799439088'),
          classId,
          quizId,
          dueDate: '2026-03-28T00:00:00.000Z'
        }
      ],
      quizzes: [
        {
          _id: quizId,
          title: 'Functions Quiz'
        }
      ],
      attempts: [
        {
          _id: new ObjectId('507f1f77bcf86cd799439077'),
          quizId,
          studentIDNumber: '2024-00123',
          isCompleted: true,
          submittedAt: '2026-03-23T00:00:00.000Z',
          finalScore: 88
        }
      ],
      announcements: [
        {
          _id: new ObjectId('507f1f77bcf86cd799439066'),
          classId,
          title: 'Welcome',
          authorName: 'Kayla Ryhs',
          createdAt: new Date('2026-03-24T09:00:00.000Z')
        }
      ]
    });

    const app = buildTeacherApiApp({
      sessionData: {
        userId: teacherId.toHexString(),
        role: 'teacher',
        studentIDNumber: '2024-00123'
      },
      collections
    });

    const response = await request(app).get(`/api/teacher/classes/${classId.toHexString()}/insights`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary.studentCount).toBe(2);
    expect(response.body.summary.moduleCount).toBe(1);
    expect(response.body.summary.announcementCount).toBe(1);
    expect(response.body.summary.assignedQuizCount).toBe(1);
    expect(response.body.engagement.studentsWithSubmissions).toBe(1);
    expect(Array.isArray(response.body.recentActivity)).toBe(true);
    expect(response.body.links.classrushCreate).toBe(`/teacher/live-games/new?linkedClassId=${classId.toHexString()}&launchContext=class-workspace`);
    expect(response.body.links.classrushDashboard).toBe('/teacher/live-games');
  });
});
