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
    liveSessionsCollection: null
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

  // Indexes for live games
  collections.liveGamesCollection.createIndex({ ownerUserId: 1 }).catch(() => {});
  collections.liveGamesCollection.createIndex({ gamePin: 1 }, { unique: true, sparse: true }).catch(() => {});
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
