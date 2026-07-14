require('dotenv').config();
const crypto = require('crypto');
const { supabase } = require('../supabaseClient');

function participantId(studentId, salt) {
  if (!studentId || !salt || salt.length < 32) throw new TypeError('A student ID and research salt of at least 32 characters are required.');
  return `VD-${crypto.createHmac('sha256', salt).update(String(studentId)).digest('hex').slice(0, 16)}`;
}
function csvCell(value) {
  const text = value == null ? '' : Array.isArray(value) ? value.join('|') : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function toCsv(rows) {
  const columns = ['participant_id','group','module_key','module_version','attempt_number','assessment_score','first_attempt_accuracy','hint_count','retry_count','active_duration_ms','misconception_codes'];
  return `${[columns,...rows.map(row=>columns.map(column=>row[column]))].map(row=>row.map(csvCell).join(',')).join('\n')}\n`;
}
async function buildExport({ classId, startedAt, endedAt, salt }) {
  if (!/^[a-f0-9]{24}$/i.test(String(classId || ''))) throw new TypeError('VISUALDSA_RESEARCH_CLASS_ID must be a MongoDB class ID.');
  if (!startedAt || Number.isNaN(Date.parse(startedAt))) throw new TypeError('VISUALDSA_RESEARCH_STARTED_AT must be an ISO date-time.');
  let query = supabase.from('visualdsa_assessment_attempts').select('id,student_id,attempt_number,percentage_score,module_version,started_at,visualdsa_assessment_assignments(visualdsa_modules(module_key))').eq('class_id',classId).eq('status','graded').gte('started_at',startedAt).order('started_at');
  if (endedAt) query=query.lte('started_at',endedAt);
  const attemptsResult=await query;if(attemptsResult.error)throw attemptsResult.error;const attempts=attemptsResult.data||[];
  if(!attempts.length)return[];
  const summariesResult=await supabase.from('visualdsa_attempt_summaries').select('assessment_attempt_id,first_attempt_accuracy,hints_used,retries,active_duration_ms,misconception_counts').in('assessment_attempt_id',attempts.map(row=>row.id));
  if(summariesResult.error)throw summariesResult.error;const summaries=new Map((summariesResult.data||[]).map(row=>[row.assessment_attempt_id,row]));
  return attempts.map(attempt=>{const summary=summaries.get(attempt.id)||{};return{participant_id:participantId(attempt.student_id,salt),group:'',module_key:attempt.visualdsa_assessment_assignments?.visualdsa_modules?.module_key||'',module_version:attempt.module_version,attempt_number:attempt.attempt_number,assessment_score:attempt.percentage_score,first_attempt_accuracy:summary.first_attempt_accuracy??'',hint_count:summary.hints_used??0,retry_count:summary.retries??0,active_duration_ms:summary.active_duration_ms??0,misconception_codes:Object.keys(summary.misconception_counts||{}).sort()};});
}
async function main(){const rows=await buildExport({classId:process.env.VISUALDSA_RESEARCH_CLASS_ID,startedAt:process.env.VISUALDSA_RESEARCH_STARTED_AT,endedAt:process.env.VISUALDSA_RESEARCH_ENDED_AT,salt:process.env.VISUALDSA_RESEARCH_PSEUDONYM_SALT});process.stdout.write(toCsv(rows));}
if(require.main===module)main().catch(error=>{console.error(`Research export failed: ${error.code||error.message}`);process.exitCode=1;});
module.exports={buildExport,csvCell,participantId,toCsv};
