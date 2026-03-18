const { ObjectId } = require('mongodb');
const createWebPagesRoutes = require('../routes/webPagesRoutes');
const createAuthWebRoutes = require('../routes/authWebRoutes');
const createStudentWebRoutes = require('../routes/studentWebRoutes');
const createStudentPagesRoutes = require('../routes/studentPagesRoutes');
const createSearchRoutes = require('../routes/searchRoutes');
const createLegacyWebPostRoutes = require('../routes/legacyWebPostRoutes');
const createAssignmentsRoutes = require('../routes/assignmentsRoutes');
const createClassesRoutes = require('../routes/classesRoutes');
const createQuizManagementRoutes = require('../routes/quizManagementRoutes');
const createPasswordResetRoutes = require('../routes/passwordResetRoutes');
const createAdminGradesRoutes = require('../routes/adminGradesRoutes');
const createBlogsCommentsRoutes = require('../routes/blogsCommentsRoutes');
const createStaticContentRoutes = require('../routes/staticContentRoutes');
const createAdminPagesRoutes = require('../routes/adminPagesRoutes');
const createTeacherPagesRoutes = require('../routes/teacherPagesRoutes');
const createAdminAttendanceRoutes = require('../routes/adminAttendanceRoutes');
const createTeacherVerificationRoutes = require('../routes/teacherVerificationRoutes');
const createQuizBuilderApiRoutes = require('../routes/quizBuilderApiRoutes');
const createTeacherClassManagementApiRoutes = require('../routes/teacherClassManagementApiRoutes');
const createConfigRoutes = require('../routes/configRoutes');
const createActivityRandomRoutes = require('../routes/activityRandomRoutes');
const createCrfvPagesRoutes = require('../routes/crfvPagesRoutes');
const createAccountApiRoutes = require('../routes/accountApiRoutes');
const createClassAnnouncementsRoutes = require('../routes/classAnnouncementsRoutes');
const createBlogManagementRoutes = require('../routes/blogManagementRoutes');

const attendanceApi = require('../routes/attendanceApi');
const registerApi = require('../routes/registerApi');
const eventsApi = require('../routes/eventsApi');
const bulkRegisterApi = require('../routes/bulkRegisterApi');
const userRegisterApi = require('../routes/userRegisterApi');
const reportsApi = require('../routes/reportsApi');
const paymentReportsApi = require('../routes/paymentsReportsApi');
const attendanceSummaryApi = require('../routes/attendanceSummaryApi');
const emailApi = require('../routes/emailApi');
const createSignupApi = require('../routes/signupApi');
const createInstitutionsApiRoutes = require('../routes/institutionsApiRoutes');
const createConfirmEmailApi = require('../routes/confirmEmailApi');
const createResendConfirmationApi = require('../routes/resendConfirmationApi');
const userSignInOutApi = require('../routes/userSignInOutApi');
const auditTrailApi = require('../routes/auditTrailApi');
const lessonQuizRoutes = require('../routes/lessonQuizRoutes');
const studentEthnicityRoutes = require('../routes/studentEthnicityRoutes');
const byteFunRunRoutes = require('../routes/byteFunRunRoutes');
const classRecordsRoutes = require('../routes/classRecordsRoutes');

function registerCoreRoutes(app, deps) {
  const {
    projectRoot,
    client,
    guards,
    collections,
    utilities
  } = deps;

  app.use(createCrfvPagesRoutes({
    projectRoot,
    isAuthenticated: guards.isAuthenticated,
    isAdminOrManager: guards.isAdminOrManager
  }));

  app.use('/api', auditTrailApi);
  app.use('/api', userSignInOutApi);
  app.use('/api/payments-report', paymentReportsApi);
  app.use('/resend-confirmation', createResendConfirmationApi({ getUsersCollection: () => collections.usersCollection }));
  app.use('/confirm-email', createConfirmEmailApi({ getUsersCollection: () => collections.usersCollection }));
  app.use('/signup', createSignupApi({
    getUsersCollection: () => collections.usersCollection,
    getLogsCollection: () => collections.logsCollection,
    bcrypt: utilities.bcrypt,
    validator: utilities.validator
  }));

  app.use(createWebPagesRoutes({
    projectRoot,
    getBlogCollection: () => collections.blogCollection,
    isAuthenticated: guards.isAuthenticated,
    isAdmin: guards.isAdmin
  }));
  app.use(createAuthWebRoutes({
    getUsersCollection: () => collections.usersCollection,
    getLogsCollection: () => collections.logsCollection,
    sendEmail: utilities.sendEmail,
    bcrypt: utilities.bcrypt,
    validator: utilities.validator,
    isAuthenticated: guards.isAuthenticated
  }));

  app.use(createConfigRoutes());
  app.use(createPasswordResetRoutes({
    getUsersCollection: () => collections.usersCollection,
    sendEmail: utilities.sendEmail,
    hashPassword: utilities.hashPassword,
    generateOTP: utilities.generateOTP
  }));

  app.use('/api', emailApi);
  app.use('/api/institutions', createInstitutionsApiRoutes());
  app.use('/api', userRegisterApi);
  app.use('/api', createAccountApiRoutes({
    getUsersCollection: () => collections.usersCollection,
    isAuthenticated: guards.isAuthenticated,
    bcrypt: utilities.bcrypt,
    validator: utilities.validator
  }));
  app.use('/api/bulk-register', bulkRegisterApi);
  app.use('/api/events', eventsApi);
  app.use('/api/register', registerApi);
  app.use('/api/attendance', attendanceApi);
  app.use('/api', reportsApi);
  app.use('/api/attendance-summary', attendanceSummaryApi);
  app.use('/api', byteFunRunRoutes);
  app.use('/api', classRecordsRoutes);
  app.use('/api/lesson-quiz', lessonQuizRoutes(client));
  app.use('/api/student-ethnicity', studentEthnicityRoutes);
  app.use('/api/quiz-builder', createQuizBuilderApiRoutes({
    getQuizzesCollection: () => collections.quizzesCollection,
    getAttemptsCollection: () => collections.attemptsCollection,
    getLogsCollection: () => collections.logsCollection,
    getClassQuizCollection: () => collections.classQuizCollection,
    getClassesCollection: () => collections.classesCollection,
    ObjectId,
    isAuthenticated: guards.isAuthenticated,
    isTeacherOrAdmin: guards.isTeacherOrAdmin
  }));

  app.use(createStudentWebRoutes({
    projectRoot,
    client,
    isAuthenticated: guards.isAuthenticated,
    getUsersCollection: () => collections.usersCollection,
    getLogsCollection: () => collections.logsCollection
  }));

  app.use(createStudentPagesRoutes({
    projectRoot,
    isAuthenticated: guards.isAuthenticated
  }));

  app.use(createAdminPagesRoutes({
    projectRoot,
    isAuthenticated: guards.isAuthenticated,
    isAdmin: guards.isAdmin
  }));

  app.use(createTeacherPagesRoutes({
    isAuthenticated: guards.isAuthenticated,
    isTeacherOrAdmin: guards.isTeacherOrAdmin,
    isTeacherOrAdminOrPending: guards.isTeacherOrAdminOrPending,
    getUsersCollection: () => collections.usersCollection
  }));

  app.use('/api/teacher', createTeacherVerificationRoutes({
    getUsersCollection: () => collections.usersCollection,
    isAuthenticated: guards.isAuthenticated
  }));

  app.use(createSearchRoutes({ client }));
  app.use(createLegacyWebPostRoutes());
  app.use(createStaticContentRoutes({ projectRoot }));
}

