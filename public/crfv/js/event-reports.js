//reports.js
// --- Attendees Table Columns ---
const attendeesColumns = [
  { key: 'attendee_no', label: 'Attendee No' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'organization', label: 'Organization' },
  { key: 'rfid', label: 'RFID' },
  { key: 'confirmation_code', label: 'Confirmation No' },
  { key: 'payment_status', label: 'Payment Status' },
  { key: 'event_status', label: 'Event Status' }, // <-- Add this line
  { key: 'actions', label: 'Actions' }
];

// --- Accommodation Table Columns ---
const accommodationColumns = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'organization', label: 'Organization' },
  { key: 'accommodation', label: 'Accommodation' }
];

// --- State ---
let attendeesData = [];
let attendeesPage = 1, attendeesPerPage = 10;
let attendeesSort = { key: null, asc: true };
let selectedAttendees = new Set();

let accommodationPage = 1, accommodationPerPage = 10;
let accommodationSort = { key: null, asc: true };

// --- Tab Switching ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'accommodation') {
      updateAccommodationTable();
    }
  });
});

// --- Authentication ---
async function checkAuthAndShowModal() {
  try {
    const res = await fetch('/api/check-auth', { credentials: 'same-origin' });
    if (!res.ok) {
      window.location.href = "/crfv/attendance";
    }
  } catch {
    window.location.href = "/crfv/attendance";
  }
}
document.addEventListener('DOMContentLoaded', checkAuthAndShowModal);

// --- Logout Button ---
document.addEventListener('DOMContentLoaded', function() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = async function() {
      await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
      window.location.reload();
    };
  }
});

// --- Clock ---
function updateClock() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', options);
  let hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeStr = [
    hours.toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0')
  ].join(':') + ' ' + ampm;
  document.getElementById('clock').innerText = `${dateStr} | ${timeStr}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- Spinner ---
function showSpinner() {
  document.getElementById('loadingSpinner').style.display = '';
}
function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

// --- Fetch Attendees ---
async function loadAttendees() {
  showSpinner();
  try {
    const res = await fetch('/api/attendees');
    const data = await res.json();
    attendeesData = Array.isArray(data) ? data : (data.attendees || []);
    attendeesPage = 1;
    updateAttendeesTable();
  } catch (err) {
    document.getElementById('attendeesTableBody').innerHTML =
      `<tr><td colspan="${attendeesColumns.length}">Failed to load attendees.</td></tr>`;
  }
  hideSpinner();
}

// --- Filter, Sort, Paginate ---
function filterAttendees(query) {
  query = query.trim().toLowerCase();
  if (!query) return attendeesData;
  return attendeesData.filter(a =>
    [
      a.last_name,
      a.first_name,
      a.attendee_no,
      a.rfid,
      a.organization,
      a.contact_no,
      a.payment_status // <-- Add this line
    ]
    .filter(Boolean).join(' ').toLowerCase().includes(query)
  );
}
function sortAttendees(data) {
  if (!attendeesSort.key) return data;
  return [...data].sort((a, b) => {
    let valA = a[attendeesSort.key] || '';
    let valB = b[attendeesSort.key] || '';
    return attendeesSort.asc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });
}
function paginateAttendees(data) {
  if (attendeesPerPage === 'all') return data;
  const start = (attendeesPage - 1) * attendeesPerPage;
  return data.slice(start, start + Number(attendeesPerPage));
}

// --- Accommodation Filter, Sort, Paginate ---
function filterAccommodation(query) {
  query = query.trim().toLowerCase();
  if (!query) return attendeesData;
  return attendeesData.filter(a =>
    [
      a.last_name,
      a.first_name,
      a.attendee_no,
      a.organization,
      a.accommodation,
      a.accommodation_other
    ].filter(Boolean).join(' ').toLowerCase().includes(query)
  );
}
function sortAccommodation(data) {
  if (!accommodationSort.key) return data;
  return [...data].sort((a, b) => {
    let valA = a[accommodationSort.key] || '';
    let valB = b[accommodationSort.key] || '';
    return accommodationSort.asc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });
}
function paginateAccommodation(data) {
  if (accommodationPerPage === 'all') return data;
  const start = (accommodationPage - 1) * accommodationPerPage;
  return data.slice(start, start + Number(accommodationPerPage));
}

// --- Render Table Header ---
function renderAttendeesTableHeader() {
  const headerRow = attendeesColumns.map(col => {
    let arrow = '';
    if (attendeesSort.key === col.key) {
      arrow = attendeesSort.asc ? ' ▲' : ' ▼';
    }
    return `<th class="sortable" data-key="${col.key}">${col.label}${arrow}</th>`;
  }).join('');
  document.getElementById('attendeesTableHeader').innerHTML = `<tr>${headerRow}</tr>`;

  // Add sorting event listeners
  document.querySelectorAll('#attendeesTableHeader th.sortable').forEach(th => {
    // Don't sort on the "Actions" column
    if (th.dataset.key === 'actions') return;
    th.style.cursor = 'pointer';
    th.onclick = function() {
      if (attendeesSort.key === th.dataset.key) {
        attendeesSort.asc = !attendeesSort.asc;
      } else {
        attendeesSort.key = th.dataset.key;
        attendeesSort.asc = true;
      }
      updateAttendeesTable();
    };
  });
}

// --- Render Table Body ---
function renderAttendeesTableBody(attendees) {
  const rows = attendees.map(att => `
  <tr>
    <!--<td><input type="checkbox" class="attendee-checkbox" value="${att.attendee_no}" ${selectedAttendees.has(att.attendee_no) ? 'checked' : ''}></td>--> <!-- Removed checkbox cell -->
    <td>${att.attendee_no}</td>
    <td>${att.last_name || ''}</td>
    <td>${att.first_name || ''}</td>
    <td>${att.organization || ''}</td>
    <td>${att.rfid || ''}</td>
    <td>${att.confirmation_code || ''}</td>
    <td>${att.payment_status || 'Accounts Recievable'}</td>
    <td>${att.event_status || ''}</td> <!-- <-- Add this line -->
    <td>
      <button class="btn btn-info" onclick="openInfoModal('${att.attendee_no}')">Edit Info</button>
      <button class="btn btn-payment" onclick="openPaymentModal('${att.attendee_no}')">Edit Payment</button>
    </td>
  </tr>
