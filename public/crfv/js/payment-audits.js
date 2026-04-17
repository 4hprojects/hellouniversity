const COLUMN_PICKER_KEY = 'paymentAuditsColumns';
const DEFAULT_VISIBLE_KEYS = [
  'event',
  'attendee_no',
  'attendee_name',
  'organization',
  'payment_status',
  'amount',
  'form_of_payment',
  'or_number',
  'date_full_payment'
];

const COLUMN_DEFINITIONS = [
  {
    key: 'event',
    label: 'Event',
    cellClass: 'payment-audit-event-cell',
    render: renderEventCell
  },
  {
    key: 'attendee_no',
    label: 'Attendee No',
    render: (record) => escapeHtml(record.attendee_no || '-')
  },
  {
    key: 'attendee_name',
    label: 'Attendee Name',
    render: renderAttendeeNameCell
  },
  {
    key: 'organization',
    label: 'Organization',
    render: (record) => escapeHtml(record.organization || '-')
  },
  {
    key: 'payment_status',
    label: 'Payment Status',
    render: renderPaymentStatusCell
  },
  {
    key: 'amount',
    label: 'Amount',
    render: (record) => `PHP ${escapeHtml(formatCurrency(record.amount))}`
  },
  {
    key: 'form_of_payment',
    label: 'Form of Payment',
    render: (record) => escapeHtml(record.form_of_payment || '-')
  },
  {
    key: 'or_number',
    label: 'OR Number',
    render: (record) => escapeHtml(record.or_number || '-')
  },
  {
    key: 'date_full_payment',
    label: 'Date Full Payment',
    render: (record) => escapeHtml(formatDate(record.date_full_payment))
  },
  {
    key: 'event_id',
    label: 'Event ID',
    render: (record) => escapeHtml(record.event_id || '-')
  },
  {
    key: 'date_partial_payment',
    label: 'Date Partial Payment',
    render: (record) => escapeHtml(formatDate(record.date_partial_payment))
  },
  {
    key: 'account',
    label: 'Account',
    render: (record) => escapeHtml(record.account || '-')
  },
  {
    key: 'quickbooks_no',
    label: 'QuickBooks No',
    render: (record) => escapeHtml(record.quickbooks_no || '-')
  },
  {
    key: 'shipping_tracking_no',
    label: 'Shipping Tracking No',
    render: (record) => escapeHtml(record.shipping_tracking_no || '-')
  },
  {
    key: 'notes',
    label: 'Notes',
    cellClass: 'notes-cell',
    render: (record) => escapeHtml(record.notes || '-')
  },
  {
    key: 'created_at',
    label: 'Created At',
    render: (record) => escapeHtml(formatDateTime(record.created_at))
  }
];

