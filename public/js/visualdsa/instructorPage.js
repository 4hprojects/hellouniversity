(() => {
  const root = document.querySelector('[data-instructor-dashboard]');
  const classId = document.body.dataset.visualdsaClassId;
  if (!root || !classId) return;
  const status = root.querySelector('[data-instructor-status]');
  const content = root.querySelector('[data-instructor-content]');
  const assignmentForm = root.querySelector('[data-assignment-form]');
  const cell = (value) => { const td = document.createElement('td'); td.textContent = value; return td; };
  const fill = (selector, rows, values, emptyMessage) => {
    const target = root.querySelector(selector); target.replaceChildren();
    if (!rows.length) { const tr = document.createElement('tr'); const td = cell(emptyMessage); td.colSpan = values.length; tr.append(td); target.append(tr); return; }
    rows.forEach((item) => { const tr = document.createElement('tr'); values.forEach((value) => tr.append(cell(value(item)))); target.append(tr); });
  };
  const showStudent = async (studentId) => {
    const panel = root.querySelector('[data-student-detail]');
    const detailStatus = root.querySelector('[data-student-detail-status]');
    const detailContent = root.querySelector('[data-student-detail-content]');
    panel.hidden = false; detailStatus.textContent = `Loading ${studentId}…`; detailContent.replaceChildren();
    try {
      const response = await fetch(`/api/visualdsa/instructor/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Student detail could not be loaded.');
      const data = await response.json();
      const heading = document.createElement('h3'); heading.textContent = data.studentId;
      const summary = document.createElement('p'); summary.textContent = `${data.mastery.length} mastery records, ${data.attempts.length} assessment attempts, and ${data.misconceptions.length} misconception events.`;
      detailContent.append(heading, summary); detailStatus.textContent = 'Student detail loaded.'; panel.scrollIntoView({ block: 'nearest' });
    } catch (error) { detailStatus.textContent = error.message; }
  };
  const fillInterventions = (rows) => {
    const target = root.querySelector('[data-intervention-rows]'); target.replaceChildren();
    if (!rows.length) { const tr = document.createElement('tr'); const td = cell('No students currently need support.'); td.colSpan = 4; tr.append(td); target.append(tr); return; }
    rows.forEach((item) => { const tr = document.createElement('tr'); const studentCell = document.createElement('td'); const button = document.createElement('button'); button.type = 'button'; button.className = 'visualdsa-text-button'; button.textContent = item.student_id; button.addEventListener('click', () => showStudent(item.student_id)); studentCell.append(button); tr.append(studentCell, cell(item.module_key), cell(item.mastery_status.replace(/_/g, ' ')), cell(`${item.mastery_score}%`)); target.append(tr); });
  };
  const fillMisconceptions = (rows) => {
    const target = root.querySelector('[data-misconception-rows]'); target.replaceChildren();
    if (!rows.length) { const tr = document.createElement('tr'); const td = cell('No misconceptions recorded yet.'); td.colSpan = 4; tr.append(td); target.append(tr); return; }
    const lessonSlugs = { arrays: 'arrays', stacks: 'stacks', queues: 'queues', 'binary-search': 'binary-search', sorting: 'bubble-sort', bst: 'binary-search-trees' };
    rows.forEach((item) => { const tr = document.createElement('tr'); const moduleCell = document.createElement('td'); const link = document.createElement('a'); link.href = `/data-structures-and-algorithms/${lessonSlugs[item.moduleKey] || item.moduleKey}`; link.textContent = item.moduleKey; moduleCell.append(link); tr.append(moduleCell, cell(item.code), cell(item.events), cell(item.students)); target.append(tr); });
  };
  assignmentForm?.addEventListener('submit', async (event) => {
    event.preventDefault(); const assignmentStatus=root.querySelector('[data-assignment-status]');const button=assignmentForm.querySelector('button[type="submit"]');button.disabled=true;assignmentStatus.textContent='Publishing assessment…';
    try {
      const csrfResponse=await fetch('/api/csrf-token',{credentials:'same-origin'});const csrfData=await csrfResponse.json();if(!csrfResponse.ok||!csrfData.csrfToken)throw new Error('Unable to authorize publication.');
      const data=new FormData(assignmentForm);const option=assignmentForm.elements.templateKey.selectedOptions[0];const date=(name)=>data.get(name)?new Date(data.get(name)).toISOString():null;
      const response=await fetch(`/api/visualdsa/instructor/classes/${encodeURIComponent(classId)}/assignments`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfData.csrfToken},body:JSON.stringify({title:data.get('title'),moduleKey:option.dataset.module,templateKey:data.get('templateKey'),attemptLimit:Number(data.get('attemptLimit')),timeLimitMinutes:Number(data.get('timeLimitMinutes')),availableFrom:date('availableFrom'),availableUntil:date('availableUntil')})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message||'Assessment could not be published.');assignmentStatus.textContent=`Published “${result.title}”. Students in this class can now open it from My Progress.`;
    } catch(error){assignmentStatus.textContent=error.message;} finally{button.disabled=false;}
  });
  fetch(`/api/visualdsa/instructor/classes/${encodeURIComponent(classId)}/overview`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(async (response) => { if (!response.ok) throw new Error(response.status === 403 ? 'You do not have access to this class.' : 'Class analytics could not be loaded.'); return response.json(); })
    .then((data) => {
      root.querySelector('[data-class-name]').textContent = `${data.classItem.name} — VisualDSA analytics`;
      root.querySelector('[data-export-link]').href = `/api/visualdsa/instructor/classes/${encodeURIComponent(classId)}/export`;
      fill('[data-module-rows]', data.modules, [(x) => x.moduleKey, (x) => x.started, (x) => x.completed, (x) => x.averageMastery == null ? 'No evidence' : `${x.averageMastery}%`, (x) => x.interventions], 'No module evidence yet.');
      fillInterventions(data.interventions);
      fillMisconceptions(data.misconceptions);
      fill('[data-step-rows]', data.difficultSteps.slice(0, 10), [(x) => x.moduleKey, (x) => Number(x.stepNumber) + 1, (x) => `${x.firstAttemptAccuracy}%`, (x) => x.total], 'No step evidence recorded yet.');
      status.textContent = `${data.enrolledStudents} enrolled students. Analytics loaded.`; content.hidden = false;
    })
    .catch((error) => { status.textContent = error.message; });
})();
