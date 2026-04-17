const ATTENDANCE_FALLBACK_SCHEDULE = Object.freeze({
  am_in: { start: '08:00', on_time_until: '09:15' },
  am_out: { start: '11:30' },
  pm_in: { start: '12:30', on_time_until: '13:15' },
  pm_out: { start: '16:00' }
});

const input = document.getElementById('rfidInput');
const status = document.getElementById('status');
const logsDiv = document.getElementById('logs-main');
const reloadBtn = document.getElementById('reloadBtn');
const syncBtn = document.getElementById('syncBtn');
const currentEventLabel = document.getElementById('currentEventLabel');
const currentScheduleSummary = document.getElementById('currentScheduleSummary');
const helloLabel = document.getElementById('helloLabel');

const state = {
  currentEvent: null,
  attendanceSchedule: cloneSchedule(ATTENDANCE_FALLBACK_SCHEDULE),
  attendees: [],
  rfidToAttendee: {},
  offlineLogs: loadOfflineLogs()
};

window.crfvAppShell = window.crfvAppShell || {};
window.crfvAppShell.beforeLogout = async () => {
  if (state.offlineLogs.length > 0) {
    downloadOfflineLogsXlsx();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

document.addEventListener('DOMContentLoaded', () => {
  cleanupOfflineLogs();
  renderStoredOfflineLogs();
  bindStaticEventHandlers();
  updateSystemStatus(navigator.onLine);
  checkAuthAndShowModal();
  loadRegisteredList();
  focusInput();
});

window.addEventListener('load', () => {
  focusInput();
});

function cloneSchedule(schedule) {
  return JSON.parse(JSON.stringify(schedule || ATTENDANCE_FALLBACK_SCHEDULE));
}

function normalizeSchedule(schedule) {
  const source = schedule && typeof schedule === 'object' ? schedule : {};
  return {
    am_in: {
      start: source?.am_in?.start || ATTENDANCE_FALLBACK_SCHEDULE.am_in.start,
      on_time_until: source?.am_in?.on_time_until || ATTENDANCE_FALLBACK_SCHEDULE.am_in.on_time_until
    },
    am_out: {
      start: source?.am_out?.start || ATTENDANCE_FALLBACK_SCHEDULE.am_out.start
    },
    pm_in: {
      start: source?.pm_in?.start || ATTENDANCE_FALLBACK_SCHEDULE.pm_in.start,
      on_time_until: source?.pm_in?.on_time_until || ATTENDANCE_FALLBACK_SCHEDULE.pm_in.on_time_until
    },
    pm_out: {
      start: source?.pm_out?.start || ATTENDANCE_FALLBACK_SCHEDULE.pm_out.start
    }
  };
}

function timeToMinutes(value) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})/);
  if (!match) {
    return NaN;
  }
  return (Number(match[1]) * 60) + Number(match[2]);
}

function buildRecordedTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function getRecordedMinutes(value) {
  if (value instanceof Date) {
    return (value.getHours() * 60) + value.getMinutes();
  }
  return timeToMinutes(value);
}

function getSlot(recordedAt = new Date()) {
  const minutes = getRecordedMinutes(recordedAt);
  const schedule = state.attendanceSchedule;
  const amOutStart = timeToMinutes(schedule.am_out.start);
  const pmInStart = timeToMinutes(schedule.pm_in.start);
  const pmOutStart = timeToMinutes(schedule.pm_out.start);

  if (minutes < amOutStart) {
    return 'AM IN';
  }
  if (minutes < pmInStart) {
    return 'AM OUT';
  }
  if (minutes < pmOutStart) {
    return 'PM IN';
  }
  return 'PM OUT';
}

function getPunctuality(slot, recordedAt = new Date()) {
  const minutes = getRecordedMinutes(recordedAt);
  if (slot === 'AM IN') {
    const cutoff = timeToMinutes(state.attendanceSchedule.am_in.on_time_until);
    const lateMinutes = Math.max(0, minutes - cutoff);
    return {
      punctuality_status: lateMinutes > 0 ? 'late' : 'on_time',
      late_minutes: lateMinutes
    };
  }

  if (slot === 'PM IN') {
    const cutoff = timeToMinutes(state.attendanceSchedule.pm_in.on_time_until);
    const lateMinutes = Math.max(0, minutes - cutoff);
    return {
      punctuality_status: lateMinutes > 0 ? 'late' : 'on_time',
      late_minutes: lateMinutes
    };
  }

  return {
    punctuality_status: 'not_applicable',
    late_minutes: 0
  };
}

