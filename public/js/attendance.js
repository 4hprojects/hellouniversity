(function attachStudentAttendance(global) {
    const state = {
        studentId: '',
        studentName: 'Student',
        rows: [],
        courses: [],
        loadError: ''
    };

    const selectors = {
        page: 'attendancePage',
        studentName: 'attendanceStudentName',
        studentIdLine: 'attendanceStudentIdLine',
        rolePill: 'attendanceRolePill',
        heroStatus: 'attendanceHeroStatus',
        totalCount: 'attendanceTotalCount',
        presentCount: 'attendancePresentCount',
        lateCount: 'attendanceLateCount',
        courseCount: 'attendanceCourseCount',
        latestRecord: 'attendanceLatestRecord',
        latestRecordMeta: 'attendanceLatestRecordMeta',
        courseSelect: 'attendanceCourseSelect',
        searchInput: 'attendanceSearchInput',
        clearFilters: 'attendanceClearFilters',
        resultsMeta: 'attendanceResultsMeta',
        cards: 'attendanceCards',
        tableWrap: 'attendanceTableWrap',
        resultsBody: 'attendanceResultsBody',
        emptyState: 'attendanceEmptyState',
        emptyStateIcon: 'attendanceEmptyStateIcon',
        emptyStateText: 'attendanceEmptyStateText',
        courseList: 'attendanceCourseList',
        courseListCount: 'attendanceCourseListCount',
        exportButton: 'attendanceExportButton',
        printButton: 'attendancePrintButton'
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

    function formatLatestRecord(row) {
        if (!row) {
            return 'No attendance records yet';
        }

        const courseLabel = row.courseID || row.courseDescription || 'Attendance record';
        return `${courseLabel} - ${row.attDate || 'No date'} ${row.attTime || ''}`.trim();
    }

    function getStatusPillMarkup(row) {
        const category = row.category || 'unknown';
        const label = row.attStatus || row.attRemarks || 'Unspecified';
        return `<span class="attendance-status-pill attendance-status-pill-${escapeHtml(category)}">${escapeHtml(label)}</span>`;
    }

    function setEmptyState(message, options = {}) {
        const emptyState = byId(selectors.emptyState);
        const emptyStateIcon = byId(selectors.emptyStateIcon);
        const emptyStateText = byId(selectors.emptyStateText);

        if (!emptyState) {
            return;
        }

        emptyState.classList.toggle('attendance-empty-state-error', options.variant === 'error');

        if (emptyStateIcon) {
            emptyStateIcon.textContent = options.icon || 'event_busy';
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
        emptyState.classList.remove('attendance-empty-state-error');
    }

    function getVisibleRows() {
        const courseFilter = String(byId(selectors.courseSelect)?.value || 'all');
        const query = String(byId(selectors.searchInput)?.value || '').trim().toLowerCase();

        return state.rows.filter((row) => {
            const matchesCourse = courseFilter === 'all' || row.courseID === courseFilter;
            if (!matchesCourse) {
                return false;
            }

            if (!query) {
                return true;
            }

            const haystack = [
                row.attDate,
                row.attTime,
                row.term,
                row.attRemarks,
                row.attStatus,
                row.courseID,
                row.courseDescription
            ].join(' ').toLowerCase();

            return haystack.includes(query);
        });
    }

    function updateSummary(rows) {
        const presentCount = rows.filter((row) => row.category === 'present').length;
        const lateCount = rows.filter((row) => row.category === 'late').length;
        const uniqueCourses = new Set(rows.map((row) => row.courseID || row.courseDescription).filter(Boolean));
        const latest = rows[0] || null;

        setText(selectors.totalCount, String(rows.length));
        setText(selectors.presentCount, String(presentCount));
        setText(selectors.lateCount, String(lateCount));
        setText(selectors.courseCount, String(uniqueCourses.size));
        setText(selectors.latestRecord, formatLatestRecord(latest));
        setText(
            selectors.latestRecordMeta,
            latest
                ? `${latest.attRemarks || latest.attStatus || 'Attendance recorded'}${latest.term ? ` - ${latest.term}` : ''}`
                : 'The newest attendance row will appear here after load.'
        );
    }

    function updateResultsMeta(rows) {
        const courseFilter = String(byId(selectors.courseSelect)?.value || 'all');
        const query = String(byId(selectors.searchInput)?.value || '').trim();

        if (!rows.length) {
            if (!state.rows.length) {
                setText(selectors.resultsMeta, 'No attendance records are available yet.');
                setText(selectors.heroStatus, 'No attendance records were found for your account.');
            } else {
                setText(selectors.resultsMeta, 'No attendance records match the current filters.');
                setText(selectors.heroStatus, 'No matching records in the current view.');
            }
            return;
        }

        if (courseFilter === 'all' && !query) {
            setText(selectors.resultsMeta, `Showing all ${rows.length} attendance record(s).`);
        } else {
            setText(selectors.resultsMeta, `Showing ${rows.length} filtered attendance record(s).`);
        }

        setText(selectors.heroStatus, `${rows.length} record(s) currently visible.`);
    }

    function getAttendanceCardMarkup(row) {
        return `
            <article class="attendance-record-card">
                <div class="attendance-record-card-top">
                    <strong>${escapeHtml(row.courseID || row.courseDescription || 'Course')}</strong>
                    ${getStatusPillMarkup(row)}
                </div>
                <dl class="attendance-record-grid">
                    <div>
                        <dt>Date</dt>
                        <dd>${escapeHtml(row.attDate || '--')}</dd>
                    </div>
                    <div>
                        <dt>Time</dt>
                        <dd>${escapeHtml(row.attTime || '--')}</dd>
                    </div>
                    <div>
                        <dt>Term</dt>
                        <dd>${escapeHtml(row.term || '--')}</dd>
                    </div>
                    <div>
                        <dt>Remarks</dt>
                        <dd>${escapeHtml(row.attRemarks || '--')}</dd>
                    </div>
                </dl>
            </article>
        `;
    }

    function renderTable(rows, emptyConfig = null) {
        const tbody = byId(selectors.resultsBody);
        const cards = byId(selectors.cards);
        const emptyState = byId(selectors.emptyState);
        const tableWrap = byId(selectors.tableWrap);

        if (!tbody || !cards || !emptyState || !tableWrap) {
            return;
        }

        if (!rows.length) {
            tbody.innerHTML = '';
            cards.innerHTML = '';
            cards.hidden = true;
            tableWrap.hidden = true;
            setEmptyState(
                emptyConfig?.message || 'No attendance records match the current filters.',
                emptyConfig || {}
            );
            return;
        }

        hideEmptyState();
        cards.hidden = false;
        tableWrap.hidden = false;
        cards.innerHTML = rows.map((row) => getAttendanceCardMarkup(row)).join('');
        tbody.innerHTML = rows.map((row) => `
            <tr>
                <td>${escapeHtml(row.attDate || '--')}</td>
                <td>${escapeHtml(row.attTime || '--')}</td>
                <td>${escapeHtml(row.term || '--')}</td>
                <td>${escapeHtml(row.attRemarks || '--')}</td>
                <td>${getStatusPillMarkup(row)}</td>
                <td>${escapeHtml(row.courseID || row.courseDescription || '--')}</td>
            </tr>
        `).join('');
    }

    function renderCourseList() {
        const container = byId(selectors.courseList);
        if (!container) {
            return;
        }

        if (!state.courses.length) {
            setText(selectors.courseListCount, '0 courses');
            container.innerHTML = '<p class="student-empty-state">No course IDs were found in your attendance data.</p>';
            return;
        }

        setText(selectors.courseListCount, `${state.courses.length} ${state.courses.length === 1 ? 'course' : 'courses'}`);
        container.innerHTML = state.courses.map((course) => `
            <article class="attendance-course-card">
                <strong>${escapeHtml(course.courseID || 'Course')}</strong>
                <p class="student-meta">${escapeHtml(course.courseDescription || 'Course description unavailable')}</p>
            </article>
        `).join('');
    }

    function renderCourseListError(message) {
        const container = byId(selectors.courseList);
        if (!container) {
            return;
        }

        setText(selectors.courseListCount, '0 courses');
        container.innerHTML = `<p class="student-empty-state">${escapeHtml(message)}</p>`;
    }

    function populateCourseFilter() {
        const select = byId(selectors.courseSelect);
        if (!select) {
            return;
        }

        const currentValue = select.value || 'all';
        const options = ['<option value="all">All courses</option>'].concat(
            state.courses.map((course) => `
                <option value="${escapeHtml(course.courseID)}">${escapeHtml(course.courseID || course.courseDescription || 'Course')}</option>
            `)
        );

        select.innerHTML = options.join('');
        if ([...select.options].some((option) => option.value === currentValue)) {
            select.value = currentValue;
        }
    }

    function applyFilters() {
        if (state.loadError) {
            renderTable([], {
                message: state.loadError,
                icon: 'error_outline',
                variant: 'error'
            });
            return;
        }

        const rows = getVisibleRows();
        updateSummary(rows);
        updateResultsMeta(rows);
        renderTable(
            rows,
            rows.length
                ? null
                : state.rows.length
                    ? {
                        message: 'No attendance records match the current filters.',
                        icon: 'event_busy'
                    }
                    : {
                        message: 'No attendance records are available yet.',
                        icon: 'event_available'
                    }
        );
    }

    function resetFilters() {
        const courseSelect = byId(selectors.courseSelect);
        const searchInput = byId(selectors.searchInput);

        if (courseSelect) {
            courseSelect.value = 'all';
        }

        if (searchInput) {
            searchInput.value = '';
        }
    }

    function applyLoadError(message) {
        const loadMessage = message || 'Unable to load attendance records right now.';
        const courseSelect = byId(selectors.courseSelect);

        state.rows = [];
        state.courses = [];
        state.loadError = loadMessage;
        resetFilters();

        if (courseSelect) {
            courseSelect.innerHTML = '<option value="all">All courses</option>';
            courseSelect.value = 'all';
        }

        updateSummary([]);
        setText(selectors.resultsMeta, loadMessage);
        setText(selectors.heroStatus, loadMessage);
        setText(selectors.latestRecord, 'Attendance data unavailable');
        setText(selectors.latestRecordMeta, loadMessage);
        renderCourseListError('Unable to load course summaries right now.');
        renderTable([], {
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

    function exportToExcel() {
        if (!global.XLSX) {
            setText(selectors.heroStatus, 'Excel export is not available right now.');
            return;
        }

        const rows = getVisibleRows();
        if (!rows.length) {
            setText(selectors.heroStatus, 'No attendance rows are available to export.');
            return;
        }

        const worksheetRows = [
            ['Attendance Summary'],
            [`Student: ${state.studentName}`],
            [`Student ID: ${state.studentId}`],
            [],
            ['Date', 'Time', 'Term', 'Remarks', 'Status', 'Subject']
        ].concat(rows.map((row) => [
            row.attDate || '',
            row.attTime || '',
            row.term || '',
            row.attRemarks || '',
            row.attStatus || '',
            row.courseID || row.courseDescription || ''
        ]));

        const worksheet = global.XLSX.utils.aoa_to_sheet(worksheetRows);
        const workbook = global.XLSX.utils.book_new();
        global.XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
        global.XLSX.writeFile(workbook, `${state.studentId || 'student'}_attendance.xlsx`);
    }

    function printCurrentView() {
        global.print();
    }

    async function loadAttendance() {
        try {
            const response = await fetch('/api/student/attendance', {
                credentials: 'include',
                cache: 'no-store'
            });
            const data = await readJsonResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load attendance records.');
            }

            state.rows = Array.isArray(data.rows) ? data.rows : [];
            state.courses = Array.isArray(data.courses) ? data.courses : [];
            state.studentId = data.studentIDNumber || state.studentId;
            state.loadError = '';

            setText(selectors.studentIdLine, `Student ID: ${state.studentId || 'N/A'}`);

            populateCourseFilter();
            renderCourseList();
            applyFilters();
        } catch (error) {
            console.error('Attendance page failed to load:', error);
            applyLoadError(
                error && error.message && error.message !== 'Failed to fetch'
                    ? error.message
                    : 'Unable to load attendance records right now.'
            );
        }
    }

    function attachEvents() {
        byId(selectors.courseSelect)?.addEventListener('change', applyFilters);
        byId(selectors.searchInput)?.addEventListener('input', applyFilters);
        byId(selectors.clearFilters)?.addEventListener('click', () => {
            resetFilters();
            applyFilters();
        });

        byId(selectors.exportButton)?.addEventListener('click', exportToExcel);
        byId(selectors.printButton)?.addEventListener('click', printCurrentView);
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
    }

    function init() {
        initPageIdentity();
        attachEvents();
        loadAttendance();
    }

    document.addEventListener('DOMContentLoaded', init);
})(window);