const state = {
  events: [],
  selectedEventId: '',
  currentPage: 1,
  searchDebounceId: null,
  currentRecords: [],
  totalRecordCount: 0,
  totalPages: 1,
  visibleColumnKeys: [...DEFAULT_VISIBLE_KEYS]
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const normalized = String(value).replace(/\.\d{6}/, '');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function getSelectedEventLabel() {
  const event = state.events.find((entry) => entry.event_id === state.selectedEventId);
  if (!event) {
    return 'All Events';
  }

  return `${event.event_name} (${formatDate(event.start_date)})`;
}

function setSummaryStatus(message) {
  const summaryStatus = document.getElementById('summaryStatus');
  if (summaryStatus) {
    summaryStatus.textContent = message || '';
  }
}

async function checkAuth() {
  try {
    const response = await fetch('/api/check-auth', { credentials: 'same-origin' });
    if (!response.ok) {
      window.location.href = '/crfv/index';
      return false;
    }

    const data = await response.json();
    const role = String(data?.user?.role || '').toLowerCase();
    if (!data?.authenticated || (role !== 'admin' && role !== 'manager')) {
      window.location.href = '/crfv/index';
      return false;
    }

    return true;
  } catch (_error) {
    window.location.href = '/crfv/index';
    return false;
  }
}

function getStatusTone(statusLabel) {
  const normalized = String(statusLabel || '').trim().toLowerCase();
  if (normalized === 'fully paid') {
    return 'is-paid';
  }
  if (normalized === 'partially paid') {
    return 'is-partial';
  }
  return 'is-receivable';
}

function renderSummaryCards(summary) {
  const summaryCards = document.getElementById('summaryCards');
  if (!summaryCards) {
    return;
  }

  const cards = [
    {
      title: 'Total Recorded',
      value: `PHP ${formatCurrency(summary.total_recorded_amount)}`,
      hint: 'All payment amounts currently recorded in the selected scope.',
      tone: 'is-money'
    },
    {
      title: 'Total Collected',
      value: `PHP ${formatCurrency(summary.total_collected_amount)}`,
      hint: 'Amounts already counted as paid or partially paid.',
      tone: 'is-money'
    },
    {
      title: 'Total Receivable',
      value: `PHP ${formatCurrency(summary.total_receivable_amount)}`,
      hint: 'Amounts still treated as receivable by payment report rules.',
      tone: 'is-warning'
    },
    {
      title: 'Payment Records',
      value: summary.payment_record_count || 0,
      hint: 'Number of payment rows included in this audit view.'
    },
    {
      title: 'Paid Records',
      value: summary.paid_count || 0,
      hint: 'Rows normalized as fully paid.'
    },
    {
      title: 'Partial Records',
      value: summary.partial_count || 0,
      hint: 'Rows normalized as partially paid.'
    },
    {
      title: 'Receivable Records',
      value: summary.receivable_count || 0,
      hint: 'Rows still counted as receivable or pending.'
    }
  ];

  summaryCards.innerHTML = cards.map((card) => `
    <article class="payment-audit-summary-card ${card.tone || ''}">
      <h3>${escapeHtml(card.title)}</h3>
      <strong>${escapeHtml(card.value)}</strong>
      <p>${escapeHtml(card.hint)}</p>
    </article>
  `).join('');
}

function renderEventCell(record) {
  const eventName = String(record.event_name || '').trim();
  const startDate = String(record.start_date || '').trim();
  const primary = record.event_id && eventName
    ? `<a class="payment-audit-event-link" href="/crfv/payment-reports?event_id=${encodeURIComponent(record.event_id)}">${escapeHtml(eventName)}</a>`
    : `<span>${escapeHtml(eventName || '-')}</span>`;
  const secondary = startDate ? `<span class="payment-audit-secondary">${escapeHtml(formatDate(startDate))}</span>` : '';

  return `${primary}${secondary}`;
}

function renderAttendeeNameCell(record) {
  const attendeeName = [record.last_name, record.first_name].filter(Boolean).join(', ');
  return escapeHtml(attendeeName || '-');
}

function renderPaymentStatusCell(record) {
  const label = record.payment_status_label || record.payment_status || '-';
  return `<span class="payment-status-pill ${escapeHtml(getStatusTone(label))}">${escapeHtml(label)}</span>`;
}

function getVisibleColumns() {
  const visibleKeys = new Set(state.visibleColumnKeys);
  return COLUMN_DEFINITIONS.filter((column) => visibleKeys.has(column.key));
}

function sanitizeVisibleColumnKeys(keys, fallbackKeys = DEFAULT_VISIBLE_KEYS) {
  const allowedKeys = new Set(COLUMN_DEFINITIONS.map((column) => column.key));
  const requestedKeys = Array.isArray(keys) ? keys : fallbackKeys;
  const requestedSet = new Set(requestedKeys.filter((key) => allowedKeys.has(key)));
  const orderedKeys = COLUMN_DEFINITIONS
    .filter((column) => requestedSet.has(column.key))
    .map((column) => column.key);

  if (orderedKeys.length > 0) {
    return orderedKeys;
  }

  return COLUMN_DEFINITIONS
    .filter((column) => fallbackKeys.includes(column.key))
    .map((column) => column.key);
}

function applyVisibleColumnKeys(keys) {
  state.visibleColumnKeys = sanitizeVisibleColumnKeys(keys);
}

function saveColumnPrefs() {
  try {
    window.localStorage.setItem(COLUMN_PICKER_KEY, JSON.stringify(state.visibleColumnKeys));
  } catch (error) {
    console.warn('Failed to save payment audit column preferences.', error);
  }
}

function loadColumnPrefs() {
  try {
    const storedValue = window.localStorage.getItem(COLUMN_PICKER_KEY);
    if (!storedValue) {
      applyVisibleColumnKeys(DEFAULT_VISIBLE_KEYS);
      return;
    }

    const parsedKeys = JSON.parse(storedValue);
    applyVisibleColumnKeys(parsedKeys);
  } catch (error) {
    console.warn('Failed to load payment audit column preferences.', error);
    applyVisibleColumnKeys(DEFAULT_VISIBLE_KEYS);
  }
}

function renderTableHead() {
  const headRow = document.getElementById('paymentAuditRecordsHead');
  if (!headRow) {
    return;
  }

  headRow.innerHTML = getVisibleColumns()
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join('');
}

function getEmptyRecordsMessage() {
  const hasSearch = String(document.getElementById('paymentAuditSearch')?.value || '').trim().length > 0;
  const hasStatus = String(document.getElementById('paymentStatusFilter')?.value || '').trim().length > 0;

  if (hasSearch || hasStatus) {
    return 'No payment rows matched the current search and status filters.';
  }

  if (state.selectedEventId) {
    return 'No payment rows were found for the selected event.';
  }

  return 'No payment rows are available yet.';
}

function renderRecords(records = state.currentRecords) {
  const tbody = document.getElementById('paymentAuditRecordsBody');
  if (!tbody) {
    return;
  }

  renderTableHead();

  const visibleColumns = getVisibleColumns();
  const colspan = Math.max(visibleColumns.length, 1);

  if (!Array.isArray(records) || records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colspan}" class="empty-state-row">${escapeHtml(getEmptyRecordsMessage())}</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map((record) => `
    <tr>
      ${visibleColumns.map((column) => {
        const cellClasses = ['payment-audit-cell', column.cellClass].filter(Boolean).join(' ');
        return `<td class="${cellClasses}">${column.render(record)}</td>`;
      }).join('')}
    </tr>
  `).join('');
}

function renderRecordsSummary(displayed, total) {
  const summary = document.getElementById('recordsResultsSummary');
  if (!summary) {
    return;
  }

  summary.textContent = `Showing ${displayed} of ${total} payment rows for ${getSelectedEventLabel()}.`;
}

function renderPagination(page, totalPages) {
  const containers = [
    document.getElementById('recordsPagination'),
    document.getElementById('inlineRecordsPagination')
  ].filter(Boolean);

  containers.forEach((container) => {
    container.innerHTML = '';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'btn btn-secondary';
    prev.disabled = page <= 1;
    prev.textContent = 'Prev';
    prev.addEventListener('click', () => loadRecords(page - 1));

    const label = document.createElement('span');
    label.textContent = `Page ${page} of ${totalPages}`;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn-secondary';
    next.disabled = page >= totalPages;
    next.textContent = 'Next';
    next.addEventListener('click', () => loadRecords(page + 1));

    container.appendChild(prev);
    container.appendChild(label);
    container.appendChild(next);
  });
}

function populateEventFilter() {
  const eventFilter = document.getElementById('eventFilter');
  if (!eventFilter) {
    return;
  }

  eventFilter.innerHTML = '<option value="">All Events</option>';
  state.events.forEach((event) => {
    const option = document.createElement('option');
    option.value = event.event_id;
    option.textContent = `${event.event_name} (${event.start_date})`;
    eventFilter.appendChild(option);
  });
  eventFilter.value = state.selectedEventId;
}

function populateStatusFilter(statusOptions) {
  const statusFilter = document.getElementById('paymentStatusFilter');
  if (!statusFilter) {
    return;
  }

  const currentValue = statusFilter.value;
  statusFilter.innerHTML = '<option value="">All Statuses</option>';

  (Array.isArray(statusOptions) ? statusOptions : []).forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    statusFilter.appendChild(option);
  });

  statusFilter.value = (Array.isArray(statusOptions) && statusOptions.includes(currentValue)) ? currentValue : '';
}

function getRequestedEventId() {
  return new URLSearchParams(window.location.search).get('event_id') || '';
}

function updateEventQueryParam(eventId) {
  const url = new URL(window.location.href);
  if (eventId) {
    url.searchParams.set('event_id', eventId);
  } else {
    url.searchParams.delete('event_id');
  }
  window.history.replaceState({}, '', url.toString());
}

function updatePaymentReportsLink() {
  const link = document.getElementById('openPaymentReportsLink');
  if (!link) {
    return;
  }

  link.href = state.selectedEventId
    ? `/crfv/payment-reports?event_id=${encodeURIComponent(state.selectedEventId)}`
    : '/crfv/payment-reports';
}

function renderColumnPicker() {
  const pickerDropdown = document.getElementById('columnPickerDropdown');
  if (!pickerDropdown) {
    return;
  }

  const visibleKeys = new Set(state.visibleColumnKeys);
  pickerDropdown.innerHTML = '';

  COLUMN_DEFINITIONS.forEach((column) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = column.key;
    checkbox.checked = visibleKeys.has(column.key);

    checkbox.addEventListener('change', async () => {
      const nextKeys = new Set(state.visibleColumnKeys);
      if (checkbox.checked) {
        nextKeys.add(column.key);
      } else {
        nextKeys.delete(column.key);
      }

      if (nextKeys.size === 0) {
        checkbox.checked = true;
        await window.crfvDialog.alert('Keep at least one visible column in the payment audit table.', { tone: 'info' });
        return;
      }

      applyVisibleColumnKeys(Array.from(nextKeys));
      saveColumnPrefs();
      renderColumnPicker();
      renderRecords(state.currentRecords);
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${column.label}`));
    pickerDropdown.appendChild(label);
  });
}

