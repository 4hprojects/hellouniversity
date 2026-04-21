function formatDDMMMYYYY(dateStr) {
  if (!dateStr) {
    return '';
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return String(dateStr);
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function compareNullableValues(left, right, ascending = true) {
  const leftValue = left ?? '';
  const rightValue = right ?? '';
  return ascending
    ? String(leftValue).localeCompare(String(rightValue))
    : String(rightValue).localeCompare(String(leftValue));
}

function paginateRows(rows, page, perPage) {
  if (perPage === 'all') {
    return rows;
  }

  const start = (page - 1) * perPage;
  return rows.slice(start, start + perPage);
}

function buildEventScopedUrl(basePath, eventId) {
  const normalizedBasePath = String(basePath || '').split('?')[0];
  const normalizedEventId = String(eventId || '').trim();
  if (!normalizedEventId) {
    return normalizedBasePath;
  }

  return `${normalizedBasePath}?event_id=${encodeURIComponent(normalizedEventId)}`;
}

function buildExportFileName(prefix, scope, eventName = '') {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const scopeLabel = scope === 'all' ? 'All' : 'Visible';
  const eventLabel = String(eventName || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_');

  return `${prefix}-${scopeLabel}-${stamp}${eventLabel ? `-${eventLabel}` : ''}.xlsx`;
}

function normalizePaymentStatusKey(status) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/recievable/g, 'receivable');
  if (normalized === 'fully paid' || normalized === 'fully_paid') {
    return 'fully_paid';
  }
  if (normalized === 'partially paid' || normalized === 'partial') {
    return 'partial';
  }
  if (
    normalized === 'accounts receivable' ||
    normalized === 'ar' ||
    !normalized
  ) {
    return 'ar';
  }
  return 'other';
}

function isAttendanceRecordUnregistered(record) {
  return (
    Boolean(record?.is_unregistered) ||
    String(record?.attendee_no || '')
      .trim()
      .toLowerCase() === 'unregistered' ||
    String(record?.raw_last_name || '')
      .trim()
      .toLowerCase() === 'unregistered'
  );
}

const state = {
  currentEventId: '',
  attendeesData: [],
  accommodationData: [],
  attendanceData: [],
  attendeesPage: 1,
  attendeesPerPage: 10,
  attendeesSort: { key: '', asc: true },
  accommodationPage: 1,
  accommodationPerPage: 10,
  accommodationSort: { key: '', asc: true },
  attendancePage: 1,
  attendancePerPage: 10,
  attendanceSort: { key: '', asc: true },
};

const refs = {
  eventFilter: document.getElementById('eventFilter'),
  attendeesTableBody: document.getElementById('attendeesTableBody'),
  accommodationTableBody: document.getElementById('accommodationTableBody'),
  attendanceTableBody: document.getElementById('attendanceTableBody'),
  loadingSpinner: document.getElementById('loadingSpinner'),
  infoModal: document.getElementById('infoModal'),
  paymentModal: document.getElementById('paymentModal'),
};

function showSpinner() {
  if (refs.loadingSpinner) {
    refs.loadingSpinner.style.display = '';
  }
}

function hideSpinner() {
  if (refs.loadingSpinner) {
    refs.loadingSpinner.style.display = 'none';
  }
}

async function ensureAuthenticated() {
  try {
    const response = await fetch('/api/check-auth', {
      credentials: 'same-origin',
    });
    const payload = await response.json().catch(() => ({}));
    if (payload?.authenticated === true) {
      return true;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }

  window.location.href = '/crfv';
  return false;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload?.message || payload?.error || 'Request failed.',
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function fetchEventsForReports() {
  const endpoints = ['/api/events/all', '/api/events'];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { credentials: 'same-origin' });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json().catch(() => ({}));
      const events = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.events)
          ? payload.events
          : [];
      if (Array.isArray(events)) {
        return events;
      }
    } catch (error) {
      console.warn(`Failed to load events from ${endpoint}.`, error);
    }
  }

  return [];
}

async function populateEventDropdown() {
  const events = await fetchEventsForReports();
  refs.eventFilter.innerHTML = '<option value="">All Events</option>';

  events.forEach((event) => {
    const option = document.createElement('option');
    option.value = event.event_id;
    option.textContent = `${event.event_name} (${formatDDMMMYYYY(event.start_date)} - ${formatDDMMMYYYY(event.end_date)})`;
    refs.eventFilter.appendChild(option);
  });
}

function getSelectedEventLabel() {
  return (
    refs.eventFilter?.options?.[refs.eventFilter.selectedIndex]?.text ||
    'All Events'
  );
}

function getActiveTab() {
  return document.querySelector('.tab-btn.active')?.dataset.tab || 'attendees';
}

function setActiveTab(tabId) {
  const targetPanel = document.getElementById(tabId);
  if (!targetPanel) {
    return false;
  }

  document.querySelectorAll('.tab-btn').forEach((button) => {
    const isActive = button.dataset.tab === tabId;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    button.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  document.querySelectorAll('.tab-content').forEach((panel) => {
    const isActive = panel.id === tabId;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  return true;
}

async function loadAllData() {
  showSpinner();

  try {
    const activeTab = getActiveTab();
    if (activeTab === 'attendees') {
      state.attendeesData = await requestJson(
        buildEventScopedUrl('/api/attendees', state.currentEventId),
      );
      renderAttendeesSection();
      return;
    }

    if (activeTab === 'accommodation') {
      state.accommodationData = await requestJson(
        buildEventScopedUrl('/api/accommodation', state.currentEventId),
      );
      renderAccommodationSection();
      return;
    }

    state.attendanceData = await requestJson(
      buildEventScopedUrl('/api/attendance', state.currentEventId),
    );
    renderAttendanceSection();
  } finally {
    hideSpinner();
  }
}

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const tabId = button.dataset.tab;
      if (!tabId || !setActiveTab(tabId)) {
        return;
      }

      await loadAllData();
    });
  });
}

function bindSearchInputs() {
  document.getElementById('searchAttendees').addEventListener('input', () => {
    state.attendeesPage = 1;
    renderAttendeesSection();
  });

  document
    .getElementById('searchAccommodation')
    .addEventListener('input', () => {
      state.accommodationPage = 1;
      renderAccommodationSection();
    });

  document.getElementById('searchAttendance').addEventListener('input', () => {
    state.attendancePage = 1;
    renderAttendanceSection();
  });
}

