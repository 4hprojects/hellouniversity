// --- Utility: Format date as DD MMM YYYY ---
function formatDDMMMYYYY(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function escapeAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// --- State ---
let currentEventId = '';
let attendeesData = [];
let accommodationData = [];
let attendanceData = [];
let attendeesPage = 1;
let attendeesPerPage = 10;
let attendeesSort = { key: '', asc: true };
let accommodationPage = 1;
let accommodationPerPage = 10;
let accommodationSort = { key: '', asc: true };
let attendancePage = 1;
let attendancePerPage = 10;
let attendanceSort = { key: '', asc: true };

// --- DOM Elements ---
const eventFilter = document.getElementById('eventFilter');
const attendeesTableBody = document.getElementById('attendeesTableBody');
const accommodationTableBody = document.getElementById('accommodationTableBody');
const attendanceTableBody = document.getElementById('attendanceTableBody');

async function ensureAuthenticated() {
  try {
    const res = await fetch('/api/check-auth', { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (data && data.authenticated === true) {
      return true;
    }
  } catch (err) {
    console.error('Auth check failed:', err);
  }
  window.location.href = '/crfv/index';
  return false;
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', async () => {
  const ok = await ensureAuthenticated();
  if (!ok) return;
  showSpinner();
  await populateEventDropdown();
  await loadAllData();
  hideSpinner();
});

// --- Populate Event Dropdown ---
async function fetchEventsForReports() {
  const endpoints = ['/api/events/all', '/api/events'];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { credentials: 'same-origin' });
      if (!res.ok) {
        continue;
      }

      const payload = await res.json();
      const events = Array.isArray(payload) ? payload : (Array.isArray(payload?.events) ? payload.events : []);
      if (Array.isArray(events)) {
        return events;
      }
    } catch (error) {
      console.warn(`Failed to load events from ${endpoint}.`, error);
    }
  }

  return [];
}

async function populateEventDropdown() {
  const events = await fetchEventsForReports();
  eventFilter.innerHTML = '<option value="">All Events</option>';

  if (!Array.isArray(events) || events.length === 0) {
    console.warn('No events returned for reports dropdown.');
    return;
  }

  events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.event_id;
    opt.textContent = `${ev.event_name} (${formatDDMMMYYYY(ev.start_date)} - ${formatDDMMMYYYY(ev.end_date)})`;
    eventFilter.appendChild(opt);
  });
}

// --- Event Filter Change ---
eventFilter.addEventListener('change', async () => {
  currentEventId = eventFilter.value;
  await loadAllData();
});

// --- Tab Switching ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', async function() {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    this.classList.add('active');
    this.setAttribute('aria-selected', 'true');
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    // Show the selected tab
    const tabId = this.getAttribute('data-tab');
    document.getElementById(tabId).style.display = 'block';
    // Fetch and populate data for the selected tab
    await loadAllData();
  });
});

// --- Load All Data ---
async function loadAllData() {
  showSpinner();
  const eventParam = currentEventId ? `?event_id=${currentEventId}` : '';
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

  if (activeTab === 'attendees') {
    attendeesData = await fetch(`/api/attendees${eventParam}`).then(res => res.json());
    updateAttendeesTable();

    if (window.updateAllCounters) updateAllCounters(attendeesData);

    const selectedEvent = eventFilter.options[eventFilter.selectedIndex]?.text || 'All Events';
    if (window.updateDashboardLabel) updateDashboardLabel(selectedEvent, attendeesData.length);
  } else if (activeTab === 'accommodation') {
    accommodationData = await fetch(`/api/accommodation${eventParam}`).then(res => res.json());
    updateAccommodationTable();
  } else if (activeTab === 'attendance') {
    attendanceData = await fetch(`/api/attendance${eventParam}`).then(res => res.json());
    updateAttendanceTable();
  }
  hideSpinner();
}

