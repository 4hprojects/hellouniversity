const { requireData } = require('./supabasePracticeRepository');
function createSupabaseEventRepository(supabase) {
  return Object.freeze({
    async findByEventId(id) { const row=requireData('event lookup',await supabase.from('visualdsa_interaction_events').select('event_id,student_id').eq('event_id',id).maybeSingle()); return row?{eventId:row.event_id,studentId:row.student_id}:null; },
    async append(event) { const row=requireData('event creation',await supabase.from('visualdsa_interaction_events').insert({event_id:event.eventId,schema_version:event.schemaVersion,user_id:event.userId,student_id:event.studentId,class_id:event.classId,lesson_slug:event.lessonSlug,module_key:event.moduleKey,module_version:event.moduleVersion,mode:event.mode,practice_session_id:event.practiceSessionId,assessment_attempt_id:event.assessmentAttemptId,problem_seed:event.problemSeed,event_type:event.eventType,step_number:event.stepNumber,action_type:event.actionType,submitted_value:event.submittedValue,is_correct:event.isCorrect,response_number:event.responseNumber,hint_level:event.hintLevel,response_time_ms:event.responseTimeMs,misconception_code:event.misconceptionCode,metadata:event.metadata,client_timestamp:event.clientTimestamp}).select('event_id').single()); return {eventId:row.event_id}; },
    async detect({studentId,assessmentAttemptId,practiceSessionId,actionId,code,version=1,confidence=1}) { return requireData('misconception creation',await supabase.from('visualdsa_detected_misconceptions').insert({student_id:studentId,assessment_attempt_id:assessmentAttemptId,practice_session_id:practiceSessionId,action_id:actionId,misconception_code:code,classifier_version:version,confidence}).select('id').single()); }
  });
}
module.exports={createSupabaseEventRepository};
