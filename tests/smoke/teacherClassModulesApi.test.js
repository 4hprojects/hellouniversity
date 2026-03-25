/**
 * Smoke tests for Teacher Class Management: modules, materials, activate, settings.
 * Covers the Phase 5–6 endpoints added in March 2026.
 */

const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

jest.mock('../../utils/classMaterialStorage', () => {
  function serializeMaterial(material) {
    if (!material?.file) {
      return { ...material };
    }
    return {
      ...material,
      file: {
        ...material.file,
        downloadUrl: `https://signed.example/${encodeURIComponent(material.file.originalName || 'file')}`
      }
    };
  }

  return {
    MATERIAL_UPLOAD_MAX_BYTES: 10 * 1024 * 1024,
    validateMaterialUpload: jest.fn((type, file) => {
      if (!['document', 'file'].includes(String(type || ''))) {
        return 'Uploads are only supported for document and file materials.';
      }
      if (!file) {
        return 'No file uploaded.';
      }
      return '';
    }),
    uploadClassMaterialFile: jest.fn(async ({ file, uploadedByUserId }) => ({
      storageKey: `class-materials/mock/${file.originalname}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedAt: new Date('2026-03-24T00:00:00.000Z'),
      uploadedByUserId
    })),
    deleteClassMaterialFile: jest.fn(async () => {}),
    serializeClassMaterial: jest.fn(async (material) => serializeMaterial(material)),
    serializeClassMaterials: jest.fn(async (materials) => materials.map((material) => serializeMaterial(material)))
  };
});

const createTeacherClassManagementApiRoutes = require('../../routes/teacherClassManagementApiRoutes');
const { isAuthenticated, isTeacherOrAdmin } = require('../../middleware/routeAuthGuards');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function applyUpdate(doc, update = {}) {
  const result = { ...doc };
  if (update.$set) {
    Object.assign(result, update.$set);
  }
  if (update.$push) {
    for (const [key, value] of Object.entries(update.$push)) {
      result[key] = Array.isArray(result[key]) ? [...result[key], value] : [value];
    }
  }
  if (update.$pull) {
    for (const [key, condition] of Object.entries(update.$pull)) {
      if (!Array.isArray(result[key])) continue;
      if (typeof condition === 'object') {
        const [filterKey, filterVal] = Object.entries(condition)[0];
        result[key] = result[key].filter((item) => item[filterKey] !== filterVal);
      } else {
        result[key] = result[key].filter((item) => item !== condition);
      }
    }
  }
  return result;
}

function matchValue(actual, expected) {
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) {
    return toIdString(actual) === toIdString(expected);
  }
  if ('$exists' in expected) return expected.$exists ? actual !== undefined : actual === undefined;
  return toIdString(actual) === toIdString(expected);
}

function matchQuery(row, query = {}) {
  return Object.entries(query).every(([key, val]) => {
    if (key === '$or') return val.some((part) => matchQuery(row, part));
    return matchValue(row[key], val);
  });
}

function buildCollections({ classDoc, users = [], logs = [] }) {
  const classDocs = [{ ...classDoc }];
  const userDocs = users.map((u) => ({ ...u }));
  const logEntries = [...logs];

  const classesCollection = {
    async findOne(query = {}) {
      return classDocs.find((row) => matchQuery(row, query)) || null;
    },
    async updateOne(query = {}, update = {}) {
      const index = classDocs.findIndex((row) => matchQuery(row, query));
      if (index !== -1) {
        classDocs[index] = applyUpdate(classDocs[index], update);
      }
      return { modifiedCount: index !== -1 ? 1 : 0 };
    },
    _classDocs: classDocs
  };

  const countersCollection = {
    async findOneAndUpdate() {
      return { value: { nextVal: 1 } };
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
    },
    _entries: logEntries
  };

  return {
    classesCollection,
    countersCollection,
    usersCollection,
    logsCollection
  };
}

function buildApp({ sessionData, classDoc, users = [] }) {
  const collections = buildCollections({ classDoc, users });
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
  return { app, collections };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const teacherId = new ObjectId('507f1f77bcf86cd799439011');
const classId = new ObjectId('507f1f77bcf86cd799439013');

function makeBaseClassDoc(overrides = {}) {
  return {
    _id: classId,
    className: 'Data Structures',
    courseCode: 'IT 223',
    classCode: 'C000100',
    section: 'BSIT 2A',
    academicTerm: 'First Semester',
    status: 'draft',
    selfEnrollmentEnabled: true,
    instructorId: teacherId,
    createdBy: teacherId,
    teachingTeam: [],
    students: [],
    modules: [],
    materials: [],
    updatedAt: new Date('2026-03-16T00:00:00.000Z'),
    createdAt: new Date('2026-03-15T00:00:00.000Z'),
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Activate tests
// ---------------------------------------------------------------------------

describe('teacher class activate smoke', () => {
  test('activates a draft class', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ status: 'draft' })
    });

    const res = await request(app).post(`/api/teacher/classes/${classId.toHexString()}/activate`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(collections.classesCollection._classDocs[0].status).toBe('active');
  });

  test('returns 400 when activating an already active class', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ status: 'active' })
    });

    const res = await request(app).post(`/api/teacher/classes/${classId.toHexString()}/activate`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when activating an archived class', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ status: 'archived' })
    });

    const res = await request(app).post(`/api/teacher/classes/${classId.toHexString()}/activate`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Modules tests
// ---------------------------------------------------------------------------

describe('teacher class modules api smoke', () => {
  test('returns empty module list when class has none', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ modules: [] })
    });

    const res = await request(app).get(`/api/teacher/classes/${classId.toHexString()}/modules`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.modules).toEqual([]);
  });

  test('creates a module and returns it', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ modules: [] })
    });

    const res = await request(app)
      .post(`/api/teacher/classes/${classId.toHexString()}/modules`)
      .send({ title: 'Introduction', description: 'Week 1 topics' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.module.title).toBe('Introduction');
    expect(res.body.module.moduleId).toBeDefined();
    expect(collections.classesCollection._classDocs[0].modules).toHaveLength(1);
  });

  test('rejects module creation without title', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc()
    });

    const res = await request(app)
      .post(`/api/teacher/classes/${classId.toHexString()}/modules`)
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('updates a module title and hidden flag', async () => {
    const existingModuleId = 'mod-abc123';
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        modules: [{ moduleId: existingModuleId, title: 'Old Title', description: '', order: 0, hidden: false }]
      })
    });

    const res = await request(app)
      .put(`/api/teacher/classes/${classId.toHexString()}/modules/${existingModuleId}`)
      .send({ title: 'Updated Title', hidden: true, order: 0 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.module.title).toBe('Updated Title');
    expect(res.body.module.hidden).toBe(true);
    expect(collections.classesCollection._classDocs[0].modules[0].title).toBe('Updated Title');
  });

  test('reorders modules atomically and normalizes order values', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        modules: [
          { moduleId: 'mod-a', title: 'First', order: 0, hidden: false },
          { moduleId: 'mod-b', title: 'Second', order: 9, hidden: false },
          { moduleId: 'mod-c', title: 'Third', order: 20, hidden: false }
        ]
      })
    });

    const res = await request(app)
      .put(`/api/teacher/classes/${classId.toHexString()}/modules/reorder`)
      .send({ moduleIds: ['mod-c', 'mod-a', 'mod-b'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.modules.map((item) => item.moduleId)).toEqual(['mod-c', 'mod-a', 'mod-b']);
    expect(res.body.modules.map((item) => item.order)).toEqual([0, 1, 2]);
    expect(collections.classesCollection._classDocs[0].modules.map((item) => item.order)).toEqual([0, 1, 2]);
  });

  test('returns 404 when updating a non-existent module', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ modules: [] })
    });

    const res = await request(app)
      .put(`/api/teacher/classes/${classId.toHexString()}/modules/nonexistent`)
      .send({ title: 'Whatever' });

    expect(res.status).toBe(404);
  });

  test('deletes a module and unlinks its materials', async () => {
    const moduleId = 'mod-delete-me';
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        modules: [{ moduleId, title: 'To Delete', order: 0 }],
        materials: [
          { materialId: 'mat-1', moduleId, title: 'Linked Material', type: 'link' },
          { materialId: 'mat-2', moduleId: null, title: 'Unlinked Material', type: 'link' }
        ]
      })
    });

    const res = await request(app)
      .delete(`/api/teacher/classes/${classId.toHexString()}/modules/${moduleId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(collections.classesCollection._classDocs[0].modules).toHaveLength(0);
    // Linked material should have its moduleId cleared to null
    const updatedMaterials = collections.classesCollection._classDocs[0].materials;
    expect(updatedMaterials.find((m) => m.materialId === 'mat-1').moduleId).toBeNull();
  });

  test('teaching assistant can create a module for an assigned class', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        instructorId: new ObjectId('507f1f77bcf86cd799439099'),
        createdBy: new ObjectId('507f1f77bcf86cd799439099'),
        teachingTeam: [{ userId: teacherId, role: 'teaching_assistant', status: 'active' }]
      })
    });

    const res = await request(app)
      .post(`/api/teacher/classes/${classId.toHexString()}/modules`)
      .send({ title: 'TA Module' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Materials tests
// ---------------------------------------------------------------------------

describe('teacher class materials api smoke', () => {
  const testModuleId = 'mod-xyz';

  test('lists all materials for a class', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        materials: [
          { materialId: 'mat-1', moduleId: testModuleId, title: 'Lecture Slides', type: 'link' },
          { materialId: 'mat-2', moduleId: null, title: 'Handout', type: 'document' }
        ]
      })
    });

    const res = await request(app).get(`/api/teacher/classes/${classId.toHexString()}/materials`);

    expect(res.status).toBe(200);
    expect(res.body.materials).toHaveLength(2);
  });

  test('filters materials by moduleId when query param provided', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        materials: [
          { materialId: 'mat-1', moduleId: testModuleId, title: 'Lecture Slides', type: 'link' },
          { materialId: 'mat-2', moduleId: null, title: 'Handout', type: 'document' }
        ]
      })
    });

    const res = await request(app)
      .get(`/api/teacher/classes/${classId.toHexString()}/materials?moduleId=${testModuleId}`);

    expect(res.status).toBe(200);
    expect(res.body.materials).toHaveLength(1);
    expect(res.body.materials[0].materialId).toBe('mat-1');
  });

  test('adds a link material tied to a module', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        modules: [{ moduleId: testModuleId, title: 'Week 1', order: 0 }],
        materials: []
      })
    });

    const res = await request(app)
      .post(`/api/teacher/classes/${classId.toHexString()}/materials`)
      .send({ title: 'Course Syllabus', type: 'link', url: 'https://example.com/syllabus', moduleId: testModuleId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.material.title).toBe('Course Syllabus');
    expect(res.body.material.moduleId).toBe(testModuleId);
    expect(collections.classesCollection._classDocs[0].materials).toHaveLength(1);
  });

  test('rejects material with invalid URL scheme', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ modules: [], materials: [] })
    });

    const res = await request(app)
      .post(`/api/teacher/classes/${classId.toHexString()}/materials`)
      .send({ title: 'Bad Link', type: 'link', url: 'javascript:alert(1)' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects material referencing a non-existent module', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ modules: [], materials: [] })
    });

    const res = await request(app)
      .post(`/api/teacher/classes/${classId.toHexString()}/materials`)
      .send({ title: 'Linked Material', type: 'note', moduleId: 'nonexistent-module' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('deletes a material by materialId', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        materials: [
          { materialId: 'mat-to-delete', moduleId: null, title: 'Old Resource', type: 'note' }
        ]
      })
    });

    const res = await request(app)
      .delete(`/api/teacher/classes/${classId.toHexString()}/materials/mat-to-delete`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(collections.classesCollection._classDocs[0].materials).toHaveLength(0);
  });

  test('updates material metadata and hidden flag', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        modules: [{ moduleId: testModuleId, title: 'Week 1', order: 0 }],
        materials: [
          { materialId: 'mat-edit', moduleId: null, title: 'Old Resource', type: 'note', description: '', hidden: false, order: 0 }
        ]
      })
    });

    const res = await request(app)
      .put(`/api/teacher/classes/${classId.toHexString()}/materials/mat-edit`)
      .send({
        title: 'Updated Resource',
        type: 'document',
        url: 'https://example.com/resource',
        description: 'Reference copy',
        moduleId: testModuleId,
        hidden: true
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.material.title).toBe('Updated Resource');
    expect(res.body.material.hidden).toBe(true);
    expect(collections.classesCollection._classDocs[0].materials[0].moduleId).toBe(testModuleId);
  });

  test('reorders materials atomically and normalizes order values', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        materials: [
          { materialId: 'mat-1', moduleId: null, title: 'One', type: 'note', order: 0 },
          { materialId: 'mat-2', moduleId: null, title: 'Two', type: 'note', order: 7 },
          { materialId: 'mat-3', moduleId: null, title: 'Three', type: 'note', order: 8 }
        ]
      })
    });

    const res = await request(app)
      .put(`/api/teacher/classes/${classId.toHexString()}/materials/reorder`)
      .send({ materialIds: ['mat-2', 'mat-3', 'mat-1'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.materials.map((item) => item.materialId)).toEqual(['mat-2', 'mat-3', 'mat-1']);
    expect(res.body.materials.map((item) => item.order)).toEqual([0, 1, 2]);
    expect(collections.classesCollection._classDocs[0].materials.map((item) => item.order)).toEqual([0, 1, 2]);
  });

  test('uploads a document material with file metadata', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        modules: [{ moduleId: testModuleId, title: 'Week 1', order: 0 }],
        materials: []
      })
    });

    const res = await request(app)
      .post(`/api/teacher/classes/${classId.toHexString()}/materials/upload`)
      .field('title', 'Lecture Deck')
      .field('type', 'document')
      .field('description', 'Uploaded lecture slides')
      .field('moduleId', testModuleId)
      .attach('file', Buffer.from('pdf-bytes'), { filename: 'lecture.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.material.file.originalName).toBe('lecture.pdf');
    expect(res.body.material.file.downloadUrl).toContain('signed.example');
    expect(collections.classesCollection._classDocs[0].materials).toHaveLength(1);
    expect(collections.classesCollection._classDocs[0].materials[0].file.storageKey).toContain('class-materials/mock');
  });

  test('replaces an uploaded material file', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        materials: [
          {
            materialId: 'mat-upload',
            moduleId: null,
            title: 'Upload Me',
            type: 'document',
            order: 0,
            file: {
              storageKey: 'class-materials/old.pdf',
              originalName: 'old.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 20,
              uploadedAt: new Date('2026-03-01T00:00:00.000Z'),
              uploadedByUserId: teacherId.toHexString()
            }
          }
        ]
      })
    });

    const res = await request(app)
      .post(`/api/teacher/classes/${classId.toHexString()}/materials/mat-upload/upload`)
      .attach('file', Buffer.from('new-bytes'), { filename: 'new.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.material.file.originalName).toBe('new.pdf');
    expect(collections.classesCollection._classDocs[0].materials[0].file.originalName).toBe('new.pdf');
  });

  test('removes an uploaded material file without deleting the material', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        materials: [
          {
            materialId: 'mat-file-remove',
            moduleId: null,
            title: 'Uploaded Material',
            type: 'file',
            order: 0,
            file: {
              storageKey: 'class-materials/existing.zip',
              originalName: 'existing.zip',
              mimeType: 'application/zip',
              sizeBytes: 42,
              uploadedAt: new Date('2026-03-01T00:00:00.000Z'),
              uploadedByUserId: teacherId.toHexString()
            }
          }
        ]
      })
    });

    const res = await request(app)
      .delete(`/api/teacher/classes/${classId.toHexString()}/materials/mat-file-remove/file`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(collections.classesCollection._classDocs[0].materials[0].file).toBeNull();
  });

  test('returns 404 when deleting a non-existent material', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ materials: [] })
    });

    const res = await request(app)
      .delete(`/api/teacher/classes/${classId.toHexString()}/materials/nonexistent`);

    expect(res.status).toBe(404);
  });

  test('viewer cannot update material metadata', async () => {
    const viewerId = new ObjectId('507f1f77bcf86cd799439055');
    const { app } = buildApp({
      sessionData: { userId: viewerId.toHexString(), role: 'teacher', studentIDNumber: '2024-00055' },
      classDoc: makeBaseClassDoc({
        instructorId: teacherId,
        createdBy: teacherId,
        teachingTeam: [{ userId: viewerId, role: 'viewer', status: 'active' }],
        materials: [{ materialId: 'mat-view', moduleId: null, title: 'Read Only', type: 'note', order: 0 }]
      })
    });

    const res = await request(app)
      .put(`/api/teacher/classes/${classId.toHexString()}/materials/mat-view`)
      .send({ title: 'Should Fail', type: 'note' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Settings tests
// ---------------------------------------------------------------------------

describe('teacher class settings api smoke', () => {
  test('loads class settings', async () => {
    const { app } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({
        status: 'draft',
        classCode: 'C000111',
        selfEnrollmentEnabled: false,
        settings: {
          discussionEnabled: false,
          lateSubmissionPolicy: 'deny',
          gradeVisibility: 'hidden'
        }
      })
    });

    const res = await request(app)
      .get(`/api/teacher/classes/${classId.toHexString()}/settings`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.classItem.classCode).toBe('C000111');
    expect(res.body.settings.selfEnrollmentEnabled).toBe(false);
    expect(res.body.settings.discussionEnabled).toBe(false);
  });

  test('updates class settings', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ settings: {}, selfEnrollmentEnabled: true })
    });

    const res = await request(app)
      .put(`/api/teacher/classes/${classId.toHexString()}/settings`)
      .send({
        selfEnrollmentEnabled: false,
        discussionEnabled: false,
        lateSubmissionPolicy: 'deny',
        gradeVisibility: 'hidden'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stored = collections.classesCollection._classDocs[0];
    expect(stored.selfEnrollmentEnabled).toBe(false);
    expect(stored.settings.discussionEnabled).toBe(false);
    expect(stored.settings.lateSubmissionPolicy).toBe('deny');
    expect(stored.settings.gradeVisibility).toBe('hidden');
  });

  test('defaults invalid lateSubmissionPolicy to existing value', async () => {
    const { app, collections } = buildApp({
      sessionData: { userId: teacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00001' },
      classDoc: makeBaseClassDoc({ settings: { lateSubmissionPolicy: 'penalize', gradeVisibility: 'after_review' } })
    });

    const res = await request(app)
      .put(`/api/teacher/classes/${classId.toHexString()}/settings`)
      .send({ lateSubmissionPolicy: 'invalidvalue' });

    expect(res.status).toBe(200);
    expect(collections.classesCollection._classDocs[0].settings.lateSubmissionPolicy).toBe('penalize');
  });

  test('co-teacher can update class settings but viewer cannot', async () => {
    const coTeacherId = new ObjectId('507f1f77bcf86cd799439066');
    const viewerId = new ObjectId('507f1f77bcf86cd799439067');

    const coTeacherApp = buildApp({
      sessionData: { userId: coTeacherId.toHexString(), role: 'teacher', studentIDNumber: '2024-00066' },
      classDoc: makeBaseClassDoc({
        instructorId: teacherId,
        createdBy: teacherId,
        teachingTeam: [{ userId: coTeacherId, role: 'co_teacher', status: 'active' }],
        settings: {}
      })
    });

    const coTeacherRes = await request(coTeacherApp.app)
      .put(`/api/teacher/classes/${classId.toHexString()}/settings`)
      .send({ selfEnrollmentEnabled: false });

    expect(coTeacherRes.status).toBe(200);

    const viewerApp = buildApp({
      sessionData: { userId: viewerId.toHexString(), role: 'teacher', studentIDNumber: '2024-00067' },
      classDoc: makeBaseClassDoc({
        instructorId: teacherId,
        createdBy: teacherId,
        teachingTeam: [{ userId: viewerId, role: 'viewer', status: 'active' }],
        settings: {}
      })
    });

    const viewerRes = await request(viewerApp.app)
      .put(`/api/teacher/classes/${classId.toHexString()}/settings`)
      .send({ selfEnrollmentEnabled: false });

    expect(viewerRes.status).toBe(403);
  });
});
