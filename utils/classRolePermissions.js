function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function normalizeTeamRole(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['owner', 'co_teacher', 'teaching_assistant', 'viewer'].includes(normalized)) {
    return normalized;
  }
  return '';
}

function getSessionUserId(req) {
  return String(req.session?.userId || '').trim();
}

function getSessionRole(req) {
  return String(req.session?.role || '').trim().toLowerCase();
}

function resolveClassRole(req, classDoc) {
  const sessionRole = getSessionRole(req);
  if (sessionRole === 'admin') {
    return 'admin';
  }

  const sessionUserId = getSessionUserId(req);
  if (!sessionUserId) {
    return null;
  }

  if (toIdString(classDoc?.instructorId) === sessionUserId) {
    return 'owner';
  }

  if (Array.isArray(classDoc?.teachingTeam)) {
    const activeMember = classDoc.teachingTeam.find((member) => (
      String(member?.status || '').trim().toLowerCase() === 'active'
      && toIdString(member?.userId) === sessionUserId
    ));
    if (activeMember) {
      return normalizeTeamRole(activeMember.role);
    }
  }

  return null;
}

function isEnrolledStudent(req, classDoc) {
  const studentId = String(req.session?.studentIDNumber || '').trim();
  return Boolean(
    studentId
    && Array.isArray(classDoc?.students)
    && classDoc.students.includes(studentId)
  );
}

function buildTeacherClassPermissions(currentRole) {
  const role = String(currentRole || '').trim().toLowerCase();
  const isOwner = role === 'owner';
  const isCoTeacher = role === 'co_teacher';
  const isTeachingAssistant = role === 'teaching_assistant';
  const isViewer = role === 'viewer';
  const isAdmin = role === 'admin';
  const canReadClass = isOwner || isCoTeacher || isTeachingAssistant || isViewer || isAdmin;

  return {
    currentRole: role || null,
    canReadClass,
    canManageClassCore: isOwner || isAdmin,
    canManageLifecycle: isOwner || isAdmin,
    canRegenerateJoinCode: isOwner || isAdmin,
    canActivateClass: isOwner || isAdmin,
    canManageRoster: isOwner || isCoTeacher || isAdmin,
    canManageTeam: isOwner || isAdmin,
    canManageModules: isOwner || isCoTeacher || isTeachingAssistant || isAdmin,
    canManageMaterials: isOwner || isCoTeacher || isTeachingAssistant || isAdmin,
    canUpdateSettings: isOwner || isCoTeacher || isAdmin,
    canReadSettings: canReadClass,
    canPostAnnouncements: isOwner || isCoTeacher,
    canCommentAsTeacher: isOwner || isCoTeacher,
    canReactAsTeacher: isOwner || isCoTeacher
  };
}

function buildAnnouncementPermissions(req, classDoc) {
  const currentRole = resolveClassRole(req, classDoc);
  const archived = String(classDoc?.status || '').trim().toLowerCase() === 'archived';
  const isStudent = isEnrolledStudent(req, classDoc);
  const classPermissions = buildTeacherClassPermissions(currentRole);

  return {
    currentRole,
    isEnrolledStudent: isStudent,
    permissions: {
      canPostAnnouncement: classPermissions.canPostAnnouncements && !archived,
      canComment: (classPermissions.canCommentAsTeacher || isStudent) && !archived,
      canReact: (classPermissions.canReactAsTeacher || isStudent) && !archived,
      isReadOnly: archived
    }
  };
}

module.exports = {
  toIdString,
  normalizeTeamRole,
  getSessionUserId,
  getSessionRole,
  resolveClassRole,
  isEnrolledStudent,
  buildTeacherClassPermissions,
  buildAnnouncementPermissions
};
