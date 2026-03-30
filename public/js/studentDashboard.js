(function attachStudentDashboard(global) {
    const state = {
        displayName: 'Student',
        studentId: '',
        grades: [],
        joinedClasses: [],
        classSummary: {
            joinedClassCount: 0,
            activeClassCount: 0,
            classesWithActivitiesCount: 0,
            overdueActivityCount: 0
        },
        activities: [],
        activitiesSummary: {
            totalActivities: 0,
            classCount: 0,
            submittedCount: 0,
            overdueCount: 0
        }
    };

    const selectors = {
        page: 'studentDashboardPage',
        displayName: 'studentDisplayName',
        joinedClassCount: 'studentJoinedClassCount',
        joinedClassMeta: 'studentJoinedClassMeta',
        openActivityCount: 'studentOpenActivityCount',
        openActivityMeta: 'studentOpenActivityMeta',
        overdueCount: 'studentOverdueCount',
        overdueMeta: 'studentOverdueMeta',
        attentionList: 'studentAttentionList',
        joinDetails: 'studentJoinClassDetails',
        joinForm: 'studentJoinClassForm',
        joinCodeInput: 'studentJoinClassCode',
        joinButton: 'studentJoinClassButton',
        joinStatus: 'studentJoinClassStatus'
    };

    async function init() {
        initPageIdentity();

        const joinForm = document.getElementById(selectors.joinForm);
        if (joinForm) {
            joinForm.addEventListener('submit', handleJoinFormSubmit);
        }

        const joinCodeInput = document.getElementById(selectors.joinCodeInput);
        if (joinCodeInput) {
            joinCodeInput.addEventListener('input', () => {
                joinCodeInput.value = joinCodeInput.value.toUpperCase();
            });
        }

        document.addEventListener('click', handleInternalActionClick);

        renderDashboardOverview();
        applyDashboardLinkTargets();

        const tasks = [refreshStudentProfile(), loadJoinedClasses(), loadActivities()];
        if (state.studentId) {
            tasks.push(loadGrades(state.studentId));
        } else {
            handleGradesUnavailable('Student ID is missing from the current session.');
        }

        await Promise.allSettled(tasks);
    }

    function initPageIdentity() {
        const page = document.getElementById(selectors.page);
        if (!page) {
            return;
        }

        state.displayName = page.dataset.studentName || 'Student';
        state.studentId = page.dataset.studentId || '';

        setText(selectors.displayName, state.displayName);
    }

    async function refreshStudentProfile() {
        const hadStudentId = Boolean(state.studentId);

        try {
            const response = await fetch('/user-details', { credentials: 'include' });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success || !data.user) {
                throw new Error(data.message || 'Unable to load student details.');
            }

            state.displayName = `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || state.displayName;
            state.studentId = data.user.studentIDNumber || state.studentId || '';

            setText(selectors.displayName, state.displayName);
        } catch (error) {
            console.error('Unable to refresh student profile:', error);
        }

        if (state.studentId && !hadStudentId && !state.grades.length) {
            await loadGrades(state.studentId);
        }
    }

    async function loadGrades(studentId) {
        try {
            const response = await fetch(`/get-grades/${encodeURIComponent(studentId)}`, { credentials: 'include' });
            const data = await safeParseJson(response);

            if (response.status === 404) {
                state.grades = [];
                renderDashboardOverview();
                return;
            }

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load grades.');
            }

            state.grades = Array.isArray(data.gradeDataArray) ? data.gradeDataArray : [];
            renderDashboardOverview();
        } catch (error) {
            console.error('Unable to load grades:', error);
            handleGradesUnavailable(error.message || 'Unable to load grades right now.');
        }
    }

    async function loadJoinedClasses() {
        try {
            const response = await fetch('/api/student/classes', {
                credentials: 'include',
                cache: 'no-store'
            });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load joined classes.');
            }

            state.classSummary = {
                joinedClassCount: Number(data.summary?.joinedClassCount || 0),
                activeClassCount: Number(data.summary?.activeClassCount || 0),
                classesWithActivitiesCount: Number(data.summary?.classesWithActivitiesCount || 0),
                overdueActivityCount: Number(data.summary?.overdueActivityCount || 0)
            };
            state.joinedClasses = Array.isArray(data.classes)
                ? data.classes
                    .map((classItem) => ({
                        classId: classItem.classId || classItem._id?.$oid || classItem._id || '',
                        classCode: classItem.classCode || '',
                        className: classItem.className || 'Class name unavailable',
                        instructorName: classItem.instructorName || 'Instructor unavailable',
                        schedule: classItem.schedule || '',
                        time: classItem.time || '',
                        courseCode: classItem.courseCode || '',
                        status: normalizeClassStatus(classItem.status),
                        activityCount: Number(classItem.activityCount || 0),
                        submittedCount: Number(classItem.submittedCount || 0),
                        overdueCount: Number(classItem.overdueCount || 0),
                        nextDueAt: classItem.nextDueAt || null
                    }))
                    .sort(compareClasses)
                : [];

            setJoinedClassCount(state.joinedClasses.length);
            renderJoinedClassSummary();
            renderDashboardOverview();
        } catch (error) {
            console.error('Unable to load joined classes:', error);
            state.joinedClasses = [];
            state.classSummary = {
                joinedClassCount: 0,
                activeClassCount: 0,
                classesWithActivitiesCount: 0,
                overdueActivityCount: 0
            };
            setJoinedClassCount(0);
            setText(selectors.joinedClassMeta, error.message || 'Unable to load class summary right now.');
            renderDashboardOverview();
        }
    }

    async function loadActivities() {
        try {
            const response = await fetch('/api/student/activities', {
                credentials: 'include',
                cache: 'no-store'
            });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load activities.');
            }

            state.activities = Array.isArray(data.rows) ? data.rows : [];
            state.activitiesSummary = {
                totalActivities: Number(data.summary?.totalActivities || 0),
                classCount: Number(data.summary?.classCount || 0),
                submittedCount: Number(data.summary?.submittedCount || 0),
                overdueCount: Number(data.summary?.overdueCount || 0)
            };

            updateActivitySummary();
            renderDashboardOverview();
        } catch (error) {
            console.error('Unable to load activities:', error);
            state.activities = [];
            state.activitiesSummary = {
                totalActivities: 0,
                classCount: 0,
                submittedCount: 0,
                overdueCount: 0
            };
            setText(selectors.openActivityCount, '0');
            setText(selectors.openActivityMeta, error.message || 'Unable to load activities right now.');
            setText(selectors.overdueCount, '0');
            setText(selectors.overdueMeta, error.message || 'Unable to load activities right now.');
            renderDashboardOverview();
        }
    }

    async function handleJoinFormSubmit(event) {
        event.preventDefault();

        const input = document.getElementById(selectors.joinCodeInput);
        if (!input) {
            return;
        }

        const classCode = input.value.trim().toUpperCase();
        if (!classCode) {
            renderJoinStatus('Enter a class code to join.', 'error');
            input.focus();
            return;
        }

        setJoinPending(true);
        renderJoinStatus('Joining class...', 'info');

        try {
            const response = await fetch('/api/classes/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ classCode })
            });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to join class.');
            }

            input.value = '';
            renderJoinStatus(
                data.message || 'Class joined successfully.',
                data.alreadyJoined ? 'info' : 'success'
            );
            await Promise.allSettled([loadJoinedClasses(), loadActivities()]);
        } catch (error) {
            console.error('Unable to join class:', error);
            renderJoinStatus(error.message || 'Unable to join class right now.', 'error');
        } finally {
            setJoinPending(false);
        }
    }

    function handleInternalActionClick(event) {
        const actionLink = event.target.closest('a[href="#studentJoinClassDetails"]');
        if (!actionLink) {
            return;
        }

        const joinDetails = document.getElementById(selectors.joinDetails);
        if (!joinDetails) {
            return;
        }

        event.preventDefault();
        joinDetails.open = true;
        joinDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const input = document.getElementById(selectors.joinCodeInput);
        if (input) {
            global.setTimeout(() => input.focus(), 220);
        }
    }

    function handleGradesUnavailable(message) {
        state.grades = [];
        renderDashboardOverview();
    }

    function updateActivitySummary() {
        const openActivities = getOpenActivities();
        const overdueActivities = getOverdueActivities();
        const nextDue = getNextDueActivity();

        setText(selectors.openActivityCount, String(openActivities.length));
        setText(
            selectors.openActivityMeta,
            nextDue
                ? `${nextDue.activityTitle || nextDue.quizTitle || 'Upcoming activity'} due ${formatDateTime(nextDue.dueDate, 'soon')}`
                : openActivities.length
                    ? 'Open activities are available in your student workspace.'
                    : 'No open activities right now.'
        );
        setText(selectors.overdueCount, String(overdueActivities.length));
        setText(
            selectors.overdueMeta,
            overdueActivities.length
                ? 'Finish overdue work from the Activities page.'
                : state.activitiesSummary.submittedCount
                    ? `${state.activitiesSummary.submittedCount} submitted activity item(s) recorded.`
                    : 'No overdue work right now.'
        );
    }

    function setJoinedClassCount(count) {
        const safeCount = Number.isFinite(Number(count)) ? String(count) : '0';
        setText(selectors.joinedClassCount, safeCount);
    }

    function renderJoinedClassSummary() {
        const parts = [];

        if (Number(state.classSummary.activeClassCount || 0) > 0) {
            parts.push(`${state.classSummary.activeClassCount} active`);
        }
        if (Number(state.classSummary.classesWithActivitiesCount || 0) > 0) {
            parts.push(`${state.classSummary.classesWithActivitiesCount} with visible work`);
        }
        if (Number(state.classSummary.overdueActivityCount || 0) > 0) {
            parts.push(`${state.classSummary.overdueActivityCount} overdue item(s)`);
        }

        setText(
            selectors.joinedClassMeta,
            parts.length ? parts.join(' | ') : 'No joined classes are linked to your account yet.'
        );
    }

    function renderJoinStatus(message, tone) {
        const container = document.getElementById(selectors.joinStatus);
        if (!container) {
            return;
        }

        const resolvedTone = ['success', 'error', 'info'].includes(tone) ? tone : 'info';
        container.hidden = !message;
        container.className = `student-status student-status-${resolvedTone}`;
        container.textContent = message || '';
    }

    function renderDashboardOverview() {
        renderAttentionList();
        applyDashboardLinkTargets();
    }

    function applyDashboardLinkTargets() {
        const page = document.getElementById(selectors.page);
        if (!page) {
            return;
        }

        page.querySelectorAll('a[href]').forEach((link) => {
            const href = String(link.getAttribute('href') || '').trim();
            if (!href || href.startsWith('#')) {
                link.removeAttribute('target');
                link.removeAttribute('rel');
                return;
            }

            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
    }

    function renderAttentionList() {
        const container = document.getElementById(selectors.attentionList);
        if (!container) {
            return;
        }

        const items = buildAttentionItems();
        if (!items.length) {
            renderMessage(selectors.attentionList, 'Your next steps will appear here after the dashboard finishes loading.');
            return;
        }

        container.innerHTML = items.map((item) => `
            <article class="dashboard-attention-item dashboard-attention-item-${escapeHtml(item.tone || 'neutral')}">
                <div class="dashboard-attention-icon">
                    <span class="material-icons" aria-hidden="true">${escapeHtml(item.icon || 'task_alt')}</span>
                </div>
                <div class="dashboard-attention-copy">
                    <p class="student-eyebrow">${escapeHtml(item.kicker || 'Next Step')}</p>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p class="student-meta">${escapeHtml(item.text)}</p>
                </div>
                <a href="${escapeHtml(item.actionHref)}" class="student-btn ${escapeHtml(item.actionVariant || 'student-btn-secondary')}">${escapeHtml(item.actionLabel)}</a>
            </article>
        `).join('');
    }

    function buildAttentionItems() {
        const items = [];
        const overdueActivities = getOverdueActivities();
        const nextDue = getNextDueActivity();
        const latestGrade = getLatestGradeRecord();
        const primaryClass = state.joinedClasses[0] || null;

        if (!state.joinedClasses.length) {
            items.push({
                kicker: 'Get Started',
                title: 'Join a class with your teacher code',
                text: 'You will see class workspaces, visible activities, and class details here after joining.',
                actionLabel: 'Join a class',
                actionHref: '#studentJoinClassDetails',
                actionVariant: 'student-btn-primary',
                icon: 'group_add',
                tone: 'strong'
            });
        } else if (overdueActivities.length) {
            items.push({
                kicker: 'Urgent',
                title: `${overdueActivities.length} overdue activit${overdueActivities.length === 1 ? 'y is' : 'ies are'} waiting`,
                text: 'Start with overdue work so the rest of your activity list is easier to manage.',
                actionLabel: 'Open activities',
                actionHref: '/activities',
                actionVariant: 'student-btn-primary',
                icon: 'assignment_late',
                tone: 'warning'
            });
        } else if (nextDue) {
            items.push({
                kicker: 'Coming Up',
                title: nextDue.activityTitle || nextDue.quizTitle || 'Upcoming activity',
                text: `${nextDue.classCode || 'Class'} | Due ${formatDateTime(nextDue.dueDate, 'soon')}`,
                actionLabel: nextDue.category === 'progress' ? 'Resume activity' : 'Open activity',
                actionHref: nextDue.actionUrl || '/activities',
                actionVariant: 'student-btn-primary',
                icon: 'event_available',
                tone: 'strong'
            });
        } else {
            items.push({
                kicker: 'On Track',
                title: 'No urgent activity is blocking you right now',
                text: 'Use this time to review your classes, lessons, or grade records.',
                actionLabel: 'Open classes',
                actionHref: '/classes',
                actionVariant: 'student-btn-secondary',
                icon: 'task_alt',
                tone: 'neutral'
            });
        }

        if (primaryClass) {
            const primaryClassSchedule = [primaryClass.schedule, primaryClass.time].filter(Boolean).join(' | ');
            items.push({
                kicker: 'Class Workspace',
                title: `${primaryClass.classCode || 'Class'} - ${primaryClass.className || 'Class name unavailable'}`,
                text: primaryClassSchedule || 'Open this class to review visible work and class details.',
                actionLabel: 'Open class',
                actionHref: primaryClass.classId ? `/classes/${encodeURIComponent(primaryClass.classId)}` : '/classes',
                actionVariant: 'student-btn-secondary',
                icon: 'co_present',
                tone: 'neutral'
            });
        } else {
            items.push({
                kicker: 'While You Wait',
                title: 'Browse lessons and public study materials',
                text: 'You can keep studying even before your class workspace is active.',
                actionLabel: 'Browse lessons',
                actionHref: '/lessons',
                actionVariant: 'student-btn-secondary',
                icon: 'menu_book',
                tone: 'neutral'
            });
        }

        if (latestGrade) {
            items.push({
                kicker: 'Academic Snapshot',
                title: `Latest final grade: ${latestGrade.totalFinalGrade || 'N/A'}`,
                text: `${latestGrade.courseID || 'Course'} | Updated ${formatDateTime(latestGrade.createdAt, 'recently')}`,
                actionLabel: 'Review grades',
                actionHref: '/grades',
                actionVariant: 'student-btn-secondary',
                icon: 'grade',
                tone: 'neutral'
            });
        } else {
            items.push({
                kicker: 'Academic Snapshot',
                title: 'Grade records are not available yet',
                text: 'Your uploaded grade records will appear here after they are available on the platform.',
                actionLabel: 'Open grades',
                actionHref: '/grades',
                actionVariant: 'student-btn-secondary',
                icon: 'fact_check',
                tone: 'neutral'
            });
        }

        return items.slice(0, 3);
    }

    function renderMessage(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }

        container.innerHTML = `<p class="student-empty-state">${escapeHtml(message)}</p>`;
    }

    function setJoinPending(isPending) {
        const button = document.getElementById(selectors.joinButton);
        const input = document.getElementById(selectors.joinCodeInput);

        if (button) {
            button.disabled = isPending;
            button.setAttribute('aria-busy', isPending ? 'true' : 'false');
        }

        if (input) {
            input.disabled = isPending;
        }
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function getLatestGradeRecord() {
        return state.grades
            .filter((item) => isMeaningfulDateValue(item.createdAt))
            .slice()
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
            || state.grades[0]
            || null;
    }

    function getOpenActivities() {
        return state.activities.filter((row) => !['submitted', 'late', 'scheduled'].includes(String(row.category || '')));
    }

    function getOverdueActivities() {
        return state.activities.filter((row) => String(row.category || '') === 'overdue');
    }

    function getNextDueActivity() {
        const now = Date.now();
        const datedActivities = getOpenActivities()
            .filter((row) => isMeaningfulDateValue(row.dueDate) && new Date(row.dueDate).getTime() > now)
            .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

        return datedActivities[0] || getOpenActivities()[0] || null;
    }

    function formatDateTime(value, fallback) {
        if (!isMeaningfulDateValue(value)) {
            return fallback || 'N/A';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime()) || date.getTime() <= 0) {
            return fallback || 'N/A';
        }

        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(date);
    }

    function isMeaningfulDateValue(value) {
        if (value === null || value === undefined || value === '' || value === 0 || value === '0') {
            return false;
        }

        const date = new Date(value);
        return !Number.isNaN(date.getTime()) && date.getTime() > 0;
    }

    function normalizeClassStatus(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (['active', 'draft', 'archived'].includes(normalized)) {
            return normalized;
        }
        return 'active';
    }

    function compareClasses(left, right) {
        const leftLabel = `${left.classCode} ${left.className}`.trim();
        const rightLabel = `${right.classCode} ${right.className}`.trim();
        return leftLabel.localeCompare(rightLabel);
    }

    async function safeParseJson(response) {
        try {
            return await response.json();
        } catch (_error) {
            return {};
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

    document.addEventListener('DOMContentLoaded', init);
})(window);