function loadOfflineLogs() {
  try {
    return JSON.parse(localStorage.getItem('offlineLogs') || '[]');
  } catch (error) {
    console.warn('Failed to parse offline logs:', error);
    return [];
  }
}

function persistOfflineLogs() {
  localStorage.setItem('offlineLogs', JSON.stringify(state.offlineLogs));
}

function cleanupOfflineLogs() {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  state.offlineLogs = state.offlineLogs.filter(entry => {
    const timestamp = new Date(entry.timestamp || entry.date || Date.now()).getTime();
    return Number.isFinite(timestamp) && timestamp > oneDayAgo;
  });
  persistOfflineLogs();
}

function removeOfflineLogById(localId) {
  state.offlineLogs = state.offlineLogs.filter(entry => entry.id !== localId);
  persistOfflineLogs();
}

function bindStaticEventHandlers() {
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      setStatus('Manual sync started...', navigator.onLine);
      await syncStoredLogs();
      focusInput();
    });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener('click', async () => {
      await loadRegisteredList();
      focusInput();
    });
  }

  if (input) {
    input.addEventListener('keydown', handleScanSubmit);
  }

  const sidebarToggle = document.querySelector('.sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const actions = document.getElementById('sidebar-actions');
      const expanded = sidebarToggle.getAttribute('aria-expanded') === 'true';
      sidebarToggle.setAttribute('aria-expanded', String(!expanded));
      actions?.classList.toggle('open');
    });
  }

  const downloadLogsBtn = document.getElementById('downloadLogsBtn');
  if (downloadLogsBtn) {
    downloadLogsBtn.addEventListener('click', async () => {
      if (!state.offlineLogs.length) {
        await window.crfvDialog.alert('No offline logs to download.', { tone: 'info' });
        return;
      }
      downloadOfflineLogsCsv();
    });
  }

  window.addEventListener('online', async () => {
    updateSystemStatus(true);
    await syncStoredLogs();
  });
  window.addEventListener('offline', () => updateSystemStatus(false));

  document.addEventListener('click', event => {
    const miniLoginModal = document.getElementById('miniLoginModal');
    if (miniLoginModal && miniLoginModal.style.display !== 'none') {
      return;
    }
    if (event.target !== input) {
      focusInput();
    }
  });

  window.addEventListener('beforeunload', event => {
    if (state.offlineLogs.length > 0) {
      downloadOfflineLogsXlsx();
      event.preventDefault();
      event.returnValue = 'You have unsynced attendance logs. They have been downloaded, but you should sync them before leaving.';
      return event.returnValue;
    }
    return undefined;
  });
}

async function loadRegisteredList() {
  setStatus('Loading registered data...', navigator.onLine);
  try {
    await loadCurrentEventAndAttendees();
  } catch (_error) {
    setStatus('Failed to load registered data.', false);
  }
}

async function loadCurrentEventAndAttendees() {
  try {
    const eventRes = await fetch('/api/attendance/latest-event', { credentials: 'same-origin' });
    const eventData = await eventRes.json().catch(() => ({}));
    if (!eventRes.ok || !eventData?.event_id) {
      throw new Error('No current event found.');
    }

    state.currentEvent = eventData;
    state.attendanceSchedule = normalizeSchedule(eventData.attendance_schedule);
    renderCurrentEvent();

    const attendeesRes = await fetch(`/api/attendance/attendees/by-event/${eventData.event_id}`, {
      credentials: 'same-origin'
    });
    const attendees = await attendeesRes.json().catch(() => []);
    if (!attendeesRes.ok || !Array.isArray(attendees)) {
      throw new Error('Failed to load attendees.');
    }

    state.attendees = attendees;
    state.rfidToAttendee = {};
    attendees.forEach(attendee => {
      if (attendee.rfid) {
        const exact = String(attendee.rfid).trim();
        state.rfidToAttendee[exact] = attendee;
        state.rfidToAttendee[stripLeadingZeros(exact)] = attendee;
      }
    });

    setStatus('Ready for next scan', navigator.onLine);
  } catch (error) {
    state.currentEvent = null;
    state.attendees = [];
    state.rfidToAttendee = {};
    state.attendanceSchedule = cloneSchedule(ATTENDANCE_FALLBACK_SCHEDULE);
    if (currentEventLabel) {
      currentEventLabel.textContent = 'No current event found.';
    }
    if (currentScheduleSummary) {
      currentScheduleSummary.innerHTML = '';
    }
    showError('Could not load event or attendee list. Please check your connection.');
    throw error;
  }
}