`).join('');
  document.getElementById('attendeesTableBody').innerHTML = rows;

  // Remove checkbox logic since checkboxes are gone
}

// --- Render Accommodation Table Body ---
function renderAccommodationTableBody(accommodation) {
  const rows = accommodation.map(a => `
    <tr>
      <td>${a.first_name || ''}</td>
      <td>${a.last_name || ''}</td>
      <td>${a.organization || ''}</td>
      <td>${a.accommodation || ''}</td>
    </tr>
  `).join('');
  document.getElementById('accommodationTableBody').innerHTML = rows;
}

// --- Pagination ---
function renderAttendeesPagination(filtered) {
  const pagDiv = document.getElementById('attendeesPagination');
  const total = filtered.length;
  const perPage = attendeesPerPage === 'all' ? total : attendeesPerPage;
  const pages = perPage === 0 ? 1 : Math.ceil(total / perPage);

  let html = `
    <label>Show
      <select id="attendeesPerPage">
        <option value="10" ${attendeesPerPage==10?'selected':''}>10</option>
        <option value="20" ${attendeesPerPage==20?'selected':''}>20</option>
        <option value="all" ${attendeesPerPage==='all'?'selected':''}>All</option>
      </select>
    </label>
    <span>Page ${attendeesPage} of ${pages}</span>
    <button id="attendeesPrev" ${attendeesPage<=1?'disabled':''}>&lt; Prev</button>
    <button id="attendeesNext" ${attendeesPage>=pages?'disabled':''}>Next &gt;</button>
  `;
  pagDiv.innerHTML = html;

  document.getElementById('attendeesPerPage').onchange = e => {
    attendeesPerPage = e.target.value === 'all' ? 'all' : Number(e.target.value);
    attendeesPage = 1;
    updateAttendeesTable();
  };
  document.getElementById('attendeesPrev').onclick = () => {
    if (attendeesPage > 1) { attendeesPage--; updateAttendeesTable(); }
  };
  document.getElementById('attendeesNext').onclick = () => {
    const pages = Math.ceil(filtered.length / (attendeesPerPage === 'all' ? filtered.length : attendeesPerPage));
    if (attendeesPage < pages) { attendeesPage++; updateAttendeesTable(); }
  };
}

// --- Pagination ---
function renderAccommodationPagination(filtered) {
  const pagDiv = document.getElementById('accommodationPagination');
  const total = filtered.length;
  const perPage = accommodationPerPage === 'all' ? total : accommodationPerPage;
  const pages = perPage === 0 ? 1 : Math.ceil(total / perPage);

  let html = `
    <label>Show
      <select id="accommodationPerPage">
        <option value="10" ${accommodationPerPage==10?'selected':''}>10</option>
        <option value="20" ${accommodationPerPage==20?'selected':''}>20</option>
        <option value="all" ${accommodationPerPage==='all'?'selected':''}>All</option>
      </select>
    </label>
    <span>Page ${accommodationPage} of ${pages}</span>
    <button id="accommodationPrev" ${accommodationPage<=1?'disabled':''}>&lt; Prev</button>
    <button id="accommodationNext" ${accommodationPage>=pages?'disabled':''}>Next &gt;</button>
  `;
  pagDiv.innerHTML = html;

  document.getElementById('accommodationPerPage').onchange = e => {
    accommodationPerPage = e.target.value === 'all' ? 'all' : Number(e.target.value);
    accommodationPage = 1;
    updateAccommodationTable();
  };
  document.getElementById('accommodationPrev').onclick = () => {
    if (accommodationPage > 1) { accommodationPage--; updateAccommodationTable(); }
  };
  document.getElementById('accommodationNext').onclick = () => {
    const pages = Math.ceil(filtered.length / (accommodationPerPage === 'all' ? filtered.length : accommodationPerPage));
    if (accommodationPage < pages) { accommodationPage++; updateAccommodationTable(); }
  };
}

// --- Update Table (Filter, Sort, Paginate, Render) ---
function updateAttendeesTable() {
  const query = document.getElementById('searchAttendees').value;
  let filtered = filterAttendees(query);
  filtered = sortAttendees(filtered);
  const paged = paginateAttendees(filtered);
  renderAttendeesTableHeader();
  renderAttendeesTableBody(paged);
  renderAttendeesPagination(filtered);
  updateAttendeesCounters(filtered); // <-- Add this line
  updateAccommodationCounters(filtered); // <-- Add this line
}

// --- Update Accommodation Table ---
function updateAccommodationTable() {
  const query = document.getElementById('searchAccommodation').value;
  let filtered = filterAccommodation(query);
  filtered = sortAccommodation(filtered);
  const paged = paginateAccommodation(filtered);
  renderAccommodationTableHeader();
  renderAccommodationTableBody(paged);
  renderAccommodationPagination(filtered);
}

// --- Update Attendees Counters ---
function updateAttendeesCounters(filtered) {
  // filtered: the currently displayed/filtered attendees
  document.getElementById('countTotal').textContent = filtered.length;
  document.getElementById('countFullyPaid').textContent = filtered.filter(a => (a.payment_status || '').toLowerCase() === 'fully paid').length;
  document.getElementById('countPartial').textContent = filtered.filter(a => (a.payment_status || '').toLowerCase() === 'partially paid').length;
  document.getElementById('countAR').textContent = filtered.filter(a => !a.payment_status || a.payment_status.toLowerCase() === 'accounts recievable').length;
}

// --- Update Accommodation Counters ---
function updateAccommodationCounters(filtered) {
  const getCount = (type) => filtered.filter(a => (a.accommodation || '').toLowerCase() === type).length;
  document.getElementById('countVirtual').textContent = getCount('online / virtual');
  document.getElementById('countLiveOut').textContent = getCount('live-out');
  document.getElementById('countQuad').textContent = getCount('fb quad');
  document.getElementById('countTriple').textContent = getCount('fb triple');
  document.getElementById('countDouble').textContent = getCount('fb double');
  document.getElementById('countSingle').textContent = getCount('fb single');
  document.getElementById('countAccOthers').textContent = filtered.filter(a =>
    a.accommodation &&
    !['online / virtual','live-out','fb quad','fb triple','fb double','fb single'].includes(a.accommodation.toLowerCase())
  ).length;
}

// --- Search ---
document.getElementById('searchAttendees').addEventListener('input', () => {
  attendeesPage = 1;
  updateAttendeesTable();
});
document.getElementById('searchAccommodation').addEventListener('input', () => {
  accommodationPage = 1;
  updateAccommodationTable();
});

// --- Export ---
document.getElementById('exportAttendeesBtn').onclick = async function () {
  const query = document.getElementById('searchAttendees').value;
  const filtered = sortAttendees(filterAttendees(query));
  const paged = paginateAttendees(filtered);

  // All attendee fields from schema
  const headers = [
    "id", "created_at", "first_name", "last_name", "middle_name", "email",
    "attendee_no", "contact_no", "organization", "rfid", "event_id", "gender",
    "designation", "accommodation", "accommodation_other", "confirmation_code",
    "certificate_name", "old_event_id"
  ];

  const rows = paged.map(a => [
    a.id || "",
    a.created_at || "",
    a.first_name || "",
    a.last_name || "",
    a.middle_name || "",
    a.email || "",
    a.attendee_no || "",
    a.contact_no || "",
    a.organization || "",
    a.rfid || "",
    a.event_id || "",
    a.gender || "",
    a.designation || "",
    a.accommodation || "",
    a.accommodation_other || "",
    a.confirmation_code || "",
    a.certificate_name || "",
    a.old_event_id || ""
  ]);

  if (typeof XLSX === "undefined") {
    await window.crfvDialog.alert('XLSX library not loaded.', { tone: 'error' });
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendees");
  XLSX.writeFile(wb, "attendees_report.xlsx");
};
document.getElementById('exportAccommodationBtn').onclick = async function () {
  const query = document.getElementById('searchAccommodation').value;
  const filtered = sortAccommodation(filterAccommodation(query));
  const paged = paginateAccommodation(filtered);

  // All attendee fields from schema
  const headers = [
    "id", "created_at", "first_name", "last_name", "middle_name", "email",
    "attendee_no", "contact_no", "organization", "rfid", "event_id", "gender",
    "designation", "accommodation", "accommodation_other", "confirmation_code",
    "certificate_name", "old_event_id"
  ];

  const rows = paged.map(a => [
    a.id || "",
    a.created_at || "",
    a.first_name || "",
    a.last_name || "",
    a.middle_name || "",
    a.email || "",
    a.attendee_no || "",
    a.contact_no || "",
    a.organization || "",
    a.rfid || "",
    a.event_id || "",
    a.gender || "",
    a.designation || "",
    a.accommodation || "",
    a.accommodation_other || "",
    a.confirmation_code || "",
    a.certificate_name || "",
    a.old_event_id || ""
  ]);

  if (typeof XLSX === "undefined") {
    await window.crfvDialog.alert('XLSX library not loaded.', { tone: 'error' });
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Accommodation");
  XLSX.writeFile(wb, "accommodation_report.xlsx");
};

// --- Bulk Action Bar ---
function toggleBulkActionBar() {
  const bar = document.getElementById('bulk-action-bar');
  bar.style.display = selectedAttendees.size > 0 ? 'flex' : 'none';
}
document.getElementById('bulk-mark-paid').onclick = async function() {
  if (selectedAttendees.size === 0) return;
  if (!await window.crfvDialog.confirm('Mark selected attendees as paid?', {
    title: 'Confirm action',
    confirmLabel: 'Mark Paid'
  })) return;
  fetch('/api/reports/bulk-update-payment', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({attendee_nos: Array.from(selectedAttendees)})
  })
  .then(res => res.json())
  .then(async data => {
    await window.crfvDialog.alert('Marked as paid.', { tone: 'success' });
    selectedAttendees.clear();
    loadAttendees();
    toggleBulkActionBar();
  });
};
document.getElementById('bulk-export-xlsx').onclick = function() {
  exportSelectedAttendees('xlsx');
};
document.getElementById('bulk-export-pdf').onclick = function() {
  exportSelectedAttendees('pdf');
};
function exportSelectedAttendees(format) {
  if (selectedAttendees.size === 0) return;
  window.open(`/api/reports/export?format=${format}&attendee_nos=${Array.from(selectedAttendees).join(',')}`);
}

// --- Open Edit Info Modal
window.openInfoModal = async function(attendee_no) {
  showSpinner();
  try {
    const res = await fetch(`/api/attendees/${attendee_no}`);
    const data = await res.json();
    const modal = document.getElementById('infoModal');
    modal.querySelector('.modal-content').innerHTML = `
      <h3>Edit Attendee Info</h3>
      <form id="infoForm" class="modal-form-grid">
        <div class="section-title">System Info</div>
        <label>Attendee No
          <input type="text" name="attendee_no" value="${data.attendee_no || ''}" readonly>
        </label>
        <label>Confirmation Code
          <input type="text" name="confirmation_code" value="${data.confirmation_code || ''}" readonly>
        </label>
                <label>Contact No
          <input type="text" name="contact_no" value="${data.contact_no || ''}">
        </label>
        <label class="highlighted"><b>RFID <span>*</span></b>
          <input type="text" name="rfid" value="${data.rfid || ''}" required autofocus>
        </label>
        <div class="section-title">Personal Info</div>
        <label>First Name <span>*</span>
          <input type="text" name="first_name" value="${data.first_name || ''}" required>
        </label>
        <label>Middle Name
          <input type="text" name="middle_name" value="${data.middle_name || ''}">
        </label>
        <label>Last Name <span>*</span>
          <input type="text" name="last_name" value="${data.last_name || ''}" required>
        </label>
        <label>Email
          <input type="email" name="email" value="${data.email || ''}">
        </label>

        <div class="section-title">Event Info</div>
        <label>Event ID <span>*</span>
          <input type="text" name="event_id" value="${data.event_id || ''}" required>
        </label>
        <label>Organization <span>*</span>
          <input type="text" name="organization" value="${data.organization || ''}" required>
        </label>
        <label>Designation <span>*</span>
          <input type="text" name="designation" value="${data.designation || ''}" required>
        </label>

        
        <label>Gender <span>*</span>
          <select name="gender" required>
            <option value="">Select</option>
            <option value="Male" ${data.gender === 'Male' ? 'selected' : ''}>Male</option>
            <option value="Female" ${data.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other" ${data.gender === 'Other' ? 'selected' : ''}>Prefer not to say</option>
          </select>
        </label>

        <div class="section-title">Accommodation Info</div>
        <label>Accommodation <span>*</span>
          <select name="accommodation" required>
            <option value="">Select</option>
            <option value="Online / Virtual" ${data.accommodation === 'Online / Virtual' ? 'selected' : ''}>Online / Virtual</option>
            <option value="Live-Out" ${data.accommodation === 'Live-Out' ? 'selected' : ''}>Live-Out</option>
            <option value="FB Quad" ${data.accommodation === 'FB Quad' ? 'selected' : ''}>FB Quad</option>
            <option value="FB Triple" ${data.accommodation === 'FB Triple' ? 'selected' : ''}>FB Triple</option>
            <option value="FB Double" ${data.accommodation === 'FB Double' ? 'selected' : ''}>FB Double</option>
            <option value="FB Single" ${data.accommodation === 'FB Single' ? 'selected' : ''}>FB Single</option>
            <option value="Others" ${data.accommodation === 'Others' ? 'selected' : ''}>Others</option>
          </select>
        </label>
        <label>Accommodation (Other)
          <input type="text" name="accommodation_other" value="${data.accommodation_other || ''}">
        </label>
        <label>Certificate Name
          <input type="text" name="certificate_name" value="${data.certificate_name || ''}">
        </label>
        <div class="modal-actions full-row">
                  <button type="button" class="btn btn-cancel" onclick="closeInfoModal()"><i class="fas fa-times"></i> Cancel</button>
          <button type="submit" class="btn btn-save-exit"><i class="fas fa-save"></i> Save</button>

        </div>
      </form>
    `;
    modal.style.display = 'flex';
    document.getElementById('infoForm').onsubmit = async function(e) {
      e.preventDefault();
      if (!await window.crfvDialog.confirm('Are you sure you want to save changes and exit?', {
        title: 'Confirm action',
        confirmLabel: 'Save'
      })) return;
      const form = e.target;
      const payload = {
        attendee_no: form.attendee_no.value,
        confirmation_code: form.confirmation_code.value,
        rfid: form.rfid.value,
        first_name: form.first_name.value,
        middle_name: form.middle_name.value,
        last_name: form.last_name.value,
        email: form.email.value,
        contact_no: form.contact_no.value,
        organization: form.organization.value,
        event_id: form.event_id.value,
        gender: form.gender.value,
        designation: form.designation.value,
        accommodation: form.accommodation.value,
        accommodation_other: form.accommodation_other.value,
        certificate_name: form.certificate_name.value
      };
      await fetch(`/api/attendees/${attendee_no}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      closeInfoModal();
      loadAttendees();
    };
    const cancelBtn = modal.querySelector('.btn-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = async function() {
        if (await window.crfvDialog.confirm('Are you sure you want to cancel? Unsaved changes will be lost.', {
          title: 'Discard changes?',
          confirmLabel: 'Discard',
          destructive: true
        })) {
          closeInfoModal();
        }
      };
    }
  } catch (err) {
    await window.crfvDialog.alert('Failed to load attendee info.', { tone: 'error' });
  }
  hideSpinner();
};

