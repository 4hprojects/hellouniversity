// --- Attendance Tab ---
async function loadAttendanceRecords() {
  try {
    const res = await fetch('/api/attendance-records');
    const data = await res.json();
    console.log('Attendance API response:', data); // Debug line
    // Try all possible formats
    attendanceData = Array.isArray(data) ? data :
                     data.records ? data.records :
                     data.attendance ? data.attendance :
                     [];
    attendanceSort = [{ key: 'date_time', asc: false }];
    attendanceSearch = '';
    renderAttendanceTable(attendanceData);
    updateSortIndicators('#attendanceTable', attendanceSort, ['date_time', 'raw_last_name', 'raw_first_name', 'raw_rfid', 'slot', 'event_id']);
    // Fetch attendees for registered/unregistered summary
    const attendeesRes = await fetch('/api/attendees');
    const attendeesPayload = await attendeesRes.json();
    const attendeesData = Array.isArray(attendeesPayload)
      ? attendeesPayload
      : (attendeesPayload.attendees || []);
    console.log('Attendees:', attendeesData); // Debug line
    console.log('Attendance Records:', attendanceData); // Debug line
    updateAttendanceCounters(attendanceData, attendeesData);
  } catch (err) {
    console.error('Attendance load error:', err); // Debug line
    document.querySelector('#attendanceTable tbody').innerHTML =
      `<tr><td colspan="6">Failed to load attendance records.</td></tr>`;
  }
}

function renderAttendanceTable(records) {
  // Filter by search
  let filtered = records.filter(rec =>
    Object.values(rec).some(val =>
      (val || '').toString().toLowerCase().includes(attendanceSearch)
    )
  );

  // Sort
  filtered.sort((a, b) => {
    for (const { key, asc } of attendanceSort) {
      let av = a[key] || '', bv = b[key] || '';
      if (key === 'date_time') { // special for date+time
        av = (a.date || '') + ' ' + (a.time || '');
        bv = (b.date || '') + ' ' + (b.time || '');
      }
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
    }
    return 0;
  });

  const rows = filtered.map(rec => `
  <tr>
    <td>${rec.date ? rec.date + ' ' + (rec.time || '') : ''}</td>
    <td>${rec.raw_last_name || ''}</td>
    <td>${rec.raw_first_name || ''}</td>
    <td>${rec.raw_rfid || ''}</td>
    <td>${rec.slot || ''}</td>
    <td>${rec.event_id || ''}</td>
  </tr>
`).join('');
  document.querySelector('#attendanceTable tbody').innerHTML = rows;
}

// --- Events Tab ---
async function loadEvents() {
  try {
    const res = await fetch('/api/events');
    const data = await res.json();
    eventsData = data.events;
    eventsSort = [{ key: 'start_date', asc: false }];
    eventsSearch = '';
    renderEventsTable(eventsData);
    updateSortIndicators('#eventsTable', eventsSort, ['event_id', 'event_name', 'start_date', 'end_date', 'status', 'location', 'venue']);
  } catch (err) {
    document.querySelector('#eventsTable tbody').innerHTML =
      `<tr><td colspan="7">Failed to load events.</td></tr>`;
  }
}

function renderEventsTable(events) {
  // Filter by search
  let filtered = events.filter(ev =>
    Object.values(ev).some(val =>
      (val || '').toString().toLowerCase().includes(eventsSearch)
    )
  );

  // Sort
  filtered.sort((a, b) => {
    for (const { key, asc } of eventsSort) {
      let av = a[key] || '', bv = b[key] || '';
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
    }
    return 0;
  });

  const rows = filtered.map(ev => `
    <tr>
      <td>${ev.event_id || ''}</td>
      <td>${ev.event_name || ''}</td>
      <td>${ev.start_date || ''}</td>
      <td>${ev.end_date || ''}</td>
      <td>${ev.status || ''}</td>
      <td>${ev.location || ''}</td>
      <td>${ev.venue || ''}</td>
    </tr>
  `).join('');
  document.querySelector('#eventsTable tbody').innerHTML = rows;
}