function bindSorting() {
  document.querySelectorAll('#attendeesTable th.sortable').forEach((header) => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      const key = header.dataset.key;
      if (state.attendeesSort.key !== key) {
        state.attendeesSort = { key, asc: true };
      } else if (state.attendeesSort.asc) {
        state.attendeesSort.asc = false;
      } else {
        state.attendeesSort = { key: '', asc: true };
      }

      state.attendeesPage = 1;
      renderAttendeesSection();
    });
  });

  document
    .querySelectorAll('#accommodationTable th.sortable')
    .forEach((header) => {
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        const key = header.dataset.key;
        if (state.accommodationSort.key !== key) {
          state.accommodationSort = { key, asc: true };
        } else if (state.accommodationSort.asc) {
          state.accommodationSort.asc = false;
        } else {
          state.accommodationSort = { key: '', asc: true };
        }

        state.accommodationPage = 1;
        renderAccommodationSection();
      });
    });

  document
    .querySelectorAll('#attendanceTable th.sortable')
    .forEach((header) => {
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        const key = header.dataset.key;
        if (state.attendanceSort.key !== key) {
          state.attendanceSort = { key, asc: true };
        } else if (state.attendanceSort.asc) {
          state.attendanceSort.asc = false;
        } else {
          state.attendanceSort = { key: '', asc: true };
        }

        state.attendancePage = 1;
        renderAttendanceSection();
      });
    });
}

function bindActions() {
  refs.attendeesTableBody?.addEventListener('click', async (event) => {
    const button = event.target.closest(
      'button[data-action][data-attendee-no]',
    );
    if (!button) {
      return;
    }

    const attendeeNo = button.dataset.attendeeNo;
    if (!attendeeNo) {
      return;
    }

    if (button.dataset.action === 'edit-info') {
      await openInfoModal(attendeeNo);
      return;
    }

    if (button.dataset.action === 'edit-payment') {
      await openPaymentModal(attendeeNo);
    }
  });
}

function bindEventFilter() {
  refs.eventFilter.addEventListener('change', async () => {
    state.currentEventId = refs.eventFilter.value;
    state.attendeesPage = 1;
    state.accommodationPage = 1;
    state.attendancePage = 1;
    await loadAllData();
  });
}

function updateSortIndicators(selector, sortState) {
  document.querySelectorAll(selector).forEach((header) => {
    const baseLabel = header.textContent.replace(/[\u25B2\u25BC]/g, '').trim();
    header.textContent = baseLabel;
    if (sortState.key === header.dataset.key) {
      header.innerHTML += sortState.asc ? ' &#9650;' : ' &#9660;';
    }
  });
}

function updateDashboardLabel(labelId, eventName, totalResults) {
  const labelNode = document.getElementById(labelId);
  if (!labelNode) {
    return;
  }

  labelNode.innerHTML = `<i class="fas fa-info-circle" style="color:#3498db;margin-right:0.5em;"></i>
    Event: <br>&nbsp;&nbsp;<span style="font-weight:600; font-size:1.3em;">${escapeHtml(eventName || 'All Events')}</span>
    &nbsp;<br>&nbsp; Search Results: <span style="font-weight:600">${escapeHtml(totalResults)}</span>`;
}

