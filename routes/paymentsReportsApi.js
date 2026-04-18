const express = require('express');
const { isAdminOrManager } = require('../middleware/routeAuthGuards');
const { logAuditTrail } = require('../utils/auditTrail');
const { paymentUpdateSummary } = require('../utils/auditTrailUtils');
const {
  pickPaymentUpdates,
  fetchPaymentRowsByEventId,
  fetchPaymentById,
  updatePaymentById,
  deletePaymentById
} = require('../utils/paymentInfoStore');

const router = express.Router();

router.get('/', isAdminOrManager, async (req, res) => {
  try {
    const eventId = req.query.event_id;
    if (!eventId) {
      return res.status(400).json({ error: 'Missing event_id' });
    }

    return res.json(await fetchPaymentRowsByEventId(eventId));
  } catch (error) {
    console.error('Error in GET /api/payments-report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:payment_id', isAdminOrManager, async (req, res) => {
  try {
    const { payment_id: paymentId } = req.params;
    const existingPayment = await fetchPaymentById(paymentId);

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

    const updatedPayment = await updatePaymentById(paymentId, updates);
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
    const existingPayment = await fetchPaymentById(paymentId);

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await deletePaymentById(paymentId);
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
