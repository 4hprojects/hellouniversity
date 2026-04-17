const DEFAULT_COLUMNS = [
  { key: 'attendee_no', label: 'Attendee No' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'organization', label: 'Organization' },
  { key: 'payment_status', label: 'Payment Status' },
  { key: 'amount', label: 'Amount' },
  { key: 'form_of_payment', label: 'Form of Payment' },
  { key: 'date_full_payment', label: 'Date Full Payment' },
  { key: 'date_partial_payment', label: 'Date Partial Payment' },
  { key: 'account', label: 'Account' },
  { key: 'or_number', label: 'OR Number' },
  { key: 'quickbooks_no', label: 'QuickBooks No' },
  { key: 'shipping_tracking_no', label: 'Shipping Tracking No' },
  { key: 'notes', label: 'Notes' },
  { key: 'created_at', label: 'Created At' }
];

const DEFAULT_VISIBLE_KEYS = [
  'attendee_no',
  'last_name',
  'first_name',
  'organization',
  'payment_status',
  'amount',
  'notes'
];

const DETAILS_COLUMN = { key: '_details', label: 'Details' };
const COLUMN_PICKER_KEY = 'paymentReportsColumns';
const EDITABLE_PAYMENT_FIELDS = [
  'payment_status',
  'amount',
  'form_of_payment',
  'date_full_payment',
  'date_partial_payment',
  'account',
  'or_number',
  'quickbooks_no',
  'shipping_tracking_no',
  'notes'
];

let allColumns = [...DEFAULT_COLUMNS];
let visibleColumns = [];
let paymentData = [];
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 25;
let selectedEvent = '';
let statusOptions = new Set();
let currentUserRole = 'manager';

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

function saveColumnPrefs() {
  const keysToSave = visibleColumns
    .filter(column => column.key !== DETAILS_COLUMN.key)
    .map(column => column.key);
  localStorage.setItem(COLUMN_PICKER_KEY, JSON.stringify(keysToSave));
}

function setVisibleColumns(columnKeys) {
  const keys = new Set(columnKeys);
  visibleColumns = allColumns.filter(column => keys.has(column.key));
  visibleColumns.push(DETAILS_COLUMN);
}

