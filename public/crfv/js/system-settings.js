const {
  FALLBACK_ATTENDANCE_SCHEDULE,
  DEFAULT_TEMPLATE_TITLE,
  DEFAULT_TEMPLATE_DESCRIPTION,
  cloneSchedule,
  normalizeSchedule,
  ensureScheduleSection,
  applyScheduleToForm,
  readScheduleFromForm,
  validateSchedule,
  bindScheduleHelpTooltips
} = window.CRFVAttendanceScheduleUI;

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('attendanceDefaultsForm');
  const statusNode = document.getElementById('attendanceDefaultsStatus');

  if (!form) {
    return;
  }

  ensureScheduleSection(form, 'defaults', {
    title: DEFAULT_TEMPLATE_TITLE,
    description: DEFAULT_TEMPLATE_DESCRIPTION
  });
  bindScheduleHelpTooltips();

  const state = {
    attendanceDefaults: cloneSchedule(FALLBACK_ATTENDANCE_SCHEDULE)
  };

  await hydrateAttendanceDefaults(form, statusNode, state);

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const schedule = readScheduleFromForm(form, 'defaults');
    const errors = validateSchedule(schedule);
    if (errors.length > 0) {
      setStatus(statusNode, errors[0], 'error');
      return;
    }

    setStatus(statusNode, 'Saving default schedule...', 'info');

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
      applyScheduleToForm(form, 'defaults', state.attendanceDefaults);
      setStatus(statusNode, 'Default schedule saved.', 'success');
    } catch (error) {
      setStatus(statusNode, error.message || 'Failed to save default schedule.', 'error');
    }
  });
});

async function hydrateAttendanceDefaults(form, statusNode, state) {
  setStatus(statusNode, 'Loading default schedule...', 'info');

  try {
    const response = await fetch('/api/crfv/settings/attendance-defaults', {
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error('Failed to load default schedule.');
    }

    const payload = await response.json();
    state.attendanceDefaults = normalizeSchedule(payload.attendance_schedule);
    applyScheduleToForm(form, 'defaults', state.attendanceDefaults);
    setStatus(statusNode, 'Default schedule loaded.', 'success');
  } catch (error) {
    state.attendanceDefaults = cloneSchedule(FALLBACK_ATTENDANCE_SCHEDULE);
    applyScheduleToForm(form, 'defaults', state.attendanceDefaults);
    setStatus(statusNode, 'Using fallback default schedule.', 'error');
  }
}

function setStatus(node, message, tone = '') {
  if (!node) {
    return;
  }

  node.textContent = message || '';
  node.classList.remove('is-success', 'is-error', 'is-info');

  if (tone) {
    node.classList.add(`is-${tone}`);
  }
}
