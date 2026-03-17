function paymentUpdateSummary({ payment_id, attendee_no, changes }) {
  // changes: { field: [old, new], ... }
  const changedFields = Object.entries(changes)
    .map(([field, [oldVal, newVal]]) => `${field}: "${oldVal}" → "${newVal}"`)
    .join('; ');
  return `Updated payment (${payment_id}) for attendee_no ${attendee_no}. Changes: ${changedFields}`;
}

// You can add more summary generators for other entities here

module.exports = { paymentUpdateSummary };