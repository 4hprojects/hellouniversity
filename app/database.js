const sgMail = require('@sendgrid/mail');

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
    announcementReactionsCollection: null
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

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

module.exports = {
  createCollectionStore,
  connectToDatabase
};