// --- Logs Tab ---
async function loadAuditLogs() {
  try {
    const res = await fetch('/api/audit-trail');
    const data = await res.json();
    renderLogsTable(data);
  } catch (err) {
    document.querySelector('#logs-table tbody').innerHTML =
      `<tr><td colspan="6">Failed to load logs.</td></tr>`;
  }
}

function renderLogsTable(logs) {
  const rows = logs.map(log => `
    <tr>
      <td>${log.user_name || ''}</td>
      <td>${log.user_role || ''}</td>
      <td>${log.action || ''}</td>
      <td>${log.action_time || ''}</td>
      <td>${log.ip_address || ''}</td>
      <td>${log.details || ''}</td>
    </tr>
  `).join('');
  document.querySelector('#logs-table tbody').innerHTML = rows;
}

// --- On DOMContentLoaded, load all tabs ---
document.addEventListener('DOMContentLoaded', () => {
  loadAttendanceRecords();
  loadEvents();
  loadAuditLogs();

  // Attendance sort
  document.querySelectorAll('#attendanceTable thead th').forEach((th, idx) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', e => {
      const keyMap = ['date_time', 'raw_last_name', 'raw_first_name', 'raw_rfid', 'slot', 'event_id'];
      let key = keyMap[idx];
      let multi = e.shiftKey;
      let arr = attendanceSort;
      let foundIdx = arr.findIndex(s => s.key === key);

      if (!multi) arr.length = 0; // Single column sort resets all

      if (foundIdx !== -1) {
        if (arr[foundIdx].asc) {
          // Ascending → Descending
          arr[foundIdx].asc = false;
        } else {
          // Descending → Remove sort
          arr.splice(foundIdx, 1);
        }
      } else {
        // Not sorted yet: add as ascending
        arr.push({ key, asc: true });
      }

      renderAttendanceTable(attendanceData);
      updateSortIndicators('#attendanceTable', arr, keyMap);
    });
  });

  // Events sort
  document.querySelectorAll('#eventsTable thead th').forEach((th, idx) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', e => {
      const keyMap = ['event_id', 'event_name', 'start_date', 'end_date', 'status', 'location', 'venue'];
      let key = keyMap[idx];
      let multi = e.shiftKey;
      let arr = eventsSort;
      let found = arr.find(s => s.key === key);
      if (!multi) arr.length = 0;
      if (found) {
        if (found.asc) {
          // Was ascending: set to descending
          found.asc = false;
        } else {
          // Was descending: remove from sort
          arr = arr.filter(s => s.key !== key);
        }
      } else {
        // Not sorted yet: add as ascending
        arr.push({ key, asc: true });
      }
      renderEventsTable(eventsData);
      updateSortIndicators('#eventsTable', arr, keyMap);
    });
  });

  // Attendance search
  document.getElementById('searchAttendance').addEventListener('input', e => {
    attendanceSearch = e.target.value.toLowerCase();
    renderAttendanceTable(attendanceData);
  });

  // Events search
  document.getElementById('searchEvents').addEventListener('input', e => {
    eventsSearch = e.target.value.toLowerCase();
    renderEventsTable(eventsData);
  });

  document.getElementById('exportAttendanceBtn').onclick = async function () {
    const headers = ['Date & Time', 'Last Name', 'First Name', 'RFID', 'Session', 'Event ID'];
    const rows = attendanceData.map(rec => [
      (rec.date || '') + ' ' + (rec.time || ''),
      rec.raw_last_name || '',
      rec.raw_first_name || '',
      rec.raw_rfid || '',
      rec.slot || '',
      rec.event_id || ''
    ]);
    if (typeof XLSX === "undefined") {
      await window.crfvDialog.alert('XLSX library not loaded.', { tone: 'error' });
      return;
    }
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance_report.xlsx");
  };
});

