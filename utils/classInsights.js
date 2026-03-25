const { ObjectId } = require('mongodb');

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function toTimestamp(value) {
  const timestamp = new Date(value || '').getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeRecentActivity(items) {
  return items
    .filter((item) => item && item.timestamp)
    .sort((left, right) => toTimestamp(right.timestamp) - toTimestamp(left.timestamp))
    .slice(0, 10);
}

function average(values) {
  const numeric = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (!numeric.length) {
    return null;
  }
  return Number((numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(2));
}

function buildStudentAttemptFilters(studentIdNumber, userId) {
  const filters = [{ studentIDNumber: studentIdNumber }];
  if (userId && ObjectId.isValid(String(userId))) {
    filters.push({ studentId: new ObjectId(String(userId)) });
  }
  if (userId) {
    filters.push({ studentId: userId });
  }
  return filters;
}

async function findCollectionRows(collection, query = {}, sortSpec = null, limit = 0) {
  if (!collection || typeof collection.find !== 'function') {
    return [];
  }

  let cursor = collection.find(query);
  if (sortSpec && typeof cursor.sort === 'function') {
    cursor = cursor.sort(sortSpec);
  }
  if (limit && typeof cursor.limit === 'function') {
    cursor = cursor.limit(limit);
  }
  if (typeof cursor.toArray === 'function') {
    return cursor.toArray();
  }
  return [];
}

function getAssignmentState(assignment, quizRow, now, dueSoonCutoff) {
  const startTimestamp = toTimestamp(assignment?.startDate);
  const dueTimestamp = toTimestamp(assignment?.dueDate || quizRow?.dueDate);

  if (startTimestamp && startTimestamp > now) {
    return 'scheduled';
  }
  if (dueTimestamp && dueTimestamp < now) {
    return 'overdue';
  }
  if (dueTimestamp && dueTimestamp <= dueSoonCutoff) {
    return 'due_soon';
  }
  return 'open';
}

function summarizeCompletionRate(assignments, attemptsByQuizId) {
  const assignmentRates = assignments.map((assignment) => {
    const targetStudents = Array.isArray(assignment.assignedStudents) && assignment.assignedStudents.length
      ? assignment.assignedStudents
      : null;
    const denominator = targetStudents ? targetStudents.length : null;
    if (!denominator) {
      return null;
    }

    const attempts = attemptsByQuizId.get(toIdString(assignment.quizId)) || [];
    const completedStudents = new Set(
      attempts
        .filter((attempt) => Boolean(attempt?.isCompleted) || toTimestamp(attempt?.submittedAt) > 0 || Number.isFinite(Number(attempt?.finalScore)))
        .map((attempt) => String(attempt.studentIDNumber || '').trim())
        .filter(Boolean)
    );
    return completedStudents.size / denominator;
  }).filter((value) => typeof value === 'number');

  if (!assignmentRates.length) {
    return null;
  }

  return Number((assignmentRates.reduce((sum, value) => sum + value, 0) / assignmentRates.length).toFixed(2));
}

async function buildClassInsights({
  classDoc,
  req,
  classQuizCollection,
  quizzesCollection,
  attemptsCollection,
  classAnnouncementsCollection,
  logsCollection
}) {
  const now = Date.now();
  const dueSoonCutoff = now + (7 * 24 * 60 * 60 * 1000);
  const classId = classDoc?._id;
  const studentIds = Array.isArray(classDoc?.students) ? classDoc.students.filter(Boolean) : [];
  const activeTeam = Array.isArray(classDoc?.teachingTeam)
    ? classDoc.teachingTeam.filter((member) => String(member?.status || 'active').trim().toLowerCase() === 'active')
    : [];
  const visibleModules = Array.isArray(classDoc?.modules) ? classDoc.modules.filter((item) => !item?.hidden) : [];
  const visibleMaterials = Array.isArray(classDoc?.materials) ? classDoc.materials.filter((item) => !item?.hidden) : [];

  const assignments = await findCollectionRows(classQuizCollection, { classId });
  const quizIds = [...new Set(
    assignments
      .map((assignment) => toIdString(assignment?.quizId))
      .filter(Boolean)
  )];

  const quizzes = quizIds.length && quizzesCollection && typeof quizzesCollection.find === 'function'
    ? await findCollectionRows(
      quizzesCollection,
      { _id: { $in: quizIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } }
    )
    : [];

  const quizMap = new Map(quizzes.map((quiz) => [toIdString(quiz._id), quiz]));
  const attemptFilters = studentIds.length
    ? [{ studentIDNumber: { $in: studentIds } }]
    : [];
  const attempts = quizIds.length && attemptsCollection && typeof attemptsCollection.find === 'function'
    ? await findCollectionRows(
      attemptsCollection,
      {
        quizId: {
          $in: quizIds
            .filter((id) => ObjectId.isValid(id))
            .map((id) => new ObjectId(id))
        },
        ...(attemptFilters.length ? { $or: attemptFilters } : {})
      }
    )
    : [];

  const attemptsByQuizId = new Map();
  attempts.forEach((attempt) => {
    const quizKey = toIdString(attempt?.quizId);
    if (!quizKey) {
      return;
    }
    if (!attemptsByQuizId.has(quizKey)) {
      attemptsByQuizId.set(quizKey, []);
    }
    attemptsByQuizId.get(quizKey).push(attempt);
  });

  const announcements = await findCollectionRows(classAnnouncementsCollection, { classId }, { createdAt: -1 }, 10);
  const recentLogs = await findCollectionRows(logsCollection, {}, { timestamp: -1 }, 20);
  const relevantLogs = recentLogs.filter((entry) => {
    const details = String(entry?.details || '');
    return details.includes(classDoc?.className || '') || details.includes(classDoc?.classCode || '');
  }).slice(0, 6);

  const assignmentStates = assignments.map((assignment) => ({
    assignment,
    quiz: quizMap.get(toIdString(assignment.quizId)) || null,
    state: getAssignmentState(assignment, quizMap.get(toIdString(assignment.quizId)) || null, now, dueSoonCutoff)
  }));

  const completedAttempts = attempts.filter((attempt) => (
    Boolean(attempt?.isCompleted) || toTimestamp(attempt?.submittedAt) > 0 || Number.isFinite(Number(attempt?.finalScore))
  ));
  const recentSubmissions = completedAttempts.filter((attempt) => {
    const timestamp = toTimestamp(attempt?.submittedAt || attempt?.updatedAt || attempt?.createdAt);
    return timestamp >= (now - (7 * 24 * 60 * 60 * 1000));
  });
  const studentsWithSubmissions = new Set(
    completedAttempts.map((attempt) => String(attempt.studentIDNumber || '').trim()).filter(Boolean)
  );

  const latestScoresByStudent = new Map();
  completedAttempts
    .slice()
    .sort((left, right) => {
      const rightTs = toTimestamp(right?.submittedAt || right?.updatedAt || right?.createdAt);
      const leftTs = toTimestamp(left?.submittedAt || left?.updatedAt || left?.createdAt);
      return rightTs - leftTs;
    })
    .forEach((attempt) => {
      const studentKey = String(attempt.studentIDNumber || '').trim();
      if (!studentKey || latestScoresByStudent.has(studentKey)) {
        return;
      }
      const numericScore = Number.isFinite(Number(attempt.finalScore))
        ? Number(attempt.finalScore)
        : Number.isFinite(Number(attempt.score))
          ? Number(attempt.score)
          : null;
      if (numericScore !== null) {
        latestScoresByStudent.set(studentKey, numericScore);
      }
    });

  const recentActivity = normalizeRecentActivity([
    ...announcements.slice(0, 3).map((announcement) => ({
      type: 'announcement',
      title: announcement.title || 'Announcement posted',
      description: `Posted by ${announcement.authorName || announcement.author?.name || 'Teacher'}`,
      timestamp: announcement.createdAt || announcement.updatedAt,
      href: `/teacher/classes/${toIdString(classId)}/announcements`
    })),
    ...visibleMaterials
      .filter((material) => material?.file?.uploadedAt || material?.createdAt)
      .slice()
      .sort((left, right) => {
        const rightTs = toTimestamp(right?.file?.uploadedAt || right?.createdAt);
        const leftTs = toTimestamp(left?.file?.uploadedAt || left?.createdAt);
        return rightTs - leftTs;
      })
      .slice(0, 3)
      .map((material) => ({
        type: 'material',
        title: material.title || 'Material updated',
        description: material.file?.originalName ? `Uploaded file: ${material.file.originalName}` : `Type: ${material.type || 'resource'}`,
        timestamp: material.file?.uploadedAt || material.createdAt,
        href: `/teacher/classes/${toIdString(classId)}/materials`
      })),
    ...recentSubmissions.slice(0, 3).map((attempt) => ({
      type: 'submission',
      title: attempt.quizTitle || 'Student submission',
      description: `${attempt.studentIDNumber || 'Student'} submitted work`,
      timestamp: attempt.submittedAt || attempt.updatedAt || attempt.createdAt,
      href: '/teacher/quizzes'
    })),
    ...relevantLogs.map((entry) => ({
      type: 'log',
      title: entry.action || 'Class activity',
      description: entry.details || '',
      timestamp: entry.timestamp,
      href: `/teacher/classes/${toIdString(classId)}`
    }))
  ]);

  return {
    summary: {
      studentCount: studentIds.length,
      teamCount: Math.max(activeTeam.length, 1),
      moduleCount: visibleModules.length,
      materialCount: visibleMaterials.length,
      announcementCount: announcements.length,
      assignedQuizCount: assignments.length
    },
    activityStatus: {
      openQuizCount: assignmentStates.filter((item) => item.state === 'open').length,
      dueSoonCount: assignmentStates.filter((item) => item.state === 'due_soon').length,
      overdueCount: assignmentStates.filter((item) => item.state === 'overdue').length,
      materialsReady: visibleMaterials.length > 0,
      announcementsReady: announcements.length > 0,
      lastUpdatedAt: classDoc?.updatedAt || classDoc?.createdAt || null
    },
    engagement: {
      studentsWithSubmissions: studentsWithSubmissions.size,
      studentsWithoutSubmissions: Math.max(studentIds.length - studentsWithSubmissions.size, 0),
      averageLatestScore: average([...latestScoresByStudent.values()]),
      averageCompletionRate: summarizeCompletionRate(assignments, attemptsByQuizId),
      recentSubmissionCount: recentSubmissions.length
    },
    recentActivity,
    links: {
      students: `/teacher/classes/${toIdString(classId)}/students`,
      team: `/teacher/classes/${toIdString(classId)}/team`,
      modules: `/teacher/classes/${toIdString(classId)}/modules`,
      materials: `/teacher/classes/${toIdString(classId)}/materials`,
      announcements: `/teacher/classes/${toIdString(classId)}/announcements`,
      quizzes: '/teacher/quizzes'
    }
  };
}

module.exports = {
  buildClassInsights
};
