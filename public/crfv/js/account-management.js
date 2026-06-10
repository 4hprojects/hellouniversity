(() => {
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
  const STAFF_ID_REGEX = /^[A-Za-z0-9._-]{3,32}$/;

  const state = {
    users: [],
    selectedUser: null,
    currentUserId: '',
    query: '',
    page: 1,
    totalPages: 1,
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
      'createUserId',
      'createRole',
      'createPassword',
      'createConfirmPassword',
      'createAccountStatus',
      'accountSearchForm',
      'accountSearchInput',
      'accountsTableBody',
      'accountsPagination',
      'accountsStatus',
      'accountModal',
      'accountModalTitle',
      'closeAccountModalBtn',
      'selectedAccountSummary',
      'roleChangeForm',
      'selectedRole',
      'roleAdminPassword',
      'temporaryPasswordForm',
      'temporaryPassword',
      'temporaryPasswordConfirm',
      'sendResetCodeBtn',
      'resetRecoveryFieldsBtn',
      'accountModalStatus',
    ].forEach((id) => {
      refs[id] = el(id);
    });
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
  }

  async function loadAccounts() {
    const params = new URLSearchParams({
      query: state.query,
      page: String(state.page),
      limit: '15',
      sortField: 'lastName',
      sortOrder: '1',
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

  function renderAccounts() {
    if (!refs.accountsTableBody) return;

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
      studentIDNumber: refs.createUserId?.value.trim() || '',
      role: refs.createRole?.value || 'manager',
      password: refs.createPassword?.value || '',
      confirmPassword: refs.createConfirmPassword?.value || '',
    };

    if (
      !payload.firstName ||
      !payload.lastName ||
      !payload.email ||
      !payload.studentIDNumber
    ) {
      setStatus(
        refs.createAccountStatus,
        'Complete all required fields.',
        'error',
      );
      return;
    }

    if (!STAFF_ID_REGEX.test(payload.studentIDNumber)) {
      setStatus(
        refs.createAccountStatus,
        'User ID must be 3-32 characters using letters, numbers, dot, underscore, or hyphen.',
        'error',
      );
      return;
    }

    const passwordError = validatePasswordPair(
      payload.password,
      payload.confirmPassword,
    );
    if (passwordError) {
      setStatus(refs.createAccountStatus, passwordError, 'error');
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
      refs.selectedRole.value = user.role === 'admin' ? 'admin' : 'manager';
    if (refs.roleAdminPassword) refs.roleAdminPassword.value = '';
    if (refs.temporaryPassword) refs.temporaryPassword.value = '';
    if (refs.temporaryPasswordConfirm) refs.temporaryPasswordConfirm.value = '';
    if (refs.selectedAccountSummary) {
      refs.selectedAccountSummary.innerHTML = `
        <strong>${escapeHtml(getName(user))}</strong><br>
        ${escapeHtml(user.studentIDNumber || '-')} | ${escapeHtml(user.emaildb || '-')} | ${escapeHtml(user.role || '-')}<br>
        Created: ${escapeHtml(formatDate(user.createdAt))}
      `;
    }

    refs.roleChangeForm
      ?.querySelectorAll('input, select, button')
      .forEach((node) => {
        node.disabled = isSelf;
      });
    refs.temporaryPasswordForm
      ?.querySelectorAll('input, button')
      .forEach((node) => {
        node.disabled = isSelf;
      });

    setStatus(
      refs.accountModalStatus,
      isSelf
        ? 'Own role and password changes are blocked from this panel.'
        : '',
      isSelf ? 'error' : 'info',
    );
    refs.accountModal.hidden = false;
  }

  function closeAccountModal() {
    refs.accountModal.hidden = true;
    state.selectedUser = null;
    setStatus(refs.accountModalStatus, '');
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

    const confirmed = window.confirm(
      `Set a temporary password for ${getName(state.selectedUser)}?`,
    );
    if (!confirmed) return;

    const submitButton = refs.temporaryPasswordForm?.querySelector(
      'button[type="submit"]',
    );
    setBusy(submitButton, true);
    setStatus(refs.accountModalStatus, 'Setting temporary password...');
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
      refs.temporaryPassword.value = '';
      refs.temporaryPasswordConfirm.value = '';
      setStatus(refs.accountModalStatus, payload.message, 'success');
      await loadAccounts();
    } catch (error) {
      setStatus(
        refs.accountModalStatus,
        error.message || 'Password reset failed.',
        'error',
      );
    } finally {
      setBusy(submitButton, false);
    }
  }

  async function sendResetCode() {
    if (!state.selectedUser?._id) return;
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
    } catch (error) {
      setStatus(
        refs.accountModalStatus,
        error.message || 'Reset code failed.',
        'error',
      );
    } finally {
      setBusy(refs.sendResetCodeBtn, false);
    }
  }

  async function resetRecoveryFields() {
    if (!state.selectedUser?._id) return;
    const confirmed = window.confirm(
      `Unlock and clear recovery fields for ${getName(state.selectedUser)}?`,
    );
    if (!confirmed) return;

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
    } catch (error) {
      setStatus(
        refs.accountModalStatus,
        error.message || 'Reset failed.',
        'error',
      );
    } finally {
      setBusy(refs.resetRecoveryFieldsBtn, false);
    }
  }

  function bindEvents() {
    refs.createAccountForm?.addEventListener('submit', handleCreateAccount);
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
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !refs.accountModal.hidden)
        closeAccountModal();
    });
    refs.roleChangeForm?.addEventListener('submit', handleRoleChange);
    refs.temporaryPasswordForm?.addEventListener(
      'submit',
      handleTemporaryPassword,
    );
    refs.sendResetCodeBtn?.addEventListener('click', sendResetCode);
    refs.resetRecoveryFieldsBtn?.addEventListener('click', resetRecoveryFields);
  }

  async function init() {
    cacheRefs();
    bindEvents();
    try {
      await window.CRFVApi.loadCsrfToken();
      await loadCurrentUser();
      await loadAccounts();
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
