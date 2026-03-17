// db.js
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri); 

// We'll store references to the DB and collections here
let db;
let usersCollection;
let gradesCollection;
let logsCollection;
let commentsCollection;
let blogCollection;
// NEW QUIZ COLLECTIONS
let quizCollection;
let questionCollection;
let quizResponsesCollection;

async function connectToDatabase() {
  try {
    if (!db) {
      await client.connect();
      console.log('Connected to MongoDB');
      db = client.db('myDatabase'); // Use your DB name here

      // Existing collections
      usersCollection = db.collection('tblUser');
      gradesCollection = db.collection('tblGrades');
      logsCollection = db.collection('tblLogs');
      commentsCollection = db.collection('tblComments');
      blogCollection = db.collection('tblBlogs');

      // New quiz-related collections
      quizCollection = db.collection('tblQuizzes');
      questionCollection = db.collection('tblQuestions');
      quizResponsesCollection = db.collection('tblQuizResponses');
    }
    return db;
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1); // Exit if we can’t connect
  }
}

// Optional getter to access the raw DB object
function getDB() {
  if (!db) throw new Error('Database not initialized. Call connectToDatabase first.');
  return db;
}

// Provide getters for each collection so other modules can use them
function getUsersCollection() {
  return usersCollection;
}

function getGradesCollection() {
  return gradesCollection;
}

function getLogsCollection() {
  return logsCollection;
}

function getCommentsCollection() {
  return commentsCollection;
}

function getBlogCollection() {
  return blogCollection;
}

// QUIZ COLLECTIONS
function getQuizCollection() {
  return quizCollection;
}

function getQuestionCollection() {
  return questionCollection;
}

function getQuizResponsesCollection() {
  return quizResponsesCollection;
}

module.exports = {
  connectToDatabase,
  getDB,
  getUsersCollection,
  getGradesCollection,
  getLogsCollection,
  getCommentsCollection,
  getBlogCollection,
  getQuizCollection,
  getQuestionCollection,
  getQuizResponsesCollection,
  ObjectId // Sometimes you need this in server.js
};