function getFilteredAttendeesRows() {
  const query = document
    .getElementById('searchAttendees')
    .value.trim()
    .toLowerCase();
  const filtered = state.attendeesData.filter((attendee) => {
    return Object.values(attendee || {})
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  if (!state.attendeesSort.key) {
    return filtered;
  }

  return filtered.sort((left, right) => {
    return compareNullableValues(
      left[state.attendeesSort.key],
      right[state.attendeesSort.key],
      state.attendeesSort.asc,
    );
  });
}

function getVisibleAttendeesRows(filteredRows = getFilteredAttendeesRows()) {
  const totalPages =
    state.attendeesPerPage === 'all'
      ? 1
      : Math.max(1, Math.ceil(filteredRows.length / state.attendeesPerPage));
  state.attendeesPage = Math.min(state.attendeesPage, totalPages);
  return paginateRows(
    filteredRows,
    state.attendeesPage,
    state.attendeesPerPage,
  );
}

function renderAttendeesTable(rows) {
  refs.attendeesTableBody.innerHTML = rows
    .map(
      (attendee) => `
    <tr>
      <td>${escapeHtml(attendee.attendee_no)}</td>
      <td>${escapeHtml(attendee.last_name)}</td>
      <td>${escapeHtml(attendee.first_name)}</td>
      <td>${escapeHtml(attendee.organization)}</td>
      <td>${escapeHtml(attendee.rfid)}</td>
      <td>${escapeHtml(attendee.confirmation_code)}</td>
      <td>${escapeHtml(attendee.payment_status || 'Accounts Receivable')}</td>
      <td>${escapeHtml(attendee.att_status)}</td>
      <td>
        <button type="button" class="btn btn-info" data-action="edit-info" data-attendee-no="${escapeAttribute(attendee.attendee_no)}">Edit Info</button>
        <button type="button" class="btn btn-payment" data-action="edit-payment" data-attendee-no="${escapeAttribute(attendee.attendee_no)}">Edit Payment</button>
      </td>
    </tr>
  `,
    )
    .join('');
}

function renderAttendeesPagination(total) {
  const pages =
    state.attendeesPerPage === 'all'
      ? 1
      : Math.max(1, Math.ceil(total / state.attendeesPerPage));
  const pagination = document.getElementById('attendeesPagination');
  pagination.innerHTML = `
    <label>Show
      <select id="attendeesPerPage">
        <option value="10" ${state.attendeesPerPage === 10 ? 'selected' : ''}>10</option>
        <option value="25" ${state.attendeesPerPage === 25 ? 'selected' : ''}>25</option>
        <option value="50" ${state.attendeesPerPage === 50 ? 'selected' : ''}>50</option>
        <option value="100" ${state.attendeesPerPage === 100 ? 'selected' : ''}>100</option>
        <option value="all" ${state.attendeesPerPage === 'all' ? 'selected' : ''}>All</option>
      </select>
    </label>
    <span>Page ${state.attendeesPage} of ${pages}</span>
    <button id="attendeesPrev" ${state.attendeesPage <= 1 ? 'disabled' : ''}>&lt; Prev</button>
    <button id="attendeesNext" ${state.attendeesPage >= pages ? 'disabled' : ''}>Next &gt;</button>
  `;

  document.getElementById('attendeesPerPage').onchange = (event) => {
    state.attendeesPerPage =
      event.target.value === 'all' ? 'all' : Number(event.target.value);
    state.attendeesPage = 1;
    renderAttendeesSection();
  };
  document.getElementById('attendeesPrev').onclick = () => {
    if (state.attendeesPage > 1) {
      state.attendeesPage -= 1;
      renderAttendeesSection();
    }
  };
  document.getElementById('attendeesNext').onclick = () => {
    if (state.attendeesPage < pages) {
      state.attendeesPage += 1;
      renderAttendeesSection();
    }
  };
}

function updateAttendeeCounters(rows) {
  const counts = {
    pending: 0,
    confirmed: 0,
    registrationOthers: 0,
    fullyPaid: 0,
    partial: 0,
    ar: 0,
    paymentOthers: 0,
  };

  rows.forEach((attendee) => {
    const attendanceStatus = String(attendee?.att_status || '')
      .trim()
      .toLowerCase();
    if (attendanceStatus === 'pending') {
      counts.pending += 1;
    } else if (attendanceStatus === 'confirmed') {
      counts.confirmed += 1;
    } else if (attendanceStatus) {
      counts.registrationOthers += 1;
    }

    const paymentStatus = normalizePaymentStatusKey(attendee?.payment_status);
    if (paymentStatus === 'fully_paid') {
      counts.fullyPaid += 1;
    } else if (paymentStatus === 'partial') {
      counts.partial += 1;
    } else if (paymentStatus === 'ar') {
      counts.ar += 1;
    } else {
      counts.paymentOthers += 1;
    }
  });

  const setCounter = (id, value) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  };

  setCounter('countTotal', rows.length);
  setCounter('countPending', counts.pending);
  setCounter('countConfirmed', counts.confirmed);
  setCounter('countAttOthers', counts.registrationOthers);
  setCounter('countFullyPaid', counts.fullyPaid);
  setCounter('countPartial', counts.partial);
  setCounter('countAR', counts.ar);
  setCounter('countOthers', counts.paymentOthers);
}

function renderAttendeesSection() {
  const filtered = getFilteredAttendeesRows();
  renderAttendeesTable(getVisibleAttendeesRows(filtered));
  renderAttendeesPagination(filtered.length);
  updateAttendeeCounters(filtered);
  updateDashboardLabel(
    'dashboardLabel',
    getSelectedEventLabel(),
    filtered.length,
  );
  updateSortIndicators('#attendeesTable th.sortable', state.attendeesSort);
}

function getFilteredAccommodationRows() {
  const query = document
    .getElementById('searchAccommodation')
    .value.trim()
    .toLowerCase();
  const filtered = state.accommodationData.filter((row) => {
    return [
      row.first_name,
      row.last_name,
      row.organization,
      row.accommodation,
      row.event_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  if (!state.accommodationSort.key) {
    return filtered;
  }

  return filtered.sort((left, right) => {
    return compareNullableValues(
      left[state.accommodationSort.key],
      right[state.accommodationSort.key],
      state.accommodationSort.asc,
    );
  });
}

function getVisibleAccommodationRows(
  filteredRows = getFilteredAccommodationRows(),
) {
  const totalPages =
    state.accommodationPerPage === 'all'
      ? 1
      : Math.max(
          1,
          Math.ceil(filteredRows.length / state.accommodationPerPage),
        );
  state.accommodationPage = Math.min(state.accommodationPage, totalPages);
  return paginateRows(
    filteredRows,
    state.accommodationPage,
    state.accommodationPerPage,
  );
}

function renderAccommodationTable(rows) {
  refs.accommodationTableBody.innerHTML = rows
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.last_name)}</td>
      <td>${escapeHtml(row.first_name)}</td>
      <td>${escapeHtml(row.organization)}</td>
      <td>${escapeHtml(row.accommodation)}</td>
      <td>${escapeHtml(row.event_name)}</td>
    </tr>
  `,
    )
    .join('');
}

function renderAccommodationPagination(total) {
  const pages =
    state.accommodationPerPage === 'all'
      ? 1
      : Math.max(1, Math.ceil(total / state.accommodationPerPage));
  const pagination = document.getElementById('accommodationPagination');
  pagination.innerHTML = `
    <label>Show
      <select id="accommodationPerPage">
        <option value="10" ${state.accommodationPerPage === 10 ? 'selected' : ''}>10</option>
        <option value="25" ${state.accommodationPerPage === 25 ? 'selected' : ''}>25</option>
        <option value="50" ${state.accommodationPerPage === 50 ? 'selected' : ''}>50</option>
        <option value="100" ${state.accommodationPerPage === 100 ? 'selected' : ''}>100</option>
        <option value="all" ${state.accommodationPerPage === 'all' ? 'selected' : ''}>All</option>
      </select>
    </label>
    <span>Page ${state.accommodationPage} of ${pages}</span>
    <button id="accommodationPrev" ${state.accommodationPage <= 1 ? 'disabled' : ''}>&lt; Prev</button>
    <button id="accommodationNext" ${state.accommodationPage >= pages ? 'disabled' : ''}>Next &gt;</button>
  `;

  document.getElementById('accommodationPerPage').onchange = (event) => {
    state.accommodationPerPage =
      event.target.value === 'all' ? 'all' : Number(event.target.value);
    state.accommodationPage = 1;
    renderAccommodationSection();
  };
  document.getElementById('accommodationPrev').onclick = () => {
    if (state.accommodationPage > 1) {
      state.accommodationPage -= 1;
      renderAccommodationSection();
    }
  };
  document.getElementById('accommodationNext').onclick = () => {
    if (state.accommodationPage < pages) {
      state.accommodationPage += 1;
      renderAccommodationSection();
    }
  };
}

function updateAccommodationCounters(rows) {
  const counts = {
    virtual: 0,
    liveOut: 0,
    quad: 0,
    triple: 0,
    double: 0,
    single: 0,
    others: 0,
  };

  rows.forEach((row) => {
    const accommodation = String(row?.accommodation || '')
      .trim()
      .toLowerCase();
    if (accommodation === 'online / virtual' || accommodation === 'virtual') {
      counts.virtual += 1;
    } else if (accommodation === 'live-out' || accommodation === 'liveout') {
      counts.liveOut += 1;
    } else if (accommodation === 'fb quad' || accommodation === 'quad') {
      counts.quad += 1;
    } else if (accommodation === 'fb triple' || accommodation === 'triple') {
      counts.triple += 1;
    } else if (accommodation === 'fb double' || accommodation === 'double') {
      counts.double += 1;
    } else if (accommodation === 'fb single' || accommodation === 'single') {
      counts.single += 1;
    } else {
      counts.others += 1;
    }
  });

  const setCounter = (id, value) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  };

  setCounter('countVirtual', counts.virtual);
  setCounter('countLiveOut', counts.liveOut);
  setCounter('countQuad', counts.quad);
  setCounter('countTriple', counts.triple);
  setCounter('countDouble', counts.double);
  setCounter('countSingle', counts.single);
  setCounter('countAccOthers', counts.others);
  setCounter(
    'countStayIn',
    counts.quad + counts.triple + counts.double + counts.single,
  );
}

function renderAccommodationSection() {
  const filtered = getFilteredAccommodationRows();
  renderAccommodationTable(getVisibleAccommodationRows(filtered));
  renderAccommodationPagination(filtered.length);
  updateAccommodationCounters(filtered);
  updateDashboardLabel(
    'accommodationLabel',
    getSelectedEventLabel(),
    filtered.length,
  );
  updateSortIndicators(
    '#accommodationTable th.sortable',
    state.accommodationSort,
  );
}

function getFilteredAttendanceRows() {
  const query = document
    .getElementById('searchAttendance')
    .value.trim()
    .toLowerCase();
  const filtered = state.attendanceData.filter((record) => {
    return [
      record.date,
      record.time,
      record.raw_last_name,
      record.raw_first_name,
      record.raw_rfid,
      record.slot,
      record.punctuality_status,
      record.late_minutes,
      record.event_id,
    ]
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  if (!state.attendanceSort.key) {
    return filtered;
  }

  return filtered.sort((left, right) => {
    return compareNullableValues(
      left[state.attendanceSort.key],
      right[state.attendanceSort.key],
      state.attendanceSort.asc,
    );
  });
}

function getVisibleAttendanceRows(filteredRows = getFilteredAttendanceRows()) {
  const totalPages =
    state.attendancePerPage === 'all'
      ? 1
      : Math.max(1, Math.ceil(filteredRows.length / state.attendancePerPage));
  state.attendancePage = Math.min(state.attendancePage, totalPages);
  return paginateRows(
    filteredRows,
    state.attendancePage,
    state.attendancePerPage,
  );
}

function renderAttendanceTable(rows) {
  refs.attendanceTableBody.innerHTML = rows
    .map(
      (record) => `
    <tr>
      <td>${escapeHtml(formatDDMMMYYYY(record.date))}</td>
      <td>${escapeHtml(record.time)}</td>
      <td>${escapeHtml(record.raw_last_name)}</td>
      <td>${escapeHtml(record.raw_first_name)}</td>
      <td>${escapeHtml(record.raw_rfid)}</td>
      <td>${escapeHtml(record.slot)}</td>
      <td>${escapeHtml(record.punctuality_status)}</td>
      <td>${escapeHtml(record.late_minutes ?? '')}</td>
      <td>${escapeHtml(record.event_id)}</td>
    </tr>
  `,
    )
    .join('');
}

function renderAttendancePagination(total) {
  const pages =
    state.attendancePerPage === 'all'
      ? 1
      : Math.max(1, Math.ceil(total / state.attendancePerPage));
  const pagination = document.getElementById('attendancePagination');
  pagination.innerHTML = `
    <label>Show
      <select id="attendancePerPage">
        <option value="10" ${state.attendancePerPage === 10 ? 'selected' : ''}>10</option>
        <option value="25" ${state.attendancePerPage === 25 ? 'selected' : ''}>25</option>
        <option value="50" ${state.attendancePerPage === 50 ? 'selected' : ''}>50</option>
        <option value="100" ${state.attendancePerPage === 100 ? 'selected' : ''}>100</option>
        <option value="all" ${state.attendancePerPage === 'all' ? 'selected' : ''}>All</option>
      </select>
    </label>
    <span>Page ${state.attendancePage} of ${pages}</span>
    <button id="attendancePrev" ${state.attendancePage <= 1 ? 'disabled' : ''}>&lt; Prev</button>
    <button id="attendanceNext" ${state.attendancePage >= pages ? 'disabled' : ''}>Next &gt;</button>
  `;

  document.getElementById('attendancePerPage').onchange = (event) => {
    state.attendancePerPage =
      event.target.value === 'all' ? 'all' : Number(event.target.value);
    state.attendancePage = 1;
    renderAttendanceSection();
  };
  document.getElementById('attendancePrev').onclick = () => {
    if (state.attendancePage > 1) {
      state.attendancePage -= 1;
      renderAttendanceSection();
    }
  };
  document.getElementById('attendanceNext').onclick = () => {
    if (state.attendancePage < pages) {
      state.attendancePage += 1;
      renderAttendanceSection();
    }
  };
}

function updateAttendanceCounters(rows) {
  const counts = {
    amIn: 0,
    amOut: 0,
    pmIn: 0,
    pmOut: 0,
    registered: 0,
    unregistered: 0,
    amInOnTime: 0,
    amInLate: 0,
    pmInOnTime: 0,
    pmInLate: 0,
  };

  rows.forEach((record) => {
    const slot = String(record?.slot || '')
      .trim()
      .toUpperCase();
    const punctuality = String(record?.punctuality_status || '')
      .trim()
      .toLowerCase();
    const unregistered = isAttendanceRecordUnregistered(record);

    if (slot === 'AM IN') {
      counts.amIn += 1;
      if (punctuality === 'on_time') {
        counts.amInOnTime += 1;
      } else if (punctuality === 'late') {
        counts.amInLate += 1;
      }
    } else if (slot === 'AM OUT') {
      counts.amOut += 1;
    } else if (slot === 'PM IN') {
      counts.pmIn += 1;
      if (punctuality === 'on_time') {
        counts.pmInOnTime += 1;
      } else if (punctuality === 'late') {
        counts.pmInLate += 1;
      }
    } else if (slot === 'PM OUT') {
      counts.pmOut += 1;
    }

    if (unregistered) {
      counts.unregistered += 1;
    } else {
      counts.registered += 1;
    }
  });

  const setCounter = (id, value) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  };

  setCounter('countAMIn', counts.amIn);
  setCounter('countAMOut', counts.amOut);
  setCounter('countPMIn', counts.pmIn);
  setCounter('countPMOut', counts.pmOut);
  setCounter('countRegistered', counts.registered);
  setCounter('countUnregistered', counts.unregistered);
  setCounter('countAMInOnTime', counts.amInOnTime);
  setCounter('countAMInLate', counts.amInLate);
  setCounter('countPMInOnTime', counts.pmInOnTime);
  setCounter('countPMInLate', counts.pmInLate);
}

function renderAttendanceSection() {
  const filtered = getFilteredAttendanceRows();
  renderAttendanceTable(getVisibleAttendanceRows(filtered));
  renderAttendancePagination(filtered.length);
  updateAttendanceCounters(filtered);
  updateDashboardLabel(
    'attendanceLabel',
    getSelectedEventLabel(),
    filtered.length,
  );
  updateSortIndicators('#attendanceTable th.sortable', state.attendanceSort);
}

function closeInfoModal() {
  if (refs.infoModal) {
    refs.infoModal.style.display = 'none';
  }
}

function closePaymentModal() {
  if (refs.paymentModal) {
    refs.paymentModal.style.display = 'none';
  }
}

function getKnownFormOfPaymentValue(value) {
  const knownValues = new Set([
    'Cash',
    'Check',
    'Cash Deposit',
    'Check Deposit',
    'ADA/LDDAP',
    'Bank Transfer',
    'Others',
  ]);
  const normalized = String(value || '').trim();
  return knownValues.has(normalized) ? normalized : normalized ? 'Others' : '';
}

function getCustomFormOfPaymentValue(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  return getKnownFormOfPaymentValue(normalized) === 'Others' ? normalized : '';
}

async function openInfoModal(attendeeNo) {
  showSpinner();

  try {
    const attendee = await requestJson(
      `/api/attendees/${encodeURIComponent(attendeeNo)}`,
    );
    refs.infoModal.querySelector('.modal-content').innerHTML = `
      <h3>Edit Attendee Info</h3>
      <form id="infoForm" class="modal-form-grid">
        <div class="section-title" style="grid-column: 1 / -1; display: flex; align-items: center;">
          <span>System Info</span>
          <span style="flex:1"></span>
          <span style="font-weight: normal; font-size: 1rem; color: #444;">
            Attendee No: <input type="text" name="attendee_no" value="${escapeAttribute(attendee.attendee_no)}" readonly>
          </span>
        </div>
        <label>Confirmation Code
          <input type="text" name="confirmation_code" value="${escapeAttribute(attendee.confirmation_code)}" readonly>
        </label>
        <label>Attendance Status
          <select name="att_status" required>
            ${[
              'Pending',
              'Confirmed',
              'Cancelled',
              'No Show',
              'Checked In',
              'Walk In',
              'Excused',
              'Left Early',
              'Invalid',
            ]
              .map((status) => {
                const selected =
                  attendee.att_status === status ? 'selected' : '';
                return `<option value="${escapeAttribute(status)}" ${selected}>${escapeHtml(status)}</option>`;
              })
              .join('')}
          </select>
        </label>
        <label>Event ID <span>*</span>
          <input type="text" name="event_id" value="${escapeAttribute(attendee.event_id)}" required readonly>
        </label>
        <label class="highlighted"><b>RFID <span>*</span></b>
          <input type="text" name="rfid" value="${escapeAttribute(attendee.rfid)}" required autofocus>
        </label>

        <div class="section-title" style="grid-column: 1 / -1;">Personal Info</div>
        <label>First Name <span>*</span>
          <input type="text" name="first_name" value="${escapeAttribute(attendee.first_name)}" required>
        </label>
        <label>Middle Name
          <input type="text" name="middle_name" value="${escapeAttribute(attendee.middle_name)}">
        </label>
        <label>Last Name <span>*</span>
          <input type="text" name="last_name" value="${escapeAttribute(attendee.last_name)}" required>
        </label>
        <label>Contact No
          <input type="text" name="contact_no" value="${escapeAttribute(attendee.contact_no)}">
        </label>
        <label>Email
          <input type="email" name="email" value="${escapeAttribute(attendee.email)}">
        </label>
        <label>Gender <span>*</span>
          <select name="gender" required>
            <option value="">Select</option>
            <option value="Male" ${attendee.gender === 'Male' ? 'selected' : ''}>Male</option>
            <option value="Female" ${attendee.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other" ${attendee.gender === 'Other' ? 'selected' : ''}>Prefer not to say</option>
          </select>
        </label>
        <label>Certificate Name
          <input type="text" name="certificate_name" value="${escapeAttribute(attendee.certificate_name)}">
        </label>
        <label>Organization <span>*</span>
          <input type="text" name="organization" value="${escapeAttribute(attendee.organization)}" required>
        </label>
        <label>Designation <span>*</span>
          <input type="text" name="designation" value="${escapeAttribute(attendee.designation)}" required>
        </label>

        <div class="section-title" style="grid-column: 1 / -1;">Accommodation Info</div>
        <label>Accommodation <span>*</span>
          <select name="accommodation" required>
            <option value="">Select</option>
            ${[
              'Online / Virtual',
              'Live-Out',
              'FB Quad',
              'FB Triple',
              'FB Double',
              'FB Single',
              'Others',
            ]
              .map((value) => {
                return `<option value="${escapeAttribute(value)}" ${attendee.accommodation === value ? 'selected' : ''}>${escapeHtml(value)}</option>`;
              })
              .join('')}
          </select>
        </label>
        <label>Accommodation (Other)
          <input type="text" name="accommodation_other" value="${escapeAttribute(attendee.accommodation_other)}">
        </label>
        <div></div>
        <div></div>

        <div class="modal-actions full-row" style="grid-column: 1 / -1;">
          <button type="button" class="btn btn-cancel">Cancel</button>
          <button type="submit" class="btn btn-save-exit">Save</button>
        </div>
      </form>
    `;

    refs.infoModal.style.display = 'flex';

    const form = document.getElementById('infoForm');
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (
        !(await window.crfvDialog.confirm(
          'Are you sure you want to save changes?',
          {
            title: 'Confirm action',
            confirmLabel: 'Save',
          },
        ))
      ) {
        return;
      }

      const payload = {
        attendee_no: form.attendee_no.value,
        confirmation_code: form.confirmation_code.value,
        rfid: form.rfid.value,
        first_name: form.first_name.value,
        middle_name: form.middle_name.value,
        last_name: form.last_name.value,
        email: form.email.value,
        contact_no: form.contact_no.value,
        organization: form.organization.value,
        event_id: form.event_id.value,
        gender: form.gender.value,
        designation: form.designation.value,
        accommodation: form.accommodation.value,
        accommodation_other: form.accommodation_other.value,
        certificate_name: form.certificate_name.value,
        att_status: form.att_status.value,
      };

      await window.CRFVApi.request(
        `/api/attendees/${encodeURIComponent(attendeeNo)}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
      );

      await loadAllData();
      closeInfoModal();
    };

    form.querySelector('.btn-cancel').onclick = async () => {
      if (
        await window.crfvDialog.confirm('Discard unsaved attendee changes?', {
          title: 'Discard changes?',
          confirmLabel: 'Discard',
          destructive: true,
        })
      ) {
        closeInfoModal();
      }
    };
  } catch (_error) {
    await window.crfvDialog.alert('Failed to load attendee info.', {
      tone: 'error',
    });
  } finally {
    hideSpinner();
  }
}

