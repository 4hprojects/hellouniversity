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

  async function initList() {
    const gameId = document.body.dataset.gameId;
    try {
      const res = await fetch(`/api/live-games/${encodeURIComponent(gameId)}/reports`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load reports.');

      byId('lgReportsTagline').textContent = `${data.game.title} completed sessions`;
      const list = byId('lgReportsList');
      if (!list) return;

      if (!data.sessions.length) {
        list.innerHTML = `
          <div class="lg-empty" style="grid-column: 1 / -1">
            <span class="material-icons">insights</span>
            <p>No completed sessions yet.</p>
          </div>`;
        return;
      }

      list.innerHTML = data.sessions.map((session) => `
        <div class="lg-card">
          <h3 class="lg-card-title">PIN ${escapeHtml(session.pin || 'N/A')}</h3>
          <div class="lg-card-meta">
            ${session.totalPlayers} players - ${session.totalQuestions} questions - ${formatDuration(session.durationMs)}
          </div>
          <div class="lg-card-meta">
            Finished ${formatDate(session.finishedAt)}
          </div>
          <div class="lg-card-meta">
            Hardest: ${escapeHtml(session.hardestQuestion?.title || 'N/A')}
          </div>
          <div class="lg-card-actions">
            <a href="/teacher/live-games/${encodeURIComponent(gameId)}/reports/${encodeURIComponent(session.sessionId)}" class="lg-btn lg-btn-primary lg-btn-sm">
              <span class="material-icons">visibility</span> View Report
            </a>
          </div>
        </div>
      `).join('');
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

      renderSummary(report);
      renderQuestions(report);
      renderPlayers(report);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  function renderSummary(report) {
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

  function renderQuestions(report) {
    const wrap = byId('lgQuestionAnalytics');
    if (!wrap) return;
    wrap.innerHTML = (report.questionAnalytics || []).map((item) => {
      const baseMeta = `
        <div class="lg-card-meta">Type: ${formatQuestionType(item.questionType)}</div>
        <div class="lg-card-meta">Answer rate: ${item.answerCount} / ${report.summary.totalPlayers}</div>
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
            <div class="lg-card-meta">Correct rate: ${((item.correctRate || 0) * 100).toFixed(1)}%</div>
            ${renderAcceptedAnswers(item)}
            ${renderSubmittedAnswers(item)}
          </div>
        `;
      }

      return `
        <div class="lg-card">
          <h3 class="lg-card-title">Q${item.questionIndex + 1}: ${escapeHtml(item.title)}</h3>
          ${baseMeta}
          <div class="lg-card-meta">Correct rate: ${((item.correctRate || 0) * 100).toFixed(1)}%</div>
          ${renderOptionBreakdown(item)}
        </div>
      `;
    }).join('');
  }

  function renderPlayers(report) {
    const wrap = byId('lgPlayerReports');
    if (!wrap) return;
    wrap.innerHTML = (report.playerReports || []).map((player) => `
      <div class="lg-card">
        <h3 class="lg-card-title">#${player.finalRank} ${escapeHtml(player.playerName)}</h3>
        <div class="lg-card-meta">Final score: ${Number(player.finalScore || 0).toLocaleString()} pts</div>
        <div class="lg-card-meta">Accuracy: ${(player.accuracy * 100).toFixed(1)}%</div>
        <div class="lg-card-meta">Answered: ${player.answers.filter((answer) => answer.answerId || answer.submittedText).length} questions</div>
        <div class="lg-card-meta">Unanswered: ${player.unansweredCount}</div>
      </div>
    `).join('');
  }

  global.teacherGameReports = {
    initList,
    initDetail
  };
})(window);
