const express = require('express');
const request = require('supertest');
const createRoutes = require('../../routes/visualDsaApiRoutes');

function appFor({ session = {}, csrf = true, service, assessmentService, eventService, masteryService, instructorAnalyticsService } = {}) {
  const app = express();
  app.use((req, _res, next) => { req.session = session; next(); });
  app.use('/api/visualdsa', createRoutes({
    service, assessmentService, eventService, masteryService, instructorAnalyticsService,
    requireSession: (req, res, next) => req.session.userId ? next() : res.status(401).json({ error: { code: 'AUTH_REQUIRED' } }),
    requireCsrf: (_req, res, next) => csrf ? next() : res.status(403).json({ error: { code: 'CSRF_INVALID' } })
  }));
  return app;
}

describe('VisualDSA API foundation', () => {
  test('returns public module metadata without scoring secrets', async () => {
    const response = await request(appFor()).get('/api/visualdsa/modules/arrays');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ moduleKey: 'arrays', version: '1.0.0' }));
    expect(response.body).not.toHaveProperty('scoringPolicy');
  });
  test('requires session and CSRF for practice writes', async () => {
    expect((await request(appFor()).post('/api/visualdsa/practice-sessions').send({ moduleKey: 'arrays' })).status).toBe(401);
    expect((await request(appFor({ session: { userId: 'u', studentIDNumber: 's', role: 'student' }, csrf: false }))
      .post('/api/visualdsa/practice-sessions').send({ moduleKey: 'arrays' })).status).toBe(403);
  });
  test('protects and validates the server-derived practice hint endpoint', async () => {
    const service={requestHint:jest.fn(async()=>({stepNumber:2,responseNumber:1,hintLevel:1,hint:'Use the active line.'}))};
    const path='/api/visualdsa/practice-sessions/123e4567-e89b-12d3-a456-426614174000/steps/2/hint';
    expect((await request(appFor({session:{userId:'u',studentIDNumber:'s',role:'student'},csrf:false,service})).post(path)).status).toBe(403);
    const response=await request(appFor({session:{userId:'u',studentIDNumber:'s',role:'student'},service})).post(path);
    expect(response.status).toBe(200);expect(service.requestHint).toHaveBeenCalledWith(expect.objectContaining({stepNumber:2,identity:{userId:'u',studentId:'s'}}));
  });
  test('derives identity from session and ignores body student identity', async () => {
    const service = { startPractice: jest.fn(async ({ identity }) => ({ sessionId: 'id', studentId: identity.studentId })) };
    const response = await request(appFor({ session: { userId: 'u1', studentIDNumber: 'real', role: 'student' }, service }))
      .post('/api/visualdsa/practice-sessions').send({ moduleKey: 'arrays', studentId: 'fake' });
    expect(response.status).toBe(201);
    expect(response.body.studentId).toBe('real');
  });
  test('does not expose unauthorized class-scoped practice', async () => { const service={startPractice:jest.fn(async()=>{throw Object.assign(new Error('private'),{code:'PRACTICE_CLASS_ACCESS_DENIED'});})};const response=await request(appFor({session:{userId:'u1',studentIDNumber:'s1',role:'student'},service})).post('/api/visualdsa/practice-sessions').send({moduleKey:'arrays',classId:'507f1f77bcf86cd799439011'});expect(response.status).toBe(403);expect(response.text).not.toContain('private'); });
  test('rejects non-student roles and unknown modules', async () => {
    const service = { startPractice: jest.fn() };
    expect((await request(appFor({ session: { userId: 'u', role: 'teacher' }, service })).post('/api/visualdsa/practice-sessions').send({ moduleKey: 'arrays' })).status).toBe(403);
    expect((await request(appFor({ session: { userId: 'u', studentIDNumber: 's', role: 'student' }, service })).post('/api/visualdsa/practice-sessions').send({ moduleKey: 'nope' })).status).toBe(422);
  });
  test('translates storage failures without exposing provider errors', async () => {
    const service = { startPractice: jest.fn(async () => { throw Object.assign(new Error('database secret'), { code: 'VISUALDSA_DATABASE_ERROR' }); }) };
    const response = await request(appFor({ session: { userId: 'u', studentIDNumber: 's', role: 'student' }, service }))
      .post('/api/visualdsa/practice-sessions').send({ moduleKey: 'arrays' });
    expect(response.status).toBe(503);
    expect(response.text).not.toContain('database secret');
    expect(response.body.error.code).toBe('VISUALDSA_DATABASE_ERROR');
  });
  test('blocks cross-user assessment resume', async () => {
    const assessmentService = { resume: jest.fn(async () => { throw Object.assign(new Error('denied'), { code: 'ATTEMPT_ACCESS_DENIED' }); }) };
    const response = await request(appFor({ session: { userId: 'u1', studentIDNumber: 's1', role: 'student' }, assessmentService }))
      .get('/api/visualdsa/assessment-attempts/123e4567-e89b-12d3-a456-426614174000');
    expect(response.status).toBe(403);
  });
  test.each(['ATTEMPT_EXPIRED', 'ATTEMPT_ALREADY_SUBMITTED'])('returns conflict for %s', async (code) => {
    const assessmentService = { submit: jest.fn(async () => { throw Object.assign(new Error(code), { code }); }) };
    const response = await request(appFor({ session: { userId: 'u1', studentIDNumber: 's1', role: 'student' }, assessmentService }))
      .post('/api/visualdsa/assessment-attempts/123e4567-e89b-12d3-a456-426614174000/submit');
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe(code);
  });
  test('rejects fake score and correctness fields before assessment action persistence', async () => {
    const assessmentService = { submitAction: jest.fn() };
    const response = await request(appFor({ session: { userId: 'u1', studentIDNumber: 's1', role: 'student' }, assessmentService }))
      .post('/api/visualdsa/assessment-attempts/123e4567-e89b-12d3-a456-426614174000/actions')
      .send({ clientEventId: '123e4567-e89b-12d3-a456-426614174001', stepNumber: 0, actionType: 'select', payload: { index: 1 }, score: 100, isCorrect: true });
    expect(response.status).toBe(422);
    expect(assessmentService.submitAction).not.toHaveBeenCalled();
  });
  test('returns an idempotent duplicate assessment result', async () => {
    const assessmentService = { submitAction: jest.fn(async () => ({ accepted: true, duplicate: true })) };
    const response = await request(appFor({ session: { userId: 'u1', studentIDNumber: 's1', role: 'student' }, assessmentService }))
      .post('/api/visualdsa/assessment-attempts/123e4567-e89b-12d3-a456-426614174000/actions')
      .send({ clientEventId: '123e4567-e89b-12d3-a456-426614174001', stepNumber: 0, actionType: 'select', payload: { index: 1 } });
    expect(response.status).toBe(200);
    expect(response.body.duplicate).toBe(true);
  });
  test('rejects malformed assessment identifiers before storage access', async () => {
    const assessmentService = { start: jest.fn(), resume: jest.fn() };
    const app = appFor({ session: { userId: 'u1', studentIDNumber: 's1', role: 'student' }, assessmentService });
    expect((await request(app).post('/api/visualdsa/assessment-attempts').send({ assignmentId: 'not-a-uuid' })).status).toBe(422);
    expect((await request(app).get('/api/visualdsa/assessment-attempts/not-a-uuid')).status).toBe(422);
    expect(assessmentService.start).not.toHaveBeenCalled();
    expect(assessmentService.resume).not.toHaveBeenCalled();
  });
  test('writes events with session identity and rejects invalid taxonomy',async()=>{
    const eventService={ingest:jest.fn(async({identity})=>({eventId:'e',studentId:identity.studentId}))};
    const response=await request(appFor({session:{userId:'u',studentIDNumber:'s',role:'student'},eventService})).post('/api/visualdsa/events').send({eventId:'123e4567-e89b-12d3-a456-426614174000',eventType:'module_opened',context:{lessonSlug:'arrays',moduleKey:'arrays',moduleVersion:'1.0.0',mode:'guided'}});
    expect(response.status).toBe(201);expect(eventService.ingest).toHaveBeenCalledWith(expect.objectContaining({identity:{userId:'u',studentId:'s'}}));
  });
  test('rejects malformed event IDs and client-scored event evidence', async () => {
    const eventService = { ingest: jest.fn(async ({ context }) => { if (context.isCorrect != null) throw Object.assign(new Error('controlled'), { code: 'INVALID_INPUT' }); return {}; }) };
    const app = appFor({ session: { userId: 'u', studentIDNumber: 's', role: 'student' }, eventService });
    expect((await request(app).post('/api/visualdsa/events').send({ eventId: 'bad', eventType: 'module_opened', context: { moduleKey: 'arrays', mode: 'guided' } })).status).toBe(422);
    expect((await request(app).post('/api/visualdsa/events').send({ eventId: '123e4567-e89b-12d3-a456-426614174000', eventType: 'module_opened', context: { moduleKey: 'arrays', mode: 'guided', isCorrect: true } })).status).toBe(422);
  });
  test('student analytics are session-owned and reject instructors',async()=>{const masteryService={getStudentDashboard:jest.fn(async identity=>({studentId:identity.studentId,assessmentHistory:[],recommendations:[]}))};const own=await request(appFor({session:{userId:'u',studentIDNumber:'s1',role:'student'},masteryService})).get('/api/visualdsa/me/progress');expect(own.status).toBe(200);expect(own.body.studentId).toBe('s1');const forbidden=await request(appFor({session:{userId:'t',role:'teacher'},masteryService})).get('/api/visualdsa/me/progress');expect(forbidden.status).toBe(403);});
  test('serves class analytics only through an instructor session', async () => {
    const instructorAnalyticsService = { overview: jest.fn(async (identity, classId) => ({ identity, classId, masteryMatrix: [] })) };
    const path = '/api/visualdsa/instructor/classes/507f1f77bcf86cd799439011/overview';
    const allowed = await request(appFor({ session: { userId: 'teacher-1', role: 'teacher' }, instructorAnalyticsService })).get(path);
    expect(allowed.status).toBe(200);
    expect(instructorAnalyticsService.overview).toHaveBeenCalledWith({ userId: 'teacher-1', role: 'teacher' }, '507f1f77bcf86cd799439011');
    const denied = await request(appFor({ session: { userId: 'student-1', studentIDNumber: 's1', role: 'student' }, instructorAnalyticsService })).get(path);
    expect(denied.status).toBe(403);
  });
  test('does not reveal cross-class analytics and exports server-generated CSV', async () => {
    const deniedService = { overview: jest.fn(async () => { throw Object.assign(new Error('private detail'), { code: 'CLASS_ACCESS_DENIED' }); }) };
    const base = '/api/visualdsa/instructor/classes/507f1f77bcf86cd799439011';
    const denied = await request(appFor({ session: { userId: 'teacher-2', role: 'teacher' }, instructorAnalyticsService: deniedService })).get(`${base}/overview`);
    expect(denied.status).toBe(403);
    expect(denied.text).not.toContain('private detail');
    const exportService = { exportCsv: jest.fn(async () => 'module,started\r\narrays,1\r\n') };
    const exported = await request(appFor({ session: { userId: 'teacher-1', role: 'teacher' }, instructorAnalyticsService: exportService })).get(`${base}/export`);
    expect(exported.status).toBe(200);
    expect(exported.headers['content-type']).toMatch(/text\/csv/);
    expect(exported.text).toContain('arrays,1');
  });
  test('publishes assessments through instructor authorization and CSRF', async () => {
    const instructorAnalyticsService={createAssignment:jest.fn(async(identity,classId,body)=>({assignmentId:'a1',createdBy:identity.userId,classId,title:body.title}))};const path='/api/visualdsa/instructor/classes/507f1f77bcf86cd799439011/assignments';
    const allowed=await request(appFor({session:{userId:'teacher-1',role:'teacher'},instructorAnalyticsService})).post(path).send({title:'Pilot'});expect(allowed.status).toBe(201);expect(allowed.body.createdBy).toBe('teacher-1');
    expect((await request(appFor({session:{userId:'teacher-1',role:'teacher'},csrf:false,instructorAnalyticsService})).post(path).send({title:'Pilot'})).status).toBe(403);
    expect((await request(appFor({session:{userId:'student-1',role:'student'},instructorAnalyticsService})).post(path).send({title:'Pilot'})).status).toBe(403);
  });
});