function buildPaymentPayload(form, attendeeNo) {
  const selectedFormOfPayment = form.form_of_payment.value;
  const otherValue = form.form_of_payment_other?.value?.trim() || '';

  return {
    attendee_no: attendeeNo,
    payment_status: form.payment_status.value,
    amount: form.amount.value,
    form_of_payment:
      selectedFormOfPayment === 'Others' ? otherValue : selectedFormOfPayment,
    date_full_payment: form.date_full_payment.value || null,
    date_partial_payment: form.date_partial_payment.value || null,
    account: form.account.value,
    or_number: form.or_number.value,
    quickbooks_no: form.quickbooks_no.value,
    shipping_tracking_no: form.shipping_tracking_no.value,
    notes: form.notes.value,
  };
}

function bindFormOfPaymentControl(selectNode, otherInputNode) {
  if (!selectNode || !otherInputNode) {
    return;
  }

  const updateVisibility = () => {
    if (selectNode.value === 'Others') {
      otherInputNode.style.display = 'inline-block';
    } else {
      otherInputNode.style.display = 'none';
      otherInputNode.value = '';
    }
  };

  selectNode.addEventListener('change', updateVisibility);
  updateVisibility();
}

async function openPaymentModal(attendeeNo) {
  showSpinner();

  try {
    const payments = await requestJson(
      `/api/payments/${encodeURIComponent(attendeeNo)}`,
    );
    const modalContent = refs.paymentModal.querySelector('.modal-content');

    if (!payments.length) {
      modalContent.innerHTML = `
        <h3>Add Payment Record</h3>
        <form id="addPaymentForm">
          <div class="modal-form-grid">
            <label>Payment Status *</label>
            <select class="field" id="payment_status" name="payment_status" required>
              ${[
                'Accounts Receivable',
                'Fully Paid',
                'Partially Paid',
                'Scholar',
                'Others',
              ]
                .map((status) => {
                  return `<option value="${escapeAttribute(status)}" ${status === 'Accounts Receivable' ? 'selected' : ''}>${escapeHtml(status)}</option>`;
                })
                .join('')}
            </select>

            <label>Amount *</label>
            <input class="field" id="amount" name="amount" type="number" step="0.01" required>

            <label>Form of Payment *</label>
            <div class="field" style="display:flex;gap:8px;">
              <select class="form-of-payment-select" id="form_of_payment" name="form_of_payment" style="flex:1;" required>
                <option value="">Select</option>
                ${[
                  'Cash',
                  'Check',
                  'Cash Deposit',
                  'Check Deposit',
                  'ADA/LDDAP',
                  'Bank Transfer',
                  'Others',
                ]
                  .map((value) => {
                    return `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`;
                  })
                  .join('')}
              </select>
              <input type="text" name="form_of_payment_other" class="form-of-payment-other" placeholder="Please specify" style="display:none;flex:1;">
            </div>

            <label>Date Full Payment</label>
            <input class="field" id="date_full_payment" name="date_full_payment" type="date">

            <label>Date Partial Payment</label>
            <input class="field" id="date_partial_payment" name="date_partial_payment" type="date">

            <label>Account</label>
            <input class="field" id="account" name="account" type="text">

            <label>OR Number *</label>
            <input class="field" id="or_number" name="or_number" type="text" required>

            <label>QuickBooks No</label>
            <input class="field" id="quickbooks_no" name="quickbooks_no" type="text">

            <label>Shipping Tracking No</label>
            <input class="field" id="shipping_tracking_no" name="shipping_tracking_no" type="text">

            <label class="notes-label">Notes</label>
            <textarea class="field notes-field" id="notes" name="notes" rows="2"></textarea>

            <div class="modal-actions full-row" style="grid-column: 1 / -1;">
              <button type="button" class="btn btn-cancel" id="cancelPaymentBtn">Cancel</button>
              <button type="submit" class="btn btn-save-exit">Save and Exit</button>
            </div>
            <div id="paymentFormError" style="color:red;display:none;margin-top:8px;"></div>
          </div>
        </form>
      `;

      refs.paymentModal.style.display = 'flex';

      const addForm = document.getElementById('addPaymentForm');
      const selectNode = addForm.querySelector('.form-of-payment-select');
      const otherInputNode = addForm.querySelector('.form-of-payment-other');
      bindFormOfPaymentControl(selectNode, otherInputNode);
      addForm.querySelector('#date_full_payment').value = new Date()
        .toISOString()
        .slice(0, 10);

      addForm.onsubmit = async (event) => {
        event.preventDefault();
        const errorNode = addForm.querySelector('#paymentFormError');
        errorNode.style.display = 'none';

        if (selectNode.value === 'Others' && !otherInputNode.value.trim()) {
          errorNode.textContent = 'Please specify the form of payment.';
          errorNode.style.display = '';
          otherInputNode.focus();
          return;
        }

        const payload = buildPaymentPayload(addForm, attendeeNo);
        const submitButton = addForm.querySelector('.btn-save-exit');
        submitButton.disabled = true;

        try {
          const response = await window.CRFVApi.request('/api/payments', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            throw new Error('Failed to save payment.');
          }

          await loadAllData();
          closePaymentModal();
        } catch (error) {
          errorNode.textContent = error.message || 'Failed to save payment.';
          errorNode.style.display = '';
        } finally {
          submitButton.disabled = false;
        }
      };

      addForm.querySelector('#cancelPaymentBtn').onclick = async () => {
        if (
          await window.crfvDialog.confirm('Discard this payment record?', {
            title: 'Discard changes?',
            confirmLabel: 'Discard',
            destructive: true,
          })
        ) {
          closePaymentModal();
        }
      };

      return;
    }

    modalContent.innerHTML = `
      <h3>Edit Payment Record${payments.length > 1 ? 's' : ''}</h3>
      <div>
        ${payments
          .map((payment) => {
            const selectValue = getKnownFormOfPaymentValue(
              payment.form_of_payment,
            );
            const otherValue = getCustomFormOfPaymentValue(
              payment.form_of_payment,
            );
            return `
            <form class="paymentForm modal-form-grid" data-id="${escapeAttribute(payment.payment_id)}">
              <label>Status *</label>
              <select name="payment_status" class="field" required>
                ${[
                  'Accounts Receivable',
                  'Fully Paid',
                  'Partially Paid',
                  'Scholar',
                  'Others',
                ]
                  .map((status) => {
                    return `<option value="${escapeAttribute(status)}" ${payment.payment_status === status ? 'selected' : ''}>${escapeHtml(status)}</option>`;
                  })
                  .join('')}
              </select>
              <label>Form of Payment *</label>
              <div class="field" style="display:flex;gap:8px;">
                <select name="form_of_payment" class="form-of-payment-select" required>
                  <option value="">Select</option>
                  ${[
                    'Cash',
                    'Check',
                    'Cash Deposit',
                    'Check Deposit',
                    'ADA/LDDAP',
                    'Bank Transfer',
                    'Others',
                  ]
                    .map((value) => {
                      return `<option value="${escapeAttribute(value)}" ${selectValue === value ? 'selected' : ''}>${escapeHtml(value)}</option>`;
                    })
                    .join('')}
                </select>
                <input type="text" name="form_of_payment_other" class="form-of-payment-other" placeholder="Please specify" style="display:${selectValue === 'Others' ? 'inline-block' : 'none'};flex:1;" value="${escapeAttribute(otherValue)}">
              </div>
              <label>Date Full Payment</label>
              <input type="date" name="date_full_payment" class="field" value="${escapeAttribute(payment.date_full_payment ? String(payment.date_full_payment).substring(0, 10) : '')}">
              <label>Amount *</label>
              <input type="number" name="amount" class="field" value="${escapeAttribute(payment.amount)}" min="0" step="0.01" required>
              <label>Date Partial Payment</label>
              <input type="date" name="date_partial_payment" class="field" value="${escapeAttribute(payment.date_partial_payment ? String(payment.date_partial_payment).substring(0, 10) : '')}">
              <label>OR Number *</label>
              <input type="text" name="or_number" class="field" value="${escapeAttribute(payment.or_number)}" required>
              <label>Account</label>
              <input type="text" name="account" class="field" value="${escapeAttribute(payment.account)}">
              <label>QuickBooks No</label>
              <input type="text" name="quickbooks_no" class="field" value="${escapeAttribute(payment.quickbooks_no)}">
              <label>Shipping Tracking No</label>
              <input type="text" name="shipping_tracking_no" class="field" value="${escapeAttribute(payment.shipping_tracking_no)}">
              <label class="notes-label">Notes</label>
              <textarea name="notes" class="field notes-field" rows="2">${escapeHtml(payment.notes)}</textarea>
              <div class="modal-actions full-row">
                <button type="button" class="btn btn-cancel">Cancel</button>
                <button type="submit" class="btn btn-save-exit">Save</button>
              </div>
              <div class="paymentFormError" style="color:red;display:none;margin-top:8px;"></div>
            </form>
          `;
          })
          .join('<hr>')}
      </div>
    `;

    refs.paymentModal.style.display = 'flex';

    modalContent.querySelectorAll('.paymentForm').forEach((form) => {
      const selectNode = form.querySelector('.form-of-payment-select');
      const otherInputNode = form.querySelector('.form-of-payment-other');
      bindFormOfPaymentControl(selectNode, otherInputNode);

      form.onsubmit = async (event) => {
        event.preventDefault();
        if (
          !(await window.crfvDialog.confirm('Save payment changes?', {
            title: 'Confirm action',
            confirmLabel: 'Save',
          }))
        ) {
          return;
        }

        const errorNode = form.querySelector('.paymentFormError');
        errorNode.style.display = 'none';

        if (selectNode.value === 'Others' && !otherInputNode.value.trim()) {
          errorNode.textContent = 'Please specify the form of payment.';
          errorNode.style.display = '';
          otherInputNode.focus();
          return;
        }

        const paymentId = form.getAttribute('data-id');
        const submitButton = form.querySelector('.btn-save-exit');
        submitButton.disabled = true;

        try {
          const response = await window.CRFVApi.request(
            `/api/payments/${encodeURIComponent(paymentId)}`,
            {
              method: 'PUT',
              body: JSON.stringify(buildPaymentPayload(form, attendeeNo)),
            },
          );

          if (!response.ok) {
            throw new Error('Failed to save payment.');
          }

          await loadAllData();
          closePaymentModal();
        } catch (error) {
          errorNode.textContent = error.message || 'Failed to save payment.';
          errorNode.style.display = '';
        } finally {
          submitButton.disabled = false;
        }
      };

      form.querySelector('.btn-cancel').onclick = async (event) => {
        event.preventDefault();
        if (
          await window.crfvDialog.confirm('Discard payment changes?', {
            title: 'Discard changes?',
            confirmLabel: 'Discard',
            destructive: true,
          })
        ) {
          closePaymentModal();
        }
      };
    });
  } catch (_error) {
    await window.crfvDialog.alert('Failed to load payment info.', {
      tone: 'error',
    });
  } finally {
    hideSpinner();
  }
}

