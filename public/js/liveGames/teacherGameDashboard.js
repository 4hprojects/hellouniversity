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
        <div class="lg-card-actions">
          <a href="/teacher/live-games/${escapeHtml(String(g._id))}/host" class="lg-btn lg-btn-primary lg-btn-sm">
            <span class="material-icons">play_arrow</span> Host
          </a>
          <a href="/teacher/live-games/${escapeHtml(String(g._id))}/edit" class="lg-btn lg-btn-secondary lg-btn-sm">
            <span class="material-icons">edit</span> Edit
          </a>
          <button class="lg-btn lg-btn-secondary lg-btn-sm" data-action="duplicate" data-id="${escapeHtml(String(g._id))}">
            <span class="material-icons">content_copy</span>
          </button>
          <button class="lg-btn lg-btn-danger lg-btn-sm" data-action="delete" data-id="${escapeHtml(String(g._id))}">
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

  async function handleAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'duplicate') {
      try {
        const res = await fetch(`/api/live-games/${id}/duplicate`, { method: 'POST', credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message);
        showToast('Game duplicated!');
        fetchGames();
      } catch (err) { showToast(err.message, true); }
    }

    if (action === 'delete') {
      if (!confirm('Delete this game? This cannot be undone.')) return;
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
    byId('lgSearchInput')?.addEventListener('input', () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => { state.page = 1; fetchGames(); }, 350);
    });
    byId('lgPrevBtn')?.addEventListener('click', () => { if (state.page > 1) { state.page--; fetchGames(); } });
    byId('lgNextBtn')?.addEventListener('click', () => { if (state.page < state.totalPages) { state.page++; fetchGames(); } });
    byId('lgGamesGrid')?.addEventListener('click', handleAction);
    fetchGames();
  }

  global.teacherGameDashboard = { init };
})(window);
