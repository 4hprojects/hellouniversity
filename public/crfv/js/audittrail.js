(() => {
  const API_URL = '/api/audit-trail';
  const CRFV_HOME_URL = '/crfv';
  const DEFAULT_LIMIT = 50;
  const EXPORT_PAGE_SIZE = 1000;
  const SEARCH_DEBOUNCE_MS = 300;
  const SORTABLE_FIELDS = new Set([
    'user_name',
    'user_role',
    'action',
    'action_time',
    'ip_address',
    'details',
  ]);

  const state = {
    page: 1,
    limit: DEFAULT_LIMIT,
    search: '',
    dateFrom: '',
    dateTo: '',
    sortField: 'action_time',
    sortOrder: 'desc',
    totalPages: 1,
    count: 0,
    logs: [],
    abortController: null,
    searchTimer: null,
    isExporting: false,
  };

  const refs = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheRefs() {
    refs.searchInput = byId('searchLogs');
    refs.filtersForm = byId('auditFilters');
    refs.limitSelect = byId('logsLimit');
    refs.dateFromInput = byId('dateFrom');
    refs.dateToInput = byId('dateTo');
    refs.clearFiltersButton = byId('clearFiltersBtn');
    refs.exportType = byId('exportType');
    refs.exportButton = byId('exportBtn');
    refs.exportButtonLabel = byId('exportBtnLabel');
    refs.exportProgress = byId('exportProgress');
    refs.status = byId('auditTrailStatus');
    refs.error = byId('auditError');
    refs.emptyState = byId('auditEmptyState');
    refs.summary = byId('logsResultsSummary');
    refs.inlinePagination = byId('inlinePagination');
    refs.bottomPagination = byId('logsPagination');
    refs.spinner = byId('loadingSpinner');
    refs.tableBody = document.querySelector('#logs-table tbody');
    refs.sortButtons = document.querySelectorAll('.sort-button[data-field]');
    refs.sortHeaders = document.querySelectorAll('#logs-table th.sortable');
  }

  function getDialog() {
    return window.crfvDialog || null;
  }

  async function showAlert(message, options = {}) {
    const dialog = getDialog();
    if (dialog?.alert) {
      await dialog.alert(message, options);
      return;
    }
    window.alert(message);
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

  function formatDateTime(value) {
    if (!value) return '';
    const normalized = String(value).replace(/\.\d{6}/, '');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleString();
  }

  function formatDateForFilename() {
    return new Date().toISOString().slice(0, 10);
  }

  function readControlState() {
    const parsedLimit = Number.parseInt(refs.limitSelect?.value, 10);
    state.search = refs.searchInput?.value.trim() || '';
    state.limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, EXPORT_PAGE_SIZE)
        : DEFAULT_LIMIT;
    state.dateFrom = refs.dateFromInput?.value || '';
    state.dateTo = refs.dateToInput?.value || '';
  }

  function getDateRangeForQuery(criteria = state) {
    let dateFrom = criteria.dateFrom;
    let dateTo = criteria.dateTo;

    if (dateFrom && dateTo && dateFrom === dateTo) {
      dateFrom = `${dateFrom}T00:00:00`;
      dateTo = `${dateTo}T23:59:59.999`;
    }

    return { dateFrom, dateTo };
  }

  async function validateDateRange() {
    if (state.dateFrom && state.dateTo && state.dateFrom > state.dateTo) {
      await showAlert('Start date cannot be after end date.', {
        tone: 'info',
      });
      return false;
    }
    return true;
  }

  function buildAuditQuery({
    page = state.page,
    limit = state.limit,
    criteria = state,
  } = {}) {
    const { dateFrom, dateTo } = getDateRangeForQuery(criteria);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sortField: criteria.sortField,
      sortOrder: criteria.sortOrder,
    });

    if (criteria.search) params.set('search', criteria.search);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    return params;
  }

  async function fetchAuditLogs(options = {}) {
    const query = buildAuditQuery(options);
    const response = await fetch(`${API_URL}?${query.toString()}`, {
      credentials: 'same-origin',
      signal: options.signal,
    });

    if (!response.ok) {
      const error = new Error('Failed to fetch audit logs.');
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    if (Array.isArray(payload)) {
      return {
        logs: payload,
        totalPages: 1,
        count: payload.length,
      };
    }

    return {
      logs: Array.isArray(payload?.logs) ? payload.logs : [],
      totalPages: Math.max(1, Number.parseInt(payload?.totalPages, 10) || 1),
      count: Number.parseInt(payload?.count, 10) || 0,
    };
  }

  function setLoading(isLoading) {
    setHidden(refs.spinner, !isLoading);
    if (refs.searchInput) refs.searchInput.disabled = isLoading;
    if (refs.limitSelect) refs.limitSelect.disabled = isLoading;
    if (refs.dateFromInput) refs.dateFromInput.disabled = isLoading;
    if (refs.dateToInput) refs.dateToInput.disabled = isLoading;
    if (refs.clearFiltersButton) refs.clearFiltersButton.disabled = isLoading;
  }

  function setExporting(isExporting, label = 'Export') {
    state.isExporting = isExporting;
    if (refs.exportButton) refs.exportButton.disabled = isExporting;
    if (refs.exportType) refs.exportType.disabled = isExporting;
    setText(refs.exportButtonLabel, label);
  }

  function setError(message) {
    setText(refs.error, message);
    setHidden(refs.error, !message);
  }

  function setStatus(message) {
    setText(refs.status, message);
  }

  function setExportProgress(message) {
    setText(refs.exportProgress, message);
    setHidden(refs.exportProgress, !message);
  }

  function renderTableMessage(message) {
    if (!refs.tableBody) return;
    refs.tableBody.textContent = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.className = 'audit-table-message';
    cell.colSpan = 6;
    cell.textContent = message;
    row.appendChild(cell);
    refs.tableBody.appendChild(row);
  }

  function appendCell(row, value, className) {
    const cell = document.createElement('td');
    if (className) {
      cell.className = className;
    }
    cell.textContent = value || '';
    row.appendChild(cell);
  }

  function renderLogsTable(logs) {
    if (!refs.tableBody) return;

    refs.tableBody.textContent = '';
    if (!logs.length) {
      renderTableMessage('No logs found.');
      return;
    }

    const fragment = document.createDocumentFragment();
    logs.forEach((log) => {
      const row = document.createElement('tr');
      appendCell(row, log.user_name);
      appendCell(row, log.user_role);
      appendCell(row, log.action);
      appendCell(row, formatDateTime(log.action_time));
      appendCell(row, log.ip_address);
      appendCell(row, log.details, 'audit-details-cell');
      fragment.appendChild(row);
    });

    refs.tableBody.appendChild(fragment);
  }

  function updateSortIndicators() {
    refs.sortHeaders.forEach((header) => {
      const field = header.getAttribute('data-field');
      const isActive = field === state.sortField;
      const ariaSort = isActive
        ? state.sortOrder === 'asc'
          ? 'ascending'
          : 'descending'
        : 'none';
      header.setAttribute('aria-sort', ariaSort);
      const icon = header.querySelector('.sort-icon');
      if (icon) {
        icon.textContent = isActive
          ? state.sortOrder === 'asc'
            ? '\u25b2'
            : '\u25bc'
          : '';
      }
    });
  }

  function createPaginationButton(label, disabled, onClick, iconName, iconAfter) {
    const button = document.createElement('button');
    button.className = 'btn pagination-btn';
    button.type = 'button';
    button.disabled = disabled;
    button.setAttribute('aria-label', label);

    const icon = document.createElement('i');
    icon.className = 'material-icons';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = iconName;

    const labelNode = document.createTextNode(
      label.replace(' Page', '').replace('Previous', 'Prev'),
    );

    if (iconAfter) {
      button.appendChild(labelNode);
      button.appendChild(icon);
    } else {
      button.appendChild(icon);
      button.appendChild(labelNode);
    }

    button.addEventListener('click', onClick);
    return button;
  }

  function renderPagination(container) {
    if (!container) return;
    container.textContent = '';

    const previousButton = createPaginationButton(
      'Previous Page',
      state.page <= 1,
      () => loadLogs(state.page - 1),
      'chevron_left',
      false,
    );

    const pageLabel = document.createElement('span');
    pageLabel.className = 'pagination-label';
    pageLabel.textContent = `Page ${formatNumber(state.page)} of ${formatNumber(
      state.totalPages,
    )}`;

    const nextButton = createPaginationButton(
      'Next Page',
      state.page >= state.totalPages,
      () => loadLogs(state.page + 1),
      'chevron_right',
      true,
    );

    container.appendChild(previousButton);
    container.appendChild(pageLabel);
    container.appendChild(nextButton);
  }

  function renderAllPagination() {
    renderPagination(refs.inlinePagination);
    renderPagination(refs.bottomPagination);
  }

  function renderSummary() {
    const firstRow = state.count === 0 ? 0 : (state.page - 1) * state.limit + 1;
    const lastRow = Math.min(state.page * state.limit, state.count);
    const filters = [];

    if (state.search) filters.push(`search "${state.search}"`);
    if (state.dateFrom && state.dateTo) {
      filters.push(`dates ${state.dateFrom} to ${state.dateTo}`);
    } else if (state.dateFrom) {
      filters.push(`from ${state.dateFrom}`);
    } else if (state.dateTo) {
      filters.push(`up to ${state.dateTo}`);
    }

    const filterLabel = filters.length ? ` with ${filters.join(', ')}` : '';
    const summary =
      state.count === 0
        ? `Showing 0 results${filterLabel}`
        : `Showing ${formatNumber(firstRow)}-${formatNumber(
            lastRow,
          )} of ${formatNumber(state.count)} results${filterLabel}`;

    setText(refs.summary, summary);
  }

  function updateEmptyState() {
    setHidden(
      refs.emptyState,
      state.logs.length > 0 || Boolean(refs.error?.textContent),
    );
  }

  function handleRequestFailure(error) {
    if (error.name === 'AbortError') {
      return;
    }

    if (error.status === 401 || error.status === 403) {
      window.location.href = CRFV_HOME_URL;
      return;
    }

    console.error('Error loading audit logs:', error);
    state.logs = [];
    state.count = 0;
    state.totalPages = 1;
    renderLogsTable([]);
    renderAllPagination();
    renderSummary();
    setError('Unable to load audit logs. Check your connection and try again.');
    setStatus('Audit logs unavailable');
    updateEmptyState();
  }

  async function loadLogs(page = 1) {
    readControlState();
    if (!(await validateDateRange())) return;

    if (state.abortController) {
      state.abortController.abort();
    }

    state.page = Math.max(1, page);
    state.abortController = new AbortController();
    const controller = state.abortController;

    setLoading(true);
    setError('');
    setStatus('Loading audit logs...');

    try {
      const payload = await fetchAuditLogs({
        page: state.page,
        limit: state.limit,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      state.logs = payload.logs;
      state.totalPages = payload.totalPages;
      state.count = payload.count;
      if (state.page > state.totalPages) {
        await loadLogs(state.totalPages);
        return;
      }

      window.currentLogs = state.logs;
      renderLogsTable(state.logs);
      renderAllPagination();
      renderSummary();
      updateSortIndicators();
      updateEmptyState();
      setStatus(`Loaded ${formatNumber(state.logs.length)} visible log(s)`);
    } catch (error) {
      handleRequestFailure(error);
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
      loadLogs(1);
    }, SEARCH_DEBOUNCE_MS);
  }

  function bindFilters() {
    refs.filtersForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      window.clearTimeout(state.searchTimer);
      loadLogs(1);
    });
    refs.searchInput?.addEventListener('input', scheduleSearch);
    refs.limitSelect?.addEventListener('change', () => loadLogs(1));
    refs.dateFromInput?.addEventListener('change', () => loadLogs(1));
    refs.dateToInput?.addEventListener('change', () => loadLogs(1));
    refs.clearFiltersButton?.addEventListener('click', () => {
      if (refs.searchInput) refs.searchInput.value = '';
      if (refs.limitSelect) refs.limitSelect.value = String(DEFAULT_LIMIT);
      if (refs.dateFromInput) refs.dateFromInput.value = '';
      if (refs.dateToInput) refs.dateToInput.value = '';
      setExportProgress('');
      loadLogs(1);
    });
  }

  function bindSorting() {
    refs.sortButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const field = button.getAttribute('data-field');
        if (!SORTABLE_FIELDS.has(field)) return;

        if (state.sortField !== field) {
          state.sortField = field;
          state.sortOrder = field === 'action_time' ? 'desc' : 'asc';
        } else {
          state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        }

        loadLogs(1);
      });
    });
  }

  function toExportRow(log) {
    return {
      User: log.user_name || '',
      Role: log.user_role || '',
      Action: log.action || '',
      'Date/Time': formatDateTime(log.action_time),
      IP: log.ip_address || '',
      Details: log.details || '',
    };
  }

  function getQuerySnapshot() {
    return {
      search: state.search,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      sortField: state.sortField,
      sortOrder: state.sortOrder,
    };
  }

  async function fetchAllFilteredLogs() {
    const criteria = getQuerySnapshot();
    const firstPage = await fetchAuditLogs({
      page: 1,
      limit: EXPORT_PAGE_SIZE,
      criteria,
    });
    const logs = [...firstPage.logs];
    const totalPages = firstPage.totalPages;

    setExportProgress(
      `Preparing export: ${formatNumber(logs.length)} of ${formatNumber(
        firstPage.count,
      )} log(s) fetched`,
    );

    for (let page = 2; page <= totalPages; page += 1) {
      const payload = await fetchAuditLogs({
        page,
        limit: EXPORT_PAGE_SIZE,
        criteria,
      });
      logs.push(...payload.logs);
      setExportProgress(
        `Preparing export: ${formatNumber(logs.length)} of ${formatNumber(
          firstPage.count,
        )} log(s) fetched`,
      );
    }

    return logs;
  }

  function writeWorkbook(logs) {
    const xlsx = window.XLSX;
    if (!xlsx?.utils || typeof xlsx.writeFile !== 'function') {
      throw new Error('XLSX export library is not available.');
    }

    const worksheet = xlsx.utils.json_to_sheet(logs.map(toExportRow));
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');
    xlsx.writeFile(workbook, `audit_logs_${formatDateForFilename()}.xlsx`);
  }

  async function handleExport() {
    if (state.isExporting) return;

    readControlState();
    if (!(await validateDateRange())) return;

    const scope = refs.exportType?.value || 'visible';
    setExporting(true, 'Exporting...');
    setExportProgress('Preparing export...');

    try {
      const logs =
        scope === 'allFiltered' ? await fetchAllFilteredLogs() : state.logs;

      if (!logs.length) {
        await showAlert('No data to export.', { tone: 'info' });
        setExportProgress('');
        return;
      }

      writeWorkbook(logs);
      setExportProgress(`Exported ${formatNumber(logs.length)} audit log(s).`);
    } catch (error) {
      console.error('Audit export failed:', error);
      setExportProgress('');
      await showAlert('Unable to export audit logs. Please try again.', {
        tone: 'error',
      });
    } finally {
      setExporting(false);
    }
  }

  function bindExport() {
    refs.exportButton?.addEventListener('click', handleExport);
  }

  function init() {
    cacheRefs();
    bindFilters();
    bindSorting();
    bindExport();
    updateSortIndicators();
    window.reloadLogs = loadLogs;
    loadLogs();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