function loadColumnPrefs() {
  const storedValue = localStorage.getItem(COLUMN_PICKER_KEY);
  if (!storedValue) {
    setVisibleColumns(DEFAULT_VISIBLE_KEYS);
    return;
  }

  try {
    const parsedKeys = JSON.parse(storedValue);
    if (Array.isArray(parsedKeys) && parsedKeys.length > 0) {
      setVisibleColumns(parsedKeys);
      return;
    }
  } catch (error) {
    console.warn('Failed to parse payment report column preferences.', error);
  }

  setVisibleColumns(DEFAULT_VISIBLE_KEYS);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function isCollectedStatus(value) {
  const status = normalizeStatus(value);
  return status === 'paid' || status === 'fully paid' || status === 'partially paid' || status === 'partial paid';
}

function isReceivableStatus(value) {
  const status = normalizeStatus(value);
  return status === '' || status === 'accounts receivable' || status === 'unpaid' || status === 'pending';
}

function formatCurrency(amount) {
  return (parseFloat(amount) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function setSectionsVisible(isVisible) {
  document.getElementById('filterSection').style.display = isVisible ? '' : 'none';
  document.getElementById('columnPickerSection').style.display = isVisible ? '' : 'none';
  document.getElementById('paymentTableContainer').style.display = isVisible ? '' : 'none';
  if (!isVisible) {
    document.getElementById('paymentSummary').style.display = 'none';
  }
}

async function loadCurrentUserRole() {
  try {
    const response = await fetch('/api/check-auth', { credentials: 'same-origin' });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    const role = String(data?.user?.role || '').trim().toLowerCase();
    if (role === 'admin' || role === 'manager') {
      currentUserRole = role;
    }
  } catch (error) {
    console.warn('Unable to determine the current user role for payment reports.', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  loadColumnPrefs();
  setupColumnPicker();
  setupFilters();
  setupExportButtons();
  setupModalCloseHandlers();
  await loadCurrentUserRole();
  await loadEvents();
});

async function loadEvents() {
  const eventSelect = document.getElementById('eventSelect');
  if (!eventSelect) {
    return;
  }

  const requestedEventId = getRequestedEventId();

  eventSelect.disabled = true;
  eventSelect.innerHTML = '<option value="">Loading events...</option>';

  try {
    const response = await fetch('/api/events/all', { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error('Failed to load events.');
    }

    const data = await response.json();
    const events = Array.isArray(data) ? data : data.events || [];

    eventSelect.innerHTML = '<option value="">-- Select an Event --</option>';
    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.event_id;
      option.textContent = `${event.event_name} (${event.start_date})`;
      eventSelect.appendChild(option);
    });

    eventSelect.disabled = false;

    if (requestedEventId && events.some(event => event.event_id === requestedEventId)) {
      eventSelect.value = requestedEventId;
      selectedEvent = requestedEventId;
      try {
        await loadPayments(selectedEvent);
        setSectionsVisible(true);
      } catch (loadError) {
        console.error('Unable to auto-load requested payment report event.', loadError);
        setSectionsVisible(false);
      }
    }
  } catch (error) {
    console.error('Unable to load payment report events.', error);
    eventSelect.innerHTML = '<option value="">Unable to load events</option>';
  }

  eventSelect.onchange = async () => {
    selectedEvent = eventSelect.value;
    updateEventQueryParam(selectedEvent);
    if (!selectedEvent) {
      paymentData = [];
      filteredData = [];
      renderStatusFilter();
      renderSummary();
      renderTable();
      setSectionsVisible(false);
      return;
    }

    try {
      await loadPayments(selectedEvent);
      setSectionsVisible(true);
    } catch (error) {
      console.error('Unable to load payment data.', error);
      await window.crfvDialog.alert('Failed to load payment records for the selected event.', { tone: 'error' });
      setSectionsVisible(false);
    }
  };
}

async function loadPayments(eventId) {
  const response = await fetch(`/api/payments-report?event_id=${encodeURIComponent(eventId)}`, {
    credentials: 'same-origin'
  });

  if (!response.ok) {
    throw new Error('Failed to load payment records.');
  }

  const data = await response.json();
  paymentData = Array.isArray(data) ? data : [];
  statusOptions = new Set(
    paymentData
      .map(row => String(row.payment_status || '').trim())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
  );
  currentPage = 1;
  renderStatusFilter();
  applyFilters();
}

function setupColumnPicker() {
  const pickerButton = document.getElementById('showColumnPickerBtn');
  const pickerDropdown = document.getElementById('columnPickerDropdown');
  if (!pickerButton || !pickerDropdown) {
    return;
  }

  const renderPickerOptions = () => {
    pickerDropdown.innerHTML = '';
    allColumns.forEach(column => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = column.key;
      checkbox.checked = visibleColumns.some(visibleColumn => visibleColumn.key === column.key);
      checkbox.addEventListener('change', () => {
        const nextKeys = new Set(
          visibleColumns
            .filter(visibleColumn => visibleColumn.key !== DETAILS_COLUMN.key)
            .map(visibleColumn => visibleColumn.key)
        );
        if (checkbox.checked) {
          nextKeys.add(column.key);
        } else {
          nextKeys.delete(column.key);
        }
        setVisibleColumns(Array.from(nextKeys));
        saveColumnPrefs();
        renderPickerOptions();
        renderTable();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(` ${column.label}`));
      pickerDropdown.appendChild(label);
    });
  };

  renderPickerOptions();

  pickerButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    pickerDropdown.style.display = pickerDropdown.style.display === 'grid' ? 'none' : 'grid';
  });

  pickerDropdown.addEventListener('click', event => {
    event.stopPropagation();
  });

  document.addEventListener('click', event => {
    if (!pickerDropdown.contains(event.target) && event.target !== pickerButton) {
      pickerDropdown.style.display = 'none';
    }
  });
}

function setupFilters() {
  const paymentSearch = document.getElementById('paymentSearch');
  const statusFilter = document.getElementById('statusFilter');

  if (paymentSearch) {
    paymentSearch.addEventListener('input', () => {
      currentPage = 1;
      applyFilters();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentPage = 1;
      applyFilters();
    });
  }
}

function renderStatusFilter() {
  const statusFilter = document.getElementById('statusFilter');
  if (!statusFilter) {
    return;
  }

  const previousValue = statusFilter.value;
  statusFilter.innerHTML = '<option value="">All Statuses</option>';

  Array.from(statusOptions).forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    statusFilter.appendChild(option);
  });

  if (previousValue && statusOptions.has(previousValue)) {
    statusFilter.value = previousValue;
  }
}

function applyFilters() {
  const searchValue = String(document.getElementById('paymentSearch')?.value || '').toLowerCase();
  const statusValue = String(document.getElementById('statusFilter')?.value || '');

  filteredData = paymentData.filter(row => {
    let isMatch = true;

    if (searchValue) {
      isMatch = visibleColumns.some(column => {
        if (column.key === DETAILS_COLUMN.key) {
          return false;
        }
        return String(row[column.key] || '').toLowerCase().includes(searchValue);
      });
    }

    if (isMatch && statusValue) {
      isMatch = String(row.payment_status || '') === statusValue;
    }

    return isMatch;
  });

  renderSummary();
  renderTable();
}