function getAttendeesCounters() {
  return {
    'Total Registrants':
      document.getElementById('countTotal')?.textContent || '',
    Confirmed: document.getElementById('countConfirmed')?.textContent || '',
    Pending: document.getElementById('countPending')?.textContent || '',
    'Others (Reg)':
      document.getElementById('countAttOthers')?.textContent || '',
    'Fully Paid': document.getElementById('countFullyPaid')?.textContent || '',
    'Partially Paid':
      document.getElementById('countPartial')?.textContent || '',
    'Accounts Receivable':
      document.getElementById('countAR')?.textContent || '',
    'Others (Payment)':
      document.getElementById('countOthers')?.textContent || '',
  };
}

function getAccommodationCounters() {
  return {
    'Online / Virtual':
      document.getElementById('countVirtual')?.textContent || '',
    'Live-Out': document.getElementById('countLiveOut')?.textContent || '',
    'FB Quad': document.getElementById('countQuad')?.textContent || '',
    'FB Triple': document.getElementById('countTriple')?.textContent || '',
    'FB Double': document.getElementById('countDouble')?.textContent || '',
    'FB Single': document.getElementById('countSingle')?.textContent || '',
    Others: document.getElementById('countAccOthers')?.textContent || '',
    'Total Stay-In': document.getElementById('countStayIn')?.textContent || '',
  };
}

