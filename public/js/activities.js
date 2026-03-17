(function attachStudentActivities(global) {
    const state = {
        studentId: '',
        studentName: 'Student',
        rows: [],
        classes: [],
        loadError: ''
    };

    const selectors = {
        page: 'activitiesPage',
        studentName: 'activitiesStudentName',
        studentIdLine: 'activitiesStudentIdLine',
        rolePill: 'activitiesRolePill',
        heroStatus: 'activitiesHeroStatus',
        totalCount: 'activitiesTotalCount',
        classCount: 'activitiesClassCount',
        submittedCount: 'activitiesSubmittedCount',
        overdueCount: 'activitiesOverdueCount',
        nextDue: 'activitiesNextDue',
        nextDueMeta: 'activitiesNextDueMeta',
        latestSubmission: 'activitiesLatestSubmission',
        latestSubmissionMeta: 'activitiesLatestSubmissionMeta',
        classSelect: 'activitiesClassSelect',
        statusSelect: 'activitiesStatusSelect',
        searchInput: 'activitiesSearchInput',
        clearFilters: 'activitiesClearFilters',
        resultsMeta: 'activitiesResultsMeta',
        sections: 'activitiesSections',
        emptyState: 'activitiesEmptyState',
        emptyStateIcon: 'activitiesEmptyStateIcon',
        emptyStateText: 'activitiesEmptyStateText',
        classList: 'activitiesClassList',
        classListCount: 'activitiesClassListCount'
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = byId(id);
        if (element) {
            element.textContent = value;
        }
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toTimestamp(value) {
        const timestamp = new Date(value || '').getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    function formatDateTime(value, fallback) {
        const timestamp = toTimestamp(value);
        if (!timestamp) {
            return fallback || 'N/A';
        }

        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(new Date(timestamp));
    }

    function formatScore(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return 'N/A';
        }

        return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
    }

    function setEmptyState(message, options = {}) {
        const emptyState = byId(selectors.emptyState);
        const emptyStateIcon = byId(selectors.emptyStateIcon);
        const emptyStateText = byId(selectors.emptyStateText);

        if (!emptyState) {
            return;
        }

        emptyState.classList.toggle('activities-empty-state-error', options.variant === 'error');

        if (emptyStateIcon) {
            emptyStateIcon.textContent = options.icon || 'assignment_late';
        }

        if (emptyStateText) {
            emptyStateText.textContent = message;
        }

        emptyState.hidden = false;
    }

    function hideEmptyState() {
        const emptyState = byId(selectors.emptyState);
        if (!emptyState) {
            return;
        }

        emptyState.hidden = true;
        emptyState.classList.remove('activities-empty-state-error');
    }

    function matchesStatusFilter(row, statusFilter) {
        if (statusFilter === 'all') {
            return true;
        }

        if (statusFilter === 'completed') {
            return row.category === 'submitted' || row.category === 'late';
        }

        return row.category === statusFilter;
    }

    function getVisibleRows() {
        const classFilter = String(byId(selectors.classSelect)?.value || 'all');
        const statusFilter = String(byId(selectors.statusSelect)?.value || 'all');
        const query = String(byId(selectors.searchInput)?.value || '').trim().toLowerCase();

        return state.rows.filter((row) => {
            if (classFilter !== 'all' && row.classId !== classFilter) {
                return false;
            }

            if (!matchesStatusFilter(row, statusFilter)) {
                return false;
            }

            if (!query) {
                return true;
            }

            const haystack = [
                row.classCode,
                row.className,
                row.quizTitle,
                row.quizDescription,
                row.status,
                row.category
            ].join(' ').toLowerCase();

            return haystack.includes(query);
        });
    }

    function updateSummary(rows) {
        const uniqueClasses = new Set(rows.map((row) => row.classId).filter(Boolean));
        const submittedCount = rows.filter((row) => row.category === 'submitted' || row.category === 'late').length;
        const overdueCount = rows.filter((row) => row.category === 'overdue').length;

        setText(selectors.totalCount, String(rows.length));
        setText(selectors.classCount, String(uniqueClasses.size));
        setText(selectors.submittedCount, String(submittedCount));
        setText(selectors.overdueCount, String(overdueCount));
    }

    function updateHighlights(rows) {
        const now = Date.now();
        const upcomingRows = rows
            .filter((row) => row.category !== 'submitted' && row.category !== 'late' && toTimestamp(row.dueDate) > now)
            .sort((left, right) => toTimestamp(left.dueDate) - toTimestamp(right.dueDate));
        const latestSubmissionRows = rows
            .filter((row) => (row.category === 'submitted' || row.category === 'late') && toTimestamp(row.latestAttemptAt) > 0)
            .sort((left, right) => toTimestamp(right.latestAttemptAt) - toTimestamp(left.latestAttemptAt));

        const nextDue = upcomingRows[0] || null;
        const latestSubmission = latestSubmissionRows[0] || null;

        setText(
            selectors.nextDue,
            nextDue ? `${nextDue.quizTitle} - ${formatDateTime(nextDue.dueDate, 'No due date')}` : 'No upcoming due activity'
        );
        setText(
            selectors.nextDueMeta,
            nextDue
                ? `${nextDue.classCode} - ${nextDue.className}`
                : 'The next visible due activity will appear here after load.'
        );

        setText(
            selectors.latestSubmission,
            latestSubmission ? `${latestSubmission.quizTitle} - ${formatDateTime(latestSubmission.latestAttemptAt, 'Recently submitted')}` : 'No submissions yet'
        );
        setText(
            selectors.latestSubmissionMeta,
            latestSubmission
                ? `${latestSubmission.status}${latestSubmission.finalScore !== null ? ` - Score ${formatScore(latestSubmission.finalScore)}` : ''}`
                : 'Your latest submitted activity will appear here after load.'
        );
    }

    function updateResultsMeta(rows) {
        const classFilter = String(byId(selectors.classSelect)?.value || 'all');
        const statusFilter = String(byId(selectors.statusSelect)?.value || 'all');
        const query = String(byId(selectors.searchInput)?.value || '').trim();

        if (!rows.length) {
            if (!state.rows.length) {
                setText(selectors.resultsMeta, 'No activities are assigned to you yet.');
                setText(selectors.heroStatus, 'No assigned activities were found for your account.');
            } else {
                setText(selectors.resultsMeta, 'No activities match the current filters.');
                setText(selectors.heroStatus, 'No matching activities in the current view.');
            }
            return;
        }

        if (classFilter === 'all' && statusFilter === 'all' && !query) {
            setText(selectors.resultsMeta, `Showing all ${rows.length} assigned activity item(s).`);
        } else {
            setText(selectors.resultsMeta, `Showing ${rows.length} filtered activity item(s).`);
        }

        setText(selectors.heroStatus, `${rows.length} activity item(s) currently visible.`);
    }

    function getStatusPillMarkup(row) {
        return `<span class="activity-status-pill activity-status-pill-${escapeHtml(row.category || 'available')}">${escapeHtml(row.status || 'Not Started')}</span>`;
    }

    function getActionMarkup(row) {
        if (row.category === 'scheduled' || !row.actionUrl) {
            return '<span class="student-btn student-btn-secondary activity-action-btn activity-action-btn-disabled" aria-disabled="true">Not Open Yet</span>';
        }

        const label = row.category === 'progress' ? 'Resume Quiz' : 'Open Quiz';
        return `
            <a href="${escapeHtml(row.actionUrl)}" class="student-btn student-btn-secondary activity-action-btn">
                <span class="material-icons" aria-hidden="true">launch</span>
                <span>${escapeHtml(label)}</span>
            </a>
        `;
    }

    function getActivityCardMarkup(row) {
        const attemptLabel = row.maxAttempts
            ? `${row.completedAttemptCount} of ${row.maxAttempts} completed`
            : `${row.attemptCount} attempt${row.attemptCount === 1 ? '' : 's'}`;

        return `
            <article class="activity-item-card">
                <div class="activity-item-main">
                    <div class="activity-item-header">
                        <div>
                            <strong>${escapeHtml(row.quizTitle || 'Untitled Quiz')}</strong>
                            <p class="student-meta">${escapeHtml(row.quizDescription || 'No description provided.')}</p>
                        </div>
                        ${getStatusPillMarkup(row)}
                    </div>

                    <dl class="activity-item-grid">
                        <div>
                            <dt>Due</dt>
                            <dd>${escapeHtml(formatDateTime(row.dueDate, 'No due date'))}</dd>
                        </div>
                        <div>
                            <dt>Start</dt>
                            <dd>${escapeHtml(formatDateTime(row.startDate, 'Available now'))}</dd>
                        </div>
                        <div>
                            <dt>Questions</dt>
                            <dd>${escapeHtml(String(row.questionCount || 0))}</dd>
                        </div>
                        <div>
                            <dt>Score</dt>
                            <dd>${escapeHtml(formatScore(row.finalScore))}</dd>
                        </div>
                    </dl>
                </div>

                <div class="activity-item-actions">
                    ${getActionMarkup(row)}
                    <p class="student-meta">
                        ${escapeHtml(attemptLabel)}
                        ${row.latestAttemptAt ? ` | Last activity ${escapeHtml(formatDateTime(row.latestAttemptAt, ''))}` : ''}
                    </p>
                </div>
            </article>
        `;
    }

    function renderSections(rows, emptyConfig = null) {
        const container = byId(selectors.sections);
        if (!container) {
            return;
        }

        if (!rows.length) {
            container.innerHTML = '';
            setEmptyState(
                emptyConfig?.message || 'No activities match the current filters.',
                emptyConfig || {}
            );
            return;
        }

        hideEmptyState();

        const groupedRows = new Map();
        rows.forEach((row) => {
            if (!groupedRows.has(row.classId)) {
                groupedRows.set(row.classId, []);
            }
            groupedRows.get(row.classId).push(row);
        });

        container.innerHTML = [...groupedRows.entries()].map(([classId, classRows]) => {
            const classInfo = state.classes.find((row) => row.classId === classId) || {
                classCode: classRows[0]?.classCode || 'Class',
                className: classRows[0]?.className || 'Class name unavailable',
                schedule: '',
                time: ''
            };
            const submittedCount = classRows.filter((row) => row.category === 'submitted' || row.category === 'late').length;
            const headerMeta = [classInfo.schedule, classInfo.time].filter(Boolean).join(' | ');

            return `
                <section class="activities-class-board">
                    <div class="activities-class-board-header">
                        <div>
                            <p class="student-eyebrow">Class</p>
                            <h3>${escapeHtml(classInfo.classCode)} - ${escapeHtml(classInfo.className)}</h3>
                            <p class="student-meta">${escapeHtml(headerMeta || `${classRows.length} activity item(s) loaded`)}</p>
                        </div>
                        <span class="student-badge student-badge-soft">${escapeHtml(String(submittedCount))} submitted</span>
                    </div>

                    <div class="activities-class-board-body">
                        ${classRows.map((row) => getActivityCardMarkup(row)).join('')}
                    </div>
                </section>
            `;
        }).join('');
    }

    function renderClassList() {
        const container = byId(selectors.classList);
        if (!container) {
            return;
        }

        if (!state.classes.length) {
            setText(selectors.classListCount, '0 classes');
            container.innerHTML = '<p class="student-empty-state">No classes with activities were found for your account.</p>';
            return;
        }

        setText(selectors.classListCount, `${state.classes.length} ${state.classes.length === 1 ? 'class' : 'classes'}`);
        container.innerHTML = state.classes.map((classRow) => `
            <article class="activities-class-card">
                <div class="activities-class-card-header">
                    <strong>${escapeHtml(classRow.classCode || 'Class')}</strong>
                    <span class="student-badge student-badge-soft">${escapeHtml(String(classRow.activityCount || 0))}</span>
                </div>
                <p class="student-meta">${escapeHtml(classRow.className || 'Class name unavailable')}</p>
            </article>
        `).join('');
    }

    function renderClassListError(message) {
        const container = byId(selectors.classList);
        if (!container) {
            return;
        }

        setText(selectors.classListCount, '0 classes');
        container.innerHTML = `<p class="student-empty-state">${escapeHtml(message)}</p>`;
    }

    function populateClassFilter() {
        const select = byId(selectors.classSelect);
        if (!select) {
            return;
        }

        const currentValue = select.value || 'all';
        const options = ['<option value="all">All classes</option>'].concat(
            state.classes.map((classRow) => `
                <option value="${escapeHtml(classRow.classId)}">
                    ${escapeHtml(classRow.classCode || 'Class')} - ${escapeHtml(classRow.className || 'Class')}
                </option>
            `)
        );

        select.innerHTML = options.join('');
        if ([...select.options].some((option) => option.value === currentValue)) {
            select.value = currentValue;
        }
    }

    function resetFilters() {
        const classSelect = byId(selectors.classSelect);
        const statusSelect = byId(selectors.statusSelect);
        const searchInput = byId(selectors.searchInput);

        if (classSelect) {
            classSelect.value = 'all';
        }

        if (statusSelect) {
            statusSelect.value = 'all';
        }

        if (searchInput) {
            searchInput.value = '';
        }
    }

    function applyFilters() {
        if (state.loadError) {
            renderSections([], {
                message: state.loadError,
                icon: 'error_outline',
                variant: 'error'
            });
            return;
        }

        const rows = getVisibleRows();
        updateSummary(rows);
        updateHighlights(rows);
        updateResultsMeta(rows);
        renderSections(
            rows,
            rows.length
                ? null
                : state.rows.length
                    ? {
                        message: 'No activities match the current filters.',
                        icon: 'search_off'
                    }
                    : {
                        message: 'No activities are assigned to you yet.',
                        icon: 'assignment_turned_in'
                    }
        );
    }

    function applyLoadError(message) {
        const loadMessage = message || 'Unable to load activities right now.';
        const classSelect = byId(selectors.classSelect);

        state.rows = [];
        state.classes = [];
        state.loadError = loadMessage;
        resetFilters();

        if (classSelect) {
            classSelect.innerHTML = '<option value="all">All classes</option>';
            classSelect.value = 'all';
        }

        updateSummary([]);
        setText(selectors.resultsMeta, loadMessage);
        setText(selectors.heroStatus, loadMessage);
        setText(selectors.nextDue, 'Activity data unavailable');
        setText(selectors.nextDueMeta, loadMessage);
        setText(selectors.latestSubmission, 'Activity data unavailable');
        setText(selectors.latestSubmissionMeta, loadMessage);
        renderClassListError('Unable to load class summaries right now.');
        renderSections([], {
            message: loadMessage,
            icon: 'error_outline',
            variant: 'error'
        });
    }

    async function readJsonResponse(response) {
        try {
            return await response.json();
        } catch {
            return {};
        }
    }

    async function loadActivities() {
        try {
            const response = await fetch('/api/student/activities', {
                credentials: 'include',
                cache: 'no-store'
            });
            const data = await readJsonResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load activities.');
            }

            state.rows = Array.isArray(data.rows) ? data.rows : [];
            state.classes = Array.isArray(data.classes)
                ? data.classes.filter((row) => Number(row.activityCount || 0) > 0)
                : [];
            state.studentId = data.studentIDNumber || state.studentId;
            state.loadError = '';

            setText(selectors.studentIdLine, `Student ID: ${state.studentId || 'N/A'}`);

            populateClassFilter();
            renderClassList();
            applyFilters();
        } catch (error) {
            console.error('Activities page failed to load:', error);
            applyLoadError(
                error && error.message && error.message !== 'Failed to fetch'
                    ? error.message
                    : 'Unable to load activities right now.'
            );
        }
    }

    function attachEvents() {
        byId(selectors.classSelect)?.addEventListener('change', applyFilters);
        byId(selectors.statusSelect)?.addEventListener('change', applyFilters);
        byId(selectors.searchInput)?.addEventListener('input', applyFilters);
        byId(selectors.clearFilters)?.addEventListener('click', () => {
            resetFilters();
            applyFilters();
        });
    }

    function initPageIdentity() {
        const page = byId(selectors.page);
        if (!page) {
            return;
        }

        state.studentName = page.dataset.studentName || 'Student';
        state.studentId = page.dataset.studentId || '';

        setText(selectors.studentName, state.studentName);
        setText(selectors.studentIdLine, `Student ID: ${state.studentId || 'N/A'}`);
        setText(selectors.rolePill, page.dataset.studentRole || 'student');
    }

    function init() {
        initPageIdentity();
        attachEvents();
        loadActivities();
    }

    document.addEventListener('DOMContentLoaded', init);
})(window);