function renderCurrentEvent() {
  if (!state.currentEvent) {
    return;
  }

  if (currentEventLabel) {
    currentEventLabel.textContent = `${state.currentEvent.event_name} (${formatEventDate(state.currentEvent.start_date)})`;
  }

  if (currentScheduleSummary) {
    const schedule = state.attendanceSchedule;
    currentScheduleSummary.innerHTML = [
      `<span class="schedule-pill">AM IN ${schedule.am_in.start} to ${schedule.am_out.start} | On time until ${schedule.am_in.on_time_until}</span>`,
      `<span class="schedule-pill">AM OUT starts ${schedule.am_out.start}</span>`,
      `<span class="schedule-pill">PM IN ${schedule.pm_in.start} to ${schedule.pm_out.start} | On time until ${schedule.pm_in.on_time_until}</span>`,
      `<span class="schedule-pill">PM OUT starts ${schedule.pm_out.start}</span>`
    ].join('');
  }
}

function renderStoredOfflineLogs() {
  if (!logsDiv) {
    return;
  }

  logsDiv.innerHTML = '';
  state.offlineLogs
    .slice()
    .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0))
    .forEach(entry => renderLogEntry(entry, { prepend: false }));
}

function renderLogEntry(entry, { prepend = true } = {}) {
  if (!logsDiv) {
    return;
  }

  const existing = logsDiv.querySelector(`.log-entry[data-id="${entry.id}"]`);
  const logElement = document.createElement('li');
  logElement.className = `log-entry ${entry.synced ? 'logged' : 'pending'}`;
  logElement.dataset.id = entry.id;
  logElement.innerHTML = buildLogMarkup(entry);

  if (!entry.synced) {
    const retryButton = logElement.querySelector('.retry-btn');
    if (retryButton) {
      retryButton.addEventListener('click', async () => {
        await retryOfflineLog(entry.id);
      });
    }
  }

  if (existing) {
    existing.replaceWith(logElement);
  } else if (prepend) {
    logsDiv.prepend(logElement);
  } else {
    logsDiv.appendChild(logElement);
  }
}

function buildLogMarkup(entry) {
  const fullName = entry.last_name === 'unregistered'
    ? 'Unregistered ID'
    : `${entry.last_name || ''}, ${entry.first_name || ''}${entry.middle_name ? ` ${entry.middle_name}` : ''}`;
  const punctuality = getPunctualityLabel(entry);
  const syncLabel = entry.synced
    ? '<span class="pending-label sync-label synced">Synced</span>'
    : '<span class="pending-label sync-label pending">Pending sync</span><button type="button" class="retry-btn" data-id="' + entry.id + '">Retry</button>';

  return `
    <div class="log-main-row">
      <span class="log-name">${escapeHtml(fullName)}</span>
      <span class="slot-badge" data-slot="${escapeHtml(entry.slot || '')}">${escapeHtml(entry.slot || '')}</span>
      ${punctuality}
      ${syncLabel}
    </div>
    <div class="log-meta-row">
      <span class="log-time">${escapeHtml(entry.time || '')}</span>
      <span class="org">${escapeHtml(entry.organization || '')}</span>
    </div>
  `;
}

function getPunctualityLabel(entry) {
  if (entry.punctuality_status === 'late') {
    return `<span class="punctuality-label late">Late ${Number(entry.late_minutes || 0)}m</span>`;
  }
  if (entry.punctuality_status === 'on_time') {
    return '<span class="punctuality-label on-time">On time</span>';
  }
  return '';
}

