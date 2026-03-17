let events = [];
let attendees = [];
let filteredAttendees = [];
let selectedRows = new Set();
let currentPage = 1;
let rowsPerPage = '50';
let sortColumn = null;
let sortAsc = true;
 
// --- Fetch Events ---
async function fetchEvents() {
  const res = await fetch('/api/attendance-summary/all-events');
  const { events: eventList } = await res.json();
  events = eventList || [];
  const dropdown = document.getElementById('eventDropdown');
  dropdown.innerHTML = events.map(ev =>
    `<option value="${ev.event_id}">${ev.event_name}</option>`
  ).join('');
}

// --- Fetch Attendance Summary ---
async function fetchDataForEvent(eventId) {
  const selectedDate = document.getElementById('attendanceDate').value;
  if (!eventId || !selectedDate) return;
  try {
    const res = await fetch(`/api/attendance-summary?event_id=${eventId}&date=${selectedDate}`);
    if (!res.ok) throw new Error('API error: ' + res.status);
    const data = await res.json();
    attendees = data.summary || [];
    filterAndRender();
    showNoRecordsMessage(attendees.length === 0);
  } catch (err) {
    console.error('Failed to fetch attendance summary:', err);
    attendees = [];
    filterAndRender();
    showNoRecordsMessage(true);
  }
}

// --- Filter, Search, and Render Table ---
function filterAndRender() {
  const search = document.getElementById('attendanceSearch').value.toLowerCase();
  filteredAttendees = attendees.filter(a =>
    [a.attendee_no, a.first_name, a.last_name, a.event_name, a.email]
      .map(val => (val || '').toString().toLowerCase())
      .some(val => val.includes(search))
  );
  renderCounters();
  renderTable();
  renderPagination();
}

function showNoRecordsMessage(show) {
  const label = document.getElementById('noRecordsLabel');
  label.style.display = show ? 'block' : 'none';
}

// --- Render Counters ---
function renderCounters() {
  document.getElementById('countTotalAttendees').textContent = attendees.length;
  let amIn = 0, amOut = 0, pmIn = 0, pmOut = 0;
  attendees.forEach(a => {
    if (a.am_in) amIn++;
    if (a.am_out) amOut++;
    if (a.pm_in) pmIn++;
    if (a.pm_out) pmOut++;
  });
  document.getElementById('countAMIn').textContent = amIn;
  document.getElementById('countAMOut').textContent = amOut;
  document.getElementById('countPMIn').textContent = pmIn;
  document.getElementById('countPMOut').textContent = pmOut;
}

// --- Sort Attendees ---
function sortAttendees(attendees, column, asc) {
  return attendees.sort((a, b) => {
    let valA = a[column] || '';
    let valB = b[column] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  });
}

// --- Render Table ---
function renderTable() {
  const tbody = document.getElementById('attendanceTableBody');
  tbody.innerHTML = '';
  let pageAttendees = filteredAttendees;
  if (sortColumn) {
    pageAttendees = sortAttendees(pageAttendees, sortColumn, sortAsc);
  }
  if (rowsPerPage !== 'all') {
    const start = (currentPage - 1) * parseInt(rowsPerPage);
    pageAttendees = pageAttendees.slice(start, start + parseInt(rowsPerPage));
  }
  pageAttendees.forEach(a => {
    tbody.innerHTML += `
      <tr>
        <td class="checkbox-cell"><input type="checkbox" ${selectedRows.has(a.attendee_no) ? 'checked' : ''} data-id="${a.attendee_no}"></td>
        <td>${a.attendee_no || ''}</td>
        <td>${a.first_name || ''}</td>
        <td>${a.last_name || ''}</td>
        <td>${a.event_name || ''}</td>
        <td>${a.am_in || ''}</td>
        <td>${a.am_out || ''}</td>
        <td>${a.pm_in || ''}</td>
        <td>${a.pm_out || ''}</td>
        <td>${a.date || ''}</td>
        <td>${a.attendance_status || ''}</td>
      </tr>
    `;
  });
  renderSortIndicators();
}