function registerDatabaseRoutes(app, deps) {
  const { client, guards, collections, utilities, upload } = deps;

  const adminUsersRoutes = require('../routes/adminUsersRoutes');

  app.use('/api/admin/users', adminUsersRoutes({
    usersCollection: collections.usersCollection,
    logsCollection: collections.logsCollection,
    isAuthenticated: guards.isAuthenticated,
    isAdmin: guards.isAdmin,
    bcrypt: utilities.bcrypt
  }));

  app.use('/api', createAssignmentsRoutes(
    {
      classQuizCollection: collections.classQuizCollection,
      quizzesCollection: collections.quizzesCollection,
      classesCollection: collections.classesCollection,
      ObjectId
    },
    { isAuthenticated: guards.isAuthenticated, isTeacherOrAdmin: guards.isTeacherOrAdmin }
  ));

  app.use('/api', createClassesRoutes(
    {
      getClassesCollection: () => collections.classesCollection,
      getCountersCollection: () => collections.countersCollection,
      getClassQuizCollection: () => collections.classQuizCollection,
      ObjectId,
      upload
    },
    { isAuthenticated: guards.isAuthenticated, isTeacherOrAdmin: guards.isTeacherOrAdmin }
  ));

  app.use('/api/teacher/classes', createTeacherClassManagementApiRoutes({
    getClassesCollection: () => collections.classesCollection,
    getCountersCollection: () => collections.countersCollection,
    getUsersCollection: () => collections.usersCollection,
    getLogsCollection: () => collections.logsCollection,
    ObjectId,
    isAuthenticated: guards.isAuthenticated,
    isTeacherOrAdmin: guards.isTeacherOrAdmin
  }));

  app.use('/api', createQuizManagementRoutes(
    {
      getQuizzesCollection: () => collections.quizzesCollection,
      getAttemptsCollection: () => collections.attemptsCollection,
      getClassQuizCollection: () => collections.classQuizCollection,
      getClassesCollection: () => collections.classesCollection,
      ObjectId
    },
    { isAuthenticated: guards.isAuthenticated, isAdmin: guards.isAdmin }
  ));

  app.use('/api', createBlogsCommentsRoutes({
    usersCollection: collections.usersCollection,
    commentsCollection: collections.commentsCollection,
    blogCollection: collections.blogCollection,
    ObjectId
  }));

  app.use('/api', createBlogManagementRoutes({
    getBlogCollection: () => collections.blogCollection,
    getUsersCollection: () => collections.usersCollection,
    ObjectId,
    isAuthenticated: guards.isAuthenticated,
    isAdmin: guards.isAdmin
  }));

  app.use('/api', createActivityRandomRoutes({
    activityAssignmentsCollection: collections.activityAssignmentsCollection,
    sendEmail: utilities.sendEmail
  }));

  app.use('/api/classes', createClassAnnouncementsRoutes({
    getClassesCollection: () => collections.classesCollection,
    getUsersCollection: () => collections.usersCollection,
    getClassAnnouncementsCollection: () => collections.classAnnouncementsCollection,
    getAnnouncementCommentsCollection: () => collections.announcementCommentsCollection,
    getAnnouncementReactionsCollection: () => collections.announcementReactionsCollection,
    ObjectId,
    isAuthenticated: guards.isAuthenticated
  }));

  app.use(createAdminGradesRoutes({
    getClient: () => client,
    isAuthenticated: guards.isAuthenticated,
    isAdmin: guards.isAdmin,
    upload
  }));

  app.use(createAdminAttendanceRoutes({
    getClient: () => client,
    isAuthenticated: guards.isAuthenticated,
    isAdmin: guards.isAdmin
  }));
}

module.exports = {
  registerCoreRoutes,
  registerDatabaseRoutes
};
