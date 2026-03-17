// --- Config ---
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

const COLUMN_PICKER_KEY = 'paymentReportsColumns';

// --- State ---
let allColumns = [...DEFAULT_COLUMNS];
let visibleColumns = [];
let paymentData = [];
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 25;
let selectedEvent = '';
let statusOptions = new Set();

// --- Helpers ---
function saveColumnPrefs() {
  localStorage.setItem(COLUMN_PICKER_KEY, JSON.stringify(visibleColumns.map(c => c.key)));
}
function loadColumnPrefs() {
  visibleColumns = allColumns.filter(c => DEFAULT_VISIBLE_KEYS.includes(c.key));
  // Add a fake column for Details button
  visibleColumns.push({ key: '_details', label: 'Details' });
}

// --- UI Setup ---
document.addEventListener('DOMContentLoaded', async () => {
  loadColumnPrefs();
  await loadEvents();
  //setupColumnPicker();
  setupFilters();
  setupExportButtons();
});

// --- Event Selector ---
async function loadEvents() {
  const sel = document.getElementById('eventSelect');
  sel.innerHTML = `<option value="">-- Select an Event --</option>`;
  const res = await fetch('/api/events/all'); // <-- changed endpoint
  const data = await res.json();
  const events = Array.isArray(data) ? data : data.events || [];
  events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.event_id;
    opt.textContent = `${ev.event_name} (${ev.start_date})`;
    sel.appendChild(opt);
  });
  sel.onchange = async function() {
    selectedEvent = sel.value;
    if (selectedEvent) {
      await loadPayments(selectedEvent);
      document.getElementById('filterSection').style.display = '';
      document.getElementById('columnPickerSection').style.display = '';
      document.getElementById('paymentTableContainer').style.display = '';
    } else {
      document.getElementById('filterSection').style.display = 'none';
      document.getElementById('columnPickerSection').style.display = 'none';
      document.getElementById('paymentTableContainer').style.display = 'none';
      document.getElementById('paymentSummary').style.display = 'none';
    }
  };
}

// --- Load Payments ---
async function loadPayments(eventId) {
  const res = await fetch(`/api/payments-report?event_id=${encodeURIComponent(eventId)}`);
  paymentData = await res.json();
  statusOptions = new Set(paymentData.map(p => p.payment_status).filter(Boolean));
  currentPage = 1;
  applyFilters();
  renderStatusFilter();
}

// --- Column Picker ---
function setupColumnPicker() {
  const picker = document.getElementById('columnPicker');
  picker.innerHTML = '';
  allColumns.forEach(col => {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = col.key;
    cb.checked = visibleColumns.some(c => c.key === col.key);
    cb.onchange = () => {
      if (cb.checked) {
        visibleColumns.push(col);
      } else {
        visibleColumns = visibleColumns.filter(c => c.key !== col.key);
      }
      saveColumnPrefs();
      renderTable();
    };
    const label = document.createElement('label');
    label.style.marginRight = '12px';
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + col.label));
    picker.appendChild(label);
  });
}

// --- Filters/Search ---
function setupFilters() {
  document.getElementById('paymentSearch').oninput = () => {
    currentPage = 1;
    applyFilters();
  };
  document.getElementById('statusFilter').onchange = () => {
    currentPage = 1;
    applyFilters();
  };
}

function renderStatusFilter() {
  const sel = document.getElementById('statusFilter');
  const prev = sel.value;
  sel.innerHTML = `<option value="">All Statuses</option>`;
  Array.from(statusOptions).forEach(status => {
    const opt = document.createElement('option');
    opt.value = status;
    opt.textContent = status;
    sel.appendChild(opt);
  });
  sel.value = prev;
}

// --- Filtering & Pagination ---
function applyFilters() {
  const search = document.getElementById('paymentSearch').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;
  filteredData = paymentData.filter(row => {
    let match = true;
    if (search) {
      match = visibleColumns.some(col => (row[col.key] || '').toString().toLowerCase().includes(search));
    }
    if (match && status) {
      match = row.payment_status === status;
    }
    return match;
  });
  renderSummary();
  renderTable();
}

// --- Table Rendering ---
function renderTable() {
  const head = document.getElementById('paymentTableHead');
  const body = document.getElementById('paymentTableBody');
  head.innerHTML = '';
  body.innerHTML = '';
  // Render headers
  visibleColumns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    head.appendChild(th);
  });
  // Pagination
  const totalRows = filteredData.length;
  const totalPages = rowsPerPage === 'All' ? 1 : Math.ceil(totalRows / rowsPerPage);
  const startIdx = rowsPerPage === 'All' ? 0 : (currentPage - 1) * rowsPerPage;
  const endIdx = rowsPerPage === 'All' ? totalRows : startIdx + rowsPerPage;
  const pageRows = filteredData.slice(startIdx, endIdx);
  // Render rows
  pageRows.forEach(row => {
    const tr = document.createElement('tr');
    visibleColumns.forEach(col => {
      const td = document.createElement('td');
      if (col.key === '_details') {
        const btn = document.createElement('button');
        btn.textContent = 'Details';
        btn.onclick = () => openDetailsModal(row);
        td.appendChild(btn);
      } else {
        td.textContent = row[col.key] || '';
      }
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
  renderPagination(totalRows, totalPages);
}

// --- Pagination Controls ---
function renderPagination(totalRows, totalPages) {
  const pag = document.getElementById('paymentPagination');
  pag.innerHTML = '';
  // Rows per page selector
  const rppSel = document.createElement('select');
  [25, 50, 100, 'All'].forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (rowsPerPage == opt) o.selected = true;
    rppSel.appendChild(o);
  });
  rppSel.onchange = () => {
    rowsPerPage = rppSel.value === 'All' ? 'All' : parseInt(rppSel.value, 10);
    currentPage = 1;
    renderTable();
  };
  pag.appendChild(document.createTextNode('Rows per page: '));
  pag.appendChild(rppSel);

  // Page controls
  if (rowsPerPage !== 'All' && totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.disabled = i === currentPage;
      btn.onclick = () => {
        currentPage = i;
        renderTable();
      };
      pag.appendChild(btn);
    }
  }
  pag.appendChild(document.createTextNode(` (${totalRows} records)`));
}

