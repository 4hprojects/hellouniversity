// --- Logout Button Event ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/crfv/index';
  };
}


// --- Clock Update ---
function updateClock() {
  const clock = document.getElementById('clock');
  if (clock) {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    clock.textContent = now.toLocaleString(undefined, options);
  }
}
setInterval(updateClock, 1000);
updateClock();

// --- Authentication Check ---
async function checkAuth() {
  try {
    const res = await fetch('/api/check-auth', { credentials: 'same-origin' });
    if (!res.ok) {
      window.location.href = '/crfv/index';
      return false;
    }
    const data = await res.json().catch(() => ({}));
    const role = String(data?.user?.role || '').toLowerCase();
    const allowedRole = role === 'admin' || role === 'manager';
    if (!data?.authenticated || !allowedRole) {
      window.location.href = '/crfv/index';
      return false;
    }
    return true;
  } catch (err) {
    window.location.href = '/crfv/index';
    return false;
  }
}

// --- Main Load ---
document.addEventListener('DOMContentLoaded', async function() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;
  reloadLogs();
});

// --- Fetch and Render Audit Logs ---
async function loadAuditLogs(page = 1, search = '', limit = 50, dateFrom = '', dateTo = '') {
  showSpinner(true);
  let query = `/api/audit-trail?page=${page}&search=${encodeURIComponent(search)}&limit=${limit}`;
  if (dateFrom) query += `&dateFrom=${dateFrom}`;
  if (dateTo) query += `&dateTo=${dateTo}`;
  try {
    const res = await fetch(query, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed to fetch logs');
    let payload = await res.json();
    let logs, totalPages, count;
    if (Array.isArray(payload)) {
      logs = payload;
      totalPages = 1;
      count = payload.length;
    } else {
      logs = payload.logs || [];
      totalPages = payload.totalPages || 1;
      count = payload.count || 0;
    }
    renderLogsTable(logs);
    renderLogsPagination(page, totalPages, search, limit, dateFrom, dateTo, 'logsPagination');
    renderLogsPagination(page, totalPages, search, limit, dateFrom, dateTo, 'inlinePagination');
    renderLogsResultsSummary(logs.length, count, search, dateFrom, dateTo);
  } catch (err) {
    console.error('Error:', err);
    renderLogsTable([]);
    document.getElementById('logsPagination').innerHTML = '<span style="color:red;">Error loading logs.</span>';
  } finally {
    showSpinner(false);
  }
}

let sortField = null;
let sortOrder = null; // 'asc', 'desc', or null

function sortLogs(logs) {
  if (!sortField || !sortOrder) return logs;
  return [...logs].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    // For date, compare as Date objects
    if (sortField === 'action_time') {
      valA = new Date(valA.replace(/\.\d{6}/, ''));
      valB = new Date(valB.replace(/\.\d{6}/, ''));
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

// --- Render Logs Table ---
function renderLogsTable(logs) {
  const tbody = document.querySelector('#logs-table tbody');
  if (!tbody) {
    console.error('Table body not found!');
    return;
  }
  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No logs found.</td></tr>`;
    return;
  }
  const sortedLogs = sortLogs(logs);
  tbody.innerHTML = sortedLogs.map(log => `
    <tr>
      <td>${log.user_name || ''}</td>
      <td>${log.user_role || ''}</td>
      <td>${log.action || ''}</td>
      <td>${
        log.action_time
          ? new Date(log.action_time.replace(/\.\d{6}/, '')).toLocaleString()
          : ''
      }</td>
      <td>${log.ip_address || ''}</td>
      <td>${log.details || ''}</td>
    </tr>
  `).join('');
  updateSortIcons();
  window.currentLogs = logs; // Store for export
}

function updateSortIcons() {
  document.querySelectorAll('#logs-table th.sortable').forEach(th => {
    const field = th.getAttribute('data-field');
    const icon = th.querySelector('span');
    if (sortField === field) {
      icon.textContent = sortOrder === 'asc' ? '\\u25b2' : sortOrder === 'desc' ? '\\u25bc' : '';
    } else {
      icon.textContent = '';
    }
  });
}

// Add event listeners for sorting
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('#logs-table th.sortable').forEach(th => {
    th.addEventListener('click', function() {
      const field = th.getAttribute('data-field');
      if (sortField !== field) {
        sortField = field;
        sortOrder = 'asc';
      } else if (sortOrder === 'asc') {
        sortOrder = 'desc';
      } else if (sortOrder === 'desc') {
        sortOrder = null;
        sortField = null;
      } else {
        sortOrder = 'asc';
      }
      reloadLogs(); // Will re-render table with new sort
    });
  });
});

// --- Render Pagination Controls ---
function renderLogsPagination(current, total, search, limit, dateFrom, dateTo, containerId) {
  const pag = document.getElementById(containerId);
  if (!pag) return;
  pag.innerHTML = `
    <button class="btn pagination-btn" ${current <= 1 ? 'disabled' : ''} onclick="reloadLogs(${current-1})" aria-label="Previous Page">
      <i class="material-icons" aria-hidden="true">chevron_left</i> Prev
    </button>
    <span style="margin: 0 1em; font-weight: 500;">Page ${current} of ${total}</span>
    <button class="btn pagination-btn" ${current >= total ? 'disabled' : ''} onclick="reloadLogs(${current+1})" aria-label="Next Page">
      Next <i class="material-icons" aria-hidden="true">chevron_right</i>
    </button>
  `;
}

// --- Results Summary ---
function renderLogsResultsSummary(displayed, total, search, dateFrom, dateTo) {
  const el = document.getElementById('logsResultsSummary');
  if (!el) return;
  let msg = `Showing ${displayed} of ${total} results`;
  if (search) msg += ` for "<b>${search}</b>"`;
  if (dateFrom && dateTo) msg += ` from <b>${dateFrom}</b> to <b>${dateTo}</b>`;
  else if (dateFrom) msg += ` from <b>${dateFrom}</b> to present`;
  else if (dateTo) msg += ` up to <b>${dateTo}</b>`;
  el.innerHTML = msg;
}

// --- Spinner Utility ---
function showSpinner(show) {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = show ? 'block' : 'none';
}

// --- Expose loadAuditLogs for pagination buttons ---
window.reloadLogs = reloadLogs;

// --- Event Listeners for Filters ---
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchLogs');
  const limitSelect = document.getElementById('logsLimit');
  const dateFromInput = document.getElementById('dateFrom');
  const dateToInput = document.getElementById('dateTo');

  if (searchInput) searchInput.addEventListener('input', () => reloadLogs(1));
  if (limitSelect) limitSelect.addEventListener('change', () => reloadLogs(1));
  if (dateFromInput) dateFromInput.addEventListener('change', () => reloadLogs(1));
  if (dateToInput) dateToInput.addEventListener('change', () => reloadLogs(1));
});

// --- Reload Logs Utility ---
function reloadLogs(page = 1) {
  const search = document.getElementById('searchLogs').value;
  let limit = document.getElementById('logsLimit').value;
  if (limit === 'all') limit = 1000000;
  let dateFrom = document.getElementById('dateFrom').value;
  let dateTo = document.getElementById('dateTo').value;

  // If both dates are the same, set full day range
  if (dateFrom && dateTo && dateFrom === dateTo) {
    dateFrom = dateFrom + 'T00:00:00';
    dateTo = dateTo + 'T23:59:59.999';
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    alert('Start date cannot be after end date.');
    return;
  }

  loadAuditLogs(page, search, limit, dateFrom, dateTo);
}

// --- Export Button Event ---
document.getElementById('exportBtn').onclick = async function() {
  const exportType = document.getElementById('exportType').value;
  let logs = [];

  if (exportType === 'all') {
    // Fetch all logs (ignore filters)
    const res = await fetch('/api/audit-trail?limit=1000000', { credentials: 'same-origin' });
    const { logs: allLogs } = await res.json();
    logs = allLogs;
  } else {
    // Use currently filtered logs (from last fetch)
    logs = window.currentLogs || [];
  }

  if (!logs.length) {
    alert('No data to export.');
    return;
  }

  // Export to XLSX
  const worksheet = XLSX.utils.json_to_sheet(logs);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");
  XLSX.writeFile(workbook, "audit_logs.xlsx");
};

