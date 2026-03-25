(function attachTeacherClassSettings(global) {
    const ARCHIVE_REASONS = [
        ['term_completed', 'Term completed'],
        ['class_merged', 'Class merged'],
        ['schedule_replaced', 'Schedule replaced'],
        ['duplicate_or_error', 'Duplicate or setup error'],
        ['draft_not_used', 'Draft not used'],
        ['other', 'Other']
    ];
    const RESTORE_REASONS = [
        ['class_active_again', 'Class active again'],
        ['archived_by_mistake', 'Archived by mistake'],
        ['term_reopened', 'Term reopened'],
        ['students_need_access', 'Students need access'],
        ['content_still_needed', 'Content still needed'],
        ['other', 'Other']
    ];

    const state = {
        classItem: null,
        settings: null,
        permissions: null,
        isSaving: false,
        isRegeneratingCode: false,
        isUpdatingLifecycle: false
    };

    function getClassId() {
        return document.body?.dataset?.classId || '';
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const node = byId(id);
        if (node) {
            node.textContent = value;
        }
    }

    function normalizeStatus(value) {
        const normalized = String(value || 'active').trim().toLowerCase();
        if (normalized === 'draft' || normalized === 'archived') {
            return normalized;
        }
        return 'active';
    }

    function badgeClassForStatus(status) {
        if (status === 'draft') return 'teacher-badge-draft';
        if (status === 'archived') return 'teacher-badge-muted';
        return 'teacher-badge-live';
    }

    function formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    function init() {
        byId('teacherClassSettingsForm')?.addEventListener('submit', handleSaveSettings);
        byId('teacherClassSettingsRegenerateButton')?.addEventListener('click', handleRegenerateJoinCode);
        byId('teacherClassSettingsLifecycleForm')?.addEventListener('submit', handleLifecycleSubmit);
        byId('teacherClassSettingsLifecycleReason')?.addEventListener('change', handleLifecycleReasonChange);
        loadSettings();
    }

    function setActionDisabled(id, disabled) {
        const node = byId(id);
        if (node) {
            node.disabled = disabled;
        }
    }

    async function loadSettings() {
        setText('teacherClassSettingsStatus', 'Loading settings...');
        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/settings`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load class settings.');
            }

            state.classItem = data.classItem || null;
            state.settings = data.settings || null;
            state.permissions = data.permissions || null;
            render();
            setText('teacherClassSettingsStatus', 'Settings loaded.');
        } catch (error) {
            console.error('Teacher class settings load failed:', error);
            setText('teacherClassSettingsStatus', error.message || 'Unable to load settings.');
        }
    }

    function render() {
        if (!state.classItem || !state.settings) {
            return;
        }

        const status = normalizeStatus(state.classItem.status);
        setText('teacherClassSettingsTitle', `${state.classItem.className || 'Class'} Settings`);
        setText('teacherClassSettingsStatusText', formatStatus(status));
        setText('teacherClassSettingsClassCode', state.classItem.classCode || '-');
        setText('teacherClassSettingsCodeBadge', state.classItem.classCode || 'Class code unavailable');
        setText('teacherClassSettingsStatusBadge', formatStatus(status));
        const statusBadge = byId('teacherClassSettingsStatusBadge');
        if (statusBadge) {
            statusBadge.className = `teacher-badge ${badgeClassForStatus(status)}`;
        }

        const enrollment = byId('teacherClassSettingsEnrollment');
        const discussion = byId('teacherClassSettingsDiscussion');
        const latePolicy = byId('teacherClassSettingsLatePolicy');
        const gradeVisibility = byId('teacherClassSettingsGradeVisibility');
        if (enrollment) enrollment.checked = state.settings.selfEnrollmentEnabled !== false;
        if (discussion) discussion.checked = state.settings.discussionEnabled !== false;
        if (latePolicy) latePolicy.value = state.settings.lateSubmissionPolicy || 'allow';
        if (gradeVisibility) gradeVisibility.value = state.settings.gradeVisibility || 'after_review';

        updateAccessControls();
        renderLifecycleOptions(status);
    }

    function renderLifecycleOptions(status) {
        const select = byId('teacherClassSettingsLifecycleReason');
        const button = byId('teacherClassSettingsLifecycleButton');
        const otherInput = byId('teacherClassSettingsLifecycleOther');
        if (!select || !button) {
            return;
        }

        const options = status === 'archived' ? RESTORE_REASONS : ARCHIVE_REASONS;
        select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
        button.textContent = status === 'archived' ? 'Restore Class' : 'Archive Class';
        if (otherInput) {
            otherInput.value = '';
        }
        handleLifecycleReasonChange();
    }

    function handleLifecycleReasonChange() {
        const wrap = byId('teacherClassSettingsLifecycleOtherWrap');
        const select = byId('teacherClassSettingsLifecycleReason');
        if (wrap) {
            wrap.hidden = (select?.value || '') !== 'other';
        }
    }

    function updateAccessControls() {
        const canUpdateSettings = Boolean(state.permissions?.canUpdateSettings);
        const canRegenerateJoinCode = Boolean(state.permissions?.canRegenerateJoinCode);
        const canManageLifecycle = Boolean(state.permissions?.canManageLifecycle);

        byId('teacherClassSettingsForm')?.querySelectorAll('input, select, button').forEach((node) => {
            node.disabled = !canUpdateSettings;
        });
        setActionDisabled('teacherClassSettingsRegenerateButton', !canRegenerateJoinCode || state.isRegeneratingCode);
        byId('teacherClassSettingsLifecycleForm')?.querySelectorAll('input, select, button').forEach((node) => {
            node.disabled = !canManageLifecycle || state.isUpdatingLifecycle;
        });

        if (!canUpdateSettings) {
            setText('teacherClassSettingsStatus', 'Read-only settings access for your class role.');
        }
        if (!canRegenerateJoinCode) {
            setText('teacherClassSettingsJoinCodeStatus', 'Join-code changes are restricted for your class role.');
        }
        if (!canManageLifecycle) {
            setText('teacherClassSettingsLifecycleStatus', 'Lifecycle controls are restricted for your class role.');
        }
    }

    async function handleSaveSettings(event) {
        event.preventDefault();
        if (state.isSaving || !state.permissions?.canUpdateSettings) {
            return;
        }

        state.isSaving = true;
        setText('teacherClassSettingsStatus', 'Saving settings...');
        const submitButton = event.target.querySelector('[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        try {
            const payload = {
                selfEnrollmentEnabled: byId('teacherClassSettingsEnrollment')?.checked || false,
                discussionEnabled: byId('teacherClassSettingsDiscussion')?.checked || false,
                lateSubmissionPolicy: byId('teacherClassSettingsLatePolicy')?.value || 'allow',
                gradeVisibility: byId('teacherClassSettingsGradeVisibility')?.value || 'after_review'
            };
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to save settings.');
            }

            state.settings = data.settings || payload;
            render();
            setText('teacherClassSettingsStatus', 'Settings saved.');
        } catch (error) {
            console.error('Teacher class settings save failed:', error);
            setText('teacherClassSettingsStatus', error.message || 'Unable to save settings.');
        } finally {
            state.isSaving = false;
            if (submitButton) submitButton.disabled = false;
        }
    }

    async function handleRegenerateJoinCode() {
        if (state.isRegeneratingCode || !state.permissions?.canRegenerateJoinCode) {
            return;
        }

        state.isRegeneratingCode = true;
        setActionDisabled('teacherClassSettingsRegenerateButton', true);
        setText('teacherClassSettingsJoinCodeStatus', 'Regenerating join code...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/generate-join-code`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to regenerate join code.');
            }

            if (state.classItem) {
                state.classItem.classCode = data.classCode || '';
            }
            render();
            setText('teacherClassSettingsJoinCodeStatus', 'Join code regenerated.');
        } catch (error) {
            console.error('Teacher class join code regeneration failed:', error);
            setText('teacherClassSettingsJoinCodeStatus', error.message || 'Unable to regenerate join code.');
        } finally {
            state.isRegeneratingCode = false;
            setActionDisabled('teacherClassSettingsRegenerateButton', false);
        }
    }

    async function handleLifecycleSubmit(event) {
        event.preventDefault();
        if (state.isUpdatingLifecycle || !state.permissions?.canManageLifecycle) {
            return;
        }

        const classStatus = normalizeStatus(state.classItem?.status);
        const reason = byId('teacherClassSettingsLifecycleReason')?.value || '';
        const reasonOther = String(byId('teacherClassSettingsLifecycleOther')?.value || '').trim();
        state.isUpdatingLifecycle = true;
        setActionDisabled('teacherClassSettingsLifecycleButton', true);
        setText('teacherClassSettingsLifecycleStatus', classStatus === 'archived' ? 'Restoring class...' : 'Archiving class...');

        try {
            const action = classStatus === 'archived' ? 'restore' : 'archive';
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    reason,
                    reasonOther
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update class status.');
            }

            if (state.classItem) {
                state.classItem.status = classStatus === 'archived' ? 'active' : 'archived';
            }
            render();
            setText('teacherClassSettingsLifecycleStatus', data.message || 'Class status updated.');
        } catch (error) {
            console.error('Teacher class lifecycle update failed:', error);
            setText('teacherClassSettingsLifecycleStatus', error.message || 'Unable to update class status.');
        } finally {
            state.isUpdatingLifecycle = false;
            setActionDisabled('teacherClassSettingsLifecycleButton', false);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
}(window));
