(function () {
    function byId(id) {
        return document.getElementById(id);
    }

    let institutionController = null;

    function getSelectedAccountType() {
        return String(document.querySelector('input[name="accountType"]:checked')?.value || '').trim().toLowerCase();
    }

    function getIdFieldLabel() {
        return getSelectedAccountType() === 'teacher' ? 'Employee ID' : 'Student ID';
    }

    function showMessage(message, type) {
        const messageBox = byId('signupMessage');
        if (!messageBox) {
            return;
        }

        messageBox.textContent = message || '';
        messageBox.classList.remove('auth-message-error', 'auth-message-success');
        messageBox.classList.add(type === 'success' ? 'auth-message-success' : 'auth-message-error');
        messageBox.style.display = message ? 'block' : 'none';
    }

    function attachPasswordToggles() {
        document.querySelectorAll('[data-password-toggle]').forEach((button) => {
            button.addEventListener('click', () => {
                const inputId = button.getAttribute('data-password-toggle');
                const input = byId(inputId);
                const icon = button.querySelector('.material-icons');

                if (!input || !icon) {
                    return;
                }

                const isPassword = input.getAttribute('type') === 'password';
                input.setAttribute('type', isPassword ? 'text' : 'password');
                icon.textContent = isPassword ? 'visibility' : 'visibility_off';
                button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
            });
        });
    }

    function attachStudentIdRules() {
        const input = byId('studentIDNumber');
        if (!input) {
            return;
        }

        input.addEventListener('input', () => {
            input.value = String(input.value || '').replace(/\D+/g, '').slice(0, 8);
        });
    }

    function attachAccountTypeUI() {
        const note = byId('teacherRequestNote');
        const idLabel = byId('studentIdLabel');
        const radios = document.querySelectorAll('input[name="accountType"]');

        const sync = () => {
            const selected = getSelectedAccountType();
            if (note) {
                note.hidden = selected !== 'teacher';
            }

            if (idLabel) {
                idLabel.textContent = 'ID Number';
            }
        };

        radios.forEach((radio) => radio.addEventListener('change', sync));
        sync();
    }

    function attachFloatingLabels() {
        const fields = document.querySelectorAll('.auth-page-signup .auth-field-floating');

        fields.forEach((field) => {
            const input = field.querySelector('input, select, textarea');
            if (!(input instanceof HTMLElement)) {
                return;
            }

            const sync = () => {
                const value = 'value' in input ? String(input.value || '').trim() : '';
                field.classList.toggle('is-filled', value !== '');
            };

            input.addEventListener('focus', () => {
                field.classList.add('is-focused');
            });

            input.addEventListener('blur', () => {
                field.classList.remove('is-focused');
                sync();
            });

            input.addEventListener('input', sync);
            input.addEventListener('change', sync);
            field.addEventListener('auth:sync-floating-label', sync);
            sync();
        });
    }

    function getFieldShell(input) {
        if (!(input instanceof HTMLElement)) {
            return null;
        }

        return input.closest('.auth-field, .auth-checkbox-row, .auth-form-section');
    }

    function setFieldInvalid(input, isInvalid) {
        if (!(input instanceof HTMLElement)) {
            return;
        }

        const shell = getFieldShell(input);
        input.classList.toggle('is-invalid', isInvalid);
        if (isInvalid) {
            input.setAttribute('aria-invalid', 'true');
        } else {
            input.removeAttribute('aria-invalid');
        }

        if (shell) {
            shell.classList.toggle('is-invalid', isInvalid);
        }
    }

    function clearFieldInvalid(input) {
        setFieldInvalid(input, false);
    }

    function hasInstitutionValue() {
        const institutionName = String(byId('institutionName')?.value || '').trim();
        const manualInstitutionValue = String(byId('institutionSearch')?.value || '').trim();

        return Boolean(institutionName || manualInstitutionValue);
    }

    function getEmptyRequiredFields() {
        const fields = [
            byId('firstName'),
            byId('lastName'),
            byId('studentIDNumber'),
            byId('email'),
            byId('institutionType'),
            byId('password'),
            byId('confirmPassword')
        ].filter(Boolean);

        const emptyFields = fields.filter((field) => String(field.value || '').trim() === '');
        const institutionSearch = byId('institutionSearch');
        const termsCheckbox = byId('termsCheckbox');

        if (institutionSearch && !institutionSearch.disabled && !hasInstitutionValue()) {
            emptyFields.push(institutionSearch);
        }

        if (termsCheckbox && !termsCheckbox.checked) {
            emptyFields.push(termsCheckbox);
        }

        return emptyFields;
    }

    function markEmptyRequiredFields() {
        const requiredControls = document.querySelectorAll('#signupForm input[required], #signupForm select[required], #signupForm textarea[required]');
        requiredControls.forEach((control) => setFieldInvalid(control, false));

        const emptyFields = getEmptyRequiredFields();
        emptyFields.forEach((field) => setFieldInvalid(field, true));

        return emptyFields;
    }

    function attachInvalidFieldClearing() {
        const form = byId('signupForm');
        if (!form) {
            return;
        }

        form.addEventListener('input', (event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                clearFieldInvalid(target);
            }
        });

        form.addEventListener('change', (event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
                clearFieldInvalid(target);
            }
        });
    }

    function validateForm() {
        const firstName = String(byId('firstName')?.value || '').trim();
        const lastName = String(byId('lastName')?.value || '').trim();
        const studentIDNumber = String(byId('studentIDNumber')?.value || '').trim();
        const email = String(byId('email')?.value || '').trim();
        const password = String(byId('password')?.value || '');
        const confirmPassword = String(byId('confirmPassword')?.value || '');
        const termsChecked = Boolean(byId('termsCheckbox')?.checked);
        const accountType = String(document.querySelector('input[name="accountType"]:checked')?.value || '').trim();
        const institutionType = String(byId('institutionType')?.value || '').trim();
        const institutionName = String(byId('institutionName')?.value || '').trim();
        const manualInstitutionValue = String(byId('institutionSearch')?.value || '').trim();
        const institutionSource = String(byId('institutionSource')?.value || '').trim();

        if (!firstName || !lastName || !studentIDNumber || !email || !password || !confirmPassword || !accountType || !institutionType) {
            return 'All fields are required.';
        }

        if (!/^\d{7,8}$/.test(studentIDNumber)) {
            return `${getIdFieldLabel()} must be 7 or 8 digits.`;
        }

        if (!institutionName && !manualInstitutionValue) {
            return 'Select your institution from the directory or enter it manually.';
        }

        if (institutionSource === 'manual' && manualInstitutionValue.length < 3) {
            return 'Enter your school name when using manual entry.';
        }

        if (password !== confirmPassword) {
            return 'Passwords do not match.';
        }

        if (!termsChecked) {
            return 'You must agree to the Terms and Conditions, Privacy Policy, and Cookie Policy.';
        }

        if (window.authPasswordRules) {
            const result = window.authPasswordRules.evaluate(password);
            if (!(result.uppercase && result.lowercase && result.number && result.length && result.special)) {
                return 'Password must meet all listed criteria.';
            }
        }

        return '';
    }

    function getRecaptchaToken() {
        const input = byId('recaptchaResponse');
        const siteKey = input?.getAttribute('data-recaptcha-site-key');
        const action = input?.getAttribute('data-recaptcha-action') || 'signup';

        if (!siteKey) {
            return Promise.resolve('');
        }

        if (!window.grecaptcha || typeof window.grecaptcha.ready !== 'function') {
            return Promise.reject(new Error('reCAPTCHA is not ready.'));
        }

        return new Promise((resolve, reject) => {
            window.grecaptcha.ready(() => {
                window.grecaptcha.execute(siteKey, { action }).then(resolve).catch(reject);
            });
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        showMessage('', 'error');

        const emptyFields = markEmptyRequiredFields();
        const validationError = validateForm();
        if (validationError) {
            showMessage(validationError, 'error');
            emptyFields[0]?.focus?.();
            return;
        }

        const form = byId('signupForm');
        const submitButton = form?.querySelector('.auth-submit-btn');
        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            const recaptchaToken = await getRecaptchaToken();
            if (recaptchaToken) {
                data['g-recaptcha-response'] = recaptchaToken;
            }

            if (!data.institutionName) {
                data.institutionName = String(byId('institutionSearch')?.value || '').trim();
            }

            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                showMessage(result.message || 'Signup failed. Please try again.', 'error');
                return;
            }

            showMessage(result.message || 'Account created successfully.', 'success');
            window.setTimeout(() => {
                window.location.href = '/login';
            }, 1200);
        } catch (error) {
            showMessage('An error occurred during signup.', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        attachPasswordToggles();
        attachStudentIdRules();
        attachAccountTypeUI();
        attachFloatingLabels();
        attachInvalidFieldClearing();
        institutionController = window.createInstitutionSearchController?.() || null;
        institutionController?.attach();
        window.authPasswordRules?.attach('password');
        byId('signupForm')?.addEventListener('submit', handleSubmit);

        if (window.authClient && typeof window.authClient.redirectIfAuthenticated === 'function') {
            await window.authClient.redirectIfAuthenticated();
        }
    });
}());