// Helper to update sort indicators
function updateSortIndicators(tableSelector, sortArr, keyMap) {
  document.querySelectorAll(`${tableSelector} thead th`).forEach((th, idx) => {
    th.textContent = th.textContent.replace(/[\u25B2\u25BC]/g, '').trim();
    let sort = sortArr.find(s => s.key === keyMap[idx]);
    if (sort) th.textContent += sort.asc ? ' ▲' : ' ▼';
  });
}

function setCounter(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateAttendanceCounters(records, attendees) {
  const sessions = ['AM In', 'AM Out', 'PM In', 'PM Out'];
  const sessionSets = {};
  sessions.forEach(s => sessionSets[s] = new Set());

  // Build a map of valid RFIDs to attendee names
  const rfidToAttendee = {};
  (attendees || []).forEach(a => {
    if (a.rfid && a.first_name && a.last_name) {
      rfidToAttendee[a.rfid] = a;
    }
  });

  const validRFIDs = new Set(Object.keys(rfidToAttendee));
  const uniqueValidRFIDs = new Set();
  const uniqueInvalidRFIDs = new Set();
  const allUniqueRFIDs = new Set();

  let registered = new Set();
  let unregistered = new Set();

  records.forEach(rec => {
    const rfid = rec.raw_rfid;
    if (rfid) allUniqueRFIDs.add(rfid);

    const slotNorm = normalizeSlot(rec.slot);
    if (sessions.includes(slotNorm) && validRFIDs.has(rfid)) {
      sessionSets[slotNorm].add(rfid);
      uniqueValidRFIDs.add(rfid);
      registered.add(rfid);
    } else if (sessions.includes(slotNorm)) {
      uniqueInvalidRFIDs.add(rfid);
      unregistered.add(rfid);
    }
  });

  setCounter('countAMIn', sessionSets['AM In'].size);
  setCounter('countAMOut', sessionSets['AM Out'].size);
  setCounter('countPMIn', sessionSets['PM In'].size);
  setCounter('countPMOut', sessionSets['PM Out'].size);
  setCounter('countRegistered', registered.size);
  setCounter('countUnregistered', unregistered.size);
  setCounter('countValidRFIDs', uniqueValidRFIDs.size);
  setCounter('countInvalidRFIDs', uniqueInvalidRFIDs.size);
  setCounter('countTotalUniqueRFIDs', allUniqueRFIDs.size);
  console.log('Valid RFIDs:', validRFIDs);
  records.forEach(rec => console.log('Slot:', rec.slot, 'RFID:', rec.raw_rfid));

  const invalidRows = [];
  records.forEach(rec => {
    const rfid = rec.raw_rfid;
    const slotNorm = normalizeSlot(rec.slot);
    if (sessions.includes(slotNorm) && !validRFIDs.has(rfid)) {
      invalidRows.push(rec);
    }
  });
  console.log('Invalid Attendance Records:', invalidRows);

  const invalidRowsHtml = invalidRows.map(rec => `
    <tr>
      <td>${rec.date ? rec.date + ' ' + (rec.time || '') : ''}</td>
      <td>${rec.raw_last_name || ''}</td>
      <td>${rec.raw_first_name || ''}</td>
      <td>${rec.raw_rfid || ''}</td>
      <td>${rec.slot || ''}</td>
      <td>${rec.event_id || ''}</td>
    </tr>
  `).join('');
  document.getElementById('invalidAttendanceList').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Last Name</th>
          <th>First Name</th>
          <th>RFID</th>
          <th>Session</th>
          <th>Event ID</th>
        </tr>
      </thead>
      <tbody>
        ${invalidRowsHtml}
      </tbody>
    </table>
  `;
}

function normalizeSlot(slot) {
  return slot.replace('_', ' ').replace('IN', 'In').replace('OUT', 'Out');
}



let attendanceData = [];
let attendanceSort = [];
let attendanceSearch = '';

let eventsData = [];
let eventsSort = [];
let eventsSearch = '';
