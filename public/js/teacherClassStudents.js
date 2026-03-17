(function attachTeacherClassStudents(global) {
    const state = {
        classItem: null,
        students: [],
        previewItems: [],
        addableStudentIDs: []
    };

    function init() {
        document.getElementById('teacherRosterOpenAddModalButton')?.addEventListener('click', openAddModal);
        document.getElementById('teacherRosterCloseModalButton')?.addEventListener('click', closeAddModal);
        document.getElementById('teacherRosterPreviewButton')?.addEventListener('click', previewStudents);
        document.getElementById('teacherRosterConfirmAddButton')?.addEventListener('click', confirmAddStudents);
        document.getElementById('teacherRosterModal')?.addEventListener('click', handleModalClick);
        document.addEventListener('keydown', handleKeydown);
        loadClass();
        loadStudents();
    }

    function getClassId() {
        return document.body?.dataset?.classId || '';
    }

    async function loadClass() {
        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success || !data.classItem) {
                throw new Error(data.message || 'Failed to load class.');
            }

            state.classItem = data.classItem;
            document.getElementById('teacherRosterTitle').textContent = `${data.classItem.className || 'Class'} Roster`;
            document.getElementById('teacherRosterJoinCode').textContent = data.classItem.classCode || '-';
        } catch (error) {
            console.error('Teacher roster class load failed:', error);
            setStatus(error.message || 'Unable to load class details.');
        }
    }

    async function loadStudents() {
        setStatus('Loading class roster...');

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
            setStatus(`${state.students.length} enrolled student(s).`);
        } catch (error) {
            console.error('Teacher roster load failed:', error);
            state.students = [];
            renderStudents();
            setStatus(error.message || 'Unable to load students.');
        }
    }

    function openAddModal() {
        const modal = document.getElementById('teacherRosterModal');
        if (!modal) return;

        modal.hidden = false;
        document.body.classList.add('teacher-modal-open');
        document.getElementById('teacherRosterAddInput')?.focus();
    }

    function closeAddModal() {
        const modal = document.getElementById('teacherRosterModal');
        if (!modal) return;

        modal.hidden = true;
        document.body.classList.remove('teacher-modal-open');
    }

    function handleModalClick(event) {
        if (event.target?.dataset?.closeModal === 'true') {
            closeAddModal();
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Escape' && !document.getElementById('teacherRosterModal')?.hidden) {
            closeAddModal();
        }
    }

    function parseInputIds() {
        const input = document.getElementById('teacherRosterAddInput');
        const raw = input?.value?.trim() || '';
        if (!raw) {
            setPreviewStatus('Enter at least one student ID.');
            return [];
        }

        return raw.split(',').map((value) => value.trim()).filter(Boolean);
    }

    async function previewStudents() {
        const studentIDs = parseInputIds();
        if (studentIDs.length === 0) {
            state.previewItems = [];
            state.addableStudentIDs = [];
            renderPreview();
            return;
        }

        setPreviewStatus('Checking student records...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/students/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ studentIDs })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to preview students.');
            }

            state.previewItems = Array.isArray(data.previewItems) ? data.previewItems : [];
            state.addableStudentIDs = Array.isArray(data.addableStudentIDs) ? data.addableStudentIDs : [];
            renderPreview(data.summary || null);
            setPreviewStatus(buildPreviewMessage(data.summary || null));
        } catch (error) {
            console.error('Teacher roster preview students failed:', error);
            state.previewItems = [];
            state.addableStudentIDs = [];
            renderPreview();
            setPreviewStatus(error.message || 'Unable to preview students.');
        }
    }

    async function confirmAddStudents() {
        if (state.addableStudentIDs.length === 0) {
            setPreviewStatus('Preview at least one valid student before adding.');
            return;
        }

        setPreviewStatus('Adding selected students...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ studentIDs: state.addableStudentIDs })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to add students.');
            }

            const input = document.getElementById('teacherRosterAddInput');
            if (input) input.value = '';
            state.previewItems = [];
            state.addableStudentIDs = [];
            renderPreview();
            closeAddModal();
            setStatus(data.message || 'Students added successfully.');
            await loadStudents();
        } catch (error) {
            console.error('Teacher roster add students failed:', error);
            setPreviewStatus(error.message || 'Unable to add students.');
        }
    }

    async function removeStudent(studentIDNumber) {
        setStatus(`Removing ${studentIDNumber}...`);

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/students/${encodeURIComponent(studentIDNumber)}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to remove student.');
            }

            await loadStudents();
        } catch (error) {
            console.error('Teacher roster remove student failed:', error);
            setStatus(error.message || 'Unable to remove student.');
        }
    }

    function renderStudents() {
        const tbody = document.getElementById('teacherRosterTableBody');
        if (!tbody) return;

        document.getElementById('teacherRosterCount').textContent = String(state.students.length);

        if (state.students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="teacher-meta">No enrolled students yet.</td></tr>';
            return;
        }

        tbody.innerHTML = state.students.map((student) => `
            <tr>
                <td>${escapeHtml(student.studentIDNumber || 'N/A')}</td>
                <td>${escapeHtml(formatName(student.firstName, student.lastName))}</td>
                <td>${escapeHtml(student.emaildb || 'N/A')}</td>
                <td>${escapeHtml(student.status || 'enrolled')}</td>
                <td><button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-student-id="${escapeHtml(student.studentIDNumber || '')}">Remove</button></td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-student-id]').forEach((button) => {
            button.addEventListener('click', () => removeStudent(button.dataset.studentId));
        });
    }

    function renderPreview(summary) {
        const tbody = document.getElementById('teacherRosterPreviewTableBody');
        const confirmButton = document.getElementById('teacherRosterConfirmAddButton');
        if (!tbody) return;

        const defaultSummary = summary || {
            ready: 0,
            already_enrolled: 0,
            invalid: 0,
            not_found: 0,
            not_student: 0
        };

        document.getElementById('teacherPreviewReadyCount').textContent = String(defaultSummary.ready || 0);
        document.getElementById('teacherPreviewEnrolledCount').textContent = String(defaultSummary.already_enrolled || 0);
        document.getElementById('teacherPreviewRejectedCount').textContent = String(
            (defaultSummary.invalid || 0) + (defaultSummary.not_found || 0) + (defaultSummary.not_student || 0)
        );

        if (confirmButton) {
            confirmButton.disabled = state.addableStudentIDs.length === 0;
        }

        if (state.previewItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="teacher-meta">No preview yet.</td></tr>';
            return;
        }

        tbody.innerHTML = state.previewItems.map((student) => `
            <tr>
                <td>${escapeHtml(student.studentIDNumber || 'N/A')}</td>
                <td>${escapeHtml(formatName(student.firstName, student.lastName))}</td>
                <td>${escapeHtml(student.emaildb || 'N/A')}</td>
                <td><span class="teacher-badge ${previewStatusBadgeClass(student.status)}">${escapeHtml(student.label || 'Pending')}</span></td>
            </tr>
        `).join('');
    }

    function setStatus(message) {
        const element = document.getElementById('teacherRosterStatus');
        if (element) element.textContent = message;
    }

    function setPreviewStatus(message) {
        const element = document.getElementById('teacherRosterPreviewStatus');
        if (element) element.textContent = message;
    }

    function buildPreviewMessage(summary) {
        if (!summary) {
            return 'Preview loaded.';
        }

        if (summary.ready > 0) {
            return `${summary.ready} student(s) ready to add. Review the list below before confirming.`;
        }

        return 'No new students are ready to add. Review the preview results below.';
    }

    function formatName(firstName, lastName) {
        const fullName = `${firstName || ''} ${lastName || ''}`.trim();
        return fullName || 'Unnamed Student';
    }

    function previewStatusBadgeClass(status) {
        switch (status) {
        case 'ready':
            return 'teacher-badge-live';
        case 'already_enrolled':
            return 'teacher-badge-soft';
        case 'invalid':
        case 'not_found':
        case 'not_student':
            return 'teacher-badge-muted';
        default:
            return 'teacher-badge-muted';
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
    global.teacherClassStudents = { init };
})(window);
