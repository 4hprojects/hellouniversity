const express = require('express');
const { MongoClient } = require('mongodb');
const { isAdminOrManager } = require('../middleware/routeAuthGuards');
const { logAuditTrail } = require('../utils/auditTrail');
const { paymentUpdateSummary } = require('../utils/auditTrailUtils');

const router = express.Router();
const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);

const EDITABLE_PAYMENT_FIELDS = [
  'payment_status',
  'amount',
  'form_of_payment',
  'date_full_payment',
  'date_partial_payment',
  'account',
  'or_number',
  'quickbooks_no',
  'shipping_tracking_no',
  'notes'
];

async function getPaymentInfoCollection() {
  await client.connect();
  return client.db('myDatabase').collection('payment_info');
}

function pickPaymentUpdates(body) {
  return EDITABLE_PAYMENT_FIELDS.reduce((updates, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }
    return updates;
  }, {});
}

router.get('/', isAdminOrManager, async (req, res) => {
  try {
    const eventId = req.query.event_id;
    if (!eventId) {
      return res.status(400).json({ error: 'Missing event_id' });
    }

    await client.connect();
    const db = client.db('myDatabase');
    const paymentInfo = db.collection('payment_info');

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

    return res.json(results);
  } catch (error) {
    console.error('Error in GET /api/payments-report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:payment_id', isAdminOrManager, async (req, res) => {
  try {
    const { payment_id: paymentId } = req.params;
    const paymentInfo = await getPaymentInfoCollection();
    const existingPayment = await paymentInfo.findOne({ payment_id: paymentId });

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const updates = pickPaymentUpdates(req.body || {});
    const changedFields = {};
    Object.entries(updates).forEach(([field, nextValue]) => {
      const currentValue = existingPayment[field] ?? null;
      const normalizedNextValue = nextValue ?? null;
      if (currentValue !== normalizedNextValue) {
        changedFields[field] = [currentValue, normalizedNextValue];
      }
    });

    if (Object.keys(changedFields).length === 0) {
      return res.json({ success: true, updated: existingPayment, unchanged: true });
    }

    await paymentInfo.updateOne(
      { payment_id: paymentId },
      { $set: updates }
    );

    const updatedPayment = await paymentInfo.findOne({ payment_id: paymentId });
    await logAuditTrail({
      req,
      action: 'Update Payment Report Record',
      details: paymentUpdateSummary({
        payment_id: paymentId,
        attendee_no: existingPayment.attendee_no,
        changes: changedFields
      })
    });

    return res.json({ success: true, updated: updatedPayment });
  } catch (error) {
    console.error('Error in PUT /api/payments-report/:payment_id:', error);
    return res.status(500).json({ error: 'Failed to update payment record' });
  }
});

router.delete('/:payment_id', isAdminOrManager, async (req, res) => {
  try {
    const { payment_id: paymentId } = req.params;
    const paymentInfo = await getPaymentInfoCollection();
    const existingPayment = await paymentInfo.findOne({ payment_id: paymentId });

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await paymentInfo.deleteOne({ payment_id: paymentId });
    await logAuditTrail({
      req,
      action: 'Delete Payment Report Record',
      details: `Deleted payment (${paymentId}) for attendee_no ${existingPayment.attendee_no}.`
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/payments-report/:payment_id:', error);
    return res.status(500).json({ error: 'Failed to delete payment record' });
  }
});

module.exports = router;
