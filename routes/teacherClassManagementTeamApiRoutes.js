const express = require('express');

function createTeacherClassManagementTeamApiRoutes({
  shared,
  isAuthenticated,
  isTeacherOrAdmin,
  ObjectId
}) {
  const router = express.Router();
  const {
    getDeps,
    loadOwnedClass,
    getClassAccess,
    canManageTeachingTeam,
    getActiveTeachingTeam,
    getStoredTeachingTeam,
    serializeTeachingTeamMember,
    normalizeTeachingTeamIdentifiers,
    isStudentIdIdentifier,
    isEmailIdentifier,
    escapeRegex,
    toIdString,
    normalizeTeachingTeamRole,
    writeLog
  } = shared;

  router.get('/:classId/team', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);

      return res.json({
        success: true,
        currentRole: access.currentRole,
        permissions: access.permissions,
        canManage: access.permissions.canManageTeam,
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
        return res.status(403).json({ success: false, message: 'You do not have permission to manage the teaching team.' });
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
        return res.status(403).json({ success: false, message: 'You do not have permission to manage the teaching team.' });
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
        return res.status(403).json({ success: false, message: 'You do not have permission to manage the teaching team.' });
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
        return res.status(400).json({ success: false, message: 'Owner role cannot be changed from this form.' });
      }

      nextTeachingTeam[targetIndex] = {
        ...nextTeachingTeam[targetIndex],
        role,
        status: 'active'
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

      await writeLog(logsCollection, req, 'CLASS_TEAM_MEMBER_ROLE_UPDATED', `Updated team role to ${role} in ${classDoc.className}`);
      return res.json({ success: true, message: 'Teaching role updated successfully.' });
    } catch (error) {
      console.error('Error updating teaching role:', error);
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
        return res.status(403).json({ success: false, message: 'You do not have permission to manage the teaching team.' });
      }
      if (!ObjectId.isValid(req.params.memberUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid teaching team member.' });
      }

      const nextTeachingTeam = getStoredTeachingTeam(classDoc);
      const targetIndex = nextTeachingTeam.findIndex((member) => toIdString(member.userId) === req.params.memberUserId);
      if (targetIndex === -1) {
        return res.status(404).json({ success: false, message: 'Teaching team member not found.' });
      }
      if (nextTeachingTeam[targetIndex].role === 'owner') {
        return res.status(400).json({ success: false, message: 'Owner cannot be removed from the teaching team.' });
      }

      nextTeachingTeam[targetIndex] = {
        ...nextTeachingTeam[targetIndex],
        status: 'removed'
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

      await writeLog(logsCollection, req, 'CLASS_TEAM_MEMBER_REMOVED', `Removed teaching team member from ${classDoc.className}`);
      return res.json({ success: true, message: 'Teaching team member removed successfully.' });
    } catch (error) {
      console.error('Error removing teaching team member:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}

module.exports = createTeacherClassManagementTeamApiRoutes;
