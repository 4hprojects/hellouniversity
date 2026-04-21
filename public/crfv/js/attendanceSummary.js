(() => {
  const API_URL = '/api/attendance-summary';
  const EVENTS_URL = '/api/attendance-summary/all-events';
  const CRFV_HOME_URL = '/crfv';
  const DEFAULT_LIMIT = 50;
  const EXPORT_LIMIT = 1000;
  const SEARCH_DEBOUNCE_MS = 300;
  const TABLE_COLUMN_COUNT = 14;
  const SORTABLE_FIELDS = new Set(['attendee_no', 'first_name', 'last_name']);

  const state = {
    events: [],
    currentEvent: null,
    rows: [],
    selectedRows: new Set(),
    page: 1,
    limit: DEFAULT_LIMIT,
    count: 0,
    totalPages: 1,
    search: '',
    sortField: 'last_name',
    sortOrder: 'asc',
    abortController: null,
    searchTimer: null,
    isExporting: false,
  };

  const refs = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheRefs() {
    refs.eventDropdown = byId('eventDropdown');
    refs.dateInput = byId('attendanceDate');
    refs.searchInput = byId('attendanceSearch');
    refs.paginationSelect = byId('paginationSelect');
    refs.paginationInfo = byId('paginationInfo');
    refs.prevPageBtn = byId('prevPageBtn');
    refs.nextPageBtn = byId('nextPageBtn');
    refs.selectAllRows = byId('selectAllRows');
    refs.tableBody = byId('attendanceTableBody');
    refs.noRecordsLabel = byId('noRecordsLabel');
    refs.exportButton = byId('exportAttendanceSummaryBtn');
    refs.status = byId('attendanceSummaryStatus');
    refs.exportProgress = byId('attendanceExportProgress');
    refs.selectedEventLabel = byId('selectedEventLabel');
    refs.sortHeaders = document.querySelectorAll(
      '#attendanceSummaryTable th.sortable',
    );
    refs.sortButtons = document.querySelectorAll(
      '#attendanceSummaryTable .sort-button[data-column]',
    );
    refs.counters = {
      totalAttendees: byId('countTotalAttendees'),
      amIn: byId('countAMIn'),
      amOut: byId('countAMOut'),
      pmIn: byId('countPMIn'),
      pmOut: byId('countPMOut'),
      amInOnTime: byId('countAMInOnTime'),
      amInLate: byId('countAMInLate'),
      pmInOnTime: byId('countPMInOnTime'),
      pmInLate: byId('countPMInLate'),
    };
  }

  function setText(node, value) {
    if (node) {
      node.textContent = value;
    }
  }

  function setHidden(node, hidden) {
    if (node) {
      node.hidden = hidden;
    }
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString();
  }

  function showStatus(message) {
    setText(refs.status, message);
  }

  function showExportProgress(message) {
    setText(refs.exportProgress, message);
    setHidden(refs.exportProgress, !message);
  }

  async function showAlert(message, options = {}) {
    if (window.crfvDialog?.alert) {
      await window.crfvDialog.alert(message, options);
      return;
    }
    window.alert(message);
  }

  function formatPunctuality(value) {
    if (value === 'on_time') return 'On time';
    if (value === 'late') return 'Late';
    if (value === 'not_applicable') return 'N/A';
    return '';
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function getSelectedEvent() {
    const eventId = refs.eventDropdown?.value || '';
    return state.events.find((eventItem) => eventItem.event_id === eventId) || null;
  }

  function isDateWithinEvent(dateValue, eventItem) {
    if (!dateValue || !eventItem?.start_date) return false;
    const startDate = eventItem.start_date;
    const endDate = eventItem.end_date || eventItem.start_date;
    return dateValue >= startDate && dateValue <= endDate;
  }

  function applyDateBounds(eventItem) {
    if (!refs.dateInput) return;

    if (!eventItem?.start_date) {
      refs.dateInput.value = '';
      refs.dateInput.min = '';
      refs.dateInput.max = '';
      refs.dateInput.disabled = true;
      return;
    }

    refs.dateInput.disabled = false;
    refs.dateInput.min = eventItem.start_date;
    refs.dateInput.max = eventItem.end_date || eventItem.start_date;

    if (!isDateWithinEvent(refs.dateInput.value, eventItem)) {
      const today = todayIso();
      refs.dateInput.value = isDateWithinEvent(today, eventItem)
        ? today
        : eventItem.start_date;
    }
  }

  function updateSelectedEventLabel(eventItem = state.currentEvent) {
    setText(refs.selectedEventLabel, eventItem?.event_name || 'No event selected');
  }

  function readControls() {
    const parsedLimit = Number.parseInt(refs.paginationSelect?.value, 10);
    state.currentEvent = getSelectedEvent();
    state.search = refs.searchInput?.value.trim() || '';
    state.limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, EXPORT_LIMIT)
        : DEFAULT_LIMIT;
  }

  function buildSummaryQuery({
    page = state.page,
    limit = state.limit,
    eventItem = state.currentEvent,
    date = refs.dateInput?.value || '',
  } = {}) {
    const params = new URLSearchParams({
      event_id: eventItem?.event_id || '',
      date,
      page: String(page),
      limit: String(limit),
      sortField: state.sortField,
      sortOrder: state.sortOrder,
    });

    if (state.search) {
      params.set('search', state.search);
    }

    return params;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      signal: options.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(payload.error || `Request failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  async function fetchEvents() {
    showStatus('Loading events...');
    const payload = await fetchJson(EVENTS_URL);
    state.events = Array.isArray(payload.events) ? payload.events : [];
    renderEvents();
  }

  function renderEvents() {
    if (!refs.eventDropdown) return;

    if (!state.events.length) {
      refs.eventDropdown.innerHTML = '<option value="">No events available</option>';
      refs.eventDropdown.disabled = true;
      applyDateBounds(null);
      updateSelectedEventLabel(null);
      resetCounters();
      renderTableMessage('No events available.');
      renderPagination();
      setHidden(refs.noRecordsLabel, true);
      showStatus('No events available.');
      return;
    }

    refs.eventDropdown.disabled = false;
    refs.eventDropdown.textContent = '';
    state.events.forEach((eventItem) => {
      const option = document.createElement('option');
      option.value = eventItem.event_id;
      option.textContent = `${eventItem.event_name} (${eventItem.start_date || 'No start date'})`;
      refs.eventDropdown.appendChild(option);
    });

    state.currentEvent = state.events[0];
    refs.eventDropdown.value = state.currentEvent.event_id;
    applyDateBounds(state.currentEvent);
    updateSelectedEventLabel(state.currentEvent);
  }

  function resetCounters() {
    renderCounters({});
  }

  function renderCounters(counters = {}) {
    Object.entries(refs.counters).forEach(([key, node]) => {
      setText(node, formatNumber(counters[key] || 0));
    });
  }

  function rowKey(attendee) {
    return String(attendee.attendee_id || attendee.attendee_no || '');
  }

  function appendCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value == null ? '' : String(value);
    row.appendChild(cell);
  }

  function renderTableMessage(message) {
    if (!refs.tableBody) return;
    refs.tableBody.textContent = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = TABLE_COLUMN_COUNT;
    cell.textContent = message;
    row.appendChild(cell);
    refs.tableBody.appendChild(row);
  }

  function renderTable(rows) {
    if (!refs.tableBody) return;
    refs.tableBody.textContent = '';

    if (!rows.length) {
      renderTableMessage('No attendees match the selected event, date, and filters.');
      return;
    }

    const fragment = document.createDocumentFragment();
    rows.forEach((attendee) => {
      const key = rowKey(attendee);
      const row = document.createElement('tr');
      const checkboxCell = document.createElement('td');
      const checkbox = document.createElement('input');

      checkboxCell.className = 'checkbox-cell';
      checkbox.type = 'checkbox';
      checkbox.dataset.id = key;
      checkbox.checked = state.selectedRows.has(key);
      checkbox.setAttribute(
        'aria-label',
        `Select attendee ${attendee.attendee_no || key}`,
      );
      checkboxCell.appendChild(checkbox);
      row.appendChild(checkboxCell);

      appendCell(row, attendee.attendee_no);
      appendCell(row, attendee.first_name);
      appendCell(row, attendee.last_name);
      appendCell(row, attendee.am_in);
      appendCell(row, formatPunctuality(attendee.am_in_status));
      appendCell(row, attendee.am_in_late_minutes || 0);
      appendCell(row, attendee.am_out);
      appendCell(row, attendee.pm_in);
      appendCell(row, formatPunctuality(attendee.pm_in_status));
      appendCell(row, attendee.pm_in_late_minutes || 0);
      appendCell(row, attendee.pm_out);
      appendCell(row, attendee.date);
      appendCell(row, attendee.attendance_status);
      fragment.appendChild(row);
    });

    refs.tableBody.appendChild(fragment);
  }

  function renderPagination() {
    const label =
      state.count === 0
        ? 'No matching attendees'
        : `Page ${formatNumber(state.page)} of ${formatNumber(
            state.totalPages,
          )} (${formatNumber(state.count)} matching attendee(s))`;
    setText(refs.paginationInfo, label);
    if (refs.prevPageBtn) refs.prevPageBtn.disabled = state.page <= 1;
    if (refs.nextPageBtn) refs.nextPageBtn.disabled = state.page >= state.totalPages;
  }

  function updateNoRecordsMessage() {
    setHidden(refs.noRecordsLabel, state.rows.length > 0);
  }

  function updateSelectAllState() {
    if (!refs.selectAllRows) return;
    refs.selectAllRows.checked =
      state.rows.length > 0 &&
      state.rows.every((attendee) => state.selectedRows.has(rowKey(attendee)));
  }

  function updateSortIndicators() {
    refs.sortHeaders.forEach((header) => {
      const column = header.getAttribute('data-column');
      const isActive = column === state.sortField;
      header.setAttribute(
        'aria-sort',
        isActive ? (state.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none',
      );
      const icon = header.querySelector('.sort-icon');
      if (icon) {
        icon.textContent = isActive
          ? state.sortOrder === 'asc'
            ? '^'
            : 'v'
          : '';
      }
    });
  }

  function setLoading(isLoading) {
    if (refs.eventDropdown) refs.eventDropdown.disabled = isLoading || !state.events.length;
    if (refs.dateInput) refs.dateInput.disabled = isLoading || !state.currentEvent;
    if (refs.searchInput) refs.searchInput.disabled = isLoading;
    if (refs.paginationSelect) refs.paginationSelect.disabled = isLoading;
  }

  function handleLoadError(error) {
    if (error.name === 'AbortError') return;
    if (error.status === 401 || error.status === 403) {
      window.location.href = CRFV_HOME_URL;
      return;
    }
    console.error('Failed to fetch attendance summary:', error);
    state.rows = [];
    state.count = 0;
    state.totalPages = 1;
    resetCounters();
    renderTable([]);
    renderPagination();
    updateNoRecordsMessage();
    showStatus(error.message || 'Failed to load attendance summary.');
  }

  async function loadAttendanceSummary(page = 1) {
    readControls();

    if (!state.currentEvent || !refs.dateInput?.value) {
      state.rows = [];
      state.count = 0;
      state.totalPages = 1;
      resetCounters();
      renderTableMessage('Select an event and date to load attendance summary.');
      renderPagination();
      updateNoRecordsMessage();
      return;
    }

    if (!isDateWithinEvent(refs.dateInput.value, state.currentEvent)) {
      await showAlert('Selected date is outside the event date range.', {
        tone: 'info',
      });
      applyDateBounds(state.currentEvent);
      return;
    }

    if (state.abortController) {
      state.abortController.abort();
    }

    state.page = Math.max(1, page);
    state.abortController = new AbortController();
    const controller = state.abortController;
    setLoading(true);
    showStatus('Loading attendance summary...');

    try {
      const query = buildSummaryQuery({ page: state.page, signal: controller.signal });
      const payload = await fetchJson(`${API_URL}?${query.toString()}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      state.rows = Array.isArray(payload.summary) ? payload.summary : [];
      state.count = Number(payload.count || state.rows.length || 0);
      state.totalPages = Math.max(1, Number(payload.totalPages || 1));
      state.page = Number(payload.page || state.page);
      state.limit = Number(payload.limit || state.limit);
      state.selectedRows.clear();
      updateSelectedEventLabel(payload.event || state.currentEvent);

      renderCounters(payload.counters || {});
      renderTable(state.rows);
      renderPagination();
      updateSelectAllState();
      updateSortIndicators();
      updateNoRecordsMessage();
      showStatus(
        `Loaded ${formatNumber(state.rows.length)} visible attendee(s) for ${payload.event?.event_name || state.currentEvent.event_name}.`,
      );
    } catch (error) {
      handleLoadError(error);
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
        setLoading(false);
      }
    }
  }

  function scheduleSearch() {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      loadAttendanceSummary(1);
    }, SEARCH_DEBOUNCE_MS);
  }

  function bindControls() {
    refs.eventDropdown?.addEventListener('change', () => {
      state.currentEvent = getSelectedEvent();
      state.selectedRows.clear();
      applyDateBounds(state.currentEvent);
      updateSelectedEventLabel(state.currentEvent);
      loadAttendanceSummary(1);
    });
    refs.dateInput?.addEventListener('change', () => {
      state.selectedRows.clear();
      loadAttendanceSummary(1);
    });
    refs.searchInput?.addEventListener('input', scheduleSearch);
    refs.paginationSelect?.addEventListener('change', () => {
      state.selectedRows.clear();
      loadAttendanceSummary(1);
    });
    refs.prevPageBtn?.addEventListener('click', () => {
      if (state.page > 1) loadAttendanceSummary(state.page - 1);
    });
    refs.nextPageBtn?.addEventListener('click', () => {
      if (state.page < state.totalPages) loadAttendanceSummary(state.page + 1);
    });
    refs.selectAllRows?.addEventListener('change', () => {
      state.selectedRows.clear();
      if (refs.selectAllRows.checked) {
        state.rows.forEach((attendee) => {
          const key = rowKey(attendee);
          if (key) state.selectedRows.add(key);
        });
      }
      renderTable(state.rows);
      updateSelectAllState();
    });
    refs.tableBody?.addEventListener('change', (event) => {
      if (event.target?.type !== 'checkbox') return;
      const key = event.target.dataset.id;
      if (!key) return;
      if (event.target.checked) {
        state.selectedRows.add(key);
      } else {
        state.selectedRows.delete(key);
      }
      updateSelectAllState();
    });
    refs.sortButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const column = button.getAttribute('data-column');
        if (!SORTABLE_FIELDS.has(column)) return;
        if (state.sortField === column) {
          state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortField = column;
          state.sortOrder = 'asc';
        }
        state.selectedRows.clear();
        loadAttendanceSummary(1);
      });
    });
    refs.exportButton?.addEventListener('click', handleExport);
  }

  function toExportRow(attendee) {
    return [
      attendee.attendee_no || '',
      attendee.first_name || '',
      attendee.last_name || '',
      attendee.event_name || '',
      attendee.am_in || '',
      formatPunctuality(attendee.am_in_status),
      attendee.am_in_late_minutes || 0,
      attendee.am_out || '',
      attendee.pm_in || '',
      formatPunctuality(attendee.pm_in_status),
      attendee.pm_in_late_minutes || 0,
      attendee.pm_out || '',
      attendee.date || '',
      attendee.attendance_status || '',
    ];
  }

  async function fetchAllMatchingRows() {
    const rows = [];
    let page = 1;
    let totalPages = 1;

    do {
      const query = buildSummaryQuery({ page, limit: EXPORT_LIMIT });
      const payload = await fetchJson(`${API_URL}?${query.toString()}`);
      const pageRows = Array.isArray(payload.summary) ? payload.summary : [];
      rows.push(...pageRows);
      totalPages = Math.max(1, Number(payload.totalPages || 1));
      showExportProgress(
        `Preparing export: ${formatNumber(rows.length)} of ${formatNumber(
          payload.count || rows.length,
        )} attendee(s) fetched`,
      );
      page += 1;
    } while (page <= totalPages);

    return rows;
  }

  async function handleExport() {
    const exportOption = document.querySelector(
      'input[name="exportOption"]:checked',
    )?.value;
    let exportRows = [];

    if (state.isExporting) return;
    state.isExporting = true;
    if (refs.exportButton) refs.exportButton.disabled = true;
    showExportProgress('Preparing export...');

    try {
      if (exportOption === 'selected') {
        exportRows = state.rows.filter((attendee) =>
          state.selectedRows.has(rowKey(attendee)),
        );
      } else {
        readControls();
        exportRows = await fetchAllMatchingRows();
      }

      if (!exportRows.length) {
        await showAlert('No data to export.', { tone: 'info' });
        showExportProgress('');
        return;
      }

      if (typeof XLSX === 'undefined') {
        await showAlert('XLSX library not loaded.', { tone: 'error' });
        showExportProgress('');
        return;
      }

      const headers = [
        'Attendee No',
        'First Name',
        'Last Name',
        'Event Name',
        'AM IN',
        'AM IN Status',
        'AM IN Late Minutes',
        'AM OUT',
        'PM IN',
        'PM IN Status',
        'PM IN Late Minutes',
        'PM OUT',
        'Date',
        'Attendance Status',
      ];
      const worksheet = XLSX.utils.aoa_to_sheet([
        headers,
        ...exportRows.map(toExportRow),
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary');
      XLSX.writeFile(workbook, 'attendance_summary.xlsx');
      showExportProgress(`Exported ${formatNumber(exportRows.length)} row(s).`);
    } catch (error) {
      console.error('Failed to export attendance summary:', error);
      await showAlert('Unable to export attendance summary.', { tone: 'error' });
      showExportProgress('');
    } finally {
      state.isExporting = false;
      if (refs.exportButton) refs.exportButton.disabled = false;
    }
  }

  async function init() {
    cacheRefs();
    bindControls();
    refs.dateInput.disabled = true;
    updateSortIndicators();
    resetCounters();

    try {
      await fetchEvents();
      if (state.currentEvent) {
        await loadAttendanceSummary(1);
      }
    } catch (error) {
      handleLoadError(error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
