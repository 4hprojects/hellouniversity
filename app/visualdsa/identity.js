const MONGO_OBJECT_ID = /^[a-f0-9]{24}$/i;

function normalizeTextId(value, fieldName, maximumLength = 128) {
  const normalized = String(value || '').trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new TypeError(`${fieldName} is required and must not exceed ${maximumLength} characters.`);
  }
  return normalized;
}

function getVisualDsaStudentIdentity(req) {
  if (!req?.session?.userId || req.session.role !== 'student') {
    throw new TypeError('An authenticated student session is required.');
  }
  return Object.freeze({
    userId: normalizeTextId(req.session.userId, 'userId'),
    studentId: normalizeTextId(req.session.studentIDNumber, 'studentIDNumber')
  });
}

function getVisualDsaInstructorIdentity(req) {
  if (!req?.session?.userId || !['teacher', 'admin'].includes(req.session.role)) {
    throw new TypeError('An authenticated instructor session is required.');
  }
  return Object.freeze({
    userId: normalizeTextId(req.session.userId, 'userId'),
    role: req.session.role
  });
}

function normalizeClassId(value) {
  const classId = normalizeTextId(value, 'classId', 24);
  if (!MONGO_OBJECT_ID.test(classId)) throw new TypeError('classId must be a MongoDB ObjectId hex string.');
  return classId.toLowerCase();
}

module.exports = {
  getVisualDsaStudentIdentity,
  getVisualDsaInstructorIdentity,
  normalizeClassId,
  normalizeTextId
};