function renderTable() {
  const tableHead = document.getElementById('paymentTableHead');
  const tableBody = document.getElementById('paymentTableBody');
  if (!tableHead || !tableBody) {
    return;
  }

  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  visibleColumns.forEach(column => {
    const headerCell = document.createElement('th');
    headerCell.textContent = column.label;
    tableHead.appendChild(headerCell);
  });

  const totalRows = filteredData.length;
  const totalPages = rowsPerPage === 'All' ? 1 : Math.max(1, Math.ceil(totalRows / rowsPerPage));
  currentPage = Math.min(currentPage, totalPages);
  const startIndex = rowsPerPage === 'All' ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = rowsPerPage === 'All' ? totalRows : startIndex + rowsPerPage;
  const pageRows = filteredData.slice(startIndex, endIndex);

  if (pageRows.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = visibleColumns.length;
    cell.textContent = 'No payment records found.';
    row.appendChild(cell);
    tableBody.appendChild(row);
  } else {
    pageRows.forEach(rowData => {
      const row = document.createElement('tr');
      visibleColumns.forEach(column => {
        const cell = document.createElement('td');
        if (column.key === DETAILS_COLUMN.key) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Details';
          button.addEventListener('click', () => openDetailsModal(rowData));
          cell.appendChild(button);
        } else {
          cell.textContent = rowData[column.key] || '';
        }
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
  }

  renderPagination(totalRows, totalPages);
}

function renderPagination(totalRows, totalPages) {
  const pagination = document.getElementById('paymentPagination');
  if (!pagination) {
    return;
  }

  pagination.innerHTML = '';

  const rowsPerPageLabel = document.createTextNode('Rows per page: ');
  const rowsPerPageSelect = document.createElement('select');
  [25, 50, 100, 'All'].forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    if (rowsPerPage === value) {
      option.selected = true;
    }
    rowsPerPageSelect.appendChild(option);
  });

  rowsPerPageSelect.addEventListener('change', () => {
    rowsPerPage = rowsPerPageSelect.value === 'All' ? 'All' : parseInt(rowsPerPageSelect.value, 10);
    currentPage = 1;
    renderTable();
  });

  pagination.appendChild(rowsPerPageLabel);
  pagination.appendChild(rowsPerPageSelect);

  if (rowsPerPage !== 'All' && totalPages > 1) {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const pageButton = document.createElement('button');
      pageButton.type = 'button';
      pageButton.textContent = pageNumber;
      pageButton.disabled = pageNumber === currentPage;
      pageButton.addEventListener('click', () => {
        currentPage = pageNumber;
        renderTable();
      });
      pagination.appendChild(pageButton);
    }
  }

  pagination.appendChild(document.createTextNode(` (${totalRows} records)`));
}

function renderSummary() {
  const summary = document.getElementById('paymentSummary');
  if (!summary) {
    return;
  }

  if (!filteredData.length) {
    summary.style.display = 'none';
    summary.innerHTML = '';
    return;
  }

  let totalCollected = 0;
  let accountsReceivable = 0;
  const statusCounts = {};

  filteredData.forEach(row => {
    const amount = parseFloat(row.amount) || 0;
    if (isCollectedStatus(row.payment_status)) {
      totalCollected += amount;
    } else if (isReceivableStatus(row.payment_status)) {
      accountsReceivable += amount;
    } else {
      accountsReceivable += amount;
    }

    const status = String(row.payment_status || 'Unspecified');
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  summary.style.display = '';
  summary.innerHTML = `
    <div>
      <strong>Total Collected:</strong> PHP ${formatCurrency(totalCollected)} | 
      <strong>Accounts Receivable:</strong> PHP ${formatCurrency(accountsReceivable)} | 
      ${Object.entries(statusCounts).map(([status, count]) => `
        <a href="#" class="status-summary" data-status="${escapeHtml(status)}">${escapeHtml(status)}: ${count}</a>
      `).join(' | ')}
    </div>
  `;

  summary.querySelectorAll('.status-summary').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const statusFilter = document.getElementById('statusFilter');
      if (statusFilter) {
        statusFilter.value = link.dataset.status;
        currentPage = 1;
        applyFilters();
      }
    });
  });
}

