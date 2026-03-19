(function attachTeacherGameBuilder(global) {
  'use strict';

  const SHAPES = ['&#9650;', '&#9670;', '&#9679;', '&#9632;']; // triangle, diamond, circle, square

  const state = {
    gameId: '',
    mode: 'create',
    questions: [],
    activeIndex: -1,
    saving: false
  };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }
  function uuid() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); }

  function showToast(msg, isError) {
    const el = byId('lgToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  function createEmptyQuestion(type) {
    const q = {
      id: uuid(),
      type: type || 'multiple_choice',
      title: '',
      imageUrl: '',
      timeLimitSeconds: 20,
      points: 1000,
      options: []
    };
    if (type === 'true_false') {
      q.options = [
        { id: uuid(), text: 'True', isCorrect: true },
        { id: uuid(), text: 'False', isCorrect: false }
      ];
    } else {
      q.options = [
        { id: uuid(), text: '', isCorrect: true },
        { id: uuid(), text: '', isCorrect: false },
        { id: uuid(), text: '', isCorrect: false },
        { id: uuid(), text: '', isCorrect: false }
      ];
    }
    return q;
  }

  // ── Sidebar ────────────────────────────────────────────────

  function renderSidebar() {
    const list = byId('lgQuestionList');
    if (!list) return;
    list.innerHTML = state.questions.map((q, i) => `
      <li class="lg-q-item ${i === state.activeIndex ? 'active' : ''}" data-index="${i}" draggable="true">
        <span class="lg-q-num">${i + 1}</span>
        <span>${escapeHtml(q.title || 'Untitled')}</span>
        <span class="lg-q-type">${q.type === 'true_false' ? 'T/F' : 'MC'}</span>
      </li>
    `).join('');
  }

  // ── Editor ─────────────────────────────────────────────────

  function renderEditor() {
    const empty = byId('lgEditorEmpty');
    const form = byId('lgEditorForm');
    if (state.activeIndex < 0 || state.activeIndex >= state.questions.length) {
      if (empty) empty.style.display = '';
      if (form) form.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (form) form.style.display = '';

    const q = state.questions[state.activeIndex];
    byId('lgQType').value = q.type;
    byId('lgQTitle').value = q.title;
    byId('lgQTime').value = q.timeLimitSeconds;

    const isTF = q.type === 'true_false';
    byId('lgAddOptionBtn').style.display = isTF ? 'none' : '';

    renderOptions(q);
  }

  function renderOptions(q) {
    const container = byId('lgOptionsContainer');
    if (!container) return;
    const isTF = q.type === 'true_false';

    container.innerHTML = q.options.map((opt, i) => `
      <div class="lg-option" data-oi="${i}">
        <span class="lg-option-shapes">${SHAPES[i] || ''}</span>
        <input type="radio" name="lgCorrectOpt" value="${i}" ${opt.isCorrect ? 'checked' : ''} title="Mark as correct">
        <input type="text" value="${escapeHtml(opt.text)}" placeholder="Option ${i + 1}" data-field="optionText" data-oi="${i}" maxlength="200" ${isTF ? 'readonly' : ''}>
        ${!isTF && q.options.length > 2 ? `<button class="lg-option-remove" data-action="removeOption" data-oi="${i}" title="Remove">&times;</button>` : ''}
      </div>
    `).join('');
  }

  function syncFromEditor() {
    if (state.activeIndex < 0) return;
    const q = state.questions[state.activeIndex];
    q.title = (byId('lgQTitle')?.value || '').trim();
    q.timeLimitSeconds = parseInt(byId('lgQTime')?.value, 10) || 20;

    // Sync option texts
    const optInputs = byId('lgOptionsContainer')?.querySelectorAll('[data-field="optionText"]') || [];
    optInputs.forEach(input => {
      const oi = parseInt(input.dataset.oi, 10);
      if (q.options[oi]) q.options[oi].text = input.value;
    });

    // Sync correct option
    const radios = byId('lgOptionsContainer')?.querySelectorAll('input[name="lgCorrectOpt"]') || [];
    radios.forEach(r => {
      const oi = parseInt(r.value, 10);
      if (q.options[oi]) q.options[oi].isCorrect = r.checked;
    });

    renderSidebar();
  }

  // ── Event handlers ─────────────────────────────────────────

  function onTypeChange() {
    if (state.activeIndex < 0) return;
    const q = state.questions[state.activeIndex];
    const newType = byId('lgQType').value;
    if (newType === q.type) return;

    q.type = newType;
    if (newType === 'true_false') {
      q.options = [
        { id: uuid(), text: 'True', isCorrect: true },
        { id: uuid(), text: 'False', isCorrect: false }
      ];
    } else if (q.options.length < 2) {
      q.options = [
        { id: uuid(), text: '', isCorrect: true },
        { id: uuid(), text: '', isCorrect: false }
      ];
    }
    renderEditor();
  }

  function onAddOption() {
    if (state.activeIndex < 0) return;
    const q = state.questions[state.activeIndex];
    if (q.options.length >= 4 || q.type === 'true_false') return;
    q.options.push({ id: uuid(), text: '', isCorrect: false });
    renderOptions(q);
  }

  function onRemoveOption(oi) {
    if (state.activeIndex < 0) return;
    const q = state.questions[state.activeIndex];
    if (q.options.length <= 2) return;
    const wasCorrect = q.options[oi].isCorrect;
    q.options.splice(oi, 1);
    if (wasCorrect && q.options.length > 0) q.options[0].isCorrect = true;
    renderOptions(q);
  }

  function onAddQuestion() {
    syncFromEditor();
    const q = createEmptyQuestion('multiple_choice');
    state.questions.push(q);
    state.activeIndex = state.questions.length - 1;
    renderSidebar();
    renderEditor();
  }

  function onDeleteQuestion() {
    if (state.activeIndex < 0) return;
    state.questions.splice(state.activeIndex, 1);
    if (state.activeIndex >= state.questions.length) state.activeIndex = state.questions.length - 1;
    renderSidebar();
    renderEditor();
  }

  function onSelectQuestion(index) {
    syncFromEditor();
    state.activeIndex = index;
    renderSidebar();
    renderEditor();
  }

  // ── Save ───────────────────────────────────────────────────

  async function onSave() {
    if (state.saving) return;
    syncFromEditor();

    const payload = {
      title: byId('lgGameTitle')?.value || '',
      description: byId('lgGameDesc')?.value || '',
      questions: state.questions,
      settings: {
        requireLogin: byId('lgRequireLogin')?.checked || false,
        showLeaderboardAfterEach: byId('lgShowLeaderboard')?.checked !== false,
        maxPlayers: parseInt(byId('lgMaxPlayers')?.value, 10) || 50
      }
    };

    state.saving = true;
    byId('lgSaveBtn').disabled = true;

    try {
      const isEdit = state.mode === 'edit' && state.gameId;
      const url = isEdit ? `/api/live-games/${state.gameId}` : '/api/live-games';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Save failed.');

      showToast(isEdit ? 'Game saved!' : 'Game created!');

      if (!isEdit && data.game?._id) {
        state.gameId = data.game._id;
        state.mode = 'edit';
        history.replaceState(null, '', `/teacher/live-games/${state.gameId}/edit`);
        byId('lgBuilderTitle').textContent = 'Edit Live Game';
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      state.saving = false;
      byId('lgSaveBtn').disabled = false;
    }
  }

  // ── Load existing game ─────────────────────────────────────

  async function loadGame(gameId) {
    try {
      const res = await fetch(`/api/live-games/${gameId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      const g = data.game;
      byId('lgGameTitle').value = g.title || '';
      byId('lgGameDesc').value = g.description || '';
      byId('lgRequireLogin').checked = g.settings?.requireLogin || false;
      byId('lgShowLeaderboard').checked = g.settings?.showLeaderboardAfterEach !== false;
      byId('lgMaxPlayers').value = g.settings?.maxPlayers || 50;

      state.questions = (g.questions || []).map(q => ({
        id: q.id || uuid(),
        type: q.type || 'multiple_choice',
        title: q.title || '',
        imageUrl: q.imageUrl || '',
        timeLimitSeconds: q.timeLimitSeconds || 20,
        points: q.points || 1000,
        options: (q.options || []).map(o => ({
          id: o.id || uuid(),
          text: o.text || '',
          isCorrect: o.isCorrect === true
        }))
      }));

      if (state.questions.length > 0) state.activeIndex = 0;
      renderSidebar();
      renderEditor();
    } catch (err) {
      showToast('Failed to load game: ' + err.message, true);
    }
  }

  // ── Drag and drop ──────────────────────────────────────────

  let dragFrom = -1;
  function onDragStart(e) {
    const item = e.target.closest('.lg-q-item');
    if (!item) return;
    dragFrom = parseInt(item.dataset.index, 10);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  function onDrop(e) {
    e.preventDefault();
    const item = e.target.closest('.lg-q-item');
    if (!item || dragFrom < 0) return;
    const dragTo = parseInt(item.dataset.index, 10);
    if (dragFrom === dragTo) return;

    syncFromEditor();
    const [moved] = state.questions.splice(dragFrom, 1);
    state.questions.splice(dragTo, 0, moved);
    if (state.activeIndex === dragFrom) state.activeIndex = dragTo;
    else if (dragFrom < state.activeIndex && dragTo >= state.activeIndex) state.activeIndex--;
    else if (dragFrom > state.activeIndex && dragTo <= state.activeIndex) state.activeIndex++;

    dragFrom = -1;
    renderSidebar();
    renderEditor();
  }

  // ── Init ───────────────────────────────────────────────────

  function init() {
    state.gameId = document.body.dataset.gameId || '';
    state.mode = document.body.dataset.gameMode || 'create';

    if (state.mode === 'edit') {
      byId('lgBuilderTitle').textContent = 'Edit Live Game';
    }

    // Event listeners
    byId('lgSaveBtn')?.addEventListener('click', onSave);
    byId('lgAddQuestionBtn')?.addEventListener('click', onAddQuestion);
    byId('lgDeleteQuestionBtn')?.addEventListener('click', onDeleteQuestion);
    byId('lgAddOptionBtn')?.addEventListener('click', onAddOption);
    byId('lgQType')?.addEventListener('change', onTypeChange);

    // Sidebar click
    byId('lgQuestionList')?.addEventListener('click', (e) => {
      const item = e.target.closest('.lg-q-item');
      if (item) onSelectQuestion(parseInt(item.dataset.index, 10));
    });

    // Options container delegation
    byId('lgOptionsContainer')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="removeOption"]');
      if (btn) onRemoveOption(parseInt(btn.dataset.oi, 10));
    });

    // Editor input sync on blur
    ['lgQTitle', 'lgQTime'].forEach(id => {
      byId(id)?.addEventListener('blur', syncFromEditor);
    });

    // Drag and drop
    const list = byId('lgQuestionList');
    if (list) {
      list.addEventListener('dragstart', onDragStart);
      list.addEventListener('dragover', onDragOver);
      list.addEventListener('drop', onDrop);
    }

    // Load existing game in edit mode
    if (state.mode === 'edit' && state.gameId) {
      loadGame(state.gameId);
    } else {
      renderSidebar();
      renderEditor();
    }
  }

  global.teacherGameBuilder = { init };
})(window);