// --- Render Pagination ---
function renderPagination() {
  const total = filteredAttendees.length;
  const pages = rowsPerPage === 'all' ? 1 : Math.ceil(total / parseInt(rowsPerPage));
  document.getElementById('paginationInfo').textContent =
    pages > 1 ? `Page ${currentPage} of ${pages}` : '';
  document.getElementById('prevPageBtn').disabled = currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = currentPage >= pages;
}

// --- Render Sort Indicators ---
function renderSortIndicators() {
  document.querySelectorAll('#attendanceSummaryTable th.sortable').forEach(th => {
    const col = th.getAttribute('data-column');
    let indicator = '';
    if (sortColumn === col) {
      indicator = sortAsc ? ' ▲' : ' ▼';
    }
    th.innerHTML = th.textContent.replace(/ ▲| ▼/, '') + indicator;
  });
}

// --- Event Listeners ---
document.getElementById('eventDropdown').addEventListener('change', function () {
  fetchDataForEvent(this.value);
});

document.getElementById('attendanceSearch').addEventListener('input', filterAndRender);

document.getElementById('paginationSelect').addEventListener('change', function () {
  rowsPerPage = this.value;
  currentPage = 1;
  filterAndRender();
});

document.getElementById('prevPageBtn').addEventListener('click', function () {
  if (currentPage > 1) {
    currentPage--;
    filterAndRender();
  }
});

document.getElementById('nextPageBtn').addEventListener('click', function () {
  const total = filteredAttendees.length;
  const pages = rowsPerPage === 'all' ? 1 : Math.ceil(total / parseInt(rowsPerPage));
  if (currentPage < pages) {
    currentPage++;
    filterAndRender();
  }
});

document.getElementById('selectAllRows').addEventListener('change', function () {
  if (this.checked) {
    filteredAttendees.forEach(a => selectedRows.add(a.attendee_no));
  } else {
    filteredAttendees.forEach(a => selectedRows.delete(a.attendee_no));
  }
  renderTable();
});

document.querySelectorAll('#attendanceSummaryTable th.sortable').forEach(th => {
  th.addEventListener('click', function () {
    const col = th.getAttribute('data-column');
    if (sortColumn === col) {
      sortAsc = !sortAsc;
    } else {
      sortColumn = col;
      sortAsc = true;
    }
    renderTable();
    renderSortIndicators();
  });
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
  sortColumn = 'last_name';
  sortAsc = true;
  fetchEvents().then(() => {
    if (events.length) {
      document.getElementById('eventDropdown').value = events[0].event_id;
      fetchDataForEvent(events[0].event_id);
    }
  });

  const dateInput = document.getElementById('attendanceDate');
  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
  dateInput.addEventListener('change', () => {
    const eventId = document.getElementById('eventDropdown').value;
    fetchDataForEvent(eventId);
  });
});

// --- Export XLSX ---
document.getElementById('exportAttendanceSummaryBtn').onclick = function () {
  const exportOption = document.querySelector('input[name="exportOption"]:checked').value;
  let exportAttendees = exportOption === 'selected'
    ? filteredAttendees.filter(a => selectedRows.has(a.attendee_no))
    : filteredAttendees;

  const headers = [
    'Attendee No', 'First Name', 'Last Name', 'Event Name',
    'AM IN', 'AM OUT', 'PM IN', 'PM OUT', 'Date', 'Attendance Status'
  ];

  const rows = exportAttendees.map(a => [
    a.attendee_no || '',
    a.first_name || '',
    a.last_name || '',
    a.event_name || '',
    a.am_in || '',
    a.am_out || '',
    a.pm_in || '',
    a.pm_out || '',
    a.date || '',
    a.attendance_status || ''
  ]);

  if (typeof XLSX === "undefined") {
    alert("XLSX library not loaded.");
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance Summary");
  XLSX.writeFile(wb, "attendance_summary.xlsx");
};