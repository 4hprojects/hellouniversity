(function attachTeacherGameReports(global) {
  'use strict';

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function showToast(msg, isError) {
    const el = byId('lgToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  function formatDate(value) {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms === null) return 'N/A';
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  function formatResponseTime(ms) {
    if (!Number.isFinite(ms) || ms === null) return 'N/A';
    return `${Math.round(ms)} ms`;
  }

  function formatPercent(value) {
    if (!Number.isFinite(Number(value))) return 'N/A';
    return `${Number(value).toFixed(1)}%`;
  }

  function formatQuestionType(type) {
    switch (type) {
      case 'true_false':
        return 'True / False';
      case 'poll':
        return 'Poll';
      case 'type_answer':
        return 'Type Answer';
      default:
        return 'Multiple Choice';
    }
  }

  function formatScoringProfile(value) {
    switch (value) {
      case 'timed_accuracy':
        return 'Timed Accuracy';
      case 'live_scoring':
        return 'Live Scoring';
      default:
        return 'Accuracy';
    }
  }

  function formatAssignmentMode(value) {
    return value === 'selected_students' ? 'Selected students' : 'Whole class';
  }

  function getLeaderboardName(player) {
    return player?.displayName || player?.playerName || player?.name || 'Player';
  }

  function renderOptionBreakdown(item) {
    if (!Array.isArray(item.options) || item.options.length === 0) return '';
    return `
      <div class="lg-report-chip-list">
        ${item.options.map((option) => `
          <span class="lg-report-chip">
            ${escapeHtml(option.text)}: ${item.optionDistribution?.[option.id] || 0}
          </span>
        `).join('')}
      </div>
    `;
  }

  function renderAcceptedAnswers(item) {
    if (!Array.isArray(item.acceptedAnswers) || item.acceptedAnswers.length === 0) return '';
    return `
      <div class="lg-report-section-label">Accepted answers</div>
      <div class="lg-report-chip-list">
        ${item.acceptedAnswers.map((answer) => `<span class="lg-report-chip lg-report-chip-accent">${escapeHtml(answer)}</span>`).join('')}
      </div>
    `;
  }

  function renderSubmittedAnswers(item) {
    if (!Array.isArray(item.submittedAnswers) || item.submittedAnswers.length === 0) {
      return '<div class="lg-card-meta">No typed submissions were recorded.</div>';
    }
    return `
      <div class="lg-report-section-label">Submitted answers</div>
      <div class="lg-report-response-list">
        ${item.submittedAnswers.map((answer) => `
          <div class="lg-report-response-row">
            <div>
              <strong>${escapeHtml(answer.submittedText)}</strong>
              <div class="lg-card-meta">${answer.count} response${answer.count === 1 ? '' : 's'}</div>
            </div>
            <div class="lg-card-meta">${answer.correctCount} accepted</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderQuestionCards(items, totalPlayers) {
    return (items || []).map((item) => {
      const baseMeta = `
        <div class="lg-card-meta">Type: ${formatQuestionType(item.questionType)}</div>
        <div class="lg-card-meta">Answer rate: ${item.answerCount} / ${totalPlayers}</div>
        <div class="lg-card-meta">Avg response time: ${formatResponseTime(item.averageResponseTimeMs)}</div>
        <div class="lg-card-meta">Non-responders: ${item.nonResponderCount}</div>
        ${item.nonResponderCount > 0 ? `<div class="lg-card-meta">Missing: ${escapeHtml(item.nonResponders.join(', '))}</div>` : ''}
      `;

      if (item.questionType === 'poll') {
        return `
          <div class="lg-card">
            <h3 class="lg-card-title">Q${item.questionIndex + 1}: ${escapeHtml(item.title)}</h3>
            ${baseMeta}
            <div class="lg-card-meta">Poll questions are unscored.</div>
            ${renderOptionBreakdown(item)}
          </div>
        `;
      }

      if (item.questionType === 'type_answer') {
        return `
          <div class="lg-card">
            <h3 class="lg-card-title">Q${item.questionIndex + 1}: ${escapeHtml(item.title)}</h3>
            ${baseMeta}
            <div class="lg-card-meta">Correct rate: ${formatPercent((item.correctRate || 0) * 100)}</div>
            ${renderAcceptedAnswers(item)}
            ${renderSubmittedAnswers(item)}
          </div>
        `;
      }

      return `
        <div class="lg-card">
          <h3 class="lg-card-title">Q${item.questionIndex + 1}: ${escapeHtml(item.title)}</h3>
          ${baseMeta}
          <div class="lg-card-meta">Correct rate: ${formatPercent((item.correctRate || 0) * 100)}</div>
          ${renderOptionBreakdown(item)}
        </div>
      `;
    }).join('');
  }

  function renderLiveSessionSummary(report) {
    const wrap = byId('lgReportSummary');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="lg-card">
        <h3 class="lg-card-title">Session Summary</h3>
        <div class="lg-card-meta">Started: ${formatDate(report.summary.startedAt)}</div>
        <div class="lg-card-meta">Finished: ${formatDate(report.summary.finishedAt)}</div>
        <div class="lg-card-meta">Duration: ${formatDuration(report.summary.durationMs)}</div>
        <div class="lg-card-meta">Players: ${report.summary.totalPlayers}</div>
      </div>
      <div class="lg-card">
        <h3 class="lg-card-title">Leaderboard</h3>
        ${(report.leaderboard || []).slice(0, 5).map((player) => `
          <div class="lg-card-meta">#${player.rank} ${escapeHtml(getLeaderboardName(player))} - ${Number(player.score || 0).toLocaleString()} pts</div>
        `).join('')}
      </div>
      <div class="lg-card">
        <h3 class="lg-card-title">Insights</h3>
        <div class="lg-card-meta">Hardest: ${escapeHtml(report.insights.hardestQuestion?.title || 'N/A')}</div>
        <div class="lg-card-meta">Easiest: ${escapeHtml(report.insights.easiestQuestion?.title || 'N/A')}</div>
        <div class="lg-card-meta">Avg response time: ${formatResponseTime(report.summary.averageResponseTimeMs)}</div>
      </div>
    `;
  }

  function renderLiveSessionQuestions(report) {
    const wrap = byId('lgQuestionAnalytics');
    if (!wrap) return;
    wrap.innerHTML = renderQuestionCards(report.questionAnalytics || [], report.summary.totalPlayers);
  }

  function renderLiveSessionPlayers(report) {
    const wrap = byId('lgPlayerReports');
    if (!wrap) return;
    wrap.innerHTML = (report.playerReports || []).map((player) => `
      <div class="lg-card">
        <h3 class="lg-card-title">#${player.finalRank} ${escapeHtml(player.playerName)}</h3>
        <div class="lg-card-meta">Final score: ${Number(player.finalScore || 0).toLocaleString()} pts</div>
        <div class="lg-card-meta">Accuracy: ${formatPercent(player.accuracy * 100)}</div>
        <div class="lg-card-meta">Answered: ${player.answers.filter((answer) => answer.answerId || answer.submittedText).length} questions</div>
        <div class="lg-card-meta">Unanswered: ${player.unansweredCount}</div>
      </div>
    `).join('');
  }

  function renderAssignmentSummary(report) {
    const wrap = byId('lgAssignmentSummary');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="lg-card">
        <h3 class="lg-card-title">Assignment Settings</h3>
        <div class="lg-card-meta">Class: ${escapeHtml(report.summary.className || 'Class')} ${report.summary.classCode ? `(${escapeHtml(report.summary.classCode)})` : ''}</div>
        <div class="lg-card-meta">Mode: ${formatAssignmentMode(report.summary.assignmentMode)}</div>
        <div class="lg-card-meta">Scoring: ${formatScoringProfile(report.summary.scoringProfile)}</div>
        <div class="lg-card-meta">Open: ${formatDate(report.summary.startDate)}</div>
        <div class="lg-card-meta">Due: ${formatDate(report.summary.dueDate)}</div>
      </div>
      <div class="lg-card">
        <h3 class="lg-card-title">Progress Snapshot</h3>
        <div class="lg-card-meta">Targets: ${report.summary.targetStudentCount}</div>
        <div class="lg-card-meta">Submitted: ${report.summary.submittedCount}</div>
        <div class="lg-card-meta">In Progress: ${report.summary.inProgressCount}</div>
        <div class="lg-card-meta">Not Started: ${report.summary.notStartedCount}</div>
        <div class="lg-card-meta">Overdue: ${report.summary.overdueCount}</div>
      </div>
      <div class="lg-card">
        <h3 class="lg-card-title">${report.summary.showLeaderboard ? 'Leaderboard Preview' : 'Result Notes'}</h3>
        ${report.summary.showLeaderboard
          ? (report.leaderboard || []).slice(0, 5).map((student) => `
              <div class="lg-card-meta">#${student.rank || '-'} ${escapeHtml(student.studentName)} - ${Number(student.score || 0).toLocaleString()}</div>
            `).join('')
          : `<div class="lg-card-meta">Ranking is hidden for accuracy-only self-paced ClassRush assignments.</div>`
        }
      </div>
    `;
  }

  function renderAssignmentQuestions(report) {
    const wrap = byId('lgAssignmentQuestions');
    if (!wrap) return;
    wrap.innerHTML = renderQuestionCards(report.questionAnalytics || [], report.summary.submittedCount);
  }

  function renderAssignmentStudents(report) {
    const wrap = byId('lgAssignmentStudents');
    if (!wrap) return;
    wrap.innerHTML = (report.studentResults || []).map((student) => `
      <div class="lg-card">
        <h3 class="lg-card-title">${escapeHtml(student.studentName)}</h3>
        <div class="lg-card-meta">Status: ${escapeHtml(student.status)}</div>
        <div class="lg-card-meta">Started: ${formatDate(student.startedAt)}</div>
        <div class="lg-card-meta">Submitted: ${formatDate(student.submittedAt)}</div>
        <div class="lg-card-meta">Score: ${student.score === null ? 'N/A' : Number(student.score).toLocaleString()}</div>
        <div class="lg-card-meta">Correct: ${student.correctCount || 0}</div>
        <div class="lg-card-meta">Percent: ${student.percent === null ? 'N/A' : formatPercent(student.percent)}</div>
        <div class="lg-card-meta">Elapsed: ${student.elapsedTimeMs === null ? 'N/A' : formatDuration(student.elapsedTimeMs)}</div>
        ${student.rank ? `<div class="lg-card-meta">Rank: #${student.rank}</div>` : ''}
        ${student.isLate ? '<div class="lg-card-meta">Late submission</div>' : ''}
      </div>
    `).join('');
  }

  function renderSessionsList(gameId, sessions) {
    const list = byId('lgReportsList');
    if (!list) return;

    if (!sessions.length) {
      list.innerHTML = `
        <div class="lg-empty" style="grid-column: 1 / -1">
          <span class="material-icons">insights</span>
          <p>No completed sessions yet.</p>
        </div>`;
      return;
    }

    list.innerHTML = sessions.map((session) => `
      <div class="lg-card">
        <h3 class="lg-card-title">PIN ${escapeHtml(session.pin || 'N/A')}</h3>
        <div class="lg-card-meta">${session.totalPlayers} players - ${session.totalQuestions} questions - ${formatDuration(session.durationMs)}</div>
        <div class="lg-card-meta">Finished ${formatDate(session.finishedAt)}</div>
        <div class="lg-card-meta">Hardest: ${escapeHtml(session.hardestQuestion?.title || 'N/A')}</div>
        <div class="lg-card-actions">
          <a href="/teacher/live-games/${encodeURIComponent(gameId)}/reports/${encodeURIComponent(session.sessionId)}" class="lg-btn lg-btn-primary lg-btn-sm">
            <span class="material-icons">visibility</span> View Report
          </a>
        </div>
      </div>
    `).join('');
  }

  function renderAssignmentsList(gameId, assignments) {
    const list = byId('lgAssignmentReportsList');
    if (!list) return;

    if (!assignments.length) {
      list.innerHTML = `
        <div class="lg-empty" style="grid-column: 1 / -1">
          <span class="material-icons">assignment</span>
          <p>No self-paced assignments yet.</p>
        </div>`;
      return;
    }

    list.innerHTML = assignments.map((assignment) => `
      <div class="lg-card">
        <h3 class="lg-card-title">${escapeHtml(assignment.className || 'Class')}</h3>
        <div class="lg-card-meta">${assignment.classCode ? `${escapeHtml(assignment.classCode)} - ` : ''}${formatAssignmentMode(assignment.assignmentMode)}</div>
        <div class="lg-card-meta">Scoring: ${formatScoringProfile(assignment.scoringProfile)}</div>
        <div class="lg-card-meta">Submitted: ${assignment.submittedCount} - In Progress: ${assignment.inProgressCount} - Overdue: ${assignment.overdueCount}</div>
        <div class="lg-card-meta">Due: ${formatDate(assignment.dueDate)}</div>
        <div class="lg-card-actions">
          <a href="/teacher/live-games/${encodeURIComponent(gameId)}/assignments/${encodeURIComponent(assignment.assignmentId)}" class="lg-btn lg-btn-primary lg-btn-sm">
            <span class="material-icons">visibility</span> View Assignment
          </a>
        </div>
      </div>
    `).join('');
  }

  async function initList() {
    const gameId = document.body.dataset.gameId;

    try {
      const [reportsResponse, assignmentsResponse] = await Promise.all([
        fetch(`/api/live-games/${encodeURIComponent(gameId)}/reports`, { credentials: 'include' }),
        fetch(`/api/live-games/${encodeURIComponent(gameId)}/assignments`, { credentials: 'include' })
      ]);

      const reportsData = await reportsResponse.json();
      const assignmentsData = await assignmentsResponse.json();

      if (!reportsResponse.ok || !reportsData.success) {
        throw new Error(reportsData.message || 'Failed to load reports.');
      }
      if (!assignmentsResponse.ok || !assignmentsData.success) {
        throw new Error(assignmentsData.message || 'Failed to load self-paced assignments.');
      }

      byId('lgReportsTagline').textContent = `${reportsData.game.title} reports`;
      renderSessionsList(gameId, reportsData.sessions || []);
      renderAssignmentsList(gameId, assignmentsData.assignments || []);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function initDetail() {
    const gameId = document.body.dataset.gameId;
    const sessionId = document.body.dataset.sessionId;

    try {
      const res = await fetch(`/api/live-games/${encodeURIComponent(gameId)}/reports/${encodeURIComponent(sessionId)}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load report.');

      const report = data.report;
      byId('lgReportTagline').textContent = `${data.game.title} - PIN ${report.summary.pin}`;
      renderLiveSessionSummary(report);
      renderLiveSessionQuestions(report);
      renderLiveSessionPlayers(report);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function initAssignmentDetail() {
    const gameId = document.body.dataset.gameId;
    const assignmentId = document.body.dataset.assignmentId;

    try {
      const res = await fetch(`/api/live-games/${encodeURIComponent(gameId)}/assignments/${encodeURIComponent(assignmentId)}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load assignment detail.');

      byId('lgAssignmentTagline').textContent = `${data.game.title} - ${data.assignment.className || 'Class'} self-paced assignment`;
      renderAssignmentSummary(data.report);
      renderAssignmentQuestions(data.report);
      renderAssignmentStudents(data.report);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  global.teacherGameReports = {
    initList,
    initDetail,
    initAssignmentDetail
  };
})(window);
