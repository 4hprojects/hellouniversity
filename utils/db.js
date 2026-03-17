// filepath: c:\Users\Kayla Ryhs\Desktop\PersonalProjects\HelloUniversity-main\utils\db.js
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);

let usersCollection;

async function getUsersCollection() {
  if (!usersCollection) {
    await client.connect();
    const db = client.db('myDatabase'); // Change to your DB name if needed
    usersCollection = db.collection('tblUser');
  }
  return usersCollection;
}

module.exports = { getUsersCollection };
