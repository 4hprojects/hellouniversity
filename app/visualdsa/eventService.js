const { CODES, EVENT_TYPES, MODES, isKnownCode } = require('./eventCatalog');
function fail(code, message) { throw Object.assign(new Error(message), { code }); }
function createEventService(repository, { authorizeEnrollment } = {}) {
  return Object.freeze({
    async ingest({ identity, event, context }) {
      if (['isCorrect', 'misconceptionCode', 'submittedValue', 'practiceSessionId', 'assessmentAttemptId'].some((field) => context[field] != null)) {
        fail('INVALID_INPUT', 'Scored evidence is server-controlled.');
      }
      if (!EVENT_TYPES.has(event.eventType)) fail('INVALID_INPUT', 'Unknown event type.');
      if (!MODES.has(context.mode)) fail('INVALID_INPUT', 'Unknown VisualDSA mode.');
      if (!Object.hasOwn(CODES, context.moduleKey)) fail('INVALID_INPUT', 'Unknown module key.');
      if (!isKnownCode(context.moduleKey, context.misconceptionCode)) fail('INVALID_INPUT', 'Unknown misconception code.');
      if (!/^\d+\.\d+\.\d+$/.test(String(context.moduleVersion || ''))) fail('INVALID_INPUT', 'Invalid module version.');
      if (!/^[a-z0-9-]{1,80}$/.test(String(context.lessonSlug || ''))) fail('INVALID_INPUT', 'Invalid lesson slug.');
      if (event.clientTimestamp && Number.isNaN(Date.parse(event.clientTimestamp))) fail('INVALID_INPUT', 'Invalid client timestamp.');
      if (JSON.stringify(event.metadata || {}).length > 8192) fail('INVALID_INPUT', 'Event metadata is too large.');
      const classId = context.classId ? String(context.classId).toLowerCase() : null;
      if (classId && (!/^[a-f0-9]{24}$/.test(classId) || (authorizeEnrollment && !(await authorizeEnrollment({ classId, studentId: identity.studentId }))))) fail('EVENT_ACCESS_DENIED', 'Class event access denied.');
      if (context.responseTimeMs != null && (!Number.isInteger(context.responseTimeMs) || context.responseTimeMs < 0)) fail('INVALID_INPUT', 'Invalid response time.');
      const duplicate = await repository.findByEventId(event.eventId);
      if (duplicate) {
        if (duplicate.studentId !== identity.studentId) fail('EVENT_ACCESS_DENIED', 'Event belongs to another student.');
        return { eventId: duplicate.eventId, duplicate: true };
      }
      const stored = await repository.append({
        eventId: event.eventId, schemaVersion: 1, userId: identity.userId, studentId: identity.studentId, classId,
        eventType: event.eventType, clientTimestamp: event.clientTimestamp || null,
        lessonSlug: context.lessonSlug, moduleKey: context.moduleKey, moduleVersion: context.moduleVersion,
        mode: context.mode, practiceSessionId: context.practiceSessionId || null,
        assessmentAttemptId: context.assessmentAttemptId || null, problemSeed: context.problemSeed || null,
        stepNumber: context.stepNumber ?? null, actionType: context.actionType || null,
        submittedValue: context.submittedValue || null, isCorrect: context.isCorrect ?? null,
        responseNumber: context.responseNumber ?? null, hintLevel: context.hintLevel ?? null,
        responseTimeMs: context.responseTimeMs ?? null, misconceptionCode: context.misconceptionCode || null,
        metadata: event.metadata || {}
      });
      return { eventId: stored.eventId, duplicate: false };
    }
  });
}
module.exports = { createEventService };
