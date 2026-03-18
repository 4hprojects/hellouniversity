(function attachAdminDashboardUsers(global) {
    const state = {
        users: [],
        page: 1,
        totalPages: 1,
        sortField: 'lastName',
        sortOrder: 1,
        query: '',
        selectedUser: null
    };

    let csrfToken = null;

    async function fetchCsrfToken() {
        try {
            const res = await fetch('/api/csrf-token', { credentials: 'include' });
            const data = await res.json();
            csrfToken = data.csrfToken || null;
        } catch {
            csrfToken = null;
        }
    }

    async function init() {
        await fetchCsrfToken();
        bindEvents();
        loadUsers();
    }

    function bindEvents() {
        const userSearchButton = document.getElementById('userSearchButton');
        const userSearchInput = document.getElementById('userSearchInput');
        const exportUsersBtn = document.getElementById('exportUsersBtn');
        const resetSelectedUsersBtn = document.getElementById('resetSelectedUsersBtn');
        const selectAllUsers = document.getElementById('selectAllUsers');
        const roleForm = document.getElementById('userDetailRoleForm');
        const closeDetailModal = document.getElementById('closeUserDetailModal');
        const cancelDetailModal = document.getElementById('cancelUserDetailModal');
        const detailModal = document.getElementById('userDetailModal');

        if (userSearchButton) {
            userSearchButton.addEventListener('click', () => {
                state.query = userSearchInput?.value?.trim() || '';
                state.page = 1;
                loadUsers();
            });
        }

        if (userSearchInput) {
            userSearchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    state.query = userSearchInput.value.trim();
                    state.page = 1;
                    loadUsers();
                }
            });
        }

        document.querySelectorAll('th[data-sort]').forEach((header) => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                if (state.sortField === field) {
                    state.sortOrder = state.sortOrder === 1 ? -1 : 1;
                } else {
                    state.sortField = field;
                    state.sortOrder = 1;
                }
                loadUsers();
            });
        });

        if (exportUsersBtn) {
            exportUsersBtn.addEventListener('click', exportVisibleUsers);
        }

        if (resetSelectedUsersBtn) {
            resetSelectedUsersBtn.addEventListener('click', resetSelectedUsers);
        }

        if (selectAllUsers) {
            selectAllUsers.addEventListener('change', () => {
                document.querySelectorAll('.user-select-checkbox').forEach((checkbox) => {
                    checkbox.checked = selectAllUsers.checked;
                });
            });
        }

        if (roleForm) {
            roleForm.addEventListener('submit', handleRoleUpdate);
        }

        if (closeDetailModal) {
            closeDetailModal.addEventListener('click', closeUserDetailModal);
        }

        if (cancelDetailModal) {
            cancelDetailModal.addEventListener('click', closeUserDetailModal);
        }

        if (detailModal) {
            detailModal.addEventListener('click', (event) => {
                if (event.target === detailModal) {
                    closeUserDetailModal();
                }
            });
        }
    }

    async function loadUsers() {
        const params = new URLSearchParams({
            query: state.query,
            page: String(state.page),
            limit: '25',
            sortField: state.sortField,
            sortOrder: String(state.sortOrder)
        });

        try {
            const response = await fetch(`/api/admin/users?${params.toString()}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch users.');
            }

            state.users = Array.isArray(data.users) ? data.users : [];
            state.totalPages = data.pagination?.pages || 1;
            renderUsers();
            renderPagination();
            updateSortArrows();

            if (global.adminDashboardPanels) {
                global.adminDashboardPanels.updateSummary({ userCount: data.pagination?.total || state.users.length });
            }
        } catch (error) {
            console.error('User load failed:', error);
            renderEmptyState(error.message || 'Failed to load users.');
        }
    }

    function renderUsers() {
        const tbody = document.getElementById('userSearchResults');
        if (!tbody) return;

        if (state.users.length === 0) {
            renderEmptyState('No users found for the current filters.');
            return;
        }

        tbody.innerHTML = state.users.map((user) => {
            const docCell = user.verificationDocKey
                ? `<button class="um-view-doc-btn" data-user-id="${escapeHtml(user._id || '')}" type="button">View Doc</button>`
                : `<span class="um-no-doc-badge">No doc</span>`;
            const statusCell = renderStatusBadge(user);
            return `
            <tr class="clickable-row${user.role === 'teacher_pending' ? ' um-row-pending' : ''}" data-user-id="${escapeHtml(user._id || '')}">
                <td class="checkbox-cell"><input type="checkbox" class="user-select-checkbox" value="${escapeHtml(user._id || '')}" /></td>
                <td>${escapeHtml(user.studentIDNumber || 'N/A')}</td>
                <td>${escapeHtml(user.lastName || 'N/A')}</td>
                <td>${escapeHtml(user.firstName || 'N/A')}</td>
                <td>${escapeHtml(user.emaildb || 'N/A')}</td>
                <td><span class="role-pill role-${escapeHtml(user.role || 'user')}">${escapeHtml(user.role || 'user')}</span></td>
                <td>${statusCell}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td class="checkbox-cell">${docCell}</td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('tr[data-user-id]').forEach((row) => {
            row.addEventListener('dblclick', () => {
                const userId = row.dataset.userId;
                const user = state.users.find((item) => item._id === userId);
                if (user) {
                    openUserDetailModal(user);
                }
            });
        });

        tbody.querySelectorAll('.um-view-doc-btn').forEach((btn) => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation();
                const userId = btn.dataset.userId;
                btn.disabled = true;
                btn.textContent = 'Loading...';
                try {
                    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/verification-doc`, { credentials: 'include' });
                    const data = await res.json();
                    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to get doc URL.');
                    window.open(data.url, '_blank', 'noopener,noreferrer');
                } catch (err) {
                    global.adminDashboardPanels?.showFlash(err.message || 'Could not open document.', 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'View Doc';
                }
            });
        });

        tbody.querySelectorAll('.user-select-checkbox').forEach((checkbox) => {
            checkbox.addEventListener('dblclick', (event) => {
                event.stopPropagation();
            });
            checkbox.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        });
    }

    function renderPagination() {
        const container = document.getElementById('userPagination');
        if (!container) return;

        container.innerHTML = '';
        if (state.totalPages <= 1) return;

        const previous = createButton('Previous', state.page === 1, () => {
            state.page -= 1;
            loadUsers();
        });
        const next = createButton('Next', state.page >= state.totalPages, () => {
            state.page += 1;
            loadUsers();
        });
        const status = document.createElement('span');
        status.className = 'pagination-status';
        status.textContent = `Page ${state.page} of ${state.totalPages}`;

        const pageNumbers = [];
        for (let i = 1; i <= state.totalPages; i++) {
            const btn = createButton(String(i), false, () => {
                state.page = i;
                loadUsers();
            });
            if (i === state.page) btn.classList.add('active');
            pageNumbers.push(btn);
        }

        container.append(previous, ...pageNumbers, status, next);
    }

    async function handleRoleUpdate(event) {
        event.preventDefault();

        if (!state.selectedUser?._id) {
            setDetailModalStatus('No user selected.', true);
            return;
        }

        const selectedRole = getInputValue('userRoleSelect');
        const adminPassword = getInputValue('adminPasswordConfirm', false);

        if (!selectedRole || !adminPassword) {
            setDetailModalStatus('Choose a role and enter your admin password.', true);
            return;
        }

        setDetailModalStatus('Updating role...', false);

        try {
            const response = await fetch(`/api/admin/users/${encodeURIComponent(state.selectedUser._id)}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                credentials: 'include',
                body: JSON.stringify({
                    role: selectedRole,
                    adminPassword
                })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update user role.');
            }

            setDetailModalStatus(data.message || 'Role updated successfully.', false);
            global.adminDashboardPanels?.showFlash(data.message || 'User role updated successfully.', 'success');
            closeUserDetailModal();
            loadUsers();
        } catch (error) {
            console.error('Role update failed:', error);
            setDetailModalStatus(error.message || 'Role update failed.', true);
            global.adminDashboardPanels?.showFlash(error.message || 'Role update failed.', 'error');
        }
    }

    function openUserDetailModal(user) {
        state.selectedUser = user;

        const modal = document.getElementById('userDetailModal');
        const summary = document.getElementById('userDetailSummary');
        const statusBadge = document.getElementById('userDetailStatusBadge');
        const lastLogin = document.getElementById('userDetailLastLogin');
        const lockedUntil = document.getElementById('userDetailLockedUntil');
        const loginAttempts = document.getElementById('userDetailLoginAttempts');
        const roleSelect = document.getElementById('userRoleSelect');
        const passwordInput = document.getElementById('adminPasswordConfirm');

        if (summary) {
            const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed User';
            summary.textContent = `${name} (${user.studentIDNumber || 'N/A'}) — ${user.emaildb || 'N/A'} | current role: ${user.role || 'N/A'}`;
        }

        if (statusBadge) {
            statusBadge.innerHTML = renderStatusBadge(user);
        }

        if (lastLogin) {
            lastLogin.textContent = user.lastLogin ? formatDate(user.lastLogin) : 'Never';
        }

        if (lockedUntil) {
            const lockDate = user.accountLockedUntil ? new Date(user.accountLockedUntil) : null;
            lockedUntil.textContent = (lockDate && lockDate > new Date()) ? formatDate(lockDate) : 'Not locked';
        }

        if (loginAttempts) {
            loginAttempts.textContent = user.invalidLoginAttempts != null ? String(user.invalidLoginAttempts) : '0';
        }

        if (roleSelect) {
            roleSelect.value = user.role || 'student';
        }

        if (passwordInput) {
            passwordInput.value = '';
        }

        setDetailModalStatus('', false);

        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    function closeUserDetailModal() {
        const modal = document.getElementById('userDetailModal');
        const passwordInput = document.getElementById('adminPasswordConfirm');

        if (passwordInput) {
            passwordInput.value = '';
        }

        state.selectedUser = null;
        setDetailModalStatus('', false);

        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    function setDetailModalStatus(message, isError) {
        const status = document.getElementById('userDetailModalStatus');
        if (!status) return;
        status.textContent = message || '';
        status.style.color = isError ? '#991b1b' : '';
    }

    function renderStatusBadge(user) {
        if (user.accountDisabled === true) {
            return '<span class="role-pill" style="color:#7f1d1d;background:#fee2e2;">Disabled</span>';
        }
        const lockDate = user.accountLockedUntil ? new Date(user.accountLockedUntil) : null;
        if (lockDate && lockDate > new Date()) {
            return `<span class="role-pill" style="color:#78350f;background:#fef3c7;">Locked</span>`;
        }
        if (user.role === 'teacher_pending') {
            return '<span class="role-pill role-teacher_pending">Pending</span>';
        }
        return '<span class="role-pill" style="color:#065f46;background:#d1fae5;">Active</span>';
    }

    async function resetSelectedUsers() {
        const selectedIds = getSelectedUserIds();
        if (selectedIds.length === 0) {
            global.adminDashboardPanels?.showFlash('Select at least one user first.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/admin/users/reset-fields', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                credentials: 'include',
                body: JSON.stringify({ userIds: selectedIds })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to reset selected users.');
            }

            global.adminDashboardPanels?.showFlash(data.message || 'Selected users reset.', 'success');
            loadUsers();
        } catch (error) {
            console.error('Reset selected users failed:', error);
            global.adminDashboardPanels?.showFlash(error.message || 'Reset failed.', 'error');
        }
    }

    function exportVisibleUsers() {
        if (state.users.length === 0) {
            global.adminDashboardPanels?.showFlash('No visible users to export.', 'error');
            return;
        }

        const header = ['studentIDNumber', 'lastName', 'firstName', 'emaildb', 'role', 'createdAt'];
        const rows = state.users.map((user) => [
            user.studentIDNumber || '',
            user.lastName || '',
            user.firstName || '',
            user.emaildb || '',
            user.role || '',
            user.createdAt || ''
        ]);
        const csv = [header, ...rows]
            .map((row) => row.map(escapeCsv).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'admin-users.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function getSelectedUserIds() {
        return Array.from(document.querySelectorAll('.user-select-checkbox:checked'))
            .map((checkbox) => checkbox.value)
            .filter(Boolean);
    }

    function updateSortArrows() {
        document.querySelectorAll('th[data-sort]').forEach((th) => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === state.sortField) {
                th.classList.add(state.sortOrder === 1 ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    function renderEmptyState(message) {
        const tbody = document.getElementById('userSearchResults');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="9" class="no-data">${escapeHtml(message)}</td></tr>`;
    }

    function createButton(label, disabled, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        return button;
    }

    function getInputValue(id, trim = true) {
        const element = document.getElementById(id);
        if (!element) return '';
        const value = String(element.value || '');
        return trim ? value.trim() : value;
    }

    function formatDate(value) {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString();
    }

    function escapeCsv(value) {
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    global.adminDashboardUsers = {
        init
    };
})(window);
