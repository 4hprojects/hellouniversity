(() => {
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
  const DEFAULT_FEATURE_CATALOG = [
    { key: 'event_create', label: 'Create Event' },
    { key: 'admin_register', label: 'Registration' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'reports', label: 'Reports' },
    { key: 'attendance_summary', label: 'Attendance Summary' },
    { key: 'payment_reports', label: 'Payment Reports' },
    { key: 'payment_audits', label: 'Payment Audits' },
    { key: 'audit_trail', label: 'Audit Trail' },
    { key: 'system_settings', label: 'System Settings' },
    { key: 'account_management', label: 'Account Management' },
  ];
  const FEATURE_DESCRIPTIONS = Object.freeze({
    event_create: 'Allows creating, editing, archiving, and deleting CRFV events.',
    admin_register: 'Allows opening the CRFV registration tools for participant accounts.',
    attendance: 'Allows scanning, recording, and managing event attendance.',
    reports: 'Allows viewing CRFV attendance, accommodation, and attendee reports.',
    attendance_summary: 'Allows reviewing event attendance summaries and attendee status.',
    payment_reports: 'Allows viewing and updating CRFV payment report records.',
    payment_audits: 'Allows reviewing read-only payment audit summaries and records.',
    audit_trail: 'Allows viewing and exporting CRFV system audit trail logs.',
    system_settings: 'Allows changing shared CRFV system and attendance settings.',
    account_management: 'Allows creating staff accounts and managing CRFV account access.',
  });

  const state = {
    users: [],
    selectedUser: null,
    currentUserId: '',
    currentUserRole: '',
    featureCatalog: DEFAULT_FEATURE_CATALOG,
    query: '',
    page: 1,
    totalPages: 1,
    auditLogs: [],
    selectedAuditLogs: [],
    pendingConfirmation: null,
    sortBy: null,
    sortOrder: null,
  };

  const refs = {};

  function el(id) {
    return document.getElementById(id);
  }

  function cacheRefs() {
    [
      'createAccountForm',
      'createFirstName',
      'createLastName',
      'createEmail',
      'createRole',
      'createAccountStatus',
      'openCreateAccountBtn',
      'closeCreateAccountBtn',
      'createAccountModal',
      'accountSearchForm',
      'accountSearchInput',
      'accountsTableBody',
      'accountsPagination',
      'accountsStatus',
      'refreshAuditTrailBtn',
      'accountAuditTrailBody',
      'accountAuditTrailStatus',
      'accountModal',
      'accountModalTitle',
      'closeAccountModalBtn',
      'selectedAccountSummary',
      'selectedAccountAuditList',
      'refreshSelectedAuditBtn',
      'featureAccessForm',
      'featureAccessList',
      'saveFeatureAccessBtn',
      'roleChangeForm',
      'selectedRole',
      'roleAdminPassword',
      'temporaryPasswordForm',
      'temporaryPassword',
      'temporaryPasswordConfirm',
      'sendResetCodeBtn',
      'resetRecoveryFieldsBtn',
      'accountStatusSection',
      'openAccountActionBtn',
      'accountActionForm',
      'accountActionType',
      'accountActionReason',
      'accountActionOtherField',
      'accountActionOtherReason',
      'accountActionAdminPassword',
      'runAccountActionBtn',
      'cancelAccountActionBtn',
      'accountModalStatus',
      'confirmationModal',
      'confirmationTitle',
      'confirmationBody',
      'confirmActionBtn',
      'cancelConfirmBtn',
    ].forEach((id) => {
      refs[id] = el(id);
    });
  }

  function getFloatingControl(field) {
    return field.querySelector('input, select');
  }

  function syncFloatingField(field) {
    const control = getFloatingControl(field);
    if (!control) return;
    field.classList.toggle('is-filled', Boolean(control.value));
    field.classList.toggle('is-disabled', Boolean(control.disabled));
  }

  function syncFloatingLabels() {
    const floatingFields = refs.accountModal?.querySelectorAll('.am-field-floating') || [];
    floatingFields.forEach(syncFloatingField);
  }

  function attachFloatingLabels() {
    const floatingFields = refs.accountModal?.querySelectorAll('.am-field-floating') || [];
    floatingFields.forEach(field => {
      const control = getFloatingControl(field);
      if (!control) return;

      control.addEventListener('focus', () => {
        field.classList.add('is-focused');
        syncFloatingField(field);
      });
      control.addEventListener('blur', () => {
        field.classList.remove('is-focused');
        syncFloatingField(field);
      });
      control.addEventListener('input', () => syncFloatingField(field));
      control.addEventListener('change', () => syncFloatingField(field));
      syncFloatingField(field);
    });
  }

  function attachFloatingLabelsToCreateForm() {
    const floatingFields = refs.createAccountForm?.querySelectorAll('.am-field-floating') || [];
    floatingFields.forEach(field => {
      const control = getFloatingControl(field);
      if (!control) return;

      control.addEventListener('focus', () => {
        field.classList.add('is-focused');
        syncFloatingField(field);
      });
      control.addEventListener('blur', () => {
        field.classList.remove('is-focused');
        syncFloatingField(field);
      });
      control.addEventListener('input', () => syncFloatingField(field));
      control.addEventListener('change', () => syncFloatingField(field));
      syncFloatingField(field);
    });
  }

  function showConfirmation(title, bodyHtml, onConfirm) {
    state.pendingConfirmation = onConfirm;
    if (refs.confirmationTitle) refs.confirmationTitle.textContent = title;
    if (refs.confirmationBody) refs.confirmationBody.innerHTML = bodyHtml;
    if (refs.confirmationModal) refs.confirmationModal.hidden = false;
  }

  function closeConfirmation() {
    state.pendingConfirmation = null;
    if (refs.confirmationModal) refs.confirmationModal.hidden = true;
    if (refs.confirmationBody) refs.confirmationBody.innerHTML = '';
  }

  async function executeConfirmedAction() {
    if (typeof state.pendingConfirmation === 'function') {
      try {
        await state.pendingConfirmation();
      } catch (error) {
        console.error('Confirmation action failed:', error);
      }
    }
    closeConfirmation();
  }

  function setStatus(target, message, type = 'info') {
    if (!target) return;
    target.textContent = message || '';
    target.className = `am-status${type === 'error' ? ' is-error' : ''}${
      type === 'success' ? ' is-success' : ''
    }`;
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = Boolean(busy);
  }

  function syncPasswordToggleButton(button) {
    const input = button?.dataset?.passwordToggle
      ? el(button.dataset.passwordToggle)
      : null;
    if (!input) return;

    const isVisible = input.type === 'text';
    const icon = button.querySelector('.material-icons');
    if (icon) icon.textContent = isVisible ? 'visibility_off' : 'visibility';
    button.setAttribute('aria-pressed', String(isVisible));
    button.setAttribute(
      'aria-label',
      `${isVisible ? 'Hide' : 'Show'} ${input.labels?.[0]?.textContent || 'password'}`,
    );
    button.dataset.tooltip = `${isVisible ? 'Hide' : 'Show'} ${
      input.labels?.[0]?.textContent || 'password'
    }.`;
    button.disabled = input.disabled;
    input.dataset.passwordVisible = String(isVisible);
  }

  function syncPasswordToggleButtons() {
    document
      .querySelectorAll('[data-password-toggle]')
      .forEach(syncPasswordToggleButton);
  }

  function resetPasswordVisibility() {
    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
      const input = button.dataset.passwordToggle
        ? el(button.dataset.passwordToggle)
        : null;
      if (input) input.type = 'password';
      syncPasswordToggleButton(button);
    });
  }

  function togglePasswordVisibility(button) {
    const input = button?.dataset?.passwordToggle
      ? el(button.dataset.passwordToggle)
      : null;
    if (!input || input.disabled) return;

    const cursorStart = input.selectionStart;
    const cursorEnd = input.selectionEnd;
    input.type = input.type === 'password' ? 'text' : 'password';
    syncPasswordToggleButton(button);
    input.focus();
    if (cursorStart !== null && cursorEnd !== null) {
      input.setSelectionRange(cursorStart, cursorEnd);
    }
  }

  function resetAccountActionForm({ collapse = true } = {}) {
    if (refs.accountActionType) refs.accountActionType.value = 'suspend';
    if (refs.accountActionReason) {
      refs.accountActionReason.value = 'Policy violation';
    }
    if (refs.accountActionOtherReason) refs.accountActionOtherReason.value = '';
    if (refs.accountActionAdminPassword) refs.accountActionAdminPassword.value = '';
    if (collapse && refs.accountActionForm) refs.accountActionForm.hidden = true;
    if (refs.openAccountActionBtn) refs.openAccountActionBtn.hidden = false;
    toggleAccountActionOtherReason();
    resetPasswordVisibility();
  }

  function openAccountActionForm() {
    if (!refs.accountActionForm) return;
    refs.accountActionForm.hidden = false;
    if (refs.openAccountActionBtn) refs.openAccountActionBtn.hidden = true;
    attachFloatingLabels();
    setTimeout(() => refs.accountActionType?.focus(), 30);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  }

  function getName(user) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed';
  }

  function formatAction(action) {
    return String(action || '')
      .replace(/^CRFV_/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatFeatureSummary(log) {
    if (!Array.isArray(log.newFeatures)) return '';
    const previousCount = Array.isArray(log.previousFeatures)
      ? log.previousFeatures.length
      : 0;
    return `Features: ${previousCount} to ${log.newFeatures.length}`;
  }

  function getAuditDetails(log) {
    const roleChange =
      log.previousRole || log.newRole
        ? `Role: ${log.previousRole || '-'} to ${log.newRole || '-'}`
        : '';
    const reason = log.reason ? `Reason: ${log.reason}` : '';
    return [log.details, reason, roleChange, formatFeatureSummary(log)]
      .filter(Boolean)
      .join(' | ');
  }

  function getStatusBadge(user) {
    if (user.accountDisabled === true) {
      return '<span class="am-status-badge is-disabled">Disabled</span>';
    }
    const lockDate = user.accountLockedUntil
      ? new Date(user.accountLockedUntil)
      : null;
    if (lockDate && lockDate > new Date()) {
      return '<span class="am-status-badge is-locked">Locked</span>';
    }
    return '<span class="am-status-badge">Active</span>';
  }

  async function loadCurrentUser() {
    const { response, payload } =
      await window.CRFVApi.requestJson('/api/check-auth');
    if (!response.ok || !payload?.authenticated) {
      window.location.href = '/crfv';
      return;
    }
    state.currentUserId = payload.user?.userId || '';
    state.currentUserRole = String(payload.user?.role || '').toLowerCase();
    if (Array.isArray(payload.crfvFeatureCatalog)) {
      state.featureCatalog = payload.crfvFeatureCatalog;
    }
    if (refs.openCreateAccountBtn) {
      refs.openCreateAccountBtn.hidden = state.currentUserRole !== 'admin';
    }
  }

  async function loadAccounts() {
    const params = new URLSearchParams({
      query: state.query,
      page: String(state.page),
      limit: '15',
      sortField: 'lastName',
      sortOrder: '1',
      roles: state.currentUserRole === 'manager' ? 'staff' : 'staff,manager',
    });

    setStatus(refs.accountsStatus, 'Loading accounts...');
    try {
      const { response, payload } = await window.CRFVApi.requestJson(
        `/api/admin/users?${params.toString()}`,
      );
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to load accounts.');
      }

      state.users = Array.isArray(payload.users) ? payload.users : [];
      state.totalPages = payload.pagination?.pages || 1;
      renderAccounts();
      renderPagination();
      setStatus(refs.accountsStatus, '');
    } catch (error) {
      state.users = [];
      renderAccounts();
      renderPagination();
      setStatus(
        refs.accountsStatus,
        error.message || 'Failed to load accounts.',
        'error',
      );
    }
  }

  async function fetchAccountAuditLogs({ targetStudentIDNumber = '', limit = 10 } = {}) {
    const params = new URLSearchParams({
      page: '1',
      limit: String(limit),
    });
    if (targetStudentIDNumber) {
      params.set('targetStudentIDNumber', targetStudentIDNumber);
    }

    const { response, payload } = await window.CRFVApi.requestJson(
      `/api/admin/users/audit-trail?${params.toString()}`,
    );
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || 'Failed to load account audit trail.');
    }
    return Array.isArray(payload.logs) ? payload.logs : [];
  }

  async function loadAccountAuditTrail() {
    if (!refs.accountAuditTrailBody) return;
    refs.accountAuditTrailBody.innerHTML =
      '<tr><td colspan="5" class="am-empty">Loading account changes...</td></tr>';
    setStatus(refs.accountAuditTrailStatus, 'Loading account audit trail...');
    try {
      state.auditLogs = await fetchAccountAuditLogs({ limit: 12 });
      renderAccountAuditTrail();
      setStatus(refs.accountAuditTrailStatus, '');
    } catch (error) {
      state.auditLogs = [];
      renderAccountAuditTrail();
      setStatus(
        refs.accountAuditTrailStatus,
        error.message || 'Failed to load account audit trail.',
        'error',
      );
    }
  }

  async function loadSelectedAccountAuditTrail() {
    if (!refs.selectedAccountAuditList || !state.selectedUser) return;
    if (!state.selectedUser.studentIDNumber) {
      refs.selectedAccountAuditList.innerHTML =
        '<p class="am-audit-empty">No account activity key available.</p>';
      return;
    }
    refs.selectedAccountAuditList.textContent = 'Loading activity...';
    try {
      state.selectedAuditLogs = await fetchAccountAuditLogs({
        targetStudentIDNumber: state.selectedUser.studentIDNumber || '',
        limit: 8,
      });
      renderSelectedAccountAuditTrail();
    } catch (error) {
      refs.selectedAccountAuditList.innerHTML = `<p class="am-audit-empty">${escapeHtml(
        error.message || 'Failed to load activity.',
      )}</p>`;
    }
  }

  function renderAccountAuditTrail() {
    if (!refs.accountAuditTrailBody) return;
    if (!state.auditLogs.length) {
      refs.accountAuditTrailBody.innerHTML =
        '<tr><td colspan="5" class="am-empty">No account changes recorded yet.</td></tr>';
      return;
    }

    refs.accountAuditTrailBody.innerHTML = state.auditLogs
      .map((log) => {
        const target =
          log.targetName ||
          log.targetStudentIDNumber ||
          log.targetRole ||
          'Unknown target';
        return `
          <tr>
            <td>${escapeHtml(formatDate(log.timestamp))}</td>
            <td>${escapeHtml(log.name || log.studentIDNumber || 'System')}</td>
            <td>
              <strong>${escapeHtml(target)}</strong>
              <span>${escapeHtml(log.targetStudentIDNumber || '')}</span>
            </td>
            <td><span class="am-audit-action">${escapeHtml(formatAction(log.action))}</span></td>
            <td>${escapeHtml(getAuditDetails(log) || '-')}</td>
          </tr>
        `;
      })
      .join('');
  }

  function renderSelectedAccountAuditTrail() {
    if (!refs.selectedAccountAuditList) return;
    if (!state.selectedAuditLogs.length) {
      refs.selectedAccountAuditList.innerHTML =
        '<p class="am-audit-empty">No recorded account activity.</p>';
      return;
    }

    refs.selectedAccountAuditList.innerHTML = state.selectedAuditLogs
      .map(
        (log) => `
          <article class="am-audit-item">
            <div>
              <strong>${escapeHtml(formatAction(log.action))}</strong>
              <span>${escapeHtml(formatDate(log.timestamp))}</span>
            </div>
            <p>${escapeHtml(getAuditDetails(log) || 'No details recorded.')}</p>
            <small>By ${escapeHtml(log.name || log.studentIDNumber || 'System')}</small>
          </article>
        `,
      )
      .join('');
  }

  async function refreshAuditTrails() {
    await loadAccountAuditTrail();
    if (state.selectedUser) {
      await loadSelectedAccountAuditTrail();
    }
  }

  function applySorting() {
    if (!state.sortBy) return;

    const sorted = [...state.users].sort((a, b) => {
      let aVal = a[state.sortBy];
      let bVal = b[state.sortBy];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Convert to lowercase for string comparison
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return state.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return state.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    state.users = sorted;
  }

  function updateSortHeaders() {
    const headers = document.querySelectorAll('.am-sort-header');
    headers.forEach((header) => {
      header.removeAttribute('data-sort-state');
      if (header.dataset.sort === state.sortBy) {
        header.setAttribute('data-sort-state', state.sortOrder);
      }
    });
  }

  function renderAccounts() {
    if (!refs.accountsTableBody) return;

    applySorting();

    if (state.users.length === 0) {
      refs.accountsTableBody.innerHTML =
        '<tr><td colspan="6" class="am-empty">No accounts found.</td></tr>';
      return;
    }

    refs.accountsTableBody.innerHTML = state.users
      .map((user) => {
        const id = escapeHtml(user._id || '');
        return `
          <tr>
            <td>${escapeHtml(getName(user))}</td>
            <td>${escapeHtml(user.studentIDNumber || '-')}</td>
            <td>${escapeHtml(user.emaildb || '-')}</td>
            <td><span class="am-role">${escapeHtml(user.role || '-')}</span></td>
            <td>${getStatusBadge(user)}</td>
            <td>
              <button class="am-btn am-btn-muted am-manage-btn" type="button" data-user-id="${id}">
                Manage
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    refs.accountsTableBody
      .querySelectorAll('.am-manage-btn')
      .forEach((button) => {
        button.addEventListener('click', () => {
          const user = state.users.find(
            (item) => item._id === button.dataset.userId,
          );
          if (user) openAccountModal(user);
        });
      });
  }

  function renderPagination() {
    if (!refs.accountsPagination) return;
    refs.accountsPagination.innerHTML = '';
    if (state.totalPages <= 1) return;

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.textContent = 'Prev';
    previous.disabled = state.page <= 1;
    previous.addEventListener('click', () => {
      state.page -= 1;
      loadAccounts();
    });
    refs.accountsPagination.append(previous);

    for (let page = 1; page <= state.totalPages; page += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(page);
      if (page === state.page) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => {
        state.page = page;
        loadAccounts();
      });
      refs.accountsPagination.append(button);
    }

    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = 'Next';
    next.disabled = state.page >= state.totalPages;
    next.addEventListener('click', () => {
      state.page += 1;
      loadAccounts();
    });
    refs.accountsPagination.append(next);
  }

  function validatePasswordPair(password, confirmPassword) {
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!PASSWORD_REGEX.test(password)) {
      return 'Password must be at least 8 characters with uppercase, lowercase, and a digit.';
    }
    return '';
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    const submitButton = refs.createAccountForm?.querySelector(
      'button[type="submit"]',
    );
    const payload = {
      firstName: refs.createFirstName?.value.trim() || '',
      lastName: refs.createLastName?.value.trim() || '',
      email: refs.createEmail?.value.trim() || '',
      role: refs.createRole?.value || 'staff',
    };

    if (!payload.firstName || !payload.lastName || !payload.email) {
      setStatus(
        refs.createAccountStatus,
        'Complete all required fields.',
        'error',
      );
      return;
    }

    setBusy(submitButton, true);
    setStatus(refs.createAccountStatus, 'Creating account...');
    try {
      const { response, payload: result } = await window.CRFVApi.requestJson(
        '/api/admin/users',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create account.');
      }

      refs.createAccountForm?.reset();
      setStatus(refs.createAccountStatus, result.message, 'success');
      state.page = 1;
      await loadAccounts();
      await loadAccountAuditTrail();
      setTimeout(() => closeCreateAccountModal(), 800);
    } catch (error) {
      setStatus(
        refs.createAccountStatus,
        error.message || 'Create failed.',
        'error',
      );
    } finally {
      setBusy(submitButton, false);
    }
  }

  function openAccountModal(user) {
    state.selectedUser = user;
    const isSelf = user._id && user._id === state.currentUserId;
    if (refs.accountModalTitle)
      refs.accountModalTitle.textContent = getName(user);
    if (refs.selectedRole)
      refs.selectedRole.value = ['manager', 'staff'].includes(user.role)
        ? user.role
        : 'manager';
    if (refs.roleAdminPassword) refs.roleAdminPassword.value = '';
    if (refs.temporaryPassword) refs.temporaryPassword.value = '';
    if (refs.temporaryPasswordConfirm) refs.temporaryPasswordConfirm.value = '';
    resetAccountActionForm();
    resetPasswordVisibility();
    if (refs.selectedAccountSummary) {
      refs.selectedAccountSummary.innerHTML = `
        <strong>${escapeHtml(getName(user))}</strong><br>
        ${escapeHtml(user.studentIDNumber || '-')} | ${escapeHtml(user.emaildb || '-')} | ${escapeHtml(user.role || '-')}<br>
        Created: ${escapeHtml(formatDate(user.createdAt))}
      `;
    }

    renderFeatureAccess(user);

    const managerLimitedMode = state.currentUserRole === 'manager';
    const canEditSupportFields = !isSelf && !managerLimitedMode;
    if (refs.roleChangeForm) refs.roleChangeForm.hidden = managerLimitedMode;
    if (refs.temporaryPasswordForm) {
      refs.temporaryPasswordForm.hidden = managerLimitedMode;
    }
    const recoverySection = refs.sendResetCodeBtn?.closest('.am-modal-section');
    if (recoverySection) recoverySection.hidden = managerLimitedMode;
    if (refs.accountStatusSection) {
      refs.accountStatusSection.hidden = managerLimitedMode;
    }
    if (refs.openAccountActionBtn) {
      refs.openAccountActionBtn.disabled = !canEditSupportFields;
    }

    refs.roleChangeForm
      ?.querySelectorAll('input, select, button')
      .forEach((node) => {
        node.disabled = !canEditSupportFields;
      });
    refs.temporaryPasswordForm
      ?.querySelectorAll('input, button')
      .forEach((node) => {
        node.disabled = !canEditSupportFields;
      });
    refs.accountActionForm
      ?.querySelectorAll('input, select, button')
      .forEach((node) => {
        node.disabled = !canEditSupportFields;
      });
    syncPasswordToggleButtons();

    setStatus(
      refs.accountModalStatus,
      isSelf
        ? 'Own role and password changes are blocked from this panel.'
        : '',
      isSelf ? 'error' : 'info',
    );
    refs.accountModal.hidden = false;
    attachFloatingLabels();
    loadSelectedAccountAuditTrail();
  }

  function renderFeatureAccess(user) {
    if (!refs.featureAccessList) return;
    const selectedFeatures = new Set(
      Array.isArray(user.crfvFeatureAccess) ? user.crfvFeatureAccess : [],
    );
    const isAdminTarget = String(user.role || '').toLowerCase() === 'admin';
    const isSelf = user._id && user._id === state.currentUserId;

    refs.featureAccessList.innerHTML = state.featureCatalog
      .map((feature) => {
        const key = escapeHtml(feature.key);
        const label = escapeHtml(feature.label || feature.key);
        const description = escapeHtml(
          feature.description ||
            FEATURE_DESCRIPTIONS[feature.key] ||
            `Allows access to ${feature.label || feature.key}.`,
        );
        const checked = selectedFeatures.has(feature.key) ? 'checked' : '';
        const disabled = isAdminTarget || isSelf ? 'disabled' : '';
        return `
          <label class="am-feature-option" data-tooltip="${description}">
            <input type="checkbox" value="${key}" ${checked} ${disabled}>
            <span>${label}</span>
          </label>
        `;
      })
      .join('');

    if (refs.saveFeatureAccessBtn) {
      refs.saveFeatureAccessBtn.disabled = isAdminTarget || isSelf;
    }
  }

  function closeAccountModal() {
    refs.accountModal.hidden = true;
    state.selectedUser = null;
    state.selectedAuditLogs = [];
    resetAccountActionForm();
    resetPasswordVisibility();
    setStatus(refs.accountModalStatus, '');
  }

  function openCreateAccountModal() {
    if (!refs.createAccountModal) return;
    refs.createAccountModal.hidden = false;
    attachFloatingLabelsToCreateForm();
    refs.createFirstName?.focus();
  }

  function closeCreateAccountModal() {
    if (!refs.createAccountModal) return;
    refs.createAccountModal.hidden = true;
    refs.createAccountForm?.reset();
    setStatus(refs.createAccountStatus, '');
  }

  async function handleRoleChange(event) {
    event.preventDefault();
    if (!state.selectedUser?._id) return;

    const role = refs.selectedRole?.value || '';
    const adminPassword = refs.roleAdminPassword?.value || '';
    if (!adminPassword) {
      setStatus(refs.accountModalStatus, 'Enter your admin password.', 'error');
      return;
    }

    const userName = getName(state.selectedUser);
    const bodyHtml = `
      <p>Change role for <strong>${escapeHtml(userName)}</strong>?</p>
      <div class="am-confirmation-highlight">
        New Role: <strong>${escapeHtml(role)}</strong>
      </div>
      <p>This action will update the user's account role. Confirm to proceed.</p>
    `;

    showConfirmation('Confirm Role Change', bodyHtml, async () => {
      const submitButton = refs.roleChangeForm?.querySelector(
        'button[type="submit"]',
      );
      setBusy(submitButton, true);
      setStatus(refs.accountModalStatus, 'Updating role...');
      try {
        const { response, payload } = await window.CRFVApi.requestJson(
          `/api/admin/users/${encodeURIComponent(state.selectedUser._id)}/role`,
          {
            method: 'PUT',
            body: JSON.stringify({ role, adminPassword }),
          },
        );
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Failed to update role.');
        }
        setStatus(refs.accountModalStatus, payload.message, 'success');
        await loadAccounts();
        await refreshAuditTrails();
        closeAccountModal();
      } catch (error) {
        setStatus(
          refs.accountModalStatus,
          error.message || 'Role update failed.',
          'error',
        );
      } finally {
        setBusy(submitButton, false);
      }
    });
  }

  async function handleFeatureAccess(event) {
    event.preventDefault();
    if (!state.selectedUser?._id) return;

    const features = Array.from(
      refs.featureAccessList?.querySelectorAll('input[type="checkbox"]:checked') || [],
    ).map((input) => input.value);
    const userName = getName(state.selectedUser);
    const bodyHtml = `
      <p>Update CRFV feature access for <strong>${escapeHtml(userName)}</strong>?</p>
      <div class="am-confirmation-highlight">
        Enabled features: <strong>${features.length}</strong>
      </div>
      <p>Unavailable features will be hidden and blocked server-side.</p>
    `;

    showConfirmation('Confirm Feature Access', bodyHtml, async () => {
      setBusy(refs.saveFeatureAccessBtn, true);
      setStatus(refs.accountModalStatus, 'Updating feature access...');
      try {
        const { response, payload } = await window.CRFVApi.requestJson(
          `/api/admin/users/${encodeURIComponent(state.selectedUser._id)}/crfv-features`,
          {
            method: 'PUT',
            body: JSON.stringify({ features }),
          },
        );
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Failed to update feature access.');
        }
        setStatus(refs.accountModalStatus, payload.message, 'success');
        await loadAccounts();
        const updatedUser = state.users.find(
          (user) => user._id === state.selectedUser._id,
        );
        if (updatedUser) {
          state.selectedUser = updatedUser;
          renderFeatureAccess(updatedUser);
        }
        await refreshAuditTrails();
      } catch (error) {
        setStatus(
          refs.accountModalStatus,
          error.message || 'Feature access update failed.',
          'error',
        );
      } finally {
        setBusy(refs.saveFeatureAccessBtn, false);
      }
    });
  }

  async function handleTemporaryPassword(event) {
    event.preventDefault();
    if (!state.selectedUser?._id) return;

    const newPassword = refs.temporaryPassword?.value || '';
    const confirmPassword = refs.temporaryPasswordConfirm?.value || '';
    const passwordError = validatePasswordPair(newPassword, confirmPassword);
    if (passwordError) {
      setStatus(refs.accountModalStatus, passwordError, 'error');
      return;
    }

    const userName = getName(state.selectedUser);
    const bodyHtml = `
      <p>Set temporary password for <strong>${escapeHtml(userName)}</strong>?</p>
      <div class="am-confirmation-highlight">
        This will override their current password and require them to reset it on next login.
      </div>
      <p>Confirm to proceed.</p>
    `;

    showConfirmation('Confirm Password Change', bodyHtml, async () => {
      const submitButton = refs.temporaryPasswordForm?.querySelector(
        'button[type="submit"]',
      );
      setBusy(submitButton, true);
      setStatus(refs.accountModalStatus, 'Setting password...');
      try {
        const { response, payload } = await window.CRFVApi.requestJson(
          `/api/admin/users/${encodeURIComponent(state.selectedUser._id)}/password`,
          {
            method: 'PUT',
            body: JSON.stringify({ newPassword, confirmPassword }),
          },
        );
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Failed to set password.');
        }
        setStatus(refs.accountModalStatus, payload.message, 'success');
        refs.temporaryPassword.value = '';
        refs.temporaryPasswordConfirm.value = '';
        await loadAccounts();
        await refreshAuditTrails();
      } catch (error) {
        setStatus(
          refs.accountModalStatus,
          error.message || 'Password set failed.',
          'error',
        );
      } finally {
        setBusy(submitButton, false);
      }
    });
  }

  async function sendResetCode() {
    if (!state.selectedUser?._id) return;

    const userName = getName(state.selectedUser);
    const bodyHtml = `
      <p>Send password reset code to <strong>${escapeHtml(userName)}</strong>?</p>
      <div class="am-confirmation-highlight">
        They will receive an email with a password reset link.
      </div>
      <p>Confirm to proceed.</p>
    `;

    showConfirmation('Confirm Send Reset Code', bodyHtml, async () => {
      setBusy(refs.sendResetCodeBtn, true);
      setStatus(refs.accountModalStatus, 'Sending reset code...');
      try {
        const { response, payload } = await window.CRFVApi.requestJson(
          `/api/admin/users/${encodeURIComponent(state.selectedUser._id)}/send-password-reset`,
          { method: 'POST' },
        );
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Failed to send reset code.');
        }
        setStatus(refs.accountModalStatus, payload.message, 'success');
        await refreshAuditTrails();
      } catch (error) {
        setStatus(
          refs.accountModalStatus,
          error.message || 'Reset code failed.',
          'error',
        );
      } finally {
        setBusy(refs.sendResetCodeBtn, false);
      }
    });
  }

  async function resetRecoveryFields() {
    if (!state.selectedUser?._id) return;

    const userName = getName(state.selectedUser);
    const bodyHtml = `
      <p>Unlock and clear recovery fields for <strong>${escapeHtml(userName)}</strong>?</p>
      <div class="am-confirmation-highlight">
        This will reset their security questions and recovery options.
      </div>
      <p>Confirm to proceed.</p>
    `;

    showConfirmation('Confirm Reset Recovery Fields', bodyHtml, async () => {
      setBusy(refs.resetRecoveryFieldsBtn, true);
      setStatus(refs.accountModalStatus, 'Resetting recovery fields...');
      try {
        const { response, payload } = await window.CRFVApi.requestJson(
          '/api/admin/users/reset-fields',
          {
            method: 'PUT',
            body: JSON.stringify({ userIds: [state.selectedUser._id] }),
          },
        );
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Failed to reset fields.');
        }
        setStatus(refs.accountModalStatus, payload.message, 'success');
        await loadAccounts();
        await refreshAuditTrails();
      } catch (error) {
        setStatus(
          refs.accountModalStatus,
          error.message || 'Reset failed.',
          'error',
        );
      } finally {
        setBusy(refs.resetRecoveryFieldsBtn, false);
      }
    });
  }

  function toggleAccountActionOtherReason() {
    const isOther = refs.accountActionReason?.value === 'Other';
    if (refs.accountActionOtherField) {
      refs.accountActionOtherField.hidden = !isOther;
    }
    if (refs.accountActionOtherReason) {
      refs.accountActionOtherReason.required = isOther;
      if (!isOther) refs.accountActionOtherReason.value = '';
    }
    syncFloatingLabels();
  }

  async function handleAccountAction(event) {
    event.preventDefault();
    if (!state.selectedUser?._id) return;

    const action = refs.accountActionType?.value || 'suspend';
    const reason = refs.accountActionReason?.value || '';
    const otherReason = refs.accountActionOtherReason?.value.trim() || '';
    const adminPassword = refs.accountActionAdminPassword?.value || '';
    const effectiveReason = reason === 'Other' ? otherReason : reason;

    if (reason === 'Other' && !otherReason) {
      setStatus(refs.accountModalStatus, 'Enter the other reason.', 'error');
      return;
    }
    if (!adminPassword) {
      setStatus(refs.accountModalStatus, 'Enter your admin password.', 'error');
      return;
    }

    const userName = getName(state.selectedUser);
    const isDelete = action === 'delete';
    const bodyHtml = `
      <p>${isDelete ? 'Delete' : 'Suspend'} <strong>${escapeHtml(userName)}</strong>?</p>
      <div class="am-confirmation-highlight">
        Reason: <strong>${escapeHtml(effectiveReason)}</strong>
      </div>
      <p>${
        isDelete
          ? 'This permanently removes the account record.'
          : 'This blocks the account from logging in.'
      }</p>
    `;

    showConfirmation(
      isDelete ? 'Confirm Account Deletion' : 'Confirm Account Suspension',
      bodyHtml,
      async () => {
        setBusy(refs.runAccountActionBtn, true);
        setStatus(refs.accountModalStatus, 'Applying account action...');
        try {
          const { response, payload } = await window.CRFVApi.requestJson(
            `/api/admin/users/${encodeURIComponent(state.selectedUser._id)}/account-action`,
            {
              method: 'POST',
              body: JSON.stringify({
                action,
                reason,
                otherReason,
                adminPassword,
              }),
            },
          );
          if (!response.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to apply account action.');
          }
          setStatus(refs.accountModalStatus, payload.message, 'success');
          await loadAccounts();
          await loadAccountAuditTrail();
          closeAccountModal();
        } catch (error) {
          setStatus(
            refs.accountModalStatus,
            error.message || 'Account action failed.',
            'error',
          );
        } finally {
          setBusy(refs.runAccountActionBtn, false);
        }
      },
    );
  }

  function bindEvents() {
    refs.openCreateAccountBtn?.addEventListener('click', openCreateAccountModal);
    refs.closeCreateAccountBtn?.addEventListener('click', closeCreateAccountModal);
    refs.createAccountForm?.addEventListener('submit', handleCreateAccount);
    refs.createAccountModal?.querySelector('.am-floating-overlay')?.addEventListener('click', closeCreateAccountModal);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (!refs.createAccountModal.hidden) closeCreateAccountModal();
        if (!refs.accountModal.hidden) closeAccountModal();
      }
    });
    refs.accountSearchForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      state.query = refs.accountSearchInput?.value.trim() || '';
      state.page = 1;
      loadAccounts();
    });
    refs.closeAccountModalBtn?.addEventListener('click', closeAccountModal);
    refs.accountModal?.addEventListener('click', (event) => {
      if (event.target === refs.accountModal) closeAccountModal();
    });
    refs.featureAccessForm?.addEventListener('submit', handleFeatureAccess);
    refs.roleChangeForm?.addEventListener('submit', handleRoleChange);
    refs.temporaryPasswordForm?.addEventListener(
      'submit',
      handleTemporaryPassword,
    );
    refs.sendResetCodeBtn?.addEventListener('click', sendResetCode);
    refs.resetRecoveryFieldsBtn?.addEventListener('click', resetRecoveryFields);
    refs.openAccountActionBtn?.addEventListener('click', openAccountActionForm);
    refs.cancelAccountActionBtn?.addEventListener('click', () => {
      resetAccountActionForm();
    });
    refs.accountActionReason?.addEventListener(
      'change',
      toggleAccountActionOtherReason,
    );
    refs.accountActionForm?.addEventListener('submit', handleAccountAction);
    refs.refreshAuditTrailBtn?.addEventListener('click', loadAccountAuditTrail);
    refs.refreshSelectedAuditBtn?.addEventListener(
      'click',
      loadSelectedAccountAuditTrail,
    );
    refs.confirmActionBtn?.addEventListener('click', executeConfirmedAction);
    refs.cancelConfirmBtn?.addEventListener('click', closeConfirmation);
    refs.confirmationModal?.addEventListener('click', (event) => {
      if (event.target === refs.confirmationModal) closeConfirmation();
    });
    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
      button.addEventListener('click', () => togglePasswordVisibility(button));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !refs.confirmationModal?.hidden) {
        closeConfirmation();
      }
    });

    // Sort header listeners
    document.querySelectorAll('.am-sort-header').forEach((header) => {
      header.addEventListener('click', () => {
        const sortColumn = header.dataset.sort;
        if (state.sortBy === sortColumn) {
          // Cycle: asc → desc → default
          if (state.sortOrder === 'asc') {
            state.sortOrder = 'desc';
          } else if (state.sortOrder === 'desc') {
            state.sortBy = null;
            state.sortOrder = null;
          }
        } else {
          // New column, start with ascending
          state.sortBy = sortColumn;
          state.sortOrder = 'asc';
        }
        state.page = 1;
        renderAccounts();
        renderPagination();
        updateSortHeaders();
      });
    });
    updateSortHeaders();
  }

  async function init() {
    cacheRefs();
    bindEvents();
    try {
      await window.CRFVApi.loadCsrfToken();
      await loadCurrentUser();
      await loadAccounts();
      await loadAccountAuditTrail();
    } catch {
      setStatus(
        refs.accountsStatus,
        'Unable to initialize account management.',
        'error',
      );
    }
  }

  init();
})();
