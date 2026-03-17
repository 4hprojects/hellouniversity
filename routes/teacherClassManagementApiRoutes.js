const express = require('express');

function createTeacherClassManagementApiRoutes({
  getClassesCollection,
  getCountersCollection,
  getUsersCollection,
  getLogsCollection,
  ObjectId,
  isAuthenticated,
  isTeacherOrAdmin
}) {
  const router = express.Router();

  function getDeps(res) {
    const classesCollection = getClassesCollection();
    const countersCollection = getCountersCollection();
    const usersCollection = getUsersCollection();
    const logsCollection = getLogsCollection();

    if (!classesCollection || !countersCollection || !usersCollection) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }

    return {
      classesCollection,
      countersCollection,
      usersCollection,
      logsCollection
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
    const normalized = String(value || '').trim().toLowerCase();
    if (['owner', 'co_teacher', 'teaching_assistant', 'viewer'].includes(normalized)) {
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

  function toIdString(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value.toHexString === 'function') return value.toHexString();
    return String(value);
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

  function canManageTeachingTeam(req, classDoc) {
    if (isAdminSession(req)) {
      return true;
    }

    return toIdString(classDoc.instructorId) === String(req.session.userId || '');
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

  router.get('/', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection } = deps;

    try {
      const query = String(req.query.query || '').trim();
      const status = String(req.query.status || '').trim().toLowerCase();
      const filter = { ...getTeacherFilter(req) };

      if (status === 'active') {
        filter.$or = [{ status: 'active' }, { status: { $exists: false } }];
      } else if (status === 'draft' || status === 'archived') {
        filter.status = status;
      }

      if (query) {
        filter.$and = [
          ...(filter.$and || []),
          {
            $or: [
              { className: { $regex: query, $options: 'i' } },
              { courseCode: { $regex: query, $options: 'i' } },
              { section: { $regex: query, $options: 'i' } },
              { academicTerm: { $regex: query, $options: 'i' } },
              { classCode: { $regex: query, $options: 'i' } }
            ]
          }
        ];
      }

      const classes = await classesCollection
        .find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .toArray();

      return res.json({
        success: true,
        classes: classes.map((classDoc) => serializeClassSummary(classDoc))
      });
    } catch (error) {
      console.error('Error loading teacher classes:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, countersCollection, usersCollection, logsCollection } = deps;

    try {
      const payload = sanitizeClassPayload(req.body);

      if (!payload.className || !payload.courseCode) {
        return res.status(400).json({ success: false, message: 'Class name and course code are required.' });
      }

      const teacher = await usersCollection.findOne(
        { _id: new ObjectId(req.session.userId) },
        { projection: { firstName: 1, lastName: 1, studentIDNumber: 1, emaildb: 1 } }
      );

      const classCode = await buildClassCode(countersCollection, classesCollection);
      const createdBy = new ObjectId(req.session.userId);
      const now = new Date();
      const newClass = {
        ...payload,
        classCode,
        instructorIDNumber: teacher?.studentIDNumber || req.session.studentIDNumber || '',
        instructorName: `${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim() || 'Teacher',
        instructorEmail: teacher?.emaildb || '',
        instructorId: createdBy,
        createdBy,
        teachingTeam: [buildOwnerTeachingTeamEntry(teacher, createdBy, now)],
        students: [],
        createdAt: now,
        updatedAt: now,
        publishedAt: payload.status === 'active' ? now : null,
        archivedAt: payload.status === 'archived' ? now : null
      };

      const result = await classesCollection.insertOne(newClass);
      await writeLog(logsCollection, req, 'CLASS_CREATED', `Created class ${newClass.className} (${classCode})`);

      return res.status(201).json({
        success: true,
        classId: result.insertedId,
        classCode,
        message: 'Class created successfully.'
      });
    } catch (error) {
      console.error('Error creating teacher class:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/:classId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const classDoc = await loadOwnedClass(req, res, deps.classesCollection, req.params.classId);
      if (!classDoc) return;

      return res.json({
        success: true,
        classItem: serializeClassSummary(classDoc)
      });
    } catch (error) {
      console.error('Error fetching class details:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/:classId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      const payload = sanitizeClassPayload(req.body);
      if (!payload.className || !payload.courseCode) {
        return res.status(400).json({ success: false, message: 'Class name and course code are required.' });
      }

      const nextStatus = payload.status;
      const updateFields = {
        ...payload,
        updatedAt: new Date()
      };

      if (nextStatus === 'active' && !classDoc.publishedAt) {
        updateFields.publishedAt = new Date();
      }
      if (nextStatus === 'archived') {
        updateFields.archivedAt = new Date();
      }
      if (nextStatus !== 'archived') {
        updateFields.archivedAt = null;
      }

      await classesCollection.updateOne(
        { _id: classDoc._id },
        { $set: updateFields }
      );

      await writeLog(logsCollection, req, 'CLASS_UPDATED', `Updated class ${payload.className} (${classDoc.classCode})`);
      return res.json({ success: true, message: 'Class updated successfully.' });
    } catch (error) {
      console.error('Error updating teacher class:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/generate-join-code', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, countersCollection, usersCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      const classCode = await buildClassCode(countersCollection, classesCollection);
      await classesCollection.updateOne(
        { _id: classDoc._id },
        { $set: { classCode, updatedAt: new Date() } }
      );

      await writeLog(logsCollection, req, 'CLASS_JOIN_CODE_REGENERATED', `Regenerated join code for ${classDoc.className} to ${classCode}`);
      return res.json({ success: true, classCode, message: 'Join code regenerated successfully.' });
    } catch (error) {
      console.error('Error regenerating join code:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/archive', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      const archivedReason = normalizeArchiveReason(req.body.reason);
      const archivedReasonOther = String(req.body.reasonOther || '').trim();
      if (!archivedReason) {
        return res.status(400).json({ success: false, message: 'Select a reason before archiving the class.' });
      }
      if (archivedReason === 'other' && !archivedReasonOther) {
        return res.status(400).json({ success: false, message: 'Enter the archive reason when selecting Other.' });
      }

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            status: 'archived',
            archivedAt: new Date(),
            archivedReason,
            archivedReasonOther: archivedReason === 'other' ? archivedReasonOther : '',
            updatedAt: new Date()
          }
        }
      );

      const reasonText = archivedReason === 'other' ? archivedReasonOther : archivedReason.replace(/_/g, ' ');
      await writeLog(logsCollection, req, 'CLASS_ARCHIVED', `Archived class ${classDoc.className} (${classDoc.classCode}) | Reason: ${reasonText}`);
      return res.json({ success: true, message: 'Class archived successfully.' });
    } catch (error) {
      console.error('Error archiving class:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/restore', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      const restoredReason = normalizeRestoreReason(req.body.reason);
      const restoredReasonOther = String(req.body.reasonOther || '').trim();
      if (!restoredReason) {
        return res.status(400).json({ success: false, message: 'Select a reason before restoring the class.' });
      }
      if (restoredReason === 'other' && !restoredReasonOther) {
        return res.status(400).json({ success: false, message: 'Enter the restore reason when selecting Other.' });
      }

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            status: 'active',
            archivedAt: null,
            archivedReason: '',
            archivedReasonOther: '',
            restoredAt: new Date(),
            restoredReason,
            restoredReasonOther: restoredReason === 'other' ? restoredReasonOther : '',
            updatedAt: new Date()
          }
        }
      );

      const reasonText = restoredReason === 'other' ? restoredReasonOther : restoredReason.replace(/_/g, ' ');
      await writeLog(logsCollection, req, 'CLASS_RESTORED', `Restored class ${classDoc.className} (${classDoc.classCode}) | Reason: ${reasonText}`);
      return res.json({ success: true, message: 'Class restored successfully.' });
    } catch (error) {
      console.error('Error restoring class:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/duplicate', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, countersCollection, usersCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      const actingTeacher = await usersCollection.findOne(
        { _id: new ObjectId(req.session.userId) },
        { projection: { firstName: 1, lastName: 1, studentIDNumber: 1, emaildb: 1 } }
      );
      const classCode = await buildClassCode(countersCollection, classesCollection);
      const now = new Date();
      const actingUserId = new ObjectId(req.session.userId);
      const duplicatedClass = {
        className: `${classDoc.className} Copy`,
        courseCode: classDoc.courseCode || '',
        academicTerm: classDoc.academicTerm || '',
        termSystem: classDoc.termSystem || '',
        section: classDoc.section || '',
        subjectDescription: classDoc.subjectDescription || '',
        scheduleDayCodes: Array.isArray(classDoc.scheduleDayCodes) ? classDoc.scheduleDayCodes : [],
        scheduleDays: classDoc.scheduleDays || '',
        scheduleTimeFrom: classDoc.scheduleTimeFrom || '',
        scheduleTimeTo: classDoc.scheduleTimeTo || '',
        scheduleTime: classDoc.scheduleTime || '',
        room: classDoc.room || '',
        description: classDoc.description || '',
        status: 'draft',
        selfEnrollmentEnabled: classDoc.selfEnrollmentEnabled !== false,
        classCode,
        instructorIDNumber: actingTeacher?.studentIDNumber || req.session.studentIDNumber || '',
        instructorName: `${actingTeacher?.firstName || ''} ${actingTeacher?.lastName || ''}`.trim() || classDoc.instructorName || 'Teacher',
        instructorEmail: actingTeacher?.emaildb || '',
        instructorId: actingUserId,
        createdBy: actingUserId,
        teachingTeam: [buildOwnerTeachingTeamEntry(actingTeacher, actingUserId, now)],
        students: [],
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        archivedAt: null
      };

      const result = await classesCollection.insertOne(duplicatedClass);
      await writeLog(logsCollection, req, 'CLASS_DUPLICATED', `Duplicated class ${classDoc.className} as ${duplicatedClass.className} (${classCode})`);

      return res.status(201).json({
        success: true,
        classId: result.insertedId,
        classCode,
        message: 'Class duplicated successfully.'
      });
    } catch (error) {
      console.error('Error duplicating class:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/:classId/students', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, usersCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      const studentIds = Array.isArray(classDoc.students) ? [...new Set(classDoc.students.filter(Boolean))] : [];
      if (studentIds.length === 0) {
        return res.json({ success: true, students: [] });
      }

      const users = await usersCollection
        .find(
          { studentIDNumber: { $in: studentIds } },
          { projection: { firstName: 1, lastName: 1, studentIDNumber: 1, emaildb: 1, createdAt: 1 } }
        )
        .toArray();

      const userMap = new Map(users.map((item) => [item.studentIDNumber, item]));
      const students = studentIds.map((studentIDNumber) => {
        const user = userMap.get(studentIDNumber);
        return {
          studentIDNumber,
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          emaildb: user?.emaildb || '',
          enrolledAt: classDoc.updatedAt || classDoc.createdAt || null,
          status: 'enrolled'
        };
      });

      return res.json({ success: true, students });
    } catch (error) {
      console.error('Error loading class students:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/:classId/team', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      return res.json({
        success: true,
        canManage: canManageTeachingTeam(req, classDoc),
        classItem: {
          _id: toIdString(classDoc._id),
          className: classDoc.className || 'Class',
          classCode: classDoc.classCode || '',
          ownerName: classDoc.instructorName || 'Teacher'
        },
        team: getActiveTeachingTeam(classDoc).map((member) => serializeTeachingTeamMember(member))
      });
    } catch (error) {
      console.error('Error loading teaching team:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/team/preview', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, usersCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      if (!canManageTeachingTeam(req, classDoc)) {
        return res.status(403).json({ success: false, message: 'Only the class owner can add co-teachers.' });
      }

      const identifiers = normalizeTeachingTeamIdentifiers(req.body.identifiers);
      if (identifiers.length === 0) {
        return res.status(400).json({ success: false, message: 'Enter at least one teacher ID or email to preview.' });
      }

      const studentIds = identifiers.filter((item) => isStudentIdIdentifier(item));
      const emails = identifiers.filter((item) => isEmailIdentifier(item));
      const queryParts = [];
      if (studentIds.length > 0) {
        queryParts.push({ studentIDNumber: { $in: studentIds } });
      }
      emails.forEach((email) => {
        queryParts.push({ emaildb: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } });
      });

      const users = queryParts.length > 0
        ? await usersCollection
            .find(
              queryParts.length === 1 ? queryParts[0] : { $or: queryParts },
              { projection: { firstName: 1, lastName: 1, studentIDNumber: 1, emaildb: 1, role: 1 } }
            )
            .toArray()
        : [];

      const activeMemberIds = new Set(getActiveTeachingTeam(classDoc).map((member) => toIdString(member.userId)));
      const userByStudentId = new Map();
      const userByEmail = new Map();
      users.forEach((user) => {
        if (user.studentIDNumber) userByStudentId.set(String(user.studentIDNumber), user);
        if (user.emaildb) userByEmail.set(String(user.emaildb).toLowerCase(), user);
      });

      const previewItems = identifiers.map((identifier) => {
        const trimmedIdentifier = String(identifier || '').trim();
        const user = isStudentIdIdentifier(trimmedIdentifier)
          ? userByStudentId.get(trimmedIdentifier)
          : userByEmail.get(trimmedIdentifier.toLowerCase());

        if (!isStudentIdIdentifier(trimmedIdentifier) && !isEmailIdentifier(trimmedIdentifier)) {
          return {
            identifier: trimmedIdentifier,
            status: 'invalid',
            label: 'Invalid ID or email',
            canAdd: false
          };
        }

        if (!user) {
          return {
            identifier: trimmedIdentifier,
            status: 'not_found',
            label: 'Not found',
            canAdd: false
          };
        }

        if (user.role !== 'teacher') {
          return {
            identifier: trimmedIdentifier,
            userId: toIdString(user._id),
            studentIDNumber: user.studentIDNumber || '',
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
            emaildb: user.emaildb || '',
            status: 'not_teacher',
            label: 'Not a teacher account',
            canAdd: false
          };
        }

        if (activeMemberIds.has(toIdString(user._id))) {
          return {
            identifier: trimmedIdentifier,
            userId: toIdString(user._id),
            studentIDNumber: user.studentIDNumber || '',
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Teacher',
            emaildb: user.emaildb || '',
            status: 'already_member',
            label: 'Already on teaching team',
            canAdd: false
          };
        }

        return {
          identifier: trimmedIdentifier,
          userId: toIdString(user._id),
          studentIDNumber: user.studentIDNumber || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Teacher',
          emaildb: user.emaildb || '',
          status: 'ready',
          label: 'Ready to add',
          canAdd: true
        };
      });

      const summary = previewItems.reduce((result, item) => {
        result.total += 1;
        result[item.status] = (result[item.status] || 0) + 1;
        return result;
      }, {
        total: 0,
        ready: 0,
        already_member: 0,
        invalid: 0,
        not_found: 0,
        not_teacher: 0
      });

      return res.json({
        success: true,
        previewItems,
        addableMemberIds: previewItems.filter((item) => item.canAdd && item.userId).map((item) => item.userId),
        summary
      });
    } catch (error) {
      console.error('Error previewing teaching team:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/team', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, usersCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      if (!canManageTeachingTeam(req, classDoc)) {
        return res.status(403).json({ success: false, message: 'Only the class owner can add co-teachers.' });
      }

      const role = normalizeTeachingTeamRole(req.body.role, 'co_teacher');
      if (role === 'owner') {
        return res.status(400).json({ success: false, message: 'Owner role cannot be assigned from this form.' });
      }

      const memberIds = Array.isArray(req.body.memberIds)
        ? [...new Set(req.body.memberIds.map((item) => String(item || '').trim()).filter((item) => ObjectId.isValid(item)))]
        : [];
      if (memberIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Preview at least one teacher before adding.' });
      }

      const activeTeam = getActiveTeachingTeam(classDoc);
      const activeTeamIds = new Set(activeTeam.map((member) => toIdString(member.userId)));
      const teachers = await usersCollection
        .find(
          { _id: { $in: memberIds.map((item) => new ObjectId(item)) } },
          { projection: { firstName: 1, lastName: 1, studentIDNumber: 1, emaildb: 1, role: 1 } }
        )
        .toArray();

      const membersToAdd = teachers.filter((teacher) => teacher.role === 'teacher' && !activeTeamIds.has(toIdString(teacher._id)));
      if (membersToAdd.length === 0) {
        return res.status(400).json({ success: false, message: 'No new teacher accounts were available to add.' });
      }

      const now = new Date();
      const nextTeachingTeam = [
        ...getStoredTeachingTeam(classDoc),
        ...membersToAdd.map((teacher) => ({
          userId: teacher._id,
          studentIDNumber: teacher.studentIDNumber || '',
          name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'Teacher',
          emaildb: teacher.emaildb || '',
          role,
          status: 'active',
          addedAt: now,
          addedBy: new ObjectId(req.session.userId)
        }))
      ];

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            teachingTeam: nextTeachingTeam,
            updatedAt: now
          }
        }
      );

      await writeLog(
        logsCollection,
        req,
        'CLASS_TEAM_MEMBER_ADDED',
        `Added ${membersToAdd.length} teaching team member(s) to ${classDoc.className} as ${role}`
      );
      return res.json({ success: true, message: 'Teaching team updated successfully.' });
    } catch (error) {
      console.error('Error adding teaching team members:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.patch('/:classId/team/:memberUserId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      if (!canManageTeachingTeam(req, classDoc)) {
        return res.status(403).json({ success: false, message: 'Only the class owner can update teaching roles.' });
      }
      if (!ObjectId.isValid(req.params.memberUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid teaching team member.' });
      }

      const role = normalizeTeachingTeamRole(req.body.role, '');
      if (!['co_teacher', 'teaching_assistant', 'viewer'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Select a valid teaching team role.' });
      }

      const nextTeachingTeam = getStoredTeachingTeam(classDoc);
      const targetIndex = nextTeachingTeam.findIndex((member) => toIdString(member.userId) === req.params.memberUserId);
      if (targetIndex === -1) {
        return res.status(404).json({ success: false, message: 'Teaching team member not found.' });
      }
      if (nextTeachingTeam[targetIndex].role === 'owner') {
        return res.status(400).json({ success: false, message: 'The class owner role cannot be changed here.' });
      }

      nextTeachingTeam[targetIndex] = {
        ...nextTeachingTeam[targetIndex],
        role
      };

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            teachingTeam: nextTeachingTeam,
            updatedAt: new Date()
          }
        }
      );

      await writeLog(
        logsCollection,
        req,
        'CLASS_TEAM_ROLE_UPDATED',
        `Updated teaching team role to ${role} in ${classDoc.className}`
      );
      return res.json({ success: true, message: 'Teaching team role updated successfully.' });
    } catch (error) {
      console.error('Error updating teaching team role:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.delete('/:classId/team/:memberUserId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      if (!canManageTeachingTeam(req, classDoc)) {
        return res.status(403).json({ success: false, message: 'Only the class owner can remove co-teachers.' });
      }
      if (!ObjectId.isValid(req.params.memberUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid teaching team member.' });
      }

      const nextTeachingTeam = getStoredTeachingTeam(classDoc);
      const targetMember = nextTeachingTeam.find((member) => toIdString(member.userId) === req.params.memberUserId);
      if (!targetMember) {
        return res.status(404).json({ success: false, message: 'Teaching team member not found.' });
      }
      if (targetMember.role === 'owner') {
        return res.status(400).json({ success: false, message: 'The class owner cannot be removed.' });
      }

      const filteredTeachingTeam = nextTeachingTeam.filter((member) => toIdString(member.userId) !== req.params.memberUserId);
      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            teachingTeam: filteredTeachingTeam,
            updatedAt: new Date()
          }
        }
      );

      await writeLog(
        logsCollection,
        req,
        'CLASS_TEAM_MEMBER_REMOVED',
        `Removed ${targetMember.name || targetMember.studentIDNumber || 'teaching team member'} from ${classDoc.className}`
      );
      return res.json({ success: true, message: 'Teaching team member removed successfully.' });
    } catch (error) {
      console.error('Error removing teaching team member:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/students/preview', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, usersCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      const rawStudentIds = Array.isArray(req.body.studentIDs)
        ? req.body.studentIDs
        : String(req.body.studentIDs || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

      const uniqueRawStudentIds = [...new Set(rawStudentIds)];
      const validStudentIDs = normalizeStudentIds(uniqueRawStudentIds);
      if (uniqueRawStudentIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Enter at least one student ID to preview.' });
      }

      const enrolledStudentIds = new Set(Array.isArray(classDoc.students) ? classDoc.students.filter(Boolean) : []);
      const users = validStudentIDs.length > 0
        ? await usersCollection
            .find(
              { studentIDNumber: { $in: validStudentIDs } },
              { projection: { firstName: 1, lastName: 1, studentIDNumber: 1, emaildb: 1, role: 1 } }
            )
            .toArray()
        : [];

      const userMap = new Map(users.map((user) => [user.studentIDNumber, user]));
      const previewItems = uniqueRawStudentIds.map((studentIDNumber) => {
        const normalizedId = String(studentIDNumber || '').trim();
        const user = userMap.get(normalizedId);

        if (!/^\d{7,8}$/.test(normalizedId)) {
          return {
            studentIDNumber: normalizedId,
            status: 'invalid',
            label: 'Invalid ID',
            canAdd: false
          };
        }

        if (!user) {
          return {
            studentIDNumber: normalizedId,
            status: 'not_found',
            label: 'Not found',
            canAdd: false
          };
        }

        if (user.role !== 'student') {
          return {
            studentIDNumber: normalizedId,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            emaildb: user.emaildb || '',
            status: 'not_student',
            label: 'Not a student account',
            canAdd: false
          };
        }

        if (enrolledStudentIds.has(normalizedId)) {
          return {
            studentIDNumber: normalizedId,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            emaildb: user.emaildb || '',
            status: 'already_enrolled',
            label: 'Already enrolled',
            canAdd: false
          };
        }

        return {
          studentIDNumber: normalizedId,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          emaildb: user.emaildb || '',
          status: 'ready',
          label: 'Ready to add',
          canAdd: true
        };
      });

      const summary = previewItems.reduce((result, item) => {
        result.total += 1;
        result[item.status] = (result[item.status] || 0) + 1;
        return result;
      }, {
        total: 0,
        ready: 0,
        already_enrolled: 0,
        invalid: 0,
        not_found: 0,
        not_student: 0
      });

      return res.json({
        success: true,
        previewItems,
        addableStudentIDs: previewItems.filter((item) => item.canAdd).map((item) => item.studentIDNumber),
        summary
      });
    } catch (error) {
      console.error('Error previewing class students:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/students', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, usersCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      const studentIDs = normalizeStudentIds(req.body.studentIDs);
      if (studentIDs.length === 0) {
        return res.status(400).json({ success: false, message: 'Provide at least one valid 7 or 8 digit student ID.' });
      }

      const existingUsers = await usersCollection
        .find(
          { studentIDNumber: { $in: studentIDs } },
          { projection: { studentIDNumber: 1, role: 1 } }
        )
        .toArray();

      const validStudentIDs = existingUsers
        .filter((user) => user.role === 'student')
        .map((user) => user.studentIDNumber);

      if (validStudentIDs.length === 0) {
        return res.status(400).json({ success: false, message: 'No matching student accounts were found.' });
      }

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $addToSet: { students: { $each: validStudentIDs } },
          $set: { updatedAt: new Date() }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_STUDENTS_ADDED', `Added ${validStudentIDs.length} student(s) to ${classDoc.className}`);
      return res.json({ success: true, addedStudentIDs: validStudentIDs, message: 'Students added successfully.' });
    } catch (error) {
      console.error('Error adding class students:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.delete('/:classId/students/:studentIDNumber', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $pull: { students: req.params.studentIDNumber },
          $set: { updatedAt: new Date() }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_STUDENT_REMOVED', `Removed ${req.params.studentIDNumber} from ${classDoc.className}`);
      return res.json({ success: true, message: 'Student removed successfully.' });
    } catch (error) {
      console.error('Error removing class student:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}

module.exports = createTeacherClassManagementApiRoutes;
