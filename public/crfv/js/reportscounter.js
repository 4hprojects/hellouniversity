// Normalizes the payment status string to a standard format
function normalizeStatus(status) {
  if (!status) return 'ar';
  const s = status.trim().toLowerCase();
  if (s === 'fully paid') return 'fully_paid';
  if (s === 'partially paid' || s === 'partial') return 'partial';
  if (s === 'accounts receivable' || s === 'accounts recievable' || s === 'ar') return 'ar';
  return s;
}

// Update attendee counters
function updateAttendeesCounters(attendees) {
  let total = attendees.length;
  let fullyPaid = 0, partial = 0, ar = 0;

  attendees.forEach(a => {
    const status = normalizeStatus(a.payment_status);
    if (status === 'fully_paid') fullyPaid++;
    else if (status === 'partial') partial++;
    else if (status === 'ar') ar++;
    else ar++; // Treat unknown/missing as AR
  });

  document.getElementById('countTotal').textContent = total;
  document.getElementById('countFullyPaid').textContent = fullyPaid;
  document.getElementById('countPartial').textContent = partial;
  document.getElementById('countAR').textContent = ar;
}

// Update registration counters
function updateRegistrationCounters(attendees) {
  document.getElementById('countTotal').textContent = attendees.length;
  document.getElementById('countPending').textContent = attendees.filter(a => (a.att_status || '').toLowerCase() === 'pending').length;
  document.getElementById('countConfirmed').textContent = attendees.filter(a => (a.att_status || '').toLowerCase() === 'confirmed').length;
}

// Update payment status list
function updatePaymentStatusList(attendees) {
  const statusCounts = {
    'Fully Paid': 0,
    'Partially Paid': 0,
    'Accounts Receivable': 0,
    'Others': 0
  };
  attendees.forEach(a => {
    const status = (a.payment_status || '').toLowerCase();
    if (status === 'fully paid') statusCounts['Fully Paid']++;
    else if (status === 'partially paid') statusCounts['Partially Paid']++;
    else if (status === 'accounts receivable') statusCounts['Accounts Receivable']++;
    else if (status) statusCounts['Others']++;
  });
  // Render as a list
  document.getElementById('paymentStatusList').innerHTML = `
    <ul>
      <li><b>Fully Paid:</b> ${statusCounts['Fully Paid']}</li>
      <li><b>Partially Paid:</b> ${statusCounts['Partially Paid']}</li>
      <li><b>Accounts Receivable:</b> ${statusCounts['Accounts Receivable']}</li>
      <li><b>Others:</b> ${statusCounts['Others']}</li>
    </ul>
  `;
}

// Update all counters in one function
function updateAllCounters(attendees) {
  // Registration status
  const total = attendees.length;
  let pending = 0, confirmed = 0, regOthers = 0;
  const regOthersValues = [];

  attendees.forEach(a => {
    const attStatus = (a.att_status || '').trim().toLowerCase();
    if (attStatus === 'pending') pending++;
    else if (attStatus === 'confirmed') confirmed++;
    else if (attStatus) {
      regOthers++;
      regOthersValues.push(a.att_status); // Log the original value
    }
  });

  // Payment status (existing logic)
  let fullyPaid = 0, partial = 0, ar = 0, others = 0;
  const othersValues = []; // <-- This resets the array every time

  attendees.forEach(a => {
    let status = (a.payment_status || '').toLowerCase().replace(/recievable/g, 'receivable').trim();
    if (status === 'fully paid') {
      fullyPaid++;
    } else if (status === 'partially paid') {
      partial++;
    } else if (status === 'accounts receivable' || status === '') {
      ar++;
    } else {
      others++;
      othersValues.push(a.payment_status);
    }
  });

  // Log the "Others" values
  if (othersValues.length > 0) {
    console.log('Payment Status - Others:', othersValues);
  }

  // Update DOM
  const setCounter = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
    else console.warn(`${id} element not found in DOM!`);
  };

  setCounter('countTotal', total);
  setCounter('countPending', pending);
  setCounter('countConfirmed', confirmed);
  setCounter('countAttOthers', regOthers);
  setCounter('countFullyPaid', fullyPaid);
  setCounter('countPartial', partial);
  setCounter('countAR', ar);
  setCounter('countOthers', others);
}


