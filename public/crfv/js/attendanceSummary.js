let events = [];
let attendees = [];
let filteredAttendees = [];
let selectedRows = new Set();
let currentPage = 1;
let rowsPerPage = '50';
let sortColumn = null;
let sortAsc = true;

async function fetchEvents() {
  const response = await fetch('/api/attendance-summary/all-events', { credentials: 'same-origin' });
  const payload = await response.json();
  events = payload.events || [];
  const dropdown = document.getElementById('eventDropdown');
  dropdown.innerHTML = events.map(eventItem =>
    `<option value="${eventItem.event_id}">${eventItem.event_name}</option>`
  ).join('');
}

async function fetchDataForEvent(eventId) {
  const selectedDate = document.getElementById('attendanceDate').value;
  if (!eventId || !selectedDate) {
    return;
  }

  try {
    const response = await fetch(`/api/attendance-summary?event_id=${eventId}&date=${selectedDate}`, {
      credentials: 'same-origin'
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    attendees = data.summary || [];
    filterAndRender();
    showNoRecordsMessage(attendees.length === 0);
  } catch (error) {
    console.error('Failed to fetch attendance summary:', error);
    attendees = [];
    filterAndRender();
    showNoRecordsMessage(true);
  }
}

function filterAndRender() {
  const search = document.getElementById('attendanceSearch').value.toLowerCase();
  filteredAttendees = attendees.filter(attendee =>
    [
      attendee.attendee_no,
      attendee.first_name,
      attendee.last_name,
      attendee.event_name,
      attendee.email,
      attendee.am_in_status,
      attendee.pm_in_status,
      attendee.am_in_late_minutes,
      attendee.pm_in_late_minutes,
      attendee.attendance_status
    ]
      .map(value => (value || '').toString().toLowerCase())
      .some(value => value.includes(search))
  );

  renderCounters();
  renderTable();
  renderPagination();
}

function showNoRecordsMessage(show) {
  const label = document.getElementById('noRecordsLabel');
  label.style.display = show ? 'block' : 'none';
}

function renderCounters() {
  const counts = {
    amIn: 0,
    amOut: 0,
    pmIn: 0,
    pmOut: 0,
    amInOnTime: 0,
    amInLate: 0,
    pmInOnTime: 0,
    pmInLate: 0
  };

  attendees.forEach(attendee => {
    if (attendee.am_in) counts.amIn += 1;
    if (attendee.am_out) counts.amOut += 1;
    if (attendee.pm_in) counts.pmIn += 1;
    if (attendee.pm_out) counts.pmOut += 1;
    if (attendee.am_in_status === 'on_time') counts.amInOnTime += 1;
    if (attendee.am_in_status === 'late') counts.amInLate += 1;
    if (attendee.pm_in_status === 'on_time') counts.pmInOnTime += 1;
    if (attendee.pm_in_status === 'late') counts.pmInLate += 1;
  });

  document.getElementById('countTotalAttendees').textContent = attendees.length;
  document.getElementById('countAMIn').textContent = counts.amIn;
  document.getElementById('countAMOut').textContent = counts.amOut;
  document.getElementById('countPMIn').textContent = counts.pmIn;
  document.getElementById('countPMOut').textContent = counts.pmOut;
  document.getElementById('countAMInOnTime').textContent = counts.amInOnTime;
  document.getElementById('countAMInLate').textContent = counts.amInLate;
  document.getElementById('countPMInOnTime').textContent = counts.pmInOnTime;
  document.getElementById('countPMInLate').textContent = counts.pmInLate;
}

function sortAttendees(rows, column, asc) {
  return rows.sort((left, right) => {
    let leftValue = left[column] || '';
    let rightValue = right[column] || '';
    if (typeof leftValue === 'string') leftValue = leftValue.toLowerCase();
    if (typeof rightValue === 'string') rightValue = rightValue.toLowerCase();
    if (leftValue < rightValue) return asc ? -1 : 1;
    if (leftValue > rightValue) return asc ? 1 : -1;
    return 0;
  });
}

function renderTable() {
  const tbody = document.getElementById('attendanceTableBody');
  tbody.innerHTML = '';
  let pageAttendees = [...filteredAttendees];

  if (sortColumn) {
    pageAttendees = sortAttendees(pageAttendees, sortColumn, sortAsc);
  }

  if (rowsPerPage !== 'all') {
    const start = (currentPage - 1) * parseInt(rowsPerPage, 10);
    pageAttendees = pageAttendees.slice(start, start + parseInt(rowsPerPage, 10));
  }

  pageAttendees.forEach(attendee => {
    tbody.innerHTML += `
      <tr>
        <td class="checkbox-cell"><input type="checkbox" ${selectedRows.has(attendee.attendee_no) ? 'checked' : ''} data-id="${attendee.attendee_no}"></td>
        <td>${attendee.attendee_no || ''}</td>
        <td>${attendee.first_name || ''}</td>
        <td>${attendee.last_name || ''}</td>
        <td>${attendee.event_name || ''}</td>
        <td>${attendee.am_in || ''}</td>
        <td>${formatPunctuality(attendee.am_in_status)}</td>
        <td>${attendee.am_in_late_minutes || 0}</td>
        <td>${attendee.am_out || ''}</td>
        <td>${attendee.pm_in || ''}</td>
        <td>${formatPunctuality(attendee.pm_in_status)}</td>
        <td>${attendee.pm_in_late_minutes || 0}</td>
        <td>${attendee.pm_out || ''}</td>
        <td>${attendee.date || ''}</td>
        <td>${attendee.attendance_status || ''}</td>
      </tr>
    `;
  });

  renderSortIndicators();
}

function renderPagination() {
  const total = filteredAttendees.length;
  const pages = rowsPerPage === 'all' ? 1 : Math.ceil(total / parseInt(rowsPerPage, 10));
  document.getElementById('paginationInfo').textContent = pages > 1 ? `Page ${currentPage} of ${pages}` : '';
  document.getElementById('prevPageBtn').disabled = currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = currentPage >= pages;
}

function renderSortIndicators() {
  document.querySelectorAll('#attendanceSummaryTable th.sortable').forEach(header => {
    const column = header.getAttribute('data-column');
    let indicator = '';
    if (sortColumn === column) {
      indicator = sortAsc ? ' ^' : ' v';
    }
    header.innerHTML = header.textContent.replace(/ \^| v/, '') + indicator;
  });
}

function formatPunctuality(value) {
  if (value === 'on_time') return 'On time';
  if (value === 'late') return 'Late';
  return '';
}

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
    currentPage -= 1;
    filterAndRender();
  }
});
document.getElementById('nextPageBtn').addEventListener('click', function () {
  const total = filteredAttendees.length;
  const pages = rowsPerPage === 'all' ? 1 : Math.ceil(total / parseInt(rowsPerPage, 10));
  if (currentPage < pages) {
    currentPage += 1;
    filterAndRender();
  }
});
document.getElementById('selectAllRows').addEventListener('change', function () {
  if (this.checked) {
    filteredAttendees.forEach(attendee => selectedRows.add(attendee.attendee_no));
  } else {
    filteredAttendees.forEach(attendee => selectedRows.delete(attendee.attendee_no));
  }
  renderTable();
});

