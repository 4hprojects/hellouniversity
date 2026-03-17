document.addEventListener('DOMContentLoaded', function () {
    const yearLevelSelect = document.getElementById('yearLevel');
    const yearLevelOther = document.getElementById('yearLevelOther');
    const sectionSelect = document.getElementById('section');
    const sectionOther = document.getElementById('sectionOther');
    const degreeSelect = document.getElementById('degree');
    const degreeOther = document.getElementById('degreeOther');
    const nationalitySelect = document.getElementById('nationalitySelect');
    const otherNationalityInput = document.getElementById('otherNationality');
    const filipinoEthnicitySection = document.getElementById('filipinoEthnicitySection');
    const nonFilipinoEthnicity = document.getElementById('nonFilipinoEthnicity');
  
    const surveyForm = document.getElementById('surveyForm');
    const responseContainer = document.getElementById('responseContainer');
  
    // Show/hide "Other" text field for Year Level
    yearLevelSelect.addEventListener('change', () => {
      if (yearLevelSelect.value === 'Others') {
        yearLevelOther.classList.remove('hidden');
      } else {
        yearLevelOther.classList.add('hidden');
        yearLevelOther.value = '';
      }
    });
  
    // Show/hide "Other" text field for Section
    sectionSelect.addEventListener('change', () => {
      if (sectionSelect.value === 'Others') {
        sectionOther.classList.remove('hidden');
      } else {
        sectionOther.classList.add('hidden');
        sectionOther.value = '';
      }
    });
  
    // Show/hide "Other" text field for Degree
    degreeSelect.addEventListener('change', () => {
      if (degreeSelect.value === 'Others') {
        degreeOther.classList.remove('hidden');
      } else {
        degreeOther.classList.add('hidden');
        degreeOther.value = '';
      }
    });
  
    // Show/hide Filipino ethnicity checkboxes vs Other nationality field
    nationalitySelect.addEventListener('change', () => {
      if (nationalitySelect.value === 'Filipino') {
        filipinoEthnicitySection.classList.remove('hidden');
        nonFilipinoEthnicity.classList.add('hidden');
        otherNationalityInput.classList.add('hidden');
        otherNationalityInput.value = '';
      } else if (nationalitySelect.value === 'Other') {
        filipinoEthnicitySection.classList.add('hidden');
        nonFilipinoEthnicity.classList.remove('hidden');
        otherNationalityInput.classList.remove('hidden');
      } else {
        // default (empty selection)
        filipinoEthnicitySection.classList.add('hidden');
        nonFilipinoEthnicity.classList.add('hidden');
        otherNationalityInput.classList.add('hidden');
        otherNationalityInput.value = '';
      }
    });
  
    // Handle form submit via JS/AJAX
    surveyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      responseContainer.innerHTML = ''; // Clear previous messages
  
      // Gather form data
      const formData = new FormData(surveyForm);
  
      // Derive final yearLevel
      let finalYearLevel = formData.get('yearLevel');
      if (finalYearLevel === 'Others') {
        finalYearLevel = formData.get('yearLevelOther') || 'Others';
      }
  
      // Derive final section
      let finalSection = formData.get('section');
      if (finalSection === 'Others') {
        finalSection = formData.get('sectionOther') || 'Others';
      }
  
      // Derive final degree
      let finalDegree = formData.get('degree');
      if (finalDegree === 'Others') {
        finalDegree = formData.get('degreeOther') || 'Others';
      }
  
      // Derive final nationality
      let finalNationality = formData.get('nationality');
      if (finalNationality === 'Other') {
        // Use text from "otherNationality" input
        finalNationality = formData.get('otherNationality') || 'Other';
      }
  
      // Collect ethnicity data
      // If Filipino was chosen
      let ethnicitySelected = '';
      if (formData.get('nationality') === 'Filipino') {
        const allChecked = document.querySelectorAll('input[name="ethnicity"]:checked');
        const checkedValues = Array.from(allChecked).map(input => input.value);
  
        // Also gather the user’s "Other (Luzon/Visayas/Mindanao)" text fields if any
        const otherLuzon = formData.get('ethnicityOtherLuzon');
        const otherVisayas = formData.get('ethnicityOtherVisayas');
        const otherMindanao = formData.get('ethnicityOtherMindanao');
  
        if (otherLuzon) checkedValues.push(`(Other Luzon) ${otherLuzon}`);
        if (otherVisayas) checkedValues.push(`(Other Visayas) ${otherVisayas}`);
        if (otherMindanao) checkedValues.push(`(Other Mindanao) ${otherMindanao}`);
  
        ethnicitySelected = checkedValues.join('; ');
      } else {
        // if not Filipino
        ethnicitySelected = formData.get('nonFilipino') || '';
      }
  
      // Build the object we’ll send to the server
      const payload = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        studentID: formData.get('studentID'),
        yearLevel: finalYearLevel,
        section: finalSection,
        degree: finalDegree,
        nationality: finalNationality,
        ethnicity: ethnicitySelected,
        primaryEthnicity: formData.get('primaryEthnicity') || ''
      };
  
      try {
        const response = await fetch('/api/student-ethnicity/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
  
        const result = await response.json();
        if (response.ok && result.success) {
          responseContainer.innerHTML = `<p class="success">${result.message}</p>`;
          surveyForm.reset();
          // Hide any "Other" fields that might have been shown
          yearLevelOther.classList.add('hidden');
          sectionOther.classList.add('hidden');
          degreeOther.classList.add('hidden');
          filipinoEthnicitySection.classList.add('hidden');
          nonFilipinoEthnicity.classList.add('hidden');
          otherNationalityInput.classList.add('hidden');
        } else {
          responseContainer.innerHTML = `<p class="error">${result.message || 'Submission failed.'}</p>`;
        }
      } catch (err) {
        console.error('Error submitting form:', err);
        responseContainer.innerHTML = `<p class="error">An error occurred. Please try again later.</p>`;
      }
    });
  });
  