function exportTableToXLSX(tableId, filename, scope, counters) {
  const table = document.getElementById(tableId);
  if (!table) {
    alert('Table not found!');
    return;
  }

  let rows = Array.from(table.querySelectorAll('tbody tr'));
  if (rows.length === 0) {
    alert('No data in table!');
    return;
  }

  // Get headers and their indexes
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
  const exclude = ['id', 'created_at', 'old_event_id', 'payment_info'];
  // Find indexes of columns to exclude (case-insensitive)
  const excludeIndexes = headers
    .map((h, i) => exclude.includes(h.toLowerCase().replace(/\s+/g, '_')) ? i : -1)
    .filter(i => i !== -1);

  // Filter headers
  const filteredHeaders = headers.filter((_, i) => !excludeIndexes.includes(i));
  // Filter data
  const data = rows.map(row =>
    Array.from(row.children)
      .map(cell => cell.innerText.trim())
      .filter((_, i) => !excludeIndexes.includes(i))
  );

  // Add counters as a summary row at the top
  const counterRows = Object.entries(counters).map(([label, value]) => [label, value]);
  const exportData = [
    ...counterRows,
    [],
    filteredHeaders,
    ...data
  ];

  const ws = XLSX.utils.aoa_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

// Utility to get counters for Attendees
function getAttendeesCounters() {
  return {
    "Total Registrants": document.getElementById('countTotal')?.textContent || '',
    "Confirmed": document.getElementById('countConfirmed')?.textContent || '',
    "Pending": document.getElementById('countPending')?.textContent || '',
    "Others (Reg)": document.getElementById('countAttOthers')?.textContent || '',
    "Fully Paid": document.getElementById('countFullyPaid')?.textContent || '',
    "Partially Paid": document.getElementById('countPartial')?.textContent || '',
    "Accounts Receivable": document.getElementById('countAR')?.textContent || '',
    "Others (Payment)": document.getElementById('countOthers')?.textContent || ''
  };
}

function getExportFileName(scope, eventName = '') {
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0,10).replace(/-/g,'')
  const scopeLabel = scope === 'all' ? 'All' : 'Visible';
  const eventPart = eventName ? `-${eventName.replace(/\s+/g, '_')}` : '';
  return `Attendees-${scopeLabel}-${yyyymmdd}${eventPart}.xlsx`;
}

function getAccommodationExportFileName(scope, eventName = '') {
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0,10).replace(/-/g,'');
  const scopeLabel = scope === 'all' ? 'All' : 'Visible';
  const eventPart = eventName ? `-${eventName.replace(/\s+/g, '_')}` : '';
  return `Accommodation-${scopeLabel}-${yyyymmdd}${eventPart}.xlsx`;
}

function getAttendanceExportFileName(scope, eventName = '') {
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0,10).replace(/-/g,'');
  const scopeLabel = scope === 'all' ? 'All' : 'Visible';
  const eventPart = eventName ? `-${eventName.replace(/\s+/g, '_')}` : '';
  return `Attendance-${scopeLabel}-${yyyymmdd}${eventPart}.xlsx`;
}

