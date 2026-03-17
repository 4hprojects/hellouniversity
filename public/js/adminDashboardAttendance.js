(function attachAdminDashboardAttendance(global) {
    const state = {
        rows: [],
        totalRows: 0
    };

    function init() {
        bindEvents();
        initializeDate();
        loadCourses();
    }

    function bindEvents() {
        const loadButton = document.getElementById('attendanceLoadButton');
        const resetButton = document.getElementById('attendanceResetButton');
        const searchInput = document.getElementById('attendanceSearchInput');

        if (loadButton) {
            loadButton.addEventListener('click', loadAttendanceRecords);
        }

        if (resetButton) {
            resetButton.addEventListener('click', resetAttendancePanel);
        }

        [
            'attendanceSearchInput',
            'attendanceCourseSelect',
            'attendanceDateInput',
            'attendanceTermSelect',
            'attendanceStatusSelect'
        ].forEach((id) => {
            const element = document.getElementById(id);
            if (!element) return;

            const eventName = element.tagName === 'INPUT' ? 'keydown' : 'change';
            element.addEventListener(eventName, (event) => {
                if (eventName === 'keydown' && event.key !== 'Enter') {
                    return;
                }
                if (eventName === 'keydown') {
                    event.preventDefault();
                }
                loadAttendanceRecords();
            });
        });

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if (!searchInput.value.trim() && state.rows.length > 0) {
                    setMeta(`Showing ${state.rows.length} of ${state.totalRows} attendance record(s).`);
                }
            });
        }
    }

    function initializeDate() {
        const dateInput = document.getElementById('attendanceDateInput');
        if (!dateInput) return;
        dateInput.value = '';
    }

    async function loadCourses() {
        const courseSelect = document.getElementById('attendanceCourseSelect');
        if (!courseSelect) return;

        try {
            const response = await fetch('/api/admin/attendance/courses', {
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load attendance courses.');
            }

            const courses = Array.isArray(data.courses) ? data.courses : [];

            courseSelect.innerHTML = [
                '<option value="">All Courses</option>',
                ...courses.map((course) => {
                    const courseId = escapeHtml(course.courseID || '');
                    const label = course.courseDescription
                        ? `${courseId} - ${escapeHtml(course.courseDescription)}`
                        : courseId;
                    return `<option value="${courseId}">${label}</option>`;
                })
            ].join('');
        } catch (error) {
            console.error('Attendance course load failed:', error);
            courseSelect.innerHTML = '<option value="">Unable to load courses</option>';
            global.adminDashboardPanels?.showFlash(error.message || 'Failed to load attendance courses.', 'error');
        }
    }

    async function loadAttendanceRecords() {
        const params = new URLSearchParams({
            query: getValue('attendanceSearchInput'),
            courseID: getValue('attendanceCourseSelect'),
            date: getValue('attendanceDateInput'),
            term: getValue('attendanceTermSelect'),
            status: getValue('attendanceStatusSelect'),
            limit: '100'
        });

        setMeta('Loading attendance records...');

        try {
            const response = await fetch(`/api/admin/attendance?${params.toString()}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load attendance records.');
            }

            state.rows = Array.isArray(data.rows) ? data.rows : [];
            state.totalRows = data.pagination?.total || state.rows.length;

            renderRows();
            updateCounters();

            if (state.rows.length === 0) {
                setMeta('No attendance records found for the current filters.');
                return;
            }

            setMeta(`Showing ${state.rows.length} of ${state.totalRows} attendance record(s).`);
        } catch (error) {
            console.error('Attendance records load failed:', error);
            state.rows = [];
            state.totalRows = 0;
            renderEmptyState(error.message || 'Failed to load attendance records.');
            resetCounters();
            setMeta('Attendance records failed to load.');
            global.adminDashboardPanels?.showFlash(error.message || 'Failed to load attendance records.', 'error');
        }
    }

    function renderRows() {
        const tbody = document.getElementById('attendanceResults');
        if (!tbody) return;

        if (state.rows.length === 0) {
            renderEmptyState('No attendance records found for the current filters.');
            return;
        }

        tbody.innerHTML = state.rows.map((row) => `
            <tr>
                <td>${escapeHtml(row.studentIDNumber || 'N/A')}</td>
                <td>${escapeHtml(formatName(row.firstName, row.lastName))}</td>
                <td>${escapeHtml(row.courseID || 'N/A')}</td>
                <td>${escapeHtml(row.courseDescription || 'N/A')}</td>
                <td>${escapeHtml(row.attDate || 'N/A')}</td>
                <td>${escapeHtml(row.attTime || 'N/A')}</td>
                <td>${escapeHtml(row.attStatus || 'N/A')}</td>
                <td>${escapeHtml(row.attRemarks || '-')}</td>
                <td>${escapeHtml(row.term || 'N/A')}</td>
            </tr>
        `).join('');
    }

    function updateCounters() {
        const uniqueCourses = new Set();
        let onTimeCount = 0;
        let lateCount = 0;
        let remarksCount = 0;

        state.rows.forEach((row) => {
            if (row.courseID) {
                uniqueCourses.add(row.courseID);
            }

            if (String(row.attStatus || '').toLowerCase() === 'on time') {
                onTimeCount += 1;
            }

            if (String(row.attStatus || '').toLowerCase() === 'late') {
                lateCount += 1;
            }

            if (String(row.attRemarks || '').trim()) {
                remarksCount += 1;
            }
        });

        setCounter('attendanceTotalCount', state.rows.length);
        setCounter('attendanceOnTimeCount', onTimeCount);
        setCounter('attendanceLateCount', lateCount);
        setCounter('attendanceRemarksCount', remarksCount);
        setCounter('attendanceCourseCount', uniqueCourses.size);
        global.adminDashboardPanels?.updateSummary({ attendanceCount: state.totalRows });
    }

    function resetCounters() {
        setCounter('attendanceTotalCount', 0);
        setCounter('attendanceOnTimeCount', 0);
        setCounter('attendanceLateCount', 0);
        setCounter('attendanceRemarksCount', 0);
        setCounter('attendanceCourseCount', 0);
        global.adminDashboardPanels?.updateSummary({ attendanceCount: 0 });
    }

    function resetAttendancePanel() {
        state.rows = [];
        state.totalRows = 0;

        [
            'attendanceSearchInput',
            'attendanceCourseSelect',
            'attendanceDateInput'
        ].forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });

        [
            'attendanceTermSelect',
            'attendanceStatusSelect'
        ].forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });

        renderEmptyState('Use any filter and load attendance records.');
        resetCounters();
        setMeta('Use any filter and load attendance records.');
    }

    function renderEmptyState(message) {
        const tbody = document.getElementById('attendanceResults');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="9" class="no-data">${escapeHtml(message)}</td></tr>`;
    }

    function setCounter(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = String(value);
        }
    }

    function setMeta(message) {
        const meta = document.getElementById('attendanceMeta');
        if (meta) {
            meta.textContent = message;
        }
    }

    function getValue(id) {
        const element = document.getElementById(id);
        return element ? String(element.value || '').trim() : '';
    }

    function formatName(firstName, lastName) {
        const fullName = `${firstName || ''} ${lastName || ''}`.trim();
        return fullName || 'N/A';
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    global.adminDashboardAttendance = {
        init
    };
})(window);
