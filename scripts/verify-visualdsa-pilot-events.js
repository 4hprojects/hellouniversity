require('dotenv').config();
const { supabase } = require('../supabaseClient');

const MODULES = ['arrays', 'stacks', 'queues', 'binary-search', 'sorting', 'bst'];
const REQUIRED_EVENTS = ['module_opened', 'mode_selected', 'custom_input_submitted', 'step_advanced'];

function since(query, column) {
  return process.env.VISUALDSA_PILOT_STARTED_AT ? query.gte(column, process.env.VISUALDSA_PILOT_STARTED_AT) : query;
}
function rows(label, result) {
  if (result.error) throw Object.assign(new Error(`${label} query failed.`), { code: result.error.code });
  return result.data || [];
}

async function main() {
  const classId = String(process.env.VISUALDSA_PILOT_CLASS_ID || '').toLowerCase();
  if (!/^[a-f0-9]{24}$/.test(classId)) throw Object.assign(new Error('Set VISUALDSA_PILOT_CLASS_ID to the pilot MongoDB class ID.'), { code: 'PILOT_CLASS_REQUIRED' });
  const [eventResult, practiceResult, attemptResult, masteryResult, recommendationResult] = await Promise.all([
    since(supabase.from('visualdsa_interaction_events').select('module_key,module_version,event_type,client_timestamp,server_timestamp').eq('class_id', classId).in('module_key', MODULES).limit(10000), 'server_timestamp'),
    since(supabase.from('visualdsa_practice_sessions').select('status,visualdsa_modules(module_key)').eq('class_id', classId).limit(10000), 'started_at'),
    since(supabase.from('visualdsa_assessment_attempts').select('status,percentage_score,visualdsa_assessment_assignments(visualdsa_modules(module_key))').eq('class_id', classId).limit(10000), 'started_at'),
    since(supabase.from('visualdsa_topic_mastery').select('module_key,mastery_status').eq('class_id', classId).limit(10000), 'calculated_at'),
    since(supabase.from('visualdsa_student_recommendations').select('module_key,reason_code').eq('class_id', classId).limit(10000), 'generated_at')
  ]);
  const events = rows('events', eventResult); const practices = rows('practice', practiceResult); const attempts = rows('attempts', attemptResult); const mastery = rows('mastery', masteryResult); const recommendations = rows('recommendations', recommendationResult);
  const report = MODULES.map((moduleKey) => {
    const moduleEvents = events.filter((row) => row.module_key === moduleKey);
    const observed = [...new Set(moduleEvents.map((row) => row.event_type))].sort();
    return {
      moduleKey,
      lifecycleEvents: moduleEvents.length,
      versions: [...new Set(moduleEvents.map((row) => row.module_version))].sort(),
      observed,
      missing: REQUIRED_EVENTS.filter((eventType) => !observed.includes(eventType)),
      invalidTimestamps: moduleEvents.filter((row) => !row.server_timestamp || (row.client_timestamp && Number.isNaN(Date.parse(row.client_timestamp)))).length,
      practiceSessions: practices.filter((row) => row.visualdsa_modules?.module_key === moduleKey).length,
      completedPractice: practices.filter((row) => row.visualdsa_modules?.module_key === moduleKey && row.status === 'completed').length,
      assessmentAttempts: attempts.filter((row) => row.visualdsa_assessment_assignments?.visualdsa_modules?.module_key === moduleKey).length,
      gradedAssessments: attempts.filter((row) => row.visualdsa_assessment_assignments?.visualdsa_modules?.module_key === moduleKey && row.status === 'graded' && row.percentage_score != null).length,
      masteryRows: mastery.filter((row) => row.module_key === moduleKey).length,
      recommendations: recommendations.filter((row) => row.module_key === moduleKey).length
    };
  });
  console.log(JSON.stringify({ classId: '[configured]', startedAt: process.env.VISUALDSA_PILOT_STARTED_AT || null, requiredEvents: REQUIRED_EVENTS, modules: report }, null, 2));
  if (report.some((item) => item.missing.length || item.invalidTimestamps || !item.completedPractice || !item.gradedAssessments || !item.masteryRows)) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`Pilot event verification failed: ${error.code || error.message}`);
  process.exitCode = 1;
});
