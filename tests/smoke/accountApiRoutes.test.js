const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');

const createAccountApiRoutes = require('../../routes/accountApiRoutes');

function buildAccountApp({ sessionData, usersCollection }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionData;
    next();
  });

  app.use(
    '/api',
    createAccountApiRoutes({
      getUsersCollection: () => usersCollection,
      isAuthenticated(req, res, next) {
        if (req.session?.userId) {
          return next();
        }
        return res
          .status(401)
          .json({ success: false, message: 'Unauthorized' });
      },
      bcrypt: {
        compare: jest.fn(),
        hash: jest.fn(),
      },
      validator: {
        trim(value) {
          return String(value || '').trim();
        },
        isEmail(value) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
        },
        normalizeEmail(value) {
          return String(value || '')
            .trim()
            .toLowerCase();
        },
      },
    }),
  );

  return app;
}

describe('account API routes smoke', () => {
  const userId = '507f1f77bcf86cd799439011';

  test('rejects profile updates without a csrf token', async () => {
    const usersCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };
    const app = buildAccountApp({
      sessionData: { userId, role: 'manager', csrfToken: 'expected-token' },
      usersCollection,
    });

    const response = await request(app).put('/api/account/profile').send({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid CSRF token.',
    });
    expect(usersCollection.findOne).not.toHaveBeenCalled();
  });

  test('updates the account profile when the csrf token is valid', async () => {
    const storedUser = {
      _id: new ObjectId(userId),
      firstName: 'Ada',
      lastName: 'Lovelace',
      studentIDNumber: '2024001',
      role: 'manager',
      emaildb: 'ada@example.com',
      emailConfirmed: true,
      createdAt: new Date('2026-04-01T00:00:00Z'),
    };
    const usersCollection = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ ...storedUser })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...storedUser,
          firstName: 'Augusta',
          lastName: 'King',
        }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };
    const app = buildAccountApp({
      sessionData: { userId, role: 'manager', csrfToken: 'csrf-1' },
      usersCollection,
    });

    const response = await request(app)
      .put('/api/account/profile')
      .set('x-csrf-token', 'csrf-1')
      .send({
        firstName: 'Augusta',
        lastName: 'King',
        email: 'augusta@example.com',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Profile updated.',
      user: {
        firstName: 'Augusta',
        lastName: 'King',
      },
    });
    expect(usersCollection.updateOne).toHaveBeenCalledTimes(1);
  });
});