async function handleScanSubmit(event) {
  if (event.key !== 'Enter' || input.disabled) {
    return;
  }

  event.preventDefault();
  if (!state.currentEvent?.event_id) {
    setStatus('No current event loaded.', false);
    return;
  }

  input.disabled = true;
  const scannedRfid = input.value.trim();
  const attendee = findAttendeeByRfid(scannedRfid);
  const now = new Date();
  const slot = getSlot(now);
  const punctuality = getPunctuality(slot, now);
  const entry = {
    id: `${scannedRfid}_${now.getTime()}`,
    rfid: scannedRfid,
    attendee_no: attendee?.attendee_no || 'unregistered',
    event_id: state.currentEvent.event_id,
    timestamp: now.toISOString(),
    status: 'present',
    slot,
    time: buildRecordedTime(now),
    date: now.toISOString().slice(0, 10),
    synced: false,
    punctuality_status: punctuality.punctuality_status,
    late_minutes: punctuality.late_minutes,
    first_name: attendee?.first_name || '',
    middle_name: attendee?.middle_name || '',
    last_name: attendee?.last_name || 'unregistered',
    organization: attendee?.organization || '',
    contact_no: attendee?.contact_no || '',
    is_unregistered: !attendee
  };

  renderLogEntry(entry);

  try {
    const payload = buildAttendancePayload(entry);
    const response = await fetch('/api/attendance', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Scan could not be saved.');
    }

    const mergedEntry = {
      ...entry,
      ...result.record,
      id: entry.id,
      synced: true,
      punctuality_status: result.record?.punctuality_status || entry.punctuality_status,
      late_minutes: Number(result.record?.late_minutes ?? entry.late_minutes)
    };
    renderLogEntry(mergedEntry);
    if (helloLabel) {
      helloLabel.textContent = attendee ? `Hello, ${attendee.first_name || attendee.attendee_no}.` : 'Unregistered attendee recorded.';
    }
    setStatus(attendee ? 'Scan recorded.' : 'Scan recorded as unregistered.', navigator.onLine);
  } catch (_error) {
    const isDuplicate = state.offlineLogs.some(log => log.rfid === entry.rfid && Math.abs(new Date(log.timestamp) - new Date(entry.timestamp)) < 60000);
    if (!isDuplicate) {
      state.offlineLogs.push(entry);
      persistOfflineLogs();
    }
    renderLogEntry(entry);
    setStatus(navigator.onLine ? 'Scan saved offline (server error).' : 'Scan saved offline (network error).', false);
  } finally {
    input.value = '';
    input.disabled = false;
    focusInput();
  }
}

function buildAttendancePayload(entry) {
  return {
    rfid: entry.rfid,
    attendee_no: entry.attendee_no,
    event_id: entry.event_id,
    status: entry.status,
    timestamp: entry.timestamp,
    time: entry.time,
    date: entry.date,
    first_name: entry.first_name,
    last_name: entry.last_name
  };
}

function findAttendeeByRfid(scannedRfid) {
  const exact = String(scannedRfid || '').trim();
  return state.rfidToAttendee[exact] || state.rfidToAttendee[stripLeadingZeros(exact)] || null;
}

async function retryOfflineLog(localId) {
  const entry = state.offlineLogs.find(item => item.id === localId);
  if (!entry) {
    return;
  }

  try {
    const response = await fetch('/api/attendance', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAttendancePayload(entry))
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Retry failed.');
    }

    removeOfflineLogById(localId);
    renderLogEntry({
      ...entry,
      ...result.record,
      id: localId,
      synced: true,
      punctuality_status: result.record?.punctuality_status || entry.punctuality_status,
      late_minutes: Number(result.record?.late_minutes ?? entry.late_minutes)
    });
    setStatus('Offline log synced.', navigator.onLine);
  } catch (_error) {
    setStatus('Retry failed. Log is still pending.', false);
  }
}

async function syncStoredLogs() {
  if (!navigator.onLine || state.offlineLogs.length === 0) {
    return;
  }

  let syncedCount = 0;
  let failedCount = 0;
  for (const entry of [...state.offlineLogs]) {
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAttendancePayload(entry))
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Sync failed.');
      }

      removeOfflineLogById(entry.id);
      renderLogEntry({
        ...entry,
        ...result.record,
        id: entry.id,
        synced: true,
        punctuality_status: result.record?.punctuality_status || entry.punctuality_status,
        late_minutes: Number(result.record?.late_minutes ?? entry.late_minutes)
      });
      syncedCount += 1;
    } catch (_error) {
      failedCount += 1;
    }
  }

  if (syncedCount > 0 && failedCount === 0) {
    setStatus(`All offline logs synced (${syncedCount}).`, true);
  } else if (syncedCount > 0) {
    setStatus(`${syncedCount} offline logs synced, ${failedCount} still pending.`, false);
  }
}

