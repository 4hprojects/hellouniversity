(function attachStudentDashboard(global) {
    const state = {
        studentId: '',
        grades: [],
        courses: [],
        joinedClasses: []
    };

    const selectors = {
        displayName: 'studentDisplayName',
        rolePill: 'studentRolePill',
        idLine: 'studentIdLine',
        courseCount: 'studentCourseCount',
        joinedClassCount: 'studentJoinedClassCount',
        joinedClassCountBadge: 'studentJoinedClassCountBadge',
        gradeCount: 'studentGradeCount',
        latestFinalGrade: 'studentLatestFinalGrade',
        latestUpdated: 'studentLatestUpdated',
        courseSelect: 'studentCourseSelect',
        courseList: 'studentCourseList',
        gradePanel: 'studentGradePanel',
        joinForm: 'studentJoinClassForm',
        joinCodeInput: 'studentJoinClassCode',
        joinButton: 'studentJoinClassButton',
        joinStatus: 'studentJoinClassStatus',
        joinedClassList: 'studentJoinedClassList'
    };

    async function init() {
        const courseSelect = document.getElementById(selectors.courseSelect);
        if (courseSelect) {
            courseSelect.addEventListener('change', () => {
                renderGradePanel(courseSelect.value);
            });
        }

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

        await loadStudentDetails();
    }

    async function loadStudentDetails() {
        try {
            const response = await fetch('/user-details', { credentials: 'include' });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success || !data.user) {
                throw new Error(data.message || 'Unable to load student details.');
            }

            const fullName = `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || 'Student';
            state.studentId = data.user.studentIDNumber || '';

            setText(selectors.displayName, fullName);
            setText(selectors.rolePill, data.user.role || 'student');
            setText(selectors.idLine, `Student ID: ${state.studentId || 'N/A'}`);

            const tasks = [loadJoinedClasses()];
            if (state.studentId) {
                tasks.push(loadGrades(state.studentId));
            } else {
                handleGradesUnavailable('Student ID is missing from the current session.');
                renderJoinStatus('Student ID is missing from your current session. Joining a class may not work right now.', 'error');
            }

            await Promise.allSettled(tasks);
        } catch (error) {
            console.error('Student dashboard initialization failed:', error);
            renderMessage(selectors.gradePanel, error.message || 'Unable to load dashboard right now.');
            renderMessage(selectors.courseList, 'Unable to load grade-based courses right now.');
            renderMessage(selectors.joinedClassList, 'Unable to load joined classes right now.');
            renderJoinStatus(error.message || 'Unable to initialize the dashboard right now.', 'error');
            setSummaryFallback();
            setJoinedClassCount(0);
        }
    }

    async function loadGrades(studentId) {
        try {
            const response = await fetch(`/get-grades/${encodeURIComponent(studentId)}`, { credentials: 'include' });
            const data = await safeParseJson(response);

            if (response.status === 404) {
                state.grades = [];
                state.courses = [];
                updateSummary();
                populateCourseSelect();
                renderCourseList();
                renderMessage(selectors.gradePanel, 'No grade records are available yet.');
                return;
            }

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load grades.');
            }

            state.grades = Array.isArray(data.gradeDataArray) ? data.gradeDataArray : [];
            state.courses = state.grades.map((item, index) => ({
                id: item.courseID || `course-${index + 1}`,
                description: item.courseDescription || 'Course description unavailable',
                grade: item
            }));

            updateSummary();
            populateCourseSelect();
            renderCourseList();

            if (state.courses.length > 0) {
                renderGradePanel(state.courses[0].id);
            } else {
                renderMessage(selectors.gradePanel, 'No grade records are available yet.');
            }
        } catch (error) {
            console.error('Unable to load grades:', error);
            handleGradesUnavailable(error.message || 'Unable to load grades right now.');
        }
    }

    async function loadJoinedClasses() {
        try {
            const response = await fetch('/api/classes?studentEnrolled=true', { credentials: 'include' });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load joined classes.');
            }

            state.joinedClasses = Array.isArray(data.classes)
                ? data.classes
                    .map((classItem) => ({
                        id: classItem._id?.$oid || classItem._id || '',
                        classCode: classItem.classCode || '',
                        className: classItem.className || 'Class name unavailable',
                        instructorName: classItem.instructorName || 'Instructor unavailable',
                        schedule: classItem.schedule || '',
                        time: classItem.time || '',
                        status: normalizeClassStatus(classItem.status),
                        studentCount: Array.isArray(classItem.students) ? classItem.students.length : 0
                    }))
                    .sort(compareClasses)
                : [];

            setJoinedClassCount(state.joinedClasses.length);
            renderJoinedClassList();
        } catch (error) {
            console.error('Unable to load joined classes:', error);
            state.joinedClasses = [];
            setJoinedClassCount(0);
            renderMessage(selectors.joinedClassList, error.message || 'Unable to load joined classes right now.');
        }
    }

    async function handleJoinFormSubmit(event) {
        event.preventDefault();

        const input = document.getElementById(selectors.joinCodeInput);
        if (!input) return;

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
            await loadJoinedClasses();
        } catch (error) {
            console.error('Unable to join class:', error);
            renderJoinStatus(error.message || 'Unable to join class right now.', 'error');
        } finally {
            setJoinPending(false);
        }
    }

    function handleGradesUnavailable(message) {
        state.grades = [];
        state.courses = [];
        updateSummary();
        populateCourseSelect();
        renderCourseList();
        renderMessage(selectors.gradePanel, message);
    }

    function updateSummary() {
        setText(selectors.courseCount, String(state.courses.length));
        setText(selectors.gradeCount, String(state.grades.length));

        const latestRecord = state.grades
            .slice()
            .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))[0];

        setText(selectors.latestFinalGrade, latestRecord?.totalFinalGrade || 'N/A');
        setText(selectors.latestUpdated, latestRecord?.createdAt ? formatDateTime(latestRecord.createdAt) : 'N/A');
    }

    function setJoinedClassCount(count) {
        const safeCount = Number.isFinite(Number(count)) ? String(count) : '0';
        setText(selectors.joinedClassCount, safeCount);
        setText(selectors.joinedClassCountBadge, safeCount);
    }

    function populateCourseSelect() {
        const select = document.getElementById(selectors.courseSelect);
        if (!select) return;

        if (state.courses.length === 0) {
            select.innerHTML = '<option value="">No grade-based courses available</option>';
            return;
        }

        select.innerHTML = state.courses.map((course) => `
            <option value="${escapeHtml(course.id)}">
                ${escapeHtml(course.id)} - ${escapeHtml(course.description)}
            </option>
        `).join('');
    }

    function renderCourseList() {
        const container = document.getElementById(selectors.courseList);
        if (!container) return;

        if (state.courses.length === 0) {
            renderMessage(selectors.courseList, 'No courses with grade records are available yet.');
            return;
        }

        container.innerHTML = state.courses.map((course) => `
            <article class="student-list-card">
                <div class="student-list-card-header">
                    <h3>${escapeHtml(course.id)}</h3>
                    <span class="student-badge student-badge-soft">${escapeHtml(course.grade.totalFinalGrade || 'N/A')}</span>
                </div>
                <p class="student-meta">${escapeHtml(course.description)}</p>
            </article>
        `).join('');
    }

    function renderJoinedClassList() {
        const container = document.getElementById(selectors.joinedClassList);
        if (!container) return;

        if (state.joinedClasses.length === 0) {
            renderMessage(selectors.joinedClassList, 'You have not joined any classes yet.');
            return;
        }

        container.innerHTML = state.joinedClasses.map((classItem) => {
            const classTitle = [classItem.classCode, classItem.className].filter(Boolean).join(' - ') || 'Class';
            const statusLabel = formatClassStatus(classItem.status);
            const scheduleText = [classItem.schedule, classItem.time].filter(Boolean).join(' | ');
            const classHref = classItem.id ? `/classes/${encodeURIComponent(classItem.id)}` : '/classes';

            return `
                <a href="${escapeHtml(classHref)}" class="student-list-card student-list-card-link">
                    <div class="student-list-card-header">
                        <h3>${escapeHtml(classTitle)}</h3>
                        <span class="student-badge student-badge-soft">${escapeHtml(statusLabel)}</span>
                    </div>
                    <div class="student-class-card-copy">
                        <div class="student-class-card-line">
                            <span class="material-icons" aria-hidden="true">co_present</span>
                            <p class="student-meta">${escapeHtml(classItem.instructorName || 'Instructor unavailable')}</p>
                        </div>
                        <div class="student-class-card-line">
                            <span class="material-icons" aria-hidden="true">schedule</span>
                            <p class="student-meta">${escapeHtml(scheduleText || 'Schedule not available')}</p>
                        </div>
                        <div class="student-class-card-line">
                            <span class="material-icons" aria-hidden="true">groups</span>
                            <p class="student-meta">${escapeHtml(`${classItem.studentCount} enrolled student${classItem.studentCount === 1 ? '' : 's'}`)}</p>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    }

    function renderGradePanel(courseId) {
        const panel = document.getElementById(selectors.gradePanel);
        if (!panel) return;

        const selectedCourse = state.courses.find((course) => course.id === courseId) || state.courses[0];
        if (!selectedCourse) {
            renderMessage(selectors.gradePanel, 'No grade records are available yet.');
            return;
        }

        const item = selectedCourse.grade;
        panel.innerHTML = `
            <div class="student-grade-header">
                <div>
                    <h3>${escapeHtml(selectedCourse.id)} - ${escapeHtml(selectedCourse.description)}</h3>
                    <p class="student-meta">Updated: ${escapeHtml(item.createdAt ? formatDateTime(item.createdAt) : 'N/A')}</p>
                </div>
                <span class="student-badge student-badge-live">Final Grade: ${escapeHtml(item.totalFinalGrade || 'N/A')}</span>
            </div>

            <div class="student-grade-table-wrap">
                <table class="student-grade-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Midterm</th>
                            <th>Finals</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>Attendance</td><td>${escapeHtml(item.midtermAttendance || 'N/A')}</td><td>${escapeHtml(item.finalsAttendance || 'N/A')}</td></tr>
                        <tr><td>Class Standing</td><td>${escapeHtml(item.midtermClassStanding || 'N/A')}</td><td>${escapeHtml(item.finalsClassStanding || 'N/A')}</td></tr>
                        <tr><td>Exams</td><td>${escapeHtml(item.midtermExam || 'N/A')}</td><td>${escapeHtml(item.finalExam || 'N/A')}</td></tr>
                        <tr><td>Computed Grade</td><td>${escapeHtml(item.midtermGrade || 'N/A')}</td><td>${escapeHtml(item.finalGrade || 'N/A')}</td></tr>
                        <tr><td>Transmuted Grade</td><td>${escapeHtml(item.transmutedMidtermGrade || 'N/A')}</td><td>${escapeHtml(item.transmutedFinalGrade || 'N/A')}</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderJoinStatus(message, tone) {
        const container = document.getElementById(selectors.joinStatus);
        if (!container) return;

        const resolvedTone = ['success', 'error', 'info'].includes(tone) ? tone : 'info';
        container.hidden = !message;
        container.className = `student-status student-status-${resolvedTone}`;
        container.textContent = message || '';
    }

    function renderMessage(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
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

    function setSummaryFallback() {
        setText(selectors.courseCount, '0');
        setText(selectors.gradeCount, '0');
        setText(selectors.latestFinalGrade, 'N/A');
        setText(selectors.latestUpdated, 'N/A');
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function formatDateTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(date);
    }

    function formatClassStatus(value) {
        const status = normalizeClassStatus(value);
        if (status === 'archived') {
            return 'Archived';
        }
        if (status === 'draft') {
            return 'Draft';
        }
        return 'Active';
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
