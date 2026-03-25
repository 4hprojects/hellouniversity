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
            ${session.totalPlayers} players &middot; ${session.totalQuestions} questions &middot; ${formatDuration(session.durationMs)}
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
      byId('lgReportTagline').textContent = `${data.game.title} · PIN ${report.summary.pin}`;

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
          <div class="lg-card-meta">#${player.rank} ${escapeHtml(player.odName)} · ${player.score.toLocaleString()} pts</div>
        `).join('')}
      </div>
      <div class="lg-card">
        <h3 class="lg-card-title">Insights</h3>
        <div class="lg-card-meta">Hardest: ${escapeHtml(report.insights.hardestQuestion?.title || 'N/A')}</div>
        <div class="lg-card-meta">Easiest: ${escapeHtml(report.insights.easiestQuestion?.title || 'N/A')}</div>
      </div>
    `;
  }

  function renderQuestions(report) {
    const wrap = byId('lgQuestionAnalytics');
    if (!wrap) return;
    wrap.innerHTML = (report.questionAnalytics || []).map((item) => `
      <div class="lg-card">
        <h3 class="lg-card-title">Q${item.questionIndex + 1}: ${escapeHtml(item.title)}</h3>
        <div class="lg-card-meta">Answer rate: ${item.answerCount} / ${report.summary.totalPlayers}</div>
        <div class="lg-card-meta">Correct rate: ${(item.correctRate * 100).toFixed(1)}%</div>
        <div class="lg-card-meta">Avg response time: ${item.averageResponseTimeMs === null ? 'N/A' : item.averageResponseTimeMs + ' ms'}</div>
      </div>
    `).join('');
  }

  function renderPlayers(report) {
    const wrap = byId('lgPlayerReports');
    if (!wrap) return;
    wrap.innerHTML = (report.playerReports || []).map((player) => `
      <div class="lg-card">
        <h3 class="lg-card-title">#${player.finalRank} ${escapeHtml(player.playerName)}</h3>
        <div class="lg-card-meta">Final score: ${player.finalScore.toLocaleString()} pts</div>
        <div class="lg-card-meta">Accuracy: ${(player.accuracy * 100).toFixed(1)}%</div>
        <div class="lg-card-meta">Answered: ${player.answers.filter((answer) => answer.correct !== null).length} questions</div>
      </div>
    `).join('');
  }

  global.teacherGameReports = {
    initList,
    initDetail
  };
})(window);
