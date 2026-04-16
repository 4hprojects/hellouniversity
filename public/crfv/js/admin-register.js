document.addEventListener('DOMContentLoaded', function() {
  const eventSelect = document.getElementById('event_id');
  const bulkEventSelect = document.getElementById('bulkEventSelect');
  const bulkFileInput = document.getElementById('bulkFileInput');
  const uploadBulkBtn = document.getElementById('uploadBulkBtn');
  const bulkUploadStatus = document.getElementById('bulkUploadStatus');
  const accommodation = document.getElementById('accommodation');
  const otherRow = document.getElementById('accommodationOtherRow');
  const otherInput = document.getElementById('accommodationOther');
  const regForm = document.getElementById('registerForm');
  const statusDiv = document.getElementById('regStatus');
  const legacyAdminForm = document.getElementById('adminRegisterForm');
  let bulkParsedRows = [];

  fetch('/api/events/latest')
    .then(response => response.json())
    .then(events => {
      if (eventSelect) {
        eventSelect.innerHTML = '';
        if (Array.isArray(events) && events.length > 0) {
          eventSelect.innerHTML = '<option value="">Select event...</option>';
          events.forEach(event => {
            eventSelect.innerHTML += `<option value="${event.event_id}">${event.event_name} (${event.start_date})</option>`;
          });
        } else {
          eventSelect.innerHTML = '<option value="">No upcoming events</option>';
        }
      }

      if (bulkEventSelect) {
        bulkEventSelect.innerHTML = '';
        if (Array.isArray(events) && events.length > 0) {
          bulkEventSelect.innerHTML = '<option value="">Select event...</option>';
          events.forEach(event => {
            bulkEventSelect.innerHTML += `<option value="${event.event_id}">${event.event_name} (${event.start_date})</option>`;
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

  if (regForm) {
    regForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      if (statusDiv) {
        statusDiv.textContent = '';
      }

      const payload = {
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

      const requiredFields = ['firstName', 'lastName', 'organization', 'email', 'event_id'];
      const missingFields = requiredFields.filter(field => !payload[field]);
      const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);

      if (missingFields.length > 0) {
        if (statusDiv) {
          statusDiv.textContent = `Missing: ${missingFields.join(', ')}`;
        }
        return;
      }

      if (!emailIsValid) {
        if (statusDiv) {
          statusDiv.textContent = 'Invalid email format';
        }
        return;
      }

      if (payload.accommodation === 'Others' && !payload.accommodationOther) {
        if (statusDiv) {
          statusDiv.textContent = 'Please specify accommodation.';
        }
        return;
      }

      if (payload.rfid) {
        const checkResponse = await fetch(`/api/register/check-rfid?rfid=${encodeURIComponent(payload.rfid)}`);
        const checkResult = await checkResponse.json();
        if (checkResult.exists) {
          if (statusDiv) {
            statusDiv.textContent = 'RFID already used!';
          }
          return;
        }
      }

      if (statusDiv) {
        statusDiv.textContent = 'Registering...';
      }

      const response = await fetch('/api/user-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.success) {
        if (statusDiv) {
          statusDiv.textContent = 'Registration successful!';
        }
        regForm.reset();
      } else if (statusDiv) {
        statusDiv.textContent = result.message || 'Registration failed.';
      }
    });
  }

  if (legacyAdminForm) {
    legacyAdminForm.addEventListener('submit', async function(event) {
      const rfidInput = document.getElementById('rfid');
      if (rfidInput && !rfidInput.value.trim()) {
        event.preventDefault();
        await window.crfvDialog.alert('RFID is required.', { tone: 'info' });
        rfidInput.focus();
      }
    });
  }

  function updateUploadBtnState() {
    if (!uploadBulkBtn) {
      return;
    }
    const hasRows = bulkParsedRows.length > 0;
    const hasEvent = Boolean(bulkEventSelect && bulkEventSelect.value);
    uploadBulkBtn.disabled = !(hasRows && hasEvent);
  }

  if (bulkFileInput) {
    bulkFileInput.addEventListener('change', updateUploadBtnState);
    bulkFileInput.addEventListener('change', function() {
      bulkParsedRows = [];
      if (bulkUploadStatus) {
        bulkUploadStatus.textContent = '';
      }

      const file = bulkFileInput.files[0];
      if (!file) {
        updateUploadBtnState();
        return;
      }

      const reader = new FileReader();
      reader.onload = function(loadEvent) {
        const data = new Uint8Array(loadEvent.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        bulkParsedRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (bulkUploadStatus) {
          bulkUploadStatus.textContent = `Loaded ${bulkParsedRows.length} rows from file.`;
        }
        updateUploadBtnState();
      };
      reader.readAsArrayBuffer(file);
    });
  }

  if (bulkEventSelect) {
    bulkEventSelect.addEventListener('change', updateUploadBtnState);
  }

  if (uploadBulkBtn) {
    uploadBulkBtn.addEventListener('click', async function() {
      const selectedEventId = bulkEventSelect ? bulkEventSelect.value : '';
      if (!selectedEventId || !bulkParsedRows.length) {
        if (bulkUploadStatus) {
          bulkUploadStatus.textContent = 'Select event and upload a file first.';
        }
        return;
      }

      uploadBulkBtn.disabled = true;
      if (bulkUploadStatus) {
        bulkUploadStatus.textContent = 'Uploading and processing...';
      }

      try {
        const response = await fetch('/api/bulk-register/process-bulkregister-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: selectedEventId,
            rows: bulkParsedRows
          })
        });
        const result = await response.json();

        if (bulkUploadStatus) {
          if (response.ok) {
            bulkUploadStatus.textContent = `Registered: ${result.registered}, Duplicate: ${result.duplicate}, Error: ${result.error}, Skipped: ${result.skipped}`;
          } else {
            bulkUploadStatus.textContent = result.message || 'Bulk registration failed.';
          }
        }
      } catch (error) {
        if (bulkUploadStatus) {
          bulkUploadStatus.textContent = 'Bulk registration failed. Please try again.';
        }
      }

      uploadBulkBtn.disabled = false;
    });
  }
});
