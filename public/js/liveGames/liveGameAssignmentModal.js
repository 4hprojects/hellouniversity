(function attachLiveGameAssignmentModal(global) {
  'use strict';

  const state = {
    bound: false,
    currentGameId: '',
    currentGameTitle: '',
    currentAssignmentId: '',
    classes: [],
    roster: [],
    selectedClassId: '',
    assignment: null,
    loading: false,
    saving: false
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
  }

  function showToast(message, isError) {
    const toast = byId('lgToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle('error', !!isError);
    toast.classList.add('show');
    global.setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function formatDateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function setStatus(message, isError) {
    const line = byId('lgAssignStatusLine');
    if (!line) return;
    line.textContent = message || '';
    line.style.color = isError ? '#c0392b' : '';
  }

  function setBusy(isBusy) {
    state.loading = isBusy;
    const saveBtn = byId('lgAssignSaveBtn');
    const deleteBtn = byId('lgAssignDeleteBtn');
    const classSelect = byId('lgAssignClassSelect');
    const scopeSelect = byId('lgAssignScope');
    const startInput = byId('lgAssignStartDate');
    const dueInput = byId('lgAssignDueDate');
    const duePolicy = byId('lgAssignDuePolicy');
    const scoringProfile = byId('lgAssignScoringProfile');

    [saveBtn, deleteBtn, classSelect, scopeSelect, startInput, dueInput, duePolicy, scoringProfile].forEach((element) => {
      if (element) {
        element.disabled = isBusy;
      }
    });
  }

  function close() {
    const overlay = byId('lgAssignOverlay');
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove('lg-modal-open');
    setStatus('');
  }

  function openOverlay() {
    const overlay = byId('lgAssignOverlay');
    if (!overlay) return;
    overlay.hidden = false;
    document.body.classList.add('lg-modal-open');
  }

  function getSelectedStudentIds() {
    return Array.from(document.querySelectorAll('#lgAssignStudentList input[type="checkbox"]:checked'))
      .map((input) => String(input.value || '').trim())
      .filter(Boolean);
  }

  function renderRoster() {
    const container = byId('lgAssignStudentList');
    const meta = byId('lgAssignRosterMeta');
    if (!container || !meta) return;

    const scope = byId('lgAssignScope')?.value || 'whole_class';
    if (!state.selectedClassId) {
      meta.textContent = 'Choose one class to load the roster and edit assignment targeting.';
      container.innerHTML = '<p class="student-empty-state">Select a class to load the roster.</p>';
      return;
    }

    if (!state.roster.length) {
      meta.textContent = 'No enrolled students were found for this class.';
      container.innerHTML = '<p class="student-empty-state">This class does not have enrolled students yet.</p>';
      return;
    }

    const selectedStudents = new Set(
      scope === 'selected_students'
        ? (Array.isArray(state.assignment?.assignedStudents) ? state.assignment.assignedStudents : [])
        : state.roster.map((student) => student.studentIDNumber)
    );
    const disabled = scope !== 'selected_students';
    meta.textContent = scope === 'selected_students'
      ? 'Choose the students who should receive this self-paced ClassRush assignment.'
      : 'Whole-class assignments target every student currently enrolled in this class.';

    container.innerHTML = state.roster.map((student) => `
      <label class="lg-assign-student-row ${disabled ? 'is-disabled' : ''}">
        <input
          type="checkbox"
          value="${escapeHtml(student.studentIDNumber)}"
          ${selectedStudents.has(student.studentIDNumber) ? 'checked' : ''}
          ${disabled ? 'disabled' : ''}>
        <span class="lg-assign-student-name">${escapeHtml(student.name || student.studentIDNumber)}</span>
        <span class="lg-card-meta">${escapeHtml(student.studentIDNumber)}</span>
      </label>
    `).join('');
  }

  function applyAssignmentToForm(assignment) {
    state.assignment = assignment || null;
    state.currentAssignmentId = assignment?.assignmentId || '';

    byId('lgAssignScope').value = assignment?.assignmentMode || 'whole_class';
    byId('lgAssignStartDate').value = formatDateTimeLocal(assignment?.startDate);
    byId('lgAssignDueDate').value = formatDateTimeLocal(assignment?.dueDate);
    byId('lgAssignDuePolicy').value = assignment?.duePolicy || 'lock_after_due';
    byId('lgAssignScoringProfile').value = assignment?.scoringProfile || 'timed_accuracy';

    const saveBtn = byId('lgAssignSaveBtn');
    const deleteBtn = byId('lgAssignDeleteBtn');
    if (saveBtn) {
      saveBtn.innerHTML = assignment
        ? '<span class="material-icons">save</span> Update Assignment'
        : '<span class="material-icons">save</span> Save Assignment';
    }
    if (deleteBtn) {
      deleteBtn.hidden = !assignment;
    }

    renderRoster();
  }

  function populateClassSelect(classes, selectedClassId) {
    const select = byId('lgAssignClassSelect');
    if (!select) return;

    select.innerHTML = ['<option value="">Choose a class</option>']
      .concat(classes.map((classItem) => `
        <option value="${escapeHtml(classItem._id)}">${escapeHtml(classItem.className || 'Untitled class')}${classItem.classCode ? ` (${escapeHtml(classItem.classCode)})` : ''}</option>
      `))
      .join('');

    select.value = selectedClassId || '';
  }

  async function loadTargets(classId) {
    if (!state.currentGameId) return;
    setBusy(true);
    setStatus('');

    try {
      const query = classId ? `?classId=${encodeURIComponent(classId)}` : '';
      const response = await fetch(`/api/live-games/${encodeURIComponent(state.currentGameId)}/assignment-targets${query}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load assignment targets.');
      }

      state.classes = Array.isArray(data.classes) ? data.classes : [];
      const preferredClassId = classId
        || data.assignment?.classId
        || data.game?.linkedClass?.classId
        || '';

      populateClassSelect(state.classes, preferredClassId);

      if (!classId && preferredClassId && state.classes.some((classItem) => classItem._id === preferredClassId)) {
        state.selectedClassId = preferredClassId;
        await loadTargets(preferredClassId);
        return;
      }

      state.selectedClassId = classId || '';
      state.roster = Array.isArray(data.roster) ? data.roster : [];
      applyAssignmentToForm(data.assignment || null);

      const title = byId('lgAssignDialogTitle');
      const meta = byId('lgAssignDialogMeta');
      if (title) title.textContent = `Assign ${state.currentGameTitle || data.game?.title || 'ClassRush'}`;
      if (meta) {
        meta.textContent = state.selectedClassId
          ? `Configure one self-paced ClassRush assignment for ${data.selectedClass?.className || 'this class'}.`
          : 'Choose one class and configure this self-paced ClassRush assignment.';
      }
    } catch (error) {
      state.roster = [];
      applyAssignmentToForm(null);
      setStatus(error.message || 'Failed to load assignment targets.', true);
    } finally {
      setBusy(false);
    }
  }

  async function saveAssignment() {
    if (!state.currentGameId || state.saving) return;

    const classId = byId('lgAssignClassSelect')?.value || '';
    const assignmentMode = byId('lgAssignScope')?.value || 'whole_class';
    const assignedStudents = assignmentMode === 'selected_students' ? getSelectedStudentIds() : [];
    const payload = {
      classId,
      assignmentMode,
      assignedStudents,
      startDate: byId('lgAssignStartDate')?.value || null,
      dueDate: byId('lgAssignDueDate')?.value || null,
      duePolicy: byId('lgAssignDuePolicy')?.value || 'lock_after_due',
      scoringProfile: byId('lgAssignScoringProfile')?.value || 'timed_accuracy'
    };

    state.saving = true;
    setBusy(true);
    setStatus('');

    try {
      const response = await fetch(`/api/live-games/${encodeURIComponent(state.currentGameId)}/assignments`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save assignment.');
      }

      showToast('ClassRush assignment saved.');
      document.dispatchEvent(new CustomEvent('classrush-assignment-saved', {
        detail: {
          gameId: state.currentGameId,
          assignment: data.assignment || null
        }
      }));
      close();
    } catch (error) {
      setStatus(error.message || 'Failed to save assignment.', true);
    } finally {
      state.saving = false;
      setBusy(false);
    }
  }

  async function deleteAssignment() {
    if (!state.currentGameId || !state.currentAssignmentId || state.saving) return;

    if (!global.confirm('Remove this self-paced ClassRush assignment for the selected class?')) {
      return;
    }

    state.saving = true;
    setBusy(true);
    setStatus('');

    try {
      const response = await fetch(`/api/live-games/${encodeURIComponent(state.currentGameId)}/assignments/${encodeURIComponent(state.currentAssignmentId)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to remove assignment.');
      }

      showToast('ClassRush assignment removed.');
      await loadTargets(state.selectedClassId);
      document.dispatchEvent(new CustomEvent('classrush-assignment-deleted', {
        detail: {
          gameId: state.currentGameId,
          assignmentId: state.currentAssignmentId
        }
      }));
    } catch (error) {
      setStatus(error.message || 'Failed to remove assignment.', true);
    } finally {
      state.saving = false;
      setBusy(false);
    }
  }

  function bind() {
    if (state.bound) return;
    state.bound = true;

    byId('lgAssignCloseBtn')?.addEventListener('click', close);
    byId('lgAssignCancelBtn')?.addEventListener('click', close);
    byId('lgAssignOverlay')?.addEventListener('click', (event) => {
      if (event.target === byId('lgAssignOverlay')) {
        close();
      }
    });
    byId('lgAssignClassSelect')?.addEventListener('change', (event) => {
      state.selectedClassId = event.target.value || '';
      loadTargets(state.selectedClassId);
    });
    byId('lgAssignScope')?.addEventListener('change', () => {
      renderRoster();
    });
    byId('lgAssignSaveBtn')?.addEventListener('click', saveAssignment);
    byId('lgAssignDeleteBtn')?.addEventListener('click', deleteAssignment);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !byId('lgAssignOverlay')?.hidden) {
        close();
      }
    });
  }

  async function open(options = {}) {
    bind();
    state.currentGameId = String(options.gameId || '').trim();
    state.currentGameTitle = String(options.gameTitle || '').trim() || 'ClassRush';
    state.currentAssignmentId = '';
    state.assignment = null;
    state.selectedClassId = '';
    state.roster = [];

    openOverlay();
    await loadTargets('');
  }

  global.liveGameAssignmentModal = {
    bind,
    open,
    close
  };
})(window);
