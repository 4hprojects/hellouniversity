const express = require('express');
const request = require('supertest');

const createStudentAcademicRoutes = require('../../routes/studentAcademicRoutes');
const { createCollection } = require('../helpers/inMemoryMongo');
const { isAuthenticated } = require('../../middleware/routeAuthGuards');

function buildClient({ grades = [], attendance = [] } = {}) {
  const collections = {
    tblGrades: createCollection(grades),
    tblAttendance: createCollection(attendance)
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

function buildApp({ sessionData = {}, grades = [], attendance = [] } = {}) {
  const app = express();
  app.use((req, res, next) => {
    req.session = sessionData;
    next();
  });
  app.use(createStudentAcademicRoutes({
    client: buildClient({ grades, attendance }),
    isAuthenticated
  }));
  return app;
}

describe('student academic routes smoke', () => {
  test('legacy classrecords routes redirect authenticated students to grades', async () => {
    const app = buildApp({
      sessionData: {
        userId: 'S-1001',
        role: 'student',
        studentIDNumber: '2024-00123'
      }
    });

    const htmlResponse = await request(app).get('/classrecords.html');
    const routeResponse = await request(app).get('/classrecords');

    expect(htmlResponse.status).toBe(302);
    expect(htmlResponse.headers.location).toBe('/grades');
    expect(routeResponse.status).toBe(302);
    expect(routeResponse.headers.location).toBe('/grades');
  });

  test('legacy classrecords routes redirect unauthenticated requests to login', async () => {
    const app = buildApp();

    const response = await request(app).get('/classrecords');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test('grade endpoint returns student grade data for authenticated users', async () => {
    const app = buildApp({
      sessionData: {
        userId: 'S-1001',
        role: 'student',
        studentIDNumber: '2024-00123'
      },
      grades: [{
        studentIDNumber: '2024-00123',
        CourseID: 'COMP101',
        CourseDescription: 'Intro to Computing',
        MG: '1.50',
        FG: '1.25',
        TFG: '1.25',
        createdAt: new Date('2026-03-29T08:00:00Z')
      }]
    });

    const response = await request(app).get('/get-grades/2024-00123');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.gradeDataArray).toHaveLength(1);
    expect(response.body.gradeDataArray[0].courseID).toBe('COMP101');
    expect(response.body.gradeDataArray[0].courseDescription).toBe('Intro to Computing');
    expect(response.body.gradeDataArray[0].totalFinalGrade).toBe('1.25');
  });
});
