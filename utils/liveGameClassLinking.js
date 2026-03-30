function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function isActiveClassStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === '' || normalized === 'active';
}

function buildAccessibleClassFilter({ ObjectId, userId, role }) {
  if (role === 'admin') {
    return {};
  }

  if (!userId || !ObjectId?.isValid?.(userId)) {
    return { _id: null };
  }

  const actorId = new ObjectId(userId);
  return {
    $or: [
      { instructorId: actorId },
      {
        teachingTeam: {
          $elemMatch: {
            userId: actorId,
            status: 'active'
          }
        }
      }
    ]
  };
}

function normalizeLinkedClassSnapshot(classDoc) {
  if (!classDoc) return null;

  return {
    classId: toIdString(classDoc._id),
    classCode: String(classDoc.classCode || '').trim(),
    className: String(classDoc.className || '').trim()
  };
}

function normalizeAllowedStudentIds(classDoc) {
  const rawStudentIds = Array.isArray(classDoc?.students) ? classDoc.students : [];
  return [...new Set(
    rawStudentIds
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )];
}

async function resolveLinkedClassSelection({
  classesCollection,
  ObjectId,
  linkedClassId,
  userId,
  role
}) {
  const normalizedLinkedClassId = String(linkedClassId || '').trim();
  if (!normalizedLinkedClassId) {
    return {
      linkedClass: null,
      allowedStudentIds: []
    };
  }

  if (!classesCollection) {
    const error = new Error('Class data is unavailable right now.');
    error.statusCode = 503;
    throw error;
  }

  if (!ObjectId?.isValid?.(normalizedLinkedClassId)) {
    const error = new Error('Invalid class selection.');
    error.statusCode = 400;
    throw error;
  }

  const classObjectId = new ObjectId(normalizedLinkedClassId);
  const classDoc = await classesCollection.findOne({ _id: classObjectId });
  if (!classDoc) {
    const error = new Error('Selected class was not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!isActiveClassStatus(classDoc.status)) {
    const error = new Error('Only active classes can be linked to ClassRush.');
    error.statusCode = 400;
    throw error;
  }

  if (role !== 'admin') {
    const accessFilter = buildAccessibleClassFilter({ ObjectId, userId, role });
    const accessibleClassDoc = await classesCollection.findOne({
      _id: classObjectId,
      ...accessFilter
    });

    if (!accessibleClassDoc) {
      const error = new Error('You do not have access to the selected class.');
      error.statusCode = 403;
      throw error;
    }
  }

  return {
    classDoc,
    linkedClass: normalizeLinkedClassSnapshot(classDoc),
    allowedStudentIds: normalizeAllowedStudentIds(classDoc)
  };
}

module.exports = {
  buildAccessibleClassFilter,
  isActiveClassStatus,
  normalizeAllowedStudentIds,
  normalizeLinkedClassSnapshot,
  resolveLinkedClassSelection,
  toIdString
};
