const FALLBACK_ATTENDANCE_SCHEDULE = Object.freeze({
  am_in: { start: '00:00', on_time_until: '09:00' },
  am_out: { start: '12:00' },
  pm_in: { start: '13:00', on_time_until: '13:00' },
  pm_out: { start: '17:00' }
});

const CREATE_SCHEDULE_PREFIX = 'create';
const EDIT_SCHEDULE_PREFIX = 'edit';

document.addEventListener('DOMContentLoaded', async () => {
  const authModal = document.getElementById('authModal');
  const goHomeBtn = document.getElementById('goHomeBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const createPanel = document.getElementById('createPanel');
  const eventForm = document.getElementById('eventForm');
  const eventStatus = document.getElementById('eventStatus');
  const creatorStudentId = document.getElementById('creator_student_id');
  const userName = document.getElementById('userName');

  const state = {
    currentUser: null,
    attendanceDefaults: cloneSchedule(FALLBACK_ATTENDANCE_SCHEDULE),
    events: []
  };
  window.__crfvEventCreateState = state;

  if (goHomeBtn) {
    goHomeBtn.addEventListener('click', () => {
      window.location.href = '/crfv/index';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
      window.location.href = '/crfv/index';
    });
  }

  initializeCollapsibles();
  ensureEventEditModal();
  ensureDeleteConfirmModal();
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

  if (creatorStudentId) {
    creatorStudentId.value = currentUser.studentIDNumber || '';
  }
  if (userName) {
    userName.textContent = `Hello, ${currentUser.firstName || currentUser.studentIDNumber || 'User'}`;
  }

  await hydrateAttendanceDefaults(state);
  ensureDefaultsCard(createPanel, state);
  ensureScheduleSection(eventForm, CREATE_SCHEDULE_PREFIX, 'Reset to current default');
  applyScheduleToForm(eventForm, CREATE_SCHEDULE_PREFIX, state.attendanceDefaults);
  bindScheduleResetButtons(eventForm, state);
  bindGeneratedEventId(eventForm);
  bindCreateForm(eventForm, eventStatus, state);
  await refreshEvents(state);
});

function cloneSchedule(schedule) {
  return JSON.parse(JSON.stringify(schedule || FALLBACK_ATTENDANCE_SCHEDULE));
}

function normalizeSchedule(schedule) {
  const source = schedule && typeof schedule === 'object' ? schedule : {};
  return {
    am_in: {
      start: source?.am_in?.start || FALLBACK_ATTENDANCE_SCHEDULE.am_in.start,
      on_time_until: source?.am_in?.on_time_until || FALLBACK_ATTENDANCE_SCHEDULE.am_in.on_time_until
    },
    am_out: {
      start: source?.am_out?.start || FALLBACK_ATTENDANCE_SCHEDULE.am_out.start
    },
    pm_in: {
      start: source?.pm_in?.start || FALLBACK_ATTENDANCE_SCHEDULE.pm_in.start,
      on_time_until: source?.pm_in?.on_time_until || FALLBACK_ATTENDANCE_SCHEDULE.pm_in.on_time_until
    },
    pm_out: {
      start: source?.pm_out?.start || FALLBACK_ATTENDANCE_SCHEDULE.pm_out.start
    }
  };
}

function buildScheduleField(prefix, slotKey, fieldKey, label, value) {
  return `
    <label class="schedule-input">
      <span>${label}</span>
      <input type="time" name="${prefix}_${slotKey}_${fieldKey}" value="${value}">
    </label>
  `;
}

function buildScheduleSectionMarkup(prefix, resetLabel = '') {
  return `
    <section class="schedule-section" data-prefix="${prefix}">
      <div class="schedule-section-header">
        <div>
          <h3>Attendance Schedule</h3>
          <p>AM IN stays active until AM OUT begins. PM IN stays active until PM OUT begins. "On time until" is the punctuality cutoff.</p>
        </div>
        ${resetLabel ? `<button type="button" class="btn btn-secondary schedule-reset-btn" data-schedule-prefix="${prefix}">${resetLabel}</button>` : ''}
      </div>
      <div class="schedule-grid">
        <article class="schedule-card">
          <h4>AM IN</h4>
          ${buildScheduleField(prefix, 'am_in', 'start', 'Slot starts', FALLBACK_ATTENDANCE_SCHEDULE.am_in.start)}
          ${buildScheduleField(prefix, 'am_in', 'on_time_until', 'On time until', FALLBACK_ATTENDANCE_SCHEDULE.am_in.on_time_until)}
        </article>
        <article class="schedule-card">
          <h4>AM OUT</h4>
          ${buildScheduleField(prefix, 'am_out', 'start', 'Slot starts', FALLBACK_ATTENDANCE_SCHEDULE.am_out.start)}
        </article>
        <article class="schedule-card">
          <h4>PM IN</h4>
          ${buildScheduleField(prefix, 'pm_in', 'start', 'Slot starts', FALLBACK_ATTENDANCE_SCHEDULE.pm_in.start)}
          ${buildScheduleField(prefix, 'pm_in', 'on_time_until', 'On time until', FALLBACK_ATTENDANCE_SCHEDULE.pm_in.on_time_until)}
        </article>
        <article class="schedule-card">
          <h4>PM OUT</h4>
          ${buildScheduleField(prefix, 'pm_out', 'start', 'Slot starts', FALLBACK_ATTENDANCE_SCHEDULE.pm_out.start)}
        </article>
      </div>
    </section>
  `;
}

function ensureScheduleSection(form, prefix, resetLabel) {
  if (!form || form.querySelector(`.schedule-section[data-prefix="${prefix}"]`)) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildScheduleSectionMarkup(prefix, resetLabel);
  const section = wrapper.firstElementChild;
  const submitButton = form.querySelector('button[type="submit"]');
  const formActions = submitButton ? submitButton.closest('.form-actions') : null;

  if (formActions) {
    form.insertBefore(section, formActions);
  } else if (submitButton) {
    form.insertBefore(section, submitButton);
  } else {
    form.appendChild(section);
  }
}

function applyScheduleToForm(form, prefix, scheduleInput) {
  const schedule = normalizeSchedule(scheduleInput);
  const fieldMap = [
    ['am_in', 'start'],
    ['am_in', 'on_time_until'],
    ['am_out', 'start'],
    ['pm_in', 'start'],
    ['pm_in', 'on_time_until'],
    ['pm_out', 'start']
  ];

  fieldMap.forEach(([slotKey, fieldKey]) => {
    const input = form?.querySelector(`input[name="${prefix}_${slotKey}_${fieldKey}"]`);
    if (input) {
      input.value = schedule[slotKey][fieldKey];
    }
  });
}

function readScheduleFromForm(form, prefix) {
  return normalizeSchedule({
    am_in: {
      start: form.querySelector(`input[name="${prefix}_am_in_start"]`)?.value,
      on_time_until: form.querySelector(`input[name="${prefix}_am_in_on_time_until"]`)?.value
    },
    am_out: {
      start: form.querySelector(`input[name="${prefix}_am_out_start"]`)?.value
    },
    pm_in: {
      start: form.querySelector(`input[name="${prefix}_pm_in_start"]`)?.value,
      on_time_until: form.querySelector(`input[name="${prefix}_pm_in_on_time_until"]`)?.value
    },
    pm_out: {
      start: form.querySelector(`input[name="${prefix}_pm_out_start"]`)?.value
    }
  });
}

function timeToMinutes(value) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return NaN;
  }
  return (Number(match[1]) * 60) + Number(match[2]);
}

