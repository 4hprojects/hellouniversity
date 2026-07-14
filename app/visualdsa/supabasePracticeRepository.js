function databaseError(operation, error) {
  return Object.assign(new Error(`VisualDSA database ${operation} failed.`), { code: 'VISUALDSA_DATABASE_ERROR', cause: error });
}
function requireData(operation, result) {
  if (result?.error) throw databaseError(operation, result.error);
  return result?.data || null;
}
function createSupabasePracticeRepository(supabase) {
  if (!supabase?.from) throw new TypeError('A Supabase client is required.');
  return Object.freeze({
    async createProblem({ moduleDefinition, templateKey, difficulty, generated }) {
      const moduleRow = requireData('module lookup', await supabase.from('visualdsa_modules').select('id,module_key,version').eq('module_key', moduleDefinition.key).eq('version', moduleDefinition.version).eq('status', 'active').maybeSingle());
      if (!moduleRow) throw Object.assign(new Error('Module version is unavailable.'), { code: 'MODULE_VERSION_UNAVAILABLE' });
      const templateRow = requireData('template lookup', await supabase.from('visualdsa_problem_templates').select('id,template_key,version').eq('module_id', moduleRow.id).eq('template_key', templateKey).eq('difficulty', difficulty).eq('is_active', true).maybeSingle());
      if (!templateRow) throw Object.assign(new Error('Problem template is unavailable.'), { code: 'INVALID_INPUT' });
      const instance = requireData('practice problem creation', await supabase.from('visualdsa_problem_instances').insert({ template_id: templateRow.id, problem_seed: generated.seed, module_version: generated.moduleVersion, public_input: generated.input, validation_data: { expectedStates: generated.expectedStates }, expected_steps_hash: generated.expectedStepsHash }).select('id').single());
      return { moduleRow, templateRow, instance, generated };
    },
    async createPractice({ identity, moduleDefinition, problem, classId }) {
      const row = requireData('practice creation', await supabase.from('visualdsa_practice_sessions').insert({ user_id: identity.userId, student_id: identity.studentId, class_id: classId, module_id: problem.moduleRow.id, problem_instance_id: problem.instance.id, status: 'in_progress' }).select('id,status,started_at').single());
      return { sessionId: row.id, status: row.status, startedAt: row.started_at, moduleKey: moduleDefinition.key, moduleVersion: moduleDefinition.version, problem: { seed: problem.generated.seed, input: problem.generated.input } };
    },
    async findPractice(sessionId) {
      const row = requireData('practice lookup', await supabase.from('visualdsa_practice_sessions').select('id,user_id,student_id,status,module_id,problem_instance_id,visualdsa_problem_instances(visualdsa_problem_templates(template_key))').eq('id', sessionId).maybeSingle());
      return row ? { id: row.id, userId: row.user_id, studentId: row.student_id, status: row.status, moduleId: row.module_id, problemInstanceId: row.problem_instance_id, templateKey: row.visualdsa_problem_instances.visualdsa_problem_templates.template_key } : null;
    },
    async loadPracticeProblem(id) { const row = requireData('practice problem lookup', await supabase.from('visualdsa_problem_instances').select('problem_seed,public_input,validation_data,module_version').eq('id', id).single()); return { seed: row.problem_seed, input: row.public_input, expectedStates: row.validation_data.expectedStates, moduleVersion: row.module_version }; },
    async findActionByClientEventId(clientEventId) {
      const row = requireData('action lookup', await supabase.from('visualdsa_attempt_actions').select('client_event_id,student_id,practice_session_id,is_correct,misconception_code').eq('client_event_id', clientEventId).maybeSingle());
      return row ? { studentId: row.student_id, practiceSessionId: row.practice_session_id, result: { accepted: true, isCorrect: row.is_correct, misconceptionCode: row.misconception_code } } : null;
    },
    async listPracticeActions(sessionId, stepNumber) { const rows=requireData('practice action list',await supabase.from('visualdsa_attempt_actions').select('id,is_correct,response_number,hint_level,created_at').eq('practice_session_id',sessionId).eq('step_number',stepNumber).order('created_at'));return rows.map(row=>({id:row.id,isCorrect:row.is_correct,responseNumber:row.response_number,hintLevel:row.hint_level})); },
    async appendPracticeAction({ identity, session, action, validation, responseNumber = 1 }) {
      const row = requireData('action creation', await supabase.from('visualdsa_attempt_actions').insert({ client_event_id: action.clientEventId, user_id: identity.userId, student_id: identity.studentId, practice_session_id: session.id, step_number: action.stepNumber, action_type: action.actionType, submitted_payload: action.payload, is_correct: validation.isCorrect, misconception_code: validation.misconceptionCode, response_number: responseNumber, hint_level: 0, validation_version: validation.validationVersion || '1.0.0' }).select('id,is_correct,misconception_code').single());
      return { id: row.id, result: { accepted: true, isCorrect: row.is_correct, misconceptionCode: row.misconception_code } };
    },
    async recordPracticeHint({ session, stepNumber, hintLevel }) { const rows=requireData('practice hint action lookup',await supabase.from('visualdsa_attempt_actions').select('id').eq('practice_session_id',session.id).eq('step_number',stepNumber).order('created_at',{ascending:false}).limit(1));if(!rows?.[0])throw Object.assign(new Error('Hint is unavailable.'),{code:'HINT_NOT_AVAILABLE'});requireData('practice hint update',await supabase.from('visualdsa_attempt_actions').update({hint_level:hintLevel}).eq('id',rows[0].id).select('id').single()); },
    async completePractice({ session }) {
      const row = requireData('practice completion', await supabase.from('visualdsa_practice_sessions').update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', session.id).in('status', ['created', 'in_progress']).select('id,status,completed_at').maybeSingle());
      if (!row) throw Object.assign(new Error('Practice session is not active.'), { code: 'PRACTICE_SESSION_NOT_ACTIVE' });
      return { sessionId: row.id, status: row.status, completedAt: row.completed_at };
    }
  });
}
module.exports = { createSupabasePracticeRepository, databaseError, requireData };
