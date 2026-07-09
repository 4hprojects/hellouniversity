function createCollectionStore() {
  return {
    usersCollection: null,
    logsCollection: null,
    commentsCollection: null,
    blogCollection: null,
    quizzesCollection: null,
    attemptsCollection: null,
    classesCollection: null,
    countersCollection: null,
    classQuizCollection: null,
    activityAssignmentsCollection: null,
    classAnnouncementsCollection: null,
    announcementCommentsCollection: null,
    announcementReactionsCollection: null,
    liveGamesCollection: null,
    liveSessionsCollection: null,
    liveGameAssignmentsCollection: null,
    liveGameAttemptsCollection: null,
    lessonsCollection: null,
    dsaQuickCheckResponsesCollection: null,
    dsaQuickCheckQuestionsCollection: null,
    dsaQuickCheckAssignmentsCollection: null,
    dsaQuickCheckIntegrityEventsCollection: null
  };
}

async function connectToDatabase({ client, collections }) {
  client.on('topologyClosed', () => console.error('MongoDB connection closed.'));
  client.on('reconnect', () => console.log('MongoDB reconnected.'));

  await client.connect();
  console.log('Connected to MongoDB');

  const dbName = (process.env.MONGODB_DB_NAME || 'myDatabase').trim();
  const database = client.db(dbName);

  collections.usersCollection = database.collection('tblUser');
  collections.logsCollection = database.collection('tblLogs');
  collections.commentsCollection = database.collection('tblComments');
  collections.blogCollection = database.collection('tblBlogs');
  collections.quizzesCollection = database.collection('tblQuizzes');
  collections.attemptsCollection = database.collection('tblAttempts');
  collections.classesCollection = database.collection('tblClasses');
  collections.countersCollection = database.collection('tblCounters');
  collections.classQuizCollection = database.collection('tblClassQuizzes');
  collections.activityAssignmentsCollection = database.collection('tblActivityAssignments');
  collections.classAnnouncementsCollection = database.collection('tblClassAnnouncements');
  collections.announcementCommentsCollection = database.collection('tblAnnouncementComments');
  collections.announcementReactionsCollection = database.collection('tblAnnouncementReactions');
  collections.liveGamesCollection = database.collection('tblLiveGames');
  collections.liveSessionsCollection = database.collection('tblLiveSessions');
  collections.liveGameAssignmentsCollection = database.collection('tblLiveGameAssignments');
  collections.liveGameAttemptsCollection = database.collection('tblLiveGameAttempts');
  collections.lessonsCollection = database.collection('tblLessons');
  collections.dsaQuickCheckResponsesCollection = database.collection('tblDsaQuickCheckResponses');
  collections.dsaQuickCheckQuestionsCollection = database.collection('tblDsaQuickCheckQuestions');
  collections.dsaQuickCheckAssignmentsCollection = database.collection('tblDsaQuickCheckAssignments');
  collections.dsaQuickCheckIntegrityEventsCollection = database.collection('tblDsaQuickCheckIntegrityEvents');

  collections.lessonsCollection.createIndex({ track: 1, lesson: 1 }, { unique: true }).catch(() => {});
  collections.dsaQuickCheckResponsesCollection.dropIndex('lessonSlug_1_studentIDNumber_1').catch(() => {});
  collections.dsaQuickCheckAssignmentsCollection.dropIndex('lessonSlug_1_studentIDNumber_1').catch(() => {});
  collections.dsaQuickCheckResponsesCollection.createIndex({ attemptId: 1 }, { unique: true, sparse: true }).catch(() => {});
  collections.dsaQuickCheckResponsesCollection.createIndex({ lessonSlug: 1, studentIDNumber: 1, submittedAt: -1 }).catch(() => {});
  collections.dsaQuickCheckResponsesCollection.createIndex({ lessonSlug: 1, submittedAt: -1 }).catch(() => {});
  collections.dsaQuickCheckResponsesCollection.createIndex({ studentIDNumber: 1, updatedAt: -1 }).catch(() => {});
  collections.dsaQuickCheckQuestionsCollection.createIndex(
    { lessonSlug: 1, questionId: 1 },
    { unique: true }
  ).catch(() => {});
  collections.dsaQuickCheckQuestionsCollection.createIndex({ lessonSlug: 1, status: 1 }).catch(() => {});
  collections.dsaQuickCheckAssignmentsCollection.createIndex({ attemptId: 1 }, { unique: true, sparse: true }).catch(() => {});
  collections.dsaQuickCheckAssignmentsCollection.createIndex({ lessonSlug: 1, studentIDNumber: 1, status: 1 }).catch(() => {});
  collections.dsaQuickCheckAssignmentsCollection.createIndex({ studentIDNumber: 1, assignedAt: -1 }).catch(() => {});
  collections.dsaQuickCheckAssignmentsCollection.createIndex({ lessonSlug: 1, status: 1 }).catch(() => {});
  collections.dsaQuickCheckIntegrityEventsCollection.createIndex({ attemptId: 1, createdAt: 1 }).catch(() => {});
  collections.dsaQuickCheckIntegrityEventsCollection.createIndex({ studentIDNumber: 1, createdAt: -1 }).catch(() => {});
  collections.dsaQuickCheckIntegrityEventsCollection.createIndex({ lessonSlug: 1, createdAt: -1 }).catch(() => {});

  // Indexes for user auth/lookup hot paths (login uses emaildb; reset/resend/signup
  // do exact-match lookups on emaildb + studentIDNumber). Ensured at boot so prod does
  // not depend on a manual `npm run init-db` run. Non-fatal if they already exist.
  collections.usersCollection.createIndex({ emaildb: 1 }, { sparse: true }).catch(() => {});
  collections.usersCollection.createIndex({ studentIDNumber: 1 }, { unique: true, sparse: true }).catch(() => {});

  // Indexes for live games
  collections.liveGamesCollection.createIndex({ ownerUserId: 1 }).catch(() => {});
  collections.liveGamesCollection.createIndex({ gamePin: 1 }, { unique: true, sparse: true }).catch(() => {});
  collections.liveGameAssignmentsCollection.createIndex({ gameId: 1, classId: 1 }, { unique: true }).catch(() => {});
  collections.liveGameAssignmentsCollection.createIndex({ classId: 1, updatedAt: -1 }).catch(() => {});
  collections.liveGameAttemptsCollection.createIndex({ assignmentId: 1, studentIDNumber: 1 }, { unique: true }).catch(() => {});
  collections.liveGameAttemptsCollection.createIndex({ assignmentId: 1, status: 1, submittedAt: -1 }).catch(() => {});
  collections.liveSessionsCollection.createIndex(
    { pin: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['lobby', 'in_progress'] } } }
  ).catch(() => {});
  collections.liveSessionsCollection.createIndex({ status: 1, createdAt: 1 }).catch(() => {});
}

module.exports = {
  createCollectionStore,
  connectToDatabase
};