// --- Summary Section ---
function renderSummary() {
  const summaryDiv = document.getElementById('paymentSummary');
  if (!filteredData.length) {
    summaryDiv.style.display = 'none';
    summaryDiv.innerHTML = '';
    return;
  }
  summaryDiv.style.display = '';
  // Calculate totals
  let totalCollected = 0;
  let accountsReceivable = 0;
  const statusCounts = {};
  filteredData.forEach(row => {
    const amt = parseFloat(row.amount) || 0;
    if (row.payment_status && row.payment_status.toLowerCase() === 'paid') {
      totalCollected += amt;
    } else {
      accountsReceivable += amt;
    }
    statusCounts[row.payment_status] = (statusCounts[row.payment_status] || 0) + 1;
  });
  // Render summary
  summaryDiv.innerHTML = `
    <div>
      <strong>Total Collected:</strong> ₱${totalCollected.toLocaleString()} &nbsp; | &nbsp;
      <strong>Accounts Receivable:</strong> ₱${accountsReceivable.toLocaleString()} &nbsp; | &nbsp;
      ${Object.entries(statusCounts).map(([status, count]) =>
        `<a href="#" class="status-summary" data-status="${status}">${status}: ${count}</a>`
      ).join(' &nbsp; | &nbsp; ')}
    </div>
  `;
  // Clickable status filters
  summaryDiv.querySelectorAll('.status-summary').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      document.getElementById('statusFilter').value = a.dataset.status;
      applyFilters();
    };
  });
}

// --- Export Buttons ---
function setupExportButtons() {
  document.getElementById('exportXLSXBtn').onclick = () => {
    const exportAll = confirm("Export ALL records? Click 'Cancel' to export only filtered/visible data.");
    const dataToExport = exportAll ? paymentData : filteredData;
    if (!dataToExport.length) {
      alert('No data to export.');
      return;
    }
    const headers = visibleColumns.map(col => col.label);
    const rows = dataToExport.map(row =>
      visibleColumns.map(col => row[col.key] || '')
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, "payment_report.xlsx");
    logAuditTrail('EXPORT_PAYMENT_REPORT_XLSX');
  };

  document.getElementById('exportPDFBtn').onclick = () => {
    const exportAll = confirm("Export ALL records? Click 'Cancel' to export only filtered/visible data.");
    const dataToExport = exportAll ? paymentData : filteredData;
    if (!dataToExport.length) {
      alert('No data to export.');
      return;
    }
    const headers = visibleColumns.map(col => col.label);
    const rows = dataToExport.map(row =>
      visibleColumns.map(col => row[col.key] || '')
    );
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Payment Report", 14, 12);
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 18,
      styles: { fontSize: 8 }
    });
    doc.save("payment_report.pdf");
    logAuditTrail('EXPORT_PAYMENT_REPORT_PDF');
  };
}

// Helper to log audit trail (call your backend)
function logAuditTrail(action) {
  fetch('/api/audit-trail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
}

// --- Details Modal Logic ---
// Example: get user role from a global variable or session (set this on page load)
let currentUserRole = window.currentUserRole || 'user'; // 'admin', 'manager', or 'user'

// Open modal and populate fields
function openDetailsModal(row) {
  const modal = document.getElementById('detailsModal');
  const form = document.getElementById('detailsForm');
  // Populate fields
  for (const el of form.elements) {
    if (el.name && row.hasOwnProperty(el.name)) {
      el.value = row[el.name] || '';
    }
  }
  // Show/hide Delete button based on role
  document.getElementById('deleteDetailsBtn').style.display =
    (currentUserRole === 'admin' || currentUserRole === 'manager') ? '' : 'none';
  modal.style.display = 'flex';

  // Save handler
  document.getElementById('saveDetailsBtn').onclick = async function() {
    if (!confirm('Save changes to this payment record?')) return;
    const formData = Object.fromEntries(new FormData(form).entries());
    // Send update to backend (adjust endpoint as needed)
    const res = await fetch(`/api/payments-report/${row.payment_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      alert('Saved!');
      modal.style.display = 'none';
      await loadPayments(selectedEvent);
    } else {
      alert('Error saving changes.');
    }
  };

  // Delete handler
  document.getElementById('deleteDetailsBtn').onclick = async function() {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    const res = await fetch(`/api/payments-report/${row.payment_id}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Deleted!');
      modal.style.display = 'none';
      await loadPayments(selectedEvent);
    } else {
      alert('Error deleting record.');
    }
  };

  // Cancel/close handlers
  document.getElementById('cancelDetailsBtn').onclick =
  document.getElementById('closeModalBtn').onclick = function() {
    modal.style.display = 'none';
  };
}