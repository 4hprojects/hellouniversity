const CREATE_SCHEDULE_PREFIX = 'create';
const CREATE_CONFIRM_SCHEDULE_PREFIX = 'createconfirm';
const EDIT_SCHEDULE_PREFIX = 'edit';
const EDIT_MODAL_HINT_DEFAULT = 'Update core event details or switch to the schedule tab for attendance windows.';
const EDIT_MODAL_HINT_LOCKED = 'Archived events are read-only here. Switch Status to Active to unlock details and attendance schedule editing.';
const EDIT_MODAL_HINT_REACTIVATE = 'Editing unlocked. Save changes to reactivate this event in active CRFV workflows.';
const EDIT_STATUS_HINT_ACTIVE = 'Active events stay available to CRFV operational workflows and upcoming event listings.';
const EDIT_STATUS_HINT_LOCKED = 'Archived events are read-only in this modal. Switch Status to Active to unlock details and attendance schedule editing.';
const EDIT_STATUS_HINT_REACTIVATE = 'Editing unlocked. Save changes to reactivate this event in active CRFV workflows.';
const {
  FALLBACK_ATTENDANCE_SCHEDULE,
  EVENT_SCHEDULE_TITLE,
  EVENT_SCHEDULE_DESCRIPTION,
  cloneSchedule,
  normalizeSchedule,
  buildScheduleSectionMarkup,
  ensureScheduleSection,
  applyScheduleToForm,
  readScheduleFromForm,
  validateSchedule,
  bindScheduleResetButtons,
  bindCollapsibleScheduleSections,
  bindScheduleHelpTooltips
} = window.CRFVAttendanceScheduleUI;

document.addEventListener('DOMContentLoaded', async () => {
  const authModal = document.getElementById('authModal');
  const goHomeBtn = document.getElementById('goHomeBtn');
  const eventForm = document.getElementById('eventForm');
  const eventStatus = document.getElementById('eventStatus');

  const state = {
    currentUser: null,
    attendanceDefaults: cloneSchedule(FALLBACK_ATTENDANCE_SCHEDULE),
    events: []
  };
  window.__crfvEventCreateState = state;

  if (goHomeBtn) {
    goHomeBtn.addEventListener('click', () => {
      window.location.href = '/crfv';
    });
  }

  initializeCollapsibles();
  ensureCreateConfirmModal();
  ensureEventEditModal();
  ensureDeleteConfirmModal();
  ensureArchiveConfirmModal();
  bindGlobalModalHandlers();

  const currentUser = await fetchCurrentUser();
  if (!currentUser) {
    if (authModal) {
      authModal.style.display = 'flex';
    }
    document.body.style.overflow = 'hidden';
    return;
  }

  if (authModal) {
    authModal.style.display = 'none';
  }
  document.body.style.overflow = '';
  state.currentUser = currentUser;

  await hydrateAttendanceDefaults(state);
  ensureScheduleSection(eventForm, CREATE_SCHEDULE_PREFIX, {
    title: EVENT_SCHEDULE_TITLE,
    description: EVENT_SCHEDULE_DESCRIPTION,
    resetLabel: 'Reset to current default',
    collapsible: true,
    expanded: false,
    collapsibleLabel: 'Attendance Schedule',
    collapsibleTooltip: 'Show or hide this event attendance schedule.'
  });
  applyScheduleToForm(eventForm, CREATE_SCHEDULE_PREFIX, state.attendanceDefaults);
  bindScheduleResetButtons(eventForm, state);
  bindCollapsibleScheduleSections(eventForm);
  bindScheduleHelpTooltips();
  bindGeneratedEventId(eventForm);
  bindCreateForm(eventForm, eventStatus, state);
  await refreshEvents(state);
});

async function fetchCurrentUser() {
  try {
    const [sessionRes, authRes] = await Promise.all([
      fetch('/session-check', { credentials: 'include' }),
      fetch('/api/check-auth', { credentials: 'same-origin' })
    ]);

    if (!sessionRes.ok || !authRes.ok) {
      return null;
    }

    const sessionData = await sessionRes.json();
    const authData = await authRes.json();
    const role = sessionData?.role || authData?.user?.role;
    if (role !== 'admin' && role !== 'manager') {
      return null;
    }

    return {
      role,
      firstName: authData?.user?.firstName || '',
      studentIDNumber: authData?.user?.studentIDNumber || ''
    };
  } catch (error) {
    console.error('CRFV event-create auth check failed:', error);
    return null;
  }
}

