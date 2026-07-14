function failure(code, message) { return Object.assign(new Error(message), { code }); }
function createAssessmentService({ repository, problemEngine, authorizeEnrollment }) {
  if (!repository || !problemEngine) throw new TypeError('Assessment repository and problem engine are required.');
  async function ownedAttempt(identity, attemptId) {
    const attempt = await repository.findAttempt(attemptId);
    if (!attempt || attempt.userId !== identity.userId || attempt.studentId !== identity.studentId) throw failure('ATTEMPT_ACCESS_DENIED', 'Attempt access denied.');
    return attempt;
  }
  return Object.freeze({
    async start({ identity, assignmentId, now = new Date() }) {
      const assignment = await repository.findEligibleAssignment({ assignmentId, studentId: identity.studentId });
      if (!assignment) throw failure('ASSIGNMENT_NOT_AVAILABLE', 'Assignment is unavailable.');
      if (authorizeEnrollment && !(await authorizeEnrollment({ classId: assignment.classId, studentId: identity.studentId }))) {
        throw failure('ASSIGNMENT_NOT_AVAILABLE', 'Assignment is unavailable.');
      }
      if (assignment.availableFrom && now < new Date(assignment.availableFrom)) throw failure('ASSIGNMENT_NOT_AVAILABLE', 'Assignment has not opened.');
      if (assignment.availableUntil && now > new Date(assignment.availableUntil)) throw failure('ASSIGNMENT_NOT_AVAILABLE', 'Assignment has closed.');
      const count = await repository.countAttempts({ assignmentId, studentId: identity.studentId });
      if (count >= assignment.attemptLimit) throw failure('ATTEMPT_LIMIT_REACHED', 'Attempt limit reached.');
      const seed = problemEngine.createSeed(assignment.moduleKey.toUpperCase());
      const problem = problemEngine.generateProblem({ templateKey: assignment.templateKey, seed });
      return repository.createAttempt({ identity, assignment, attemptNumber: count + 1, problem, now });
    },
    async resume({ identity, attemptId, now = new Date() }) {
      const attempt = await ownedAttempt(identity, attemptId);
      if (!['created', 'started', 'in_progress', 'paused'].includes(attempt.status)) throw failure('ATTEMPT_NOT_ACTIVE', 'Attempt is not active.');
      if (attempt.expiresAt && now > new Date(attempt.expiresAt)) throw failure('ATTEMPT_EXPIRED', 'Attempt expired.');
      return repository.getResumeView(attempt);
    },
    async submitAction({ identity, attemptId, action, now = new Date() }) {
      const attempt = await ownedAttempt(identity, attemptId);
      if (!['started', 'in_progress'].includes(attempt.status)) throw failure(attempt.status === 'submitted' || attempt.status === 'graded' ? 'ATTEMPT_ALREADY_SUBMITTED' : 'ATTEMPT_NOT_ACTIVE', 'Attempt does not accept actions.');
      if (attempt.expiresAt && now > new Date(attempt.expiresAt)) throw failure('ATTEMPT_EXPIRED', 'Attempt expired.');
      const duplicate = await repository.findAssessmentAction(action.clientEventId);
      if (duplicate) {
        if (duplicate.studentId !== identity.studentId || duplicate.assessmentAttemptId !== attempt.id) {
          throw failure('ATTEMPT_ACCESS_DENIED', 'Duplicate event belongs to another attempt.');
        }
        return { accepted: duplicate.result.accepted !== false, duplicate: true };
      }
      const problem = await repository.loadProblem(attempt.problemInstanceId);
      const validation = problemEngine.validateAction({ templateKey: attempt.templateKey, problem, action });
      await repository.appendAssessmentAction({ identity, attempt, action, validation });
      return { accepted: validation.accepted !== false, duplicate: false };
    },
    async submit({ identity, attemptId }) {
      const attempt = await ownedAttempt(identity, attemptId);
      if (!['started', 'in_progress', 'paused'].includes(attempt.status)) throw failure('ATTEMPT_ALREADY_SUBMITTED', 'Attempt is already locked.');
      const actions = await repository.listAssessmentActions(attempt.id);
      const scored = actions.filter((item) => item.validation?.accepted !== false);
      const correct = scored.filter((item) => item.validation?.isCorrect === true).length;
      const maximum = scored.length;
      const percentage = maximum ? Math.round((correct / maximum) * 10000) / 100 : 0;
      return repository.gradeAndLock({ attempt, score: { raw: correct, maximum, percentage }, actions });
    }
  });
}
module.exports = { createAssessmentService, failure };