function setupExportButtons() {
  const exportXlsxButton = document.getElementById('exportXLSXBtn');
  const exportPdfButton = document.getElementById('exportPDFBtn');

  if (exportXlsxButton) {
    exportXlsxButton.addEventListener('click', async () => {
      const exportAll = await window.crfvDialog.confirm(
        "Export ALL records? Click 'Cancel' to export only filtered data.",
        {
          title: 'Confirm export',
          confirmLabel: 'Export all',
          cancelLabel: 'Export filtered'
        }
      );
      const dataToExport = exportAll ? paymentData : filteredData;
      if (!dataToExport.length) {
        await window.crfvDialog.alert('No data to export.', { tone: 'info' });
        return;
      }

      const exportColumns = visibleColumns.filter(column => column.key !== DETAILS_COLUMN.key);
      const headers = exportColumns.map(column => column.label);
      const rows = dataToExport.map(row =>
        exportColumns.map(column => row[column.key] || '')
      );
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
      XLSX.writeFile(workbook, 'payment_report.xlsx');
      void logAuditTrail('EXPORT_PAYMENT_REPORT_XLSX');
    });
  }

  if (exportPdfButton) {
    exportPdfButton.addEventListener('click', async () => {
      const exportAll = await window.crfvDialog.confirm(
        "Export ALL records? Click 'Cancel' to export only filtered data.",
        {
          title: 'Confirm export',
          confirmLabel: 'Export all',
          cancelLabel: 'Export filtered'
        }
      );
      const dataToExport = exportAll ? paymentData : filteredData;
      if (!dataToExport.length) {
        await window.crfvDialog.alert('No data to export.', { tone: 'info' });
        return;
      }

      const exportColumns = visibleColumns.filter(column => column.key !== DETAILS_COLUMN.key);
      const headers = exportColumns.map(column => column.label);
      const rows = dataToExport.map(row =>
        exportColumns.map(column => row[column.key] || '')
      );

      const { jsPDF } = window.jspdf;
      const documentPdf = new jsPDF({ orientation: 'landscape' });
      documentPdf.text('Payment Report', 14, 12);
      documentPdf.autoTable({
        head: [headers],
        body: rows,
        startY: 18,
        styles: { fontSize: 8 }
      });
      documentPdf.save('payment_report.pdf');
      void logAuditTrail('EXPORT_PAYMENT_REPORT_PDF');
    });
  }
}

function logAuditTrail(action, details = '') {
  return fetch('/api/audit-trail', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, details })
  }).catch(error => {
    console.warn('Failed to write payment report audit log.', error);
  });
}

function setupModalCloseHandlers() {
  const modal = document.getElementById('detailsModal');
  const cancelButton = document.getElementById('cancelDetailsBtn');
  const closeButton = document.getElementById('closeModalBtn');

  if (cancelButton) {
    cancelButton.addEventListener('click', closeDetailsModal);
  }
  if (closeButton) {
    closeButton.addEventListener('click', closeDetailsModal);
  }
  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        closeDetailsModal();
      }
    });
  }
}

function closeDetailsModal() {
  const modal = document.getElementById('detailsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function buildPaymentUpdatePayload(form) {
  const formData = new FormData(form);
  const payload = {};
  EDITABLE_PAYMENT_FIELDS.forEach(field => {
    let value = formData.get(field);
    if (typeof value === 'string') {
      value = value.trim();
    }
    payload[field] = value === '' ? null : value;
  });
  return payload;
}

function openDetailsModal(row) {
  const modal = document.getElementById('detailsModal');
  const form = document.getElementById('detailsForm');
  const saveButton = document.getElementById('saveDetailsBtn');
  const deleteButton = document.getElementById('deleteDetailsBtn');
  if (!modal || !form || !saveButton || !deleteButton) {
    return;
  }

  form.reset();
  Array.from(form.elements).forEach(element => {
    if (element.name && Object.prototype.hasOwnProperty.call(row, element.name)) {
      element.value = row[element.name] || '';
    }
  });

  deleteButton.style.display =
    currentUserRole === 'admin' || currentUserRole === 'manager' ? '' : 'none';

  saveButton.onclick = async () => {
    if (!await window.crfvDialog.confirm('Save changes to this payment record?', {
      title: 'Confirm action',
      confirmLabel: 'Save'
    })) {
      return;
    }

    try {
      const payload = buildPaymentUpdatePayload(form);
      const response = await fetch(`/api/payments-report/${encodeURIComponent(row.payment_id)}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Error saving changes.');
      }

      await window.crfvDialog.alert('Payment record saved.', { tone: 'success' });
      closeDetailsModal();
      await loadPayments(selectedEvent);
    } catch (error) {
      console.error('Failed to save payment report details.', error);
      await window.crfvDialog.alert(error.message || 'Error saving changes.', { tone: 'error' });
    }
  };

  deleteButton.onclick = async () => {
    if (!await window.crfvDialog.confirm('Delete this payment record?', {
      title: 'Confirm action',
      confirmLabel: 'Delete',
      destructive: true
    })) {
      return;
    }

    try {
      const response = await fetch(`/api/payments-report/${encodeURIComponent(row.payment_id)}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Error deleting record.');
      }

      await window.crfvDialog.alert('Payment record deleted.', { tone: 'success' });
      closeDetailsModal();
      await loadPayments(selectedEvent);
    } catch (error) {
      console.error('Failed to delete payment report details.', error);
      await window.crfvDialog.alert(error.message || 'Error deleting record.', { tone: 'error' });
    }
  };

  modal.style.display = 'flex';
}
