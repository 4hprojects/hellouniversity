const express = require('express');
const { getVisualDsaModuleBySlug, getVisualDsaModules } = require('../app/visualdsa/moduleRegistry');
const { getVisualDsaInstructorIdentity, getVisualDsaStudentIdentity } = require('../app/visualdsa/identity');
const { assertUuid, validateAction } = require('../app/visualdsa/validators');

function error(res, status, code, message) {
  return res.status(status).json({ error: { code, message, requestId: res.locals.requestId || null } });
}

module.exports = function createVisualDsaApiRoutes(options = {}) {
  const router = express.Router();
  const requireSession = options.requireSession || ((_req, _res, next) => next());
  const requireCsrf = options.requireCsrf || ((_req, _res, next) => next());
  const actionLimit = options.actionLimit || ((_req, _res, next) => next());
  const service = options.service;
  const assessmentService = options.assessmentService;
  const eventService = options.eventService;
  const masteryService = options.masteryService;
  const instructorAnalyticsService = options.instructorAnalyticsService;

  router.get('/modules/:moduleKey', (req, res) => {
    const moduleDefinition = getVisualDsaModules().find((item) => item.key === req.params.moduleKey)
      || getVisualDsaModuleBySlug(req.params.moduleKey);
    if (!moduleDefinition) return error(res, 404, 'MODULE_NOT_FOUND', 'VisualDSA module not found.');
    return res.json({ moduleKey: moduleDefinition.key, version: moduleDefinition.version, title: moduleDefinition.title,
      lessonHref: `/data-structures-and-algorithms/${moduleDefinition.relatedLessonSlugs[0]}`,
      supportedModes: moduleDefinition.supportedModes, status: moduleDefinition.status });
  });

  router.post('/practice-sessions', requireSession, requireCsrf, actionLimit, express.json(), async (req, res) => {
    if (!service) return error(res, 503, 'SERVICE_UNAVAILABLE', 'VisualDSA persistence is unavailable.');
    let identity;
    try { identity = getVisualDsaStudentIdentity(req); } catch (_err) { return error(res, 403, 'ROLE_FORBIDDEN', 'Student access is required.'); }
    const moduleDefinition = getVisualDsaModules().find((item) => item.key === req.body?.moduleKey);
    if (!moduleDefinition) return error(res, 422, 'INVALID_INPUT', 'Unknown module key.');
    try {
      const session = await service.startPractice({ identity, moduleDefinition, request: req.body });
      return res.status(201).json(session);
    } catch (err) {
      if (err.code === 'VISUALDSA_DATABASE_ERROR') return error(res, 503, err.code, 'VisualDSA storage is temporarily unavailable.');
      if (err.code === 'PRACTICE_CLASS_ACCESS_DENIED') return error(res, 403, err.code, 'Class-scoped practice access denied.');
      if (['INVALID_INPUT', 'MODULE_VERSION_UNAVAILABLE'].includes(err.code)) return error(res, 422, err.code, err.message);
      return error(res, 500, 'INTERNAL_ERROR', 'Unable to start VisualDSA practice.');
    }
  });

  router.post('/practice-sessions/:sessionId/actions', requireSession, requireCsrf, actionLimit, express.json(), async (req, res) => {
    if (!service) return error(res, 503, 'SERVICE_UNAVAILABLE', 'VisualDSA persistence is unavailable.');
    let identity;
    try { identity = getVisualDsaStudentIdentity(req); } catch (_err) { return error(res, 403, 'ROLE_FORBIDDEN', 'Student access is required.'); }
    let sessionId; let action;
    try { sessionId = assertUuid(req.params.sessionId, 'sessionId'); action = validateAction(req.body); }
    catch (err) { return error(res, 422, err.code || 'INVALID_INPUT', err.message); }
    try {
      return res.json(await service.submitPracticeAction({ identity, sessionId, action }));
    } catch (err) {
      if (err.code === 'PRACTICE_SESSION_ACCESS_DENIED') return error(res, 403, err.code, 'Practice session access denied.');
      if (err.code === 'PRACTICE_SESSION_NOT_ACTIVE') return error(res, 409, err.code, 'Practice session is not active.');
      if (err.code === 'MODULE_VALIDATION_UNAVAILABLE') return error(res, 503, err.code, 'Module validation is temporarily unavailable.');
      if (err.code === 'VISUALDSA_DATABASE_ERROR') return error(res, 503, err.code, 'VisualDSA storage is temporarily unavailable.');
      return error(res, 500, 'INTERNAL_ERROR', 'Unable to record the VisualDSA action.');
    }
  });

  router.post('/practice-sessions/:sessionId/steps/:stepNumber/hint', requireSession, requireCsrf, actionLimit, async (req, res) => {
    if (!service) return error(res, 503, 'SERVICE_UNAVAILABLE', 'VisualDSA persistence is unavailable.');
    let identity; let sessionId; const stepNumber=Number(req.params.stepNumber);
    try { identity=getVisualDsaStudentIdentity(req);sessionId=assertUuid(req.params.sessionId,'sessionId');if(!Number.isInteger(stepNumber)||stepNumber<0)throw Object.assign(new Error('stepNumber must be a non-negative integer.'),{code:'INVALID_INPUT'}); }
    catch(err){return error(res,err.code==='INVALID_INPUT'?422:403,err.code||'ROLE_FORBIDDEN',err.message);}
    try{return res.json(await service.requestHint({identity,sessionId,stepNumber}));}catch(err){const statuses={PRACTICE_SESSION_ACCESS_DENIED:403,PRACTICE_SESSION_NOT_ACTIVE:409,HINT_NOT_AVAILABLE:409,VISUALDSA_DATABASE_ERROR:503};return error(res,statuses[err.code]||500,err.code||'INTERNAL_ERROR',statuses[err.code]?err.message:'Unable to provide a practice hint.');}
  });

  router.post('/practice-sessions/:sessionId/complete', requireSession, requireCsrf, actionLimit, async (req, res) => {
    if (!service) return error(res, 503, 'SERVICE_UNAVAILABLE', 'VisualDSA persistence is unavailable.');
    let identity; let sessionId;
    try { identity = getVisualDsaStudentIdentity(req); }
    catch (_err) { return error(res, 403, 'ROLE_FORBIDDEN', 'Student access is required.'); }
    try { sessionId = assertUuid(req.params.sessionId, 'sessionId'); }
    catch (err) { return error(res, 422, err.code || 'INVALID_INPUT', err.message); }
    try { return res.json(await service.completePractice({ identity, sessionId })); }
    catch (err) {
      if (err.code === 'PRACTICE_SESSION_ACCESS_DENIED') return error(res, 403, err.code, 'Practice session access denied.');
      if (err.code === 'PRACTICE_SESSION_NOT_ACTIVE') return error(res, 409, err.code, 'Practice session is not active.');
      if (err.code === 'VISUALDSA_DATABASE_ERROR') return error(res, 503, err.code, 'VisualDSA storage is temporarily unavailable.');
      return error(res, 500, 'INTERNAL_ERROR', 'Unable to complete VisualDSA practice.');
    }
  });
  async function assessment(req, res, method) {
    if (!assessmentService) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Assessment is unavailable.');
    let identity;
    try { identity = getVisualDsaStudentIdentity(req); } catch (_err) { return error(res, 403, 'ROLE_FORBIDDEN', 'Student access is required.'); }
    try {
      const assignmentId = method === 'start' ? assertUuid(req.body?.assignmentId, 'assignmentId') : undefined;
      const attemptId = method === 'start' ? undefined : assertUuid(req.params.attemptId, 'attemptId');
      return res.status(method === 'start' ? 201 : 200).json(await assessmentService[method]({ identity, assignmentId, attemptId, action: method === 'submitAction' ? validateAction(req.body) : undefined }));
    }
    catch (err) { const statuses = { ATTEMPT_ACCESS_DENIED:403, ASSIGNMENT_NOT_AVAILABLE:409, ATTEMPT_LIMIT_REACHED:409, ATTEMPT_NOT_ACTIVE:409, ATTEMPT_EXPIRED:409, ATTEMPT_ALREADY_SUBMITTED:409, INVALID_INPUT:422 }; return error(res, statuses[err.code] || 500, err.code || 'INTERNAL_ERROR', statuses[err.code] ? err.message : 'Assessment request failed.'); }
  }
  router.post('/assessment-attempts', requireSession, requireCsrf, actionLimit, express.json(), (req,res)=>assessment(req,res,'start'));
  router.get('/assessment-attempts/:attemptId', requireSession, actionLimit, (req,res)=>assessment(req,res,'resume'));
  router.post('/assessment-attempts/:attemptId/actions', requireSession, requireCsrf, actionLimit, express.json(), (req,res)=>assessment(req,res,'submitAction'));
  router.post('/assessment-attempts/:attemptId/submit', requireSession, requireCsrf, actionLimit, (req,res)=>assessment(req,res,'submit'));
  router.post('/events',requireSession,requireCsrf,actionLimit,express.json(),async(req,res)=>{
    if(!eventService)return error(res,503,'SERVICE_UNAVAILABLE','Event storage is unavailable.');
    let identity;try{identity=getVisualDsaStudentIdentity(req);}catch(_err){return error(res,403,'ROLE_FORBIDDEN','Student access is required.');}
    try{return res.status(201).json(await eventService.ingest({identity,event:{eventId:assertUuid(req.body?.eventId,'eventId'),eventType:req.body?.eventType,clientTimestamp:req.body?.clientTimestamp,metadata:req.body?.metadata},context:req.body?.context||{}}));}
    catch(err){const status=err.code==='EVENT_ACCESS_DENIED'?403:err.code==='INVALID_INPUT'?422:503;return error(res,status,err.code||'EVENT_WRITE_FAILED',status===503?'Event storage is temporarily unavailable.':err.message);}
  });
  async function ownDashboard(req,res,section){if(!masteryService)return error(res,503,'SERVICE_UNAVAILABLE','Student analytics are unavailable.');let identity;try{identity=getVisualDsaStudentIdentity(req);}catch(_err){return error(res,403,'ROLE_FORBIDDEN','Student access is required.');}try{const dashboard=await masteryService.getStudentDashboard(identity);return res.json(section?dashboard[section]:dashboard);}catch(_err){return error(res,503,'VISUALDSA_DATABASE_ERROR','Student analytics are temporarily unavailable.');}}
  router.get('/me/progress',requireSession,(req,res)=>ownDashboard(req,res));
  router.get('/me/attempts',requireSession,(req,res)=>ownDashboard(req,res,'assessmentHistory'));
  router.get('/me/recommendations',requireSession,(req,res)=>ownDashboard(req,res,'recommendations'));

  async function instructorDashboard(req, res, section) {
    if (!instructorAnalyticsService) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Instructor analytics are unavailable.');
    let identity;
    try { identity = getVisualDsaInstructorIdentity(req); }
    catch (_err) { return error(res, 403, 'ROLE_FORBIDDEN', 'Instructor access is required.'); }
    try {
      const dashboard = await instructorAnalyticsService.overview(identity, req.params.classId);
      return res.json(section ? dashboard[section] : dashboard);
    } catch (err) {
      if (err.code === 'CLASS_ACCESS_DENIED') return error(res, 403, err.code, 'Class access denied.');
      if (err.code === 'CLASS_STORAGE_UNAVAILABLE') return error(res, 503, err.code, 'Class storage is unavailable.');
      return error(res, 503, 'VISUALDSA_DATABASE_ERROR', 'Instructor analytics are temporarily unavailable.');
    }
  }
  router.get('/instructor/classes/:classId/overview', requireSession, (req, res) => instructorDashboard(req, res));
  router.get('/instructor/classes/:classId/mastery', requireSession, (req, res) => instructorDashboard(req, res, 'masteryMatrix'));
  router.get('/instructor/classes/:classId/misconceptions', requireSession, (req, res) => instructorDashboard(req, res, 'misconceptions'));
  router.get('/instructor/classes/:classId/students/:studentId', requireSession, async (req, res) => {
    if (!instructorAnalyticsService) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Instructor analytics are unavailable.');
    let identity;
    try { identity = getVisualDsaInstructorIdentity(req); }
    catch (_err) { return error(res, 403, 'ROLE_FORBIDDEN', 'Instructor access is required.'); }
    try { return res.json(await instructorAnalyticsService.student(identity, req.params.classId, req.params.studentId)); }
    catch (err) {
      if (err.code === 'CLASS_ACCESS_DENIED') return error(res, 403, err.code, 'Class access denied.');
      return error(res, 503, 'VISUALDSA_DATABASE_ERROR', 'Student analytics are temporarily unavailable.');
    }
  });
  router.get('/instructor/classes/:classId/export', requireSession, async (req, res) => {
    if (!instructorAnalyticsService) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Instructor analytics are unavailable.');
    let identity;
    try { identity = getVisualDsaInstructorIdentity(req); }
    catch (_err) { return error(res, 403, 'ROLE_FORBIDDEN', 'Instructor access is required.'); }
    try {
      const csv = await instructorAnalyticsService.exportCsv(identity, req.params.classId);
      res.set('Content-Disposition', `attachment; filename="visualdsa-${req.params.classId}.csv"`);
      return res.type('text/csv').send(csv);
    } catch (err) {
      if (err.code === 'CLASS_ACCESS_DENIED') return error(res, 403, err.code, 'Class access denied.');
      return error(res, 503, 'VISUALDSA_DATABASE_ERROR', 'Instructor export is temporarily unavailable.');
    }
  });
  router.post('/instructor/classes/:classId/assignments', requireSession, requireCsrf, actionLimit, express.json(), async (req, res) => {
    if (!instructorAnalyticsService) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Instructor assessment management is unavailable.');
    let identity;
    try { identity = getVisualDsaInstructorIdentity(req); }
    catch (_err) { return error(res, 403, 'ROLE_FORBIDDEN', 'Instructor access is required.'); }
    try { return res.status(201).json(await instructorAnalyticsService.createAssignment(identity, req.params.classId, req.body)); }
    catch (err) {
      if (err.code === 'CLASS_ACCESS_DENIED') return error(res, 403, err.code, 'Class access denied.');
      if (err.code === 'INVALID_INPUT') return error(res, 422, err.code, err.message);
      return error(res, 503, 'VISUALDSA_DATABASE_ERROR', 'Assessment publication is temporarily unavailable.');
    }
  });

  return router;
};