// --- Attendees Table ---
function updateAttendeesTable() {
  const query = document.getElementById('searchAttendees').value.trim().toLowerCase();

  // Improved: Search all fields of each attendee
  let filtered = attendeesData.filter(att => {
    return Object.values(att)
      .filter(val => val !== null && val !== undefined)
      .some(val => String(val).toLowerCase().includes(query));
  });

  if (attendeesSort.key) {
    filtered.sort((a, b) => {
      let valA = a[attendeesSort.key] || '';
      let valB = b[attendeesSort.key] || '';
      return attendeesSort.asc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }
  const start = (attendeesPage - 1) * attendeesPerPage;
  const paged = attendeesPerPage === 'all' ? filtered : filtered.slice(start, start + attendeesPerPage);
  renderAttendeesTable(paged);
  renderAttendeesPagination(filtered.length);

  // --- Update dashboard label with filtered count ---
  const selectedEvent = eventFilter.options[eventFilter.selectedIndex]?.text || 'All Events';
  if (window.updateDashboardLabel) updateDashboardLabel(selectedEvent, filtered.length);
}

function renderAttendeesTable(data) {
  attendeesTableBody.innerHTML = data.map(att => `
    <tr>
      <td>${att.attendee_no}</td>
      <td>${att.last_name || ''}</td>
      <td>${att.first_name || ''}</td>
      <td>${att.organization || ''}</td>
      <td>${att.rfid || ''}</td>
      <td>${att.confirmation_code || ''}</td>
      <td>${att.payment_status || 'Accounts Receivable'}</td>
      <td>${att.att_status || ''}</td>
      <td>
        <button type="button" class="btn btn-info" data-action="edit-info" data-attendee-no="${escapeAttribute(att.attendee_no)}">Edit Info</button>
        <button type="button" class="btn btn-payment" data-action="edit-payment" data-attendee-no="${escapeAttribute(att.attendee_no)}">Edit Payment</button>
      </td>
    </tr>
  `).join('');
}

function renderAttendeesPagination(total) {
  const pages = attendeesPerPage === 'all' ? 1 : Math.ceil(total / attendeesPerPage);
  const pagDiv = document.getElementById('attendeesPagination');
  pagDiv.innerHTML = `
    <label>Show
      <select id="attendeesPerPage">
        <option value="10" ${attendeesPerPage==10?'selected':''}>10</option>
        <option value="25" ${attendeesPerPage==25?'selected':''}>25</option>
        <option value="50" ${attendeesPerPage==50?'selected':''}>50</option>
        <option value="100" ${attendeesPerPage==100?'selected':''}>100</option>
        <option value="all" ${attendeesPerPage==='all'?'selected':''}>All</option>
      </select>
    </label>
    <span>Page ${attendeesPage} of ${pages}</span>
    <button id="attendeesPrev" ${attendeesPage<=1?'disabled':''}>&lt; Prev</button>
    <button id="attendeesNext" ${attendeesPage>=pages?'disabled':''}>Next &gt;</button>
  `;
  document.getElementById('attendeesPerPage').onchange = e => {
    attendeesPerPage = e.target.value === 'all' ? 'all' : Number(e.target.value);
    attendeesPage = 1;
    updateAttendeesTable();
  };
  document.getElementById('attendeesPrev').onclick = () => {
    if (attendeesPage > 1) { attendeesPage--; updateAttendeesTable(); }
  };
  document.getElementById('attendeesNext').onclick = () => {
    if (attendeesPage < pages) { attendeesPage++; updateAttendeesTable(); }
  };
}

// --- Accommodation Table ---
function updateAccommodationTable() {
  const query = document.getElementById('searchAccommodation').value.trim().toLowerCase();
  let filtered = accommodationData.filter(a =>
    [a.first_name, a.last_name, a.organization, a.accommodation]
      .filter(Boolean).join(' ').toLowerCase().includes(query)
  );
  if (accommodationSort.key) {
    filtered.sort((a, b) => {
      let valA = a[accommodationSort.key] || '';
      let valB = b[accommodationSort.key] || '';
      return accommodationSort.asc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }
  const start = (accommodationPage - 1) * accommodationPerPage;
  const paged = accommodationPerPage === 'all' ? filtered : filtered.slice(start, start + accommodationPerPage);
  renderAccommodationTable(paged);
  renderAccommodationPagination(filtered.length);
  updateAccommodationCounters(filtered);

  // Update label
  const selectedEvent = eventFilter.options[eventFilter.selectedIndex]?.text || 'All Events';
  updateAccommodationLabel(selectedEvent, filtered.length);
}

function renderAccommodationTable(data) {
  accommodationTableBody.innerHTML = data.map(a => `
    <tr>
      <td>${a.last_name || ''}</td>
      <td>${a.first_name || ''}</td>
      <td>${a.organization || ''}</td>
      <td>${a.accommodation || ''}</td>
      <td>${a.event_name || ''}</td>
    </tr>
  `).join('');
}

function renderAccommodationPagination(total) {
  const pages = accommodationPerPage === 'all' ? 1 : Math.ceil(total / accommodationPerPage);
  const pagDiv = document.getElementById('accommodationPagination');
  pagDiv.innerHTML = `
    <label>Show
      <select id="accommodationPerPage">
        <option value="10" ${accommodationPerPage==10?'selected':''}>10</option>
        <option value="25" ${accommodationPerPage==25?'selected':''}>25</option>
        <option value="50" ${accommodationPerPage==50?'selected':''}>50</option>
        <option value="100" ${accommodationPerPage==100?'selected':''}>100</option>
        <option value="all" ${accommodationPerPage==='all'?'selected':''}>All</option>
      </select>
    </label>
    <span>Page ${accommodationPage} of ${pages}</span>
    <button id="accommodationPrev" ${accommodationPage<=1?'disabled':''}>&lt; Prev</button>
    <button id="accommodationNext" ${accommodationPage>=pages?'disabled':''}>Next &gt;</button>
  `;
  document.getElementById('accommodationPerPage').onchange = e => {
    accommodationPerPage = e.target.value === 'all' ? 'all' : Number(e.target.value);
    accommodationPage = 1;
    updateAccommodationTable();
  };
  document.getElementById('accommodationPrev').onclick = () => {
    if (accommodationPage > 1) { accommodationPage--; updateAccommodationTable(); }
  };
  document.getElementById('accommodationNext').onclick = () => {
    if (accommodationPage < pages) { accommodationPage++; updateAccommodationTable(); }
  };
}

// --- Attendance Table ---
function updateAttendanceTable() {
  attendanceTableBody.innerHTML = attendanceData.map(rec => `
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
document.getElementById('searchAttendance').addEventListener('input', function() {
  attendancePage = 1; // Reset to first page on new search
  updateAttendanceTable();
});

attendeesTableBody.addEventListener('click', async (event) => {
  const actionButton = event.target.closest('button[data-action][data-attendee-no]');
  if (!actionButton || !attendeesTableBody.contains(actionButton)) {
    return;
  }

  const attendeeNo = actionButton.dataset.attendeeNo;
  if (!attendeeNo) {
    return;
  }

  if (actionButton.dataset.action === 'edit-info' && typeof window.openInfoModal === 'function') {
    await window.openInfoModal(attendeeNo);
    return;
  }

  if (actionButton.dataset.action === 'edit-payment' && typeof window.openPaymentModal === 'function') {
    await window.openPaymentModal(attendeeNo);
  }
});

// --- Spinner Helpers ---
function showSpinner() {
  document.getElementById('loadingSpinner').style.display = '';
}
function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
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
  <div class="section-title" style="grid-column: 1 / -1; display: flex; align-items: center;">
    <span>System Info</span>
    <span style="flex:1"></span>
    <span style="font-weight: normal; font-size: 1rem; color: #444;">
      Attendee No:  <input type="text" name="attendee_no" value="${data.attendee_no || ''}" readonly>
    </span>
  </div>
    <label>Confirmation Code
      <input type="text" name="confirmation_code" value="${data.confirmation_code || ''}" readonly>
    </label>
    <label>Attendance Status
      <select name="att_status" id="att_status" required>
        <option value="Pending" ${data.att_status === 'Pending' ? 'selected' : ''}>Pending</option>
        <option value="Confirmed" ${data.att_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
        <option value="Cancelled" ${data.att_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        <option value="No Show" ${data.att_status === 'No Show' ? 'selected' : ''}>No Show</option>
        <option value="Checked In" ${data.att_status === 'Checked In' ? 'selected' : ''}>Checked In</option>
        <option value="Walk In" ${data.att_status === 'Walk In' ? 'selected' : ''}>Walk In</option>
        <option value="Excused" ${data.att_status === 'Excused' ? 'selected' : ''}>Excused</option>
        <option value="Left Early" ${data.att_status === 'Left Early' ? 'selected' : ''}>Left Early</option>
        <option value="Invalid" ${data.att_status === 'Invalid' ? 'selected' : ''}>Invalid</option>
      </select>
    </label>
    <label>Event ID <span>*</span>
      <input type="text" name="event_id" value="${data.event_id || ''}" required readonly>
    </label>
    <label class="highlighted"><b>RFID <span>*</span></b>
      <input type="text" name="rfid" value="${data.rfid || ''}" required autofocus>
    </label>

    <div class="section-title" style="grid-column: 1 / -1;">Personal Info</div>
    <label>First Name <span>*</span>
      <input type="text" name="first_name" value="${data.first_name || ''}" required>
    </label>
    <label>Middle Name
      <input type="text" name="middle_name" value="${data.middle_name || ''}">
    </label>
    <label>Last Name <span>*</span>
      <input type="text" name="last_name" value="${data.last_name || ''}" required>
    </label>
    <label>Contact No
      <input type="text" name="contact_no" value="${data.contact_no || ''}">
    </label>
    <label>Email
      <input type="email" name="email" value="${data.email || ''}">
    </label>
    <label>Gender <span>*</span>
      <select name="gender" required>
        <option value="">Select</option>
        <option value="Male" ${data.gender === 'Male' ? 'selected' : ''}>Male</option>
        <option value="Female" ${data.gender === 'Female' ? 'selected' : ''}>Female</option>
        <option value="Other" ${data.gender === 'Other' ? 'selected' : ''}>Prefer not to say</option>
      </select>
    </label>
    <label>Certificate Name
      <input type="text" name="certificate_name" value="${data.certificate_name || ''}">
    </label>
    <label>Organization <span>*</span>
      <input type="text" name="organization" value="${data.organization || ''}" required>
    </label>
    <label>Designation <span>*</span>
      <input type="text" name="designation" value="${data.designation || ''}" required>
    </label>

    <div class="section-title" style="grid-column: 1 / -1;">Accommodation Info</div>
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
    <div></div>
    <div></div>

    <div class="modal-actions full-row" style="grid-column: 1 / -1;">
      <button type="button" class="btn btn-cancel"><i class="fas fa-times"></i> Cancel</button>
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
        certificate_name: form.certificate_name.value,
        att_status: form.att_status.value
      };
      await fetch(`/api/attendees/${attendee_no}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      await loadAllData(); // <-- Use this
      closeInfoModal();

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
window.closePaymentModal = function() {
  document.getElementById('paymentModal').style.display = 'none';
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
    // --- ADD PAYMENT ---
    if (!payments.length) {
      modal.querySelector('.modal-content').innerHTML = `
        <h3>Add Payment Record</h3>
        <form id="addPaymentForm">
          <div class="modal-form-grid">
            <label for="payment_status">Payment Status *</label>
            <select class="field" id="payment_status" name="payment_status" required style="width:100%;">
              <option value="Accounts Receivable" selected>Accounts Receivable</option>
              <option value="Fully Paid">Fully Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Scholar">Scholar</option>
              <option value="Others">Others</option>
            </select>

            <label for="amount">Amount *</label>
            <input class="field" id="amount" name="amount" type="number" step="0.01" required>

            <label for="form_of_payment">Form of Payment *</label>
            <div class="field" style="display:flex;gap:8px;">
              <select class="form-of-payment-select" id="form_of_payment" name="form_of_payment" style="flex:1;" required>
                <option value="">Select</option>
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
            <input class="field" id="date_full_payment" name="date_full_payment" type="date">

            <label for="date_partial_payment">Date Partial Payment</label>
            <input class="field" id="date_partial_payment" name="date_partial_payment" type="date">

            <label for="account">Account</label>
            <input class="field" id="account" name="account" type="text">

            <label for="or_number">OR Number *</label>
            <input class="field" id="or_number" name="or_number" type="text" required>

            <label for="quickbooks_no">QuickBooks No</label>
            <input class="field" id="quickbooks_no" name="quickbooks_no" type="text">

            <label for="shipping_tracking_no">Shipping Tracking No</label>
            <input class="field" id="shipping_tracking_no" name="shipping_tracking_no" type="text">

            <label class="notes-label">Notes:</label>
            <textarea class="field notes-field" id="notes" name="notes" rows="2"></textarea>

            <div class="modal-actions full-row" align="right" style="grid-column: 1 / -1;">
              <button type="button" class="btn btn-cancel" id="cancelPaymentBtn">Cancel</button>
              <button type="submit" class="btn btn-save-exit">Save and Exit</button>
            </div>
            <div id="paymentFormError" style="color:red;display:none;margin-top:8px;"></div>
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
        const errorDiv = modal.querySelector('#paymentFormError');
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        const form = e.target;
        let form_of_payment = formOfPaymentSelect.value;
        if (form_of_payment === 'Others') {
          if (!formOfPaymentOther.value.trim()) {
            errorDiv.textContent = 'Please specify the form of payment.';
            errorDiv.style.display = '';
            formOfPaymentOther.focus();
            return;
          }
          form_of_payment = formOfPaymentOther.value.trim();
        }
        const payload = {
          attendee_no,
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
        modal.querySelector('.btn-save-exit').disabled = true;
        try {
          const res = await fetch('/api/payments', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error('Failed to save payment.');
          await loadAllData();
          closePaymentModal();
        } catch (err) {
          errorDiv.textContent = err.message || 'Failed to save payment.';
          errorDiv.style.display = '';
        } finally {
          modal.querySelector('.btn-save-exit').disabled = false;
        }
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

      modal.style.display = 'flex';
      hideSpinner();
      return;
    }

    // --- EDIT PAYMENT ---
    modal.querySelector('.modal-content').innerHTML = `
      <h3>Edit Payment Record${payments.length > 1 ? 's' : ''}</h3>
      <div>
        ${payments.map(p => `
          <form class="paymentForm modal-form-grid" data-id="${p.payment_id}">
            <label style="grid-column: 1 / 2;">Status *</label>
            <select name="payment_status" class="field" required style="grid-column: 2 / 3; width: 100%;">
              <option value="Accounts Receivable" ${!p.payment_status || p.payment_status === 'Accounts Receivable' ? 'selected' : ''}>Accounts Receivable</option>
              <option value="Fully Paid" ${p.payment_status === 'Fully Paid' ? 'selected' : ''}>Fully Paid</option>
              <option value="Partially Paid" ${p.payment_status === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
              <option value="Scholar" ${p.payment_status === 'Scholar' ? 'selected' : ''}>Scholar</option>
              <option value="Others" ${p.payment_status === 'Others' ? 'selected' : ''}>Others</option>
            </select>
            <label style="grid-column: 3 / 4;">Form of Payment *</label>
            <div class="field" style="display:flex;gap:8px;grid-column: 4 / 5;">
              <select name="form_of_payment" class="form-of-payment-select" style="grid-column: 2 / 3;width:100%;" required>
                <option value="">Select</option>
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
            <label style="grid-column: 1 / 2;">Date Full Payment</label>
            <input type="date" name="date_full_payment" class="field" value="${p.date_full_payment ? p.date_full_payment.substring(0,10) : ''}" style="grid-column: 2 / 3;">
            <label style="grid-column: 3 / 4;">Amount *</label>
            <input type="number" name="amount" class="field" value="${p.amount || ''}" min="0" step="0.01" required style="grid-column: 4 / 5;">
            <label style="grid-column: 1 / 2;">Date Partial Payment</label>
            <input type="date" name="date_partial_payment" class="field" value="${p.date_partial_payment ? p.date_partial_payment.substring(0,10) : ''}" style="grid-column: 2 / 3;">
            <label style="grid-column: 3 / 4;">OR Number *</label>
            <input type="text" name="or_number" class="field" value="${p.or_number || ''}" required style="grid-column: 4 / 5;">
            <label style="grid-column: 1 / 2;">Account</label>
            <input type="text" name="account" class="field" value="${p.account || ''}" style="grid-column: 2 / 3;">
            <label style="grid-column: 3 / 4;">Quickbooks No</label>
            <input type="text" name="quickbooks_no" class="field" value="${p.quickbooks_no || ''}" style="grid-column: 4 / 5;">
            <label style="grid-column: 1 / 2;">Shipping Tracking No</label>
            <input type="text" name="shipping_tracking_no" class="field" value="${p.shipping_tracking_no || ''}" style="grid-column: 2 / 3;">
            <div style="grid-column: 3 / 5;"></div>
            <label class="notes-label" style="grid-column: 1 / 2;">Notes:</label>
            <textarea name="notes" class="field notes-field" rows="2" style="grid-column: 2 / 5;">${p.notes || ''}</textarea>
            <div class="modal-actions full-row">
              <button type="button" class="btn btn-cancel"><i class="fas fa-times"></i> Cancel</button>
              <button type="submit" class="btn btn-save-exit"><i class="fas fa-save"></i> Save</button>
            </div>
            <div class="paymentFormError" style="color:red;display:none;margin-top:8px;"></div>
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
        const errorDiv = form.querySelector('.paymentFormError');
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        if (!await window.crfvDialog.confirm('Are you sure you want to save changes and exit?', {
          title: 'Confirm action',
          confirmLabel: 'Save'
        })) return;
        let form_of_payment = form.form_of_payment.value;
        let form_of_payment_other = form.form_of_payment_other.value;
        if (form_of_payment === 'Others') {
          if (!form_of_payment_other.trim()) {
            errorDiv.textContent = 'Please specify the form of payment.';
            errorDiv.style.display = '';
            form.form_of_payment_other.focus();
            return;
          }
          form_of_payment = form_of_payment_other.trim();
        }
        const payment_id = form.getAttribute('data-id');
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
        form.querySelector('.btn-save-exit').disabled = true;
        try {
          const res = await fetch(`/api/payments/${payment_id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error('Failed to save payment.');
          await loadAllData();
          closePaymentModal();
        } catch (err) {
          errorDiv.textContent = err.message || 'Failed to save payment.';
          errorDiv.style.display = '';
        } finally {
          form.querySelector('.btn-save-exit').disabled = false;
        }
      };

      // Cancel confirmation
      const cancelBtn = form.querySelector('.btn-cancel');
      if (cancelBtn) {
        cancelBtn.onclick = async function(e) {
          e.preventDefault();
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


// --- Attendees Table Sorting ---
document.querySelectorAll('#attendeesTable th.sortable').forEach(th => {
  th.style.cursor = 'pointer';
  th.onclick = function() {
    const key = th.getAttribute('data-key');
    // Cycle: no sort -> asc -> desc -> no sort
    if (attendeesSort.key !== key) {
      attendeesSort.key = key;
      attendeesSort.asc = true;
    } else if (attendeesSort.asc) {
      attendeesSort.asc = false;
    } else {
      attendeesSort.key = '';
    }
    attendeesPage = 1;
    updateAttendeesTable();
    updateSortIndicators();
  };
});

document.querySelectorAll('#attendanceTable th.sortable').forEach(th => {
  th.onclick = function() {
    const key = th.getAttribute('data-key');
    // Cycle: no sort -> asc -> desc -> no sort
    if (attendanceSort.key !== key) {
      attendanceSort.key = key;
      attendanceSort.asc = true;
    } else if (attendanceSort.asc) {
      attendanceSort.asc = false;
    } else {
      attendanceSort.key = '';
    }
    attendancePage = 1;
    updateAttendanceTable();
    updateAttendanceSortIndicators();
  };
});

// --- Update Sort Indicators ---
function updateSortIndicators() {
  document.querySelectorAll('#attendeesTable th.sortable').forEach(th => {
    th.innerHTML = th.textContent.replace(/[\u25B2\u25BC]/g, ''); // Remove old arrows
    const key = th.getAttribute('data-key');
    if (attendeesSort.key === key) {
      th.innerHTML += attendeesSort.asc ? ' &#9650;' : ' &#9660;'; // ▲ or ▼
    }
  });
}

function updateDashboardLabel(eventName, totalResults) {
  const labelDiv = document.getElementById('dashboardLabel');
  labelDiv.textContent = `Event: ${eventName || 'All Events'} | Search Results: ${totalResults}`;
}

function updateDashboardLabel(eventName, totalResults) {
  const labelDiv = document.getElementById('dashboardLabel');
  labelDiv.innerHTML = `<i class="fas fa-info-circle" style="color:#3498db;margin-right:0.5em;"></i>
    Event: <br>&nbsp;&nbsp;<span style="font-weight:600; font-size:1.3em;">${eventName || 'All Events'}</span>
    &nbsp;<br>&nbsp; Search Results: <span style="font-weight:600">${totalResults}</span>`;
}

function updateAccommodationLabel(eventName, totalResults) {
  const labelDiv = document.getElementById('accommodationLabel');
  labelDiv.innerHTML = `<i class="fas fa-info-circle" style="color:#3498db;margin-right:0.5em;"></i>
    Event: <br>&nbsp;&nbsp;<span style="font-weight:600; font-size:1.3em;">${eventName || 'All Events'}</span>
    &nbsp;<br>&nbsp; Search Results: <span style="font-weight:600">${totalResults}</span>`;
}

function updateAttendanceLabel(eventName, totalResults) {
  const labelDiv = document.getElementById('attendanceLabel');
  labelDiv.innerHTML = `<i class="fas fa-info-circle" style="color:#3498db;margin-right:0.5em;"></i>
    Event: <br>&nbsp;&nbsp;<span style="font-weight:600; font-size:1.3em;">${eventName || 'All Events'}</span>
    &nbsp;<br>&nbsp; Search Results: <span style="font-weight:600">${totalResults}</span>`;
}

function updateAttendanceSortIndicators() {
  document.querySelectorAll('#attendanceTable th.sortable').forEach(th => {
    th.innerHTML = th.textContent.replace(/[\u25B2\u25BC]/g, ''); // Remove old arrows
    const key = th.getAttribute('data-key');
    if (attendanceSort.key === key) {
      th.innerHTML += attendanceSort.asc ? ' &#9650;' : ' &#9660;'; // ▲ or ▼
    }
  });
}