function validateSchedule(scheduleInput) {
  const schedule = normalizeSchedule(scheduleInput);
  const errors = [];
  const values = {
    amInStart: timeToMinutes(schedule.am_in.start),
    amInOnTimeUntil: timeToMinutes(schedule.am_in.on_time_until),
    amOutStart: timeToMinutes(schedule.am_out.start),
    pmInStart: timeToMinutes(schedule.pm_in.start),
    pmInOnTimeUntil: timeToMinutes(schedule.pm_in.on_time_until),
    pmOutStart: timeToMinutes(schedule.pm_out.start)
  };

  Object.entries(values).forEach(([field, value]) => {
    if (!Number.isFinite(value)) {
      errors.push(`Invalid time supplied for ${field}.`);
    }
  });

  if (errors.length === 0) {
    if (values.amInStart > values.amInOnTimeUntil) {
      errors.push('AM IN start cannot be later than its on-time cutoff.');
    }
    if (values.amInOnTimeUntil >= values.amOutStart) {
      errors.push('AM IN on-time cutoff must be earlier than AM OUT start.');
    }
    if (values.amOutStart > values.pmInStart) {
      errors.push('AM OUT start cannot be later than PM IN start.');
    }
    if (values.pmInStart > values.pmInOnTimeUntil) {
      errors.push('PM IN start cannot be later than its on-time cutoff.');
    }
    if (values.pmInOnTimeUntil >= values.pmOutStart) {
      errors.push('PM IN on-time cutoff must be earlier than PM OUT start.');
    }
  }

  return errors;
}

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

