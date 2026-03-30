const express = require('express');
const request = require('supertest');

const createSearchRoutes = require('../../routes/searchRoutes');
const { createCollection } = require('../helpers/inMemoryMongo');

function buildClient({ users = [], grades = [] } = {}) {
  const collections = {
    tblUser: createCollection(users),
    tblGrades: createCollection(grades)
  };

  return {
    db() {
      return {
        collection(name) {
          return collections[name];
        }
      };
    }
  };
}

function buildApp(data) {
  const app = express();
  app.use(createSearchRoutes({ client: buildClient(data) }));
  return app;
}

describe('search routes smoke', () => {
  test('rejects empty search queries', async () => {
    const app = buildApp();

    const response = await request(app).get('/api/search-records');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Search query is required.');
  });

  test('treats regex metacharacters as literal search text', async () => {
    const app = buildApp({
      users: [
        {
          studentIDNumber: '2024-00123',
          firstName: 'Kayla',
          lastName: 'Ryhs',
          emaildb: 'kayla@example.com'
        },
        {
          studentIDNumber: '2024-00456',
          firstName: 'Literal',
          lastName: 'Match',
          emaildb: 'literal.*@example.com'
        }
      ],
      grades: [
        {
          studentIDNumber: '2024-00456',
          CourseID: 'REGEX101',
          CourseDescription: 'Literal .* course',
          MG: '1.50',
          FG: '1.25'
        }
      ]
    });

    const response = await request(app).get('/api/search-records').query({ query: '.*' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].studentIDNumber).toBe('2024-00456');
    expect(response.body.results[0].CourseID).toBe('REGEX101');
  });
});