function exportAccommodationTableToXLSX(tableId, filename, scope, counters) {
  const table = document.getElementById(tableId);
  if (!table) {
    alert('Table not found!');
    return;
  }

  let rows = Array.from(table.querySelectorAll('tbody tr'));
  if (rows.length === 0) {
    alert('No data in table!');
    return;
  }

  // Exclude sensitive columns
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
  const exclude = ['id', 'created_at', 'old_event_id', 'payment_info'];
  const excludeIndexes = headers
    .map((h, i) => exclude.includes(h.toLowerCase().replace(/\s+/g, '_')) ? i : -1)
    .filter(i => i !== -1);

  const filteredHeaders = headers.filter((_, i) => !excludeIndexes.includes(i));
  const data = rows.map(row =>
    Array.from(row.children)
      .map(cell => cell.innerText.trim())
      .filter((_, i) => !excludeIndexes.includes(i))
  );

  // Add counters as a summary row at the top if needed
  const counterRows = counters
    ? Object.entries(counters).map(([label, value]) => [label, value])
    : [];
  const exportData = [
    ...counterRows,
    [],
    filteredHeaders,
    ...data
  ];

  const ws = XLSX.utils.aoa_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

function exportAttendanceTableToXLSX(tableId, filename, scope, counters) {
  const table = document.getElementById(tableId);
  if (!table) {
    alert('Table not found!');
    return;
  }

  let rows = Array.from(table.querySelectorAll('tbody tr'));
  if (rows.length === 0) {
    alert('No data in table!');
    return;
  }

  // Exclude sensitive columns
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
  const exclude = ['id', 'created_at', 'old_event_id', 'payment_info'];
  const excludeIndexes = headers
    .map((h, i) => exclude.includes(h.toLowerCase().replace(/\s+/g, '_')) ? i : -1)
    .filter(i => i !== -1);

  const filteredHeaders = headers.filter((_, i) => !excludeIndexes.includes(i));
  const data = rows.map(row =>
    Array.from(row.children)
      .map(cell => cell.innerText.trim())
      .filter((_, i) => !excludeIndexes.includes(i))
  );

  // Add counters as a summary row at the top if needed
  const counterRows = counters
    ? Object.entries(counters).map(([label, value]) => [label, value])
    : [];
  const exportData = [
    ...counterRows,
    [],
    filteredHeaders,
    ...data
  ];

  const ws = XLSX.utils.aoa_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

// Usage in your export handler:
const eventName = document.getElementById('eventFilter')?.selectedOptions?.[0]?.text || '';
const filename = getExportFileName(exportAttendeesScope.value, eventName);

// Then pass `filename` to XLSX.writeFile

exportAttendeesBtn.addEventListener('click', async function() {
  const eventName = document.getElementById('eventFilter')?.selectedOptions?.[0]?.text || '';
  const filename = getExportFileName(exportAttendeesScope.value, eventName);

  if (exportAttendeesScope.value === 'selected') {
    // Export only visible rows
    exportTableToXLSX(
      'attendeesTable',
      filename,
      'selected',
      getAttendeesCounters()
    );
  } else {
    // Export all data and all columns from the database, excluding some fields
    const response = await fetch('/api/attendees');
    const allAttendees = await response.json();

    if (!allAttendees.length) {
      alert('No data found!');
      return;
    }

    // Dynamically get all unique keys (columns) from the data
    let allKeys = Array.from(
      allAttendees.reduce((set, row) => {
        Object.keys(row).forEach(k => set.add(k));
        return set;
      }, new Set())
    );

    // Exclude unwanted columns
    const exclude = ['id', 'created_at', 'old_event_id', 'payment_info'];
    allKeys = allKeys.filter(k => !exclude.includes(k));

    // Prepare data rows for export
    const data = allAttendees.map(a => allKeys.map(k => a[k] ?? ''));

    // Add counters as a summary row at the top
    const counterRows = Object.entries(getAttendeesCounters()).map(([label, value]) => [label, value]);
    const exportData = [
      ...counterRows,
      [],
      allKeys,
      ...data
    ];

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  }
});

document.getElementById('exportAccommodationBtn').addEventListener('click', async function() {
  const eventName = document.getElementById('eventFilter')?.selectedOptions?.[0]?.text || '';
  const scope = document.getElementById('exportAccommodationScope').value;
  const filename = getAccommodationExportFileName(scope, eventName);

  if (scope === 'selected') {
    exportAccommodationTableToXLSX(
      'accommodationTable',
      filename,
      'selected',
      getAccommodationCounters()
    );
  } else {
    const response = await fetch('/api/accommodation');
    const allData = await response.json();
    if (!allData.length) {
      alert('No data found!');
      return;
    }
    let allKeys = Array.from(
      allData.reduce((set, row) => {
        Object.keys(row).forEach(k => set.add(k));
        return set;
      }, new Set())
    );
    const exclude = ['id', 'created_at', 'old_event_id', 'payment_info'];
    allKeys = allKeys.filter(k => !exclude.includes(k));
    const data = allData.map(a => allKeys.map(k => a[k] ?? ''));
    const counterRows = Object.entries(getAccommodationCounters()).map(([label, value]) => [label, value]);
    const exportData = [
      ...counterRows,
      [],
      allKeys,
      ...data
    ];
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  }
});

document.getElementById('exportAttendanceBtn').addEventListener('click', async function() {
  const eventName = document.getElementById('eventFilter')?.selectedOptions?.[0]?.text || '';
  const scope = document.getElementById('exportAttendanceScope').value;
  const filename = `Attendance_${eventName.replace(/[\\/:*?"<>|]/g, '')}_${new Date().toISOString().slice(0,10)}.xlsx`;

  if (scope === 'selected') {
    // Export only visible rows
    const table = document.getElementById('attendanceTable');
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
      Array.from(tr.children).map(td => td.innerText)
    );
    const counterRows = Object.entries(getAttendanceCounters()).map(([label, value]) => [label, value]);
    const exportData = [
      ...counterRows,
      [],
      headers,
      ...rows
    ];
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, filename);
  } else {
    // Export all from backend
    const eventId = document.getElementById('eventFilter').value;
    const url = eventId ? `/api/attendance?event_id=${eventId}` : '/api/attendance';
    const response = await fetch(url);
    const allData = await response.json();
    if (!allData.length) {
      alert('No data found!');
      return;
    }
    // Get all unique keys for columns
    let allKeys = Array.from(
      allData.reduce((set, row) => {
        Object.keys(row).forEach(k => set.add(k));
        return set;
      }, new Set())
    );
    // Optional: filter out unwanted columns
    const exclude = ['id', 'created_at', 'old_event_id', 'payment_info'];
    allKeys = allKeys.filter(k => !exclude.includes(k));
    // Prepare data rows
    const data = allData.map(a => allKeys.map(k => a[k] ?? ''));
    const counterRows = Object.entries(getAttendanceCounters()).map(([label, value]) => [label, value]);
    const exportData = [
      ...counterRows,
      [],
      allKeys,
      ...data
    ];
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, filename);
  }
});

