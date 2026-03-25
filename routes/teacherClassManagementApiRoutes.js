const express = require('express');
const createTeacherClassManagementShared = require('./teacherClassManagementShared');
const createTeacherClassManagementCoreApiRoutes = require('./teacherClassManagementCoreApiRoutes');
const createTeacherClassManagementRosterApiRoutes = require('./teacherClassManagementRosterApiRoutes');
const createTeacherClassManagementTeamApiRoutes = require('./teacherClassManagementTeamApiRoutes');
const createTeacherClassManagementContentApiRoutes = require('./teacherClassManagementContentApiRoutes');

function createTeacherClassManagementApiRoutes({
  getClassesCollection,
  getCountersCollection,
  getUsersCollection,
  getLogsCollection,
  getQuizzesCollection,
  getAttemptsCollection,
  getClassQuizCollection,
  getClassAnnouncementsCollection,
  ObjectId,
  isAuthenticated,
  isTeacherOrAdmin
}) {
  const router = express.Router();
  const shared = createTeacherClassManagementShared({
    getClassesCollection,
    getCountersCollection,
    getUsersCollection,
    getLogsCollection,
    getQuizzesCollection,
    getAttemptsCollection,
    getClassQuizCollection,
    getClassAnnouncementsCollection,
    ObjectId
  });

  router.use(createTeacherClassManagementCoreApiRoutes({
    shared,
    isAuthenticated,
    isTeacherOrAdmin,
    ObjectId
  }));

  router.use(createTeacherClassManagementTeamApiRoutes({
    shared,
    isAuthenticated,
    isTeacherOrAdmin,
    ObjectId
  }));

  router.use(createTeacherClassManagementRosterApiRoutes({
    shared,
    isAuthenticated,
    isTeacherOrAdmin
  }));

  router.use(createTeacherClassManagementContentApiRoutes({
    getDeps: shared.getDeps,
    loadOwnedClass: shared.loadOwnedClass,
    getClassAccess: shared.getClassAccess,
    writeLog: shared.writeLog,
    isAuthenticated,
    isTeacherOrAdmin,
    ObjectId
  }));

  return router;
}

module.exports = createTeacherClassManagementApiRoutes;
