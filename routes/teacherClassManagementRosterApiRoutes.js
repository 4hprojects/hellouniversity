const express = require('express');

function createTeacherClassManagementRosterApiRoutes({
  shared,
  isAuthenticated,
  isTeacherOrAdmin
}) {
  const router = express.Router();
  const {
    getDeps,
    loadOwnedClass,
    getClassAccess,
    writeLog,
    normalizeStudentIds
  } = shared;

  router.get('/:classId/students', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, usersCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canReadClass) {
        return res.status(403).json({ success: false, message: 'You do not have permission to view this roster.' });
      }

      const studentIds = Array.isArray(classDoc.students) ? [...new Set(classDoc.students.filter(Boolean))] : [];
      if (studentIds.length === 0) {
        return res.json({ success: true, currentRole: access.currentRole, permissions: access.permissions, students: [] });
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

      return res.json({ success: true, currentRole: access.currentRole, permissions: access.permissions, students });
    } catch (error) {
      console.error('Error loading class students:', error);
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
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageRoster) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage this roster.' });
      }

      const rawStudentIds = Array.isArray(req.body.studentIDs)
        ? req.body.studentIDs
        : String(req.body.studentIDs || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

      const uniqueRawStudentIds = [...new Set(rawStudentIds.map((item) => String(item || '').trim()).filter(Boolean))];
      if (uniqueRawStudentIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Enter at least one student ID to preview.' });
      }

      const validStudentIDs = [...new Set(uniqueRawStudentIds.filter((item) => /^\d{7,8}$/.test(item)))];
      const enrolledStudentIds = new Set(Array.isArray(classDoc.students) ? classDoc.students : []);
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
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageRoster) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage this roster.' });
      }

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
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageRoster) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage this roster.' });
      }

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

module.exports = createTeacherClassManagementRosterApiRoutes;