function ensureDefaultsCard(createPanel, state) {
  if (!createPanel || document.getElementById('attendanceDefaultsForm')) {
    return;
  }

  const defaultsCard = document.createElement('section');
  defaultsCard.className = 'settings-card';
  defaultsCard.innerHTML = `
    <div class="settings-card-header">
      <h2>Default Attendance Schedule</h2>
      <p>These defaults seed future events. They do not retroactively change existing event schedules.</p>
    </div>
    <form id="attendanceDefaultsForm" class="attendance-card" autocomplete="off">
      ${buildScheduleSectionMarkup('defaults')}
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Save Default Schedule</button>
      </div>
      <div id="attendanceDefaultsStatus" class="event-status"></div>
    </form>
  `;
  createPanel.prepend(defaultsCard);

  const defaultsForm = document.getElementById('attendanceDefaultsForm');
  const defaultsStatus = document.getElementById('attendanceDefaultsStatus');
  applyScheduleToForm(defaultsForm, 'defaults', state.attendanceDefaults);

  defaultsForm.addEventListener('submit', async submitEvent => {
    submitEvent.preventDefault();
    const schedule = readScheduleFromForm(defaultsForm, 'defaults');
    const errors = validateSchedule(schedule);
    if (errors.length > 0) {
      setFormStatus(defaultsStatus, errors[0], 'error');
      return;
    }

    setFormStatus(defaultsStatus, 'Saving default schedule...', 'info');
    try {
      const response = await fetch('/api/crfv/settings/attendance-defaults', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_schedule: schedule })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload.message || 'Failed to save default schedule.');
      }

      state.attendanceDefaults = normalizeSchedule(payload.attendance_schedule);
      applyScheduleToForm(defaultsForm, 'defaults', state.attendanceDefaults);
      applyScheduleToForm(document.getElementById('eventForm'), CREATE_SCHEDULE_PREFIX, state.attendanceDefaults);
      setFormStatus(defaultsStatus, 'Default schedule saved.', 'success');
    } catch (error) {
      setFormStatus(defaultsStatus, error.message || 'Failed to save default schedule.', 'error');
    }
  });
}

function bindScheduleResetButtons(container, state, onReset) {
  if (!container) {
    return;
  }

  container.querySelectorAll('.schedule-reset-btn').forEach(button => {
    if (button.dataset.bound === 'true') {
      return;
    }

    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      const prefix = button.dataset.schedulePrefix;
      if (!prefix) {
        return;
      }

      applyScheduleToForm(container, prefix, state.attendanceDefaults);
      if (typeof onReset === 'function') {
        onReset();
      }
    });
  });
}

