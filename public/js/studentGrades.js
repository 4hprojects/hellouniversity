(function attachStudentGrades(global) {
    const state = {
        displayName: 'Student',
        studentId: '',
        grades: [],
        courses: []
    };

    const selectors = {
        page: 'studentGradesPage',
        displayName: 'studentGradesDisplayName',
        courseCount: 'studentGradeCourseCount',
        courseMeta: 'studentGradeCourseMeta',
        latestFinal: 'studentGradeLatestFinal',
        latestMeta: 'studentGradeLatestMeta',
        latestUpdated: 'studentGradeLatestUpdated',
        courseSelect: 'studentGradeCourseSelect',
        gradePanel: 'studentGradePagePanel'
    };

    async function init() {
        initPageIdentity();

        const courseSelect = document.getElementById(selectors.courseSelect);
        if (courseSelect) {
            courseSelect.addEventListener('change', () => {
                renderGradePanel(courseSelect.value);
            });
        }

        if (state.studentId) {
            await loadGrades(state.studentId);
        } else {
            await refreshStudentProfile();

            if (state.studentId) {
                await loadGrades(state.studentId);
            } else {
                handleGradesUnavailable('Student ID is missing from the current session.');
            }
        }
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
    }

    async function loadGrades(studentId) {
        try {
            const response = await fetch(`/get-grades/${encodeURIComponent(studentId)}`, { credentials: 'include' });
            const data = await safeParseJson(response);

            if (response.status === 404) {
                state.grades = [];
                state.courses = [];
                updateGradeSummary();
                populateCourseSelect();
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

            updateGradeSummary();
            populateCourseSelect();

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

    function handleGradesUnavailable(message) {
        state.grades = [];
        state.courses = [];
        updateGradeSummary();
        populateCourseSelect();
        renderMessage(selectors.gradePanel, message);
    }

    function updateGradeSummary() {
        const latestRecord = getLatestGradeRecord();

        setText(selectors.courseCount, String(state.courses.length));
        setText(
            selectors.courseMeta,
            state.courses.length
                ? `${state.courses.length} course record${state.courses.length === 1 ? '' : 's'} available.`
                : 'No grade records are available yet.'
        );
        setText(selectors.latestFinal, latestRecord?.totalFinalGrade || 'N/A');
        setText(selectors.latestUpdated, formatDateTime(latestRecord?.createdAt, 'N/A'));
        setText(
            selectors.latestMeta,
            latestRecord
                ? `${latestRecord.courseID || 'Course'} updated ${formatDateTime(latestRecord.createdAt, 'N/A')}`
                : 'No grade records are available yet.'
        );
    }

    function populateCourseSelect() {
        const select = document.getElementById(selectors.courseSelect);
        if (!select) {
            return;
        }

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

    function renderGradePanel(courseId) {
        const panel = document.getElementById(selectors.gradePanel);
        if (!panel) {
            return;
        }

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

    function renderMessage(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }

        container.innerHTML = `<p class="student-empty-state">${escapeHtml(message)}</p>`;
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function getLatestGradeRecord() {
        return state.grades
            .slice()
            .sort((left, right) => getDateSortValue(right.createdAt) - getDateSortValue(left.createdAt))[0] || null;
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

    function getDateSortValue(value) {
        if (!isMeaningfulDateValue(value)) {
            return -1;
        }

        return new Date(value).getTime();
    }

    function isMeaningfulDateValue(value) {
        if (value === null || value === undefined || value === '' || value === 0 || value === '0') {
            return false;
        }

        const date = new Date(value);
        return !Number.isNaN(date.getTime()) && date.getTime() > 0;
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
