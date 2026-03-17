const express = require('express');
const router = express.Router();
const { getMongoClient } = require('../utils/mongoClient');
const { ObjectId } = require('mongodb');

// GET /api/user - returns logged-in user's info
router.get('/user', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const client = await getMongoClient();
    const db = client.db('myDatabase');
    const user = await db.collection('tblUser').findOne({ _id: new ObjectId(req.session.userId) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ firstName: user.firstName, lastName: user.lastName, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;