async function hydrateAttendanceDefaults(state) {
  try {
    const response = await fetch('/api/crfv/settings/attendance-defaults', {
      credentials: 'same-origin'
    });
    if (!response.ok) {
      throw new Error('Failed to load default schedule.');
    }
    const payload = await response.json();
    state.attendanceDefaults = normalizeSchedule(payload.attendance_schedule);
  } catch (error) {
    console.warn('Using fallback CRFV attendance defaults.', error);
    state.attendanceDefaults = cloneSchedule(FALLBACK_ATTENDANCE_SCHEDULE);
  }
}

function setActiveEditEventTab(form, nextTab, { focusTab = false } = {}) {
  if (!form) {
    return;
  }

  const tabs = Array.from(form.querySelectorAll('.event-edit-tab'));
  const panels = Array.from(form.querySelectorAll('.event-edit-panel'));
  if (tabs.length === 0 || panels.length === 0) {
    return;
  }

  let activeTabName = tabs.some(tab => tab.dataset.editTab === nextTab)
    ? nextTab
    : tabs[0].dataset.editTab;

  tabs.forEach(tab => {
    const isActive = tab.dataset.editTab === activeTabName;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
    if (isActive && focusTab) {
      tab.focus();
    }
  });

  panels.forEach(panel => {
    const isActive = panel.dataset.editPanel === activeTabName;
    panel.hidden = !isActive;
    panel.classList.toggle('active', isActive);
  });

  const body = form.querySelector('.event-edit-body');
  if (body) {
    body.scrollTop = 0;
  }
}

function bindEditEventTabs(form) {
  if (!form || form.dataset.tabsBound === 'true') {
    return;
  }

  form.dataset.tabsBound = 'true';
  const tabs = Array.from(form.querySelectorAll('.event-edit-tab'));

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      setActiveEditEventTab(form, tab.dataset.editTab);
    });

    tab.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
        return;
      }

      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowRight') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      }

      setActiveEditEventTab(form, tabs[nextIndex].dataset.editTab, { focusTab: true });
    });
  });
}

function bindGeneratedEventId(eventForm) {
  const eventNameInput = eventForm?.querySelector('#event_name, [name="event_name"]');
  const startDateInput = eventForm?.querySelector('#start_date, [name="start_date"]');
  const eventIdInput = eventForm?.querySelector('#event_id, [name="event_id"]');
  if (!eventNameInput || !startDateInput || !eventIdInput) {
    return;
  }

  const updateEventId = () => {
    eventIdInput.value = generateEventId(eventNameInput.value, startDateInput.value);
  };

  eventNameInput.addEventListener('input', updateEventId);
  startDateInput.addEventListener('change', updateEventId);
}

function generateEventId(eventName, startDate) {
  const prefix = String(eventName || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
  if (!startDate) {
    return prefix;
  }

  const [year, month, day] = String(startDate).split('-');
  if (!year || !month || !day) {
    return prefix;
  }

  return `${prefix}${month}${day}${year.slice(-2)}`;
}

function bindCreateForm(eventForm, statusNode, state) {
  if (!eventForm) {
    return;
  }

  eventForm.addEventListener('submit', async submitEvent => {
    submitEvent.preventDefault();

    const payload = buildCreatePayloadFromForm(eventForm, CREATE_SCHEDULE_PREFIX);
    const validationErrors = validateCreatePayload(payload);

    if (validationErrors.length > 0) {
      setFormStatus(statusNode, validationErrors[0], 'error');
      return;
    }

    openCreateConfirmModal(payload, state);
  });
}

function buildCreatePayloadFromForm(form, schedulePrefix) {
  const eventName = form.querySelector('[name="event_name"]')?.value.trim() || '';
  const startDate = form.querySelector('[name="start_date"]')?.value || '';

  return {
    event_id: generateEventId(eventName, startDate),
    event_name: eventName,
    start_date: startDate,
    end_date: form.querySelector('[name="end_date"]')?.value || '',
    location: form.querySelector('[name="location"]')?.value.trim() || '',
    venue: form.querySelector('[name="venue"]')?.value.trim() || '',
    attendance_schedule: readScheduleFromForm(form, schedulePrefix)
  };
}

function validateCreatePayload(payload) {
  const validationErrors = [];
  if (!payload.event_name) validationErrors.push('Event name is required.');
  if (!payload.start_date) validationErrors.push('Start date is required.');
  if (!payload.end_date) validationErrors.push('End date is required.');
  if (payload.end_date && payload.start_date && payload.end_date < payload.start_date) {
    validationErrors.push('End date cannot be before start date.');
  }
  if (!payload.location) validationErrors.push('Location is required.');
  if (!payload.venue) validationErrors.push('Venue is required.');
  validationErrors.push(...validateSchedule(payload.attendance_schedule));
  return validationErrors;
}

function syncCreateFormFromPayload(eventForm, payload) {
  if (!eventForm) {
    return;
  }

  const fieldMap = {
    event_name: payload.event_name,
    start_date: payload.start_date,
    end_date: payload.end_date,
    location: payload.location,
    venue: payload.venue,
    event_id: payload.event_id
  };

  Object.entries(fieldMap).forEach(([name, value]) => {
    const input = eventForm.querySelector(`[name="${name}"]`);
    if (input) {
      input.value = value || '';
    }
  });

  applyScheduleToForm(eventForm, CREATE_SCHEDULE_PREFIX, payload.attendance_schedule);
}

function setFormStatus(node, message, tone = 'info') {
  if (!node) {
    return;
  }

  node.textContent = message || '';
  node.dataset.tone = tone;
}

function initializeCollapsibles() {
  document.querySelectorAll('.collapsible').forEach(header => {
    if (header.dataset.bound === 'true') {
      return;
    }

    header.dataset.bound = 'true';
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const table = document.getElementById(targetId);
      const icon = header.querySelector('.collapse-icon');
      if (!table) {
        return;
      }

      const showTable = table.style.display === 'none';
      table.style.display = showTable ? 'table' : 'none';
      header.classList.toggle('collapsed', !showTable);
      if (icon) {
        icon.textContent = showTable ? 'v' : '>';
      }
    });
  });
}

