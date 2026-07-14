const { ObjectId } = require('mongodb');
const { createInstructorAnalyticsService } = require('../../app/visualdsa/instructorAnalyticsService');

const instructorId = new ObjectId('507f1f77bcf86cd799439011');
const classId = new ObjectId();
const collection = {
  findOne: jest.fn(async () => ({
    _id: classId,
    instructorId,
    className: 'Algorithms',
    students: ['s1']
  }))
};
const repository = {
  overview: jest.fn(async (classItem) => ({
    classItem,
    modules: [{ moduleKey: 'arrays', started: 2, completed: 1, averageMastery: 75, interventions: 1 }]
  })),
  student: jest.fn(async (_classItem, studentId) => ({ studentId })),
  createAssignment: jest.fn(async (input) => ({ assignmentId: 'a1', ...input }))
};

describe('instructor analytics authorization', () => {
  test('allows the class owner and an enrolled-student drill-down', async () => {
    const service = createInstructorAnalyticsService({ getClassesCollection: () => collection, repository });
    const identity = { userId: String(instructorId), role: 'teacher' };
    expect((await service.overview(identity, String(classId))).classItem.id).toBe(String(classId));
    expect((await service.student(identity, String(classId), 's1')).studentId).toBe('s1');
  });

  test('blocks another teacher, invalid classes, and non-enrolled drill-down', async () => {
    const service = createInstructorAnalyticsService({ getClassesCollection: () => collection, repository });
    await expect(service.overview({ userId: '507f191e810c19729de860ea', role: 'teacher' }, String(classId)))
      .rejects.toMatchObject({ code: 'CLASS_ACCESS_DENIED' });
    await expect(service.overview({ userId: String(instructorId), role: 'teacher' }, 'invalid'))
      .rejects.toMatchObject({ code: 'CLASS_ACCESS_DENIED' });
    await expect(service.student({ userId: String(instructorId), role: 'teacher' }, String(classId), 'other'))
      .rejects.toMatchObject({ code: 'CLASS_ACCESS_DENIED' });
  });

  test('exports authorized summaries as standards-compatible CSV', async () => {
    const service = createInstructorAnalyticsService({ getClassesCollection: () => collection, repository });
    const csv = await service.exportCsv({ userId: String(instructorId), role: 'teacher' }, String(classId));
    expect(csv).toBe('module,started,completed,average_mastery,interventions\r\narrays,2,1,75,1\r\n');
  });
  test('validates and publishes an assessment only for an authorized class', async () => {
    const service=createInstructorAnalyticsService({getClassesCollection:()=>collection,repository});const identity={userId:String(instructorId),role:'teacher'};
    const result=await service.createAssignment(identity,String(classId),{title:'Pilot Arrays',moduleKey:'arrays',templateKey:'array-insert-v1',attemptLimit:2,timeLimitMinutes:30});
    expect(result.assignmentId).toBe('a1');expect(repository.createAssignment).toHaveBeenCalledWith(expect.objectContaining({classItem:expect.objectContaining({id:String(classId)}),identity,attemptLimit:2}));
    await expect(service.createAssignment(identity,String(classId),{title:'x',moduleKey:'arrays',templateKey:'bst-insert-one-v1',attemptLimit:9})).rejects.toMatchObject({code:'INVALID_INPUT'});
  });
});
