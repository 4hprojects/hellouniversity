(function attachStudentClasses(global) {
    const state = {
        indexClasses: [],
        indexSummary: {},
        detailClassItem: null,
        detailAnnouncementPermissions: null,
        detailAnnouncements: [],
        detailMaterials: []
    };

    const selectors = {
        indexPage: 'studentClassesPage',
        detailPage: 'studentClassDetailPage',
        indexName: 'studentClassesName',
        indexRolePill: 'studentClassesRolePill',
        indexIdLine: 'studentClassesIdLine',
        indexHeroStatus: 'studentClassesHeroStatus',
        indexPrimaryTitle: 'studentClassesPrimaryTitle',
        indexPrimaryText: 'studentClassesPrimaryText',
        indexPrimaryAction: 'studentClassesPrimaryAction',
        indexFeaturedCard: 'studentClassesFeaturedCard',
        indexFeaturedTitle: 'studentClassesFeaturedTitle',
        indexFeaturedText: 'studentClassesFeaturedText',
        indexFeaturedStatus: 'studentClassesFeaturedStatus',
        indexFeaturedTeacher: 'studentClassesFeaturedTeacher',
        indexFeaturedSchedule: 'studentClassesFeaturedSchedule',
        indexFeaturedActivities: 'studentClassesFeaturedActivities',
        indexFeaturedSubmitted: 'studentClassesFeaturedSubmitted',
        indexFeaturedOverdue: 'studentClassesFeaturedOverdue',
        indexFeaturedAction: 'studentClassesFeaturedAction',
        indexJoinedCount: 'studentClassesJoinedCount',
        indexActiveCount: 'studentClassesActiveCount',
        indexWithActivitiesCount: 'studentClassesWithActivitiesCount',
        indexOverdueCount: 'studentClassesOverdueCount',
        indexResultsMeta: 'studentClassesResultsMeta',
        indexAttentionList: 'studentClassesAttentionList',
        indexGrid: 'studentClassesGrid',
        joinForm: 'studentClassesJoinForm',
        joinInput: 'studentClassesJoinCode',
        joinButton: 'studentClassesJoinButton',
        joinStatus: 'studentClassesJoinStatus',
        detailTitle: 'studentClassTitle',
        detailDescription: 'studentClassDescription',
        detailStatusPill: 'studentClassStatusPill',
        detailTeacherLine: 'studentClassTeacherLine',
        detailScheduleLine: 'studentClassScheduleLine',
        detailTabStream: 'studentClassTabStream',
        detailTabClasswork: 'studentClassTabClasswork',
        detailTabResources: 'studentClassTabResources',
        detailSpotlightTitle: 'studentClassSpotlightTitle',
        detailSpotlightText: 'studentClassSpotlightText',
        detailSpotlightAction: 'studentClassSpotlightAction',
        detailActivityCount: 'studentClassActivityCount',
        detailSubmittedCount: 'studentClassSubmittedCount',
        detailOverdueCount: 'studentClassOverdueCount',
        detailNextDue: 'studentClassNextDue',
        detailNextDueMeta: 'studentClassNextDueMeta',
        detailResultsMeta: 'studentClassResultsMeta',
        detailActivitiesList: 'studentClassActivitiesList',
        detailFacts: 'studentClassFacts',
        detailNote: 'studentClassNote',
        detailAnnouncementsMeta: 'studentClassAnnouncementsMeta',
        detailAnnouncementsList: 'studentClassAnnouncementsList',
        detailMaterialsMeta: 'studentClassMaterialsMeta',
        detailMaterialsList: 'studentClassMaterialsList'
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

    function formatMaterialType(value) {
        switch (String(value || '').trim().toLowerCase()) {
        case 'link':
            return 'Link';
        case 'video':
            return 'Video';
        case 'document':
            return 'Document';
        case 'file':
            return 'File';
        case 'note':
            return 'Note';
        default:
            return 'Resource';
        }
    }

    function formatBytes(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '';
        }
        if (numeric < 1024) {
            return `${numeric} B`;
        }
        if (numeric < (1024 * 1024)) {
            return `${(numeric / 1024).toFixed(1)} KB`;
        }
        return `${(numeric / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatClassStatus(value) {
        const normalized = normalizeClassStatus(value);
        if (normalized === 'archived') {
            return 'Archived';
        }
        if (normalized === 'draft') {
            return 'Draft';
        }
        return 'Active';
    }

    function normalizeClassStatus(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (['draft', 'active', 'archived'].includes(normalized)) {
            return normalized;
        }
        return 'active';
    }

    function trustedText(value) {
        return String(value ?? '');
    }

    function formatRole(value) {
        switch (String(value || '').trim().toLowerCase()) {
        case 'owner':
            return 'Owner';
        case 'co_teacher':
            return 'Co-Teacher';
        case 'teaching_assistant':
            return 'Teaching Assistant';
        case 'viewer':
            return 'Viewer';
        case 'teacher':
            return 'Teacher';
        case 'student':
            return 'Student';
        case 'admin':
            return 'Admin';
        default:
            return 'Participant';
        }
    }

    function readPageData(id) {
        const page = byId(id);
        if (!page) {
            return null;
        }

        return {
            element: page,
            studentName: page.dataset.studentName || 'Student',
            studentId: page.dataset.studentId || '',
            studentRole: page.dataset.studentRole || 'student',
            classId: page.dataset.classId || ''
        };
    }

    async function readJsonResponse(response) {
        try {
            return await response.json();
        } catch (_error) {
            return {};
        }
    }

    function getDetailWorkspaceSectionFromHash() {
        const hash = String(global.location?.hash || '').replace(/^#/, '').trim().toLowerCase();
        if (['stream', 'classwork', 'resources'].includes(hash)) {
            return hash;
        }
        return 'stream';
    }

    function setDetailWorkspaceSection(section, options = {}) {
        const nextSection = ['stream', 'classwork', 'resources'].includes(section) ? section : 'stream';
        const entries = [
            {
                name: 'stream',
                tab: byId(selectors.detailTabStream),
                panel: byId('studentClassStreamSection')
            },
            {
                name: 'classwork',
                tab: byId(selectors.detailTabClasswork),
                panel: byId('studentClassClassworkSection')
            },
            {
                name: 'resources',
                tab: byId(selectors.detailTabResources),
                panel: byId('studentClassResourcesSection')
            }
        ];

        entries.forEach((entry) => {
            const isActive = entry.name === nextSection;

            if (entry.tab) {
                entry.tab.classList.toggle('is-active', isActive);
                entry.tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                entry.tab.setAttribute('tabindex', isActive ? '0' : '-1');
            }

            if (entry.panel) {
                entry.panel.hidden = !isActive;
                entry.panel.classList.toggle('is-active', isActive);
            }
        });

        if (options.updateHash !== false) {
            const nextHash = `#${nextSection}`;
            if (global.location?.hash !== nextHash) {
                global.history?.replaceState?.(null, '', `${global.location.pathname}${global.location.search}${nextHash}`);
            }
        }
    }

    function bindDetailWorkspaceTabs() {
        const buttons = [
            byId(selectors.detailTabStream),
            byId(selectors.detailTabClasswork),
            byId(selectors.detailTabResources)
        ].filter(Boolean);

        if (!buttons.length) {
            return;
        }

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                setDetailWorkspaceSection(button.dataset.workspaceSection || 'stream');
            });
        });

        global.addEventListener('hashchange', () => {
            setDetailWorkspaceSection(getDetailWorkspaceSectionFromHash(), { updateHash: false });
        });

        setDetailWorkspaceSection(getDetailWorkspaceSectionFromHash(), { updateHash: false });
    }

    function getClassStatusBadgeMarkup(status) {
        const normalized = normalizeClassStatus(status);
        return `
            <span class="student-badge classes-class-status classes-class-status-${escapeHtml(normalized)}">
                ${escapeHtml(formatClassStatus(normalized))}
            </span>
        `;
    }

    function getClassStatusRank(status) {
        const normalized = normalizeClassStatus(status);
        if (normalized === 'active') {
            return 0;
        }
        if (normalized === 'draft') {
            return 1;
        }
        return 2;
    }

    function getIndexClassHref(classItem) {
        return classItem?.classId ? `/classes/${encodeURIComponent(classItem.classId)}` : '/classes';
    }

    function getIndexClassScheduleText(classItem) {
        return [classItem.schedule, classItem.time].filter(Boolean).join(' | ') || 'Schedule not available';
    }

    function getIndexClassPriorityLabel(classItem) {
        if (Number(classItem.overdueCount || 0) > 0) {
            return `${classItem.overdueCount} overdue`;
        }
        if (classItem.nextDueAt) {
            return `Next due ${formatDateTime(classItem.nextDueAt, 'soon')}`;
        }
        if (Number(classItem.activityCount || 0) > 0) {
            return `${classItem.activityCount} visible activities`;
        }
        return 'No visible work yet';
    }

    function compareIndexClasses(left, right) {
        const overdueDelta = Number(right.overdueCount || 0) - Number(left.overdueCount || 0);
        if (overdueDelta !== 0) {
            return overdueDelta;
        }

        const statusDelta = getClassStatusRank(left.status) - getClassStatusRank(right.status);
        if (statusDelta !== 0) {
            return statusDelta;
        }

        const leftDue = toTimestamp(left.nextDueAt);
        const rightDue = toTimestamp(right.nextDueAt);
        if (leftDue && rightDue && leftDue !== rightDue) {
            return leftDue - rightDue;
        }
        if (leftDue || rightDue) {
            return leftDue ? -1 : 1;
        }

        const activityDelta = Number(right.activityCount || 0) - Number(left.activityCount || 0);
        if (activityDelta !== 0) {
            return activityDelta;
        }

        return `${left.classCode} ${left.className}`.trim().localeCompare(`${right.classCode} ${right.className}`.trim());
    }

    function getIndexClassCardMarkup(classItem) {
        const scheduleText = getIndexClassScheduleText(classItem);
        const nextDueText = getIndexClassPriorityLabel(classItem);
        const normalizedStatus = normalizeClassStatus(classItem.status);

        return `
            <a href="${escapeHtml(getIndexClassHref(classItem))}" class="classes-class-card classes-class-card-${escapeHtml(normalizedStatus)}">
                <div class="classes-class-card-banner">
                    <span class="classes-class-card-banner-code">${escapeHtml(classItem.classCode || 'Class')}</span>
                    <span class="material-icons" aria-hidden="true">school</span>
                </div>
                <div class="classes-class-card-header">
                    <div class="classes-class-card-title">
                        <h3>${escapeHtml(classItem.className || 'Class name unavailable')}</h3>
                        <p class="student-meta">${escapeHtml(classItem.courseCode || 'Joined class')}</p>
                    </div>
                    ${getClassStatusBadgeMarkup(classItem.status)}
                </div>

                <div class="classes-class-card-meta">
                    <div class="classes-meta-line">
                        <span class="material-icons" aria-hidden="true">co_present</span>
                        <p class="student-meta">${escapeHtml(classItem.instructorName || 'Instructor unavailable')}</p>
                    </div>
                    <div class="classes-meta-line">
                        <span class="material-icons" aria-hidden="true">schedule</span>
                        <p class="student-meta">${escapeHtml(scheduleText || 'Schedule not available')}</p>
                    </div>
                </div>

                <div class="classes-card-summary">
                    <div class="classes-summary-item">
                        <strong>${escapeHtml(String(classItem.activityCount || 0))}</strong>
                        <span>Activities</span>
                    </div>
                    <div class="classes-summary-item">
                        <strong>${escapeHtml(String(classItem.submittedCount || 0))}</strong>
                        <span>Submitted</span>
                    </div>
                    <div class="classes-summary-item">
                        <strong>${escapeHtml(String(classItem.overdueCount || 0))}</strong>
                        <span>Overdue</span>
                    </div>
                </div>

                <div class="classes-class-card-footer">
                    <p class="classes-card-next-due">${escapeHtml(nextDueText)}</p>
                    <span class="classes-card-open">
                        <span>Open class</span>
                        <span class="material-icons" aria-hidden="true">arrow_forward</span>
                    </span>
                </div>
            </a>
        `;
    }

    function renderIndexPrimaryFocus(classItem) {
        const action = byId(selectors.indexPrimaryAction);

        if (!classItem) {
            setText(selectors.indexPrimaryTitle, 'Join your first class');
            setText(selectors.indexPrimaryText, 'Once you join a class, this page will point you to the right class first.');
            if (action) {
                action.textContent = 'Join a class';
                action.setAttribute('href', '#studentClassesJoinCard');
            }
            return;
        }

        const title = Number(classItem.overdueCount || 0) > 0
            ? `${classItem.classCode || 'Class'} needs attention now`
            : classItem.nextDueAt
                ? `${classItem.classCode || 'Class'} is your next class to open`
                : `${classItem.classCode || 'Class'} is ready to review`;
        const textParts = [
            classItem.className || 'Class name unavailable',
            getIndexClassScheduleText(classItem),
            getIndexClassPriorityLabel(classItem)
        ].filter(Boolean);

        setText(selectors.indexPrimaryTitle, title);
        setText(selectors.indexPrimaryText, textParts.join(' • '));

        if (action) {
            action.textContent = Number(classItem.overdueCount || 0) > 0 ? 'Resolve this class' : 'Open class';
            action.setAttribute('href', getIndexClassHref(classItem));
        }
    }

    function renderIndexFeaturedClass(classItem) {
        const card = byId(selectors.indexFeaturedCard);
        const action = byId(selectors.indexFeaturedAction);

        if (!card) {
            return;
        }

        if (!classItem) {
            setText(selectors.indexFeaturedTitle, 'No joined class yet');
            setText(selectors.indexFeaturedText, 'Join a class to see your recommended class here.');
            setText(selectors.indexFeaturedStatus, 'Not joined');
            setText(selectors.indexFeaturedTeacher, 'Teacher: Unavailable');
            setText(selectors.indexFeaturedSchedule, 'Schedule not available');
            setText(selectors.indexFeaturedActivities, '0');
            setText(selectors.indexFeaturedSubmitted, '0');
            setText(selectors.indexFeaturedOverdue, '0');
            card.className = 'student-card classes-launchpad';

            if (action) {
                action.textContent = 'Join a class';
                action.setAttribute('href', '#studentClassesJoinCard');
            }
            return;
        }

        const normalizedStatus = normalizeClassStatus(classItem.status);
        const description = [
            classItem.courseCode || 'Joined class',
            getIndexClassPriorityLabel(classItem)
        ].filter(Boolean).join(' • ');

        setText(selectors.indexFeaturedTitle, `${classItem.classCode || 'Class'} - ${classItem.className || 'Class name unavailable'}`);
        setText(selectors.indexFeaturedText, description);
        setText(selectors.indexFeaturedStatus, formatClassStatus(normalizedStatus));
        setText(selectors.indexFeaturedTeacher, `Teacher: ${classItem.instructorName || 'Instructor unavailable'}`);
        setText(selectors.indexFeaturedSchedule, getIndexClassScheduleText(classItem));
        setText(selectors.indexFeaturedActivities, String(classItem.activityCount || 0));
        setText(selectors.indexFeaturedSubmitted, String(classItem.submittedCount || 0));
        setText(selectors.indexFeaturedOverdue, String(classItem.overdueCount || 0));
        card.className = `student-card classes-launchpad classes-launchpad-${normalizedStatus}`;

        if (action) {
            action.textContent = Number(classItem.overdueCount || 0) > 0 ? 'Resolve classwork' : 'Open class';
            action.setAttribute('href', getIndexClassHref(classItem));
        }
    }

    function getIndexAttentionItems() {
        if (!state.indexClasses.length) {
            return [];
        }

        return state.indexClasses.slice(0, 3).map((classItem) => ({
            tone: Number(classItem.overdueCount || 0) > 0 ? 'warning' : classItem.nextDueAt ? 'strong' : 'neutral',
            icon: Number(classItem.overdueCount || 0) > 0 ? 'assignment_late' : classItem.nextDueAt ? 'event_available' : 'co_present',
            kicker: Number(classItem.overdueCount || 0) > 0 ? 'Urgent' : classItem.nextDueAt ? 'Coming Up' : 'Ready',
            title: `${classItem.classCode || 'Class'} - ${classItem.className || 'Class name unavailable'}`,
            text: [
                getIndexClassPriorityLabel(classItem),
                classItem.instructorName || 'Instructor unavailable'
            ].join(' • '),
            actionLabel: 'Open class',
            actionHref: getIndexClassHref(classItem)
        }));
    }

    function renderIndexAttentionList() {
        const container = byId(selectors.indexAttentionList);
        if (!container) {
            return;
        }

        const items = getIndexAttentionItems();
        if (!items.length) {
            container.innerHTML = '<p class="student-empty-state">Your joined class priorities will appear here after you enroll in a class.</p>';
            return;
        }

        container.innerHTML = items.map((item) => `
            <article class="classes-attention-item classes-attention-item-${escapeHtml(item.tone)}">
                <div class="classes-attention-icon">
                    <span class="material-icons" aria-hidden="true">${escapeHtml(item.icon)}</span>
                </div>
                <div class="classes-attention-copy">
                    <p class="student-eyebrow">${escapeHtml(item.kicker)}</p>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p class="student-meta">${escapeHtml(item.text)}</p>
                </div>
                <a href="${escapeHtml(item.actionHref)}" class="student-btn ${item.tone === 'warning' ? 'student-btn-primary' : 'student-btn-secondary'}">${escapeHtml(item.actionLabel)}</a>
            </article>
        `).join('');
    }

    function renderIndexEmptyState(message) {
        const container = byId(selectors.indexGrid);
        if (!container) {
            return;
        }

        container.innerHTML = `<p class="student-empty-state">${escapeHtml(message)}</p>`;
    }

    function renderIndexSummary(summary) {
        setText(selectors.indexJoinedCount, String(summary?.joinedClassCount || 0));
        setText(selectors.indexActiveCount, String(summary?.activeClassCount || 0));
        setText(selectors.indexWithActivitiesCount, String(summary?.classesWithActivitiesCount || 0));
        setText(selectors.indexOverdueCount, String(summary?.overdueActivityCount || 0));
    }

    function renderIndexHeroStatus(summary) {
        const parts = [];
        if (Number(summary?.joinedClassCount || 0) > 0) {
            parts.push(`${summary.joinedClassCount} joined classes`);
        }
        if (Number(summary?.classesWithActivitiesCount || 0) > 0) {
            parts.push(`${summary.classesWithActivitiesCount} with visible work`);
        }
        if (Number(summary?.overdueActivityCount || 0) > 0) {
            parts.push(`${summary.overdueActivityCount} overdue items`);
        }

        setText(
            selectors.indexHeroStatus,
            parts.length ? parts.join(' • ') : 'No joined classes found yet.'
        );
    }

    function renderJoinStatus(message, tone) {
        const container = byId(selectors.joinStatus);
        if (!container) {
            return;
        }

        const resolvedTone = ['success', 'error', 'info'].includes(tone) ? tone : 'info';
        container.hidden = !message;
        container.className = `student-status student-status-${resolvedTone}`;
        container.textContent = message || '';
    }

    function setJoinPending(isPending) {
        const button = byId(selectors.joinButton);
        const input = byId(selectors.joinInput);

        if (button) {
            button.disabled = isPending;
            button.setAttribute('aria-busy', isPending ? 'true' : 'false');
        }

        if (input) {
            input.disabled = isPending;
        }
    }

    async function loadClassesIndex() {
        const page = readPageData(selectors.indexPage);
        if (!page) {
            return;
        }

        try {
            const response = await fetch('/api/student/classes', {
                credentials: 'include',
                cache: 'no-store'
            });
            const data = await readJsonResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load classes right now.');
            }

            state.indexSummary = data.summary || {};
            state.indexClasses = Array.isArray(data.classes)
                ? data.classes.slice().sort(compareIndexClasses)
                : [];

            setText(selectors.indexName, page.studentName);
            setText(selectors.indexRolePill, page.studentRole);
            setText(selectors.indexIdLine, `Student ID: ${page.studentId || 'N/A'}`);
            renderIndexHeroStatus(state.indexSummary);
            renderIndexSummary(state.indexSummary);
            renderIndexPrimaryFocus(state.indexClasses[0] || null);
            renderIndexFeaturedClass(state.indexClasses[0] || null);
            renderIndexAttentionList();
            setText(
                selectors.indexResultsMeta,
                state.indexClasses.length
                    ? `Showing ${state.indexClasses.length} joined class(es), sorted by urgency and next due work.`
                    : 'No joined classes were found for your account.'
            );

            const container = byId(selectors.indexGrid);
            if (!container) {
                return;
            }

            if (!state.indexClasses.length) {
                renderIndexEmptyState('You have not joined any classes yet. Use the join form above when you receive a class code.');
                return;
            }

            container.innerHTML = state.indexClasses.map((classItem) => getIndexClassCardMarkup(classItem)).join('');
        } catch (error) {
            console.error('Student classes page failed to load:', error);
            state.indexClasses = [];
            state.indexSummary = {};
            renderIndexPrimaryFocus(null);
            renderIndexFeaturedClass(null);
            renderIndexAttentionList();
            setText(selectors.indexHeroStatus, error.message || 'Unable to load classes right now.');
            setText(selectors.indexResultsMeta, error.message || 'Unable to load classes right now.');
            renderIndexSummary({});
            renderIndexEmptyState(error.message || 'Unable to load classes right now.');
        }
    }

    async function handleIndexJoinSubmit(event) {
        event.preventDefault();

        const input = byId(selectors.joinInput);
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
            const data = await readJsonResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to join class.');
            }

            input.value = '';
            renderJoinStatus(
                data.message || 'Class joined successfully.',
                data.alreadyJoined ? 'info' : 'success'
            );
            await loadClassesIndex();
        } catch (error) {
            console.error('Unable to join class from classes page:', error);
            renderJoinStatus(error.message || 'Unable to join class right now.', 'error');
        } finally {
            setJoinPending(false);
        }
    }

    function getActivityStatusPillMarkup(row) {
        return `<span class="classes-status-pill classes-status-pill-${escapeHtml(row.category || 'available')}">${escapeHtml(row.status || 'Not Started')}</span>`;
    }

    function getActivityActionMarkup(row) {
        if (row.category === 'scheduled' || !row.actionUrl) {
            return '<span class="student-btn student-btn-secondary classes-action-btn classes-action-btn-disabled" aria-disabled="true">Not Open Yet</span>';
        }

        const label = row.category === 'progress' ? 'Resume Quiz' : 'Open Quiz';

        return `
            <a href="${escapeHtml(row.actionUrl)}" class="student-btn student-btn-secondary classes-action-btn">
                <span class="material-icons" aria-hidden="true">launch</span>
                <span>${escapeHtml(label)}</span>
            </a>
        `;
    }

    function getDetailActivityCardMarkup(row) {
        const attemptLabel = row.maxAttempts
            ? `${row.completedAttemptCount} of ${row.maxAttempts} completed`
            : `${row.attemptCount} attempt${row.attemptCount === 1 ? '' : 's'}`;

        return `
            <article class="classes-activity-card">
                <div class="classes-activity-header">
                    <div>
                        <strong>${escapeHtml(row.quizTitle || 'Untitled Quiz')}</strong>
                        <p class="student-meta">${escapeHtml(row.quizDescription || 'No description provided.')}</p>
                    </div>
                    ${getActivityStatusPillMarkup(row)}
                </div>

                <dl class="classes-activity-grid">
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

                <div class="classes-activity-footer">
                    ${getActivityActionMarkup(row)}
                    <p class="student-meta">
                        ${escapeHtml(attemptLabel)}
                        ${row.latestAttemptAt ? ` | Last activity ${escapeHtml(formatDateTime(row.latestAttemptAt, ''))}` : ''}
                    </p>
                </div>
            </article>
        `;
    }

    function renderDetailFacts(classItem) {
        const container = byId(selectors.detailFacts);
        if (!container) {
            return;
        }

        const facts = [
            { label: 'Teacher', value: classItem.instructorName || 'Instructor unavailable' },
            { label: 'Class Code', value: classItem.classCode || 'Class' },
            { label: 'Status', value: formatClassStatus(classItem.status) },
            { label: 'Schedule', value: [classItem.schedule, classItem.time].filter(Boolean).join(' | ') || 'Schedule not available' }
        ];

        if (classItem.courseCode) {
            facts.push({ label: 'Course Code', value: classItem.courseCode });
        }
        if (classItem.section) {
            facts.push({ label: 'Section', value: classItem.section });
        }
        if (classItem.academicTerm) {
            facts.push({ label: 'Academic Term', value: classItem.academicTerm });
        }
        if (classItem.room) {
            facts.push({ label: 'Room', value: classItem.room });
        }

        container.innerHTML = facts.map((fact) => `
            <article class="classes-fact-item">
                <strong>${escapeHtml(fact.label)}</strong>
                <span>${escapeHtml(fact.value)}</span>
            </article>
        `).join('');
    }

    function renderDetailActivities(activities) {
        const container = byId(selectors.detailActivitiesList);
        if (!container) {
            return;
        }

        if (!Array.isArray(activities) || !activities.length) {
            container.innerHTML = '<p class="student-empty-state">No visible activities are assigned to this class yet.</p>';
            return;
        }

        container.innerHTML = activities.map((activity) => getDetailActivityCardMarkup(activity)).join('');
    }

    function getMaterialActionMarkup(material) {
        const href = material.file?.downloadUrl || material.url || '';
        if (!href) {
            return '<span class="student-meta">No direct file or link available.</span>';
        }

        return `
            <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="student-btn student-btn-secondary classes-action-btn">
                <span class="material-icons" aria-hidden="true">${material.file?.downloadUrl ? 'download' : 'launch'}</span>
                <span>${material.file?.downloadUrl ? 'Open File' : 'Open Resource'}</span>
            </a>
        `;
    }

    function getDetailMaterialCardMarkup(material) {
        const fileMeta = material.file
            ? [material.file.originalName, formatBytes(material.file.sizeBytes), material.file.mimeType]
                .filter(Boolean)
                .join(' | ')
            : '';

        return `
            <article class="classes-activity-card">
                <div class="classes-activity-header">
                    <div>
                        <strong>${escapeHtml(material.title || 'Untitled Material')}</strong>
                        <p class="student-meta">${escapeHtml(material.description || 'No description provided.')}</p>
                    </div>
                    <span class="classes-status-pill classes-status-pill-available">${escapeHtml(formatMaterialType(material.type))}</span>
                </div>

                <dl class="classes-activity-grid">
                    <div>
                        <dt>Module</dt>
                        <dd>${escapeHtml(material.moduleTitle || 'Unlinked')}</dd>
                    </div>
                    <div>
                        <dt>Delivery</dt>
                        <dd>${escapeHtml(material.file?.downloadUrl ? 'Uploaded file' : material.url ? 'External link' : 'Inline reference')}</dd>
                    </div>
                    <div>
                        <dt>File</dt>
                        <dd>${escapeHtml(fileMeta || 'N/A')}</dd>
                    </div>
                    <div>
                        <dt>Type</dt>
                        <dd>${escapeHtml(formatMaterialType(material.type))}</dd>
                    </div>
                </dl>

                <div class="classes-activity-footer">
                    ${getMaterialActionMarkup(material)}
                </div>
            </article>
        `;
    }

    function renderDetailMaterials(materials) {
        const container = byId(selectors.detailMaterialsList);
        if (!container) {
            return;
        }

        if (!Array.isArray(materials) || !materials.length) {
            container.innerHTML = '<p class="student-empty-state">No visible class materials are available yet.</p>';
            return;
        }

        container.innerHTML = materials.map((material) => getDetailMaterialCardMarkup(material)).join('');
    }

    function updateDetailSpotlight(summary, activities) {
        const action = byId(selectors.detailSpotlightAction);
        const nextDue = summary?.nextDue || null;
        const visibleActivities = Array.isArray(activities) ? activities : [];

        if (nextDue) {
            setText(selectors.detailSpotlightTitle, nextDue.quizTitle || 'Upcoming classwork');
            setText(
                selectors.detailSpotlightText,
                `${formatDateTime(nextDue.dueDate, 'No due date')} • ${nextDue.status || 'Available now'}`
            );

            if (action) {
                action.textContent = nextDue.actionUrl ? 'Open activity' : 'Open classwork';
                action.setAttribute('href', nextDue.actionUrl || '#classwork');
            }
            return;
        }

        if (visibleActivities.length) {
            setText(selectors.detailSpotlightTitle, `${visibleActivities.length} classwork item(s) are visible`);
            setText(selectors.detailSpotlightText, 'Open Classwork to review assigned activities and your current progress.');

            if (action) {
                action.textContent = 'Open classwork';
                action.setAttribute('href', '#classwork');
            }
            return;
        }

        setText(selectors.detailSpotlightTitle, 'No classwork is due right now');
        setText(selectors.detailSpotlightText, 'Check the stream for announcements or browse resources for this class.');

        if (action) {
            action.textContent = 'View stream';
            action.setAttribute('href', '#stream');
        }
    }

    function getAnnouncementCommentsMarkup(announcement) {
        if (!announcement.comments.length) {
            return '<p class="student-empty-state">No comments yet. Be the first to respond.</p>';
        }

        return announcement.comments.map((comment) => `
            <article class="classes-announcement-comment-card">
                <div class="classes-announcement-comment-header">
                    <div>
                        <strong>${trustedText(comment.author.name)}</strong>
                        <span class="student-badge classes-announcement-role">${escapeHtml(formatRole(comment.author.role))}</span>
                    </div>
                    <div class="classes-announcement-comment-actions">
                        <span class="student-meta">${escapeHtml(formatDateTime(comment.createdAt, 'Unknown time'))}</span>
                        ${comment.canDelete ? `
                            <button
                                type="button"
                                class="student-btn student-btn-secondary classes-announcement-inline-btn"
                                data-action="delete-comment"
                                data-announcement-id="${escapeHtml(announcement.id)}"
                                data-comment-id="${escapeHtml(comment.id)}">Delete</button>
                        ` : ''}
                    </div>
                </div>
                <p class="classes-announcement-comment-body">${trustedText(comment.body)}</p>
            </article>
        `).join('');
    }

    function getAnnouncementCommentFormMarkup(announcementId) {
        if (!state.detailAnnouncementPermissions?.canComment) {
            return state.detailAnnouncementPermissions?.isReadOnly
                ? '<p class="student-meta">This class is archived. New comments are disabled.</p>'
                : '<p class="student-meta">Only enrolled students and the class owner can comment here.</p>';
        }

        return `
            <form class="classes-announcement-comment-form" data-announcement-id="${escapeHtml(announcementId)}">
                <label class="classes-announcement-comment-field">
                    <span class="student-kpi-label">Add a comment</span>
                    <textarea name="body" rows="2" maxlength="2500" class="classes-announcement-comment-input" required></textarea>
                </label>
                <div class="classes-announcement-actions">
                    <button type="submit" class="student-btn student-btn-secondary classes-announcement-inline-btn">Post Comment</button>
                </div>
            </form>
        `;
    }

    function getAnnouncementCardMarkup(announcement) {
        const likeLabel = announcement.viewerHasLiked ? 'Unlike' : 'Like';

        return `
            <article class="classes-announcement-card">
                <div class="classes-announcement-header">
                    <div>
                        <h3>${trustedText(announcement.title)}</h3>
                        <div class="classes-announcement-meta">
                            <span class="student-badge classes-announcement-role">${escapeHtml(formatRole(announcement.author.role))}</span>
                            <span class="student-meta">${trustedText(announcement.author.name)}</span>
                            <span class="student-meta">${escapeHtml(formatDateTime(announcement.createdAt, 'Unknown time'))}</span>
                            ${announcement.updatedAt && announcement.updatedAt !== announcement.createdAt
                                ? `<span class="student-meta">Edited ${escapeHtml(formatDateTime(announcement.updatedAt, 'Unknown time'))}</span>`
                                : ''}
                        </div>
                    </div>
                </div>

                <p class="classes-announcement-body">${trustedText(announcement.body)}</p>

                <div class="classes-announcement-engagement">
                    <button
                        type="button"
                        class="student-btn student-btn-secondary classes-announcement-inline-btn ${announcement.viewerHasLiked ? 'classes-announcement-like-active' : ''}"
                        data-action="toggle-like"
                        data-announcement-id="${escapeHtml(announcement.id)}"
                        aria-pressed="${announcement.viewerHasLiked ? 'true' : 'false'}"
                        ${state.detailAnnouncementPermissions?.canReact ? '' : 'disabled'}>
                        ${likeLabel} (${escapeHtml(String(announcement.likeCount || 0))})
                    </button>
                    <span class="student-meta">${escapeHtml(String(announcement.commentCount || 0))} comment(s)</span>
                </div>

                <div class="classes-announcement-comments">
                    <div class="classes-announcement-comments-list">
                        ${getAnnouncementCommentsMarkup(announcement)}
                    </div>
                    ${getAnnouncementCommentFormMarkup(announcement.id)}
                </div>
            </article>
        `;
    }

    function renderDetailAnnouncements() {
        const container = byId(selectors.detailAnnouncementsList);
        if (!container) {
            return;
        }

        if (!state.detailAnnouncements.length) {
            container.innerHTML = '<p class="student-empty-state">No announcements have been posted for this class yet.</p>';
            return;
        }

        container.innerHTML = state.detailAnnouncements.map((announcement) => getAnnouncementCardMarkup(announcement)).join('');
    }

    async function loadAnnouncementFeed(classId) {
        const response = await fetch(`/api/classes/${encodeURIComponent(classId)}/announcements`, {
            credentials: 'include',
            cache: 'no-store'
        });
        const data = await readJsonResponse(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to load announcements right now.');
        }

        state.detailAnnouncementPermissions = data.permissions || {};
        state.detailAnnouncements = Array.isArray(data.announcements) ? data.announcements : [];
        setText(
            selectors.detailAnnouncementsMeta,
            state.detailAnnouncements.length
                ? `Showing ${state.detailAnnouncements.length} announcement(s) for this class.`
                : 'No announcements have been posted for this class yet.'
        );
        renderDetailAnnouncements();
    }

    function applyStatusPill(status) {
        const element = byId(selectors.detailStatusPill);
        if (!element) {
            return;
        }

        const normalized = normalizeClassStatus(status);
        element.className = `student-badge classes-class-status classes-class-status-${normalized}`;
        element.textContent = formatClassStatus(normalized);
    }

    function renderDetail(data) {
        const classItem = data.classItem || {};
        const summary = data.summary || {};
        const activities = Array.isArray(data.activities) ? data.activities : [];
        const scheduleText = [classItem.schedule, classItem.time].filter(Boolean).join(' | ') || 'Schedule not available';
        const description = classItem.description || 'Use this workspace to stay on top of announcements, classwork, and resources in one place.';
        state.detailClassItem = classItem;
        state.detailMaterials = Array.isArray(data.materials) ? data.materials : [];

        setText(selectors.detailTitle, `${classItem.classCode || 'Class'} - ${classItem.className || 'Class name unavailable'}`);
        setText(selectors.detailDescription, description);
        setText(selectors.detailTeacherLine, `Teacher: ${classItem.instructorName || 'Instructor unavailable'}`);
        setText(selectors.detailScheduleLine, scheduleText);
        applyStatusPill(classItem.status);

        setText(selectors.detailActivityCount, String(summary.activityCount || 0));
        setText(selectors.detailSubmittedCount, String(summary.submittedCount || 0));
        setText(selectors.detailOverdueCount, String(summary.overdueCount || 0));
        setText(
            selectors.detailNextDue,
            summary.nextDue ? formatDateTime(summary.nextDue.dueDate, 'No upcoming due activity') : 'No upcoming due activity'
        );
        setText(
            selectors.detailNextDueMeta,
            summary.nextDue ? summary.nextDue.quizTitle || 'Upcoming activity' : 'This class currently has no upcoming due activity.'
        );
        setText(
            selectors.detailResultsMeta,
            activities.length
                ? `Showing ${activities.length} visible activity item(s) for this class.`
                : 'No activities are assigned to this class yet.'
        );

        updateDetailSpotlight(summary, activities);
        renderDetailFacts(classItem);
        renderDetailActivities(activities);
        renderDetailMaterials(state.detailMaterials);
        setText(
            selectors.detailMaterialsMeta,
            state.detailMaterials.length
                ? `Showing ${state.detailMaterials.length} visible material(s) for this class.`
                : 'No visible class materials are available yet.'
        );

        const note = activities.length
            ? normalizeClassStatus(classItem.status) === 'archived'
                ? 'This class is archived. Existing activity history is still available here.'
                : 'Use Stream for updates, Classwork for assigned tasks, and Resources for supporting materials.'
            : 'No visible activities are assigned to this class yet. Check Stream and Resources for updates while you wait.';
        setText(selectors.detailNote, note);
    }

    function renderDetailError(message) {
        setText(selectors.detailTitle, 'Class not found');
        setText(selectors.detailDescription, message || 'This class is not available in your student workspace.');
        setText(selectors.detailTeacherLine, 'Teacher: Unavailable');
        setText(selectors.detailScheduleLine, 'Schedule not available');
        setText(selectors.detailSpotlightTitle, 'Class workspace unavailable');
        setText(selectors.detailSpotlightText, message || 'Unable to load the current class workspace.');
        const spotlightAction = byId(selectors.detailSpotlightAction);
        if (spotlightAction) {
            spotlightAction.textContent = 'Back to classes';
            spotlightAction.setAttribute('href', '/classes');
        }
        applyStatusPill('archived');
        setText(selectors.detailActivityCount, '0');
        setText(selectors.detailSubmittedCount, '0');
        setText(selectors.detailOverdueCount, '0');
        setText(selectors.detailNextDue, 'Unavailable');
        setText(selectors.detailNextDueMeta, message || 'Unable to load this class right now.');
        setText(selectors.detailResultsMeta, message || 'Unable to load this class right now.');
        setText(selectors.detailNote, message || 'Return to your classes hub and choose another class.');

        const activitiesContainer = byId(selectors.detailActivitiesList);
        if (activitiesContainer) {
            activitiesContainer.innerHTML = `<p class="student-empty-state">${escapeHtml(message || 'Unable to load this class right now.')}</p>`;
        }

        const factsContainer = byId(selectors.detailFacts);
        if (factsContainer) {
            factsContainer.innerHTML = `<p class="student-empty-state">${escapeHtml(message || 'Unable to load class facts right now.')}</p>`;
        }

        const announcementsContainer = byId(selectors.detailAnnouncementsList);
        if (announcementsContainer) {
            announcementsContainer.innerHTML = `<p class="student-empty-state">${escapeHtml(message || 'Unable to load announcements right now.')}</p>`;
        }
        setText(selectors.detailAnnouncementsMeta, message || 'Unable to load announcements right now.');

        const materialsContainer = byId(selectors.detailMaterialsList);
        if (materialsContainer) {
            materialsContainer.innerHTML = `<p class="student-empty-state">${escapeHtml(message || 'Unable to load materials right now.')}</p>`;
        }
        setText(selectors.detailMaterialsMeta, message || 'Unable to load materials right now.');
    }

    async function loadClassDetail() {
        const page = readPageData(selectors.detailPage);
        if (!page || !page.classId) {
            renderDetailError('Class not found.');
            return;
        }

        try {
            const [detailResponse, announcementResponse] = await Promise.all([
                fetch(`/api/student/classes/${encodeURIComponent(page.classId)}`, {
                    credentials: 'include',
                    cache: 'no-store'
                }),
                fetch(`/api/classes/${encodeURIComponent(page.classId)}/announcements`, {
                    credentials: 'include',
                    cache: 'no-store'
                })
            ]);
            const data = await readJsonResponse(detailResponse);
            const announcementsData = await readJsonResponse(announcementResponse);

            if (!detailResponse.ok || !data.success) {
                throw new Error(data.message || 'Unable to load this class right now.');
            }

            renderDetail(data);
            if (!announcementResponse.ok || !announcementsData.success) {
                setText(selectors.detailAnnouncementsMeta, announcementsData.message || 'Unable to load announcements right now.');
                const announcementsContainer = byId(selectors.detailAnnouncementsList);
                if (announcementsContainer) {
                    announcementsContainer.innerHTML = `<p class="student-empty-state">${escapeHtml(announcementsData.message || 'Unable to load announcements right now.')}</p>`;
                }
                return;
            }

            state.detailAnnouncementPermissions = announcementsData.permissions || {};
            state.detailAnnouncements = Array.isArray(announcementsData.announcements) ? announcementsData.announcements : [];
            setText(
                selectors.detailAnnouncementsMeta,
                state.detailAnnouncements.length
                    ? `Showing ${state.detailAnnouncements.length} announcement(s) for this class.`
                    : 'No announcements have been posted for this class yet.'
            );
            renderDetailAnnouncements();
        } catch (error) {
            console.error('Student class detail failed to load:', error);
            renderDetailError(error.message || 'Unable to load this class right now.');
        }
    }

    async function deleteAnnouncementComment(announcementId, commentId) {
        const page = readPageData(selectors.detailPage);
        const response = await fetch(
            `/api/classes/${encodeURIComponent(page.classId)}/announcements/${encodeURIComponent(announcementId)}/comments/${encodeURIComponent(commentId)}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        );
        const data = await readJsonResponse(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to delete comment.');
        }
    }

    async function submitAnnouncementComment(announcementId, body) {
        const page = readPageData(selectors.detailPage);
        const response = await fetch(
            `/api/classes/${encodeURIComponent(page.classId)}/announcements/${encodeURIComponent(announcementId)}/comments`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ body })
            }
        );
        const data = await readJsonResponse(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to post comment.');
        }
    }

    async function toggleAnnouncementLike(announcementId) {
        const page = readPageData(selectors.detailPage);
        const response = await fetch(
            `/api/classes/${encodeURIComponent(page.classId)}/announcements/${encodeURIComponent(announcementId)}/reactions/like`,
            {
                method: 'POST',
                credentials: 'include'
            }
        );
        const data = await readJsonResponse(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to update like.');
        }
    }

    async function handleDetailAnnouncementClick(event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) {
            return;
        }

        const action = actionButton.dataset.action;
        const announcementId = actionButton.dataset.announcementId || '';
        const commentId = actionButton.dataset.commentId || '';

        try {
            if (action === 'toggle-like') {
                await toggleAnnouncementLike(announcementId);
                await loadAnnouncementFeed(readPageData(selectors.detailPage)?.classId || '');
                return;
            }

            if (action === 'delete-comment') {
                await deleteAnnouncementComment(announcementId, commentId);
                await loadAnnouncementFeed(readPageData(selectors.detailPage)?.classId || '');
            }
        } catch (error) {
            console.error('Student announcement action failed:', error);
            setText(selectors.detailAnnouncementsMeta, error.message || 'Unable to update announcements right now.');
        }
    }

    async function handleDetailAnnouncementSubmit(event) {
        const commentForm = event.target.closest('.classes-announcement-comment-form');
        if (!commentForm) {
            return;
        }

        event.preventDefault();
        const announcementId = commentForm.dataset.announcementId || '';
        const body = commentForm.elements.body?.value.trim() || '';
        if (!body) {
            setText(selectors.detailAnnouncementsMeta, 'Comment body is required.');
            return;
        }

        try {
            await submitAnnouncementComment(announcementId, body);
            commentForm.reset();
            await loadAnnouncementFeed(readPageData(selectors.detailPage)?.classId || '');
        } catch (error) {
            console.error('Student announcement comment failed:', error);
            setText(selectors.detailAnnouncementsMeta, error.message || 'Unable to post comment right now.');
        }
    }

    function bindIndexJoinForm() {
        const joinForm = byId(selectors.joinForm);
        const joinInput = byId(selectors.joinInput);

        if (joinForm) {
            joinForm.addEventListener('submit', handleIndexJoinSubmit);
        }

        if (joinInput) {
            joinInput.addEventListener('input', () => {
                joinInput.value = joinInput.value.toUpperCase();
            });
        }
    }

    function init() {
        if (byId(selectors.indexPage)) {
            bindIndexJoinForm();
            loadClassesIndex();
        }

        if (byId(selectors.detailPage)) {
            bindDetailWorkspaceTabs();
            const announcementsList = byId(selectors.detailAnnouncementsList);
            if (announcementsList) {
                announcementsList.addEventListener('click', (event) => {
                    handleDetailAnnouncementClick(event);
                });
                announcementsList.addEventListener('submit', (event) => {
                    handleDetailAnnouncementSubmit(event);
                });
            }
            loadClassDetail();
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})(window);
