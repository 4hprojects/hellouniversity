(function attachTeacherClassOverview(global) {
    const state = {
        classItem: null,
        students: [],
        team: [],
        insights: null
    };

    function init() {
        loadOverview();
    }

    function getClassId() {
        return document.body?.dataset?.classId || '';
    }

    async function loadOverview() {
        await Promise.all([
            loadClassItem(),
            loadStudents(),
            loadTeam(),
            loadInsights()
        ]);
    }

    async function loadClassItem() {
        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success || !data.classItem) {
                throw new Error(data.message || 'Failed to load class.');
            }

            state.classItem = data.classItem;
            renderClassItem();
        } catch (error) {
            console.error('Teacher class overview load failed:', error);
            setText('teacherClassOverviewTitle', 'Class Overview');
            setText('teacherClassOverviewSubcopy', error.message || 'Unable to load class details.');
            setText('teacherClassOverviewStatus', 'Unavailable');
            setText('teacherClassOverviewCode', 'Class code unavailable');
            setText('teacherClassOverviewEnrollment', 'Enrollment unavailable');
        }
    }

    async function loadStudents() {
        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/students`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load students.');
            }

            state.students = Array.isArray(data.students) ? data.students : [];
            renderStudents();
        } catch (error) {
            console.error('Teacher class overview students load failed:', error);
            renderMessage('teacherClassOverviewStudentPreview', error.message || 'Unable to load students.');
        }
    }

    async function loadTeam() {
        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/team`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load teaching team.');
            }

            state.team = Array.isArray(data.team) ? data.team : [];
            renderTeam();
        } catch (error) {
            console.error('Teacher class overview team load failed:', error);
            renderMessage('teacherClassOverviewTeamPreview', error.message || 'Unable to load teaching team.');
        }
    }

    async function loadInsights() {
        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/insights`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load class insights.');
            }

            state.insights = data;
            renderInsights();
        } catch (error) {
            console.error('Teacher class overview insights load failed:', error);
            renderInsightsError(error.message || 'Unable to load class insights.');
        }
    }

    function renderClassItem() {
        const classItem = state.classItem;
        if (!classItem) {
            return;
        }

        const status = normalizeStatus(classItem.status);
        const scheduleText = buildScheduleText(classItem);
        const termText = buildTermText(classItem);
        const enrollmentText = classItem.selfEnrollmentEnabled !== false ? 'Enrollment open' : 'Enrollment closed';

        setText('teacherClassOverviewTitle', classItem.className || 'Class Overview');
        setText(
            'teacherClassOverviewSubcopy',
            `${classItem.courseCode || 'Course code not set'}${classItem.section ? ` | ${classItem.section}` : ''}${termText ? ` | ${termText}` : ''}`
        );
        setText('teacherClassOverviewStatus', formatStatus(status));
        setBadgeClass('teacherClassOverviewStatus', badgeClassForStatus(status));
        setText('teacherClassOverviewCode', classItem.classCode || 'Join code unavailable');
        setText('teacherClassOverviewEnrollment', enrollmentText);
        setBadgeClass('teacherClassOverviewEnrollment', classItem.selfEnrollmentEnabled !== false ? 'teacher-badge-live' : 'teacher-badge-muted');
        setText('teacherClassOverviewStudentCount', String(Number(classItem.studentCount || 0)));
        setText('teacherClassOverviewTeamCount', String(Number(classItem.teamCount || 0)));
        setText('teacherClassOverviewSchedule', scheduleText || 'Schedule not set');
        setText('teacherClassOverviewTerm', termText || 'Term not set');

        renderFacts([
            ['Course Code', classItem.courseCode || 'Not set'],
            ['Section', classItem.section || 'Not set'],
            ['Instructor', classItem.instructorName || 'Teacher'],
            ['Room', classItem.room || 'Not set'],
            ['Meeting Days', classItem.scheduleDays || 'Not set'],
            ['Meeting Time', classItem.scheduleTime || 'Not set']
        ]);

        const description = String(classItem.description || classItem.subjectDescription || '').trim();
        const descriptionNode = document.getElementById('teacherClassOverviewDescription');
        if (descriptionNode) {
            descriptionNode.textContent = description || 'No class description has been added yet.';
        }
    }

    function renderInsights() {
        const insights = state.insights;
        if (!insights) {
            return;
        }

        setText('teacherClassInsightsModuleCount', String(Number(insights.summary?.moduleCount || 0)));
        setText('teacherClassInsightsMaterialCount', String(Number(insights.summary?.materialCount || 0)));
        setText('teacherClassInsightsAnnouncementCount', String(Number(insights.summary?.announcementCount || 0)));
        setText('teacherClassInsightsQuizCount', String(Number(insights.summary?.assignedQuizCount || 0)));

        renderInsightStatus(insights.activityStatus || {}, insights.links || {});
        renderInsightEngagement(insights.engagement || {});
        renderRecentActivity(insights.recentActivity || []);
        renderInsightLinks(insights.links || {});
    }

    function renderInsightStatus(activityStatus, links) {
        const container = document.getElementById('teacherClassInsightsStatusCards');
        if (!container) {
            return;
        }

        const cards = [
            {
                title: 'Open Quizzes',
                value: Number(activityStatus.openQuizCount || 0),
                body: 'Assignments currently open for student work.',
                href: links.quizzes || '/teacher/quizzes'
            },
            {
                title: 'Due Soon',
                value: Number(activityStatus.dueSoonCount || 0),
                body: 'Assignments due in the next 7 days.',
                href: links.quizzes || '/teacher/quizzes'
            },
            {
                title: 'Overdue',
                value: Number(activityStatus.overdueCount || 0),
                body: 'Assignments whose due date has already passed.',
                href: links.quizzes || '/teacher/quizzes'
            },
            {
                title: 'Content Ready',
                value: activityStatus.materialsReady ? 'Yes' : 'No',
                body: activityStatus.materialsReady ? 'Students already have visible materials.' : 'Add visible materials for students.',
                href: links.materials || '#'
            },
            {
                title: 'Announcements Ready',
                value: activityStatus.announcementsReady ? 'Yes' : 'No',
                body: activityStatus.announcementsReady ? 'Class updates are already posted.' : 'Post the first class announcement.',
                href: links.announcements || '#'
            }
        ];

        container.innerHTML = cards.map((card) => `
            <a href="${escapeHtml(card.href)}" class="teacher-action-card">
                <span class="material-icons" aria-hidden="true">insights</span>
                <strong>${escapeHtml(card.title)}</strong>
                <span>${escapeHtml(String(card.value))}</span>
                <span>${escapeHtml(card.body)}</span>
            </a>
        `).join('');

        const metaParts = [];
        if (activityStatus.lastUpdatedAt) {
            metaParts.push(`Last updated ${formatDateTime(activityStatus.lastUpdatedAt)}`);
        }
        if (!activityStatus.materialsReady) {
            metaParts.push('Materials need attention');
        }
        if (!activityStatus.announcementsReady) {
            metaParts.push('Announcements not started');
        }
        setText('teacherClassInsightsStatusMeta', metaParts.join(' | ') || 'Class signals loaded.');
    }

    function renderInsightEngagement(engagement) {
        const container = document.getElementById('teacherClassInsightsEngagement');
        if (!container) {
            return;
        }

        const rows = [
            ['Students with submissions', String(Number(engagement.studentsWithSubmissions || 0))],
            ['Students without submissions', String(Number(engagement.studentsWithoutSubmissions || 0))],
            ['Average latest score', formatScore(engagement.averageLatestScore)],
            ['Average completion rate', formatPercent(engagement.averageCompletionRate)],
            ['Submissions in last 7 days', String(Number(engagement.recentSubmissionCount || 0))]
        ];

        container.innerHTML = rows.map(([label, value]) => `
            <div class="teacher-detail-row">
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
            </div>
        `).join('');
    }

    function renderRecentActivity(items) {
        const container = document.getElementById('teacherClassInsightsRecentActivity');
        if (!container) {
            return;
        }

        if (!Array.isArray(items) || !items.length) {
            container.innerHTML = '<p class="teacher-empty-state">No recent class activity is available yet.</p>';
            return;
        }

        container.innerHTML = items.map((item) => `
            <article class="teacher-list-card">
                <div class="teacher-list-card-header">
                    <h3>${escapeHtml(item.title || 'Class activity')}</h3>
                    <span class="teacher-badge teacher-badge-soft">${escapeHtml(formatActivityType(item.type))}</span>
                </div>
                <p class="teacher-meta">${escapeHtml(item.description || 'No details available.')}</p>
                <p class="teacher-meta">${escapeHtml(formatDateTime(item.timestamp))}</p>
                ${item.href ? `<a href="${escapeHtml(item.href)}" class="teacher-inline-link">Open</a>` : ''}
            </article>
        `).join('');
    }

    function renderInsightLinks(links) {
        const container = document.getElementById('teacherClassInsightsLinks');
        if (!container) {
            return;
        }

        const items = [
            { label: 'Students', href: links.students, icon: 'groups', body: 'Open the class roster.' },
            { label: 'Teaching Team', href: links.team, icon: 'co_present', body: 'Review collaborator access.' },
            { label: 'Modules', href: links.modules, icon: 'view_list', body: 'Organize the class structure.' },
            { label: 'Materials', href: links.materials, icon: 'folder', body: 'Manage visible resources.' },
            { label: 'Announcements', href: links.announcements, icon: 'campaign', body: 'Post updates to the class feed.' },
            { label: 'Quizzes', href: links.quizzes, icon: 'quiz', body: 'Review linked assessments.' }
        ].filter((item) => item.href);

        container.innerHTML = items.map((item) => `
            <a href="${escapeHtml(item.href)}" class="teacher-action-card">
                <span class="material-icons" aria-hidden="true">${escapeHtml(item.icon)}</span>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.body)}</span>
            </a>
        `).join('');
    }

    function renderInsightsError(message) {
        setText('teacherClassInsightsStatusMeta', message);
        renderMessage('teacherClassInsightsStatusCards', message);
        renderMessage('teacherClassInsightsEngagement', message);
        renderMessage('teacherClassInsightsRecentActivity', message);
        renderMessage('teacherClassInsightsLinks', message);
    }

    function renderFacts(entries) {
        const container = document.getElementById('teacherClassOverviewFacts');
        if (!container) {
            return;
        }

        container.innerHTML = entries.map(([label, value]) => `
            <div class="teacher-detail-row">
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
            </div>
        `).join('');
    }

    function renderStudents() {
        const container = document.getElementById('teacherClassOverviewStudentPreview');
        if (!container) {
            return;
        }

        if (state.students.length === 0) {
            container.innerHTML = '<p class="teacher-empty-state">No students are enrolled yet.</p>';
            return;
        }

        container.innerHTML = state.students.slice(0, 5).map((student) => `
            <article class="teacher-list-card">
                <div class="teacher-list-card-header">
                    <h3>${escapeHtml(formatStudentName(student))}</h3>
                    <span class="teacher-badge teacher-badge-soft">${escapeHtml(student.studentIDNumber || 'Student')}</span>
                </div>
                <p class="teacher-meta">${escapeHtml(student.emaildb || 'Email not available')}</p>
            </article>
        `).join('');
    }

    function renderTeam() {
        const container = document.getElementById('teacherClassOverviewTeamPreview');
        if (!container) {
            return;
        }

        if (state.team.length === 0) {
            container.innerHTML = '<p class="teacher-empty-state">No teaching team members are assigned yet.</p>';
            return;
        }

        container.innerHTML = state.team.slice(0, 5).map((member) => `
            <article class="teacher-list-card">
                <div class="teacher-list-card-header">
                    <h3>${escapeHtml(member.name || 'Teacher')}</h3>
                    <span class="teacher-badge ${member.role === 'owner' ? 'teacher-badge-soft' : 'teacher-badge-live'}">${escapeHtml(formatRole(member.role))}</span>
                </div>
                <p class="teacher-meta">${escapeHtml(member.emaildb || 'Email not available')}</p>
            </article>
        `).join('');
    }

    function renderMessage(id, message) {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `<p class="teacher-empty-state">${escapeHtml(message)}</p>`;
        }
    }

    function buildScheduleText(classItem) {
        const parts = [
            classItem.scheduleDays || '',
            classItem.scheduleTime || '',
            classItem.room ? `Room ${classItem.room}` : ''
        ].filter(Boolean);
        return parts.join(' | ');
    }

    function buildTermText(classItem) {
        const parts = [
            classItem.termSystem ? formatTermSystem(classItem.termSystem) : '',
            classItem.academicTerm || ''
        ].filter(Boolean);
        return parts.join(' | ');
    }

    function normalizeStatus(value) {
        const normalized = String(value || 'active').trim().toLowerCase();
        if (normalized === 'draft' || normalized === 'archived') {
            return normalized;
        }
        return 'active';
    }

    function badgeClassForStatus(status) {
        if (status === 'draft') {
            return 'teacher-badge-draft';
        }
        if (status === 'archived') {
            return 'teacher-badge-muted';
        }
        return 'teacher-badge-live';
    }

    function formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    function formatTermSystem(value) {
        switch (String(value || '').toLowerCase()) {
        case 'semester':
            return 'Semester';
        case 'trimester':
            return 'Trimester';
        case 'quarter':
            return 'Quarter';
        default:
            return String(value || '');
        }
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
            return 'Teacher';
        }
    }

    function formatStudentName(student) {
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
        return fullName || 'Unnamed Student';
    }

    function formatActivityType(type) {
        switch (String(type || '').toLowerCase()) {
        case 'announcement':
            return 'Announcement';
        case 'material':
            return 'Material';
        case 'submission':
            return 'Submission';
        case 'log':
            return 'System';
        default:
            return 'Activity';
        }
    }

    function formatDateTime(value) {
        const timestamp = new Date(value || '').getTime();
        if (Number.isNaN(timestamp) || !timestamp) {
            return 'Unknown time';
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

    function formatPercent(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return 'N/A';
        }
        return `${Math.round(numeric * 100)}%`;
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function setBadgeClass(id, nextClassName) {
        const element = document.getElementById(id);
        if (!element) {
            return;
        }

        element.classList.remove('teacher-badge-live', 'teacher-badge-draft', 'teacher-badge-muted', 'teacher-badge-soft');
        element.classList.add('teacher-badge', nextClassName);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    document.addEventListener('DOMContentLoaded', init);
    global.teacherClassOverview = { init };
})(window);
