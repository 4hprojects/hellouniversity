const { getMongoClient } = require('./mongoClient');

async function getUserNamesByStudentIDs(studentIDs) {
  if (!studentIDs || studentIDs.length === 0) return {};

  const client = await getMongoClient();
  const db = client.db('myDatabase'); // Change if your DB name is different
  const users = await db.collection('tblUser')
    .find({ studentIDNumber: { $in: studentIDs } })
    .project({ studentIDNumber: 1, firstName: 1, lastName: 1 })
    .toArray();

  const userMap = {};
  users.forEach(u => {
    userMap[u.studentIDNumber] = `${u.firstName} ${u.lastName}`;
  });
  return userMap;
}

module.exports = { getUserNamesByStudentIDs };

//used in event-create.js to get user names by student IDs
