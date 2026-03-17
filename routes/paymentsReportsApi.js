const express = require('express');
const router = express.Router();
const { isAdminOrManager } = require('../middleware/routeAuthGuards');

// You may need to require your DB connection here
const { MongoClient } = require('mongodb');
const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);

router.get('/', isAdminOrManager, async (req, res) => {
  try {
    const eventId = req.query.event_id;
    if (!eventId) return res.status(400).json({ error: 'Missing event_id' });

    await client.connect();
    const db = client.db('myDatabase');
    const paymentInfo = db.collection('payment_info');
    const attendees = db.collection('attendees');

    // Join payment_info with attendees on attendee_no, filter by event_id
    const results = await paymentInfo.aggregate([
      {
        $lookup: {
          from: 'attendees',
          localField: 'attendee_no',
          foreignField: 'attendee_no',
          as: 'attendee'
        }
      },
      { $unwind: '$attendee' },
      { $match: { 'attendee.event_id': eventId } },
      {
        $project: {
          payment_id: 1,
          attendee_no: 1,
          first_name: '$attendee.first_name',
          last_name: '$attendee.last_name',
          organization: '$attendee.organization',
          payment_status: 1,
          amount: 1,
          form_of_payment: 1,
          date_full_payment: 1,
          date_partial_payment: 1,
          account: 1,
          or_number: 1,
          quickbooks_no: 1,
          shipping_tracking_no: 1,
          notes: 1,
          created_at: 1
        }
      }
    ]).toArray();

    res.json(results);
  } catch (err) {
    console.error('Error in /api/payments-report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
