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
    async toArray() {
      return rows;
    }
  };
}

function buildCollections({ classes, counters = { classCode: 256 }, users = [], logs = [] }) {
  const classDocs = classes.map((item) => cloneClassDoc(item));
  const userDocs = users.map((item) => ({ ...item }));
  const logEntries = logs;

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
      return { value: { nextVal: nextValue } };
    }
  };

  const usersCollection = {
    async findOne(query = {}) {
      return userDocs.find((row) => matchQuery(row, query)) || null;
    }
  };

  const logsCollection = {
    async insertOne(entry) {
      logEntries.push(entry);
      return { insertedId: new ObjectId() };
    }
  };

  return {
    classesCollection,
    countersCollection,
    usersCollection,
    logsCollection,
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

  test('duplicates a class and assigns the current teacher as owner', async () => {
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

    const response = await request(app).post(`/api/teacher/classes/${classId.toHexString()}/duplicate`);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.classCode).toMatch(/^C/);
    expect(collections.classDocs).toHaveLength(2);

    const duplicatedClass = collections.classDocs[1];
    expect(duplicatedClass.className).toBe('Data Structures Copy');
    expect(toIdString(duplicatedClass.instructorId)).toBe(teacherId.toHexString());
    expect(duplicatedClass.students).toEqual([]);
    expect(duplicatedClass.teachingTeam).toHaveLength(1);
    expect(toIdString(duplicatedClass.teachingTeam[0].userId)).toBe(teacherId.toHexString());
  });
});