function getAttendanceCounters() {
  return {
    'AM IN': document.getElementById('countAMIn')?.textContent || '',
    'AM OUT': document.getElementById('countAMOut')?.textContent || '',
    'PM IN': document.getElementById('countPMIn')?.textContent || '',
    'PM OUT': document.getElementById('countPMOut')?.textContent || '',
    Registered: document.getElementById('countRegistered')?.textContent || '',
    Unregistered:
      document.getElementById('countUnregistered')?.textContent || '',
    'AM IN On Time':
      document.getElementById('countAMInOnTime')?.textContent || '',
    'AM IN Late': document.getElementById('countAMInLate')?.textContent || '',
    'PM IN On Time':
      document.getElementById('countPMInOnTime')?.textContent || '',
    'PM IN Late': document.getElementById('countPMInLate')?.textContent || '',
  };
}

function writeRowsToWorkbook(
  headers,
  rows,
  filename,
  counters = {},
  sheetName = 'Sheet1',
) {
  const counterRows = Object.entries(counters).map(([label, value]) => [
    label,
    value,
  ]);
  const worksheet = XLSX.utils.aoa_to_sheet([
    ...counterRows,
    [],
    headers,
    ...rows,
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function exportStructuredRows(rows, columns, filename, counters, sheetName) {
  const headers = columns.map((column) => column.label);
  const values = rows.map((row) => {
    return columns.map((column) => {
      const rawValue =
        typeof column.value === 'function'
          ? column.value(row)
          : row[column.key];
      return rawValue ?? '';
    });
  });

  writeRowsToWorkbook(headers, values, filename, counters, sheetName);
}

async function fetchExportRows(basePath) {
  const response = await fetch(
    buildEventScopedUrl(basePath, state.currentEventId),
    {
      credentials: 'same-origin',
    },
  );
  const payload = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error('Failed to load export data.');
  }
  return payload;
}

async function exportDynamicRows(basePath, filename, counters, sheetName) {
  const rows = await fetchExportRows(basePath);
  if (!rows.length) {
    await window.crfvDialog.alert('No data found.', { tone: 'info' });
    return;
  }

  const excludedKeys = new Set([
    'id',
    'created_at',
    'old_event_id',
    'payment_info',
    'events',
    'attendee',
  ]);
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => {
        if (!excludedKeys.has(key)) {
          set.add(key);
        }
      });
      return set;
    }, new Set()),
  );

  writeRowsToWorkbook(
    headers,
    rows.map((row) => headers.map((header) => row?.[header] ?? '')),
    filename,
    counters,
    sheetName,
  );
}

