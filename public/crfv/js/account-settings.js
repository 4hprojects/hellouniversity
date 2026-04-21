(() => {
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const REDIRECT_URL = '/crfv';

  const refs = (() => {
    const el = id => document.getElementById(id);
    return {
      firstName: el('firstName'),
      lastName: el('lastName'),
      email: el('email'),
      studentIDNumber: el('studentIDNumber'),
      profileStatus: el('profileStatus'),
      passwordStatus: el('passwordStatus'),
      securityStatus: el('securityStatus'),
      pwStrengthFill: el('pwStrengthFill'),
      pwStrengthText: el('pwStrengthText'),
      missingEmailModal: el('missingEmailModal'),
      missingEmailInput: el('missingEmailInput'),
      missingEmailError: el('missingEmailError'),
      missingEmailSaveBtn: el('missingEmailSaveBtn'),
      profileForm: el('profileForm'),
      editProfileBtn: el('editProfileBtn'),
      saveProfileBtn: el('saveProfileBtn'),
      resetProfileBtn: el('resetProfileBtn'),
      passwordForm: el('passwordForm'),
      editPasswordBtn: el('editPasswordBtn'),
      changePasswordBtn: el('changePasswordBtn'),
      resetPasswordBtn: el('resetPasswordBtn'),
      refreshSessionBtn: el('refreshSessionBtn'),
      year: el('year'),
      ovName: el('ovName'),
      ovID: el('ovID'),
      ovRole: el('ovRole'),
      ovCreated: el('ovCreated'),
      ovEmail: el('ovEmail'),
      currentPassword: el('currentPassword'),
      newPassword: el('newPassword'),
      confirmPassword: el('confirmPassword'),
      toggleNewPasswordBtn: el('toggleNewPasswordBtn'),
      toggleConfirmPasswordBtn: el('toggleConfirmPasswordBtn')
    };
  })();

  const state = {
    originalProfile: {},
    csrfToken: '',
    isProfileEditing: false,
    isPasswordEditing: false
  };

  const api = {
    async loadCsrfToken() {
      const response = await fetch('/api/csrf-token', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('csrf token request failed');

      const payload = await response.json();
      if (!payload.success || !payload.csrfToken) throw new Error('csrf token missing');
      state.csrfToken = payload.csrfToken;
    },

    async request(url, options = {}) {
      const method = String(options.method || 'GET').toUpperCase();
      const headers = { ...(options.headers || {}) };

      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        if (!state.csrfToken) await api.loadCsrfToken();
        headers['X-CSRF-Token'] = state.csrfToken;
      }

      const response = await fetch(url, {
        ...options,
        method,
        headers,
        credentials: 'same-origin'
      });

      if (response.status === 401) {
        window.location.href = REDIRECT_URL;
        throw new Error('Unauthorized');
      }

      return response;
    },

    async requestJson(url, options = {}) {
      const response = await api.request(url, options);
      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    }
  };

  function setStatus(targetEl, message, ok) {
    if (!targetEl) return;
    targetEl.textContent = message;
    targetEl.className = 'as-status ' + (ok ? 'is-success' : 'is-error');
    if (message) {
      targetEl.classList.add('fade-in');
      setTimeout(() => targetEl.classList.remove('fade-in'), 300);
    }
  }

  function normalizeValue(value) {
    return String(value || '').trim();
  }

  function normalizeEmail(value) {
    return normalizeValue(value).toLowerCase();
  }

  function isProfileDirty() {
    const currentFirstName = normalizeValue(refs.firstName?.value);
    const currentLastName = normalizeValue(refs.lastName?.value);
    const currentEmail = normalizeEmail(refs.email?.value);

    const baseFirstName = normalizeValue(state.originalProfile.firstName);
    const baseLastName = normalizeValue(state.originalProfile.lastName);
    const baseEmail = normalizeEmail(state.originalProfile.email);

    return (
      currentFirstName !== baseFirstName ||
      currentLastName !== baseLastName ||
      currentEmail !== baseEmail
    );
  }

  function setProfileEditing(isEditing) {
    state.isProfileEditing = Boolean(isEditing);

    const toggleEditableField = (node) => {
      if (!node) return;
      node.readOnly = !state.isProfileEditing;
      node.classList.toggle('as-input-readonly', !state.isProfileEditing);
    };

    toggleEditableField(refs.firstName);
    toggleEditableField(refs.lastName);

    if (refs.email) {
      refs.email.readOnly = true;
      refs.email.classList.add('as-input-readonly');
    }

    if (refs.editProfileBtn) {
      refs.editProfileBtn.disabled = false;
      refs.editProfileBtn.hidden = state.isProfileEditing;
    }
    if (refs.saveProfileBtn) refs.saveProfileBtn.hidden = !state.isProfileEditing;
    if (refs.resetProfileBtn) {
      refs.resetProfileBtn.disabled = !state.isProfileEditing;
      refs.resetProfileBtn.hidden = !state.isProfileEditing;
    }
  }

  function syncProfileActionState() {
    if (!refs.saveProfileBtn) return;
    refs.saveProfileBtn.disabled = !state.isProfileEditing || !isProfileDirty();
  }

  function handleBeforeUnload(event) {
    if (!state.isProfileEditing || !isProfileDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function redirectToMainMenu() {
    window.location.href = REDIRECT_URL;
  }

  async function ensureAuthenticated() {
    try {
      const response = await api.request('/api/check-auth');
      if (!response.ok) redirectToMainMenu();
    } catch {
      redirectToMainMenu();
    }
  }

  function getPasswordStrength(password) {
    if (!password) return { label: 'Empty', color: '#9ca3af', width: '0%' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;

    const pct = (score / 4) * 100;
    if (score <= 1) return { label: 'Weak', color: '#ef4444', width: pct + '%' };
    if (score === 2) return { label: 'Fair', color: '#f59e0b', width: pct + '%' };
    if (score === 3) return { label: 'Good', color: '#3b82f6', width: pct + '%' };
    return { label: 'Strong', color: '#10b981', width: pct + '%' };
  }

  function updatePasswordStrengthMeter() {
    const meta = getPasswordStrength(refs.newPassword?.value || '');
    if (refs.pwStrengthFill) {
      refs.pwStrengthFill.style.width = meta.width;
      refs.pwStrengthFill.style.background = meta.color;
    }
    if (refs.pwStrengthText) {
      refs.pwStrengthText.textContent = 'Strength: ' + meta.label;
    }
  }

  function clearPasswordInputs() {
    if (refs.currentPassword) refs.currentPassword.value = '';
    if (refs.newPassword) refs.newPassword.value = '';
    if (refs.confirmPassword) refs.confirmPassword.value = '';
    [refs.newPassword, refs.confirmPassword].forEach((node) => {
      if (!node) return;
      node.type = 'password';
    });
    [refs.toggleNewPasswordBtn, refs.toggleConfirmPasswordBtn].forEach((btn) => {
      if (!btn) return;
      btn.textContent = 'Show';
      btn.setAttribute('aria-pressed', 'false');
    });
    updatePasswordStrengthMeter();
  }

  function setPasswordEditing(isEditing) {
    const hasEmail = Boolean(state.originalProfile.email);
    state.isPasswordEditing = hasEmail ? Boolean(isEditing) : false;

    [refs.currentPassword, refs.newPassword, refs.confirmPassword].forEach((node) => {
      if (!node) return;
      node.disabled = !state.isPasswordEditing;
      node.classList.toggle('is-disabled', !state.isPasswordEditing);
    });
    [refs.toggleNewPasswordBtn, refs.toggleConfirmPasswordBtn].forEach((btn) => {
      if (!btn) return;
      btn.disabled = !state.isPasswordEditing;
    });

    if (refs.editPasswordBtn) {
      refs.editPasswordBtn.hidden = state.isPasswordEditing;
      refs.editPasswordBtn.disabled = !hasEmail;
    }
    if (refs.changePasswordBtn) {
      refs.changePasswordBtn.hidden = !state.isPasswordEditing;
      refs.changePasswordBtn.disabled = !state.isPasswordEditing;
    }
    if (refs.resetPasswordBtn) {
      refs.resetPasswordBtn.hidden = !state.isPasswordEditing;
      refs.resetPasswordBtn.disabled = !state.isPasswordEditing;
    }

    if (!state.isPasswordEditing) {
      clearPasswordInputs();
    }
  }

  function togglePasswordVisibility(inputEl, buttonEl) {
    if (!inputEl || !buttonEl) return;
    const showing = inputEl.type === 'text';
    inputEl.type = showing ? 'password' : 'text';
    buttonEl.textContent = showing ? 'Show' : 'Hide';
    buttonEl.setAttribute('aria-pressed', showing ? 'false' : 'true');
  }

  function enforceEmailRequirement() {
    const hasEmail = Boolean(state.originalProfile.email);
    if (!hasEmail) {
      setPasswordEditing(false);
      setStatus(refs.passwordStatus, 'Enter an email first to enable password changes.', false);
      refs.missingEmailModal?.classList.remove('is-hidden');
      if (refs.missingEmailInput) refs.missingEmailInput.value = '';
      setTimeout(() => refs.missingEmailInput?.focus(), 60);
      return;
    }

    refs.missingEmailModal?.classList.add('is-hidden');
    setPasswordEditing(false);
    setStatus(refs.passwordStatus, '', true);
  }

  function applyProfileToUi(user) {
    const resolvedEmail = user.email || '';
    state.originalProfile = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: resolvedEmail,
      studentIDNumber: user.studentIDNumber || ''
    };

    if (refs.firstName) refs.firstName.value = state.originalProfile.firstName;
    if (refs.lastName) refs.lastName.value = state.originalProfile.lastName;
    if (refs.email) refs.email.value = state.originalProfile.email;
    if (refs.studentIDNumber) refs.studentIDNumber.value = state.originalProfile.studentIDNumber;

    if (refs.ovName) refs.ovName.textContent = `${state.originalProfile.firstName} ${state.originalProfile.lastName}`.trim() || '-';
    if (refs.ovID) refs.ovID.textContent = state.originalProfile.studentIDNumber || '-';
    if (refs.ovRole) refs.ovRole.textContent = user.role || '-';
    if (refs.ovCreated) refs.ovCreated.textContent = user.createdAt || '-';
    if (refs.ovEmail) refs.ovEmail.textContent = state.originalProfile.email || '-';

    setProfileEditing(false);
    enforceEmailRequirement();
    syncProfileActionState();
  }

  async function loadProfile() {
    try {
      const { response, payload } = await api.requestJson('/api/account/profile');
      if (!response.ok || !payload.success) throw new Error('profile load failed');
      applyProfileToUi(payload.user || {});
    } catch {
      setStatus(refs.profileStatus, 'Failed to load profile.', false);
    }
  }

  function resetProfileForm() {
    if (refs.firstName) refs.firstName.value = state.originalProfile.firstName || '';
    if (refs.lastName) refs.lastName.value = state.originalProfile.lastName || '';
    if (refs.email) refs.email.value = state.originalProfile.email || '';
    setProfileEditing(false);
    setStatus(refs.profileStatus, 'Changes cancelled.', true);
    enforceEmailRequirement();
    syncProfileActionState();
  }

  function handleEditProfile() {
    setProfileEditing(true);
    syncProfileActionState();
    refs.firstName?.focus();
  }

  async function handleSaveMissingEmail() {
    if (!refs.missingEmailError || !refs.missingEmailInput) return;

    refs.missingEmailError.textContent = '';
    const emailVal = refs.missingEmailInput.value.trim();
    if (!emailVal) {
      refs.missingEmailError.textContent = 'Email required.';
      return;
    }
    if (!EMAIL_REGEX.test(emailVal)) {
      refs.missingEmailError.textContent = 'Invalid email format.';
      return;
    }

    try {
      const { response, payload } = await api.requestJson('/api/account/profile', {
        method: 'PUT',
        body: JSON.stringify({ email: emailVal })
      });

      if (response.ok && payload.success) {
        state.originalProfile.email = emailVal;
        if (refs.email) refs.email.value = emailVal;
        if (refs.ovEmail) refs.ovEmail.textContent = emailVal;
        refs.missingEmailModal?.classList.add('is-hidden');
        setPasswordEditing(false);
        setStatus(refs.profileStatus, 'Email saved.', true);
        return;
      }

      refs.missingEmailError.textContent = payload.message || 'Failed to save.';
    } catch {
      refs.missingEmailError.textContent = 'Network error.';
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (!state.isProfileEditing) return;
    setStatus(refs.profileStatus, 'Saving...', true);

    const payload = {
      firstName: (refs.firstName?.value || '').trim(),
      lastName: (refs.lastName?.value || '').trim(),
      email: (refs.email?.value || '').trim()
    };

    if (!payload.firstName || !payload.lastName) {
      setStatus(refs.profileStatus, 'First and last name required.', false);
      return;
    }

    try {
      const { response, payload: result } = await api.requestJson('/api/account/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (response.ok && result.success) {
        setStatus(refs.profileStatus, 'Profile updated.', true);
        if (payload.email) state.originalProfile.email = payload.email;
        await loadProfile();
        syncProfileActionState();
        return;
      }

      setStatus(refs.profileStatus, result.message || 'Update failed.', false);
    } catch {
      setStatus(refs.profileStatus, 'Network error.', false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (!state.isPasswordEditing) return;
    if (!state.originalProfile.email) {
      enforceEmailRequirement();
      return;
    }

    const currentPassword = refs.currentPassword?.value || '';
    const newPassword = refs.newPassword?.value || '';
    const confirmPassword = refs.confirmPassword?.value || '';
    setStatus(refs.passwordStatus, 'Processing...', true);

    if (newPassword !== confirmPassword) {
      setStatus(refs.passwordStatus, 'Passwords do not match.', false);
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setStatus(refs.passwordStatus, 'Does not meet complexity rules.', false);
      return;
    }

    try {
      const { response, payload } = await api.requestJson('/api/account/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (response.ok && payload.success) {
        setStatus(refs.passwordStatus, 'Password updated.', true);
        setPasswordEditing(false);
        return;
      }

      setStatus(refs.passwordStatus, payload.message || 'Change failed.', false);
    } catch {
      setStatus(refs.passwordStatus, 'Network error.', false);
    }
  }

  function handleEditPassword() {
    if (!state.originalProfile.email) {
      enforceEmailRequirement();
      return;
    }
    setPasswordEditing(true);
    setStatus(refs.passwordStatus, '', true);
    refs.currentPassword?.focus();
  }

  function resetPasswordForm() {
    setPasswordEditing(false);
    setStatus(refs.passwordStatus, 'Changes cancelled.', true);
  }

  async function handleRefreshSession() {
    setStatus(refs.securityStatus, 'Refreshing...', true);
    try {
      const response = await api.request('/api/check-auth');
      if (response.ok) {
        setStatus(refs.securityStatus, 'Session is active.', true);
        return;
      }
      setStatus(refs.securityStatus, 'Session invalid. Please log in again.', false);
    } catch {
      setStatus(refs.securityStatus, 'Unable to refresh.', false);
    }
  }

  function bindEvents() {
    window.addEventListener('beforeunload', handleBeforeUnload);

    document.addEventListener('input', (event) => {
      if (event.target.id === 'newPassword') {
        updatePasswordStrengthMeter();
        return;
      }
      if (event.target.id === 'firstName' || event.target.id === 'lastName') {
        syncProfileActionState();
      }
    });

    refs.missingEmailSaveBtn?.addEventListener('click', handleSaveMissingEmail);
    refs.editProfileBtn?.addEventListener('click', handleEditProfile);
    refs.profileForm?.addEventListener('submit', handleProfileSubmit);
    refs.resetProfileBtn?.addEventListener('click', resetProfileForm);
    refs.passwordForm?.addEventListener('submit', handlePasswordSubmit);
    refs.editPasswordBtn?.addEventListener('click', handleEditPassword);
    refs.resetPasswordBtn?.addEventListener('click', resetPasswordForm);
    refs.toggleNewPasswordBtn?.addEventListener('click', () => {
      togglePasswordVisibility(refs.newPassword, refs.toggleNewPasswordBtn);
    });
    refs.toggleConfirmPasswordBtn?.addEventListener('click', () => {
      togglePasswordVisibility(refs.confirmPassword, refs.toggleConfirmPasswordBtn);
    });
    refs.refreshSessionBtn?.addEventListener('click', handleRefreshSession);
  }

  async function init() {
    if (refs.year) refs.year.textContent = new Date().getFullYear();
    setProfileEditing(false);
    bindEvents();
    updatePasswordStrengthMeter();
    syncProfileActionState();

    await ensureAuthenticated();
    try {
      await api.loadCsrfToken();
      await loadProfile();
    } catch {
      setStatus(refs.securityStatus, 'Security setup failed. Please refresh.', false);
    }
  }

  init();
})();