function updateAccommodationCounters(accommodationData) {
  const counts = {
    Virtual: 0,
    'Live-Out': 0,
    'FB Quad': 0,
    'FB Triple': 0,
    'FB Double': 0,
    'FB Single': 0,
    Others: 0,
    StayIn: 0
  };

  accommodationData.forEach(row => {
    const type = (row.accommodation || '').trim().toLowerCase();
    if (type === 'virtual' || type === 'online / virtual') counts.Virtual++;
    else if (type === 'live-out' || type === 'liveout') counts['Live-Out']++;
    else if (type === 'fb quad' || type === 'quad') counts['FB Quad']++;
    else if (type === 'fb triple' || type === 'triple') counts['FB Triple']++;
    else if (type === 'fb double' || type === 'double') counts['FB Double']++;
    else if (type === 'fb single' || type === 'single') counts['FB Single']++;
    else counts.Others++;
  });

  // Stay-In = all except Live-Out, Online/Virtual, Others
  counts.StayIn =
    counts['FB Quad'] +
    counts['FB Triple'] +
    counts['FB Double'] +
    counts['FB Single'];

  document.getElementById('countVirtual').textContent = counts.Virtual;
  document.getElementById('countLiveOut').textContent = counts['Live-Out'];
  document.getElementById('countQuad').textContent = counts['FB Quad'];
  document.getElementById('countTriple').textContent = counts['FB Triple'];
  document.getElementById('countDouble').textContent = counts['FB Double'];
  document.getElementById('countSingle').textContent = counts['FB Single'];
  document.getElementById('countAccOthers').textContent = counts.Others;
  document.getElementById('countStayIn').textContent = counts.StayIn;
}

