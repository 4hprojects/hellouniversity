(function attachAdminDashboardVerification(global) {
    const state = {
        users: [],
        selectedUser: null,
        pendingAction: null // 'approve' | 'reject'
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

    let loaded = false;

    async function initBadge() {
        try {
            const res = await fetch('/api/admin/users/pending-teachers/count', { credentials: 'include' });
            const data = await res.json();
            if (!res.ok || !data.success) return;
            const count = data.count || 0;
            const badge = document.getElementById('verificationNavBadge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-flex' : 'none';
            }
        } catch {
            // Non-fatal: badge simply stays hidden
        }
    }

    async function init() {
        await fetchCsrfToken();
        initBadge();
        bindEvents();

        // Hook into the panel system: load when Teacher Verification panel is first shown
        const panelLinks = document.querySelectorAll('[data-panel="teacherVerificationPanel"]');
        panelLinks.forEach((link) => {
            link.addEventListener('click', () => {
                if (!loaded) {
                    loaded = true;
                    loadPendingTeachers();
                }
            });
        });

        // Also respond to programmatic showPanel calls
        const origShow = global.adminDashboardPanels?.showPanel;
        if (origShow) {
            global.adminDashboardPanels.showPanel = function (panelId) {
                origShow.call(this, panelId);
                if (panelId === 'teacherVerificationPanel' && !loaded) {
                    loaded = true;
                    loadPendingTeachers();
                }
            };
        }
    }

    function bindEvents() {
        const refreshBtn = document.getElementById('verificationRefreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', loadPendingTeachers);

        const form = document.getElementById('teacherVerifyForm');
        if (form) form.addEventListener('submit', handleVerifyAction);

        const closeModal = document.getElementById('closeTeacherVerifyModal');
        if (closeModal) closeModal.addEventListener('click', closeVerifyModal);

        const cancelModal = document.getElementById('cancelTeacherVerifyModal');
        if (cancelModal) cancelModal.addEventListener('click', closeVerifyModal);

        const modal = document.getElementById('teacherVerifyModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeVerifyModal();
            });
        }
    }

    async function loadPendingTeachers() {
        const tbody = document.getElementById('verificationResults');
        const metaEl = document.getElementById('verificationMeta');

        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="no-data">Loading...</td></tr>';

        try {
            const res = await fetch('/api/admin/users/pending-teachers', { credentials: 'include' });
            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load.');

            state.users = Array.isArray(data.users) ? data.users : [];

            const count = state.users.length;
            if (metaEl) {
                metaEl.textContent = count === 0
                    ? 'No pending teacher accounts found.'
                    : `${count} teacher account${count !== 1 ? 's' : ''} awaiting verification.`;
            }

            // Update sidebar badge
            const badge = document.getElementById('verificationNavBadge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-flex' : 'none';
            }

            renderPendingTeachers();
        } catch (err) {
            console.error('Verification load error:', err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="no-data">${escapeHtml(err.message || 'Failed to load pending teachers.')}</td></tr>`;
            }
        }
    }

    function renderPendingTeachers() {
        const tbody = document.getElementById('verificationResults');
        if (!tbody) return;

        if (state.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No pending teacher accounts.</td></tr>';
            return;
        }

        tbody.innerHTML = state.users.map((user) => {
            const name = escapeHtml(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed');
            const email = escapeHtml(user.emaildb || 'N/A');
            const idNo = escapeHtml(user.studentIDNumber || 'N/A');
            const uploadedAt = user.verificationDocUploadedAt
                ? escapeHtml(new Date(user.verificationDocUploadedAt).toLocaleString())
                : '<span class="vf-no-doc-badge">Not uploaded</span>';
            const hasDoc = Boolean(user.verificationDocKey);
            const uid = escapeHtml(user._id || '');

            const docCell = hasDoc
                ? `<button class="vf-view-doc-btn" data-user-id="${uid}" type="button">View Doc</button>`
                : '<span class="vf-no-doc-badge">No doc</span>';

            return `
                <tr>
                    <td>${name}</td>
                    <td>${email}</td>
                    <td>${idNo}</td>
                    <td>${uploadedAt}</td>
                    <td>${docCell}</td>
                    <td class="vf-action-cell">
                        <button class="vf-approve-btn" data-user-id="${uid}" type="button">Approve</button>
                        <button class="vf-reject-btn" data-user-id="${uid}" type="button">Reject</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.vf-view-doc-btn').forEach((btn) => {
            btn.addEventListener('click', () => viewDoc(btn.dataset.userId));
        });
        tbody.querySelectorAll('.vf-approve-btn').forEach((btn) => {
            btn.addEventListener('click', () => openVerifyModal(btn.dataset.userId, 'approve'));
        });
        tbody.querySelectorAll('.vf-reject-btn').forEach((btn) => {
            btn.addEventListener('click', () => openVerifyModal(btn.dataset.userId, 'reject'));
        });
    }

    async function viewDoc(userId) {
        try {
            const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/verification-doc`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Could not get document URL.');
            window.open(data.url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            global.adminDashboardPanels?.showFlash(err.message || 'Failed to open document.', 'error');
        }
    }

    function openVerifyModal(userId, action) {
        const user = state.users.find((u) => u._id === userId);
        if (!user) return;

        state.selectedUser = user;
        state.pendingAction = action;

        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed User';
        const summary = document.getElementById('teacherVerifySummary');
        const actionLabel = document.getElementById('teacherVerifyActionLabel');
        const passwordInput = document.getElementById('teacherVerifyPassword');

        if (summary) {
            summary.textContent = `${name} (${user.studentIDNumber || 'N/A'}) — ${user.emaildb || ''}`;
        }
        if (actionLabel) {
            if (action === 'approve') {
                actionLabel.textContent = 'Approve — change role to teacher';
                actionLabel.className = 'vf-action-label vf-action-approve';
            } else {
                actionLabel.textContent = 'Reject — change role to student';
                actionLabel.className = 'vf-action-label vf-action-reject';
            }
        }
        if (passwordInput) passwordInput.value = '';

        setVerifyModalStatus('', false);

        const modal = document.getElementById('teacherVerifyModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    function closeVerifyModal() {
        state.selectedUser = null;
        state.pendingAction = null;

        const modal = document.getElementById('teacherVerifyModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }

        const passwordInput = document.getElementById('teacherVerifyPassword');
        if (passwordInput) passwordInput.value = '';

        setVerifyModalStatus('', false);
    }

    async function handleVerifyAction(event) {
        event.preventDefault();

        if (!state.selectedUser || !state.pendingAction) return;

        const password = document.getElementById('teacherVerifyPassword')?.value;
        if (!password || !password.trim()) {
            setVerifyModalStatus('Admin password is required.', true);
            return;
        }

        const newRole = state.pendingAction === 'approve' ? 'teacher' : 'student';
        setVerifyModalStatus('Updating...', false);

        try {
            const res = await fetch(`/api/admin/users/${encodeURIComponent(state.selectedUser._id)}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                credentials: 'include',
                body: JSON.stringify({ role: newRole, adminPassword: password })
            });
            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update role.');

            const actionWord = state.pendingAction === 'approve' ? 'approved' : 'rejected';
            global.adminDashboardPanels?.showFlash(`Teacher account ${actionWord} successfully.`, 'success');
            closeVerifyModal();
            loadPendingTeachers();
        } catch (err) {
            setVerifyModalStatus(err.message || 'Action failed. Please try again.', true);
        }
    }

    function setVerifyModalStatus(message, isError) {
        const status = document.getElementById('teacherVerifyModalStatus');
        if (!status) return;
        status.textContent = message || '';
        status.style.color = isError ? '#991b1b' : '#166534';
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    global.adminDashboardVerification = { init, loadPendingTeachers };
})(window);
