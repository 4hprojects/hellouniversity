(function attachTeacherDashboard(global) {
    const state = {
        sidebarPreference: null
    };

    const selectors = {
        name: 'teacherDisplayName',
        role: 'teacherRolePill',
        idLine: 'teacherIdLine',
        layout: 'teacherDashboardLayout',
        sidebar: 'teacherDashboardSidebar',
        sidebarToggle: 'teacherDashboardSidebarToggle',
        sidebarToggleIcon: 'teacherDashboardSidebarToggleIcon',
        classCount: 'teacherClassCount',
        studentCount: 'teacherStudentCount',
        activeQuizCount: 'teacherActiveQuizCount',
        draftQuizCount: 'teacherDraftQuizCount',
        pendingGradingCount: 'teacherPendingGradingCount',
        lessonCount: 'teacherLessonCount',
        classList: 'teacherClassList',
        quizList: 'teacherQuizList'
    };

    async function init() {
        attachSidebarToggle();
        updateAdaptiveSidebarMode();
        window.addEventListener('resize', updateAdaptiveSidebarMode);

        await Promise.all([
            loadTeacherProfile(),
            loadClasses(),
            loadQuizzes()
        ]);
    }

    async function loadTeacherProfile() {
        try {
            const response = await fetch('/user-details', { credentials: 'include' });
            const data = await response.json();
            if (!response.ok || !data.success || !data.user) {
                return;
            }

            const fullName = `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || 'Teacher';
            setText(selectors.name, fullName);
            setText(selectors.role, data.user.role || 'teacher');
            setText(selectors.idLine, `Teacher ID: ${data.user.studentIDNumber || 'N/A'}`);
        } catch (error) {
            console.error('Teacher profile load failed:', error);
        }
    }

    async function loadClasses() {
        try {
            const response = await fetch('/api/teacher/classes', { credentials: 'include' });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load classes.');
            }

            const classes = Array.isArray(data.classes) ? data.classes : [];
            const totalStudents = classes.reduce(
                (sum, item) => sum + Number(item.studentCount || (Array.isArray(item.students) ? item.students.length : 0)),
                0
            );

            setText(selectors.classCount, String(classes.length));
            setText(selectors.studentCount, String(totalStudents));
            renderClasses(classes);
        } catch (error) {
            console.error('Teacher classes load failed:', error);
            setText(selectors.classCount, '0');
            setText(selectors.studentCount, '0');
            renderMessage(selectors.classList, 'Unable to load classes right now.');
        }
    }

    async function loadQuizzes() {
        try {
            const response = await fetch('/api/quiz-builder/quizzes', { credentials: 'include' });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load quizzes.');
            }

            const quizzes = Array.isArray(data.quizzes) ? data.quizzes : [];
            const activeCount = quizzes.filter((quiz) => quiz.status === 'published').length;
            const draftCount = quizzes.filter((quiz) => quiz.status !== 'published').length;

            setText(selectors.activeQuizCount, String(activeCount));
            setText(selectors.draftQuizCount, String(draftCount));
            setText(selectors.pendingGradingCount, 'Scaffold');
            setText(selectors.lessonCount, 'Scaffold');
            renderQuizzes(quizzes);
        } catch (error) {
            console.error('Teacher quizzes load failed:', error);
            setText(selectors.activeQuizCount, '0');
            setText(selectors.draftQuizCount, '0');
            setText(selectors.pendingGradingCount, 'Scaffold');
            setText(selectors.lessonCount, 'Scaffold');
            renderMessage(selectors.quizList, 'Unable to load quizzes right now.');
        }
    }

    function renderClasses(classes) {
        const container = document.getElementById(selectors.classList);
        if (!container) return;

        if (classes.length === 0) {
            renderMessage(selectors.classList, 'No classes assigned yet.');
            return;
        }

        container.innerHTML = classes.slice(0, 5).map((item) => `
            <article class="teacher-list-card">
                <div class="teacher-list-card-header">
                    <h3>${escapeHtml(item.className || 'Untitled Class')}</h3>
                    <span class="teacher-badge teacher-badge-soft">${escapeHtml(item.classCode || 'Class')}</span>
                </div>
                <p class="teacher-meta">${escapeHtml(item.section || 'Section not set')}${item.academicTerm ? ` | ${escapeHtml(item.academicTerm)}` : ''}</p>
                <p class="teacher-meta">${escapeHtml(item.scheduleDays || 'Days not set')}${item.scheduleTime ? ` | ${escapeHtml(item.scheduleTime)}` : ''}</p>
                <p class="teacher-meta">${Number(item.studentCount || (Array.isArray(item.students) ? item.students.length : 0))} enrolled student(s)</p>
                <div class="teacher-card-actions">
                    <a href="/teacher/classes/${encodeURIComponent(item._id)}" class="teacher-btn teacher-btn-primary teacher-btn-small">Open</a>
                    <a href="/teacher/classes/${encodeURIComponent(item._id)}/edit" class="teacher-btn teacher-btn-secondary teacher-btn-small">Edit</a>
                    <a href="/teacher/classes/${encodeURIComponent(item._id)}/students" class="teacher-btn teacher-btn-secondary teacher-btn-small">Students</a>
                    <a href="/teacher/classes/${encodeURIComponent(item._id)}/team" class="teacher-btn teacher-btn-secondary teacher-btn-small">Team</a>
                </div>
            </article>
        `).join('');
    }

    function renderQuizzes(quizzes) {
        const container = document.getElementById(selectors.quizList);
        if (!container) return;

        if (quizzes.length === 0) {
            renderMessage(selectors.quizList, 'No quizzes created yet.');
            return;
        }

        container.innerHTML = quizzes
            .slice()
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 5)
            .map((quiz) => {
                const status = quiz.status === 'published' ? 'Published' : (quiz.status || 'Draft');
                const questionCount = Number(quiz.questionCount || 0);
                return `
                    <article class="teacher-list-card">
                        <div class="teacher-list-card-header">
                            <h3>${escapeHtml(quiz.title || quiz.quizTitle || 'Untitled Quiz')}</h3>
                            <span class="teacher-badge ${quiz.status === 'published' ? 'teacher-badge-live' : 'teacher-badge-muted'}">${escapeHtml(status)}</span>
                        </div>
                        <p class="teacher-meta">${questionCount} question(s)</p>
                        <p class="teacher-meta">${escapeHtml(quiz.classLabel || 'No class assigned')}</p>
                    </article>
                `;
            })
            .join('');
    }

    function renderMessage(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `<p class="teacher-empty-state">${escapeHtml(message)}</p>`;
    }

    function attachSidebarToggle() {
        const sidebar = document.getElementById(selectors.sidebar);
        const toggle = document.getElementById(selectors.sidebarToggle);
        if (!sidebar || !toggle) return;

        toggle.addEventListener('click', () => {
            const willCollapse = !sidebar.classList.contains('teacher-dashboard-sidebar-collapsed');
            state.sidebarPreference = willCollapse ? 'collapsed' : 'expanded';
            applySidebarState(willCollapse);
        });
    }

    function updateAdaptiveSidebarMode() {
        const layout = document.getElementById(selectors.layout);
        const sidebar = document.getElementById(selectors.sidebar);
        if (!layout || !sidebar) return;

        const layoutWidth = layout.clientWidth || 0;
        const isCompactViewport = window.innerWidth <= 980;
        const shouldAutoCollapse = !isCompactViewport && layoutWidth > 0 && layoutWidth < 1120;
        sidebar.classList.toggle('teacher-dashboard-sidebar-auto', shouldAutoCollapse);

        if (isCompactViewport) {
            applySidebarState(false);
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
        if (!sidebar || !toggle) return;

        sidebar.classList.toggle('teacher-dashboard-sidebar-collapsed', isCollapsed);
        toggle.setAttribute('aria-expanded', String(!isCollapsed));
        toggle.setAttribute('aria-label', isCollapsed ? 'Expand teacher menu' : 'Collapse teacher menu');
        toggle.setAttribute('title', isCollapsed ? 'Expand teacher menu' : 'Collapse teacher menu');
        if (icon) {
            icon.textContent = isCollapsed ? '\u2630' : '\u2190';
        }
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
    global.teacherDashboard = { init };
})(window);
