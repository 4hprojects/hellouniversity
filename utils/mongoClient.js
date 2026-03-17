const { MongoClient } = require('mongodb');
const mongoUrl = process.env.MONGODB_URI;

let client;
async function getMongoClient() {
  if (!client) {
    client = new MongoClient(mongoUrl); // <-- No need for useUnifiedTopology
    await client.connect();
  }
  return client;
}

module.exports = { getMongoClient };