const express = require('express');
const { buildClassInsights } = require('../utils/classInsights');

function createTeacherClassManagementCoreApiRoutes({
  shared,
  isAuthenticated,
  isTeacherOrAdmin,
  ObjectId
}) {
  const router = express.Router();
  const {
    getDeps,
    getTeacherFilter,
    sanitizeClassPayload,
    buildClassCode,
    buildOwnerTeachingTeamEntry,
    serializeClassSummary,
    getClassAccess,
    writeLog,
    loadOwnedClass,
    normalizeArchiveReason,
    normalizeRestoreReason
  } = shared;

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
      const access = getClassAccess(req, classDoc);

      return res.json({
        success: true,
        currentRole: access.currentRole,
        permissions: access.permissions,
        classItem: {
          ...serializeClassSummary(classDoc),
          currentRole: access.currentRole,
          permissions: access.permissions
        }
      });
    } catch (error) {
      console.error('Error fetching class details:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/:classId/insights', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const classDoc = await loadOwnedClass(req, res, deps.classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);

      const insights = await buildClassInsights({
        classDoc,
        req,
        classQuizCollection: deps.classQuizCollection,
        quizzesCollection: deps.quizzesCollection,
        attemptsCollection: deps.attemptsCollection,
        classAnnouncementsCollection: deps.classAnnouncementsCollection,
        logsCollection: deps.logsCollection
      });

      return res.json({
        success: true,
        currentRole: access.currentRole,
        permissions: access.permissions,
        ...insights
      });
    } catch (error) {
      console.error('Error fetching class insights:', error);
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
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageClassCore) {
        return res.status(403).json({ success: false, message: 'You do not have permission to edit this class.' });
      }

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

      await classesCollection.updateOne({ _id: classDoc._id }, { $set: updateFields });

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

    const { classesCollection, countersCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canRegenerateJoinCode) {
        return res.status(403).json({ success: false, message: 'You do not have permission to regenerate the join code.' });
      }

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
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageLifecycle) {
        return res.status(403).json({ success: false, message: 'You do not have permission to archive this class.' });
      }

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
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageLifecycle) {
        return res.status(403).json({ success: false, message: 'You do not have permission to restore this class.' });
      }

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
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageLifecycle) {
        return res.status(403).json({ success: false, message: 'You do not have permission to duplicate this class.' });
      }

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

  router.post('/:classId/activate', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canActivateClass) {
        return res.status(403).json({ success: false, message: 'You do not have permission to activate this class.' });
      }

      if (classDoc.status === 'active') {
        return res.status(400).json({ success: false, message: 'Class is already active.' });
      }
      if (classDoc.status === 'archived') {
        return res.status(400).json({ success: false, message: 'Restore the class before activating it.' });
      }

      const now = new Date();
      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            status: 'active',
            publishedAt: classDoc.publishedAt || now,
            updatedAt: now
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_ACTIVATED', `Activated class ${classDoc.className} (${classDoc.classCode})`);
      return res.json({ success: true, message: 'Class activated successfully.' });
    } catch (error) {
      console.error('Error activating class:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}

module.exports = createTeacherClassManagementCoreApiRoutes;