function focusInput() {
  if (input) {
    input.focus();
    input.select();
  }
}

function stripLeadingZeros(value) {
  return String(value || '').replace(/^0+/, '');
}

function setStatus(message, online = true) {
  const statusText = document.getElementById('system-status-text');
  if (statusText) {
    statusText.textContent = message;
  }
  if (status) {
    status.classList.toggle('online', online);
    status.classList.toggle('offline', !online);
  }
}

function updateSystemStatus(isOnline) {
  const indicator = document.getElementById('system-indicator');
  if (indicator) {
    indicator.className = isOnline ? 'system-online' : 'system-offline';
    indicator.innerHTML = isOnline ? '<i class="fas fa-wifi"></i>' : '<i class="fas fa-exclamation-triangle"></i>';
  }
  if (!document.getElementById('system-status-text')?.textContent) {
    setStatus(isOnline ? 'Ready for next scan' : 'Offline: logs will be saved locally', isOnline);
  }
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  if (!errorDiv) {
    return;
  }
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }, 5000);
}

function formatEventDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateString || '';
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function downloadOfflineLogsCsv() {
  const headers = [
    'RFID', 'ID Number', 'Last Name', 'First Name', 'Organization',
    'Date', 'Time', 'Slot', 'Punctuality', 'Late Minutes', 'Synced'
  ];
  const rows = state.offlineLogs.map(entry => [
    entry.rfid,
    entry.attendee_no,
    entry.last_name,
    entry.first_name,
    entry.organization,
    entry.date,
    entry.time,
    entry.slot,
    entry.punctuality_status,
    entry.late_minutes,
    entry.synced ? 'Yes' : 'No'
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'offline_attendance_logs.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadOfflineLogsXlsx() {
  if (!state.offlineLogs.length || typeof XLSX === 'undefined') {
    return;
  }
  const headers = [
    'RFID', 'ID Number', 'Last Name', 'First Name', 'Organization',
    'Date', 'Time', 'Slot', 'Punctuality', 'Late Minutes', 'Synced'
  ];
  const rows = state.offlineLogs.map(entry => [
    entry.rfid,
    entry.attendee_no,
    entry.last_name,
    entry.first_name,
    entry.organization,
    entry.date,
    entry.time,
    entry.slot,
    entry.punctuality_status,
    entry.late_minutes,
    entry.synced ? 'Yes' : 'No'
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Offline Logs');
  XLSX.writeFile(workbook, 'offline_attendance_logs.xlsx');
}

function trapFocus(modal) {
  const focusable = modal.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  modal.addEventListener('keydown', event => {
    if (event.key !== 'Tab') {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function showMiniLoginModal() {
  const modal = document.getElementById('miniLoginModal');
  if (!modal) {
    return;
  }
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  trapFocus(modal);
  setTimeout(() => document.getElementById('miniUsername')?.focus(), 50);
}

function hideMiniLoginModal() {
  const modal = document.getElementById('miniLoginModal');
  if (modal) {
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';
}

function handleMiniLogin() {
  const form = document.getElementById('miniLoginForm');
  const toggle = document.getElementById('miniTogglePassword');
  const passwordInput = document.getElementById('miniPassword');
  if (!form || !toggle || !passwordInput) {
    return;
  }

  form.onsubmit = async submitEvent => {
    submitEvent.preventDefault();
    const user = document.getElementById('miniUsername').value.trim();
    const password = passwordInput.value;
    const errorDiv = document.getElementById('miniLoginError');
    errorDiv.textContent = '';

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIDNumber: user, password })
      });
      if (response.ok) {
        window.location.reload();
        return;
      }

      const payload = await response.json().catch(() => ({}));
      errorDiv.textContent = payload.message || 'Invalid username or password.';
    } catch (_error) {
      errorDiv.textContent = 'Network error. Please try again.';
    }
  };

  toggle.onclick = () => {
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
  };
}

async function checkAuthAndShowModal() {
  try {
    const response = await fetch('/api/check-auth', { credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (data?.authenticated === true) {
      hideMiniLoginModal();
      return;
    }
  } catch (_error) {
    // Fall through to modal.
  }

  showMiniLoginModal();
  handleMiniLogin();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
