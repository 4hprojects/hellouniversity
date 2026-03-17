(function attachTeacherClassesDashboard(global) {
    const state = {
        classes: [],
        pendingArchiveClassId: '',
        pendingRestoreClassId: '',
        searchTimer: null,
        requestId: 0,
        sidebarPreference: null
    };

    const selectors = {
        layout: 'classMgmtLayout',
        sidebar: 'classMgmtSidebar',
        sidebarToggle: 'classMgmtSidebarToggle',
        sidebarToggleIcon: 'classMgmtSidebarToggleIcon',
        handledList: 'classMgmtHandledList',
        handledCount: 'classMgmtHandledCount',
        archivedList: 'classMgmtArchivedList',
        archivedListCount: 'classMgmtArchivedListCount',
        searchInput: 'classMgmtSearchInput',
        statusFilter: 'classMgmtStatusFilter',
        refreshButton: 'classMgmtRefreshButton',
        statusLine: 'classMgmtStatusLine',
        cardList: 'classMgmtCardList',
        totalCount: 'classMgmtTotalCount',
        activeCount: 'classMgmtActiveCount',
        draftCount: 'classMgmtDraftCount',
        archivedCount: 'classMgmtArchivedCount'
    };

    function init() {
        attachSidebarToggle();
        updateAdaptiveSidebarMode();
        window.addEventListener('resize', updateAdaptiveSidebarMode);
        document.getElementById(selectors.searchInput)?.addEventListener('input', handleSearchInput);
        document.getElementById(selectors.statusFilter)?.addEventListener('change', loadClasses);
        document.getElementById(selectors.refreshButton)?.addEventListener('click', loadClasses);
        document.getElementById('classArchiveCloseButton')?.addEventListener('click', closeArchiveModal);
        document.getElementById('classArchiveCancelButton')?.addEventListener('click', closeArchiveModal);
        document.getElementById('classArchiveConfirmButton')?.addEventListener('click', confirmArchive);
        document.getElementById('classArchiveReasonSelect')?.addEventListener('change', handleArchiveReasonChange);
        document.getElementById('classArchiveModal')?.addEventListener('click', handleArchiveModalClick);
        document.getElementById('classRestoreCloseButton')?.addEventListener('click', closeRestoreModal);
        document.getElementById('classRestoreCancelButton')?.addEventListener('click', closeRestoreModal);
        document.getElementById('classRestoreConfirmButton')?.addEventListener('click', confirmRestore);
        document.getElementById('classRestoreReasonSelect')?.addEventListener('change', handleRestoreReasonChange);
        document.getElementById('classRestoreModal')?.addEventListener('click', handleRestoreModalClick);
        document.addEventListener('keydown', handleKeydown);
        loadClasses();
    }

    async function loadClasses() {
        const requestId = ++state.requestId;
        setText(selectors.statusLine, 'Loading classrooms...');

        try {
            const params = new URLSearchParams();
            const status = document.getElementById(selectors.statusFilter)?.value || '';
            const query = (document.getElementById(selectors.searchInput)?.value || '').trim();
            if (status) {
                params.set('status', status);
            }
            if (query) {
                params.set('query', query);
            }

            const response = await fetch(`/api/teacher/classes${params.toString() ? `?${params.toString()}` : ''}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load classes.');
            }

            if (requestId !== state.requestId) {
                return;
            }

            state.classes = Array.isArray(data.classes) ? data.classes : [];
            updateSummary(state.classes);
            render();
        } catch (error) {
            console.error('Teacher class dashboard load failed:', error);
            if (requestId !== state.requestId) {
                return;
            }
            state.classes = [];
            updateSummary([]);
            renderSidebar([]);
            renderCards([]);
            setText(selectors.statusLine, 'Unable to load classrooms right now.');
        }
    }

    function render() {
        renderSidebar(state.classes);
        renderCards(state.classes);
        setText(selectors.statusLine, buildStatusLine(state.classes));
    }

    function renderSidebar(classes) {
        const handledContainer = document.getElementById(selectors.handledList);
        const archivedContainer = document.getElementById(selectors.archivedList);
        if (!handledContainer || !archivedContainer) {
            return;
        }

        const handledClasses = sortHandledClasses(classes.filter((classItem) => normalizeStatus(classItem.status) !== 'archived'));
        const archivedClasses = sortArchivedClasses(classes.filter((classItem) => normalizeStatus(classItem.status) === 'archived'));

        setText(selectors.handledCount, String(handledClasses.length));
        setText(selectors.archivedListCount, String(archivedClasses.length));

        handledContainer.innerHTML = handledClasses.length
            ? handledClasses.map((classItem) => renderSidebarItem(classItem, false)).join('')
            : '<p class="teacher-empty-state teacher-empty-state-tight">No active or draft classes match the current filters.</p>';

        archivedContainer.innerHTML = archivedClasses.length
            ? archivedClasses.map((classItem) => renderSidebarItem(classItem, true)).join('')
            : '<p class="teacher-empty-state teacher-empty-state-tight">No archived classes match the current filters.</p>';
    }

    function renderCards(classes) {
        const container = document.getElementById(selectors.cardList);
        if (!container) {
            return;
        }

        const handledClasses = sortHandledClasses(classes.filter((classItem) => normalizeStatus(classItem.status) !== 'archived'));
        const archivedClasses = sortArchivedClasses(classes.filter((classItem) => normalizeStatus(classItem.status) === 'archived'));

        container.innerHTML = [
            renderCardSection({
                eyebrow: 'Teaching Now',
                title: 'Current classrooms',
                copy: 'Active and draft sections stay front and center for everyday teaching.',
                classes: handledClasses,
                emptyText: 'No active or draft classes match the current filters.',
                archived: false
            }),
            renderCardSection({
                eyebrow: 'Archive',
                title: 'Archived classrooms',
                copy: 'Past terms stay preserved here without crowding the teaching board.',
                classes: archivedClasses,
                emptyText: 'No archived classes match the current filters.',
                archived: true
            })
        ].join('');

        container.querySelectorAll('[data-action]').forEach((button) => {
            button.addEventListener('click', () => handleAction(button.dataset.classId, button.dataset.action));
        });
    }

    function renderCardSection(config) {
        const sectionClass = config.archived
            ? 'teacher-classroom-section teacher-classroom-section-archived'
            : 'teacher-classroom-section';
        const badgeClass = config.archived ? 'teacher-badge-muted' : 'teacher-badge-soft';
        const gridClass = config.archived
            ? 'teacher-classroom-card-grid teacher-classroom-card-grid-archived'
            : 'teacher-classroom-card-grid';
        const cardsMarkup = config.classes.length
            ? config.classes.map((classItem, index) => renderClassroomCard(classItem, index, config.archived)).join('')
            : `<article class="teacher-empty-state teacher-classroom-empty">${escapeHtml(config.emptyText)}</article>`;

        return `
            <section class="${sectionClass}">
                <div class="teacher-classroom-section-header">
                    <div>
                        <p class="teacher-eyebrow">${escapeHtml(config.eyebrow)}</p>
                        <h2>${escapeHtml(config.title)}</h2>
                        <p class="teacher-meta">${escapeHtml(config.copy)}</p>
                    </div>
                    <span class="teacher-badge ${badgeClass}">${config.classes.length}</span>
                </div>
                <div class="${gridClass}">
                    ${cardsMarkup}
                </div>
            </section>
        `;
    }

    function renderClassroomCard(classItem, index, isArchived) {
        const status = normalizeStatus(classItem.status);
        const badgeClass = status === 'active'
            ? 'teacher-badge-live'
            : status === 'draft'
                ? 'teacher-badge-draft'
                : 'teacher-badge-muted';
        const classId = escapeHtml(classItem._id);
        const archiveAction = status === 'archived' ? 'restore' : 'archive';
        const archiveLabel = status === 'archived' ? 'Restore class' : 'Archive class';
        const courseLabel = classItem.courseCode || 'Course';
        const title = classItem.className || 'Untitled Class';
        const subtitle = [classItem.section || 'Section not set', classItem.academicTerm || '']
            .filter(Boolean)
            .join(' | ');
        const chips = [];

        chips.push(`${Number(classItem.studentCount || 0)} student(s)`);
        if (Number(classItem.teamCount || 0) > 0) {
            chips.push(`${Number(classItem.teamCount || 0)} teacher(s)`);
        }
        if (classItem.scheduleDays || classItem.scheduleTime) {
            chips.push([classItem.scheduleDays || '', classItem.scheduleTime || ''].filter(Boolean).join(' | '));
        }
        if (classItem.room) {
            chips.push(`Room ${classItem.room}`);
        }

        const chipMarkup = chips
            .map((chip) => `<span class="teacher-classroom-fact-chip">${escapeHtml(chip)}</span>`)
            .join('');
        const classCodeMarkup = classItem.classCode
            ? `<span class="teacher-classroom-code">Join code ${escapeHtml(classItem.classCode)}</span>`
            : '<span class="teacher-classroom-code teacher-classroom-code-muted">Join code not available</span>';
        const themeClass = getThemeClass(classItem, index);
        const cardClass = isArchived
            ? `teacher-classroom-card teacher-classroom-card-archived ${themeClass}`
            : `teacher-classroom-card ${themeClass}`;

        return `
            <article class="${cardClass}">
                <div class="teacher-classroom-card-banner">
                    <div class="teacher-classroom-card-banner-top">
                        <span class="teacher-classroom-course">${escapeHtml(courseLabel)}</span>
                        <span class="teacher-badge ${badgeClass}">${escapeHtml(status)}</span>
                    </div>
                    <div class="teacher-classroom-card-banner-main">
                        <h3>${escapeHtml(title)}</h3>
                        <p>${escapeHtml(subtitle || 'Section details not set')}</p>
                    </div>
                    <div class="teacher-classroom-card-banner-bottom">
                        ${classCodeMarkup}
                    </div>
                </div>

                <div class="teacher-classroom-card-body">
                    <div class="teacher-classroom-facts">
                        ${chipMarkup}
                    </div>
                </div>

                <div class="teacher-classroom-card-footer">
                    <div class="teacher-classroom-card-primary">
                        <a href="/teacher/classes/${encodeURIComponent(classItem._id)}" class="teacher-btn ${isArchived ? 'teacher-btn-secondary' : 'teacher-btn-primary'} teacher-btn-small">Open Class</a>
                        <a href="/teacher/classes/${encodeURIComponent(classItem._id)}/students" class="teacher-classroom-inline-link">Students</a>
                        <a href="/teacher/classes/${encodeURIComponent(classItem._id)}/team" class="teacher-classroom-inline-link">Team</a>
                        <a href="/teacher/classes/${encodeURIComponent(classItem._id)}/edit" class="teacher-classroom-inline-link">Edit</a>
                    </div>
                    <div class="teacher-card-actions teacher-classroom-card-actions">
                        <button type="button" class="teacher-icon-btn" data-action="duplicate" data-class-id="${classId}" aria-label="Duplicate class" title="Duplicate class">
                            ${iconDuplicate()}
                        </button>
                        <button type="button" class="teacher-icon-btn" data-action="${archiveAction}" data-class-id="${classId}" aria-label="${archiveLabel}" title="${archiveLabel}">
                            ${status === 'archived' ? iconRestore() : iconArchive()}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    async function handleAction(classId, action) {
        const actionMap = {
            duplicate: { path: 'duplicate', message: 'Duplicating class...' }
        };
        if (action === 'archive') {
            openArchiveModal(classId);
            return;
        }
        if (action === 'restore') {
            openRestoreModal(classId);
            return;
        }

        const config = actionMap[action];
        if (!config) {
            return;
        }

        setText(selectors.statusLine, config.message);

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(classId)}/${config.path}`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || `Failed to ${action} class.`);
            }

            await loadClasses();
        } catch (error) {
            console.error(`Teacher class ${action} failed:`, error);
            setText(selectors.statusLine, error.message || `Unable to ${action} class.`);
        }
    }

    function updateSummary(classes) {
        const active = classes.filter((item) => normalizeStatus(item.status) === 'active').length;
        const draft = classes.filter((item) => normalizeStatus(item.status) === 'draft').length;
        const archived = classes.filter((item) => normalizeStatus(item.status) === 'archived').length;

        setText(selectors.totalCount, String(classes.length));
        setText(selectors.activeCount, String(active));
        setText(selectors.draftCount, String(draft));
        setText(selectors.archivedCount, String(archived));
    }

    function sortHandledClasses(classes) {
        const statusOrder = { active: 0, draft: 1 };
        return classes
            .slice()
            .sort((left, right) => {
                const leftStatus = normalizeStatus(left.status);
                const rightStatus = normalizeStatus(right.status);
                const statusCompare = (statusOrder[leftStatus] ?? 99) - (statusOrder[rightStatus] ?? 99);
                if (statusCompare !== 0) {
                    return statusCompare;
                }
                return toTimestamp(right.updatedAt || right.createdAt) - toTimestamp(left.updatedAt || left.createdAt);
            });
    }

    function sortArchivedClasses(classes) {
        return classes
            .slice()
            .sort((left, right) => toTimestamp(right.updatedAt || right.createdAt) - toTimestamp(left.updatedAt || left.createdAt));
    }

    function renderSidebarItem(classItem, isArchived) {
        const status = normalizeStatus(classItem.status);
        const badgeClass = status === 'active'
            ? 'teacher-badge-live'
            : status === 'draft'
                ? 'teacher-badge-draft'
                : 'teacher-badge-muted';
        const courseLine = [classItem.courseCode, classItem.section].filter(Boolean).join(' | ') || 'Course or section not set';
        const supportLine = classItem.classCode
            ? `Join code: ${escapeHtml(classItem.classCode)}`
            : `${Number(classItem.studentCount || 0)} student(s)`;

        return `
            <a href="/teacher/classes/${encodeURIComponent(classItem._id)}" class="teacher-class-sidebar-link${isArchived ? ' teacher-class-sidebar-link-archived' : ''}">
                <div class="teacher-class-sidebar-link-header">
                    <strong>${escapeHtml(classItem.className || 'Untitled Class')}</strong>
                    <span class="teacher-badge ${badgeClass}">${escapeHtml(status)}</span>
                </div>
                <p class="teacher-class-sidebar-link-meta">${escapeHtml(courseLine)}</p>
                <p class="teacher-class-sidebar-link-meta">${supportLine}</p>
            </a>
        `;
    }

    function buildStatusLine(classes) {
        const handledCount = classes.filter((item) => normalizeStatus(item.status) !== 'archived').length;
        const archivedCount = classes.filter((item) => normalizeStatus(item.status) === 'archived').length;

        if (!classes.length) {
            return 'No classrooms match the current filters.';
        }

        if (handledCount && archivedCount) {
            return `Showing ${handledCount} teaching classroom(s) and ${archivedCount} archived classroom(s).`;
        }

        if (handledCount) {
            return `Showing ${handledCount} teaching classroom(s).`;
        }

        return `Showing ${archivedCount} archived classroom(s).`;
    }

    function getThemeClass(classItem, index) {
        const themes = [
            'teacher-classroom-theme-emerald',
            'teacher-classroom-theme-lagoon',
            'teacher-classroom-theme-indigo',
            'teacher-classroom-theme-gold',
            'teacher-classroom-theme-coral',
            'teacher-classroom-theme-slate'
        ];
        const seedSource = String(classItem._id || classItem.classCode || classItem.className || index || '');
        let hash = 0;
        for (let seedIndex = 0; seedIndex < seedSource.length; seedIndex += 1) {
            hash = ((hash << 5) - hash) + seedSource.charCodeAt(seedIndex);
            hash |= 0;
        }
        return themes[Math.abs(hash) % themes.length];
    }

    function handleSearchInput() {
        if (state.searchTimer) {
            clearTimeout(state.searchTimer);
        }

        state.searchTimer = setTimeout(() => {
            loadClasses();
        }, 220);
    }

    function attachSidebarToggle() {
        const sidebar = document.getElementById(selectors.sidebar);
        const toggle = document.getElementById(selectors.sidebarToggle);
        if (!sidebar || !toggle) {
            return;
        }

        toggle.addEventListener('click', () => {
            const willCollapse = !sidebar.classList.contains('teacher-dashboard-sidebar-collapsed');
            state.sidebarPreference = willCollapse ? 'collapsed' : 'expanded';
            applySidebarState(willCollapse);
        });
    }

    function updateAdaptiveSidebarMode() {
        const layout = document.getElementById(selectors.layout);
        const sidebar = document.getElementById(selectors.sidebar);
        if (!layout || !sidebar) {
            return;
        }

        const layoutWidth = layout.clientWidth || 0;
        const isCompactViewport = window.innerWidth <= 980;
        const shouldAutoCollapse = !isCompactViewport && layoutWidth > 0 && layoutWidth < 1120;
        sidebar.classList.toggle('teacher-dashboard-sidebar-auto', shouldAutoCollapse);

        if (isCompactViewport) {
            const isCollapsed = state.sidebarPreference === 'expanded' ? false : true;
            applySidebarState(isCollapsed);
            return;
        }

        if (shouldAutoCollapse) {
            applySidebarState(true);
            return;
        }

        if (state.sidebarPreference === 'collapsed') {
            applySidebarState(true);
            return;
        }

        applySidebarState(false);
    }

    function applySidebarState(isCollapsed) {
        const sidebar = document.getElementById(selectors.sidebar);
        const toggle = document.getElementById(selectors.sidebarToggle);
        const icon = document.getElementById(selectors.sidebarToggleIcon);
        if (!sidebar || !toggle) {
            return;
        }

        sidebar.classList.toggle('teacher-dashboard-sidebar-collapsed', isCollapsed);
        toggle.setAttribute('aria-expanded', String(!isCollapsed));
        toggle.setAttribute('aria-label', isCollapsed ? 'Expand class navigator' : 'Collapse class navigator');
        toggle.setAttribute('title', isCollapsed ? 'Expand class navigator' : 'Collapse class navigator');
        if (icon) {
            icon.textContent = isCollapsed ? '\u2630' : '\u2190';
        }
    }

    function openArchiveModal(classId) {
        const classItem = state.classes.find((item) => String(item._id) === String(classId));
        if (!classItem) {
            setText(selectors.statusLine, 'Unable to find that class for archiving.');
            return;
        }

        state.pendingArchiveClassId = String(classId);
        setText('classArchiveModalCopy', `Choose a reason before archiving ${classItem.className || 'this class'}.`);
        const reasonSelect = document.getElementById('classArchiveReasonSelect');
        const otherInput = document.getElementById('classArchiveOtherInput');
        if (reasonSelect) {
            reasonSelect.value = '';
        }
        if (otherInput) {
            otherInput.value = '';
        }
        toggleArchiveOtherInput(false);
        setText('classArchiveModalStatus', 'Archiving will remove this class from the active teaching list until it is restored.');

        const modal = document.getElementById('classArchiveModal');
        if (modal) {
            modal.hidden = false;
            document.body.classList.add('teacher-modal-open');
        }
    }

    function closeArchiveModal() {
        state.pendingArchiveClassId = '';
        const modal = document.getElementById('classArchiveModal');
        if (modal) {
            modal.hidden = true;
            document.body.classList.remove('teacher-modal-open');
        }
    }

    function openRestoreModal(classId) {
        const classItem = state.classes.find((item) => String(item._id) === String(classId));
        if (!classItem) {
            setText(selectors.statusLine, 'Unable to find that class for restoring.');
            return;
        }

        state.pendingRestoreClassId = String(classId);
        setText('classRestoreModalCopy', `Choose a reason before restoring ${classItem.className || 'this class'}.`);
        const reasonSelect = document.getElementById('classRestoreReasonSelect');
        const otherInput = document.getElementById('classRestoreOtherInput');
        if (reasonSelect) {
            reasonSelect.value = '';
        }
        if (otherInput) {
            otherInput.value = '';
        }
        toggleRestoreOtherInput(false);
        setText('classRestoreModalStatus', 'Restoring will return this class to the active teaching list.');

        const modal = document.getElementById('classRestoreModal');
        if (modal) {
            modal.hidden = false;
            document.body.classList.add('teacher-modal-open');
        }
    }

    function closeRestoreModal() {
        state.pendingRestoreClassId = '';
        const modal = document.getElementById('classRestoreModal');
        if (modal) {
            modal.hidden = true;
            document.body.classList.remove('teacher-modal-open');
        }
    }

    function handleArchiveReasonChange() {
        const reason = document.getElementById('classArchiveReasonSelect')?.value || '';
        toggleArchiveOtherInput(reason === 'other');
    }

    function toggleArchiveOtherInput(show) {
        const wrap = document.getElementById('classArchiveOtherWrap');
        if (wrap) {
            wrap.hidden = !show;
        }
    }

    function handleArchiveModalClick(event) {
        if (event.target?.dataset?.closeArchiveModal === 'true') {
            closeArchiveModal();
        }
    }

    function handleRestoreReasonChange() {
        const reason = document.getElementById('classRestoreReasonSelect')?.value || '';
        toggleRestoreOtherInput(reason === 'other');
    }

    function toggleRestoreOtherInput(show) {
        const wrap = document.getElementById('classRestoreOtherWrap');
        if (wrap) {
            wrap.hidden = !show;
        }
    }

    function handleRestoreModalClick(event) {
        if (event.target?.dataset?.closeRestoreModal === 'true') {
            closeRestoreModal();
        }
    }

    function handleKeydown(event) {
        if (event.key !== 'Escape') {
            return;
        }

        if (!document.getElementById('classArchiveModal')?.hidden) {
            closeArchiveModal();
        }
        if (!document.getElementById('classRestoreModal')?.hidden) {
            closeRestoreModal();
        }
    }

    async function confirmArchive() {
        if (!state.pendingArchiveClassId) {
            setText('classArchiveModalStatus', 'Select a class to archive first.');
            return;
        }

        const reason = document.getElementById('classArchiveReasonSelect')?.value || '';
        const reasonOther = (document.getElementById('classArchiveOtherInput')?.value || '').trim();
        if (!reason) {
            setText('classArchiveModalStatus', 'Select a reason before archiving the class.');
            return;
        }
        if (reason === 'other' && !reasonOther) {
            setText('classArchiveModalStatus', 'Enter the archive reason when selecting Other.');
            return;
        }

        setText('classArchiveModalStatus', 'Archiving class...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(state.pendingArchiveClassId)}/archive`, {
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
                throw new Error(data.message || 'Failed to archive class.');
            }

            closeArchiveModal();
            await loadClasses();
        } catch (error) {
            console.error('Teacher class archive failed:', error);
            setText('classArchiveModalStatus', error.message || 'Unable to archive class.');
        }
    }

    async function confirmRestore() {
        if (!state.pendingRestoreClassId) {
            setText('classRestoreModalStatus', 'Select a class to restore first.');
            return;
        }

        const reason = document.getElementById('classRestoreReasonSelect')?.value || '';
        const reasonOther = (document.getElementById('classRestoreOtherInput')?.value || '').trim();
        if (!reason) {
            setText('classRestoreModalStatus', 'Select a reason before restoring the class.');
            return;
        }
        if (reason === 'other' && !reasonOther) {
            setText('classRestoreModalStatus', 'Enter the restore reason when selecting Other.');
            return;
        }

        setText('classRestoreModalStatus', 'Restoring class...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(state.pendingRestoreClassId)}/restore`, {
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
                throw new Error(data.message || 'Failed to restore class.');
            }

            closeRestoreModal();
            await loadClasses();
        } catch (error) {
            console.error('Teacher class restore failed:', error);
            setText('classRestoreModalStatus', error.message || 'Unable to restore class.');
        }
    }

    function normalizeStatus(status) {
        return String(status || 'active').toLowerCase();
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function toTimestamp(value) {
        if (!value) {
            return 0;
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    }

    function iconDuplicate() {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M8 8h11v12H8V8Zm2 2v8h7v-8h-7ZM5 4h11v2H7v10H5V4Z"></path>
            </svg>
        `;
    }

    function iconArchive() {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 5h16l-1 4H5L4 5Zm2 6h12v8H6v-8Zm5 1v3H8l4 4 4-4h-3v-3h-2Z"></path>
            </svg>
        `;
    }

    function iconRestore() {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 5h16l-1 4H5L4 5Zm2 6h12v8H6v-8Zm5 6v-3H8l4-4 4 4h-3v3h-2Z"></path>
            </svg>
        `;
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
    global.teacherClassesDashboard = { init };
})(window);
