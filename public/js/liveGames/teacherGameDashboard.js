(function attachTeacherGameDashboard(global) {
  'use strict';

  const state = { games: [], page: 1, totalPages: 1, searchTimer: null };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function showToast(msg, isError) {
    const el = byId('lgToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  async function fetchGames() {
    const search = (byId('lgSearchInput')?.value || '').trim();
    const params = new URLSearchParams({ page: state.page, limit: 20 });
    if (search) params.set('search', search);

    try {
      const res = await fetch(`/api/live-games?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load games.');
      state.games = data.games || [];
      state.totalPages = data.pagination?.totalPages || 1;
      state.page = data.pagination?.page || 1;
      render();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  function render() {
    const grid = byId('lgGamesGrid');
    if (!grid) return;

    if (state.games.length === 0) {
      grid.innerHTML = `
        <div class="lg-empty" style="grid-column: 1 / -1">
          <span class="material-icons">sports_esports</span>
          <p>No live games yet. Create your first one!</p>
        </div>`;
      byId('lgPagination').style.display = 'none';
      return;
    }

    grid.innerHTML = state.games.map(g => `
      <div class="lg-card" data-id="${escapeHtml(String(g._id))}">
        <h3 class="lg-card-title">${escapeHtml(g.title)}</h3>
        <div class="lg-card-meta">
          ${g.questionCount || 0} question${(g.questionCount || 0) !== 1 ? 's' : ''}
          &middot; Updated ${formatDate(g.updatedAt || g.createdAt)}
        </div>
        ${g.linkedClass?.classId ? `<div class="lg-card-meta">Linked class: ${escapeHtml(g.linkedClass.className || 'Untitled class')}${g.linkedClass.classCode ? ` · ${escapeHtml(g.linkedClass.classCode)}` : ''}</div>` : ''}
        ${g.gamePin ? `
        <div class="lg-card-pin-row">
          <span class="lg-card-pin-label">PIN</span>
          <span class="lg-card-pin">${escapeHtml(String(g.gamePin))}</span>
          <button class="lg-card-qr-toggle lg-btn lg-btn-secondary lg-btn-sm" title="Show QR code" aria-label="Show QR code" data-qr-id="${escapeHtml(String(g._id))}">
            <span class="material-icons" style="font-size:1rem;">qr_code</span>
          </button>
        </div>
        <div class="lg-card-qr-wrap" id="lgCardQr_${escapeHtml(String(g._id))}" style="display:none;">
          <img src="/api/live-games/${escapeHtml(String(g._id))}/qr" alt="QR code" class="lg-card-qr-img" loading="lazy">
          <a href="/api/live-games/${escapeHtml(String(g._id))}/qr" download="clashrush-qr-${escapeHtml(String(g.gamePin))}.png" class="lg-btn lg-btn-secondary lg-btn-sm" style="margin-top:0.5rem;">
            <span class="material-icons" style="font-size:1rem;">download</span> Download
          </a>
        </div>
        ` : ''}
        <div class="lg-card-actions">
          <button class="lg-btn lg-btn-secondary lg-btn-sm" data-action="assign" data-id="${escapeHtml(String(g._id))}" data-title="${escapeHtml(g.title)}" data-tooltip="Assign">
            <span class="material-icons">assignment</span> Assign
          </button>
          <a href="/teacher/live-games/${escapeHtml(String(g._id))}/host" class="lg-btn lg-btn-primary lg-btn-sm" data-tooltip="Host game" target="_blank" rel="noopener noreferrer">
            <span class="material-icons">play_arrow</span> Host
          </a>
          <a href="/teacher/live-games/${escapeHtml(String(g._id))}/reports" class="lg-btn lg-btn-secondary lg-btn-sm" data-tooltip="Reports">
            <span class="material-icons">insights</span> Reports
          </a>
          <a href="/teacher/live-games/${escapeHtml(String(g._id))}/edit" class="lg-btn lg-btn-secondary lg-btn-sm" data-tooltip="Edit game">
            <span class="material-icons">edit</span> Edit
          </a>
          <button class="lg-btn lg-btn-secondary lg-btn-sm" data-action="duplicate" data-id="${escapeHtml(String(g._id))}" data-title="${escapeHtml(g.title)}" data-tooltip="Duplicate">
            <span class="material-icons">content_copy</span>
          </button>
          <button class="lg-btn lg-btn-danger lg-btn-sm" data-action="delete" data-id="${escapeHtml(String(g._id))}" data-title="${escapeHtml(g.title)}" data-tooltip="Delete">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
    `).join('');

    // Pagination
    const pag = byId('lgPagination');
    if (state.totalPages > 1) {
      pag.style.display = 'flex';
      byId('lgPageInfo').textContent = `Page ${state.page} of ${state.totalPages}`;
      byId('lgPrevBtn').disabled = state.page <= 1;
      byId('lgNextBtn').disabled = state.page >= state.totalPages;
    } else {
      pag.style.display = 'none';
    }
  }

  function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function showDialog({ title, body, confirmText, confirmClass, iconName, iconColor }) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'lg-overlay';
      const iconStyle = iconColor ? ` style="color:${iconColor}"` : '';
      overlay.innerHTML = `
        <div class="lg-dialog" role="dialog" aria-modal="true">
          ${iconName ? `<div class="lg-dialog-icon"><span class="material-icons"${iconStyle}>${iconName}</span></div>` : ''}
          <h3>${escapeHtml(title)}</h3>
          <p>${body}</p>
          <div class="lg-dialog-actions">
            <button class="lg-btn lg-btn-secondary" id="lgDialogCancel">Cancel</button>
            <button class="lg-btn ${confirmClass || 'lg-btn-primary'}" id="lgDialogConfirm">${escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const cleanup = (val) => { overlay.remove(); resolve(val); };
      overlay.querySelector('#lgDialogCancel').addEventListener('click', () => cleanup(false));
      overlay.querySelector('#lgDialogConfirm').addEventListener('click', () => cleanup(true));
      overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); });

      const onKey = e => { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); cleanup(false); } };
      document.addEventListener('keydown', onKey);

      overlay.querySelector('#lgDialogConfirm').focus();
    });
  }

  async function handleAction(e) {
    // QR toggle
    const qrBtn = e.target.closest('[data-qr-id]');
    if (qrBtn) {
      const wrap = document.getElementById(`lgCardQr_${qrBtn.dataset.qrId}`);
      if (wrap) wrap.style.display = wrap.style.display === 'none' ? '' : 'none';
      return;
    }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const gameTitle = btn.dataset.title || 'this game';

    if (action === 'duplicate') {
      const confirmed = await showDialog({
        title: 'Duplicate game?',
        body: `A copy of <strong>${escapeHtml(gameTitle)}</strong> will be created with a new game PIN.`,
        confirmText: 'Duplicate',
        confirmClass: 'lg-btn-primary',
        iconName: 'content_copy',
        iconColor: '#6c5ce7'
      });
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/live-games/${id}/duplicate`, { method: 'POST', credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message);
        showToast('Game duplicated!');
        fetchGames();
      } catch (err) { showToast(err.message, true); }
    }

    if (action === 'assign') {
      if (global.liveGameAssignmentModal) {
        global.liveGameAssignmentModal.open({ gameId: id, gameTitle });
      }
      return;
    }

    if (action === 'delete') {
      const confirmed = await showDialog({
        title: 'Delete game?',
        body: `<strong>${escapeHtml(gameTitle)}</strong> will be permanently deleted and cannot be recovered.`,
        confirmText: 'Delete',
        confirmClass: 'lg-btn-danger',
        iconName: 'delete_forever',
        iconColor: '#e74c3c'
      });
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/live-games/${id}`, { method: 'DELETE', credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message);
        showToast('Game deleted.');
        fetchGames();
      } catch (err) { showToast(err.message, true); }
    }
  }

  function init() {
    global.liveGameAssignmentModal?.bind?.();
    byId('lgSearchInput')?.addEventListener('input', () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => { state.page = 1; fetchGames(); }, 350);
    });
    byId('lgPrevBtn')?.addEventListener('click', () => { if (state.page > 1) { state.page--; fetchGames(); } });
    byId('lgNextBtn')?.addEventListener('click', () => { if (state.page < state.totalPages) { state.page++; fetchGames(); } });
    byId('lgGamesGrid')?.addEventListener('click', handleAction);
    document.addEventListener('classrush-assignment-saved', fetchGames);
    document.addEventListener('classrush-assignment-deleted', fetchGames);
    fetchGames();
  }

  global.teacherGameDashboard = { init };
})(window);