document.getElementById('attendanceTableBody').addEventListener('change', event => {
  if (event.target.type !== 'checkbox') {
    return;
  }
  const attendeeNo = event.target.dataset.id;
  if (!attendeeNo) {
    return;
  }
  if (event.target.checked) {
    selectedRows.add(attendeeNo);
  } else {
    selectedRows.delete(attendeeNo);
  }
});

document.querySelectorAll('#attendanceSummaryTable th.sortable').forEach(header => {
  header.addEventListener('click', function () {
    const column = header.getAttribute('data-column');
    if (sortColumn === column) {
      sortAsc = !sortAsc;
    } else {
      sortColumn = column;
      sortAsc = true;
    }
    renderTable();
    renderSortIndicators();
  });
});

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
    fetchDataForEvent(document.getElementById('eventDropdown').value);
  });
});

document.getElementById('exportAttendanceSummaryBtn').onclick = async function () {
  const exportOption = document.querySelector('input[name="exportOption"]:checked').value;
  const exportAttendees = exportOption === 'selected'
    ? filteredAttendees.filter(attendee => selectedRows.has(attendee.attendee_no))
    : filteredAttendees;

  const headers = [
    'Attendee No', 'First Name', 'Last Name', 'Event Name',
    'AM IN', 'AM IN Status', 'AM IN Late Minutes',
    'AM OUT', 'PM IN', 'PM IN Status', 'PM IN Late Minutes',
    'PM OUT', 'Date', 'Attendance Status'
  ];

  const rows = exportAttendees.map(attendee => [
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
    attendee.attendance_status || ''
  ]);

  if (typeof XLSX === 'undefined') {
    await window.crfvDialog.alert('XLSX library not loaded.', { tone: 'error' });
    return;
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary');
  XLSX.writeFile(workbook, 'attendance_summary.xlsx');
};
