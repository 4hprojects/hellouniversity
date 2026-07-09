(function () {
  const classId = document.body?.dataset.classId || '';
  const selectors = {
    title: 'teacherDsaQuickChecksTitle',
    subcopy: 'teacherDsaQuickChecksSubcopy',
    roster: 'teacherDsaQuickChecksRoster',
    statusBadge: 'teacherDsaQuickChecksStatusBadge',
    lessons: 'teacherDsaQuickChecksLessons',
    lessonTitle: 'teacherDsaQuickChecksLessonTitle',
    responses: 'teacherDsaQuickChecksResponses'
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
  }

  function scoreLine(attempt) {
    if (!attempt) return 'No score yet';
    return `${Number(attempt.score || 0)} of ${Number(attempt.totalQuestions || 0)} (${Number(attempt.scorePercent || 0)}%)`;
  }

  function formatDuration(seconds) {
    const totalSeconds = Number(seconds || 0);
    if (!totalSeconds) return 'Not recorded';
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  function integrityLine(summary) {
    const item = summary || {};
    const blocked = Number(item.copyBlockedCount || 0)
      + Number(item.contextMenuBlockedCount || 0)
      + Number(item.selectStartBlockedCount || 0)
      + Number(item.dragStartBlockedCount || 0);
    const inactive = Number(item.visibilityHiddenCount || 0) + Number(item.windowBlurCount || 0);
    return `${blocked} blocked actions · ${inactive} inactive events`;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { credentials: 'same-origin' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) {
      const error = new Error(payload.message || 'Unable to load DSA Quick Checks.');
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function renderGateError(error) {
    const lessons = byId(selectors.lessons);
    const responses = byId(selectors.responses);
    const message = error?.message || 'Unable to load DSA Quick Checks.';
    if (lessons) {
      lessons.innerHTML = `
        <article class="teacher-empty-state">
          ${escapeHtml(message)}
          <br>
          <a class="teacher-inline-link" href="/teacher/classes/${encodeURIComponent(classId)}/settings">Open class settings</a>
        </article>
      `;
    }
    if (responses) {
      responses.innerHTML = '<p class="teacher-empty-state">Reports will appear here after this class is enabled for DSA Quick Checks.</p>';
    }
    setText(selectors.statusBadge, error?.status === 403 ? 'Not enabled' : 'Unavailable');
  }

  function renderLessons(payload) {
    const lessons = byId(selectors.lessons);
    if (!lessons) return;

    const classInfo = payload.classItem || {};
    const lessonSummaries = Array.isArray(payload.lessons) ? payload.lessons : [];
    setText(selectors.title, `${classInfo.className || 'Class'} DSA Quick Checks`);
    setText(selectors.subcopy, 'Review the latest saved Quick Check answers from students currently enrolled in this class.');
    setText(selectors.roster, `${Number(classInfo.studentCount || 0)} enrolled`);
    setText(selectors.statusBadge, classInfo.dsaCourseEnabled ? 'DSA enabled' : 'Not enabled');

    if (!lessonSummaries.length) {
      lessons.innerHTML = '<p class="teacher-empty-state">No DSA lessons are available yet.</p>';
      return;
    }

    lessons.innerHTML = lessonSummaries.map((lesson) => `
      <button type="button" class="teacher-action-card" data-lesson-slug="${escapeHtml(lesson.slug)}">
        <span class="material-icons" aria-hidden="true">checklist</span>
        <strong>Lesson ${escapeHtml(lesson.number)}: ${escapeHtml(lesson.title)}</strong>
        <span>${escapeHtml(String(lesson.submittedCount || 0))} submitted · ${escapeHtml(String(lesson.missingCount || 0))} missing</span>
        ${lesson.signalCounts ? `<span>${escapeHtml(String(lesson.signalCounts.studentsWithRiskFlags || 0))} with flags · ${escapeHtml(String(lesson.signalCounts.veryFastSubmissions || 0))} fast · ${escapeHtml(String(lesson.signalCounts.afterTimeLimitSubmissions || 0))} late</span>` : ''}
      </button>
    `).join('');

    lessons.querySelectorAll('[data-lesson-slug]').forEach((button) => {
      button.addEventListener('click', () => loadLesson(button.dataset.lessonSlug));
    });
  }

  function renderResponses(payload) {
    const responses = byId(selectors.responses);
    if (!responses) return;

    const lesson = payload.lesson || {};
    const rows = Array.isArray(payload.responses) ? payload.responses : [];
    setText(selectors.lessonTitle, lesson.title ? `Lesson ${lesson.number}: ${lesson.title}` : 'Responses');

    if (!rows.length) {
      responses.innerHTML = `<p class="teacher-empty-state">No enrolled students have submitted answers for this lesson yet. ${escapeHtml(String(payload.missingStudentCount || 0))} students are currently missing.</p>`;
      return;
    }

    responses.innerHTML = rows.map((response) => `
      <article class="teacher-list-card">
        <div class="teacher-list-card-header">
          <h3>${escapeHtml(response.studentName || 'Student')}</h3>
          <span class="teacher-badge teacher-badge-soft">${escapeHtml(response.studentIDNumber || 'Student ID')}</span>
        </div>
        <p class="teacher-meta">
          Latest ${escapeHtml(scoreLine(response.latestScore))} · Best ${escapeHtml(scoreLine(response.bestScore))} · ${escapeHtml(String(response.attemptCount || 1))} attempt${Number(response.attemptCount || 1) === 1 ? '' : 's'} · Updated ${escapeHtml(new Date(response.updatedAt || response.submittedAt || Date.now()).toLocaleString())}
          ${response.submittedAfterTimeLimit ? ' · Submitted after time limit' : ''}
        </p>
        <p class="teacher-meta">
          Completion ${escapeHtml(formatDuration(response.completionSeconds))} · ${escapeHtml(integrityLine(response.integritySummary))} · ${escapeHtml(String(response.remainingAttempts ?? 0))}/${escapeHtml(String(response.maxAttempts || 3))} attempts remaining
          ${response.cooldownUntil ? ` · Cooldown until ${escapeHtml(new Date(response.cooldownUntil).toLocaleString())}` : ''}
        </p>
        ${Array.isArray(response.reviewFlags) && response.reviewFlags.length ? `
          <p class="teacher-meta">
            ${response.reviewFlags.map((flag) => `<span class="teacher-badge teacher-badge-soft">${escapeHtml(flag.type || 'flag')}</span>`).join(' ')}
          </p>
        ` : ''}
        ${Array.isArray(response.attempts) && response.attempts.length > 1 ? `
          <p class="teacher-meta">
            ${response.attempts.map((attempt) => `Attempt ${escapeHtml(String(attempt.attemptNumber || 1))}: ${escapeHtml(scoreLine(attempt))}${attempt.submittedAfterTimeLimit ? ' after limit' : ''}`).join(' · ')}
          </p>
        ` : ''}
        <div class="teacher-detail-list">
          ${(Array.isArray(response.answers) ? response.answers : []).map((answer) => `
            <div class="teacher-detail-row">
              <dt>${escapeHtml(answer.questionText || answer.questionId || 'Question')}</dt>
              <dd>
                ${escapeHtml(answer.selectedOptionText || answer.answerText || '')}
                ${typeof answer.isCorrect === 'boolean'
                  ? `<span class="teacher-badge teacher-badge-soft">${answer.isCorrect ? 'Correct' : 'Needs review'}</span>`
                  : ''}
              </dd>
            </div>
          `).join('')}
        </div>
      </article>
    `).join('');
  }

  async function loadLesson(lessonSlug) {
    if (!lessonSlug) return;
    const responses = byId(selectors.responses);
    if (responses) responses.innerHTML = '<p class="teacher-empty-state">Loading lesson responses...</p>';
    try {
      renderResponses(await fetchJson(`/api/teacher/classes/${encodeURIComponent(classId)}/dsa/quick-checks/${encodeURIComponent(lessonSlug)}`));
    } catch (error) {
      if (responses) responses.innerHTML = `<p class="teacher-empty-state">${escapeHtml(error.message)}</p>`;
    }
  }

  async function init() {
    if (!classId) {
      renderGateError(new Error('Class ID is missing.'));
      return;
    }
    try {
      const payload = await fetchJson(`/api/teacher/classes/${encodeURIComponent(classId)}/dsa/quick-checks`);
      renderLessons(payload);
    } catch (error) {
      renderGateError(error);
    }
  }

  init();
})();