function bindGeneratedEventId(eventForm) {
  const eventNameInput = eventForm?.querySelector('#event_name');
  const startDateInput = eventForm?.querySelector('#start_date');
  const eventIdInput = eventForm?.querySelector('#event_id');
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

    const payload = {
      event_id: generateEventId(eventForm.event_name.value.trim(), eventForm.start_date.value),
      event_name: eventForm.event_name.value.trim(),
      start_date: eventForm.start_date.value,
      end_date: eventForm.end_date.value,
      location: eventForm.location.value.trim(),
      venue: eventForm.venue.value.trim(),
      attendance_schedule: readScheduleFromForm(eventForm, CREATE_SCHEDULE_PREFIX)
    };

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

    if (validationErrors.length > 0) {
      setFormStatus(statusNode, validationErrors[0], 'error');
      return;
    }

    setFormStatus(statusNode, 'Creating event...', 'info');
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

      eventForm.reset();
      applyScheduleToForm(eventForm, CREATE_SCHEDULE_PREFIX, state.attendanceDefaults);
      const eventIdInput = eventForm.querySelector('#event_id');
      if (eventIdInput) {
        eventIdInput.value = '';
      }
      const creatorField = eventForm.querySelector('#creator_student_id');
      if (creatorField && state.currentUser?.studentIDNumber) {
        creatorField.value = state.currentUser.studentIDNumber;
      }

      setFormStatus(statusNode, 'Event created successfully.', 'success');
      await refreshEvents(state);
    } catch (error) {
      setFormStatus(statusNode, error.message || 'Network error. Please try again.', 'error');
    }
  });
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
      <form id="editEventForm" class="attendance-card" autocomplete="off">
        <h2>Edit Event</h2>
        <label>
          Event Name
          <input type="text" name="event_name" required>
        </label>
        <div class="form-row">
          <label>
            Start Date
            <input type="date" name="start_date" required>
          </label>
          <label>
            End Date
            <input type="date" name="end_date" required>
          </label>
        </div>
        <label>
          Location
          <input type="text" name="location" required>
        </label>
        <label>
          Venue
          <input type="text" name="venue" required>
        </label>
        <div class="form-row">
          <label class="status-label" for="editEventStatus">Status</label>
          <select name="status" id="editEventStatus" class="status-select">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div id="statusHint" class="modal-hint">Archiving moves the event to Completed Events. Changing back to Active restores it to the active lists.</div>
        <label>
          Created By
          <input type="text" name="creator_account_name" readonly class="readonly-field">
        </label>
        ${buildScheduleSectionMarkup(EDIT_SCHEDULE_PREFIX, 'Reset to current default')}
        <div id="modalMsg" class="event-status"></div>
        <div class="modal-actions">
          <button type="button" id="deleteEventBtn" class="btn btn-danger">Delete Event</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
          <button type="button" id="closeEditModal" class="btn btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
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
      <form id="deleteConfirmForm" class="attendance-card" autocomplete="off">
        <h2>Delete Event</h2>
        <p class="delete-copy">Enter your password to confirm this permanent action.</p>
        <label>
          Password
          <input type="password" name="delete_password" id="delete_password" required autocomplete="current-password">
        </label>
        <div id="deleteModalMsg" class="event-status"></div>
        <div class="modal-actions">
          <button type="submit" class="btn btn-danger">Delete</button>
          <button type="button" id="cancelDeleteBtn" class="btn btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
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
  setFormStatus(message, '', 'info');

  const updateStatusHint = () => {
    statusHint.textContent = form.status.value === 'archived'
      ? 'Archiving moves this event to Completed Events. You can later restore it by switching back to Active.'
      : 'Active events stay available to CRFV operational workflows and upcoming event listings.';
  };

  form.status.onchange = updateStatusHint;
  updateStatusHint();

  form.onsubmit = async submitEvent => {
    submitEvent.preventDefault();
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
  const actionLabel = nextStatus === 'archived' ? 'archive' : 'un-archive';
  const confirmed = await window.crfvDialog.confirm(`Are you sure you want to ${actionLabel} this event?`, {
    title: 'Confirm action',
    confirmLabel: nextStatus === 'archived' ? 'Archive' : 'Un-archive',
    destructive: nextStatus === 'archived'
  });
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/events/${eventId}/status`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status !== 'success') {
      throw new Error(payload.message || payload.error || 'Failed to update event status.');
    }
    await refreshEvents(state);
  } catch (error) {
    await window.crfvDialog.alert(error.message || 'Failed to update event status.', { tone: 'error' });
  }
}

function bindGlobalModalHandlers() {
  document.addEventListener('submit', async event => {
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

      if (response.status === 409 && payload.hasAttendance) {
        const cascade = await window.crfvDialog.confirm(
          'This event has attendance records. Delete the event and all associated attendance records?',
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
    const cancelDeleteButton = event.target.closest('#cancelDeleteBtn');
    if (cancelDeleteButton) {
      document.getElementById('deleteConfirmModal').style.display = 'none';
      return;
    }

    if (event.target.classList.contains('modal-backdrop')) {
      const modal = event.target.parentElement;
      if (modal?.id === 'deleteConfirmModal' || modal?.id === 'eventEditModal') {
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