function setupColumnPicker() {
  const pickerButton = document.getElementById('showColumnPickerBtn');
  const pickerDropdown = document.getElementById('columnPickerDropdown');
  if (!pickerButton || !pickerDropdown) {
    return;
  }

  renderColumnPicker();

  pickerButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    pickerDropdown.style.display = pickerDropdown.style.display === 'grid' ? 'none' : 'grid';
  });

  pickerDropdown.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.addEventListener('click', (event) => {
    if (!pickerDropdown.contains(event.target) && event.target !== pickerButton) {
      pickerDropdown.style.display = 'none';
    }
  });
}

async function loadEvents() {
  const response = await fetch('/api/events/all', { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error('Failed to load events.');
  }

  const data = await response.json();
  const events = Array.isArray(data) ? data : data.events || [];
  state.events = [...events].sort((left, right) => String(right.start_date || '').localeCompare(String(left.start_date || '')));

  const requestedEventId = getRequestedEventId();
  if (requestedEventId && state.events.some((event) => event.event_id === requestedEventId)) {
    state.selectedEventId = requestedEventId;
  }

  populateEventFilter();
  updatePaymentReportsLink();
}

async function loadSummary() {
  const params = new URLSearchParams();
  if (state.selectedEventId) {
    params.set('event_id', state.selectedEventId);
  }

  setSummaryStatus(`Loading payment summary for ${getSelectedEventLabel()}...`);

  const response = await fetch(`/api/payment-audits/summary${params.toString() ? `?${params.toString()}` : ''}`, {
    credentials: 'same-origin'
  });

  if (!response.ok) {
    throw new Error('Failed to load payment audit summary.');
  }

  const payload = await response.json();
  renderSummaryCards(payload.summary || {});
  setSummaryStatus(`Showing payment summary for ${getSelectedEventLabel()}.`);
}

function buildRecordsQuery(page) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', document.getElementById('recordsLimit')?.value || '25');

  if (state.selectedEventId) {
    params.set('event_id', state.selectedEventId);
  }

  const search = String(document.getElementById('paymentAuditSearch')?.value || '').trim();
  const paymentStatus = String(document.getElementById('paymentStatusFilter')?.value || '').trim();

  if (search) {
    params.set('search', search);
  }

  if (paymentStatus) {
    params.set('payment_status', paymentStatus);
  }

  return params;
}

