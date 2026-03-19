const { ObjectId } = require('mongodb');

const { createCollection } = require('../helpers/inMemoryMongo');
const { _private } = require('../../app/socketManager');

describe('socketManager stale session recovery', () => {
  it('cancels orphaned active sessions for a reused game pin', async () => {
    const staleId = new ObjectId();
    const sessionsCollection = createCollection([
      {
        _id: staleId,
        pin: '1234567',
        status: 'lobby',
        createdAt: new Date('2026-03-19T00:00:00Z')
      }
    ]);

    await _private.cancelOrphanedSessionsByPin(sessionsCollection, '1234567');

    const updated = await sessionsCollection.findOne({ _id: staleId });
    expect(updated.status).toBe('cancelled');
    expect(updated.finishedAt).toBeInstanceOf(Date);
    expect(updated.cancelledReason).toMatch(/Recovered stale session/i);
  });
});
