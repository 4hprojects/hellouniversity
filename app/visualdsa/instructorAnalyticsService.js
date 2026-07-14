const { ObjectId } = require('mongodb');

function accessDenied() {
  throw Object.assign(new Error('Class access denied.'), { code: 'CLASS_ACCESS_DENIED' });
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
const ASSIGNMENT_TEMPLATES = Object.freeze({
  arrays: ['array-insert-v1'], stacks: ['stack-operation-sequence-v1'], queues: ['queue-operation-sequence-v1'],
  'binary-search': ['binary-search-step-sequence-v1'],
  sorting: ['bubble-sort-full-trace-v1', 'selection-sort-full-trace-v1', 'insertion-sort-full-trace-v1'],
  bst: ['bst-insert-one-v1', 'bst-traversal-v1']
});

function invalidInput(message) {
  throw Object.assign(new TypeError(message), { code: 'INVALID_INPUT' });
}

function createInstructorAnalyticsService({ getClassesCollection, repository }) {
  if (typeof getClassesCollection !== 'function' || !repository?.overview || !repository?.student) {
    throw new TypeError('A classes collection provider and instructor analytics repository are required.');
  }

  async function authorizedClass(identity, classId) {
    if (!identity?.userId || !['teacher', 'admin'].includes(identity.role) || !ObjectId.isValid(classId)) accessDenied();
    const collection = getClassesCollection();
    if (!collection) throw Object.assign(new Error('Class storage is unavailable.'), { code: 'CLASS_STORAGE_UNAVAILABLE' });
    const row = await collection.findOne({ _id: new ObjectId(classId) });
    if (!row) accessDenied();
    const owner = String(row.instructorId || row.teacherId || '') === identity.userId;
    const activeTeamMember = Array.isArray(row.teachingTeam) && row.teachingTeam.some((member) =>
      String(member.userId || '') === identity.userId && member.status === 'active');
    if (identity.role !== 'admin' && !owner && !activeTeamMember) accessDenied();
    return {
      id: String(row._id),
      name: row.className || row.name || 'Class',
      code: row.classCode || row.code || '',
      studentIds: [...new Set((row.students || []).map(String))]
    };
  }

  async function overview(identity, classId) {
    return repository.overview(await authorizedClass(identity, classId));
  }

  return Object.freeze({
    overview,
    async student(identity, classId, studentId) {
      const classItem = await authorizedClass(identity, classId);
      if (!classItem.studentIds.includes(String(studentId))) accessDenied();
      return repository.student(classItem, String(studentId));
    },
    async exportCsv(identity, classId) {
      const data = await overview(identity, classId);
      const rows = [['module', 'started', 'completed', 'average_mastery', 'interventions']];
      data.modules.forEach((moduleItem) => rows.push([
        moduleItem.moduleKey,
        moduleItem.started,
        moduleItem.completed,
        moduleItem.averageMastery,
        moduleItem.interventions
      ]));
      return `${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
    },
    async createAssignment(identity, classId, request = {}) {
      const classItem = await authorizedClass(identity, classId);
      const moduleKey = String(request.moduleKey || '');
      const templateKey = String(request.templateKey || '');
      const title = String(request.title || '').trim();
      const attemptLimit = Number(request.attemptLimit);
      const timeLimitMinutes = Number(request.timeLimitMinutes || 0);
      const availableFrom = request.availableFrom ? new Date(request.availableFrom) : null;
      const availableUntil = request.availableUntil ? new Date(request.availableUntil) : null;
      if (!ASSIGNMENT_TEMPLATES[moduleKey]?.includes(templateKey)) invalidInput('Invalid module or problem template.');
      if (title.length < 3 || title.length > 120) invalidInput('Title must contain 3 to 120 characters.');
      if (!Number.isInteger(attemptLimit) || attemptLimit < 1 || attemptLimit > 5) invalidInput('Attempt limit must be from 1 to 5.');
      if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 0 || timeLimitMinutes > 180) invalidInput('Time limit must be from 0 to 180 minutes.');
      if ((availableFrom && Number.isNaN(availableFrom.getTime())) || (availableUntil && Number.isNaN(availableUntil.getTime()))) invalidInput('Availability dates are invalid.');
      if (availableFrom && availableUntil && availableUntil <= availableFrom) invalidInput('Closing time must be after opening time.');
      return repository.createAssignment({
        classItem, identity, moduleKey, templateKey, title, attemptLimit, timeLimitMinutes,
        availableFrom: availableFrom?.toISOString() || null, availableUntil: availableUntil?.toISOString() || null
      });
    }
  });
}

module.exports = { ASSIGNMENT_TEMPLATES, createInstructorAnalyticsService };
