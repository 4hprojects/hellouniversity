(async function loadProgress() {
  'use strict';
  const root = document.querySelector('[data-visualdsa-progress]');
  if (!root) return;
  const status = root.querySelector('[data-progress-status]');
  const content = root.querySelector('[data-progress-content]');
  const activity = globalThis.VisualDsaActivityClient;
  const assessmentWorkspace = root.querySelector('[data-assessment-workspace]');
  const assessmentStatus = root.querySelector('[data-assessment-status]');
  const assessmentProblem = root.querySelector('[data-assessment-problem]');
  const assessmentForm = root.querySelector('[data-assessment-response]');
  const assessmentPrompt = root.querySelector('[data-assessment-prompt]');
  const assessmentSubmit = root.querySelector('[data-assessment-submit]');
  const assessmentTimer = root.querySelector('[data-assessment-timer]');
  const assessmentReview = root.querySelector('[data-assessment-review]');
  let assessment;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const list = (rows, format, empty) => rows?.length ? `<ul>${rows.map((row) => `<li>${format(row)}</li>`).join('')}</ul>` : `<p>${empty}</p>`;
  try {
    const response = await fetch('/api/visualdsa/me/progress', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Unable to load progress.');
    const data = await response.json();
    const next=root.querySelector('[data-progress-next]');next.hidden=false;root.querySelector('[data-progress-next-content]').innerHTML=`<h2>${escape(data.nextAction.title)}</h2><p>${escape(data.nextAction.message)}</p><a class="dsa-button dsa-button-primary" href="${escape(data.nextAction.href)}">Continue</a>`;
    root.querySelector('[data-progress-course]').innerHTML = `<p><a href="${escape(data.currentCourse.href)}">${escape(data.currentCourse.title)}</a></p>`;
    const moduleSlugs={arrays:'array-visualizer',stacks:'stack-visualizer',queues:'queue-visualizer','binary-search':'binary-search-visualizer',sorting:'bubble-sort-visualizer',bst:'binary-search-tree-visualizer'};
    root.querySelector('[data-progress-assignments]').innerHTML = list(data.assignedActivities, (row) => `<strong>${escape(row.title)}</strong> — ${escape(row.moduleKey)} <a class="dsa-button" href="/visualdsa/${escape(moduleSlugs[row.moduleKey])}?classId=${escape(row.classId)}">Practice for this class</a> <button type="button" class="dsa-button" data-assessment-start="${escape(row.id)}">Start recorded assessment</button>`, 'No assigned activities.');
    root.querySelector('[data-progress-mastery]').innerHTML = list(data.mastery, (row) => `<strong>${escape(row.module_key)}</strong>: ${row.mastery_score == null ? '—' : `${escape(row.mastery_score)}%`} (${escape(row.mastery_status)})`, 'No mastery evidence yet.');
    root.querySelector('[data-progress-recommendations]').innerHTML = list(data.recommendations, (row) => `<strong>${escape(row.priority)}</strong>: ${escape(row.message)}`, 'No active recommendations.');
    root.querySelector('[data-progress-misconceptions]').innerHTML = list(data.misconceptions, (row) => `<strong>${escape(row.title)}</strong> (${escape(row.code)}) — ${escape(row.explanation)} <a href="${escape(row.lessonHref)}">Review the lesson</a>`, 'No repeated misconceptions recorded.');
    root.querySelector('[data-progress-practice]').innerHTML = list(data.practiceHistory, (row) => `${escape(row.title)} — ${escape(row.status)}`, 'No practice history.');
    root.querySelector('[data-progress-assessments]').innerHTML = list(data.assessmentHistory, (row) => `${escape(row.title)} — ${row.score == null ? escape(row.status) : `${escape(row.score)}%`}${['started','in_progress','paused'].includes(row.status)?` <button type="button" class="dsa-button" data-assessment-resume="${escape(row.id)}">Resume</button>`:''}`, 'No assessment history.');
    root.querySelector('[data-progress-recent]').innerHTML = list(data.recentActivity, (row) => `${escape(row.title)} — ${escape(row.status)}`, 'No recent activity.');
    status.textContent = 'Progress loaded.';
    content.hidden = false;
  } catch (error) {
    status.textContent = error.message;
  }

  function showAssessmentStep() {
    const item=assessment?.steps[assessment.cursor];
    if(!item){assessmentForm.hidden=true;assessmentSubmit.hidden=false;assessmentReview.hidden=false;assessmentReview.innerHTML=`<h3>Review before submitting</h3><p>${assessment.steps.length} of ${assessment.totalSteps} required responses are saved. Answers and correctness remain hidden.</p><p>Submitting locks this attempt and it cannot be changed.</p>`;assessmentStatus.textContent='All required responses are recorded. Review and submit when ready.';return;}
    assessmentPrompt.textContent=activity.prompt(assessment.moduleKey,item.state);assessmentForm.hidden=false;assessmentSubmit.hidden=true;assessmentForm.elements.response.value='';assessmentForm.elements.response.focus();assessmentStatus.textContent=`Response ${assessment.cursor+1} of ${assessment.steps.length}. Correctness is shown only after final submission.`;
  }
  function openAssessment(data) {
    const allSteps=activity.actionSteps(data.moduleKey,data.problem.input);const submitted=new Set(data.submittedSteps||[]);
    assessment={attemptId:data.attemptId,moduleKey:data.moduleKey,steps:allSteps.filter(item=>!submitted.has(item.index)),totalSteps:allSteps.length,cursor:0,expiresAt:data.expiresAt};assessmentReview.hidden=true;if(data.expiresAt){const update=()=>{const seconds=Math.max(0,Math.ceil((new Date(data.expiresAt)-Date.now())/1000));assessmentTimer.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};update();assessment.timer=setInterval(update,1000);}else assessmentTimer.textContent='Not limited';
    assessmentWorkspace.hidden=false;assessmentProblem.textContent=`Problem input: ${JSON.stringify(data.problem.input)}`;showAssessmentStep();assessmentWorkspace.scrollIntoView({block:'start'});
  }
  root.addEventListener('click',async(event)=>{
    const start=event.target.closest('[data-assessment-start]');const resume=event.target.closest('[data-assessment-resume]');if(!start&&!resume)return;
    event.target.disabled=true;assessmentWorkspace.hidden=false;assessmentStatus.textContent=start?'Starting server-issued assessment…':'Resuming assessment…';
    try{const data=start?await activity.request('/api/visualdsa/assessment-attempts',{method:'POST',body:JSON.stringify({assignmentId:start.dataset.assessmentStart})}):await activity.request(`/api/visualdsa/assessment-attempts/${resume.dataset.assessmentResume}`,{method:'GET'});openAssessment(data);}catch(error){assessmentStatus.textContent=error.message;event.target.disabled=false;}
  });
  assessmentForm.addEventListener('submit',async(event)=>{event.preventDefault();const item=assessment?.steps[assessment.cursor];if(!item)return;const button=assessmentForm.querySelector('button');button.disabled=true;try{await activity.request(`/api/visualdsa/assessment-attempts/${assessment.attemptId}/actions`,{method:'POST',body:JSON.stringify({clientEventId:crypto.randomUUID(),stepNumber:item.index,actionType:'predict',payload:activity.payload(assessment.moduleKey,item.state,assessmentForm.elements.response.value),clientTimestamp:new Date().toISOString()})});assessment.cursor+=1;showAssessmentStep();}catch(error){assessmentStatus.textContent=error.message;}finally{button.disabled=false;}});
  assessmentSubmit.addEventListener('click',async()=>{if(!confirm('Submit and lock this assessment? You cannot change responses afterward.'))return;assessmentSubmit.disabled=true;try{const result=await activity.request(`/api/visualdsa/assessment-attempts/${assessment.attemptId}/submit`,{method:'POST'});clearInterval(assessment.timer);assessmentStatus.textContent=`Assessment submitted and locked. Official score: ${result.score.percentage}%.`;assessmentSubmit.hidden=true;assessmentReview.hidden=true;}catch(error){assessmentStatus.textContent=error.message;assessmentSubmit.disabled=false;}});
}());