function formatDate(dateString) {
  if (!dateString) {
    return '';
  }

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
}

function formatDateRange(startDate, endDate) {
  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);
  if (!formattedEnd || formattedEnd === formattedStart) {
    return formattedStart;
  }
  return `${formattedStart} to ${formattedEnd}`;
}

function normalizeEventsPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.events)) {
    return payload.events;
  }
  return [];
}

async function refreshEvents(state) {
  try {
    const response = await fetch('/api/events/all', { credentials: 'same-origin' });
    const payload = await response.json().catch(() => []);
    state.events = normalizeEventsPayload(payload).slice();
  } catch (error) {
    console.error('Failed to load CRFV events:', error);
    state.events = [];
  }

  state.events.sort((left, right) => String(right.start_date).localeCompare(String(left.start_date)));

  renderEventsTable('latestEventsList', state.events.filter(event => event.status !== 'archived'), state, {
    allowArchiveToggle: true
  });
  renderEventsTable('archivedEventsList', state.events.filter(event => event.status === 'archived'), state, {
    allowArchiveToggle: true
  });
  renderEventsTable('allEventsList', state.events, state);
}

function buildEventActionCell(event, options = {}) {
  const statusLabel = (event.status || 'active').replace(/_/g, ' ');
  const parts = [
    `<span class="event-status-badge status-${event.status || 'active'}">${statusLabel}</span>`,
    `<button type="button" class="event-action edit-btn" data-event-id="${event.event_id}">Edit</button>`
  ];

  if (options.allowArchiveToggle) {
    const nextStatus = event.status === 'archived' ? 'active' : 'archived';
    const actionLabel = nextStatus === 'archived' ? 'Archive' : 'Un-archive';
    parts.push(`<button type="button" class="event-action archive-btn" data-event-id="${event.event_id}" data-next-status="${nextStatus}">${actionLabel}</button>`);
  }

  return parts.join('');
}