// Repeat similar for Accommodation and Attendance if you have counters for them

window.updateDashboardLabel = updateDashboardLabel;
// Optionally, you can add animation or percentage logic here later
// Expose to global scope for use in reports.js
window.updateAttendeesCounters = updateAttendeesCounters;
window.updateRegistrationCounters = updateRegistrationCounters;
window.updatePaymentStatusList = updatePaymentStatusList;
window.updateAllCounters = updateAllCounters;

function getAccommodationCounters() {
  return {
    "Online / Virtual": document.getElementById('countVirtual')?.textContent || '',
    "Live-Out": document.getElementById('countLiveOut')?.textContent || '',
    "FB Quad": document.getElementById('countQuad')?.textContent || '',
    "FB Triple": document.getElementById('countTriple')?.textContent || '',
    "FB Double": document.getElementById('countDouble')?.textContent || '',
    "FB Single": document.getElementById('countSingle')?.textContent || '',
    "Others": document.getElementById('countAccOthers')?.textContent || '',
    "Total Stay-In": document.getElementById('countStayIn')?.textContent || ''
  };
}

function updateAttendanceTable() {
  const query = document.getElementById('searchAttendance').value.trim().toLowerCase();
  let filtered = attendanceData.filter(rec =>
    [
      rec.date,
      rec.time,
      rec.raw_last_name,
      rec.raw_first_name,
      rec.raw_rfid,
      rec.slot,
      rec.event_id
    ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query)
  );

  // Sorting logic
  if (attendanceSort.key) {
    filtered.sort((a, b) => {
      let valA = a[attendanceSort.key] || '';
      let valB = b[attendanceSort.key] || '';
      // For date, compare as date
      if (attendanceSort.key === 'date') {
        valA = new Date(valA);
        valB = new Date(valB);
        return attendanceSort.asc ? valA - valB : valB - valA;
      }
      return attendanceSort.asc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  // Pagination logic (if you use it)
  const start = (attendancePage - 1) * attendancePerPage;
  const paged = attendancePerPage === 'all' ? filtered : filtered.slice(start, start + attendancePerPage);

  // Render table
  attendanceTableBody.innerHTML = paged.map(rec => `
    <tr>
      <td>${formatDDMMMYYYY(rec.date)}</td>
      <td>${rec.time || ''}</td>
      <td>${rec.raw_last_name || ''}</td>
      <td>${rec.raw_first_name || ''}</td>
      <td>${rec.raw_rfid || ''}</td>
      <td>${rec.slot || ''}</td>
      <td>${rec.event_id || ''}</td>
    </tr>
  `).join('');

  // Update pagination and label if needed
  renderAttendancePagination(filtered.length);
  const selectedEvent = eventFilter.options[eventFilter.selectedIndex]?.text || 'All Events';
  updateAttendanceLabel(selectedEvent, filtered.length);
  updateAttendanceCounters(filtered);
}

function renderAttendancePagination(total) {
  const pages = attendancePerPage === 'all' ? 1 : Math.ceil(total / attendancePerPage);
  const pagDiv = document.getElementById('attendancePagination');
  pagDiv.innerHTML = `
    <label>Show
      <select id="attendancePerPage">
        <option value="10" ${attendancePerPage==10?'selected':''}>10</option>
        <option value="25" ${attendancePerPage==25?'selected':''}>25</option>
        <option value="50" ${attendancePerPage==50?'selected':''}>50</option>
        <option value="100" ${attendancePerPage==100?'selected':''}>100</option>
        <option value="all" ${attendancePerPage==='all'?'selected':''}>All</option>
      </select>
    </label>
    <span>Page ${attendancePage} of ${pages}</span>
    <button id="attendancePrev" ${attendancePage<=1?'disabled':''}>&lt; Prev</button>
    <button id="attendanceNext" ${attendancePage>=pages?'disabled':''}>Next &gt;</button>
  `;
  document.getElementById('attendancePerPage').onchange = e => {
    attendancePerPage = e.target.value === 'all' ? 'all' : Number(e.target.value);
    attendancePage = 1;
    updateAttendanceTable();
  };
  document.getElementById('attendancePrev').onclick = () => {
    if (attendancePage > 1) { attendancePage--; updateAttendanceTable(); }
  };
  document.getElementById('attendanceNext').onclick = () => {
    if (attendancePage < pages) { attendancePage++; updateAttendanceTable(); }
  };
}

function updateAttendanceCounters(attendanceData) {
  let counts = {
    AMIn: 0,
    AMOut: 0,
    PMIn: 0,
    PMOut: 0,
    Registered: 0,
    Unregistered: 0
  };

  attendanceData.forEach(row => {
    const slot = (row.slot || '').toLowerCase();
    if (slot === 'am in') counts.AMIn++;
    else if (slot === 'am out') counts.AMOut++;
    else if (slot === 'pm in') counts.PMIn++;
    else if (slot === 'pm out') counts.PMOut++;

    // Registered: both raw_last_name and raw_first_name are not null/empty
    const hasLast = row.raw_last_name && row.raw_last_name.trim() !== '';
    const hasFirst = row.raw_first_name && row.raw_first_name.trim() !== '';
    if (hasLast && hasFirst) counts.Registered++;
    else counts.Unregistered++;
  });

  document.getElementById('countAMIn').textContent = counts.AMIn;
  document.getElementById('countAMOut').textContent = counts.AMOut;
  document.getElementById('countPMIn').textContent = counts.PMIn;
  document.getElementById('countPMOut').textContent = counts.PMOut;
  document.getElementById('countRegistered').textContent = counts.Registered;
  document.getElementById('countUnregistered').textContent = counts.Unregistered;
}

function getAttendanceCounters() {
  return {
    "AM In": document.getElementById('countAMIn')?.textContent || '',
    "AM Out": document.getElementById('countAMOut')?.textContent || '',
    "PM In": document.getElementById('countPMIn')?.textContent || '',
    "PM Out": document.getElementById('countPMOut')?.textContent || '',
    "Registered": document.getElementById('countRegistered')?.textContent || '',
    "Unregistered": document.getElementById('countUnregistered')?.textContent || ''
  };
}

document.querySelectorAll('#accommodationTable th.sortable').forEach(th => {
  th.style.cursor = 'pointer';
  th.onclick = function() {
    const key = th.getAttribute('data-key');
    // Cycle: no sort -> asc -> desc -> no sort
    if (accommodationSort.key !== key) {
      accommodationSort.key = key;
      accommodationSort.asc = true;
    } else if (accommodationSort.asc) {
      accommodationSort.asc = false;
    } else {
      accommodationSort.key = '';
    }
    accommodationPage = 1;
    updateAccommodationTable();
    updateAccommodationSortIndicators();
  };
});

function updateAccommodationSortIndicators() {
  document.querySelectorAll('#accommodationTable th.sortable').forEach(th => {
    th.innerHTML = th.textContent.replace(/[\u25B2\u25BC]/g, ''); // Remove old arrows
    const key = th.getAttribute('data-key');
    if (accommodationSort.key === key) {
      th.innerHTML += accommodationSort.asc ? ' &#9650;' : ' &#9660;'; // ▲ or ▼
    }
  });
}