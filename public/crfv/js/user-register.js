//user-register.js
document.addEventListener('DOMContentLoaded', () => {
  // --- Form Elements ---
  const form = document.getElementById('userRegisterForm');
  const accommodation = document.getElementById('accommodation');
  const accommodationOther = document.getElementById('accommodationOther');
  const accommodationOtherContainer = document.getElementById('accommodationOtherContainer');
  const eventSelect = document.getElementById('eventId');
  const registerMessage = document.getElementById('registerMessage');
  const certificateNameInput = document.getElementById('certificateName');
  const reviewCertificateName = document.getElementById('reviewCertificateName');
  const eventAgree = document.getElementById('eventAgree');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const nextBtn1 = document.getElementById('nextBtn1');
  const nextBtn2 = document.getElementById('nextBtn2');
  const prevBtn1 = document.getElementById('prevBtn1');
  const prevBtn2 = document.getElementById('prevBtn2');
  const progressBar = document.getElementById('progressBar');
  const orgType = document.getElementById('organizationType');
  const orgNameRow = document.getElementById('orgNameRow');
  const regionRow = document.getElementById('regionRow');
  const provinceRow = document.getElementById('provinceRow');
  const municipalityRow = document.getElementById('municipalityRow');
  const barangayRow = document.getElementById('barangayRow');
  const organizationInput = document.getElementById('organization');

  // --- Populate Events Dropdown ---
  fetch('/api/events/latest')
    .then(res => res.json())
    .then(events => {
      eventSelect.innerHTML = '';
      if (Array.isArray(events) && events.length > 0) {
        eventSelect.innerHTML = '<option value="">Select event...</option>';
        events.forEach(ev => {
          eventSelect.innerHTML += `<option value="${ev.event_id}">${ev.event_name} (${ev.start_date})</option>`;
        });
        eventSelect.disabled = false;
      } else {
        eventSelect.innerHTML = '<option value="">No upcoming events</option>';
        eventSelect.disabled = true;
      }
    })
    .catch(() => {
      eventSelect.innerHTML = '<option value="">Failed to load events</option>';
      eventSelect.disabled = true;
    });

  // --- Accommodation "Others" Logic ---
  accommodation.addEventListener('change', function() {
    if (this.value === 'Others') {
      accommodationOtherContainer.style.display = 'block';
      accommodationOther.required = true;
    } else {
      accommodationOtherContainer.style.display = 'none';
      accommodationOther.required = false;
      accommodationOther.value = '';
    }
  });

  // --- Certificate Name Real-time Update ---
  if (certificateNameInput && reviewCertificateName) {
    certificateNameInput.addEventListener('input', function() {
      reviewCertificateName.textContent = certificateNameInput.value || '-';
    });
  }

  // --- Event Agreement Logic ---
  if (eventAgree && certificateNameInput) {
    eventAgree.addEventListener('change', function() {
      certificateNameInput.disabled = !this.checked;
      if (!this.checked) {
        certificateNameInput.value = '';
        reviewCertificateName.textContent = '-';
      }
    });
  }

  // --- Step Navigation ---
  nextBtn1.addEventListener('click', function() {
    const requiredFields = step1.querySelectorAll('[required]');
    let firstInvalid = null;
    let isValid = true;
    requiredFields.forEach(field => {
      if (!field.value) {
        field.style.borderColor = 'var(--warning)';
        if (!firstInvalid) firstInvalid = field;
        isValid = false;
      } else {
        field.style.borderColor = '#d1d5db';
      }
    });
    if (isValid) {
      step1.classList.remove('active');
      step2.classList.add('active');
      progressBar.style.width = '66%';
      updateStep(2);
    } else {
      showMessage('Please fill all required fields', 'error');
      if (firstInvalid) firstInvalid.focus();
    }
  });

  nextBtn2.addEventListener('click', function() {
    const requiredFields = step2.querySelectorAll('[required]');
    let isValid = true;
    requiredFields.forEach(field => {
      if (!field.value) {
        field.style.borderColor = 'var(--warning)';
        isValid = false;
      } else {
        field.style.borderColor = '#d1d5db';
      }
    });
    const emailValue = form.email.value.trim();
    if (emailValue && !isValidEmail(emailValue)) {
      form.email.classList.add('invalid');
      showMessage('Please enter a valid email address (e.g., name@example.com)', 'error');
      form.email.focus();
      isValid = false;
      return;
    } else {
      form.email.classList.remove('invalid');
    }
    if (isValid) {
      step2.classList.remove('active');
      step3.classList.add('active');
      progressBar.style.width = '100%';
      updateStep(3);
      updateReview();

      // Focus the first form-row in Step 3
      const firstFormRow = document.querySelector('#step3 .form-row');
      if (firstFormRow) {
        firstFormRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
        firstFormRow.focus?.(); // If you want to set keyboard focus
      }
    } else {
      showMessage('Please fill all required fields', 'error');
    }
  });

  prevBtn1.addEventListener('click', function() {
    step2.classList.remove('active');
    step1.classList.add('active');
    progressBar.style.width = '33%';
    updateStep(1);
  });

  prevBtn2.addEventListener('click', function() {
    step3.classList.remove('active');
    step2.classList.add('active');
    progressBar.style.width = '66%';
    updateStep(2);
  });

  function updateStep(step) {
    document.querySelectorAll('.step').forEach((stepEl, index) => {
      if (index < step) {
        stepEl.classList.add('active');
      } else {
        stepEl.classList.remove('active');
      }
    });
  }

  function updateReview() {
    document.getElementById('reviewEvent').textContent =
      document.querySelector('#eventId option:checked').text || '-';
    const firstName = document.getElementById('firstName').value;
    const middleName = document.getElementById('middleName').value;
    const lastName = document.getElementById('lastName').value;
    let fullName = firstName;
    if (middleName) fullName += ` ${middleName}`;
    fullName += ` ${lastName}`;
    document.getElementById('reviewName').textContent = fullName;
    document.getElementById('reviewGender').textContent =
      document.querySelector('#gender option:checked').text || '-';
    document.getElementById('reviewDesignation').textContent =
      document.getElementById('designation').value || '-';

    // Organization Type and Name
    let organization_type = '';
    let organization_name = '';
    if (orgType.value === 'Private Organization') {
      organization_type = 'Private';
      organization_name = organizationInput.value.trim();
    } else if (orgType.value === 'Others') {
      organization_type = 'Other';
      organization_name = organizationInput.value.trim();
    } else {
      organization_type = orgType.value;
      organization_name = orgType.value;
      if (form.province.value) organization_name += ` - ${form.province.value}`;
      if (form.municipality.value) organization_name += `, ${form.municipality.value}`;
      if (form.barangay.value) organization_name += `, ${form.barangay.value}`;
    }
    document.getElementById('reviewOrganizationType').textContent = organization_type || '-';
    document.getElementById('reviewOrganization').textContent = organization_name || '-';

    document.getElementById('reviewEmail').textContent =
      document.getElementById('email').value || '-';
    document.getElementById('reviewContact').textContent =
      document.getElementById('contactNo').value || '-';
    let accommodationText = document.querySelector('#accommodation option:checked').text || '-';
    if (accommodation.value === 'Others') {
      accommodationText += ` (${document.getElementById('accommodationOther').value})`;
    }
    document.getElementById('reviewAccommodation').textContent = accommodationText;
    document.getElementById('reviewCertificateName').textContent =
      document.getElementById('certificateName').value || '-';
  }

  function showMessage(message, type) {
    registerMessage.className = '';
    registerMessage.style.backgroundColor = '';
    registerMessage.style.color = '';
    registerMessage.style.border = '';

    if (type === 'success') {
      registerMessage.classList.add('success-message');
      registerMessage.innerHTML = `
        <div>${message}</div>
        <div style="margin-top:1em;">
          <a href="/crfv/user-register" target="_blank" class="nav-btn" style="margin-right:1em;">Register Another</a>
          <br><br>
          <a href="https://crfv-cpu.org" target="_blank" class="nav-btn" style="text-decoration:none;">Event Details</a>
        </div>
      `;
      document.getElementById('submitBtn').style.display = 'none';
      document.getElementById('prevBtn2').style.display = 'none';
    } else if (type === 'error') {
      registerMessage.classList.add('error-message');
      registerMessage.textContent = message;
      setTimeout(() => {
        registerMessage.textContent = '';
        registerMessage.className = '';
      }, 5000);
    } else {
      registerMessage.style.backgroundColor = '#e1effe';
      registerMessage.style.color = 'var(--primary)';
      registerMessage.style.border = '1px solid var(--primary-light)';
      registerMessage.textContent = message;
      setTimeout(() => {
        registerMessage.textContent = '';
        registerMessage.className = '';
      }, 5000);
    }
  }

  function isValidEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  }

  // --- Location Data Logic ---
  let locationData = {};
  let regionKeys = [];

  async function loadLocationData() {
    const res = await fetch('textfiles/philippine_provinces_cities_municipalities_and_barangays_2019v2.json');
    locationData = await res.json();
    regionKeys = Object.keys(locationData);
    populateRegions();
  }

  function populateRegions() {
    const regionSelect = document.getElementById('region');
    regionSelect.innerHTML = '<option value="">Select region</option>';
    regionKeys.forEach(key => {
      const regionName = locationData[key].region_name || key;
      regionSelect.innerHTML += `<option value="${key}">${regionName}</option>`;
    });
  }

  function populateProvinces(regionKey) {
    const provinceSelect = document.getElementById('province');
    provinceSelect.innerHTML = '<option value="">Select province</option>';
    if (!regionKey || !locationData[regionKey]) return;
    const provinces = Object.keys(locationData[regionKey].province_list || {});
    provinces.forEach(prov => {
      provinceSelect.innerHTML += `<option value="${prov}">${prov}</option>`;
    });
  }

  function populateMunicipalities(regionKey, provinceName) {
    const municipalitySelect = document.getElementById('municipality');
    municipalitySelect.innerHTML = '<option value="">Select municipality</option>';
    if (!regionKey || !provinceName) return;
    const munList = locationData[regionKey].province_list[provinceName]?.municipality_list || {};
    Object.keys(munList).forEach(mun => {
      municipalitySelect.innerHTML += `<option value="${mun}">${mun}</option>`;
    });
  }

  function populateBarangays(regionKey, provinceName, municipalityName) {
    const barangaySelect = document.getElementById('barangay');
    barangaySelect.innerHTML = '<option value="">Select barangay</option>';
    if (!regionKey || !provinceName || !municipalityName) return;
    const brgyList = locationData[regionKey].province_list[provinceName]?.municipality_list[municipalityName]?.barangay_list || [];
    brgyList.forEach(brgy => {
      barangaySelect.innerHTML += `<option value="${brgy}">${brgy}</option>`;
    });
  }

  document.getElementById('region').addEventListener('change', function() {
    populateProvinces(this.value);
    document.getElementById('municipality').innerHTML = '<option value="">Select municipality</option>';
    document.getElementById('barangay').innerHTML = '<option value="">Select barangay</option>';
  });

  document.getElementById('province').addEventListener('change', function() {
    const regionKey = document.getElementById('region').value;
    populateMunicipalities(regionKey, this.value);
    document.getElementById('barangay').innerHTML = '<option value="">Select barangay</option>';
  });

  document.getElementById('municipality').addEventListener('change', function() {
    const regionKey = document.getElementById('region').value;
    const provinceName = document.getElementById('province').value;
    populateBarangays(regionKey, provinceName, this.value);
  });

  // --- Organization Type Logic ---
  orgType.addEventListener('change', function() {
    const val = this.value;
    regionRow.style.display = 'none';
    provinceRow.style.display = 'none';
    municipalityRow.style.display = 'none';
    barangayRow.style.display = 'none';
    orgNameRow.style.display = 'none';
    organizationInput.required = false;

    if (val === 'Private Organization' || val === 'Others') {
      orgNameRow.style.display = '';
      organizationInput.required = true;
    } else if (val === 'PLGU') {
      regionRow.style.display = '';
      provinceRow.style.display = '';
    } else if (val === 'LGU') {
      regionRow.style.display = '';
      provinceRow.style.display = '';
      municipalityRow.style.display = '';
    } else if (val === 'BLGU' || val === 'SK') {
      regionRow.style.display = '';
      provinceRow.style.display = '';
      municipalityRow.style.display = '';
      barangayRow.style.display = '';
    }
  });

  // --- Form Submission Handler ---
  form.onsubmit = async function(e) {
    e.preventDefault();
    // Validate privacy checkbox
    if (!form.privacyAgree.checked) {
      showMessage('You must agree to the Data Privacy Policy to register.', 'error');
      form.privacyAgree.focus();
      return;
    }
    // Validate "Others" accommodation
    if (accommodation.value === 'Others' && !accommodationOther.value.trim()) {
      showMessage('Please specify your accommodation.', 'error');
      accommodationOther.focus();
      return;
    }
    // Email validation
    const emailValue = form.email.value.trim();
    if (emailValue && !isValidEmail(emailValue)) {
      showMessage('Please enter a valid email address (e.g., name@example.com)', 'error');
      form.email.focus();
      return;
    }
    // Always generate a new token before submit
    document.getElementById('registration_token').value = crypto.randomUUID();
    // Disable submit button
    form.submitBtn.disabled = true;
    form.submitBtn.textContent = 'Registering...';

    // Prepare form data
    const formData = {
      firstName: form.firstName.value.trim(),
      middleName: form.middleName.value.trim(),
      lastName: form.lastName.value.trim(),
      gender: form.gender.value,
      designation: form.designation.value.trim(),
      organizationType: orgType.value,
      organization: form.organization.value.trim(),
      province: form.province.value,
      municipality: form.municipality.value,
      barangay: form.barangay.value,
      email: form.email.value.trim(),
      contactNo: form.contactNo.value.trim(),
      accommodation: form.accommodation.value,
      accommodationOther: form.accommodationOther.value.trim(),
      event_id: form.eventId.value,
      certificateName: form.certificateName.value.trim(),
      registration_token: document.getElementById('registration_token').value
    };

    let organization_type = '';
    let organization_name = '';

    if (orgType.value === 'Private Organization') {
      organization_type = 'Private';
      organization_name = organizationInput.value.trim();
    } else if (orgType.value === 'Others') {
      organization_type = 'Other';
      organization_name = organizationInput.value.trim();
    } else {
      organization_type = orgType.value;
      organization_name = orgType.value;
      if (form.province.value) organization_name += ` - ${form.province.value}`;
      if (form.municipality.value) organization_name += `, ${form.municipality.value}`;
      if (form.barangay.value) organization_name += `, ${form.barangay.value}`;
    }

    formData.organization_type = organization_type;
    formData.organization_name = organization_name;

    try {
      const res = await fetch('/api/user-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        showMessage('Server error: Invalid response.', 'error');
        return;
      }
      if (res.ok) {
          showMessage(
            `Registration successful!<br>
            <strong>Your confirmation code:</strong>
            <span id="confCode" style="font-size:1.3em;letter-spacing:2px;background:#f1f5f9;padding:4px 10px;border-radius:6px;margin:0 6px 0 2px;">${data.confirmationCode}</span>
            <button id="copyAllDetailsBtn" class="nav-btn small-btn" style="padding:4px 10px;font-size:0.95em;margin-left:4px;" type="button">
              <i class="fa fa-copy"></i> Copy All Details
            </button>
            <br><small>Please check your email for details. If you did not receive an email, take a screenshot or copy your details for your reference.</small>`,
            'success'
          );
          setTimeout(() => {
            const copyAllBtn = document.getElementById('copyAllDetailsBtn');
            const confCode = document.getElementById('confCode');
            if (copyAllBtn && confCode) {
              // Build the details string
              const details =
                `Event: ${form.eventId.options[form.eventId.selectedIndex]?.text?.trim() || '-'}\n` +
                `Name: ${form.firstName.value} ${form.middleName.value} ${form.lastName.value}\n` +
                `Gender: ${form.gender.options[form.gender.selectedIndex]?.text?.trim() || '-'}\n` +
                `Designation: ${form.designation.value}\n` +
                `Organization Type: ${form.organizationType.value}\n` +
                `Organization Name: ${form.organization.value}\n` +
                `Email: ${form.email.value}\n` +
                `Contact: ${form.contactNo.value}\n` +
                `Accommodation: ${form.accommodation.options[form.accommodation.selectedIndex]?.text?.trim() || '-'}${form.accommodation.value === 'Others' ? ' (' + form.accommodationOther.value + ')' : ''}\n` +
                `Name on Certificate: ${form.certificateName.value}\n\n` +
                `Registration successful!\nYour confirmation code: ${confCode.textContent.trim()}`;
              copyAllBtn.onclick = function() {
                navigator.clipboard.writeText(details);
                copyAllBtn.innerHTML = '<i class="fa fa-check"></i> Copied!';
                setTimeout(() => {
                  copyAllBtn.innerHTML = '<i class="fa fa-copy"></i> Copy All Details';
                }, 1500);
              };
            }
          }, 100);
      } else {
        showMessage(data.message || 'Registration failed.', 'error');
      }
    } catch (err) {
      console.error('Registration error:', err);
      showMessage('Network error. Please try again.', 'error');
    }
    form.submitBtn.disabled = false;
    form.submitBtn.textContent = 'Register';
  };

  // --- Load Location Data on Page Load ---
  loadLocationData();


});