function bindExports() {
  document
    .getElementById('exportAttendeesBtn')
    .addEventListener('click', async () => {
      const scope = document.getElementById('exportAttendeesScope').value;
      const filename = buildExportFileName(
        'Attendees',
        scope,
        getSelectedEventLabel(),
      );
      if (scope === 'selected') {
        exportStructuredRows(
          getVisibleAttendeesRows(),
          [
            { key: 'attendee_no', label: 'Attendee No' },
            { key: 'last_name', label: 'Last Name' },
            { key: 'first_name', label: 'First Name' },
            { key: 'organization', label: 'Organization' },
            { key: 'rfid', label: 'RFID' },
            { key: 'confirmation_code', label: 'Confirmation Code' },
            { key: 'payment_status', label: 'Payment Status' },
            { key: 'att_status', label: 'Att Status' },
          ],
          filename,
          getAttendeesCounters(),
          'Attendees',
        );
        return;
      }

      await exportDynamicRows(
        '/api/attendees',
        filename,
        getAttendeesCounters(),
        'Attendees',
      );
    });

  document
    .getElementById('exportAccommodationBtn')
    .addEventListener('click', async () => {
      const scope = document.getElementById('exportAccommodationScope').value;
      const filename = buildExportFileName(
        'Accommodation',
        scope,
        getSelectedEventLabel(),
      );
      if (scope === 'selected') {
        exportStructuredRows(
          getVisibleAccommodationRows(),
          [
            { key: 'last_name', label: 'Last Name' },
            { key: 'first_name', label: 'First Name' },
            { key: 'organization', label: 'Organization' },
            { key: 'accommodation', label: 'Accommodation' },
            { key: 'event_name', label: 'Event Name' },
          ],
          filename,
          getAccommodationCounters(),
          'Accommodation',
        );
        return;
      }

      await exportDynamicRows(
        '/api/accommodation',
        filename,
        getAccommodationCounters(),
        'Accommodation',
      );
    });

  document
    .getElementById('exportAttendanceBtn')
    .addEventListener('click', async () => {
      const scope = document.getElementById('exportAttendanceScope').value;
      const filename = buildExportFileName(
        'Attendance',
        scope,
        getSelectedEventLabel(),
      );
      if (scope === 'selected') {
        exportStructuredRows(
          getVisibleAttendanceRows(),
          [
            {
              key: 'date',
              label: 'Date',
              value: (row) => formatDDMMMYYYY(row.date),
            },
            { key: 'time', label: 'Time' },
            { key: 'raw_last_name', label: 'Last Name' },
            { key: 'raw_first_name', label: 'First Name' },
            { key: 'raw_rfid', label: 'RFID' },
            { key: 'slot', label: 'Slot' },
            { key: 'punctuality_status', label: 'Punctuality' },
            { key: 'late_minutes', label: 'Late Minutes' },
            { key: 'event_id', label: 'Event' },
          ],
          filename,
          getAttendanceCounters(),
          'Attendance',
        );
        return;
      }

      await exportDynamicRows(
        '/api/attendance',
        filename,
        getAttendanceCounters(),
        'Attendance',
      );
    });
}

window.openInfoModal = openInfoModal;
window.closeInfoModal = closeInfoModal;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;

document.addEventListener('DOMContentLoaded', async () => {
  const authenticated = await ensureAuthenticated();
  if (!authenticated) {
    return;
  }

  bindEventFilter();
  bindTabs();
  bindSearchInputs();
  bindSorting();
  bindActions();
  bindExports();
  setActiveTab(getActiveTab());

  showSpinner();
  try {
    await populateEventDropdown();
    await loadAllData();
  } finally {
    hideSpinner();
  }
});