async function loadRecords(page = 1) {
  const response = await fetch(`/api/payment-audits/records?${buildRecordsQuery(page).toString()}`, {
    credentials: 'same-origin'
  });

  if (!response.ok) {
    throw new Error('Failed to load payment audit records.');
  }

  const payload = await response.json();
  state.currentPage = page;
  state.currentRecords = payload.records || [];
  state.totalRecordCount = payload.count || 0;
  state.totalPages = payload.totalPages || 1;

  populateStatusFilter(payload.status_options || []);
  renderRecords(state.currentRecords);
  renderRecordsSummary(state.currentRecords.length, state.totalRecordCount);
  renderPagination(page, state.totalPages);
}

function bindFilters() {
  const eventFilter = document.getElementById('eventFilter');
  const clearButton = document.getElementById('clearEventFilterBtn');
  const searchInput = document.getElementById('paymentAuditSearch');
  const statusFilter = document.getElementById('paymentStatusFilter');
  const limitFilter = document.getElementById('recordsLimit');

  eventFilter?.addEventListener('change', async () => {
    state.selectedEventId = eventFilter.value;
    updateEventQueryParam(state.selectedEventId);
    updatePaymentReportsLink();
    try {
      await loadSummary();
      await loadRecords(1);
    } catch (error) {
      console.error(error);
      await window.crfvDialog.alert('Failed to update the payment audit filters.', { tone: 'error' });
    }
  });

  clearButton?.addEventListener('click', async () => {
    state.selectedEventId = '';
    const eventFilterSelect = document.getElementById('eventFilter');
    if (eventFilterSelect) {
      eventFilterSelect.value = '';
    }
    updateEventQueryParam('');
    updatePaymentReportsLink();
    try {
      await loadSummary();
      await loadRecords(1);
    } catch (error) {
      console.error(error);
      await window.crfvDialog.alert('Failed to clear the payment audit filters.', { tone: 'error' });
    }
  });

  searchInput?.addEventListener('input', () => {
    window.clearTimeout(state.searchDebounceId);
    state.searchDebounceId = window.setTimeout(() => {
      loadRecords(1).catch(async (error) => {
        console.error(error);
        await window.crfvDialog.alert('Failed to update payment audit records.', { tone: 'error' });
      });
    }, 250);
  });

  [statusFilter, limitFilter].forEach((element) => {
    element?.addEventListener('change', () => {
      loadRecords(1).catch(async (error) => {
        console.error(error);
        await window.crfvDialog.alert('Failed to update payment audit records.', { tone: 'error' });
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const authorized = await checkAuth();
  if (!authorized) {
    return;
  }

  loadColumnPrefs();
  setupColumnPicker();
  bindFilters();
  renderTableHead();

  try {
    await loadEvents();
    await loadSummary();
    await loadRecords(1);
  } catch (error) {
    console.error(error);
    await window.crfvDialog.alert('Failed to load the payment audits page.', { tone: 'error' });
  }
});
