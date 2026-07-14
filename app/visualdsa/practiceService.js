function serviceError(code, message) { return Object.assign(new Error(message), { code }); }
const { studentMisconception } = require('./misconceptionCatalog');

function createPracticeService({ repository, validateModuleAction, problemEngine, authorizeEnrollment }) {
  if (!repository) throw new TypeError('Practice repository is required.');
  return Object.freeze({
    async startPractice({ identity, moduleDefinition, request }) {
      const classId = request.classId ? String(request.classId).toLowerCase() : null;
      if (classId && (!/^[a-f0-9]{24}$/.test(classId) || (authorizeEnrollment && !(await authorizeEnrollment({ classId, studentId: identity.studentId }))))) {
        throw serviceError('PRACTICE_CLASS_ACCESS_DENIED', 'Class-scoped practice access denied.');
      }
      const seed = problemEngine?.createSeed(`P-${moduleDefinition.key}`);
      const generated = problemEngine?.generateProblem({ templateKey: request.templateKey, seed });
      const problem = await repository.createProblem({ moduleDefinition, templateKey: request.templateKey, difficulty: request.difficulty, generated });
      return repository.createPractice({ identity, moduleDefinition, problem, classId });
    },
    async submitPracticeAction({ identity, sessionId, action }) {
      const session = await repository.findPractice(sessionId);
      if (!session || session.studentId !== identity.studentId || session.userId !== identity.userId) throw serviceError('PRACTICE_SESSION_ACCESS_DENIED', 'Access denied.');
      if (!['created', 'in_progress'].includes(session.status)) throw serviceError('PRACTICE_SESSION_NOT_ACTIVE', 'Session is not active.');
      const duplicate = await repository.findActionByClientEventId(action.clientEventId);
      if (duplicate) {
        if (duplicate.studentId !== identity.studentId || duplicate.practiceSessionId !== sessionId) throw serviceError('PRACTICE_SESSION_ACCESS_DENIED', 'Duplicate event belongs to another resource.');
        return { ...duplicate.result, duplicate: true };
      }
      const problem = repository.loadPracticeProblem ? await repository.loadPracticeProblem(session.problemInstanceId) : null;
      const validation = problemEngine && problem
        ? problemEngine.validateAction({ templateKey: session.templateKey, problem, action })
        : await validateModuleAction({ session, action });
      const prior = repository.listPracticeActions ? await repository.listPracticeActions(sessionId, action.stepNumber) : [];
      const responseNumber = prior.length + 1;
      const stored = await repository.appendPracticeAction({ identity, session, action, validation, responseNumber });
      const moduleKey = session.templateKey?.startsWith('array-') ? 'arrays' : session.templateKey?.startsWith('stack-') ? 'stacks' : session.templateKey?.startsWith('queue-') ? 'queues' : session.templateKey?.startsWith('binary-') ? 'binary-search' : session.templateKey?.startsWith('bst-') ? 'bst' : 'sorting';
      return { ...stored.result, responseNumber, canRetry: !stored.result.isCorrect, hintAvailable: !stored.result.isCorrect, misconception: studentMisconception(stored.result.misconceptionCode, moduleKey), duplicate: false };
    },
    async requestHint({ identity, sessionId, stepNumber }) {
      const session = await repository.findPractice(sessionId);
      if (!session || session.studentId !== identity.studentId || session.userId !== identity.userId) throw serviceError('PRACTICE_SESSION_ACCESS_DENIED', 'Access denied.');
      if (!['created', 'in_progress'].includes(session.status)) throw serviceError('PRACTICE_SESSION_NOT_ACTIVE', 'Session is not active.');
      const actions = repository.listPracticeActions ? await repository.listPracticeActions(sessionId, stepNumber) : [];
      if (!actions.length || actions.at(-1).isCorrect) throw serviceError('HINT_NOT_AVAILABLE', 'Submit an incorrect response before requesting a hint.');
      const hintLevel = Math.min(3, 1 + actions.filter((item) => Number(item.hintLevel) > 0).length);
      if (repository.recordPracticeHint) await repository.recordPracticeHint({ identity, session, stepNumber, hintLevel });
      const hints = ['Name the rule for this operation before choosing a value.', 'Use the highlighted indexes or pointers to narrow your choice.', 'Read the active pseudocode line, then compare it with the current state.'];
      return { stepNumber, responseNumber: actions.length, hintLevel, hint: hints[hintLevel - 1] };
    },
    async completePractice({ identity, sessionId }) {
      const session = await repository.findPractice(sessionId);
      if (!session || session.studentId !== identity.studentId || session.userId !== identity.userId) throw serviceError('PRACTICE_SESSION_ACCESS_DENIED', 'Access denied.');
      if (!['created', 'in_progress'].includes(session.status)) throw serviceError('PRACTICE_SESSION_NOT_ACTIVE', 'Session is not active.');
      return repository.completePractice({ identity, session });
    }
  });
}
module.exports = { createPracticeService, serviceError };