function renderEventsTable(listId, events, state, options = {}) {
  const tbody = document.getElementById(listId);
  if (!tbody) {
    return;
  }

  if (!Array.isArray(events) || events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-gray-400">No events found.</td></tr>';
    return;
  }

  tbody.innerHTML = events.map((event, index) => `
    <tr class="${index % 2 === 0 ? 'event-row-even' : 'event-row-odd'}">
      <td>${escapeHtml(event.event_id || '')}</td>
      <td><strong>${escapeHtml(event.event_name || '')}</strong></td>
      <td>${escapeHtml(formatDateRange(event.start_date, event.end_date))}</td>
      <td>${escapeHtml(event.venue || '')}</td>
      <td>${escapeHtml(event.location || '')}</td>
      <td class="event-action-cell">${buildEventActionCell(event, options)}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', () => {
      openEventEditModal(button.dataset.eventId, state);
    });
  });

  tbody.querySelectorAll('.archive-btn').forEach(button => {
    button.addEventListener('click', async () => {
      await updateEventStatus(button.dataset.eventId, button.dataset.nextStatus, state);
    });
  });
}

function ensureEventEditModal() {
  if (document.getElementById('eventEditModal')) {
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'eventEditModal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content event-edit-modal-content">
      <form id="editEventForm" class="attendance-card event-edit-form" autocomplete="off">
        <div class="event-edit-header">
          <div>
            <h2>Edit Event</h2>
            <p class="modal-hint">Update core event details or switch to the schedule tab for attendance windows.</p>
          </div>
        </div>
        <div class="event-edit-tabs" role="tablist" aria-label="Edit event sections">
          <button
            type="button"
            class="event-edit-tab active"
            id="editEventTabDetails"
            data-edit-tab="details"
            role="tab"
            aria-selected="true"
            aria-controls="editEventPanelDetails"
            tabindex="0"
          >
            Details
          </button>
          <button
            type="button"
            class="event-edit-tab"
            id="editEventTabSchedule"
            data-edit-tab="schedule"
            role="tab"
            aria-selected="false"
            aria-controls="editEventPanelSchedule"
            tabindex="-1"
          >
            Attendance Schedule
          </button>
        </div>
        <div class="event-edit-body">
          <section
            class="event-edit-panel active"
            id="editEventPanelDetails"
            data-edit-panel="details"
            role="tabpanel"
            aria-labelledby="editEventTabDetails"
          >
            <div class="event-edit-grid">
              <label class="event-edit-field event-edit-field--full">
                Event Name
                <input type="text" name="event_name" required>
              </label>
              <label class="event-edit-field">
                Start Date
                <input type="date" name="start_date" required>
              </label>
              <label class="event-edit-field">
                End Date
                <input type="date" name="end_date" required>
              </label>
              <label class="event-edit-field">
                Location
                <input type="text" name="location" required>
              </label>
              <label class="event-edit-field">
                Venue
                <input type="text" name="venue" required>
              </label>
              <label class="event-edit-field">
                <span class="event-edit-field-label">
                  <span>Status</span>
                  <span class="event-field-help">
                    <button
                      type="button"
                      class="event-field-help-trigger"
                      aria-label="What is Status for?"
                      aria-describedby="editEventStatusTooltip"
                    >
                      <span class="material-icons" aria-hidden="true">help_outline</span>
                    </button>
                    <span id="editEventStatusTooltip" class="event-field-help-tooltip" role="tooltip">
                      Active keeps the event in current CRFV workflows. Archived moves it to Completed Events and removes it from active lists.
                    </span>
                  </span>
                </span>
                <select name="status" id="editEventStatus" class="status-select">
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label class="event-edit-field">
                Created By
                <input type="text" name="creator_account_name" readonly class="readonly-field">
              </label>
            </div>
            <div id="statusHint" class="modal-hint event-edit-status-hint">Archiving moves the event to Completed Events. Changing back to Active restores it to the active lists.</div>
          </section>
          <section
            class="event-edit-panel"
            id="editEventPanelSchedule"
            data-edit-panel="schedule"
            role="tabpanel"
            aria-labelledby="editEventTabSchedule"
            hidden
          >
            ${buildScheduleSectionMarkup(EDIT_SCHEDULE_PREFIX, {
              title: EVENT_SCHEDULE_TITLE,
              description: EVENT_SCHEDULE_DESCRIPTION,
              resetLabel: 'Reset to current default',
              sectionClass: 'schedule-section--modal'
            })}
          </section>
        </div>
        <div id="modalMsg" class="event-status event-edit-status"></div>
        <div class="modal-actions event-edit-footer">
          <div class="event-edit-footer-delete-group">
            <button type="button" id="deleteEventBtn" class="btn btn-danger event-edit-footer-delete">Delete Event</button>
            <span class="event-field-help event-edit-delete-help">
              <button
                type="button"
                class="event-field-help-trigger"
                aria-label="Why does delete require confirmation?"
                aria-describedby="deleteEventTooltip"
              >
                <span class="material-icons" aria-hidden="true">help_outline</span>
              </button>
              <span id="deleteEventTooltip" class="event-field-help-tooltip event-edit-delete-tooltip" role="tooltip">
                This permanently removes the event after password confirmation.
              </span>
            </span>
          </div>
          <div class="event-edit-footer-actions">
            <button type="button" id="closeEditModal" class="btn btn-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  bindEditEventTabs(document.getElementById('editEventForm'));
}

function ensureCreateConfirmModal() {
  if (document.getElementById('createConfirmModal')) {
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'createConfirmModal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content event-edit-modal-content create-confirm-modal-content">
      <form id="createConfirmForm" class="attendance-card event-edit-form create-confirm-form" autocomplete="off">
        <div class="event-edit-header">
          <div>
            <h2>Confirm Event Details</h2>
            <p class="modal-hint">Review and update this summary before the event is created.</p>
          </div>
        </div>
        <div class="event-edit-body create-confirm-body">
          <section class="event-edit-panel active">
            <div class="event-edit-grid">
              <label class="event-edit-field event-edit-field--full">
                Event Name
                <input type="text" name="event_name" required>
              </label>
              <label class="event-edit-field">
                Start Date
                <input type="date" name="start_date" required>
              </label>
              <label class="event-edit-field">
                End Date
                <input type="date" name="end_date" required>
              </label>
              <label class="event-edit-field">
                Location
                <input type="text" name="location" required>
              </label>
              <label class="event-edit-field">
                Venue
                <input type="text" name="venue" required>
              </label>
              <label class="event-edit-field">
                Event ID
                <input type="text" name="event_id" readonly class="readonly-field">
              </label>
            </div>
            ${buildScheduleSectionMarkup(CREATE_CONFIRM_SCHEDULE_PREFIX, {
              title: 'Attendance Schedule Summary',
              description: 'Review or adjust the schedule before creating this event.',
              sectionClass: 'schedule-section--modal'
            })}
          </section>
        </div>
        <div id="createConfirmMsg" class="event-status event-edit-status"></div>
        <div class="modal-actions event-edit-footer">
          <button type="button" id="cancelCreateConfirmBtn" class="btn btn-cancel">Back to Form</button>
          <button type="submit" class="btn btn-primary">Confirm Create Event</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = document.getElementById('createConfirmForm');
  const cancelButton = document.getElementById('cancelCreateConfirmBtn');
  const message = document.getElementById('createConfirmMsg');

  bindGeneratedEventId(form);

  cancelButton.addEventListener('click', () => {
    modal.style.display = 'none';
    setFormStatus(message, '', 'info');
  });

  form.addEventListener('submit', async submitEvent => {
    submitEvent.preventDefault();

    const payload = buildCreatePayloadFromForm(form, CREATE_CONFIRM_SCHEDULE_PREFIX);
    const validationErrors = validateCreatePayload(payload);
    if (validationErrors.length > 0) {
      setFormStatus(message, validationErrors[0], 'error');
      return;
    }

    const sourceForm = document.getElementById('eventForm');
    const sourceStatus = document.getElementById('eventStatus');
    const state = window.__crfvEventCreateState;

    syncCreateFormFromPayload(sourceForm, payload);
    setFormStatus(message, 'Creating event...', 'info');
    setFormStatus(sourceStatus, 'Creating event...', 'info');

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || result.error || 'Event creation failed.');
      }

      form.reset();
      applyScheduleToForm(form, CREATE_CONFIRM_SCHEDULE_PREFIX, state?.attendanceDefaults || FALLBACK_ATTENDANCE_SCHEDULE);
      sourceForm?.reset();
      applyScheduleToForm(sourceForm, CREATE_SCHEDULE_PREFIX, state?.attendanceDefaults || FALLBACK_ATTENDANCE_SCHEDULE);

      const confirmEventId = form.querySelector('[name="event_id"]');
      if (confirmEventId) {
        confirmEventId.value = '';
      }
      const sourceEventId = sourceForm?.querySelector('#event_id');
      if (sourceEventId) {
        sourceEventId.value = '';
      }

      modal.style.display = 'none';
      setFormStatus(message, '', 'info');
      setFormStatus(sourceStatus, 'Event created successfully.', 'success');
      if (state) {
        await refreshEvents(state);
      }
    } catch (error) {
      const errorMessage = error.message || 'Network error. Please try again.';
      setFormStatus(message, errorMessage, 'error');
      setFormStatus(sourceStatus, errorMessage, 'error');
    }
  });
}

function openCreateConfirmModal(payload, state) {
  const modal = document.getElementById('createConfirmModal');
  const form = document.getElementById('createConfirmForm');
  const message = document.getElementById('createConfirmMsg');

  if (!modal || !form) {
    return;
  }

  form.querySelector('[name="event_name"]').value = payload.event_name || '';
  form.querySelector('[name="start_date"]').value = payload.start_date || '';
  form.querySelector('[name="end_date"]').value = payload.end_date || '';
  form.querySelector('[name="location"]').value = payload.location || '';
  form.querySelector('[name="venue"]').value = payload.venue || '';
  form.querySelector('[name="event_id"]').value = payload.event_id || '';
  applyScheduleToForm(form, CREATE_CONFIRM_SCHEDULE_PREFIX, payload.attendance_schedule || state.attendanceDefaults);
  setFormStatus(message, '', 'info');
  modal.style.display = 'flex';
}

function ensureDeleteConfirmModal() {
  if (document.getElementById('deleteConfirmModal')) {
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'deleteConfirmModal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content delete-modal-content">
      <form id="deleteConfirmForm" class="attendance-card delete-confirm-form" autocomplete="off">
        <h2>Delete Event</h2>
        <p class="delete-copy">This permanently removes the event after password confirmation.</p>
        <label class="delete-password-field">
          Password
          <input
            type="password"
            name="delete_password"
            id="delete_password"
            class="delete-password-input"
            placeholder="Enter your password"
            required
            autocomplete="current-password"
          >
        </label>
        <div id="deleteModalMsg" class="event-status"></div>
        <div class="modal-actions delete-modal-actions">
          <button type="button" id="cancelDeleteBtn" class="btn btn-cancel delete-modal-btn delete-modal-btn--cancel">
            <span class="material-icons" aria-hidden="true">close</span>
            <span>Cancel</span>
          </button>
          <button type="submit" class="btn btn-danger delete-modal-btn delete-modal-btn--danger">
            <span class="material-icons" aria-hidden="true">delete_forever</span>
            <span>Delete Event</span>
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function ensureArchiveConfirmModal() {
  if (document.getElementById('archiveConfirmModal')) {
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'archiveConfirmModal';
  modal.className = 'modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content archive-modal-content">
      <form id="archiveConfirmForm" class="attendance-card archive-confirm-form" autocomplete="off">
        <h2>Archive Event</h2>
        <p class="archive-copy">Archiving moves this event to Completed Events and removes it from active CRFV lists.</p>
        <label class="archive-password-field">
          Password
          <input
            type="password"
            name="archive_password"
            id="archive_password"
            class="archive-password-input"
            placeholder="Enter your password"
            required
            autocomplete="current-password"
          >
        </label>
        <div id="archiveModalMsg" class="event-status"></div>
        <div class="modal-actions archive-modal-actions">
          <button type="button" id="cancelArchiveBtn" class="btn btn-cancel archive-modal-btn archive-modal-btn--cancel">
            <span class="material-icons" aria-hidden="true">close</span>
            <span>Cancel</span>
          </button>
          <button type="submit" class="btn btn-primary archive-modal-btn archive-modal-btn--confirm">
            <span class="material-icons" aria-hidden="true">inventory_2</span>
            <span>Archive Event</span>
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function openArchiveConfirmModal(eventId) {
  const archiveModal = document.getElementById('archiveConfirmModal');
  const archiveForm = document.getElementById('archiveConfirmForm');
  const archiveMessage = document.getElementById('archiveModalMsg');

  if (!archiveModal || !archiveForm || !archiveMessage) {
    return;
  }

  archiveForm.dataset.eventId = eventId;
  archiveForm.reset();
  setFormStatus(archiveMessage, '', 'info');
  archiveModal.style.display = 'flex';
}

function openEventEditModal(eventId, state) {
  const event = state.events.find(entry => entry.event_id === eventId);
  if (!event) {
    void window.crfvDialog.alert('Event not found.', { tone: 'error' });
    return;
  }

  const modal = document.getElementById('eventEditModal');
  const form = document.getElementById('editEventForm');
  const statusHint = document.getElementById('statusHint');
  const deleteButton = document.getElementById('deleteEventBtn');
  const closeButton = document.getElementById('closeEditModal');
  const message = document.getElementById('modalMsg');
  const headerHint = modal.querySelector('.event-edit-header .modal-hint');
  const saveButton = form.querySelector('button[type="submit"]');
  const detailFields = [
    form.event_name,
    form.start_date,
    form.end_date,
    form.location,
    form.venue
  ].filter(Boolean);
  const scheduleInputs = Array.from(form.querySelectorAll(`input[name^="${EDIT_SCHEDULE_PREFIX}_"]`));
  const scheduleResetButton = form.querySelector(`.schedule-reset-btn[data-schedule-prefix="${EDIT_SCHEDULE_PREFIX}"]`);
  const openedArchived = (event.status || 'active') === 'archived';

  form.dataset.eventId = event.event_id;
  form.event_name.value = event.event_name || '';
  form.start_date.value = event.start_date || '';
  form.end_date.value = event.end_date || '';
  form.location.value = event.location || '';
  form.venue.value = event.venue || '';
  form.status.value = event.status || 'active';
  form.creator_account_name.value = event.created_by_name || 'Unknown';
  applyScheduleToForm(form, EDIT_SCHEDULE_PREFIX, event.attendance_schedule || state.attendanceDefaults);
  bindScheduleResetButtons(form, state);
  bindEditEventTabs(form);
  setActiveEditEventTab(form, 'details');
  setFormStatus(message, '', 'info');

  const syncEditLockState = () => {
    const isLocked = form.status.value === 'archived';
    form.classList.toggle('is-read-only', isLocked);

    detailFields.forEach(field => {
      field.disabled = isLocked;
    });
    scheduleInputs.forEach(field => {
      field.disabled = isLocked;
    });

    if (scheduleResetButton) {
      scheduleResetButton.disabled = isLocked;
    }
    if (saveButton) {
      saveButton.disabled = isLocked;
    }

    if (headerHint) {
      headerHint.textContent = isLocked
        ? EDIT_MODAL_HINT_LOCKED
        : (openedArchived ? EDIT_MODAL_HINT_REACTIVATE : EDIT_MODAL_HINT_DEFAULT);
    }

    statusHint.textContent = isLocked
      ? EDIT_STATUS_HINT_LOCKED
      : (openedArchived ? EDIT_STATUS_HINT_REACTIVATE : EDIT_STATUS_HINT_ACTIVE);
  };

  form.status.onchange = syncEditLockState;
  syncEditLockState();

  form.onsubmit = async submitEvent => {
    submitEvent.preventDefault();

    if (form.status.value === 'archived') {
      setFormStatus(message, EDIT_STATUS_HINT_LOCKED, 'info');
      return;
    }

    const schedule = readScheduleFromForm(form, EDIT_SCHEDULE_PREFIX);
    const errors = validateSchedule(schedule);
    if (form.end_date.value && form.start_date.value && form.end_date.value < form.start_date.value) {
      errors.unshift('End date cannot be before start date.');
    }
    if (errors.length > 0) {
      setFormStatus(message, errors[0], 'error');
      return;
    }

    const confirmed = await window.crfvDialog.confirm('Are you sure you want to save these changes?', {
      title: 'Confirm action',
      confirmLabel: 'Save'
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${event.event_id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: form.event_name.value.trim(),
          start_date: form.start_date.value,
          end_date: form.end_date.value,
          location: form.location.value.trim(),
          venue: form.venue.value.trim(),
          status: form.status.value,
          attendance_schedule: schedule
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.status !== 'success') {
        throw new Error(payload.message || payload.error || 'Failed to update event.');
      }

      modal.style.display = 'none';
      await refreshEvents(state);
    } catch (error) {
      setFormStatus(message, error.message || 'Failed to update event.', 'error');
    }
  };

  closeButton.onclick = async () => {
    const discard = await window.crfvDialog.confirm('Discard unsaved changes?', {
      title: 'Discard changes?',
      confirmLabel: 'Discard',
      destructive: true
    });
    if (discard) {
      modal.style.display = 'none';
    }
  };

  deleteButton.onclick = () => {
    const deleteModal = document.getElementById('deleteConfirmModal');
    const deleteForm = document.getElementById('deleteConfirmForm');
    const deleteMessage = document.getElementById('deleteModalMsg');
    deleteForm.dataset.eventId = event.event_id;
    deleteForm.reset();
    setFormStatus(deleteMessage, '', 'info');
    deleteModal.style.display = 'flex';
  };

  modal.style.display = 'flex';
}

async function updateEventStatus(eventId, nextStatus, state) {
  const confirmMessage = nextStatus === 'archived'
    ? 'Are you sure you want to archive this event?\n\nArchived events move to Completed Events and are removed from active CRFV lists.\nYou will need to enter your password to finish archiving.'
    : 'Are you sure you want to un-archive this event?\n\nThis event will return to the active CRFV lists.';

  const confirmed = await window.crfvDialog.confirm(confirmMessage, {
    title: 'Confirm action',
    confirmLabel: nextStatus === 'archived' ? 'Archive' : 'Un-archive',
    destructive: nextStatus === 'archived'
  });
  if (!confirmed) {
    return;
  }

  if (nextStatus === 'archived') {
    openArchiveConfirmModal(eventId);
    return;
  }

  try {
    await requestEventStatusUpdate(eventId, nextStatus);
    await refreshEvents(state);
  } catch (error) {
    await window.crfvDialog.alert(error.message || 'Failed to update event status.', { tone: 'error' });
  }
}

async function requestEventStatusUpdate(eventId, nextStatus, extraPayload = {}) {
  const response = await fetch(`/api/events/${eventId}/status`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: nextStatus,
      ...extraPayload
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status !== 'success') {
    throw new Error(payload.message || payload.error || 'Failed to update event status.');
  }
  return payload;
}

function formatDeleteDependencyLabel(count, singularLabel, pluralLabel = `${singularLabel}s`) {
  const normalizedCount = Number(count || 0);
  if (normalizedCount <= 0) {
    return '';
  }
  return `${normalizedCount} ${normalizedCount === 1 ? singularLabel : pluralLabel}`;
}

function buildEventDeleteCascadeMessage(payload = {}) {
  const counts = payload?.dependencyCounts || {};
  const summary = [
    formatDeleteDependencyLabel(counts.attendees, 'attendee record'),
    formatDeleteDependencyLabel(counts.attendance_records, 'attendance record'),
    formatDeleteDependencyLabel(counts.payment_records, 'payment record'),
    formatDeleteDependencyLabel(counts.event_schedule_docs, 'schedule record'),
    formatDeleteDependencyLabel(counts.attendance_metadata_docs, 'attendance metadata record')
  ].filter(Boolean);

  if (summary.length === 0) {
    return 'Delete this event and all related CRFV data?';
  }

  return `Delete this event and all related CRFV data?\n\nThis will also delete: ${summary.join(', ')}.`;
}

function bindGlobalModalHandlers() {
  document.addEventListener('submit', async event => {
    if (event.target?.id === 'archiveConfirmForm') {
      event.preventDefault();
      const archiveForm = event.target;
      const eventId = archiveForm.dataset.eventId;
      const password = archiveForm.archive_password.value;
      const message = document.getElementById('archiveModalMsg');

      if (!password) {
        setFormStatus(message, 'Password is required.', 'error');
        return;
      }

      try {
        await requestEventStatusUpdate(eventId, 'archived', { password });
        document.getElementById('archiveConfirmModal').style.display = 'none';
        setFormStatus(message, '', 'info');
        const state = window.__crfvEventCreateState;
        if (state) {
          await refreshEvents(state);
        }
      } catch (error) {
        setFormStatus(message, error.message || 'Failed to archive event.', 'error');
      }
      return;
    }

    if (event.target?.id !== 'deleteConfirmForm') {
      return;
    }

    event.preventDefault();
    const deleteForm = event.target;
    const eventId = deleteForm.dataset.eventId;
    const password = deleteForm.delete_password.value;
    const message = document.getElementById('deleteModalMsg');

    if (!password) {
      setFormStatus(message, 'Password is required.', 'error');
      return;
    }

    const confirmed = await window.crfvDialog.confirm('Are you sure you want to permanently delete this event?', {
      title: 'Confirm action',
      confirmLabel: 'Delete',
      destructive: true
    });
    if (!confirmed) {
      return;
    }

    try {
      let response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      let payload = await response.json().catch(() => ({}));

      if (response.status === 409 && payload.reason === 'cascade_required') {
        if (!payload.canCascade) {
          throw new Error(payload.error || 'Only admins can hard-delete events with related data. Archive this event instead.');
        }

        const cascade = await window.crfvDialog.confirm(
          buildEventDeleteCascadeMessage(payload),
          {
            title: 'Confirm action',
            confirmLabel: 'Delete all',
            destructive: true
          }
        );

        if (!cascade) {
          return;
        }

        response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, cascade: true })
        });
        payload = await response.json().catch(() => ({}));
      }

      if (!response.ok || payload.status !== 'success') {
        throw new Error(payload.error || payload.message || 'Delete failed.');
      }

      document.getElementById('deleteConfirmModal').style.display = 'none';
      document.getElementById('eventEditModal').style.display = 'none';
      setFormStatus(message, '', 'info');
      const state = window.__crfvEventCreateState;
      if (state) {
        await refreshEvents(state);
      }
    } catch (error) {
      setFormStatus(message, error.message || 'Delete failed.', 'error');
    }
  });

  document.addEventListener('click', event => {
    const cancelArchiveButton = event.target.closest('#cancelArchiveBtn');
    if (cancelArchiveButton) {
      document.getElementById('archiveConfirmModal').style.display = 'none';
      return;
    }

    const cancelDeleteButton = event.target.closest('#cancelDeleteBtn');
    if (cancelDeleteButton) {
      document.getElementById('deleteConfirmModal').style.display = 'none';
      return;
    }

    if (event.target.classList.contains('modal-backdrop')) {
      const modal = event.target.parentElement;
      if (
        modal?.id === 'archiveConfirmModal'
        || modal?.id === 'deleteConfirmModal'
        || modal?.id === 'eventEditModal'
        || modal?.id === 'createConfirmModal'
      ) {
        modal.style.display = 'none';
      }
    }
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