window.closeInfoModal = function() {
  document.getElementById('infoModal').style.display = 'none';
};

// --- Open Edit Payment Modal
window.openPaymentModal = async function(attendee_no) {
  if (!attendee_no) {
    await window.crfvDialog.alert('Invalid attendee number.', { tone: 'error' });
    return;
  }
  showSpinner();
  try {
    const res = await fetch(`/api/payments/${attendee_no}`);
    const payments = await res.json();
    const modal = document.getElementById('paymentModal');
    if (!payments.length) {
      modal.querySelector('.modal-content').innerHTML = `
        <h3>Edit Payment Records</h3>
        <div>No payment records found for this attendee.</div>
        <button type="button" class="btn" id="addPaymentBtn">Add Payment</button>
        <button type="button" class="btn" onclick="closePaymentModal()">Close</button>
      `;
      modal.style.display = 'flex';
      hideSpinner();

      document.getElementById('addPaymentBtn').onclick = function() {
        modal.querySelector('.modal-content').innerHTML = `
          <h3>Add Payment Record</h3>
          <form id="addPaymentForm">
            <div class="modal-form-grid">
              <label for="payment_status">Payment Status</label>
              <select class="field" id="payment_status" name="payment_status" required>
                <option value="Accounts Recievable">Accounts Recievable</option>
                <option value="Fully Paid">Fully Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Scholar">Scholar</option>
                <option value="Others">Others</option>
              </select>

              <label for="amount">Amount</label>
              <input class="field" id="amount" name="amount" type="number" step="0.01" required>

              <label for="form_of_payment">Form of Payment</label>
              <div class="field" style="display:flex;gap:8px;">
                <select class="form-of-payment-select" id="form_of_payment" name="form_of_payment" style="flex:1;" required>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Cash Deposit">Cash Deposit</option>
                  <option value="Check Deposit">Check Deposit</option>
                  <option value="ADA/LDDAP">ADA/LDDAP</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Others">Others</option>
                </select>
                <input type="text" name="form_of_payment_other" class="form-of-payment-other" placeholder="Please specify" style="display:none;flex:1;">
              </div>

              <label for="date_full_payment">Date Full Payment</label>
              <input class="field" id="date_full_payment" name="date_full_payment" type="date" required>

              <label for="or_number">OR Number</label>
              <input class="field" id="or_number" name="or_number" type="text" required>

              <label for="quickbooks_no">QuickBooks No</label>
              <input class="field" id="quickbooks_no" name="quickbooks_no" type="text">

              <label for="shipping_tracking_no">Shipping Tracking No</label>
              <input class="field" id="shipping_tracking_no" name="shipping_tracking_no" type="text">

              <label class="notes-label">Notes:</label>
              <textarea class="field notes-field" id="notes" name="notes" rows="2"></textarea>

              <div class="modal-actions full-row">
                <button type="button" class="btn btn-cancel" id="cancelPaymentBtn">Cancel</button>
                <button type="submit" class="btn btn-save-exit">Save and Exit</button>

              </div>
            </div>
          </form>
        `;

        // Set today's date as default for date fields
        const today = new Date().toISOString().slice(0, 10);
        modal.querySelector('#date_full_payment').value = today;

        // Show/hide "Others" textbox for form_of_payment
        const formOfPaymentSelect = modal.querySelector('.form-of-payment-select');
        const formOfPaymentOther = modal.querySelector('.form-of-payment-other');
        formOfPaymentSelect.addEventListener('change', function() {
          if (formOfPaymentSelect.value === 'Others') {
            formOfPaymentOther.style.display = 'inline-block';
          } else {
            formOfPaymentOther.style.display = 'none';
            formOfPaymentOther.value = '';
          }
        });

        // Handle form submission
        modal.querySelector('#addPaymentForm').onsubmit = async function(e) {
          e.preventDefault();
          // Always get the elements from the form itself
          const form = e.target;
          const payment_status = form.payment_status?.value;
          const amount = form.amount?.value;
          const formOfPaymentSelect = form.querySelector('.form-of-payment-select');
          const formOfPaymentOther = form.querySelector('.form-of-payment-other');
          let form_of_payment = formOfPaymentSelect?.value;
          const date_full_payment = form.date_full_payment?.value;
          const or_number = form.or_number?.value;
        if (form_of_payment === 'Others') {
          if (!formOfPaymentOther.value.trim()) {
              await window.crfvDialog.alert('Please specify the form of payment.', { tone: 'info' });
              return;
            }
            form_of_payment = formOfPaymentOther.value.trim();
          }
          const payload = {
            attendee_no,
            payment_status,
            amount,
            form_of_payment,
            date_full_payment,
            date_partial_payment: form.date_partial_payment ? form.date_partial_payment.value : null,
            account: form.account ? form.account.value : null,
            or_number,
            quickbooks_no: form.quickbooks_no.value,
            shipping_tracking_no: form.shipping_tracking_no.value,
            notes: form.notes.value
          };
          await fetch('/api/payments', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
          });
          loadAttendees();
          closePaymentModal();
        };

        // Cancel button
        modal.querySelector('#cancelPaymentBtn').onclick = async function() {
          if (await window.crfvDialog.confirm('Are you sure you want to cancel? Unsaved changes will be lost.', {
            title: 'Discard changes?',
            confirmLabel: 'Discard',
            destructive: true
          })) {
            closePaymentModal();
          }
        };
      };
      return;
    }
    // If payments exist, show forms for each
    modal.querySelector('.modal-content').innerHTML = `
      <h3>Edit Payment Records</h3>
      <div>
        ${payments.map(p => `
          <form class="paymentForm" data-id="${p.payment_id}">
        <div class="modal-form-grid">
          <label>Status:</label>
          <select name="payment_status" class="field" required>
            <option value="Accounts Recievable" ${!p.payment_status || p.payment_status === 'Accounts Recievable' ? 'selected' : ''}>Accounts Recievable</option>
            <option value="Fully Paid" ${p.payment_status === 'Fully Paid' ? 'selected' : ''}>Fully Paid</option>
            <option value="Partially Paid" ${p.payment_status === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
            <option value="Scholar" ${p.payment_status === 'Scholar' ? 'selected' : ''}>Scholar</option>
            <option value="Others" ${p.payment_status === 'Others' ? 'selected' : ''}>Others</option>
          </select>

          <label>Amount:</label>
          <input type="number" name="amount" class="field" value="${p.amount || ''}" min="0" step="0.01" required>

          <label>Form of Payment:</label>
          <div class="field" style="display:flex;gap:8px;">
            <select name="form_of_payment" class="form-of-payment-select" style="flex:1;" required>
              <option value="Cash" ${p.form_of_payment === 'Cash' ? 'selected' : ''}>Cash</option>
              <option value="Check" ${p.form_of_payment === 'Check' ? 'selected' : ''}>Check</option>
              <option value="Cash Deposit" ${p.form_of_payment === 'Cash Deposit' ? 'selected' : ''}>Cash Deposit</option>
              <option value="Check Deposit" ${p.form_of_payment === 'Check Deposit' ? 'selected' : ''}>Check Deposit</option>
              <option value="ADA/LDDAP" ${p.form_of_payment === 'ADA/LDDAP' ? 'selected' : ''}>ADA/LDDAP</option>
              <option value="Bank Transfer" ${p.form_of_payment === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
              <option value="Others" ${p.form_of_payment === 'Others' ? 'selected' : ''}>Others</option>
            </select>
            <input type="text" name="form_of_payment_other" class="form-of-payment-other" placeholder="Please specify" style="display:${p.form_of_payment === 'Others' ? 'inline-block' : 'none'};flex:1;" value="${p.form_of_payment_other || ''}">
          </div>

          <label>Date Full Payment:</label>
          <input type="date" name="date_full_payment" class="field" value="${p.date_full_payment ? p.date_full_payment.substring(0,10) : ''}" required>

          <label>Date Partial Payment:</label>
          <input type="date" name="date_partial_payment" class="field" value="${p.date_partial_payment ? p.date_partial_payment.substring(0,10) : ''}">

          <label>Account:</label>
          <input type="text" name="account" class="field" value="${p.account || ''}">

          <label>OR Number:</label>
          <input type="text" name="or_number" class="field" value="${p.or_number || ''}" required>

          <label>Quickbooks No:</label>
          <input type="text" name="quickbooks_no" class="field" value="${p.quickbooks_no || ''}">

          <label>Shipping Tracking No:</label>
          <input type="text" name="shipping_tracking_no" class="field" value="${p.shipping_tracking_no || ''}">

<label class="notes-label">Notes:</label>
<textarea name="notes" class="field notes-field" rows="2">${p.notes || ''}</textarea>

          <div class="modal-actions full-row">
            <button type="button" class="btn btn-cancel" id="cancelPaymentBtn-${p.payment_id}">Cancel</button>
            <button type="submit" class="btn btn-save-exit">Save and Exit</button>

          </div>
        </div>
          </form>
        `).join('<hr>')}
      </div>
    `;
    modal.style.display = 'flex';

    // Show/hide the "Others" textbox based on dropdown selection
    modal.querySelectorAll('.form-of-payment-select').forEach(select => {
      select.addEventListener('change', function() {
        const otherInput = select.parentElement.querySelector('.form-of-payment-other');
        if (select.value === 'Others') {
          otherInput.style.display = 'inline-block';
        } else {
          otherInput.style.display = 'none';
          otherInput.value = '';
        }
      });
    });

    // Update form submission to include the "Others" value if selected
    modal.querySelectorAll('.paymentForm').forEach(form => {
      form.onsubmit = async function(e) {
        e.preventDefault();
        if (!await window.crfvDialog.confirm('Are you sure you want to save changes and exit?', {
          title: 'Confirm action',
          confirmLabel: 'Save'
        })) return;
        const payment_id = form.getAttribute('data-id');
        let form_of_payment = form.form_of_payment.value;
        let form_of_payment_other = form.form_of_payment_other.value;
        if (form_of_payment === 'Others') {
          if (!form_of_payment_other.trim()) {
            await window.crfvDialog.alert('Please specify the form of payment.', { tone: 'info' });
            return;
          }
          form_of_payment = form_of_payment_other.trim();
        }
        const payload = {
          payment_status: form.payment_status.value,
          amount: form.amount.value,
          form_of_payment,
          date_full_payment: form.date_full_payment.value || null,
          date_partial_payment: form.date_partial_payment.value || null,
          account: form.account.value,
          or_number: form.or_number.value,
          quickbooks_no: form.quickbooks_no.value,
          shipping_tracking_no: form.shipping_tracking_no.value,
          notes: form.notes.value
        };
        await fetch(`/api/payments/${payment_id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
        loadAttendees();
        closePaymentModal();
      };

      // Cancel confirmation
      const cancelBtn = form.querySelector('.btn-cancel');
      if (cancelBtn) {
        cancelBtn.onclick = async function() {
          if (await window.crfvDialog.confirm('Are you sure you want to cancel? Unsaved changes will be lost.', {
            title: 'Discard changes?',
            confirmLabel: 'Discard',
            destructive: true
          })) {
            closePaymentModal();
          }
        };
      }
    });
  } catch (err) {
    await window.crfvDialog.alert('Failed to load payment info.', { tone: 'error' });
  }
  hideSpinner();
};

// --- Authentication ---
async function checkAuthAndShowModal() {
  try {
    const res = await fetch('/api/check-auth', { credentials: 'same-origin' });
    if (!res.ok) {
      window.location.href = "/crfv/attendance";
    }
  } catch {
    window.location.href = "/crfv/attendance";
  }
}
document.addEventListener('DOMContentLoaded', checkAuthAndShowModal);

// --- Logout Button ---
document.addEventListener('DOMContentLoaded', function() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = async function() {
      await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
      window.location.reload();
    };
  }
});

// --- Clock ---
function updateClock() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', options);
  let hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeStr = [
    hours.toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0')
  ].join(':') + ' ' + ampm;
  document.getElementById('clock').innerText = `${dateStr} | ${timeStr}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- Spinner ---
function showSpinner() {
  document.getElementById('loadingSpinner').style.display = '';
}
function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', loadAttendees);

// --- Auto-Refresh ---
setInterval(() => {
  if (document.querySelector('.tab-btn.active').dataset.tab === 'attendees') {
    loadAttendees();
  }
}, 1000000);

// --- Spinner Helpers ---
function showSpinner() {
  document.getElementById('loadingSpinner').style.display = '';
}
function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

window.closePaymentModal = function() {
  document.getElementById('paymentModal').style.display = 'none';
};

// --- Update Accommodation Table on Data Load ---
function updateAllAccommodationUI() {
  updateAccommodationCounters(attendeesData);
  updateAccommodationTable();
}

// Call this after attendeesData is loaded
// In your loadAttendees() function, after attendeesData = data.attendees || [];
// add:
updateAllAccommodationUI();
