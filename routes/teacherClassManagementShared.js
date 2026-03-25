const {
  toIdString,
  normalizeTeamRole,
  resolveClassRole,
  buildTeacherClassPermissions
} = require('../utils/classRolePermissions');

function createTeacherClassManagementShared({
  getClassesCollection,
  getCountersCollection,
  getUsersCollection,
  getLogsCollection,
  getQuizzesCollection,
  getAttemptsCollection,
  getClassQuizCollection,
  getClassAnnouncementsCollection,
  ObjectId
}) {
  function getDeps(res) {
    const classesCollection = getClassesCollection();
    const countersCollection = getCountersCollection();
    const usersCollection = getUsersCollection();
    const logsCollection = getLogsCollection();
    const quizzesCollection = typeof getQuizzesCollection === 'function' ? getQuizzesCollection() : null;
    const attemptsCollection = typeof getAttemptsCollection === 'function' ? getAttemptsCollection() : null;
    const classQuizCollection = typeof getClassQuizCollection === 'function' ? getClassQuizCollection() : null;
    const classAnnouncementsCollection = typeof getClassAnnouncementsCollection === 'function' ? getClassAnnouncementsCollection() : null;

    if (!classesCollection || !countersCollection || !usersCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }

    return {
      classesCollection,
      countersCollection,
      usersCollection,
      logsCollection,
      quizzesCollection,
      attemptsCollection,
      classQuizCollection,
      classAnnouncementsCollection
    };
  }

  function isAdminSession(req) {
    return req.session?.role === 'admin';
  }

  function getTeacherFilter(req) {
    if (isAdminSession(req)) {
      return {};
    }

    const userId = new ObjectId(req.session.userId);
    return {
      $or: [
        { instructorId: userId },
        {
          teachingTeam: {
            $elemMatch: {
              userId,
              status: 'active'
            }
          }
        }
      ]
    };
  }

  function normalizeClassStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['draft', 'active', 'archived'].includes(normalized)) {
      return normalized;
    }
    return 'active';
  }

  function normalizeTermSystem(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['semester', 'trimester', 'quarter'].includes(normalized)) {
      return normalized;
    }
    return '';
  }

  function normalizeScheduleDayCodes(value) {
    const allowed = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const values = Array.isArray(value)
      ? value
      : String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

    return [...new Set(values.map((item) => String(item || '').trim().toUpperCase()).filter((item) => allowed.includes(item)))];
  }

  function scheduleDayCodesToText(dayCodes) {
    const map = {
      SUN: 'Sun',
      MON: 'Mon',
      TUE: 'Tue',
      WED: 'Wed',
      THU: 'Thu',
      FRI: 'Fri',
      SAT: 'Sat'
    };

    return dayCodes.map((item) => map[item]).filter(Boolean).join(' / ');
  }

  function buildScheduleTimeText(from, to) {
    if (from && to) {
      return `${from} - ${to}`;
    }
    return from || to || '';
  }

  function normalizeStudentIds(value) {
    const rawStudentIds = Array.isArray(value)
      ? value
      : String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

    return [...new Set(rawStudentIds.filter((item) => /^\d{7,8}$/.test(item)))];
  }

  function normalizeTeachingTeamRole(value, fallback = 'co_teacher') {
    const normalized = normalizeTeamRole(value);
    if (normalized) {
      return normalized;
    }
    return fallback;
  }

  function normalizeTeachingTeamIdentifiers(value) {
    const identifiers = Array.isArray(value)
      ? value
      : String(value || '')
          .split(/[\n,]+/)
          .map((item) => item.trim())
          .filter(Boolean);

    return [...new Set(identifiers)];
  }

  function normalizeArchiveReason(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if ([
      'term_completed',
      'class_merged',
      'schedule_replaced',
      'duplicate_or_error',
      'draft_not_used',
      'other'
    ].includes(normalized)) {
      return normalized;
    }
    return '';
  }

  function normalizeRestoreReason(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if ([
      'class_active_again',
      'archived_by_mistake',
      'term_reopened',
      'students_need_access',
      'content_still_needed',
      'other'
    ].includes(normalized)) {
      return normalized;
    }
    return '';
  }

  function isStudentIdIdentifier(value) {
    return /^\d{7,8}$/.test(String(value || '').trim());
  }

  function isEmailIdentifier(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildOwnerTeachingTeamEntry(user, actingUserId, fallbackTimestamp) {
    const userId = user?._id || actingUserId;
    return {
      userId,
      studentIDNumber: user?.studentIDNumber || '',
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Teacher',
      emaildb: user?.emaildb || '',
      role: 'owner',
      status: 'active',
      addedAt: fallbackTimestamp || new Date(),
      addedBy: actingUserId
    };
  }

  function getStoredTeachingTeam(classDoc) {
    const existingTeam = Array.isArray(classDoc.teachingTeam) ? classDoc.teachingTeam : [];
    const normalizedTeam = [];
    const seen = new Set();
    const ownerId = toIdString(classDoc.instructorId);

    if (ownerId) {
      normalizedTeam.push({
        userId: classDoc.instructorId,
        studentIDNumber: classDoc.instructorIDNumber || '',
        name: classDoc.instructorName || 'Teacher',
        emaildb: classDoc.instructorEmail || '',
        role: 'owner',
        status: 'active',
        addedAt: classDoc.createdAt || new Date(),
        addedBy: classDoc.createdBy || classDoc.instructorId
      });
      seen.add(ownerId);
    }

    existingTeam.forEach((member) => {
      const memberId = toIdString(member?.userId);
      if (!memberId || seen.has(memberId)) {
        return;
      }

      normalizedTeam.push({
        userId: ObjectId.isValid(memberId) ? new ObjectId(memberId) : member.userId,
        studentIDNumber: member.studentIDNumber || '',
        name: member.name || '',
        emaildb: member.emaildb || '',
        role: normalizeTeachingTeamRole(member.role),
        status: String(member.status || 'active').trim().toLowerCase() === 'removed' ? 'removed' : 'active',
        addedAt: member.addedAt || classDoc.updatedAt || classDoc.createdAt || new Date(),
        addedBy: member.addedBy || classDoc.createdBy || classDoc.instructorId
      });
      seen.add(memberId);
    });

    return normalizedTeam;
  }

  function getActiveTeachingTeam(classDoc) {
    return getStoredTeachingTeam(classDoc)
      .filter((member) => member.status === 'active')
      .sort((left, right) => {
        if (left.role === 'owner') return -1;
        if (right.role === 'owner') return 1;
        return String(left.name || '').localeCompare(String(right.name || ''));
      });
  }

  function serializeTeachingTeamMember(member) {
    return {
      userId: toIdString(member.userId),
      studentIDNumber: member.studentIDNumber || '',
      name: member.name || 'Teacher',
      emaildb: member.emaildb || '',
      role: normalizeTeachingTeamRole(member.role),
      status: member.status || 'active',
      addedAt: member.addedAt || null,
      addedBy: toIdString(member.addedBy)
    };
  }

  function serializeClassSummary(classDoc) {
    const activeTeachingTeam = getActiveTeachingTeam(classDoc);
    return {
      ...classDoc,
      _id: toIdString(classDoc._id),
      instructorId: toIdString(classDoc.instructorId),
      createdBy: toIdString(classDoc.createdBy),
      status: classDoc.status || 'active',
      studentCount: Array.isArray(classDoc.students) ? classDoc.students.length : 0,
      teamCount: activeTeachingTeam.length
    };
  }

  function getClassAccess(req, classDoc) {
    const currentRole = resolveClassRole(req, classDoc);
    const permissions = buildTeacherClassPermissions(currentRole);
    return {
      currentRole,
      permissions
    };
  }

  function canManageTeachingTeam(req, classDoc) {
    return getClassAccess(req, classDoc).permissions.canManageTeam;
  }

  function sanitizeClassPayload(body = {}) {
    const scheduleDayCodes = normalizeScheduleDayCodes(body.scheduleDayCodes);
    const scheduleTimeFrom = String(body.scheduleTimeFrom || '').trim();
    const scheduleTimeTo = String(body.scheduleTimeTo || '').trim();

    return {
      className: String(body.className || '').trim(),
      courseCode: String(body.courseCode || '').trim(),
      termSystem: normalizeTermSystem(body.termSystem),
      academicTerm: String(body.academicTerm || '').trim(),
      section: String(body.section || '').trim(),
      subjectDescription: String(body.subjectDescription || '').trim(),
      scheduleDayCodes,
      scheduleDays: scheduleDayCodesToText(scheduleDayCodes),
      scheduleTimeFrom,
      scheduleTimeTo,
      scheduleTime: buildScheduleTimeText(scheduleTimeFrom, scheduleTimeTo),
      room: String(body.room || '').trim(),
      description: String(body.description || '').trim(),
      status: normalizeClassStatus(body.status),
      selfEnrollmentEnabled: body.selfEnrollmentEnabled !== false
    };
  }

  async function buildClassCode(countersCollection, classesCollection) {
    const MAX_TRIES = 1000;

    for (let index = 0; index < MAX_TRIES; index += 1) {
      const result = await countersCollection.findOneAndUpdate(
        { _id: 'classCode' },
        { $inc: { nextVal: 1 } },
        { returnDocument: 'after', upsert: true }
      );

      const nextVal = result.value ? result.value.nextVal : 1;
      const candidateCode = `C${Number(nextVal).toString(16).toUpperCase().padStart(6, '0')}`;
      const existing = await classesCollection.findOne({ classCode: candidateCode });
      if (!existing) {
        return candidateCode;
      }
    }

    throw new Error('Could not generate unique class code.');
  }

  async function writeLog(logsCollection, req, action, details) {
    if (!logsCollection) return;

    await logsCollection.insertOne({
      user_name: `${req.session.firstName || ''} ${req.session.lastName || ''}`.trim() || req.session.studentIDNumber || 'Unknown User',
      user_role: req.session.role || 'teacher',
      studentIDNumber: req.session.studentIDNumber || null,
      action,
      details,
      timestamp: new Date()
    });
  }

  async function loadOwnedClass(req, res, classesCollection, classId) {
    if (!ObjectId.isValid(classId)) {
      res.status(400).json({ success: false, message: 'Invalid class id.' });
      return null;
    }

    const filter = {
      _id: new ObjectId(classId),
      ...getTeacherFilter(req)
    };

    const classDoc = await classesCollection.findOne(filter);
    if (!classDoc) {
      res.status(404).json({ success: false, message: 'Class not found.' });
      return null;
    }

    return classDoc;
  }

  return {
    getDeps,
    isAdminSession,
    getTeacherFilter,
    normalizeStudentIds,
    normalizeTeachingTeamRole,
    normalizeTeachingTeamIdentifiers,
    normalizeArchiveReason,
    normalizeRestoreReason,
    isStudentIdIdentifier,
    isEmailIdentifier,
    escapeRegex,
    toIdString,
    buildOwnerTeachingTeamEntry,
    getStoredTeachingTeam,
    getActiveTeachingTeam,
    serializeTeachingTeamMember,
    serializeClassSummary,
    getClassAccess,
    canManageTeachingTeam,
    sanitizeClassPayload,
    buildClassCode,
    writeLog,
    loadOwnedClass
  };
}

module.exports = createTeacherClassManagementShared;
