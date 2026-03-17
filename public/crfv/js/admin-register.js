document.addEventListener('DOMContentLoaded', function() {
  const eventSelect = document.getElementById('event_id');
  const bulkEventSelect = document.getElementById('bulkEventSelect');
  const bulkFileInput = document.getElementById('bulkFileInput');
  const uploadBulkBtn = document.getElementById('uploadBulkBtn');
  const bulkUploadStatus = document.getElementById('bulkUploadStatus');
  let bulkParsedRows = [];

  // Populate both dropdowns with events
  fetch('/api/events/latest')
    .then(res => res.json())
    .then(events => {
      // Single registration dropdown
      if (eventSelect) {
        eventSelect.innerHTML = '';
        if (Array.isArray(events) && events.length > 0) {
          eventSelect.innerHTML = '<option value="">Select event...</option>';
          events.forEach(ev => {
            eventSelect.innerHTML += `<option value="${ev.event_id}">${ev.event_name} (${ev.start_date})</option>`;
          });
        } else {
          eventSelect.innerHTML = '<option value="">No upcoming events</option>';
        }
      }
      // Bulk registration dropdown
      if (bulkEventSelect) {
        bulkEventSelect.innerHTML = '';
        if (Array.isArray(events) && events.length > 0) {
          bulkEventSelect.innerHTML = '<option value="">Select event...</option>';
          events.forEach(ev => {
            bulkEventSelect.innerHTML += `<option value="${ev.event_id}">${ev.event_name} (${ev.start_date})</option>`;
          });
          bulkEventSelect.disabled = false;
        } else {
          bulkEventSelect.innerHTML = '<option value="">No upcoming events</option>';
          bulkEventSelect.disabled = true;
        }
      }
    })
    .catch(() => {
      if (bulkEventSelect) {
        bulkEventSelect.innerHTML = '<option value="">Failed to load events</option>';
        bulkEventSelect.disabled = true;
      }
      if (eventSelect) {
        eventSelect.innerHTML = '<option value="">Failed to load events</option>';
        eventSelect.disabled = true;
      }
    });

  // Accommodation "Others" logic
  const accommodation = document.getElementById('accommodation');
  const otherRow = document.getElementById('accommodationOtherRow');
  const otherInput = document.getElementById('accommodationOther');
  if (accommodation && otherRow && otherInput) {
    accommodation.addEventListener('change', function() {
      if (accommodation.value === 'Others') {
        otherRow.style.display = '';
        otherInput.required = true;
      } else {
        otherRow.style.display = 'none';
        otherInput.required = false;
        otherInput.value = '';
      }
    });
  }

  // Registration form logic
  const regForm = document.getElementById('registerForm');
  const statusDiv = document.getElementById('regStatus');
  if (regForm) {
    regForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (statusDiv) statusDiv.textContent = '';

      // Gather data
      const data = {
        firstName: regForm.first_name.value.trim(),
        middleName: regForm.middle_name.value.trim(),
        lastName: regForm.last_name.value.trim(),
        gender: regForm.gender ? regForm.gender.value : '',
        designation: regForm.designation ? regForm.designation.value.trim() : '',
        organization: regForm.organization.value.trim(),
        email: regForm.email.value.trim(),
        contactNo: regForm.phone_no.value.trim(),
        accommodation: regForm.accommodation ? regForm.accommodation.value : '',
        accommodationOther: regForm.accommodationOther ? regForm.accommodationOther.value.trim() : '',
        event_id: regForm.event_id.value,
        certificateName: regForm.certificateName ? regForm.certificateName.value.trim() : '',
        rfid: regForm.rfid ? regForm.rfid.value.trim() : ''
      };

      // Validation
      const required = ['firstName', 'lastName', 'organization', 'email', 'event_id'];
      const missing = required.filter(f => !data[f]);
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      if (missing.length > 0) {
        if (statusDiv) statusDiv.textContent = 'Missing: ' + missing.join(', ');
        return;
      }
      if (!emailValid) {
        if (statusDiv) statusDiv.textContent = 'Invalid email format';
        return;
      }
      if (data.accommodation === 'Others' && !data.accommodationOther) {
        if (statusDiv) statusDiv.textContent = 'Please specify accommodation.';
        return;
      }

      // Duplicate RFID check (optional)
      if (data.rfid) {
        const checkRes = await fetch(`/api/register/check-rfid?rfid=${encodeURIComponent(data.rfid)}`);
        const check = await checkRes.json();
        if (check.exists) {
          if (statusDiv) statusDiv.textContent = "RFID already used!";
          return;
        }
      }

      // Submit registration to /api/user-register
      if (statusDiv) statusDiv.textContent = "Registering...";
      const res = await fetch('/api/user-register', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        if (statusDiv) statusDiv.textContent = "Registration successful!";
        regForm.reset();
      } else {
        if (statusDiv) statusDiv.textContent = result.message || "Registration failed.";
      }
    });
  }

  // RFID required validation
  const form = document.getElementById('adminRegisterForm');
  form.addEventListener('submit', function(e) {
    const rfidInput = document.getElementById('rfid');
    if (!rfidInput.value.trim()) {
      e.preventDefault();
      alert('RFID is required.');
      rfidInput.focus();
    }
  });

  // Enable upload button only if file and event are selected
  function updateUploadBtnState() {
    // Enable only if an event is selected and rows are parsed from file
    uploadBulkBtn.disabled = !(bulkParsedRows.length && bulkEventSelect.value);
  }
  bulkFileInput.addEventListener('change', updateUploadBtnState);
  bulkEventSelect.addEventListener('change', updateUploadBtnState);

  // Parse XLSX file on selection
  bulkFileInput.addEventListener('change', function() {
    bulkParsedRows = [];
    bulkUploadStatus.textContent = '';
    const file = bulkFileInput.files[0];
    if (!file) {
      updateUploadBtnState();
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      bulkParsedRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      bulkUploadStatus.textContent = `Loaded ${bulkParsedRows.length} rows from file.`;
      updateUploadBtnState(); // <-- Make sure this is called here
    };
    reader.readAsArrayBuffer(file);
  });

  // Upload and register
  uploadBulkBtn.addEventListener('click', async function() {
    const selectedBulkEventId = bulkEventSelect.value;
    if (!selectedBulkEventId || !bulkParsedRows.length) {
      bulkUploadStatus.textContent = "Select event and upload a file first.";
      return;
    }
    uploadBulkBtn.disabled = true;
    bulkUploadStatus.textContent = "Uploading and processing...";
    try {
      const res = await fetch('/api/bulk-register/process-bulkregister-upload', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: selectedBulkEventId,
          rows: bulkParsedRows
        })
      });
      const result = await res.json();
      if (res.ok) {
        bulkUploadStatus.textContent = `✅ Registered: ${result.registered}, ⚠️ Duplicate: ${result.duplicate}, ❌ Error: ${result.error}, ⏭️ Skipped: ${result.skipped}`;
      } else {
        bulkUploadStatus.textContent = result.message || "Bulk registration failed.";
      }
    } catch (err) {
      bulkUploadStatus.textContent = "Bulk registration failed. Please try again.";
    }
    uploadBulkBtn.disabled = false;
  });
});
