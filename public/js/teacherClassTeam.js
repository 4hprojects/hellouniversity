(function attachTeacherClassTeam(global) {
    const state = {
        classItem: null,
        team: [],
        canManage: false,
        previewItems: [],
        addableMemberIds: []
    };

    function init() {
        document.getElementById('teacherTeamOpenModalButton')?.addEventListener('click', openModal);
        document.getElementById('teacherTeamCloseModalButton')?.addEventListener('click', closeModal);
        document.getElementById('teacherTeamPreviewButton')?.addEventListener('click', previewTeachers);
        document.getElementById('teacherTeamConfirmAddButton')?.addEventListener('click', confirmAddTeachers);
        document.getElementById('teacherTeamModal')?.addEventListener('click', handleModalClick);
        document.addEventListener('keydown', handleKeydown);
        loadTeachingTeam();
    }

    function getClassId() {
        return document.body?.dataset?.classId || '';
    }

    async function loadTeachingTeam() {
        setStatus('Loading teaching team...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/team`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load teaching team.');
            }

            state.classItem = data.classItem || null;
            state.team = Array.isArray(data.team) ? data.team : [];
            state.canManage = Boolean(data.canManage);

            renderClassMeta();
            renderTeam();
            setStatus(state.canManage
                ? `${state.team.length} active teaching team member(s).`
                : `${state.team.length} active teaching team member(s). Owner access is required to manage roles.`);
        } catch (error) {
            console.error('Teacher class team load failed:', error);
            state.classItem = null;
            state.team = [];
            state.canManage = false;
            renderClassMeta();
            renderTeam();
            setStatus(error.message || 'Unable to load teaching team.');
        }
    }

    function renderClassMeta() {
        setText('teacherTeamTitle', `${state.classItem?.className || 'Class'} Teaching Team`);
        setText('teacherTeamCount', String(state.team.length));
        setText('teacherTeamClassCode', state.classItem?.classCode || '-');
        setText('teacherTeamOwnerName', state.classItem?.ownerName || '-');

        const openButton = document.getElementById('teacherTeamOpenModalButton');
        if (openButton) {
            openButton.hidden = !state.canManage;
            openButton.disabled = !state.canManage;
        }
    }

    function renderTeam() {
        const tbody = document.getElementById('teacherTeamTableBody');
        if (!tbody) return;

        if (state.team.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="teacher-meta">No teaching team members assigned yet.</td></tr>';
            return;
        }

        tbody.innerHTML = state.team.map((member) => `
            <tr>
                <td>${escapeHtml(member.name || 'Teacher')}</td>
                <td>${escapeHtml(member.studentIDNumber || 'N/A')}</td>
                <td>${escapeHtml(member.emaildb || 'N/A')}</td>
                <td>${renderRoleCell(member)}</td>
                <td><span class="teacher-badge ${member.status === 'active' ? 'teacher-badge-live' : 'teacher-badge-muted'}">${escapeHtml(formatStatus(member.status))}</span></td>
                <td>${renderActionCell(member)}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-role-user-id]').forEach((select) => {
            select.addEventListener('change', () => updateRole(select.dataset.roleUserId, select.value));
        });

        tbody.querySelectorAll('[data-remove-user-id]').forEach((button) => {
            button.addEventListener('click', () => removeMember(button.dataset.removeUserId));
        });
    }

    function renderRoleCell(member) {
        if (!state.canManage || member.role === 'owner') {
            return escapeHtml(formatRole(member.role));
        }

        return `
            <select class="teacher-select teacher-select-compact" data-role-user-id="${escapeHtml(member.userId || '')}">
                ${['co_teacher', 'teaching_assistant', 'viewer'].map((role) => `
                    <option value="${role}"${member.role === role ? ' selected' : ''}>${escapeHtml(formatRole(role))}</option>
                `).join('')}
            </select>
        `;
    }

    function renderActionCell(member) {
        if (!state.canManage || member.role === 'owner') {
            return '<span class="teacher-meta">-</span>';
        }

        return `<button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-remove-user-id="${escapeHtml(member.userId || '')}">Remove</button>`;
    }

    function openModal() {
        if (!state.canManage) return;

        const modal = document.getElementById('teacherTeamModal');
        if (!modal) return;

        modal.hidden = false;
        document.body.classList.add('teacher-modal-open');
        document.getElementById('teacherTeamIdentifiersInput')?.focus();
    }

    function closeModal() {
        const modal = document.getElementById('teacherTeamModal');
        if (!modal) return;

        modal.hidden = true;
        document.body.classList.remove('teacher-modal-open');
    }

    function handleModalClick(event) {
        if (event.target?.dataset?.closeTeamModal === 'true') {
            closeModal();
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Escape' && !document.getElementById('teacherTeamModal')?.hidden) {
            closeModal();
        }
    }

    function parseIdentifiers() {
        const raw = document.getElementById('teacherTeamIdentifiersInput')?.value?.trim() || '';
        if (!raw) {
            setPreviewStatus('Enter at least one teacher ID or email.');
            return [];
        }

        return raw
            .split(/[\n,]+/)
            .map((value) => value.trim())
            .filter(Boolean);
    }

    async function previewTeachers() {
        const identifiers = parseIdentifiers();
        if (identifiers.length === 0) {
            state.previewItems = [];
            state.addableMemberIds = [];
            renderPreview();
            return;
        }

        setPreviewStatus('Checking teacher accounts...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/team/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ identifiers })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to preview teachers.');
            }

            state.previewItems = Array.isArray(data.previewItems) ? data.previewItems : [];
            state.addableMemberIds = Array.isArray(data.addableMemberIds) ? data.addableMemberIds : [];
            renderPreview(data.summary || null);
            setPreviewStatus(buildPreviewMessage(data.summary || null));
        } catch (error) {
            console.error('Teacher class team preview failed:', error);
            state.previewItems = [];
            state.addableMemberIds = [];
            renderPreview();
            setPreviewStatus(error.message || 'Unable to preview teachers.');
        }
    }

    async function confirmAddTeachers() {
        if (state.addableMemberIds.length === 0) {
            setPreviewStatus('Preview at least one valid teacher before adding.');
            return;
        }

        const role = document.getElementById('teacherTeamRoleSelect')?.value || 'co_teacher';
        setPreviewStatus('Adding selected teachers...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/team`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    memberIds: state.addableMemberIds,
                    role
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to add teaching team members.');
            }

            const input = document.getElementById('teacherTeamIdentifiersInput');
            if (input) input.value = '';
            state.previewItems = [];
            state.addableMemberIds = [];
            renderPreview();
            closeModal();
            setStatus(data.message || 'Teaching team updated successfully.');
            await loadTeachingTeam();
        } catch (error) {
            console.error('Teacher class team add failed:', error);
            setPreviewStatus(error.message || 'Unable to add teaching team members.');
        }
    }

    async function updateRole(userId, role) {
        setStatus(`Updating role for team member...`);

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/team/${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update teaching team role.');
            }

            await loadTeachingTeam();
        } catch (error) {
            console.error('Teacher class team role update failed:', error);
            setStatus(error.message || 'Unable to update teaching team role.');
            await loadTeachingTeam();
        }
    }

    async function removeMember(userId) {
        setStatus('Removing teaching team member...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/team/${encodeURIComponent(userId)}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to remove teaching team member.');
            }

            await loadTeachingTeam();
        } catch (error) {
            console.error('Teacher class team remove failed:', error);
            setStatus(error.message || 'Unable to remove teaching team member.');
        }
    }

    function renderPreview(summary) {
        const tbody = document.getElementById('teacherTeamPreviewTableBody');
        const confirmButton = document.getElementById('teacherTeamConfirmAddButton');
        if (!tbody) return;

        const defaultSummary = summary || {
            ready: 0,
            already_member: 0,
            invalid: 0,
            not_found: 0,
            not_teacher: 0
        };

        setText('teacherTeamPreviewReadyCount', String(defaultSummary.ready || 0));
        setText('teacherTeamPreviewExistingCount', String(defaultSummary.already_member || 0));
        setText(
            'teacherTeamPreviewRejectedCount',
            String((defaultSummary.invalid || 0) + (defaultSummary.not_found || 0) + (defaultSummary.not_teacher || 0))
        );

        if (confirmButton) {
            confirmButton.disabled = state.addableMemberIds.length === 0;
        }

        if (state.previewItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="teacher-meta">No preview yet.</td></tr>';
            return;
        }

        tbody.innerHTML = state.previewItems.map((item) => `
            <tr>
                <td>${escapeHtml(item.identifier || item.studentIDNumber || 'N/A')}</td>
                <td>${escapeHtml(item.name || 'N/A')}</td>
                <td>${escapeHtml(item.emaildb || 'N/A')}</td>
                <td><span class="teacher-badge ${previewStatusBadgeClass(item.status)}">${escapeHtml(item.label || 'Pending')}</span></td>
            </tr>
        `).join('');
    }

    function buildPreviewMessage(summary) {
        if (!summary) {
            return 'Preview loaded.';
        }

        if (summary.ready > 0) {
            return `${summary.ready} teacher account(s) are ready to add. Review the preview below before confirming.`;
        }

        return 'No new teacher accounts are ready to add. Review the preview results below.';
    }

    function formatRole(role) {
        switch (role) {
        case 'owner':
            return 'Owner';
        case 'co_teacher':
            return 'Co-Teacher';
        case 'teaching_assistant':
            return 'Teaching Assistant';
        case 'viewer':
            return 'Viewer';
        default:
            return 'Member';
        }
    }

    function formatStatus(status) {
        if (status === 'active') {
            return 'Active';
        }
        return 'Inactive';
    }

    function previewStatusBadgeClass(status) {
        switch (status) {
        case 'ready':
            return 'teacher-badge-live';
        case 'already_member':
            return 'teacher-badge-soft';
        case 'invalid':
        case 'not_found':
        case 'not_teacher':
            return 'teacher-badge-muted';
        default:
            return 'teacher-badge-muted';
        }
    }

    function setStatus(message) {
        setText('teacherTeamStatusLine', message);
    }

    function setPreviewStatus(message) {
        setText('teacherTeamPreviewStatus', message);
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    document.addEventListener('DOMContentLoaded', init);
    global.teacherClassTeam = { init };
})(window);
